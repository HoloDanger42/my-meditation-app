import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { StatusBar } from "expo-status-bar";

// Define the mood options
const moodOptions = [
  { id: 1, name: "Happy", icon: "happy-outline", color: "#FFD700" },
  { id: 2, name: "Calm", icon: "leaf-outline", color: "#4E9F3D" },
  { id: 3, name: "Anxious", icon: "pulse-outline", color: "#FFB347" },
  { id: 4, name: "Sad", icon: "rainy-outline", color: "#6495ED" },
  { id: 5, name: "Angry", icon: "flame-outline", color: "#FF6347" },
  { id: 6, name: "Tired", icon: "bed-outline", color: "#8A8A8A" },
  { id: 7, name: "Stressed", icon: "alert-circle-outline", color: "#FF7F50" },
  { id: 8, name: "Energetic", icon: "flash-outline", color: "#FFA500" },
];

export default function MoodScreen() {
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [intensity, setIntensity] = useState<number>(3);
  const [notes, setNotes] = useState<string>("");
  const router = useRouter();
  const { theme, isDark } = useTheme();

  const saveMoodEntry = async () => {
    if (selectedMood === null) {
      Alert.alert("Please select a mood");
      return;
    }

    try {
      // Get current entries
      const entriesJson = await AsyncStorage.getItem("mood_entries");
      const entries = entriesJson ? JSON.parse(entriesJson) : [];

      // Create new entry
      const newEntry = {
        id: Date.now(),
        mood: moodOptions.find((mood) => mood.id === selectedMood),
        intensity,
        notes,
        timestamp: new Date().toISOString(),
      };

      // Save updated entries
      await AsyncStorage.setItem(
        "mood_entries",
        JSON.stringify([newEntry, ...entries])
      );

      Alert.alert("Success", "Your mood has been logged!", [
        { text: "OK", onPress: () => router.push("/") },
      ]);
    } catch (error) {
      console.error("Failed to save mood:", error);
      Alert.alert("Error", "Failed to save your mood entry");
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: 60,
      paddingHorizontal: 20,
      backgroundColor: theme.background,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 10,
      color: theme.text,
    },
    subtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      marginBottom: 25,
    },
    moodGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginBottom: 30,
    },
    moodItem: {
      width: "48%",
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 15,
      alignItems: "center",
      marginBottom: 15,
      borderWidth: 2,
      borderColor: "transparent",
    },
    moodIcon: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.accentLight,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 10,
    },
    moodName: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.text,
    },
    section: {
      marginBottom: 25,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.text,
      marginBottom: 5,
    },
    sectionSubtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 15,
    },
    intensityContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 10,
    },
    intensityScale: {
      flexDirection: "row",
      flex: 1,
      justifyContent: "space-between",
      marginHorizontal: 15,
    },
    intensityDot: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.cardBorder,
    },
    intensityLabel: {
      fontSize: 14,
      color: theme.textSecondary,
      width: 50,
    },
    notesInput: {
      height: 120,
      borderWidth: 1,
      borderColor: theme.cardBorder,
      borderRadius: 8,
      padding: 15,
      fontSize: 16,
      backgroundColor: theme.card,
      color: theme.text,
    },
    saveButton: {
      backgroundColor: theme.accent,
      paddingVertical: 15,
      borderRadius: 10,
      alignItems: "center",
      marginTop: 10,
      marginBottom: 20,
    },
    saveButtonText: {
      color: "white",
      fontSize: 16,
      fontWeight: "600",
    },
    historyLinkContainer: {
      marginTop: 10,
      marginBottom: 80,
      alignItems: "center",
    },
    historyLink: {
      flexDirection: "row",
      alignItems: "center",
    },
    historyLinkText: {
      color: theme.accent,
      fontSize: 16,
      fontWeight: "500",
      marginRight: 5,
    },
  });

  return (
    <ScrollView style={styles.container}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Text style={styles.title}>How are you feeling?</Text>
      <Text style={styles.subtitle}>
        Select the mood that best describes how you feel right now
      </Text>

      <View style={styles.moodGrid}>
        {moodOptions.map((mood) => (
          <TouchableOpacity
            key={mood.id}
            style={[
              styles.moodItem,
              selectedMood === mood.id && {
                backgroundColor: mood.color + "20", // Add transparency
                borderColor: mood.color,
              },
            ]}
            onPress={() => setSelectedMood(mood.id)}
          >
            <View
              style={[
                styles.moodIcon,
                { backgroundColor: mood.color + "30" }, // Light version of the color
              ]}
            >
              <Ionicons name={mood.icon as any} size={28} color={mood.color} />
            </View>
            <Text style={styles.moodName}>{mood.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Intensity</Text>
        <Text style={styles.sectionSubtitle}>
          How strongly are you feeling this?
        </Text>

        <View style={styles.intensityContainer}>
          <Text style={styles.intensityLabel}>Mild</Text>
          <View style={styles.intensityScale}>
            {[1, 2, 3, 4, 5].map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.intensityDot,
                  intensity >= level && { backgroundColor: "#4E9F3D" },
                ]}
                onPress={() => setIntensity(level)}
              />
            ))}
          </View>
          <Text style={styles.intensityLabel}>Strong</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes</Text>
        <Text style={styles.sectionSubtitle}>
          Add any thoughts or context (optional)
        </Text>
        <TextInput
          style={styles.notesInput}
          multiline
          placeholder="What's on your mind?"
          placeholderTextColor={theme.textTertiary}
          value={notes}
          onChangeText={setNotes}
          textAlignVertical="top"
        />
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={saveMoodEntry}>
        <Text style={styles.saveButtonText}>Save Mood Entry</Text>
      </TouchableOpacity>

      <View style={styles.historyLinkContainer}>
        <TouchableOpacity
          style={styles.historyLink}
          onPress={() => router.push("/mood/history" as any)}
        >
          <Text style={styles.historyLinkText}>View Mood History</Text>
          <Ionicons name="chevron-forward" size={16} color="#4E9F3D" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
