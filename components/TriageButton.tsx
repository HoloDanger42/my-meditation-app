import React from "react";
import { Pressable, Text, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface TriageButtonProps {
  status: "idle" | "recording" | "processing";
  colors: { button: string; border: string; buttonText: string };
  onPressIn: () => void;
  onPressOut: () => void;
  pulseAnim: Animated.Value;
}

export function TriageButton({
  status,
  colors,
  onPressIn,
  onPressOut,
  pulseAnim,
}: TriageButtonProps) {
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
