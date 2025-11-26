import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Switch,
  Alert,
  AccessibilityInfo,
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
  suggested_action: string;
};

export default function TriageScreen() {
  const { theme, isDark } = useTheme();
  const [highContrast, setHighContrast] = useState(false);
  const [recordingState, setRecordingState] = useState<string>("idle");
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

  useEffect(() => {
    return () => {
      isMounted.current = false;
      // Cleanup on unmount
      if (audioRecorder.isRecording) {
        audioRecorder.stop().catch(() => {});
      }
    };
  }, [audioRecorder]);

  const colors = highContrast
    ? {
        bg: "#000000",
        text: "#FFD400",
        button: "#FFD400",
        buttonText: "#000000",
        border: "#FFD400",
        card: "#111",
      }
    : {
        bg: theme.background,
        text: theme.text,
        button: theme.accent,
        buttonText: "#FFFFFF",
        border: theme.cardBorder,
        card: theme.card,
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

  const startRecording = useCallback(async () => {
    if (isRecordingRef.current) {
      console.warn("Recording already in progress");
      return;
    }

    const ok = await ensurePermissions();
    if (!ok) return;

    try {
      console.log("Preparing and starting recording...");
      console.log("Current recorder state:", {
        isRecording: audioRecorder.isRecording,
        uri: audioRecorder.uri,
      });

      isRecordingRef.current = true;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setStatus("recording");

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

      AccessibilityInfo.announceForAccessibility(
        "Recording started. Release to stop."
      );
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
  }, [ensurePermissions, audioRecorder]);

  const stopRecording = useCallback(async () => {
    if (!isRecordingRef.current) {
      console.warn("No active recording to stop");
      return;
    }

    try {
      console.log(
        "Stopping recording, isRecording:",
        audioRecorder.isRecording
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      AccessibilityInfo.announceForAccessibility(
        "Recording stopped. Processing."
      );

      if (audioRecorder.isRecording) {
        await audioRecorder.stop();
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      isRecordingRef.current = false;

      const uri = audioRecorder.uri;
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

        // Update state together to ensure UI refresh
        setLastResult(result);
        setStatus("idle");
        console.log("UI updated with result, status set to idle");

        AccessibilityInfo.announceForAccessibility(
          `Triage complete. ${result.urgency} urgency.`
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
  }, [audioRecorder]);

  // Extracted: button + result card components to focus UI work

  function TriageButton({
    status,
    colors,
    onPressIn,
    onPressOut,
  }: {
    status: "idle" | "recording" | "processing";
    colors: { button: string; border: string; buttonText: string };
    onPressIn: () => void;
    onPressOut: () => void;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Hold to talk"
        accessibilityHint="Press and hold to record. Release to stop."
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={status === "processing"}
        style={{
          width: "80%",
          height: "50%",
          borderRadius: 24,
          backgroundColor: colors.button,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 4,
          borderColor: colors.border,
          opacity: status === "processing" ? 0.6 : 1,
        }}
      >
        <Ionicons name="mic" size={64} color={colors.buttonText} />
        <Text
          style={{
            color: colors.buttonText,
            fontSize: 22,
            fontWeight: "800",
            marginTop: 12,
          }}
        >
          {status === "recording"
            ? "Listening..."
            : status === "processing"
            ? "Processing..."
            : "HOLD TO TALK"}
        </Text>
      </Pressable>
    );
  }

  function ResultCard({
    result,
    colors,
  }: {
    result: TriageResult;
    colors: any;
  }) {
    return (
      <View
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          padding: 12,
          backgroundColor: colors.card,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
          Summary
        </Text>
        <Text style={{ color: colors.text, marginTop: 6 }}>
          {result.summary}
        </Text>
        <Text style={{ color: colors.text, marginTop: 8 }}>
          Urgency: {result.urgency} • Category: {result.category}
        </Text>
        <Text style={{ color: colors.text, marginTop: 8 }}>
          Suggested Action: {result.suggested_action}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        padding: 16,
        justifyContent: "space-between",
      }}
    >
      <StatusBar style={isDark || highContrast ? "light" : "dark"} />
      <View>
        <Text
          style={{
            color: colors.text,
            fontSize: 24,
            fontWeight: "700",
            marginBottom: 8,
          }}
        >
          Voice-First Clinical Triage
        </Text>
        <Text style={{ color: colors.text, fontSize: 14, opacity: 0.8 }}>
          Hold the button and speak your concern. We will summarize and route
          appropriately.
        </Text>
      </View>

      <View style={{ alignItems: "center", justifyContent: "center", flex: 1 }}>
        <TriageButton
          status={status}
          colors={colors}
          onPressIn={startRecording}
          onPressOut={stopRecording}
        />
      </View>

      <View style={{ gap: 12 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text style={{ color: colors.text, fontSize: 16 }}>
            High-Contrast Mode
          </Text>
          <Switch
            value={highContrast}
            onValueChange={setHighContrast}
            thumbColor={highContrast ? "#FFD400" : undefined}
          />
        </View>

        {lastResult && <ResultCard result={lastResult} colors={colors} />}
      </View>
    </View>
  );
}
