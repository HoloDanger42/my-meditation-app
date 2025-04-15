import React, { useState, useCallback } from "react";
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../context/ThemeContext";
import { StatusBar } from "expo-status-bar";
import {
  getCurrentStreak,
  getTotalMeditationSessions,
  getTotalMeditationMinutes,
} from "../utils/stats";

interface MoodEntry {
  id: number;
  mood: {
    id: number;
    name: string;
    icon: string;
    color: string;
  };
  intensity: number;
  notes: string;
  timestamp: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const [latestMood, setLatestMood] = useState<MoodEntry | null>(null);
  const { theme, isDark } = useTheme();
  const [streak, setStreak] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);

  // Function to fetch latest mood
  const fetchLatestMood = useCallback(async () => {
    try {
      const entriesJson = await AsyncStorage.getItem("mood_entries");
      if (entriesJson) {
        const entries = JSON.parse(entriesJson);
        if (entries.length > 0) {
          setLatestMood(entries[0]); // First entry is the latest
        } else {
          setLatestMood(null); // Handle case where entries exist but are empty
        }
      } else {
        setLatestMood(null); // Handle case where no entries key exists
      }
    } catch (error) {
      console.error("Failed to fetch mood data:", error);
      setLatestMood(null); // Reset on error
    }
  }, []); // useCallback dependency array

  // Function to load stats
  const loadStats = useCallback(async () => {
    const currentStreak = await getCurrentStreak();
    const totalSessions = await getTotalMeditationSessions();
    const minutes = await getTotalMeditationMinutes();

    setStreak(currentStreak);
    setSessionCount(totalSessions);
    setTotalMinutes(minutes);
  }, []); // useCallback dependency array

  // Use useFocusEffect to fetch data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("HomeScreen focused, fetching data..."); // Add log for debugging
      fetchLatestMood();
      loadStats();

      // Optional: Return a cleanup function if needed
      return () => {
        // console.log("HomeScreen blurred");
      };
    }, [fetchLatestMood, loadStats]) // Dependencies for the outer useCallback
  );

  // Render mood display based on latest entry
  const renderMoodDisplay = () => {
    if (!latestMood) {
      return <Text style={styles.summaryText}>How are you feeling today?</Text>;
    }

    return (
      <View style={styles.currentMoodContainer}>
        <View
          style={[
            styles.moodIconSmall,
            { backgroundColor: latestMood.mood.color + "30" },
          ]}
        >
          <Ionicons
            name={latestMood.mood.icon as any}
            size={20}
            color={latestMood.mood.color}
          />
        </View>
        <View style={styles.moodDetails}>
          <Text style={styles.moodName}>
            {latestMood.mood.name} ({latestMood.intensity}/5)
          </Text>
          <Text style={styles.moodTime}>
            {new Date(latestMood.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 5,
      backgroundColor: theme.card,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.text,
    },
    scrollContent: {
      paddingBottom: 20,
    },
    summaryCard: {
      backgroundColor: theme.card,
      padding: 20,
    },
    cardTitle: {
      fontSize: 18,
      color: theme.textSecondary,
      marginBottom: 15,
    },
    moodSummary: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    summaryText: {
      fontSize: 16,
      color: theme.textSecondary,
    },
    logMoodButton: {
      backgroundColor: theme.accent,
      paddingVertical: 8,
      paddingHorizontal: 15,
      borderRadius: 20,
    },
    logMoodText: {
      color: "white",
      fontWeight: "500",
    },
    sectionContainer: {
      padding: 20,
    },
    sectionTitle: {
      fontSize: 18,
      color: theme.text,
      marginBottom: 15,
      fontWeight: "600",
    },
    actionsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    actionItem: {
      width: "48%",
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 15,
      alignItems: "center",
      marginBottom: 15,
    },
    actionIcon: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.accentLight,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 10,
    },
    actionText: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.text,
    },
    tipCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 20,
      marginHorizontal: 20,
      marginBottom: 20,
    },
    tipHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
    },
    tipTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.text,
      marginLeft: 8,
    },
    tipText: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
    },
    streakCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 20,
      marginHorizontal: 20,
    },
    streakTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.text,
      marginBottom: 15,
    },
    streakInfo: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    streakItem: {
      alignItems: "center",
    },
    streakCount: {
      fontSize: 22,
      fontWeight: "bold",
      color: theme.accent,
    },
    streakLabel: {
      fontSize: 12,
      color: theme.textTertiary,
      marginTop: 5,
    },
    currentMoodContainer: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    moodIconSmall: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.accentLight,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 10,
    },
    moodDetails: {
      flex: 1,
    },
    moodName: {
      fontSize: 16,
      fontWeight: "500",
      color: theme.text,
    },
    moodTime: {
      fontSize: 12,
      color: theme.textTertiary,
    },
  });

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={styles.header}>
        <Text style={styles.title}>Mental Wellness</Text>
        <TouchableOpacity onPress={() => router.push("/(other)/settings")}>
          <Ionicons name="settings-outline" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* Wellness Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.cardTitle}>Today's Wellness</Text>
        <View style={styles.moodSummary}>
          {renderMoodDisplay()}
          <TouchableOpacity
            style={styles.logMoodButton}
            onPress={() => router.push("/mood")}
          >
            <Text style={styles.logMoodText}>
              {latestMood ? "Update Mood" : "Log Mood"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Quick Actions */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push("/meditations")}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="leaf-outline" size={28} color={theme.accent} />
              </View>
              <Text style={styles.actionText}>Meditate</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push("/journal/new")}
            >
              <View style={styles.actionIcon}>
                <FontAwesome name="pencil" size={28} color={theme.accent} />
              </View>
              <Text style={styles.actionText}>Journal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push("/tools/breathing")}
            >
              <View style={styles.actionIcon}>
                <Ionicons
                  name="medical-outline"
                  size={28}
                  color={theme.accent}
                />
              </View>
              <Text style={styles.actionText}>Breathing</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push("/(other)/history")}
            >
              <View style={styles.actionIcon}>
                <Ionicons
                  name="analytics-outline"
                  size={28}
                  color={theme.accent}
                />
              </View>
              <Text style={styles.actionText}>Progress</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push("/(other)/statistics")}
            >
              <View style={styles.actionIcon}>
                <Ionicons
                  name="analytics-outline"
                  size={28}
                  color={theme.accent}
                />
              </View>
              <Text style={styles.actionText}>Statistics</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Daily Tip */}
        <View style={styles.tipCard}>
          <View style={styles.tipHeader}>
            <Ionicons name="bulb-outline" size={24} color="#FFB800" />
            <Text style={styles.tipTitle}>Wellness Tip</Text>
          </View>
          <Text style={styles.tipText}>
            Taking just five minutes to practice mindful breathing can help
            reduce stress and improve focus.
          </Text>
        </View>

        {/* Streak Card*/}
        <View style={styles.streakCard}>
          <Text style={styles.streakTitle}>Your Progress</Text>
          <View style={styles.streakInfo}>
            <View style={styles.streakItem}>
              <Text style={styles.streakCount}>{streak}</Text>
              <Text style={styles.streakLabel}>Day Streak</Text>
            </View>
            <View style={styles.streakItem}>
              <Text style={styles.streakCount}>{sessionCount}</Text>
              <Text style={styles.streakLabel}>Meditations</Text>
            </View>
            <View style={styles.streakItem}>
              <Text style={styles.streakCount}>{totalMinutes}</Text>
              <Text style={styles.streakLabel}>Minutes</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
