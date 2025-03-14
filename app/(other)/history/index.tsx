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

interface Session {
  id: number;
  meditationId: string;
  duration: number;
  timestamp: string;
}

export default function SessionHistoryScreen() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const router = useRouter();

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

  const renderItem = ({ item }: { item: Session }) => (
    <View style={styles.sessionItem}>
      <Text style={styles.sessionText}>Meditation ID: {item.meditationId}</Text>
      <Text style={styles.sessionText}>Duration: {item.duration} sec</Text>
      <Text style={styles.sessionText}>Time: {item.timestamp}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Session History</Text>
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No sessions recorded</Text>
          }
        />
      </View>
      <View style={styles.bottomButton}>
        <TouchableOpacity
          style={styles.longButton}
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
    padding: 20,
    paddingTop: 60,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  listContent: {
    width: "100%",
  },
  sessionItem: {
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 5,
  },
  sessionText: {
    fontSize: 16,
  },
  emptyText: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
    marginTop: 20,
  },
  bottomButton: {
    alignItems: "center",
    marginBottom: 20,
  },
  longButton: {
    backgroundColor: "#4E9F3D",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 5,
    width: "80%",
    alignItems: "center",
  },
  longButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
