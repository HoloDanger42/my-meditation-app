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
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { StatusBar } from "expo-status-bar";
import { getSecureItem, setSecureItem } from "../../utils/secureStorage";

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
  const { theme, isDark } = useTheme();

  useEffect(() => {
    const fetchMoodEntries = async () => {
      try {
        const entries = await getSecureItem<MoodEntry[]>("mood_entries");
        if (entries) {
          setMoodEntries(entries);
        } else {
          setMoodEntries([]);
        }
      } catch (error) {
        console.error("Failed to fetch mood entries:", error);
        setMoodEntries([]);
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
            await setSecureItem("mood_entries", updatedEntries);

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
      paddingTop: 60,
      paddingBottom: 20,
      backgroundColor: theme.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.cardBorder,
      shadowColor: isDark ? "#000" : "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 3,
      elevation: 3,
    },
    backButton: {
      padding: 5,
    },
    title: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.text,
    },
    listContent: {
      padding: 15,
    },
    entryCard: {
      backgroundColor: theme.card,
      borderRadius: 10,
      marginBottom: 15,
      padding: 15,
      shadowColor: isDark ? "#000" : "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 2,
      elevation: isDark ? 3 : 2,
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
      color: theme.text,
    },
    timestamp: {
      fontSize: 12,
      color: theme.textTertiary,
      marginTop: 2,
    },
    intensityBadge: {
      backgroundColor: isDark ? "#333" : "#f0f0f0",
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 12,
    },
    intensityText: {
      fontSize: 12,
      fontWeight: "500",
      color: theme.textSecondary,
    },
    notesContainer: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.cardBorder,
    },
    notesText: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
    },
    emptyText: {
      textAlign: "center",
      color: theme.textTertiary,
      fontSize: 16,
      marginTop: 50,
    },
    deleteButton: {
      padding: 8,
      marginLeft: 5,
    },
  });

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
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
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
