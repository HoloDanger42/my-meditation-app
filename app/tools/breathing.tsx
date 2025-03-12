import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { useRouter } from "expo-router";

export default function BreathingExerciseScreen() {
  const [phase, setPhase] = useState("inhale");
  const [counter, setCounter] = useState(4);
  const animation = new Animated.Value(1);
  const router = useRouter();

  // Simple breathing animation placeholder

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Deep Breathing</Text>
      <Text style={styles.instruction}>
        {phase === "inhale"
          ? "Breathe In..."
          : phase === "hold"
          ? "Hold..."
          : "Breathe Out..."}
      </Text>
      <View style={styles.circleContainer}>
        <Animated.View
          style={[
            styles.breathCircle,
            {
              transform: [{ scale: animation }],
            },
          ]}
        />
      </View>
      <Text style={styles.counter}>{counter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 40,
  },
  instruction: {
    fontSize: 22,
    marginBottom: 30,
    color: "#4E9F3D",
  },
  circleContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  breathCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#e7f5e1",
    borderWidth: 3,
    borderColor: "#4E9F3D",
  },
  counter: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#333",
  },
});
