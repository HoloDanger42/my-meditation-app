import AsyncStorage from "@react-native-async-storage/async-storage";
import { MoodEntry, MeditationSession } from "../types/dataTypes";
import { meditationsData } from "../data/meditationsData";

export async function generatePersonalizedRecommendations() {
  try {
    // Fetch user data
    const moodEntriesJson = await AsyncStorage.getItem("mood_entries");
    const moodData = moodEntriesJson ? JSON.parse(moodEntriesJson) : [];

    const meditationSessionsJson = await AsyncStorage.getItem(
      "meditation_sessions"
    );
    const meditationData = meditationSessionsJson
      ? JSON.parse(meditationSessionsJson)
      : [];

    const journalEntriesJson = await AsyncStorage.getItem("journal_entries");
    const journalData = journalEntriesJson
      ? JSON.parse(journalEntriesJson)
      : [];

    const dominantMood = calculateDominantMood(moodData);

    // Generate recommendations based on mood patterns
    return {
      recommendedMeditations: recommendMeditationsBasedOnMood(
        moodData,
        meditationData
      ),
      moodInsights: generateMoodInsights(moodData),
      journalPrompts: generateJournalPrompts(moodData),
      dominantMood: dominantMood,
    };
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return null;
  }
}
function recommendMeditationsBasedOnMood(
  moodData: MoodEntry[],
  meditationData: MeditationSession[]
) {
  // Get recent moods (last 3 days)
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const recentMoods = moodData.filter(
    (entry) => new Date(entry.timestamp) >= threeDaysAgo
  );

  // Find dominant mood
  const moodCounts: { [key: string]: number } = {};
  recentMoods.forEach((entry) => {
    moodCounts[entry.mood.name] = (moodCounts[entry.mood.name] || 0) + 1;
  });

  let dominantMood = "";
  let highestCount = 0;

  Object.entries(moodCounts).forEach(([mood, count]) => {
    if (count > highestCount) {
      highestCount = count;
      dominantMood = mood;
    }
  });

  // Map moods to recommended meditation categories
  const moodMeditationMap: { [key: string]: string[] } = {
    Anxious: ["anxiety", "breathing", "focus"],
    Sad: ["positivity", "gratitude", "gentle"],
    Tired: ["energy", "morning", "focus"],
    Stressed: ["anxiety", "breathing", "body", "stress"],
    Happy: ["gratitude", "mindfulness"],
    Calm: ["mindfulness", "awareness", "intermediate"],
    Angry: ["breathing", "mindfulness", "stress"],
    Energetic: ["focus", "mindfulness"],
  };

  // Get meditation categories based on dominant mood
  const recommendedCategories =
    dominantMood && moodMeditationMap[dominantMood]
      ? moodMeditationMap[dominantMood]
      : ["mindfulness", "beginner"]; // default if no dominant mood

  // Consider previously completed meditations (avoid repeating too soon)
  const recentlyCompleted = meditationData
    .filter(
      (session) => typeof session.rating === "number" && session.rating >= 4
    ) // Focus on highly rated sessions
    .slice(0, 5)
    .map((session) => session.meditationId);

  // Consider time of day for recommendations
  const currentHour = new Date().getHours();
  let timeBasedCategories: string[] = [];

  if (currentHour < 10) {
    timeBasedCategories = ["morning", "energy", "focus"];
  } else if (currentHour > 19) {
    timeBasedCategories = ["sleep", "relaxation", "evening"];
  }

  // Blend mood-based and time-based recommendations
  const finalCategories = [...recommendedCategories, ...timeBasedCategories];

  // Filter all meditations by recommended categories
  const recommendations = Object.values(meditationsData)
    .filter((meditation) =>
      meditation.category.some((cat) => finalCategories.includes(cat))
    )
    .slice(0, 3); // Return only top 3

  // Add personalized message to each recommendation
  return recommendations.map((rec) => ({
    ...rec,
    personalizedMessage: `Recommended for your ${
      dominantMood.toLowerCase() || "current"
    } mood`,
  }));
}

