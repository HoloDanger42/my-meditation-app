import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

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

export default function MoodHistoryScreen() {
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchMoodEntries = async () => {
      try {
        const entriesJson = await AsyncStorage.getItem("mood_entries");
        if (entriesJson) {
          setMoodEntries(JSON.parse(entriesJson));
        }
      } catch (error) {
        console.error("Failed to fetch mood entries:", error);
      }
    };

    fetchMoodEntries();
  }, []);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const deleteMoodEntry = async (entryId: number) => {
    Alert.alert("Delete Entry", "Are you sure you want to delete this entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            // Filter out the entry with the matching ID
            const updatedEntries = moodEntries.filter(
              (entry) => entry.id !== entryId
            );

            // Save the updated entries list to storage
            await AsyncStorage.setItem(
              "mood_entries",
              JSON.stringify(updatedEntries)
            );

            // Update state to refresh the UI
            setMoodEntries(updatedEntries);
          } catch (error) {
            console.error("Failed to delete mood entry:", error);
            Alert.alert("Error", "Failed to delete the entry");
          }
        },
      },
    ]);
  };

  const renderMoodEntry = ({ item }: { item: MoodEntry }) => (
    <View style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <View
          style={[styles.moodIcon, { backgroundColor: item.mood.color + "30" }]}
        >
          <Ionicons
            name={item.mood.icon as any}
            size={24}
            color={item.mood.color}
          />
        </View>
        <View style={styles.entryMeta}>
          <Text style={styles.moodName}>{item.mood.name}</Text>
          <Text style={styles.timestamp}>{formatDate(item.timestamp)}</Text>
        </View>

        <View style={styles.intensityBadge}>
          <Text style={styles.intensityText}>{item.intensity}/5</Text>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteMoodEntry(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color="#FF6347" />
        </TouchableOpacity>
      </View>

      {item.notes ? (
        <View style={styles.notesContainer}>
          <Text style={styles.notesText}>{item.notes}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Mood History</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={moodEntries}
        renderItem={renderMoodEntry}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No mood entries yet</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: "white",
  },
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  listContent: {
    padding: 15,
  },
  entryCard: {
    backgroundColor: "white",
    borderRadius: 10,
    marginBottom: 15,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  entryHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  moodIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  entryMeta: {
    flex: 1,
  },
  moodName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  timestamp: {
    fontSize: 12,
    color: "#777",
    marginTop: 2,
  },
  intensityBadge: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  intensityText: {
    fontSize: 12,
    fontWeight: "500",
  },
  notesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  notesText: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
  },
  emptyText: {
    textAlign: "center",
    color: "#777",
    fontSize: 16,
    marginTop: 50,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 5,
  },
});
