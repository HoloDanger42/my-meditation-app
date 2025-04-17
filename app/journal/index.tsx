import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { StatusBar } from "expo-status-bar";
import { getSecureItem, setSecureItem } from "../../utils/secureStorage";

interface JournalEntry {
  id: number;
  title: string;
  content: string;
  mood: any | null;
  timestamp: string;
}

export default function JournalScreen() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const router = useRouter();
  const { theme, isDark } = useTheme();

  useEffect(() => {
    loadEntries();
  });

  const loadEntries = async () => {
    try {
      const journalEntries = await getSecureItem<JournalEntry[]>(
        "journal_entries"
      );

      // Handle null/undefined or non-array results
      if (journalEntries && Array.isArray(journalEntries)) {
        setEntries(journalEntries);
      } else {
        setEntries([]);
      }
    } catch (error) {
      console.error("Failed to load journal entries: ", error);
      setEntries([]); // Ensure entries is at least an empty array on error
    }
  };

  const deleteEntry = async (entryId: number) => {
    Alert.alert(
      "Delete Entry",
      "Are you sure you want to delete this journal entry?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const updatedEntries = entries.filter(
                (entry) => entry.id !== entryId
              );
              await setSecureItem("journal_entries", updatedEntries);
              setEntries(updatedEntries);
            } catch (error) {
              console.error("Failed to delete journal entry: ", error);
              Alert.alert("Error", "Failed to deletethe entry");
            }
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const renderItem = ({ item }: { item: JournalEntry }) => (
    <TouchableOpacity
      style={[styles.entryCard, { backgroundColor: theme.card }]}
      onPress={() =>
        router.push({ pathname: "/journal/view", params: { id: item.id } })
      }
    >
      <View style={styles.entryHeader}>
        <Text style={[styles.entryTitle, { color: theme.text }]}>
          {item.title}
        </Text>
        <TouchableOpacity onPress={() => deleteEntry(item.id)}>
          <Ionicons name="trash-outline" size={20} color="#FF6347" />
        </TouchableOpacity>
      </View>

      <Text style={[styles.timestamp, { color: theme.textTertiary }]}>
        {formatDate(item.timestamp)}
      </Text>

      {item.mood && (
        <View style={styles.moodTag}>
          <View
            style={[
              styles.moodIcon,
              { backgroundColor: item.mood.mood.color + "30" },
            ]}
          >
            <Ionicons
              name={item.mood.mood.icon as any}
              size={16}
              color={item.mood.mood.color}
            />
          </View>
          <Text style={[styles.moodText, { color: theme.textSecondary }]}>
            {item.mood.mood.name}
          </Text>
        </View>
      )}

      <Text
        style={[styles.preview, { color: theme.textSecondary }]}
        numberOfLines={2}
      >
        {item.content}
      </Text>
    </TouchableOpacity>
  );

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
      paddingBottom: 15,
      backgroundColor: theme.card,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.text,
    },
    listContent: {
      padding: 15,
      paddingBottom: 30,
    },
    entryCard: {
      borderRadius: 10,
      padding: 15,
      marginBottom: 15,
      shadowColor: isDark ? "#000" : "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    entryHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 5,
    },
    entryTitle: {
      fontSize: 18,
      fontWeight: "600",
      flex: 1,
    },
    timestamp: {
      fontSize: 12,
      marginBottom: 8,
    },
    moodTag: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
    },
    moodIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 5,
    },
    moodText: {
      fontSize: 12,
    },
    preview: {
      fontSize: 14,
      lineHeight: 20,
    },
    emptyContainer: {
      alignItems: "center",
      marginTop: 50,
    },
    emptyText: {
      fontSize: 16,
      color: theme.textTertiary,
      marginBottom: 20,
    },
    newButton: {
      backgroundColor: theme.accent,
      paddingVertical: 12,
      paddingHorizontal: 25,
      borderRadius: 8,
    },
    buttonText: {
      color: "white",
      fontWeight: "500",
      fontSize: 16,
    },
  });

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={styles.header}>
        <Text style={styles.title}>Journal</Text>
        <TouchableOpacity onPress={() => router.push("/journal/new")}>
          <Ionicons name="add-circle" size={28} color={theme.accent} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={entries}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No journal entries yet</Text>
            <TouchableOpacity
              style={styles.newButton}
              onPress={() => router.push("/journal/new")}
            >
              <Text style={styles.buttonText}>Create First Entry</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}