function generateMoodInsights(moodData: MoodEntry[]) {
  if (moodData.length === 0) {
    return "Start tracking your mood to receive personalized insights.";
  }

  // Get recent moods (last 7 days)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const recentMoods = moodData.filter(
    (entry) => new Date(entry.timestamp) >= oneWeekAgo
  );

  if (recentMoods.length === 0) {
    return "Track your mood regularly to see personalized insights.";
  }

  // Calculate average intensity
  const avgIntensity =
    recentMoods.reduce((sum, entry) => sum + entry.intensity, 0) /
    recentMoods.length;

  // Get most frequent mood
  const moodCounts: { [key: string]: number } = {};
  recentMoods.forEach((entry) => {
    moodCounts[entry.mood.name] = (moodCounts[entry.mood.name] || 0) + 1;
  });

  let dominantMood = "";
  let highestCount = 0;

  Object.entries(moodCounts).forEach(([mood, count]) => {
    if (count > highestCount) {
      highestCount = count;
      dominantMood = mood;
    }
  });

  // Calculate mood trend
  const sortedByDate = [...recentMoods].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let trendResult = "steady";
  if (sortedByDate.length >= 3) {
    const firstHalf = sortedByDate.slice(
      0,
      Math.floor(sortedByDate.length / 2)
    );
    const secondHalf = sortedByDate.slice(Math.floor(sortedByDate.length / 2));

    const avgFirstHalf =
      firstHalf.reduce((sum, entry) => sum + entry.intensity, 0) /
      firstHalf.length;
    const avgSecondHalf =
      secondHalf.reduce((sum, entry) => sum + entry.intensity, 0) /
      secondHalf.length;

    if (avgSecondHalf - avgFirstHalf > 0.5) trendResult = "improving";
    else if (avgFirstHalf - avgSecondHalf > 0.5) trendResult = "declining";
  }

  // Generate insight message
  let insight = `Your predominant mood this week has been ${dominantMood.toLowerCase()}.`;

  if (trendResult === "improving") {
    insight += ` Your mood intensity has been improving recently.`;
  } else if (trendResult === "declining") {
    insight += ` Your mood intensity has shown a slight downward trend.`;
  } else {
    insight += ` Your mood has been relatively stable.`;
  }

  if (avgIntensity > 4) {
    insight += ` You've been experiencing emotions quite intensely.`;
  } else if (avgIntensity < 2) {
    insight += ` Your emotional intensity has been rather mild.`;
  }

  return insight;
}

function generateJournalPrompts(moodData: MoodEntry[]) {
  if (moodData.length === 0) {
    // Default prompts if no mood data
    return [
      "How are you feeling right now?",
      "What's on your mind today?",
      "What are you grateful for today?",
    ];
  }

  // Get most recent mood
  const recentMood = moodData[0]?.mood.name || "";

  // Common prompts for all moods
  const commonPrompts = [
    "What are you grateful for today?",
    "How has your meditation practice been affecting your daily life?",
    "What would you like to focus on in your next meditation?",
  ];

  // Mood-specific prompts
  const moodPrompts: { [key: string]: string[] } = {
    Anxious: [
      "What specific thoughts are contributing to your anxiety today?",
      "What's one small step you could take to feel more grounded?",
      "Which of your coping strategies has been most effective lately?",
    ],
    Sad: [
      "What emotions are underneath your sadness?",
      "Is there something specific that triggered this feeling?",
      "What has helped you move through sadness in the past?",
    ],
    Tired: [
      "What's been draining your energy lately?",
      "What boundaries might you need to set to protect your energy?",
      "How might you incorporate more rest into your routine?",
    ],
    Stressed: [
      "What's currently taking up the most mental space for you?",
      "Which aspects of your stress are within your control?",
      "What help or resources might make this situation easier?",
    ],
    Happy: [
      "What contributed to your positive mood today?",
      "How might you extend this feeling to tomorrow?",
      "Who might benefit from you sharing this positive energy?",
    ],
    Calm: [
      "What practices have helped you maintain this sense of calm?",
      "How does your body feel when you're in this state?",
      "What insights come more easily when you're feeling centered?",
    ],
    Angry: [
      "What need of yours isn't being met right now?",
      "Is your anger trying to protect you from something?",
      "How might you express this energy constructively?",
    ],
  };

  // Select specific prompts for the recent mood
  const specificPrompts = moodPrompts[recentMood] || [
    "How have your emotions been fluctuating today?",
    "What patterns have you noticed in your mood recently?",
    "How is your mood affecting your thoughts right now?",
  ];

  // Combine and return prompts (3 mood-specific, 2 common)
  return [...specificPrompts, ...commonPrompts].slice(0, 5);
}

function calculateDominantMood(moodData: MoodEntry[]) {
  // Get recent moods (last 3 days)
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const recentMoods = moodData.filter(
    (entry) => new Date(entry.timestamp) >= threeDaysAgo
  );

  // Find dominant mood
  const moodCounts: { [key: string]: number } = {};
  recentMoods.forEach((entry) => {
    moodCounts[entry.mood.name] = (moodCounts[entry.mood.name] || 0) + 1;
  });

  let dominantMood = "";
  let highestCount = 0;

  Object.entries(moodCounts).forEach(([mood, count]) => {
    if (count > highestCount) {
      highestCount = count;
      dominantMood = mood;
    }
  });

  return dominantMood;
}
