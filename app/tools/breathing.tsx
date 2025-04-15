import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { StatusBar } from "expo-status-bar";

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
  const { theme, isDark } = useTheme();

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

    const resetAnim = Animated.timing(animatedValue, {
      toValue: 1,
      duration: 100, // Short duration
      useNativeDriver: true,
    });

    resetAnim.start(() => {
      setIsActive(false);
      setPhase("inhale");
      setCounter(4);
      setCycles(0);
    });
  };

  useEffect(() => {
    if (isActive) {
      beginBreathingCycle();
    }
  }, [phase]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 40,
      paddingBottom: 15,
      backgroundColor: theme.card,
    },
    backButton: {
      padding: 8,
    },
    title: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.text,
    },
    content: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    },
    instruction: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.text,
      marginBottom: 40,
    },
    circleContainer: {
      marginVertical: 30,
    },
    breathCircle: {
      width: 200,
      height: 200,
      borderRadius: 100,
      backgroundColor: theme.accentLight,
      borderWidth: 4,
      borderColor: theme.accent,
      alignSelf: "center",
    },
    counter: {
      fontSize: 48,
      fontWeight: "bold",
      color: theme.text,
      marginTop: 30,
    },
    cycleCount: {
      fontSize: 18,
      color: theme.textSecondary,
      marginTop: 15,
      marginBottom: 30,
    },
    button: {
      paddingVertical: 15,
      paddingHorizontal: 25,
      borderRadius: 30,
      marginTop: 20,
      minWidth: 150,
      alignItems: "center",
    },
    startButton: {
      backgroundColor: theme.accent,
    },
    stopButton: {
      backgroundColor: "#E74C3C",
    },
    buttonText: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#fff",
    },
  });

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/tools")}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
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
