import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
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

interface MeditationSession {
  id: number;
  meditationId: string;
  duration: number;
  rating?: number;
  timestamp: string;
}

export default function NewJournalEntryScreen() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [latestMood, setLatestMood] = useState<MoodEntry | null>(null);
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const [isSaving, setIsSaving] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const [recentSessions, setRecentSessions] = useState<MeditationSession[]>([]);
  const [relatedSessionId, setRelatedSessionId] = useState<number | null>(null);

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

  // Load recent meditation sessions
  useEffect(() => {
    const loadRecentSessions = async () => {
      try {
        const sessionsJson = await AsyncStorage.getItem("meditation_sessions");
        if (sessionsJson) {
          const sessions = JSON.parse(sessionsJson);
          // Get only recent sessions (last 7 days)
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

          const recentOnes = sessions.filter(
            (session: MeditationSession) =>
              new Date(session.timestamp) >= oneWeekAgo
          );

          setRecentSessions(recentOnes.slice(0, 5)); // Last 5 sessions
        }
      } catch (error) {
        console.error("Failed to load recent sessions:", error);
      }
    };

    loadRecentSessions();
  }, []);

  const saveEntry = async () => {
    if (!title.trim()) {
      Alert.alert(
        "Missing Title",
        "Please enter a title for your journal entry"
      );
      return;
    }

    try {
      // Show loading indicator
      setIsSaving(true);

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
        relatedSessionId: relatedSessionId,
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
    } finally {
      setIsSaving(false);
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
    disabledButton: {
      backgroundColor: theme.accent + "80", // 50% opacity
    },
    promptSection: {
      marginBottom: 20,
    },
    promptButton: {
      backgroundColor: theme.card,
      padding: 12,
      borderRadius: 8,
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.cardBorder,
    },
    promptButtonText: {
      color: theme.accent,
      fontWeight: "500",
    },
    promptList: {
      backgroundColor: theme.card,
      borderRadius: 8,
      padding: 15,
      marginTop: 10,
      borderWidth: 1,
      borderColor: theme.cardBorder,
    },
    promptHeader: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.text,
      marginBottom: 10,
    },
    promptItem: {
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.cardBorder + "50",
    },
    promptText: {
      fontSize: 14,
      color: theme.text,
      lineHeight: 20,
    },
    sessionSection: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.text,
      marginBottom: 5,
    },
    sectionSubtitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.text,
      marginBottom: 10,
    },
    sessionsScroll: {
      flexGrow: 0,
    },
    sessionItem: {
      backgroundColor: theme.card,
      borderRadius: 10,
      padding: 15,
      marginRight: 10,
      marginBottom: 5,
      borderWidth: 1,
      borderColor: theme.cardBorder,
      width: 180,
    },
    sessionTitle: {
      fontSize: 15,
      fontWeight: "500",
      color: theme.text,
      marginBottom: 5,
      textTransform: "capitalize",
    },
    sessionDate: {
      fontSize: 12,
      color: theme.textSecondary,
      marginBottom: 5,
    },
    sessionDuration: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.accent,
    },
    sessionCheck: {
      position: "absolute",
      right: 10,
      top: 10,
    },
    emptySessionsText: {
      color: theme.textTertiary,
      fontStyle: "italic",
      textAlign: "center",
      padding: 15,
    },
  });

  const journalPrompts = useMemo(
    () => [
      "What are you grateful for today?",
      "What emotions did you experience during today's meditation?",
      "What insights came up during your practice today?",
      "How did your body feel during meditation today?",
      "What thoughts kept arising during your meditation?",
      "How did your meditation affect your mood today?",
      "What would you like to focus on in your next meditation?",
      "How has your mindfulness practice affected your daily life?",
      "What challenges did you face in your meditation today?",
      "What sensations did you notice in your body today?",
    ],
    []
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

          <View style={styles.promptSection}>
            <TouchableOpacity
              style={styles.promptButton}
              onPress={() => setShowPrompts(!showPrompts)}
            >
              <Text style={styles.promptButtonText}>
                {showPrompts ? "Hide Prompts" : "Need Inspiration?"}
              </Text>
            </TouchableOpacity>

            {showPrompts && (
              <View style={styles.promptList}>
                <Text style={styles.promptHeader}>Journal Prompts:</Text>
                {journalPrompts.map((prompt, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.promptItem}
                    onPress={() => {
                      setContent(
                        content ? `${content}\n\n${prompt}\n` : `${prompt}\n`
                      );
                      setShowPrompts(false);
                    }}
                  >
                    <Text style={styles.promptText}>• {prompt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.sessionSection}>
            <Text style={styles.sectionTitle}>Related Meditation Session</Text>
            <Text style={styles.sectionSubtitle}>
              Did this journal entry follow a meditation?
            </Text>

            {recentSessions.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.sessionsScroll}
              >
                {recentSessions.map((session) => {
                  const isSelected = relatedSessionId === session.id;
                  const date = new Date(session.timestamp);
                  const formattedDate = `${date.toLocaleDateString()}  at ${date.getHours()}:${String(
                    date.getMinutes()
                  ).padStart(2, "0")}`;

                  return (
                    <TouchableOpacity
                      key={session.id}
                      style={[
                        styles.sessionItem,
                        isSelected && {
                          backgroundColor: theme.accent + "30",
                          borderColor: theme.accent,
                        },
                      ]}
                      onPress={() =>
                        setRelatedSessionId(isSelected ? null : session.id)
                      }
                    >
                      <Text style={styles.sessionTitle} numberOfLines={1}>
                        {session.meditationId.includes("/")
                          ? session.meditationId
                              .split("/")
                              .pop()
                              ?.replace(/-/g, " ")
                          : session.meditationId}
                      </Text>
                      <Text style={styles.sessionDate}>{formattedDate}</Text>
                      <Text style={styles.sessionDuration}>
                        {Math.round(session.duration / 60)} min
                      </Text>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={theme.accent}
                          style={styles.sessionCheck}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <Text style={styles.emptySessionsText}>
                No recent meditation sessions
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.disabledButton]}
            onPress={saveEntry}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.buttonText}>Save Entry</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
