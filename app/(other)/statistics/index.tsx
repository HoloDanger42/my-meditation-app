import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../context/ThemeContext";
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

export default function StatisticsScreen() {
  const [moodData, setMoodData] = useState<MoodEntry[]>([]);
  const [journalData, setJournalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { theme, isDark } = useTheme();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load mood entries
      const moodEntriesJson = await AsyncStorage.getItem("mood_entries");
      if (moodEntriesJson) {
        setMoodData(JSON.parse(moodEntriesJson));
      }

      // Load journal entries
      const journalEntriesJson = await AsyncStorage.getItem("journal_entries");
      if (journalEntriesJson) {
        setJournalData(JSON.parse(journalEntriesJson));
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Process mood data into chart format
  const processedMoodData = {
    labels: moodData
      .slice(0, 7)
      .map((entry) => {
        const date = new Date(entry.timestamp);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      })
      .reverse(),
    datasets: [
      {
        data: moodData
          .slice(0, 7)
          .map((entry) => entry.intensity)
          .reverse(),
        color: (opacity = 1) => `rgba(78, 159, 61, ${opacity})`,
      },
    ],
  };

  // Get mood distribution data for bar chart
  const getMoodDistributionData = () => {
    if (moodData.length === 0) return { labels: [], datasets: [{ data: [] }] };

    const moodCounts: { [key: string]: number } = {};
    moodData.forEach((entry) => {
      const moodName = entry.mood.name;
      moodCounts[moodName] = (moodCounts[moodName] || 0) + 1;
    });

    // Get the top 5 moods by frequency
    const topMoods = Object.entries(moodCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      labels: topMoods.map(([mood]) => mood),
      datasets: [
        {
          data: topMoods.map(([_, count]) => count),
        },
      ],
    };
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
      paddingTop: 50,
      paddingBottom: 10,
      backgroundColor: theme.card,
    },
    backButton: {
      padding: 8,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.text,
    },
    content: {
      padding: 20,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 15,
      marginBottom: 20,
      shadowColor: isDark ? "#000" : "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.text,
      marginBottom: 15,
    },
    summaryCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 15,
      marginBottom: 20,
    },
    insightText: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 8,
    },
    emptyText: {
      textAlign: "center",
      color: theme.textTertiary,
      fontSize: 16,
      marginTop: 20,
      marginBottom: 20,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      marginTop: 10,
      fontSize: 16,
      color: theme.textTertiary,
    },
    customChart: {
      flexDirection: "row",
      justifyContent: "space-around",
      height: 200,
      marginTop: 10,
      paddingBottom: 20,
    },
    chartItem: {
      alignItems: "center",
      width: 30,
    },
    barContainer: {
      height: 150,
      width: 30,
      justifyContent: "flex-end",
    },
    bar: {
      width: 20,
      borderRadius: 5,
      marginHorizontal: 5,
    },
    barLabel: {
      fontSize: 10,
      marginTop: 5,
      color: theme.textSecondary,
    },
    barValue: {
      fontSize: 12,
      fontWeight: "bold",
      color: theme.text,
    },
    distributionItem: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 8,
    },
    distributionLabel: {
      width: 60,
      fontSize: 12,
      color: theme.textSecondary,
    },
    distributionBarContainer: {
      flex: 1,
      height: 15,
      backgroundColor: isDark ? "#333" : "#f0f0f0",
      borderRadius: 10,
      marginHorizontal: 10,
    },
    distributionBar: {
      height: "100%",
      backgroundColor: "#4E9F3D",
      borderRadius: 10,
    },
    distributionValue: {
      width: 30,
      fontSize: 12,
      fontWeight: "bold",
      textAlign: "right",
      color: theme.text,
    },
    singleMoodMessage: {
      padding: 15,
      backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5",
      borderRadius: 8,
      alignItems: "center",
      marginVertical: 10,
    },
    infoText: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: "center",
      marginVertical: 5,
    },
  });

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push("/")}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Insights</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={styles.loadingText}>Loading data...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Mood Intensity (Last 7 Days)</Text>
            {moodData.length > 0 ? (
              <View style={styles.customChart}>
                {processedMoodData.datasets[0].data.map((value, index) => (
                  <View key={index} style={styles.chartItem}>
                    <View style={styles.barContainer}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: (value / 5) * 150,
                            backgroundColor: theme.accent,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.barLabel}>
                      {processedMoodData.labels[index]}
                    </Text>
                    <Text style={styles.barValue}>{value}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>No mood data available</Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Mood Distribution</Text>
            {moodData.length > 0 ? (
              <>
                {getMoodDistributionData().labels.length > 1 ? (
                  <View style={styles.customChart}>
                    {getMoodDistributionData().labels.map((label, index) => {
                      const value =
                        getMoodDistributionData().datasets[0].data[index];
                      const maxValue = Math.max(
                        ...getMoodDistributionData().datasets[0].data
                      );
                      return (
                        <View key={index} style={styles.distributionItem}>
                          <Text style={styles.distributionLabel}>
                            {label.length > 10
                              ? label.substring(0, 10) + "..."
                              : label}
                          </Text>
                          <View style={styles.distributionBarContainer}>
                            <View
                              style={[
                                styles.distributionBar,
                                {
                                  width: `${(value / maxValue) * 100}%`,
                                  backgroundColor: getColorForMood(
                                    label,
                                    moodData
                                  ),
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.distributionValue}>{value}</Text>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.singleMoodMessage}>
                    <Text style={styles.infoText}>
                      You've only recorded "
                      {getMoodDistributionData().labels[0]}" so far.
                    </Text>
                    <Text style={styles.infoText}>
                      Track more moods to see your mood distribution!
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.emptyText}>No mood data available</Text>
            )}
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.cardTitle}>Insights</Text>
            <Text style={styles.insightText}>
              • Your most frequent mood: {getMostFrequentMood(moodData)}
            </Text>
            <Text style={styles.insightText}>
              • Average mood intensity: {getAverageMoodIntensity(moodData)}
            </Text>
            <Text style={styles.insightText}>
              • Journal entries this week:{" "}
              {getJournalEntriesThisWeek(journalData)}
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

// Helper functions for insights
function getMostFrequentMood(moodData: MoodEntry[]) {
  if (moodData.length === 0) return "No data";

  const moodCounts: { [key: string]: number } = {};
  moodData.forEach((entry) => {
    const moodName = entry.mood.name;
    moodCounts[moodName] = (moodCounts[moodName] || 0) + 1;
  });

  let maxCount = 0;
  let maxMood = "None";

  Object.entries(moodCounts).forEach(([mood, count]) => {
    if (count > maxCount) {
      maxCount = count;
      maxMood = mood;
    }
  });

  return maxMood;
}

function getAverageMoodIntensity(moodData: MoodEntry[]) {
  if (moodData.length === 0) return "No data";

  const sum = moodData.reduce((acc, entry) => acc + entry.intensity, 0);
  return (sum / moodData.length).toFixed(1);
}

function getJournalEntriesThisWeek(journalData: any[]) {
  if (journalData.length === 0) return 0;

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  return journalData.filter((entry) => {
    const entryDate = new Date(entry.timestamp);
    return entryDate >= oneWeekAgo;
  }).length;
}

function getColorForMood(moodName: string, moodData: MoodEntry[]): string {
  // Find the mood entry with this name to get its color
  const entry = moodData.find((entry) => entry.mood.name === moodName);
  return entry?.mood.color || "#4E9F3D"; // Default to green if not found
}
