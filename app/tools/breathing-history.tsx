import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { StatusBar } from "expo-status-bar";
import { getSecureItem } from "../../utils/secureStorage";

// Types
interface BreathingSession {
  id: number;
  techniqueId: string;
  techniqueName: string;
  duration: number;
  cycles: number;
  timestamp: string;
}

export default function BreathingHistoryScreen() {
  const [sessions, setSessions] = useState<BreathingSession[]>([]);
  const [totalTime, setTotalTime] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [lastWeekTime, setLastWeekTime] = useState(0);

  const router = useRouter();
  const { theme, isDark } = useTheme();

  useEffect(() => {
    loadBreathingData();
  }, []);

  const loadBreathingData = async () => {
    try {
      // Load breathing sessions
      const breathingSessions =
        (await getSecureItem<BreathingSession[]>("breathing_sessions")) || [];
      setSessions(breathingSessions);
      setTotalSessions(breathingSessions.length);

      // Load total time
      const totalBreathingTime =
        (await getSecureItem<number>("total_breathing_time")) || 0;
      setTotalTime(totalBreathingTime);

      // Calculate last week's time
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const lastWeekSessions = breathingSessions.filter(
        (session) => new Date(session.timestamp) >= oneWeekAgo
      );

      const weekTime = lastWeekSessions.reduce(
        (total, session) => total + session.duration,
        0
      );

      setLastWeekTime(weekTime);
    } catch (error) {
      console.error("Failed to load breathing data:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (remainingSeconds === 0) {
      return `${minutes}m`;
    }

    return `${minutes}m ${remainingSeconds}s`;
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
    emptySpace: {
      width: 40,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    bottomPadding: {
      height: 40,
    },
    statsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    statCard: {
      width: "48%",
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 15,
      marginBottom: 15,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 4,
    },
    statValue: {
      fontSize: 26,
      fontWeight: "bold",
      color: theme.accent,
      marginBottom: 5,
    },
    statLabel: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.text,
      marginTop: 20,
      marginBottom: 15,
    },
    sessionItem: {
      backgroundColor: theme.card,
      borderRadius: 10,
      padding: 15,
      marginBottom: 10,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    sessionLeft: {
      flex: 1,
    },
    techniqueName: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.text,
      marginBottom: 5,
    },
    sessionDate: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    sessionRight: {
      alignItems: "flex-end",
    },
    duration: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.accent,
      marginBottom: 5,
    },
    cycles: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    emptyMessage: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: "center",
      marginTop: 40,
    },
    breatheButton: {
      backgroundColor: theme.accent,
      padding: 15,
      borderRadius: 30,
      alignItems: "center",
      marginTop: 20,
    },
    breatheButtonText: {
      color: "#fff",
      fontWeight: "bold",
      fontSize: 16,
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
        <Text style={styles.title}>Breathing History</Text>
        <View style={styles.emptySpace} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatDuration(totalTime)}</Text>
            <Text style={styles.statLabel}>Total Breathing Time</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalSessions}</Text>
            <Text style={styles.statLabel}>Total Sessions</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatDuration(lastWeekTime)}</Text>
            <Text style={styles.statLabel}>Last 7 Days</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {sessions.length > 0
                ? formatDuration(Math.floor(totalTime / sessions.length))
                : "0s"}
            </Text>
            <Text style={styles.statLabel}>Average Session</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Recent Sessions</Text>

        {sessions.length === 0 ? (
          <View>
            <Text style={styles.emptyMessage}>
              You haven't completed any breathing sessions yet.
            </Text>
            <TouchableOpacity
              style={styles.breatheButton}
              onPress={() => router.push("/tools/breathing")}
            >
              <Text style={styles.breatheButtonText}>Start Breathing</Text>
            </TouchableOpacity>
          </View>
        ) : (
          sessions.slice(0, 10).map((session) => (
            <View key={session.id} style={styles.sessionItem}>
              <View style={styles.sessionLeft}>
                <Text style={styles.techniqueName}>
                  {session.techniqueName}
                </Text>
                <Text style={styles.sessionDate}>
                  {formatDate(session.timestamp)} at{" "}
                  {formatTime(session.timestamp)}
                </Text>
              </View>

              <View style={styles.sessionRight}>
                <Text style={styles.duration}>
                  {formatDuration(session.duration)}
                </Text>
                <Text style={styles.cycles}>{session.cycles} cycles</Text>
              </View>
            </View>
          ))
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}
