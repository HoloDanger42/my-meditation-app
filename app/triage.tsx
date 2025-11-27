import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../context/AuthContext";
import { router } from "expo-router";
import { useFonts } from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import { useTriageRecorder } from "../hooks/useTriageRecorder";

export default function TriageScreen() {
  const { user } = useAuth();
  const { status, lastResult, startRecording, stopRecording } =
    useTriageRecorder();

  // Multiple animated values for wave effect
  const pulseAnim1 = useRef(new Animated.Value(1)).current;
  const pulseAnim2 = useRef(new Animated.Value(1)).current;
  const pulseAnim3 = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  const userName = user?.displayName || user?.email?.split("@")[0] || "User";
  const isRecording = status === "recording";
  const isProcessing = status === "processing";

  const [fontsLoaded] = useFonts({
    "Arboria-Book": require("../assets/fonts/Arboria-Book.ttf"),
    "Arboria-Medium": require("../assets/fonts/Arboria-Medium.ttf"),
  });

  // Pulsing wave animation
  useEffect(() => {
    if (isRecording) {
      // Continuous pulsing waves
      const pulse1 = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim1, {
            toValue: 1.4,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim1, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      const pulse2 = Animated.loop(
        Animated.sequence([
          Animated.delay(500),
          Animated.timing(pulseAnim2, {
            toValue: 1.6,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim2, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      const pulse3 = Animated.loop(
        Animated.sequence([
          Animated.delay(1000),
          Animated.timing(pulseAnim3, {
            toValue: 1.8,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim3, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      Animated.timing(opacityAnim, {
        toValue: 0.6,
        duration: 300,
        useNativeDriver: true,
      }).start();

      pulse1.start();
      pulse2.start();
      pulse3.start();
    } else {
      pulseAnim1.setValue(1);
      pulseAnim2.setValue(1);
      pulseAnim3.setValue(1);
      Animated.timing(opacityAnim, {
        toValue: 0.3,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isRecording]);

  const handlePressIn = () => {
    startRecording();
  };

  const handlePressOut = () => {
    stopRecording();
  };

  // Show result when processing is complete and navigate to dashboard
  useEffect(() => {
    if (lastResult && status === "idle") {
      // Navigate to doctor dashboard immediately
      router.push("/doctor-dashboard");
    }
  }, [lastResult, status]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <LinearGradient
      colors={["#C8E6C9", "#E8D5F5"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#333" />
          </Pressable>
          <View style={styles.logoContainer}>
            <Image
              source={require("../assets/images/chansey-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.headerTitle}>Chansey</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Pulsing Circle with Waves */}
          <View style={styles.pulseContainer}>
            {/* Wave circles */}
            <Animated.View
              style={[
                styles.waveCircle,
                {
                  opacity: opacityAnim.interpolate({
                    inputRange: [0.3, 0.6],
                    outputRange: [0.1, 0.2],
                  }),
                  transform: [{ scale: pulseAnim3 }],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.waveCircle,
                {
                  opacity: opacityAnim.interpolate({
                    inputRange: [0.3, 0.6],
                    outputRange: [0.15, 0.3],
                  }),
                  transform: [{ scale: pulseAnim2 }],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.waveCircle,
                {
                  opacity: opacityAnim,
                  transform: [{ scale: pulseAnim1 }],
                },
              ]}
            />

            {/* Center gradient circle */}
            <View style={styles.centerCircle}>
              <LinearGradient
                colors={["#A78BFA", "#8B5CF6", "#7C3AED"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.centerGradient}
              >
                <View style={styles.innerWave} />
              </LinearGradient>
            </View>
          </View>

          {/* Status Text */}
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>
              <Text style={styles.statusName}>Chansey</Text>
              <Text style={styles.statusAction}>
                {isProcessing
                  ? " is processing..."
                  : isRecording
                  ? " is listening"
                  : " is ready"}
              </Text>
            </Text>
          </View>

          {/* User Message */}
          <View style={styles.messageContainer}>
            {isProcessing ? (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text style={[styles.messageText, { marginTop: 12 }]}>
                  Analyzing your symptoms...
                </Text>
              </View>
            ) : (
              <Text style={styles.messageText}>
                {isRecording
                  ? "I'm listening..."
                  : `Hi, ${userName}. Tell me how you're feeling today.`}
              </Text>
            )}
          </View>
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          <Pressable style={styles.iconButton}>
            <Ionicons name="chatbubble-outline" size={24} color="#666" />
          </Pressable>

          <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={isProcessing}
            style={[
              styles.micButton,
              isRecording && styles.micButtonActive,
              isProcessing && styles.micButtonDisabled,
            ]}
          >
            <View style={styles.micCircle}>
              <Ionicons name="mic" size={32} color="#fff" />
            </View>
          </Pressable>

          <Pressable style={styles.iconButton}>
            <Ionicons name="settings-outline" size={24} color="#666" />
          </Pressable>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 44,
    height: 44,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: "Arboria-Medium",
    color: "#1a1a1a",
  },
  headerSpacer: {
    width: 40,
  },
  mainContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
    minHeight: 500,
  },
  pulseContainer: {
    width: 280,
    height: 280,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  waveCircle: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#A78BFA",
  },
  centerCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: "hidden",
    shadowColor: "#8B5CF6",
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  centerGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  innerWave: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  statusContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 16,
    fontFamily: "Arboria-Book",
    textAlign: "center",
  },
  statusName: {
    color: "#8B5CF6",
    fontFamily: "Arboria-Medium",
  },
  statusAction: {
    color: "#666",
    fontFamily: "Arboria-Book",
  },
  messageContainer: {
    paddingHorizontal: 30,
    marginBottom: 30,
  },
  processingContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  messageText: {
    fontSize: 18,
    fontFamily: "Arboria-Book",
    color: "#333",
    textAlign: "center",
    lineHeight: 26,
  },
  bottomControls: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 30,
  },
  iconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#8B5CF6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#8B5CF6",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  micButtonActive: {
    backgroundColor: "#7C3AED",
    transform: [{ scale: 0.95 }],
  },
  micButtonDisabled: {
    opacity: 0.6,
  },
  micCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
});
