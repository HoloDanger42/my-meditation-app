import React, { useState, useCallback, useEffect } from "react";
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import { getSecureItem } from "../utils/secureStorage";
import { useTheme } from "../context/ThemeContext";
import { StatusBar } from "expo-status-bar";
import {
  getCurrentStreak,
  getTotalMeditationSessions,
  getTotalMeditationMinutes,
} from "../utils/stats";
import { generatePersonalizedRecommendations } from "../utils/recommendations";
import { trackRecommendationEngagement } from "../utils/analytics";
import { MoodEntry, Recommendations, Meditation } from "../types/dataTypes";

export default function HomeScreen() {
  const router = useRouter();
  const [latestMood, setLatestMood] = useState<MoodEntry | null>(null);
  const { theme, isDark } = useTheme();
  const [streak, setStreak] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);

  // Function to fetch latest mood
  const fetchLatestMood = useCallback(async () => {
    try {
      const entries = await getSecureItem<MoodEntry[]>("mood_entries");

      if (entries && Array.isArray(entries) && entries.length > 0) {
        setLatestMood(entries[0]); // First entry is the latest
      } else {
        setLatestMood(null); // Handle case where no entries exist or entries is empty
      }
    } catch (error) {
      console.error("Failed to fetch mood data:", error);
      setLatestMood(null); // Reset on error
    }
  }, []); // useCallback dependency array

  // Function to load stats
  const loadStats = useCallback(async () => {
    const currentStreak = await getCurrentStreak();
    const totalSessions = await getTotalMeditationSessions();
    const minutes = await getTotalMeditationMinutes();

    setStreak(currentStreak);
    setSessionCount(totalSessions);
    setTotalMinutes(minutes);
  }, []); // useCallback dependency array

  // Use useFocusEffect to fetch data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("HomeScreen focused, fetching data..."); // Add log for debugging
      fetchLatestMood();
      loadStats();

      // Optional: Return a cleanup function if needed
      return () => {
        // console.log("HomeScreen blurred");
      };
    }, [fetchLatestMood, loadStats]) // Dependencies for the outer useCallback
  );

  // Render mood display based on latest entry
  const renderMoodDisplay = () => {
    if (!latestMood) {
      return <Text style={styles.summaryText}>How are you feeling today?</Text>;
    }

    return (
      <View style={styles.currentMoodContainer}>
        <View
          style={[
            styles.moodIconSmall,
            { backgroundColor: latestMood.mood.color + "30" },
          ]}
        >
          <Ionicons
            // name={latestMood.mood.icon as any}
            name={latestMood.mood.icon}
            size={20}
            color={latestMood.mood.color}
          />
        </View>
        <View style={styles.moodDetails}>
          <Text style={styles.moodName}>
            {latestMood.mood.name} ({latestMood.intensity}/5)
          </Text>
          <Text style={styles.moodTime}>
            {new Date(latestMood.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>
    );
  };

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
      paddingBottom: 5,
      backgroundColor: theme.card,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.text,
    },
    scrollContent: {
      paddingBottom: 20,
    },
    summaryCard: {
      backgroundColor: theme.card,
      padding: 20,
    },
    cardTitle: {
      fontSize: 18,
      color: theme.textSecondary,
      marginBottom: 15,
    },
    moodSummary: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    summaryText: {
      fontSize: 16,
      color: theme.textSecondary,
    },
    logMoodButton: {
      backgroundColor: theme.accent,
      paddingVertical: 8,
      paddingHorizontal: 15,
      borderRadius: 20,
    },
    logMoodText: {
      color: "white",
      fontWeight: "500",
    },
    sectionContainer: {
      padding: 20,
    },
    sectionTitle: {
      fontSize: 18,
      color: theme.text,
      marginBottom: 15,
      fontWeight: "600",
    },
    actionsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    actionItem: {
      width: "48%",
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 15,
      alignItems: "center",
      marginBottom: 15,
    },
    actionIcon: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.accentLight,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 10,
    },
    actionText: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.text,
    },
    tipCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 20,
      marginHorizontal: 20,
      marginBottom: 20,
    },
    tipHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
    },
    tipTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.text,
      marginLeft: 8,
    },
    tipText: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
    },
    streakCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 20,
      marginHorizontal: 20,
      marginBottom: 20,
    },
    streakTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.text,
      marginBottom: 15,
    },
    streakInfo: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    streakItem: {
      alignItems: "center",
    },
    streakCount: {
      fontSize: 22,
      fontWeight: "bold",
      color: theme.accent,
    },
    streakLabel: {
      fontSize: 12,
      color: theme.textTertiary,
      marginTop: 5,
    },
    currentMoodContainer: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    moodIconSmall: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.accentLight,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 10,
    },
    moodDetails: {
      flex: 1,
    },
    moodName: {
      fontSize: 16,
      fontWeight: "500",
      color: theme.text,
    },
    moodTime: {
      fontSize: 12,
      color: theme.textTertiary,
    },
    recommendationsCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 20,
      marginHorizontal: 20,
      marginBottom: 20,
    },
    recommendationsTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.text,
      marginBottom: 15,
    },
    insightContainer: {
      marginBottom: 15,
    },
    insightText: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    recommendationsSection: {},
    recommendationsSectionTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.text,
      marginBottom: 10,
    },
    recommendedItem: {
      flexDirection: "row",
      alignItems: "center",
    },
    recommendedItemText: {
      fontSize: 14,
      color: theme.text,
      marginLeft: 10,
    },
    breathingStatsCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 20,
      marginHorizontal: 20,
      marginBottom: 20,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
    },
    statsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    statItem: {
      alignItems: "center",
    },
    statValue: {
      fontSize: 22,
      fontWeight: "bold",
      color: theme.accent,
    },
    statLabel: {
      fontSize: 12,
      color: theme.textTertiary,
      marginTop: 5,
    },
  });

  // --- Define nested components START ---
  function PersonalizedRecommendations() {
    const [recommendations, setRecommendations] =
      useState<Recommendations | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);
    const { theme } = useTheme();
    const router = useRouter();

    useEffect(() => {
      async function loadRecommendations() {
        try {
          setIsLoading(true);
          const recs = await Promise.race([
            generatePersonalizedRecommendations(),
            new Promise<null>(
              (resolve) => setTimeout(() => resolve(null), 5000) // 5 second timeout
            ),
          ]);

          if (recs) {
            setRecommendations(recs);
          } else {
            setError(true);
          }
        } catch (err) {
          console.error("Failed to load recommendations:", err);
          setError(true);
        } finally {
          setIsLoading(false);
        }
      }

      loadRecommendations();
    }, []);

    if (isLoading) {
      return <ActivityIndicator color={theme.accent} size="small" />;
    }

    if (error || !recommendations) {
      return (
        <View style={styles.recommendationsCard}>
          <Text style={styles.recommendationsTitle}>Personalized For You</Text>
          <Text style={styles.insightText}>
            Unable to load recommendations right now. Check back later.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.recommendationsCard}>
        <Text style={styles.recommendationsTitle}>Personalized For You</Text>

        {recommendations.moodInsights && (
          <View style={styles.insightContainer}>
            <Text style={styles.insightText}>
              {recommendations.moodInsights}
            </Text>
          </View>
        )}

        {recommendations.recommendedMeditations?.length > 0 && (
          <View style={styles.recommendationsSection}>
            <Text style={styles.recommendationsSectionTitle}>
              Recommended Meditations
            </Text>
            {/* Use the correct Meditation type */}
            {recommendations.recommendedMeditations.map(
              (meditation: Meditation) => (
                <TouchableOpacity
                  key={meditation.id} // Use string id from Meditation type
                  style={styles.recommendedItem}
                  onPress={() => {
                    // meditation.id is now string, correct for the function
                    trackRecommendationEngagement(meditation.id, "clicked");
                    // Navigate using the meditation content id
                    router.push(`/meditations/${meditation.id}`);
                  }}
                  onLayout={() => {
                    // meditation.id is now string, correct for the function
                    trackRecommendationEngagement(meditation.id, "viewed");
                  }}
                >
                  <Ionicons
                    name="leaf-outline"
                    size={24}
                    color={theme.accent}
                  />
                  {/* Display title from Meditation type */}
                  <Text style={styles.recommendedItemText}>
                    {meditation.title}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>
        )}
      </View>
    );
  }

  const BreathingStats = () => {
    const [totalTime, setTotalTime] = useState(0);
    const [sessions, setSessions] = useState(0);
    const { theme } = useTheme();
    const router = useRouter();

    useEffect(() => {
      const loadStats = async () => {
        try {
          const time =
            (await getSecureItem<number>("total_breathing_time")) || 0;
          const breathingSessions =
            (await getSecureItem<any[]>("breathing_sessions")) || [];

          setTotalTime(time);
          setSessions(breathingSessions.length);
        } catch (error) {
          console.error("Failed to load breathing stats:", error);
        }
      };

      loadStats();
    }, []);

    const formatTime = (seconds: number) => {
      if (seconds < 60) return `${seconds}s`;
      const minutes = Math.floor(seconds / 60);
      return `${minutes}m`;
    };

    return (
      <TouchableOpacity
        style={styles.breathingStatsCard}
        onPress={() => router.push("/tools/breathing-history")}
      >
        <Text style={styles.recommendationsTitle}>Breathing Practice</Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatTime(totalTime)}</Text>
            <Text style={styles.statLabel}>Total Time</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{sessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  // --- Define nested components END ---

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={styles.header}>
        <Text style={styles.title}>Mental Wellness</Text>
        <TouchableOpacity onPress={() => router.push("/(other)/settings")}>
          <Ionicons name="settings-outline" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* Wellness Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.cardTitle}>Today's Wellness</Text>
        <View style={styles.moodSummary}>
          {renderMoodDisplay()}
          <TouchableOpacity
            style={styles.logMoodButton}
            onPress={() => router.push("/mood")}
          >
            <Text style={styles.logMoodText}>
              {latestMood ? "Update Mood" : "Log Mood"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Quick Actions */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push("/meditations")}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="leaf-outline" size={28} color={theme.accent} />
              </View>
              <Text style={styles.actionText}>Meditate</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push("/journal/new")}
            >
              <View style={styles.actionIcon}>
                <FontAwesome name="pencil" size={28} color={theme.accent} />
              </View>
              <Text style={styles.actionText}>Journal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push("/tools/breathing")}
            >
              <View style={styles.actionIcon}>
                <Ionicons
                  name="medical-outline"
                  size={28}
                  color={theme.accent}
                />
              </View>
              <Text style={styles.actionText}>Breathing</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => {
                router.push({
                  pathname: "/(other)/history",
                });
              }}
            >
              <View style={styles.actionIcon}>
                <Ionicons
                  name="bar-chart-outline"
                  size={28}
                  color={theme.accent}
                />
              </View>
              <Text style={styles.actionText}>Progress</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => {
                router.push({
                  pathname: "/(other)/statistics",
                });
              }}
            >
              <View style={styles.actionIcon}>
                <Ionicons
                  name="analytics-outline"
                  size={28}
                  color={theme.accent}
                />
              </View>
              <Text style={styles.actionText}>Statistics</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Daily Tip */}
        <View style={styles.tipCard}>
          <View style={styles.tipHeader}>
            <Ionicons name="bulb-outline" size={24} color="#FFB800" />
            <Text style={styles.tipTitle}>Wellness Tip</Text>
          </View>
          <Text style={styles.tipText}>
            Taking just five minutes to practice mindful breathing can help
            reduce stress and improve focus.
          </Text>
        </View>

        {/* Streak Card*/}
        <View style={styles.streakCard}>
          <Text style={styles.streakTitle}>Your Progress</Text>
          <View style={styles.streakInfo}>
            <View style={styles.streakItem}>
              <Text style={styles.streakCount}>{streak}</Text>
              <Text style={styles.streakLabel}>Day Streak</Text>
            </View>
            <View style={styles.streakItem}>
              <Text style={styles.streakCount}>{sessionCount}</Text>
              <Text style={styles.streakLabel}>Meditations</Text>
            </View>
            <View style={styles.streakItem}>
              <Text style={styles.streakCount}>{totalMinutes}</Text>
              <Text style={styles.streakLabel}>Minutes</Text>
            </View>
          </View>
        </View>

        {/* Personalized Recommendations */}
        <PersonalizedRecommendations />

        {/* Breathing Stats */}
        <BreathingStats />
      </ScrollView>
    </View>
  );
}
