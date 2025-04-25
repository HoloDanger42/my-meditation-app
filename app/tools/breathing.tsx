import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ScrollView,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { StatusBar } from "expo-status-bar";
import { getSecureItem, setSecureItem } from "../../utils/secureStorage";
import { BreathingSession, BreathingTechnique } from "../../types/dataTypes";

const BREATHING_TECHNIQUES = [
  {
    id: "478",
    name: "4-7-8 Breathing",
    description:
      "Inhale for 4, hold for 7, exhale for 8. Helps reduce anxiety and aids sleep.",
    inhale: 4,
    hold: 7,
    exhale: 8,
    color: "#4285F4",
  },
  {
    id: "box",
    name: "Box Breathing",
    description:
      "Equal duration for inhale, hold, exhale, and hold. Used by Navy SEALs for stress management.",
    inhale: 4,
    hold: 4,
    exhale: 4,
    holdAfterExhale: 4, // Additional hold after exhale
    color: "#34A853",
  },
  {
    id: "relaxing",
    name: "Relaxing Breath",
    description:
      "Longer exhale promotes relaxation by activating your parasympathetic nervous system.",
    inhale: 4,
    hold: 0,
    exhale: 6,
    color: "#FBBC05",
  },
  {
    id: "energizing",
    name: "Energizing Breath",
    description: "Short, quick breaths to increase energy and alertness.",
    inhale: 2,
    hold: 0,
    exhale: 2,
    cycles: 20,
    color: "#EA4335",
  },
];

