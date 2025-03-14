import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function BreathingExerciseScreen() {
  const [phase, setPhase] = useState("inhale");
  const [counter, setCounter] = useState(4);
  const [isActive, setIsActive] = useState(false);
  const [cycles, setCycles] = useState(0);
  const [animation, setAnimation] =
    useState<Animated.CompositeAnimation | null>(null);
  const animatedValue = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Animation sequences
  const startBreathing = () => {
    setIsActive(true);
    beginBreathingCycle();
  };

  const beginBreathingCycle = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Inhale phase
    if (phase === "inhale") {
      setCounter(4);
      const inhaleAnim = Animated.timing(animatedValue, {
        toValue: 1.5, // Expand circle
        duration: 4000,
        useNativeDriver: true,
      });

      setAnimation(inhaleAnim);
      inhaleAnim.start();

      // Add countdown for inhale phase
      intervalRef.current = setInterval(() => {
        setCounter((prevCount) => {
          const newCount = prevCount - 1;
          if (newCount <= 0) {
            clearInterval(intervalRef.current!);
            intervalRef.current = null;
            setTimeout(() => {
              setPhase("hold");
            }, 100);
          }
          return newCount;
        });
      }, 1000);
    }

    // Hold phase
    else if (phase === "hold") {
      setCounter(7);

      // Count down during hold phase
      intervalRef.current = setInterval(() => {
        setCounter((prevCount) => {
          const newCount = prevCount - 1;
          if (newCount <= 0) {
            clearInterval(intervalRef.current!);
            intervalRef.current = null;
            setTimeout(() => {
              setPhase("exhale");
            }, 100);
          }
          return newCount;
        });
      }, 1000);
    }

    // Exhale phase
    else if (phase === "exhale") {
      setCounter(8);
      const exhaleAnim = Animated.timing(animatedValue, {
        toValue: 1, // Contract circle
        duration: 8000,
        useNativeDriver: true,
      });

      setAnimation(exhaleAnim);
      exhaleAnim.start();

      // After exhale, start next cycle
      intervalRef.current = setInterval(() => {
        setCounter((prevCount) => {
          const newCount = prevCount - 1;
          if (newCount <= 0) {
            clearInterval(intervalRef.current!);
            intervalRef.current = null;
            setTimeout(() => {
              setCycles((prev) => prev + 1);
              setPhase("inhale");
            }, 100);
          }
          return newCount;
        });
      }, 1000);
    }
  };

  const stopBreathing = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (animation) {
      animation.stop();
    }

    animatedValue.setValue(1);

    setIsActive(false);
    setPhase("inhale");
    setCounter(4);
    setCycles(0);
  };

  useEffect(() => {
    if (isActive) {
      beginBreathingCycle();
    }
  }, [phase]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/tools")}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Deep Breathing</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
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
                transform: [
                  {
                    scale: animatedValue,
                  },
                ],
              },
            ]}
          />
        </View>

        <Text style={styles.counter}>{counter}</Text>

        {cycles > 0 && (
          <Text style={styles.cycleCount}>Completed cycles: {cycles}</Text>
        )}

        <TouchableOpacity
          style={[
            styles.button,
            isActive ? styles.stopButton : styles.startButton,
          ]}
          onPress={isActive ? stopBreathing : startBreathing}
        >
          <Text style={styles.buttonText}>
            {isActive ? "Stop" : "Start Breathing"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  instruction: {
    fontSize: 22,
    marginBottom: 30,
    color: "#4E9F3D",
    fontWeight: "600",
  },
  circleContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 40,
    height: 200,
    width: "100%",
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
    marginBottom: 20,
  },
  cycleCount: {
    fontSize: 16,
    color: "#777",
    marginBottom: 30,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginTop: 20,
  },
  startButton: {
    backgroundColor: "#4E9F3D",
  },
  stopButton: {
    backgroundColor: "#FF6B6B",
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
});
