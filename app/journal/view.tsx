import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { StatusBar } from "expo-status-bar";

interface JournalEntry {
  id: number;
  title: string;
  content: string;
  mood: any | null;
  timestamp: string;
}

export default function JournalViewScreen() {
  const { id } = useLocalSearchParams();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const router = useRouter();
  const { theme, isDark } = useTheme();

  useEffect(() => {
    if (!id) return;

    const loadEntry = async () => {
      try {
        const entriesJson = await AsyncStorage.getItem("journal_entries");
        if (entriesJson) {
          const entries = JSON.parse(entriesJson);
          const foundEntry = entries.find(
            (e: JournalEntry) => e.id.toString() === id.toString()
          );
          if (foundEntry) {
            setEntry(foundEntry);
          }
        }
      } catch (error) {
        console.error("Failed to load journal entry:", error);
      }
    };

    loadEntry();
  }, [id]);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
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
      paddingBottom: 15,
      backgroundColor: theme.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.cardBorder,
      shadowColor: isDark ? "#000" : "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 3,
      elevation: 3,
    },
    title: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.text,
    },
    content: {
      padding: 20,
      flex: 1,
    },
    entryTitle: {
      fontSize: 22,
      fontWeight: "bold",
      color: theme.text,
      marginBottom: 5,
    },
    date: {
      fontSize: 14,
      color: theme.textTertiary,
      marginBottom: 20,
    },
    moodContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 20,
      padding: 10,
      backgroundColor: theme.card,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.cardBorder,
    },
    moodIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 10,
    },
    moodText: {
      fontSize: 15,
      color: theme.textSecondary,
    },
    entryContent: {
      fontSize: 16,
      lineHeight: 24,
      color: theme.text,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      fontSize: 16,
      color: theme.textTertiary,
    },
  });

  if (!entry) {
    return (
      <View style={styles.container}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Journal Entry</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading entry...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Journal Entry</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.entryTitle}>{entry.title}</Text>
        <Text style={styles.date}>{formatDate(entry.timestamp)}</Text>

        {entry.mood && (
          <View style={styles.moodContainer}>
            <View
              style={[
                styles.moodIcon,
                { backgroundColor: entry.mood.mood.color + "30" },
              ]}
            >
              <Ionicons
                name={entry.mood.mood.icon as any}
                size={20}
                color={entry.mood.mood.color}
              />
            </View>
            <Text style={styles.moodText}>
              Feeling {entry.mood.mood.name} ({entry.mood.intensity}/5)
            </Text>
          </View>
        )}

        <Text style={styles.entryContent}>{entry.content}</Text>
      </ScrollView>
    </View>
  );
}