export default function BreathingExerciseScreen() {
  const [phase, setPhase] = useState("inhale");
  const [counter, setCounter] = useState(4);
  const [isActive, setIsActive] = useState(false);
  const [cycles, setCycles] = useState(0);
  const [selectedTechnique, setSelectedTechnique] =
    useState<BreathingTechnique>(BREATHING_TECHNIQUES[0]);
  const [showTechniqueModal, setShowTechniqueModal] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [totalDuration, setTotalDuration] = useState(0);
  const [phaseStartTime, setPhaseStartTime] = useState<number>(0);

  // Refs
  const animatedValue = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentPhaseRef = useRef<string>(phase);
  const currentPhaseStartTimeRef = useRef<number>(phaseStartTime);

  const router = useRouter();
  const { theme, isDark } = useTheme();

  // Load current technique from storage on mount
  useEffect(() => {
    const loadSavedTechnique = async () => {
      try {
        const savedTechniqueId = await getSecureItem<string>(
          "last_breathing_technique"
        );
        if (savedTechniqueId) {
          const technique = BREATHING_TECHNIQUES.find(
            (t) => t.id === savedTechniqueId
          );
          if (technique) {
            setSelectedTechnique(technique);
            setCounter(technique.inhale);
          }
        }
      } catch (error) {
        console.error("Failed to load saved breathing technique:", error);
      }
    };

    loadSavedTechnique();
  }, []);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Animation sequences
  const startBreathing = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    const now = Date.now();
    const initialPhase = "inhale";
    const initialCounter = selectedTechnique.inhale;

    currentPhaseRef.current = initialPhase;
    currentPhaseStartTimeRef.current = now;

    setIsActive(true);
    setSessionStartTime(now);
    setPhaseStartTime(now);
    setPhase(initialPhase);
    setCounter(initialCounter);
    setCycles(0);
    setTotalDuration(0);

    Animated.timing(animatedValue, {
      toValue: 1.5,
      duration: selectedTechnique.inhale * 1000,
      useNativeDriver: true,
    }).start();

    intervalRef.current = setInterval(tick, 100);
  };

  const stopBreathing = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    animatedValue.stopAnimation();

    const resetAnim = Animated.timing(animatedValue, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    });

    // Calculate session duration and save record
    let finalDuration = 0;
    if (sessionStartTime) {
      finalDuration = Math.floor((Date.now() - sessionStartTime) / 1000);
      setTotalDuration(finalDuration);

      try {
        // Save breathing session
        const session: BreathingSession = {
          id: Date.now(),
          techniqueId: selectedTechnique.id,
          techniqueName: selectedTechnique.name,
          duration: finalDuration,
          cycles,
          timestamp: new Date().toISOString(),
        };

        // Get existing sessions
        const existingSessions =
          (await getSecureItem<BreathingSession[]>("breathing_sessions")) || [];
        await setSecureItem("breathing_sessions", [
          session,
          ...existingSessions,
        ]);

        // Update total breathing time
        const totalTime =
          ((await getSecureItem<number>("total_breathing_time")) || 0) +
          finalDuration;
        await setSecureItem("total_breathing_time", totalTime);

        // Save preferrred technique
        await setSecureItem("last_breathing_technique", selectedTechnique.id);
      } catch (error) {
        console.error("Failed to save breathing session:", error);
      }
    }

    resetAnim.start(() => {
      currentPhaseRef.current = "inhale";
      currentPhaseStartTimeRef.current = 0;

      setIsActive(false);
      setPhase("inhale");
      setCounter(selectedTechnique.inhale);
      setSessionStartTime(null);
      setPhaseStartTime(0);
    });
  };

  const tick = () => {
    const now = Date.now();
    const localPhase = currentPhaseRef.current;
    const localPhaseStartTime = currentPhaseStartTimeRef.current;
    const elapsedInPhase = (now - localPhaseStartTime) / 1000;

    let currentPhaseDuration = 0;
    let nextPhase: string | null = null;
    let startNextAnimation: (() => void) | null = null;
    let incrementCycle = false;

    // Determine current phase duration and next phase
    switch (localPhase) {
      case "inhale":
        currentPhaseDuration = selectedTechnique.inhale;
        if (elapsedInPhase >= currentPhaseDuration) {
          nextPhase = selectedTechnique.hold > 0 ? "hold" : "exhale";
          if (nextPhase === "exhale") {
            startNextAnimation = () =>
              Animated.timing(animatedValue, {
                toValue: 1,
                duration: selectedTechnique.exhale * 1000,
                useNativeDriver: true,
              }).start();
          }
        }
        break;
      case "hold":
        currentPhaseDuration = selectedTechnique.hold;
        if (elapsedInPhase >= currentPhaseDuration) {
          nextPhase = "exhale";
          startNextAnimation = () =>
            Animated.timing(animatedValue, {
              toValue: 1,
              duration: selectedTechnique.exhale * 1000,
              useNativeDriver: true,
            }).start();
        }
        break;
      case "exhale":
        currentPhaseDuration = selectedTechnique.exhale;
        if (elapsedInPhase >= currentPhaseDuration) {
          nextPhase = selectedTechnique.holdAfterExhale
            ? "holdAfterExhale"
            : "inhale";
          incrementCycle = true;
          if (nextPhase === "inhale") {
            startNextAnimation = () =>
              Animated.timing(animatedValue, {
                toValue: 1.5,
                duration: selectedTechnique.inhale * 1000,
                useNativeDriver: true,
              }).start();
          }
        }
        break;
      case "holdAfterExhale":
        currentPhaseDuration = selectedTechnique.holdAfterExhale || 0;
        if (elapsedInPhase >= currentPhaseDuration) {
          nextPhase = "inhale";
          startNextAnimation = () =>
            Animated.timing(animatedValue, {
              toValue: 1.5,
              duration: selectedTechnique.inhale * 1000,
              useNativeDriver: true,
            }).start();
        }
        break;
    }

    // Update countdown timer display
    const remainingInPhase = Math.max(0, currentPhaseDuration - elapsedInPhase);
    setCounter(Math.ceil(remainingInPhase));

    // Update total duration display
    if (sessionStartTime) {
      setTotalDuration(Math.floor((now - sessionStartTime) / 1000));
    }

    // Transition to next phase if needed
    if (nextPhase) {
      currentPhaseRef.current = nextPhase;
      currentPhaseStartTimeRef.current = now;

      setPhase(nextPhase);
      setPhaseStartTime(now);

      if (incrementCycle) {
        setCycles((prev) => prev + 1);
      }

      // Update counter for the *start* of the new phase
      let nextCounter = 0;
      switch (nextPhase) {
        case "inhale":
          nextCounter = selectedTechnique.inhale;
          break;
        case "hold":
          nextCounter = selectedTechnique.hold;
          break;
        case "exhale":
          nextCounter = selectedTechnique.exhale;
          break;
        case "holdAfterExhale":
          nextCounter = selectedTechnique.holdAfterExhale || 0;
          break;
      }
      setCounter(nextCounter);

      if (startNextAnimation) {
        startNextAnimation();
      }
    }
  };

  // Change technique handler
  const selectTechnique = (technique: BreathingTechnique) => {
    setSelectedTechnique(technique);
    setCounter(technique.inhale);
    setPhase("inhale");
    setShowTechniqueModal(false);

    if (!isActive) {
      currentPhaseRef.current = "inhale";
    }
  };

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
    techniqueButton: {
      padding: 8,
    },
    content: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      paddingVertical: 30,
    },
    instruction: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.text,
      marginBottom: 20,
      textAlign: "center",
    },
    circleContainer: {
      height: 270,
      width: 270,
      marginVertical: 15,
      justifyContent: "center",
      alignItems: "center",
      position: "relative",
    },
    breathCircle: {
      width: 200,
      height: 200,
      borderRadius: 100,
      backgroundColor: theme.accentLight,
      borderWidth: 4,
      borderColor: selectedTechnique.color || theme.accent,
      justifyContent: "center",
      alignItems: "center",
    },
    counter: {
      fontSize: 48,
      fontWeight: "bold",
      color: theme.text,
      marginTop: 10,
    },
    phase: {
      fontSize: 16,
      color: theme.textSecondary,
      marginTop: 5,
    },
    cycleCount: {
      fontSize: 18,
      color: theme.textSecondary,
      marginTop: 15,
      marginBottom: 20,
    },
    sessionInfo: {
      flexDirection: "row",
      justifyContent: "space-around",
      width: "100%",
      marginBottom: 20,
    },
    statItem: {
      alignItems: "center",
    },
    statValue: {
      fontSize: 22,
      fontWeight: "bold",
      color: theme.text,
    },
    statLabel: {
      fontSize: 12,
      color: theme.textSecondary,
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
      backgroundColor: selectedTechnique.color || theme.accent,
    },
    stopButton: {
      backgroundColor: "#E74C3C",
    },
    buttonText: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#fff",
    },
    techniqueName: {
      fontSize: 16,
      color: theme.text,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      width: "90%",
      backgroundColor: theme.card,
      borderRadius: 15,
      padding: 20,
      maxHeight: "80%",
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.text,
      marginBottom: 20,
      textAlign: "center",
    },
    techniqueItem: {
      padding: 15,
      borderRadius: 10,
      marginBottom: 10,
      backgroundColor: theme.background,
    },
    techniqueItemSelected: {
      borderWidth: 2,
      borderColor: theme.accent,
    },
    modalTechniqueName: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.text,
      marginBottom: 5,
    },
    techniqueDescription: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 5,
    },
    techniqueTiming: {
      fontSize: 14,
      color: theme.accent,
    },
    circleText: {
      color: theme.text,
      fontSize: 16,
      fontWeight: "500",
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
        <TouchableOpacity
          style={styles.techniqueButton}
          onPress={() => !isActive && setShowTechniqueModal(true)}
          disabled={isActive}
        >
          <Ionicons
            name="options"
            size={24}
            color={isActive ? theme.textSecondary : theme.text}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.techniqueName}>{selectedTechnique.name}</Text>

        <Text style={styles.instruction}>
          {phase === "inhale"
            ? "Breathe In Slowly..."
            : phase === "hold"
            ? "Hold Your Breath..."
            : phase === "exhale"
            ? "Breathe Out Slowly..."
            : "Hold..."}
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
                borderColor: selectedTechnique.color || theme.accent,
              },
            ]}
          >
            <Text style={styles.circleText}>
              {phase === "inhale"
                ? "Breathe In"
                : phase === "hold"
                ? "Hold"
                : phase === "exhale"
                ? "Breathe Out"
                : "Hold"}
            </Text>
          </Animated.View>
        </View>

        <Text style={styles.counter}>{counter}</Text>
        <Text style={styles.phase}>seconds</Text>

        {isActive && (
          <View style={styles.sessionInfo}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{cycles}</Text>
              <Text style={styles.statLabel}>Cycles</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {sessionStartTime
                  ? Math.floor((Date.now() - sessionStartTime) / 1000)
                  : totalDuration}
                s
              </Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
          </View>
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

      {/* Technique Selection Modal */}
      <Modal
        visible={showTechniqueModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTechniqueModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Breathing Technique</Text>

            <ScrollView>
              {BREATHING_TECHNIQUES.map((technique) => (
                <TouchableOpacity
                  key={technique.id}
                  style={[
                    styles.techniqueItem,
                    selectedTechnique.id === technique.id &&
                      styles.techniqueItemSelected,
                  ]}
                  onPress={() => selectTechnique(technique)}
                >
                  <Text
                    style={[
                      styles.modalTechniqueName,
                      { color: technique.color },
                    ]}
                  >
                    {technique.name}
                  </Text>
                  <Text style={styles.techniqueDescription}>
                    {technique.description}
                  </Text>
                  <Text style={styles.techniqueTiming}>
                    Inhale: {technique.inhale}s
                    {technique.hold > 0 ? ` • Hold: ${technique.hold}s` : ""}
                    {` • Exhale: ${technique.exhale}s`}
                    {technique.holdAfterExhale
                      ? ` • Hold: ${technique.holdAfterExhale}s`
                      : ""}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: theme.accent, marginTop: 10 },
              ]}
              onPress={() => setShowTechniqueModal(false)}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
