import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../context/ThemeContext";
import { StatusBar } from "expo-status-bar";
import { LineChart, BarChart } from "react-native-gifted-charts";
import { getSecureItem } from "../../../utils/secureStorage";

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

export default function StatisticsScreen() {
  const [moodData, setMoodData] = useState<MoodEntry[]>([]);
  const [journalData, setJournalData] = useState<
    {
      id: number;
      title: string;
      content: string;
      mood: any | null;
      timestamp: string;
      relatedSessionId?: number | null;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const [meditationSessions, setMeditationSessions] = useState<
    MeditationSession[]
  >([]);
  const [averageRating, setAverageRating] = useState(0);

  // Wrap loadData in useCallback
  const loadData = useCallback(async () => {
    setLoading(true); // Set loading true when fetching starts
    try {
      // Load mood entries
      const moodEntries = await getSecureItem<MoodEntry[]>("mood_entries");
      setMoodData(moodEntries || []);

      // Load journal entries
      const journalEntries = await getSecureItem<any[]>("journal_entries");
      setJournalData(journalEntries || []);

      // Load meditation sessions
      const sessions = await getSecureItem<MeditationSession[]>(
        "meditation_sessions"
      );

      if (sessions && Array.isArray(sessions)) {
        setMeditationSessions(sessions);

        // Calculate average rating
        const sessionsWithRatings = sessions.filter(
          (s: MeditationSession) => s.rating && s.rating > 0
        );
        if (sessionsWithRatings.length > 0) {
          const total = sessionsWithRatings.reduce(
            (sum: number, s: MeditationSession) => sum + s.rating!,
            0
          );
          setAverageRating(
            parseFloat((total / sessionsWithRatings.length).toFixed(1))
          );
        } else {
          setAverageRating(0); // Reset if no ratings
        }
      } else {
        setMeditationSessions([]); // Reset if no sessions
        setAverageRating(0);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      // Reset state on error
      setMoodData([]);
      setJournalData([]);
      setMeditationSessions([]);
      setAverageRating(0);
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array for useCallback as loadData doesn't depend on props/state outside its scope

  // Use useFocusEffect to load data when the screen is focused
  useFocusEffect(
    useCallback(() => {
      console.log("StatisticsScreen focused, loading data..."); // Add log
      loadData();

      return () => {
        // Optional cleanup
        // console.log("StatisticsScreen blurred");
      };
    }, [loadData]) // Dependency array includes loadData
  );

  const getMeditationChartData = () => {
    if (meditationSessions.length === 0) {
      return {
        labels: [],
        datasets: [{ data: [] }],
      };
    }

    // Get the last 7 days of sessions
    const lastWeekSessions = [...meditationSessions]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, 7)
      .reverse();

    // Group by day and sum duration
    const dailyData: { [key: string]: number } = {};

    lastWeekSessions.forEach((session) => {
      const date = new Date(session.timestamp);
      const day = `${date.getMonth() + 1}/${date.getDate()}`;

      if (!dailyData[day]) {
        dailyData[day] = 0;
      }
      dailyData[day] += Math.round(session.duration / 60); // Convert to minutes
    });

    // Create chart data
    const labels = Object.keys(dailyData);
    const data = Object.values(dailyData);

    return {
      labels,
      datasets: [
        {
          data,
          color: (opacity = 1) => `rgba(78, 159, 61, ${opacity})`,
        },
      ],
    };
  };

  const getMeditationChartDataForGiftedCharts = () => {
    const rawData = getMeditationChartData(); // Use the existing calculation
    if (!rawData || rawData.labels.length === 0) {
      return [];
    }

    return rawData.labels.map((label, index) => ({
      value: rawData.datasets[0].data[index],
      label: label, // Label for the X-axis
      frontColor: theme.accent, // Bar color
      gradientColor: theme.accentHighlight,
      topLabelComponent: () => (
        <Text
          style={{ color: theme.textSecondary, fontSize: 10, marginBottom: 2 }}
        >
          {rawData.datasets[0].data[index]}
        </Text>
      ),
    }));
  };

  // Process mood data for gifted-charts LineChart (last 7 days)
  const getMoodTrendDataForGiftedCharts = () => {
    if (moodData.length === 0) {
      return []; // Return empty array if no data
    }

    // Sort entries by timestamp ascending
    const sortedData = [...moodData].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Get the last 7 days of entries (or fewer if less data exists)
    const lastWeekEntries = sortedData.slice(-7);

    // Format for gifted-charts: array of objects { value: number, label: string, dataPointText: string }
    return lastWeekEntries.map((entry, index) => {
      const date = new Date(entry.timestamp);
      const label = `${date.getMonth() + 1}/${date.getDate()}`; // Format as MM/DD
      return {
        value: entry.intensity,
        label: label, // Label for the X-axis point
        dataPointText: entry.intensity.toString(), // Text shown on the data point
        dataPointColor: theme.accent,
        dataPointRadius: 4,
        focusedDataPointColor: theme.accentHighlight, // Color when pressed
      };
    });
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
      overflow: "hidden",
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
    chartContainer: {
      paddingHorizontal: 10,
      marginTop: 10,
      marginBottom: 10,
      alignItems: "center",
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
    distributionContainer: {
      flexDirection: "column", // Stack items vertically
      marginVertical: 10,
    },
    distributionItem: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 8,
      width: "100%",
    },
    distributionLabel: {
      width: 80,
      fontSize: 14,
      color: theme.textSecondary,
      paddingRight: 10,
    },
    distributionBarContainer: {
      flex: 1,
      height: 20,
      backgroundColor: isDark ? "#333" : "#f0f0f0",
      borderRadius: 10,
      marginHorizontal: 15,
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
      marginLeft: 5,
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

  const moodTrendChartData = getMoodTrendDataForGiftedCharts();
  const meditationBarChartData = getMeditationChartDataForGiftedCharts();

  // Calculate chart width (ensure padding values are correct)
  const chartWidth =
    Dimensions.get("window").width -
    styles.content.padding * 2 -
    styles.chartContainer.paddingHorizontal * 2;

  // Calculate spacing with better handling for few data points
  const initialChartSpacing = 20; // Slightly increase initial spacing
  const numberOfDataPoints = moodTrendChartData.length;
  const endChartSpacing = numberOfDataPoints === 2 ? 60 : 30;
  const numberOfGaps = Math.max(1, numberOfDataPoints - 1);

  // Special handling for 2-3 data points to prevent excessive spacing
  let calculatedSpacing;
  if (numberOfDataPoints === 2) {
    // For exactly 2 data points, use a more conservative spacing to ensure both are visible
    // This limits the distance between points to ensure the second one doesn't go off-screen
    calculatedSpacing = Math.min(
      120,
      chartWidth - initialChartSpacing - endChartSpacing
    );
  } else if (numberOfDataPoints <= 4) {
    // For 3-4 points, use a balanced approach
    calculatedSpacing =
      (chartWidth - initialChartSpacing - endChartSpacing) / numberOfGaps;
  } else {
    // For 5+ points, use the original calculation with a reasonable minimum
    const spaceForPoints = chartWidth - initialChartSpacing - endChartSpacing;
    calculatedSpacing = Math.max(
      30,
      Math.min(60, spaceForPoints / numberOfGaps)
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.navigate("/")}
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
            {moodTrendChartData.length > 0 ? (
              <View style={styles.chartContainer}>
                <LineChart
                  data={moodTrendChartData}
                  height={200}
                  width={chartWidth}
                  initialSpacing={initialChartSpacing}
                  endSpacing={endChartSpacing}
                  spacing={calculatedSpacing}
                  color={theme.accent}
                  thickness={3}
                  dataPointsColor={theme.accent}
                  dataPointsRadius={5} // Slightly larger data points
                  textFontSize={11}
                  textColor={theme.text}
                  yAxisColor={theme.cardBorder}
                  xAxisColor={theme.cardBorder}
                  yAxisTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
                  xAxisLabelTextStyle={{
                    color: theme.textSecondary,
                    fontSize: 8, // Make labels even smaller
                    textAlign: "center",
                  }}
                  yAxisOffset={0}
                  maxValue={5}
                  noOfSections={5}
                  yAxisLabelSuffix=""
                  rulesColor={theme.cardBorder}
                  rulesType="solid"
                  // Add a simple pointer configuration
                  pointerConfig={{
                    pointerStripColor: theme.accent,
                    pointerStripWidth: 2,
                    pointerColor: theme.accent,
                    radius: 6,
                    pointerLabelWidth: 100,
                    pointerLabelHeight: 45,
                    activatePointersOnLongPress: true,
                    autoAdjustPointerLabelPosition: true,
                    pointerLabelComponent: (
                      items: Array<{
                        value: number;
                        label: string;
                        dataPointText?: string;
                        date?: string;
                      }>
                    ) => {
                      return (
                        <View
                          style={{
                            backgroundColor: theme.card,
                            padding: 8,
                            borderRadius: 4,
                            borderColor: theme.accent,
                            borderWidth: 1,
                          }}
                        >
                          <Text style={{ color: theme.text, fontSize: 12 }}>
                            {items[0].label}
                          </Text>
                          <Text
                            style={{ color: theme.text, fontWeight: "bold" }}
                          >
                            Intensity: {items[0].value}
                          </Text>
                        </View>
                      );
                    },
                  }}
                />
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
                  <View style={styles.distributionContainer}>
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

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Meditation Time (Last 7 Days)</Text>
            {meditationBarChartData.length > 0 ? (
              <View style={styles.chartContainer}>
                <BarChart
                  data={meditationBarChartData}
                  height={150}
                  // width={Dimensions.get('window').width - 80} // Adjust width based on card/container padding
                  barWidth={25} // Adjust bar width
                  spacing={
                    (Dimensions.get("window").width -
                      100 -
                      meditationBarChartData.length * 25) /
                    (meditationBarChartData.length > 1
                      ? meditationBarChartData.length
                      : 1)
                  } // Adjust spacing dynamically
                  initialSpacing={10}
                  // Bar appearance
                  frontColor={theme.accent} // Default bar color (can be overridden in data)
                  // Optional gradient
                  // gradientColor={theme.accentHighlight}
                  // Axis configuration
                  yAxisColor={theme.cardBorder}
                  xAxisColor={theme.cardBorder}
                  yAxisTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
                  xAxisLabelTextStyle={{
                    color: theme.textSecondary,
                    fontSize: 10,
                    textAlign: "center",
                    marginTop: 5,
                  }}
                  // Y-axis setup
                  yAxisOffset={0} // Start Y axis from 0
                  // maxValue={/* Optional: Set explicit max value if needed */}
                  noOfSections={4} // Adjust number of horizontal lines
                  yAxisLabelSuffix=" min"
                  // Background lines
                  rulesColor={theme.cardBorder}
                  rulesType="solid"
                  // Show values on top of bars (optional)
                  // showValuesAsTopLabel={true}
                  // topLabelTextStyle={{ color: theme.text, fontSize: 10 }}
                />
              </View>
            ) : (
              <Text style={styles.emptyText}>No meditation data available</Text>
            )}
            <Text
              style={[
                styles.insightText,
                { marginTop: 10, textAlign: "center" },
              ]}
            >
              Minutes of meditation per day
            </Text>
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
            <Text style={styles.insightText}>
              • Total meditation sessions: {meditationSessions.length}
            </Text>
            <Text style={styles.insightText}>
              • Average session rating:{" "}
              {averageRating > 0 ? averageRating : "No ratings"}
            </Text>
            <Text style={styles.insightText}>
              • Total minutes meditated:{" "}
              {Math.round(
                meditationSessions.reduce((sum, s) => sum + s.duration, 0) / 60
              )}
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
