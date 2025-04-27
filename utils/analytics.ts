import { getSecureItem, setSecureItem } from "./secureStorage";

interface RecommendationAnalytics {
  recommendationId: string;
  action: "viewed" | "clicked" | "completed";
  timestamp: string;
}

export async function trackRecommendationEngagement(
  recommendationId: string,
  action: "viewed" | "clicked" | "completed"
) {
  try {
    // Get existing analytics or initialize a new array if null/undefined
    let analytics = await getSecureItem<RecommendationAnalytics[]>("recommendation_analytics");
    
    // Ensure analytics is always an array, even if getSecureItem returns null
    if (!analytics || !Array.isArray(analytics)) {
      analytics = [];
    }

    analytics.push({
      recommendationId,
      action,
      timestamp: new Date().toISOString(),
    });

    await setSecureItem("recommendation_analytics", analytics);
  } catch (error) {
    console.error("Error tracking recommendation engagement:", error);
  }
}
