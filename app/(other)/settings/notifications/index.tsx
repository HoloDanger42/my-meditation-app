import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../../context/ThemeContext";
import { StatusBar } from "expo-status-bar";
import {
  registerForPushNotificationsAsync,
  scheduleMeditationReminder,
  scheduleJournalReminder,
  scheduleMoodCheckInReminder,
  schedulePersonalizedReminder,
  getSavedReminderTimes,
  cancelScheduledNotification,
} from "../../../../utils/notifications";
import { removeSecureItem } from "../../../../utils/secureStorage";

// Define prop types for CustomTimePicker
interface CustomTimePickerProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (date: Date) => void;
  initialTime: Date;
}

// Custom time picker component to avoid native module issues
const CustomTimePicker: React.FC<CustomTimePickerProps> = ({
  visible,
  onCancel,
  onConfirm,
  initialTime,
}) => {
  const [hours, setHours] = useState<number>(initialTime.getHours());
  const [minutes, setMinutes] = useState<number>(initialTime.getMinutes());
  const { theme } = useTheme();

  const hourOptions = Array.from({ length: 24 }, (_, i) => i);
  const minuteOptions = Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>
            Select Time
          </Text>

          <View style={styles.pickerContainer}>
            <View style={styles.pickerColumn}>
              <Text
                style={[styles.pickerLabel, { color: theme.textSecondary }]}
              >
                Hour
              </Text>
              <ScrollView style={styles.pickerScroll}>
                {hourOptions.map((hour) => (
                  <TouchableOpacity
                    key={hour}
                    style={[
                      styles.pickerItem,
                      hour === hours && {
                        backgroundColor: theme.accent + "30",
                      },
                    ]}
                    onPress={() => setHours(hour)}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        { color: hour === hours ? theme.accent : theme.text },
                      ]}
                    >
                      {hour.toString().padStart(2, "0")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={[styles.timeSeparator, { color: theme.text }]}>:</Text>

            <View style={styles.pickerColumn}>
              <Text
                style={[styles.pickerLabel, { color: theme.textSecondary }]}
              >
                Minute
              </Text>
              <ScrollView style={styles.pickerScroll}>
                {minuteOptions.map((minute) => (
                  <TouchableOpacity
                    key={minute}
                    style={[
                      styles.pickerItem,
                      minute === minutes && {
                        backgroundColor: theme.accent + "30",
                      },
                    ]}
                    onPress={() => setMinutes(minute)}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        {
                          color: minute === minutes ? theme.accent : theme.text,
                        },
                      ]}
                    >
                      {minute.toString().padStart(2, "0")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, { borderColor: theme.cardBorder }]}
              onPress={onCancel}
            >
              <Text style={{ color: theme.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.accent }]}
              onPress={() => {
                const newTime = new Date();
                newTime.setHours(hours);
                newTime.setMinutes(minutes);
                onConfirm(newTime);
              }}
            >
              <Text style={{ color: "#fff" }}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const [meditationEnabled, setMeditationEnabled] = useState<boolean>(false);
  const [journalEnabled, setJournalEnabled] = useState<boolean>(false);
  const [moodEnabled, setMoodEnabled] = useState<boolean>(false);
  const [personalizedEnabled, setPersonalizedEnabled] =
    useState<boolean>(false);

  const [meditationTime, setMeditationTime] = useState<Date>(new Date());
  const [journalTime, setJournalTime] = useState<Date>(new Date());
  const [moodTime, setMoodTime] = useState<Date>(new Date());
  const [personalizedTime, setPersonalizedTime] = useState<Date>(new Date());

  const [showMeditationPicker, setShowMeditationPicker] =
    useState<boolean>(false);
  const [showJournalPicker, setShowJournalPicker] = useState<boolean>(false);
  const [showMoodPicker, setShowMoodPicker] = useState<boolean>(false);
  const [showPersonalizedPicker, setShowPersonalizedPicker] =
    useState<boolean>(false);

  useEffect(() => {
    // Request notification permissions when the component mounts
    registerForPushNotificationsAsync();

    // Load saved reminder times
    const loadReminderTimes = async () => {
      const savedTimes = await getSavedReminderTimes();

      if (savedTimes.meditation) {
        const date = new Date();
        date.setHours(savedTimes.meditation.hour);
        date.setMinutes(savedTimes.meditation.minute);
        setMeditationTime(date);
        setMeditationEnabled(true);
      }

      if (savedTimes.journal) {
        const date = new Date();
        date.setHours(savedTimes.journal.hour);
        date.setMinutes(savedTimes.journal.minute);
        setJournalTime(date);
        setJournalEnabled(true);
      }

      if (savedTimes.mood) {
        const date = new Date();
        date.setHours(savedTimes.mood.hour);
        date.setMinutes(savedTimes.mood.minute);
        setMoodTime(date);
        setMoodEnabled(true);
      }

      if (savedTimes.personalized) {
        const date = new Date();
        date.setHours(savedTimes.personalized.hour);
        date.setMinutes(savedTimes.personalized.minute);
        setPersonalizedTime(date);
        setPersonalizedEnabled(true);
      }
    };

    loadReminderTimes();
  }, []);

  const toggleMeditationReminder = async (enabled: boolean) => {
    setMeditationEnabled(enabled);
    if (enabled) {
      await scheduleMeditationReminder(
        meditationTime.getHours(),
        meditationTime.getMinutes()
      );
    } else {
      await cancelScheduledNotification("meditation-reminder");
      await removeSecureItem("meditation_reminder_time");
    }
  };

  const toggleJournalReminder = async (enabled: boolean) => {
    setJournalEnabled(enabled);
    if (enabled) {
      await scheduleJournalReminder(
        journalTime.getHours(),
        journalTime.getMinutes()
      );
    } else {
      await cancelScheduledNotification("journal-reminder");
      await removeSecureItem("journal_reminder_time");
    }
  };

  const toggleMoodReminder = async (enabled: boolean) => {
    setMoodEnabled(enabled);
    if (enabled) {
      await scheduleMoodCheckInReminder(
        moodTime.getHours(),
        moodTime.getMinutes()
      );
    } else {
      await cancelScheduledNotification("mood-reminder");
      await removeSecureItem("mood_reminder_time");
    }
  };

  const togglePersonalizedReminder = async (enabled: boolean) => {
    setPersonalizedEnabled(enabled);
    if (enabled) {
      await schedulePersonalizedReminder(
        personalizedTime.getHours(),
        personalizedTime.getMinutes()
      );
    } else {
      await cancelScheduledNotification("personalized-reminder");
      await removeSecureItem("personalized_reminder_time");
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const onMeditationTimeChange = (selectedDate: Date) => {
    setMeditationTime(selectedDate);
    scheduleMeditationReminder(
      selectedDate.getHours(),
      selectedDate.getMinutes()
    );
    setShowMeditationPicker(false);
  };

  const onJournalTimeChange = (selectedDate: Date) => {
    setJournalTime(selectedDate);
    scheduleJournalReminder(selectedDate.getHours(), selectedDate.getMinutes());
    setShowJournalPicker(false);
  };

  const onMoodTimeChange = (selectedDate: Date) => {
    setMoodTime(selectedDate);
    scheduleMoodCheckInReminder(
      selectedDate.getHours(),
      selectedDate.getMinutes()
    );
    setShowMoodPicker(false);
  };

  const onPersonalizedTimeChange = (selectedDate: Date) => {
    setPersonalizedTime(selectedDate);
    schedulePersonalizedReminder(
      selectedDate.getHours(),
      selectedDate.getMinutes()
    );
    setShowPersonalizedPicker(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.card,
            borderBottomColor: theme.cardBorder,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>
          Notification Settings
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Daily Reminders
        </Text>

        <View
          style={[styles.settingRow, { borderBottomColor: theme.cardBorder }]}
        >
          <View style={styles.settingLeft}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>
              Meditation Reminder
            </Text>
            <Text
              style={[styles.settingDetail, { color: theme.textSecondary }]}
            >
              Get reminded to meditate daily
            </Text>
          </View>
          <Switch
            value={meditationEnabled}
            onValueChange={toggleMeditationReminder}
            trackColor={{ false: "#767577", true: theme.accent + "80" }}
            thumbColor={meditationEnabled ? theme.accent : "#f4f3f4"}
          />
        </View>

        {meditationEnabled && (
          <View
            style={[styles.settingRow, { borderBottomColor: theme.cardBorder }]}
          >
            <View style={styles.settingLeft}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>
                Reminder Time
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.timeButton,
                {
                  backgroundColor: theme.inputBackground,
                  borderColor: theme.cardBorder,
                },
              ]}
              onPress={() => setShowMeditationPicker(true)}
            >
              <Text style={[styles.timeText, { color: theme.text }]}>
                {formatTime(meditationTime)}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <CustomTimePicker
          visible={showMeditationPicker}
          initialTime={meditationTime}
          onCancel={() => setShowMeditationPicker(false)}
          onConfirm={onMeditationTimeChange}
        />

        <View
          style={[styles.settingRow, { borderBottomColor: theme.cardBorder }]}
        >
          <View style={styles.settingLeft}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>
              Journal Reminder
            </Text>
            <Text
              style={[styles.settingDetail, { color: theme.textSecondary }]}
            >
              Get reminded to write in your journal
            </Text>
          </View>
          <Switch
            value={journalEnabled}
            onValueChange={toggleJournalReminder}
            trackColor={{ false: "#767577", true: theme.accent + "80" }}
            thumbColor={journalEnabled ? theme.accent : "#f4f3f4"}
          />
        </View>

        {journalEnabled && (
          <View
            style={[styles.settingRow, { borderBottomColor: theme.cardBorder }]}
          >
            <View style={styles.settingLeft}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>
                Reminder Time
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.timeButton,
                {
                  backgroundColor: theme.inputBackground,
                  borderColor: theme.cardBorder,
                },
              ]}
              onPress={() => setShowJournalPicker(true)}
            >
              <Text style={[styles.timeText, { color: theme.text }]}>
                {formatTime(journalTime)}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <CustomTimePicker
          visible={showJournalPicker}
          initialTime={journalTime}
          onCancel={() => setShowJournalPicker(false)}
          onConfirm={onJournalTimeChange}
        />

        <View
          style={[styles.settingRow, { borderBottomColor: theme.cardBorder }]}
        >
          <View style={styles.settingLeft}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>
              Mood Check-in
            </Text>
            <Text
              style={[styles.settingDetail, { color: theme.textSecondary }]}
            >
              Get reminded to track your mood
            </Text>
          </View>
          <Switch
            value={moodEnabled}
            onValueChange={toggleMoodReminder}
            trackColor={{ false: "#767577", true: theme.accent + "80" }}
            thumbColor={moodEnabled ? theme.accent : "#f4f3f4"}
          />
        </View>

        {moodEnabled && (
          <View
            style={[styles.settingRow, { borderBottomColor: theme.cardBorder }]}
          >
            <View style={styles.settingLeft}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>
                Reminder Time
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.timeButton,
                {
                  backgroundColor: theme.inputBackground,
                  borderColor: theme.cardBorder,
                },
              ]}
              onPress={() => setShowMoodPicker(true)}
            >
              <Text style={[styles.timeText, { color: theme.text }]}>
                {formatTime(moodTime)}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <CustomTimePicker
          visible={showMoodPicker}
          initialTime={moodTime}
          onCancel={() => setShowMoodPicker(false)}
          onConfirm={onMoodTimeChange}
        />

        <View
          style={[styles.settingRow, { borderBottomColor: theme.cardBorder }]}
        >
          <View style={styles.settingLeft}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>
              Personalized Insights
            </Text>
            <Text
              style={[styles.settingDetail, { color: theme.textSecondary }]}
            >
              Get AI-powered recommendations based on your mood patterns
            </Text>
          </View>
          <Switch
            value={personalizedEnabled}
            onValueChange={togglePersonalizedReminder}
            trackColor={{ false: "#767577", true: theme.accent + "80" }}
            thumbColor={personalizedEnabled ? theme.accent : "#f4f3f4"}
          />
        </View>

        {personalizedEnabled && (
          <View
            style={[styles.settingRow, { borderBottomColor: theme.cardBorder }]}
          >
            <View style={styles.settingLeft}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>
                Reminder Time
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.timeButton,
                {
                  backgroundColor: theme.inputBackground,
                  borderColor: theme.cardBorder,
                },
              ]}
              onPress={() => setShowPersonalizedPicker(true)}
            >
              <Text style={[styles.timeText, { color: theme.text }]}>
                {formatTime(personalizedTime)}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <CustomTimePicker
          visible={showPersonalizedPicker}
          initialTime={personalizedTime}
          onCancel={() => setShowPersonalizedPicker(false)}
          onConfirm={onPersonalizedTimeChange}
        />

        <Text style={[styles.note, { color: theme.textSecondary }]}>
          Notifications will appear at the set times each day to help maintain
          your practice.
        </Text>
      </ScrollView>
    </View>
  );
}

// Define styles outside the component
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent", // Will be set dynamically by theme
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
    backgroundColor: "transparent", // Will be set dynamically by theme
    borderBottomWidth: 1,
    borderBottomColor: "transparent", // Will be set dynamically by theme
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "transparent", // Will be set dynamically by theme
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "transparent", // Will be set dynamically by theme
    marginBottom: 15,
    marginTop: 10,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "transparent", // Will be set dynamically by theme
  },
  settingLabel: {
    fontSize: 16,
    color: "transparent", // Will be set dynamically by theme
  },
  settingDetail: {
    fontSize: 14,
    color: "transparent", // Will be set dynamically by theme
    marginTop: 4,
  },
  settingLeft: {
    flex: 1,
  },
  timeButton: {
    backgroundColor: "transparent", // Will be set dynamically by theme
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "transparent", // Will be set dynamically by theme
  },
  timeText: {
    color: "transparent", // Will be set dynamically by theme
    fontSize: 14,
  },
  note: {
    fontSize: 14,
    color: "transparent", // Will be set dynamically by theme
    fontStyle: "italic",
    marginTop: 20,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: "80%",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 20,
  },
  pickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  pickerColumn: {
    width: 80,
    height: 150,
  },
  pickerLabel: {
    textAlign: "center",
    marginBottom: 5,
    fontSize: 14,
  },
  pickerScroll: {
    height: 120,
    borderRadius: 8,
  },
  pickerItem: {
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerItemText: {
    fontSize: 18,
  },
  timeSeparator: {
    fontSize: 24,
    marginHorizontal: 10,
    fontWeight: "bold",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 100,
    alignItems: "center",
  },
});
