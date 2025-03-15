import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { StatusBar } from "expo-status-bar";

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

export default function NewJournalEntryScreen() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [latestMood, setLatestMood] = useState<MoodEntry | null>(null);
  const router = useRouter();
  const { theme, isDark } = useTheme();

  // Fetch latest mood entry when component mounts
  useEffect(() => {
    const fetchLatestMood = async () => {
      try {
        const entriesJson = await AsyncStorage.getItem("mood_entries");
        if (entriesJson) {
          const entries = JSON.parse(entriesJson);
          if (entries.length > 0) {
            setLatestMood(entries[0]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch mood data:", error);
      }
    };

    fetchLatestMood();
  }, []);

  const saveEntry = async () => {
    if (!title.trim()) {
      Alert.alert("Please enter a title for your journal entry");
      return;
    }

    try {
      // Get existing entries
      const entriesJson = await AsyncStorage.getItem("journal_entries");
      const entries = entriesJson ? JSON.parse(entriesJson) : [];

      // Create new entry
      const newEntry = {
        id: Date.now(),
        title,
        content,
        mood: latestMood,
        timestamp: new Date().toISOString(),
      };

      // Save updated entries
      await AsyncStorage.setItem(
        "journal_entries",
        JSON.stringify([newEntry, ...entries])
      );

      Alert.alert("Success", "Your journal entry has been saved!", [
        { text: "OK", onPress: () => router.replace("/journal") },
      ]);
    } catch (error) {
      console.error("Failed to save journal entry:", error);
      Alert.alert("Error", "Failed to save your journal entry");
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
    backButton: {
      padding: 5,
    },
    title: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.text,
    },
    form: {
      padding: 20,
    },
    currentMood: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 20,
      backgroundColor: theme.card,
      padding: 15,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.cardBorder,
    },
    moodLabel: {
      fontSize: 16,
      color: theme.textSecondary,
      marginRight: 10,
    },
    moodDisplay: {
      flexDirection: "row",
      alignItems: "center",
    },
    moodIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 8,
    },
    moodText: {
      fontSize: 15,
      color: theme.text,
    },
    titleInput: {
      height: 50,
      borderWidth: 1,
      borderColor: theme.cardBorder,
      borderRadius: 8,
      padding: 15,
      fontSize: 16,
      backgroundColor: theme.inputBackground,
      color: theme.text,
      marginBottom: 15,
    },
    contentInput: {
      height: 300,
      borderWidth: 1,
      borderColor: theme.cardBorder,
      borderRadius: 8,
      padding: 15,
      fontSize: 16,
      backgroundColor: theme.inputBackground,
      color: theme.text,
      marginBottom: 20,
    },
    saveButton: {
      backgroundColor: theme.accent,
      paddingVertical: 12,
      paddingHorizontal: 30,
      borderRadius: 8,
      alignItems: "center",
      marginTop: 10,
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
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.title}>New Journal Entry</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView>
        <View style={styles.form}>
          {latestMood && (
            <View style={styles.currentMood}>
              <Text style={styles.moodLabel}>Current Mood:</Text>
              <View style={styles.moodDisplay}>
                <View
                  style={[
                    styles.moodIcon,
                    { backgroundColor: latestMood.mood.color + "30" },
                  ]}
                >
                  <Ionicons
                    name={latestMood.mood.icon as any}
                    size={18}
                    color={latestMood.mood.color}
                  />
                </View>
                <Text style={styles.moodText}>
                  {latestMood.mood.name} ({latestMood.intensity}/5)
                </Text>
              </View>
            </View>
          )}

          <TextInput
            style={styles.titleInput}
            placeholder="Entry Title"
            placeholderTextColor={theme.textTertiary}
            value={title}
            onChangeText={setTitle}
          />

          <TextInput
            style={styles.contentInput}
            multiline
            placeholder="How are you feeling today?"
            placeholderTextColor={theme.textTertiary}
            value={content}
            onChangeText={setContent}
            textAlignVertical="top"
          />

          <TouchableOpacity style={styles.saveButton} onPress={saveEntry}>
            <Text style={styles.buttonText}>Save Entry</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
