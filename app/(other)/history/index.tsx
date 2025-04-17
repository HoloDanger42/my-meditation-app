import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../context/ThemeContext";
import { StatusBar } from "expo-status-bar";

interface Session {
  id: number;
  meditationId: string;
  duration: number;
  timestamp: string;
}

export default function SessionHistoryScreen() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const router = useRouter();
  const { theme, isDark } = useTheme();

  useEffect(() => {
    async function fetchSessions() {
      try {
        const storedSessions = await AsyncStorage.getItem(
          "meditation_sessions"
        );
        const sessions = storedSessions ? JSON.parse(storedSessions) : [];
        setSessions(sessions.reverse());
      } catch (error) {
        console.error("Failed to fetch sessions: ", error);
      }
    }
    fetchSessions();
  }, []);

  // Format timestamp to more readable date/time
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format duration from seconds to minutes and seconds
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes} min ${remainingSeconds} sec`;
  };

  const renderItem = ({ item }: { item: Session }) => (
    <View
      style={[
        styles.sessionItem,
        {
          backgroundColor: theme.card,
          borderColor: theme.cardBorder,
          shadowColor: isDark ? "#000" : "#000",
          shadowOpacity: isDark ? 0.3 : 0.1,
        },
      ]}
    >
      <Text style={[styles.sessionTitle, { color: theme.text }]}>
        {item.meditationId.includes("/")
          ? item.meditationId.split("/").pop()?.replace(/-/g, " ")
          : item.meditationId}
      </Text>
      <Text style={[styles.sessionText, { color: theme.textSecondary }]}>
        Duration: {formatDuration(item.duration)}
      </Text>
      <Text style={[styles.sessionText, { color: theme.textTertiary }]}>
        {formatDate(item.timestamp)}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push("/")}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>
          Session History
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: theme.textTertiary }]}>
              No sessions recorded
            </Text>
          }
        />
      </View>

      <View style={styles.bottomButton}>
        <TouchableOpacity
          style={[styles.longButton, { backgroundColor: theme.accent }]}
          onPress={() => router.back()}
        >
          <Text style={styles.longButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
  },
  backButton: {
    padding: 5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  listContent: {
    width: "100%",
    paddingBottom: 20,
  },
  sessionItem: {
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderRadius: 10,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 5,
  },
  sessionText: {
    fontSize: 14,
    marginTop: 3,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 40,
    fontStyle: "italic",
  },
  bottomButton: {
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  longButton: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
  },
  longButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
