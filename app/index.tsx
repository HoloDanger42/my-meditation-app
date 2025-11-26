import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Switch,
  Alert,
  AccessibilityInfo,
  Animated,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  useAudioRecorder,
  RecordingPresets,
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
} from "expo-audio";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../context/ThemeContext";
import { StatusBar } from "expo-status-bar";
import { processTriageAudio } from "../utils/awsTriageService";

type TriageResult = {
  summary: string;
  urgency: "High" | "Medium" | "Low";
  category: string;
  specialist: string;
  suggested_action: string;
};

export default function TriageScreen() {
  const { theme, isDark } = useTheme();
  const [highContrast, setHighContrast] = useState(false);
  const audioRecorder = useAudioRecorder(
    RecordingPresets.HIGH_QUALITY,
    (status) => {
      console.log("Recording status update:", status);
    }
  );
  const [status, setStatus] = useState<"idle" | "recording" | "processing">(
    "idle"
  );
  const [lastResult, setLastResult] = useState<TriageResult | null>(null);
  const isMounted = useRef(true);
  const isRecordingRef = useRef(false);

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return () => {
      isMounted.current = false;
      // Cleanup on unmount
      if (audioRecorder.isRecording) {
        audioRecorder.stop().catch(() => {});
      }
    };
  }, [audioRecorder]);

  // Pulse animation when recording
  useEffect(() => {
    if (status === "recording") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status]);

  // Fade in result card
  useEffect(() => {
    if (lastResult) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [lastResult]);

  // Log state updates for debugging
  useEffect(() => {
    console.log("🎯 State update:", {
      status,
      hasResult: !!lastResult,
      resultUrgency: lastResult?.urgency,
    });
  }, [status, lastResult]);

  const colors = highContrast
    ? {
        bg: "#000000",
        text: "#FFD400",
        button: "#FFD400",
        buttonText: "#000000",
        border: "#FFD400",
        card: "#111",
        subtle: "#333",
      }
    : {
        bg: theme.background,
        text: theme.text,
        button: theme.accent,
        buttonText: "#FFFFFF",
        border: theme.cardBorder,
        card: theme.card,
        subtle: theme.text + "30", // 30% opacity
      };

  const ensurePermissions = useCallback(async () => {
    const { status } = await getRecordingPermissionsAsync();
    if (status !== "granted") {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert(
          "Microphone Access",
          "Microphone permission is required for triage."
        );
        return false;
      }
    }
    return true;
  }, []);

  const startRecording = useCallback(() => {
    if (isRecordingRef.current || status !== "idle") {
      console.warn("Recording already in progress or not idle");
      return;
    }

    // Fire and forget - don't await
    (async () => {
      const ok = await ensurePermissions();
      if (!ok) return;

      try {
        console.log("Preparing and starting recording...");
        isRecordingRef.current = true;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        // Try to prepare first
        try {
          console.log("Attempting to prepare recorder...");
          await audioRecorder.prepareToRecordAsync();
          console.log("Recorder prepared");
        } catch (prepError) {
          console.log("Prepare failed or not needed:", prepError);
        }

        console.log("Starting record...");
        await audioRecorder.record();

        // Wait for state to update
        await new Promise((resolve) => setTimeout(resolve, 300));

        console.log("After record() call:", {
          isRecording: audioRecorder.isRecording,
          uri: audioRecorder.uri,
        });

        // Only set recording status after successfully starting
        if (audioRecorder.isRecording) {
          setStatus("recording");
          AccessibilityInfo.announceForAccessibility(
            "Recording started. Release to stop."
          );
        } else {
          console.warn("Recording didn't start properly");
          isRecordingRef.current = false;
        }
      } catch (e) {
        console.error("Failed to start recording:", e);
        isRecordingRef.current = false;
        setStatus("idle");
        const errorMessage =
          e instanceof Error ? e.message : "Unknown error occurred";
        Alert.alert(
          "Recording Error",
          `Could not start recording: ${errorMessage}`
        );
      }
    })();
  }, [ensurePermissions, audioRecorder, status]);

  const stopRecording = useCallback(() => {
    if (!isRecordingRef.current) {
      console.warn("No active recording to stop");
      return;
    }

    // Fire and forget - don't await
    (async () => {
      try {
        console.log(
          "Stopping recording, isRecording:",
          audioRecorder.isRecording
        );
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        let uri: string | null = null;

        if (audioRecorder.isRecording) {
          AccessibilityInfo.announceForAccessibility(
            "Recording stopped. Processing."
          );
          await audioRecorder.stop();
          await new Promise((resolve) => setTimeout(resolve, 200));
          uri = audioRecorder.uri;
        }

        isRecordingRef.current = false;

        console.log("Recording URI:", uri);

        if (!uri || typeof uri !== "string") {
          setStatus("idle");
          Alert.alert(
            "Recording Issue",
            "No audio file created. Please try holding the button for at least 1 second."
          );
          return;
        }

        setStatus("processing");

        try {
          console.log("Starting processing with URI:", uri);
          const result = await processTriageAudio(uri);
          console.log("Got result:", result);

          if (!isMounted.current) return;

          console.log("Setting result and status to idle");
          
          // Update both states synchronously
          setStatus("idle");
          setLastResult(result);
          
          console.log("After state updates - result should be visible");

          AccessibilityInfo.announceForAccessibility(
            `Triage complete. ${result.urgency} urgency. Routed to ${result.specialist}.`
          );
        } catch (err) {
          console.error("Processing error:", err);
          const item = {
            id: `triage_${Date.now()}`,
            type: "audio_recording",
            uri,
            createdAt: new Date().toISOString(),
            status: "pending_upload",
          };
          await AsyncStorage.setItem(item.id, JSON.stringify(item));
          if (isMounted.current) {
            setStatus("idle");
            Alert.alert("Offline", "Network issue. Saved locally for sync.");
          }
        }
      } catch (e) {
        console.error("Failed to stop recording", e);
        isRecordingRef.current = false;
        if (isMounted.current) {
          setStatus("idle");
        }
      }
    })();
  }, [audioRecorder]);

  // Extracted: button + result card components to focus UI work

  function TriageButton({
    status,
    colors,
    onPressIn,
    onPressOut,
    pulseAnim,
  }: {
    status: "idle" | "recording" | "processing";
    colors: { button: string; border: string; buttonText: string };
    onPressIn: () => void;
    onPressOut: () => void;
    pulseAnim: Animated.Value;
  }) {
    const isDisabled = status === "processing";

    return (
      <Animated.View
        style={{
          transform: [{ scale: pulseAnim }],
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hold to talk"
          accessibilityHint="Press and hold to record. Release to stop."
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          disabled={isDisabled}
          style={{
            width: 280,
            height: 280,
            borderRadius: 140,
            backgroundColor: colors.button,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: status === "recording" ? 6 : 4,
            borderColor: status === "recording" ? "#FF4444" : colors.border,
            opacity: isDisabled ? 0.6 : 1,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <Ionicons
            name={
              status === "recording"
                ? "mic"
                : status === "processing"
                ? "hourglass"
                : "mic-outline"
            }
            size={72}
            color={colors.buttonText}
          />
          <Text
            style={{
              color: colors.buttonText,
              fontSize: 18,
              fontWeight: "800",
              marginTop: 16,
              textAlign: "center",
              letterSpacing: 1,
            }}
          >
            {status === "recording"
              ? "LISTENING..."
              : status === "processing"
              ? "PROCESSING..."
              : "HOLD TO TALK"}
          </Text>
          {status === "idle" && (
            <Text
              style={{
                color: colors.buttonText,
                fontSize: 12,
                marginTop: 4,
                opacity: 0.7,
              }}
            >
              Press & Hold
            </Text>
          )}
        </Pressable>
      </Animated.View>
    );
  }

  function ResultCard({
    result,
    colors,
  }: {
    result: TriageResult;
    colors: any;
  }) {
    const urgencyColor =
      result.urgency === "High"
        ? "#FF4444"
        : result.urgency === "Medium"
        ? "#FFA500"
        : "#4CAF50";

    const urgencyIcon =
      result.urgency === "High"
        ? "alert-circle"
        : result.urgency === "Medium"
        ? "warning"
        : "checkmark-circle";

    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [
            {
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        }}
      >
        <View
          style={{
            borderWidth: 2,
            borderColor: urgencyColor,
            borderRadius: 16,
            padding: 20,
            backgroundColor: colors.card,
            shadowColor: urgencyColor,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          {/* Urgency Badge */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <View
              style={{
                backgroundColor: urgencyColor,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Ionicons name={urgencyIcon} size={18} color="#FFF" />
              <Text
                style={{
                  color: "#FFF",
                  fontWeight: "bold",
                  fontSize: 14,
                  letterSpacing: 1,
                }}
              >
                {result.urgency.toUpperCase()} URGENCY
              </Text>
            </View>
          </View>

          {/* Summary */}
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                color: colors.text,
                fontSize: 14,
                fontWeight: "600",
                marginBottom: 6,
                opacity: 0.7,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Summary
            </Text>
            <Text
              style={{
                color: colors.text,
                fontSize: 16,
                lineHeight: 24,
              }}
            >
              {result.summary}
            </Text>
          </View>

          {/* Category & Specialist Row */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 16,
              paddingVertical: 12,
              paddingHorizontal: 16,
              backgroundColor: colors.subtle,
              borderRadius: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 12,
                  opacity: 0.6,
                  marginBottom: 4,
                  fontWeight: "600",
                }}
              >
                CATEGORY
              </Text>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 16,
                  fontWeight: "700",
                }}
              >
                {result.category}
              </Text>
            </View>
            <View
              style={{
                width: 1,
                backgroundColor: colors.border,
                marginHorizontal: 16,
              }}
            />
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 12,
                  opacity: 0.6,
                  marginBottom: 4,
                  fontWeight: "600",
                }}
              >
                SPECIALIST
              </Text>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 16,
                  fontWeight: "700",
                  textAlign: "right",
                }}
              >
                {result.specialist}
              </Text>
            </View>
          </View>

          {/* Suggested Action */}
          <View
            style={{
              backgroundColor: colors.bg,
              padding: 16,
              borderRadius: 12,
              borderLeftWidth: 4,
              borderLeftColor: urgencyColor,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Ionicons
                name="arrow-forward-circle"
                size={20}
                color={colors.text}
                style={{ marginRight: 8 }}
              />
              <Text
                style={{
                  color: colors.text,
                  fontSize: 14,
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Next Step
              </Text>
            </View>
            <Text
              style={{
                color: colors.text,
                fontSize: 15,
                lineHeight: 22,
              }}
            >
              {result.suggested_action}
            </Text>
          </View>

          {/* Connect Button for High Urgency */}
          {result.urgency === "High" && (
            <Pressable
              style={{
                backgroundColor: urgencyColor,
                padding: 16,
                borderRadius: 12,
                alignItems: "center",
                marginTop: 16,
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
              }}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                Alert.alert(
                  "Emergency Connection",
                  `Connecting to ${result.specialist}...`,
                  [{ text: "OK" }]
                );
              }}
            >
              <Ionicons name="videocam" size={24} color="#FFF" />
              <Text
                style={{
                  color: "#FFF",
                  fontSize: 16,
                  fontWeight: "bold",
                  letterSpacing: 0.5,
                }}
              >
                Connect to {result.specialist}
              </Text>
            </Pressable>
          )}
        </View>
      </Animated.View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
      }}
    >
      <StatusBar style={isDark || highContrast ? "light" : "dark"} />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: 20,
          justifyContent: "space-between",
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View>
          <Text
            style={{
              color: colors.text,
              fontSize: 28,
              fontWeight: "800",
              marginTop: 40,
              marginBottom: 8,
              letterSpacing: -0.5,
            }}
          >
            Voice-First Clinical Triage
          </Text>
          <Text
            style={{
              color: colors.text,
              fontSize: 15,
              opacity: 0.7,
              lineHeight: 22,
            }}
          >
            Hold the button and describe your symptoms. Our AI will analyze and
            route you to the appropriate specialist.
          </Text>
        </View>

        {/* Center Button */}
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 40,
          }}
        >
          <TriageButton
            status={status}
            colors={colors}
            onPressIn={startRecording}
            onPressOut={stopRecording}
            pulseAnim={pulseAnim}
          />
        </View>

        {/* Bottom Section */}
        <View style={{ gap: 16 }}>
          {/* High Contrast Toggle */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: colors.card,
              padding: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <Ionicons name="contrast" size={24} color={colors.text} />
              <Text
                style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}
              >
                High-Contrast Mode
              </Text>
            </View>
            <Switch
              value={highContrast}
              onValueChange={setHighContrast}
              thumbColor={highContrast ? "#FFD400" : undefined}
              trackColor={{ true: "#FFD400" }}
            />
          </View>

          {/* Result Card */}
          {lastResult && <ResultCard result={lastResult} colors={colors} />}
        </View>
      </ScrollView>
    </View>
  );
}
