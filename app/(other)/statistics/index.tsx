import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LineChart, BarChart } from "react-native-chart-kit";

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Insights</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4E9F3D" />
          <Text style={styles.loadingText}>Loading data...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Mood Intensity (Last 7 Days)</Text>
            {moodData.length > 0 ? (
              <LineChart
                data={processedMoodData}
                width={Dimensions.get("window").width - 40}
                height={220}
                chartConfig={{
                  backgroundColor: "#fff",
                  backgroundGradientFrom: "#fff",
                  backgroundGradientTo: "#fff",
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(78, 159, 61, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: {
                    borderRadius: 16,
                  },
                }}
                bezier
                style={styles.chart}
              />
            ) : (
              <Text style={styles.emptyText}>No mood data available</Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Mood Distribution</Text>
            {moodData.length > 0 ? (
              <BarChart
                data={getMoodDistributionData()}
                width={Dimensions.get("window").width - 40}
                height={220}
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={{
                  backgroundColor: "#fff",
                  backgroundGradientFrom: "#fff",
                  backgroundGradientTo: "#fff",
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(78, 159, 61, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                style={styles.chart}
              />
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
    paddingBottom: 10,
    backgroundColor: "white",
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  content: {
    padding: 20,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 15,
  },
  chart: {
    borderRadius: 16,
  },
  summaryCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  insightText: {
    fontSize: 14,
    color: "#555",
    marginBottom: 8,
  },
  emptyText: {
    textAlign: "center",
    color: "#777",
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
    color: "#777",
  },
});
