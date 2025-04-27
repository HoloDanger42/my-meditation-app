import { getSecureItem } from "./secureStorage";

// Define structure for streak info stored in secure storage
interface StreakInfo {
  lastSessionDate: string | null; // ISO Date string (YYYY-MM-DD)
  currentStreak: number;
}

/**
 * Gets the total number of meditation sessions from stored aggregate data.
 */
export async function getTotalMeditationSessions(): Promise<number> {
  try {
    // Read the pre-calculated total from secure storage
    const totalSessions = await getSecureItem<number>("stats_totalSessions");
    return totalSessions ?? 0; // Return stored value or 0 if not found
  } catch (error) {
    console.error("Failed to get total meditation sessions count:", error);
    return 0;
  }
}

/**
 * Gets the current meditation streak from stored aggregate data.
 */
export async function getCurrentStreak(): Promise<number> {
  try {
    // Read the pre-calculated streak info from secure storage
    const streakInfo = await getSecureItem<StreakInfo>("stats_streakInfo");

    if (!streakInfo?.lastSessionDate) {
      return 0; // No streak info or no last session date
    }

    // Check if the last session was yesterday or today
    const today = new Date();
    const todayDateString = today.toISOString().split("T")[0];
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayDateString = yesterday.toISOString().split("T")[0];

    if (
      streakInfo.lastSessionDate === todayDateString ||
      streakInfo.lastSessionDate === yesterdayDateString
    ) {
      return streakInfo.currentStreak; // Streak is current
    } else {
      return 0; // Streak is broken
    }
  } catch (error) {
    console.error("Failed to get current streak:", error);
    return 0;
  }
}

/**
 * Gets the total meditation minutes from stored aggregate data.
 */
export async function getTotalMeditationMinutes(): Promise<number> {
  try {
    // Read the pre-calculated total minutes from secure storage
    const totalMinutes = await getSecureItem<number>("stats_totalMinutes");
    return totalMinutes ?? 0; // Return stored value or 0 if not found
  } catch (error) {
    console.error("Failed to calculate total minutes:", error);
    return 0;
  }
}