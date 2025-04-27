import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { generatePersonalizedRecommendations } from "./recommendations";
import { getSecureItem, setSecureItem } from "./secureStorage";

// Set how notifications should be handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Check and request permissions
export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Failed to get push token for push notification!");
      return null;
    }

    try {
      // Use this for development to avoid the ExpoPushTokenManager error
      if (Constants.expoConfig?.extra?.eas?.projectId) {
        const { data: token } = await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig.extra.eas.projectId,
        });
        return token;
      } else {
        console.log(
          "No projectId found in app.json, push notifications may not work properly"
        );
        return null;
      }
    } catch (error) {
      console.log("Error getting push token", error);
      return null;
    }
  } else {
    console.log("Must use physical device for push notifications");
  }

  return token;
}

// Schedule a daily meditation reminder
export async function scheduleMeditationReminder(hour: number, minute: number) {
  // Cancel any existing meditation reminders
  await cancelScheduledNotification("meditation-reminder");

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Time for Mindfulness",
      body: "Take a moment to relax with some calming music.",
      data: { type: "meditation-reminder" },
    },
    trigger: {
      hour,
      minute,
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
    },
    identifier: "meditation-reminder",
  });

  // Save the reminder time
  await setSecureItem("meditation_reminder_time", { hour, minute });

  return identifier;
}

// Schedule a journal reminder
export async function scheduleJournalReminder(hour: number, minute: number) {
  // Cancel any existing journal reminders
  await cancelScheduledNotification("journal-reminder");

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Journal Your Thoughts",
      body: "Take a moment to reflect and write in your journal.",
      data: { type: "journal-reminder" },
    },
    trigger: {
      hour,
      minute,
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
    },
    identifier: "journal-reminder",
  });

  // Save the reminder time
  await setSecureItem("journal_reminder_time", { hour, minute });

  return identifier;
}

// Schedule a mood check-in reminder
export async function scheduleMoodCheckInReminder(
  hour: number,
  minute: number
) {
  // Cancel any existing mood reminders
  await cancelScheduledNotification("mood-reminder");

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: "How are you feeling?",
      body: "Take a moment to check in with your emotions today.",
      data: { type: "mood-reminder" },
    },
    trigger: {
      hour,
      minute,
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
    },
    identifier: "mood-reminder",
  });

  // Save the reminder time
  await setSecureItem("mood_reminder_time", { hour, minute });

  return identifier;
}

// Schedult a one-time notification after meditation
export async function schedulePostMeditationNotification(
  delayInMinutes: number = 30
) {
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: "How do you feel?",
      body: "Would you like to journal about your listening experience?",
      data: { type: "post-meditation" },
    },
    trigger: {
      seconds: delayInMinutes * 60,
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    },
  });

  return identifier;
}

// Schedule a personalized reminder
export async function schedulePersonalizedReminder(
  hour: number,
  minute: number
) {
  // Cancel any existing personalized reminders
  await cancelScheduledNotification("personalized-reminder");

  const recommendations = await generatePersonalizedRecommendations();

  // Use the mood insights to create a personalized message
  const personalizedMessage = recommendations?.moodInsights
    ? `Based on your recent ${recommendations.dominantMood || "mood"}, the ${
        recommendations.recommendedMeditations[0]?.title || "Calm"
      } music track might help.`
    : "Take a moment for mindfulness today.";

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Personalized Mindfulness Reminder",
      body: personalizedMessage,
      data: { type: "personalized-reminder" },
    },
    trigger: {
      hour,
      minute,
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
    },
    identifier: "personalized-reminder",
  });

  // Save the reminder time
  await setSecureItem("personalized_reminder_time", { hour, minute });

  return identifier;
}

// Cancel a specific scheduled notification by identifier
export async function cancelScheduledNotification(identifier: string) {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

// Cancel all scheduled notifications
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Get all scheduled notifications
export async function getAllScheduledNotifications() {
  return await Notifications.getAllScheduledNotificationsAsync();
}

// Load saved reminder times
export async function getSavedReminderTimes() {
  const meditationTime = await getSecureItem<{ hour: number; minute: number }>(
    "meditation_reminder_time"
  );
  const journalTime = await getSecureItem<{ hour: number; minute: number }>(
    "journal_reminder_time"
  );
  const moodTime = await getSecureItem<{ hour: number; minute: number }>(
    "mood_reminder_time"
  );
  const personalizedTime = await getSecureItem<{
    hour: number;
    minute: number;
  }>("personalized_reminder_time");

  return {
    meditation: meditationTime || null,
    journal: journalTime || null,
    mood: moodTime || null,
    personalized: personalizedTime || null,
  };
}
