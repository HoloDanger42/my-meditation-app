import AsyncStorage from "@react-native-async-storage/async-storage";

interface MeditationSession {
  id: number;
  meditationId: string;
  duration: number;
  rating?: number;
  timestamp: string;
}

export async function getTotalMeditationSessions(): Promise<number> {
  try {
    const sessionsJson = await AsyncStorage.getItem("meditation_sessions");
    if (!sessionsJson) return 0;

    const sessions = JSON.parse(sessionsJson);
    return sessions.length;
  } catch (error) {
    console.error("Failed to get meditation count:", error);
    return 0;
  }
}

export async function getCurrentStreak(): Promise<number> {
  try {
    const sessionsJson = await AsyncStorage.getItem("meditation_sessions");
    if (!sessionsJson) return 0;

    const sessions = JSON.parse(sessionsJson) as MeditationSession[];

    // Sort sessions by date (most recent first)
    const sortedSessions = sessions.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    if (sortedSessions.length === 0) return 0;

    // Check if there's a session today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastSessionDate = new Date(sortedSessions[0].timestamp);
    lastSessionDate.setHours(0, 0, 0, 0);

    // If no session today, streak is already broken
    if (lastSessionDate.getTime() < today.getTime()) {
      return 0;
    }

    // Count consecutive days
    let streak = 1; // Start with today
    let currentDate = today;

    for (let i = 1; i < sortedSessions.length; i++) {
      const sessionDate = new Date(sortedSessions[i].timestamp);
      sessionDate.setHours(0, 0, 0, 0);

      // Move to the previous day
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() - 1);

      // If there's a session on the previous day, increase streak
      if (sessionDate.getTime() === currentDate.getTime()) {
        streak++;
      } else {
        break; // Streak is broken
      }
    }
    return streak;
  } catch (error) {
    console.error("Failed to calculate streak:", error);
    return 0;
  }
}

export async function getTotalMeditationMinutes(): Promise<number> {
  try {
    const sessionsJson = await AsyncStorage.getItem("meditation_sessions");
    if (!sessionsJson) return 0;

    const sessions = JSON.parse(sessionsJson) as MeditationSession[];
    const totalSeconds = sessions.reduce(
      (total, session) => total + session.duration,
      0
    );

    return Math.round(totalSeconds / 60);
  } catch (error) {
    console.error("Failed to calculate total minutes:", error);
    return 0;
  }
}
