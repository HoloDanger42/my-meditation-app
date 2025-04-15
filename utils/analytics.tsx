import AsyncStorage from "@react-native-async-storage/async-storage";

export async function trackRecommendationEngagement(
  recommendationId: string,
  action: "viewed" | "clicked" | "completed"
) {
  try {
    const analyticsJson = await AsyncStorage.getItem(
      "recommendation_analytics"
    );
    const analytics = analyticsJson ? JSON.parse(analyticsJson) : [];

    analytics.push({
      recommendationId,
      action,
      timestamp: new Date().toISOString(),
    });

    await AsyncStorage.setItem(
      "recommendation_analytics",
      JSON.stringify(analytics)
    );
  } catch (error) {
    console.error("Error tracking recommendation engagement:", error);
  }
}
