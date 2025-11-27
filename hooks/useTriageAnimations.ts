import { useEffect, useRef } from "react";
import { Animated } from "react-native";
import { TriageResult } from "./useTriageRecorder";

export function useTriageAnimations(
  status: "idle" | "recording" | "processing",
  lastResult: TriageResult | null
) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

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
  }, [status, pulseAnim]);

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
  }, [lastResult, fadeAnim]);

  return {
    pulseAnim,
    fadeAnim,
  };
}
