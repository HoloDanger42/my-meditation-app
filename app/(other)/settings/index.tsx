import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";
import { StatusBar } from "expo-status-bar";
import { performInitialSync } from "@/utils/firestoreSync";
import { IoniconsName } from "@/types/dataTypes";

interface SettingItem {
  id: string;
  title: string;
  icon?: IoniconsName;
  type?: "link" | "switch";
  onPress?: () => void;
  value?: boolean;
  onValueChange?: (value: boolean) => void;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { isDark, setDarkMode, theme } = useTheme();
  const { logout, user } = useAuth();

  const accountSettings: SettingItem[] = user
    ? [
        {
          id: "account",
          title: `Account: ${user.email}`,
          icon: "person-outline",
          onPress: () => {},
        },
        {
          id: "sync",
          title: "Sync Data Now",
          icon: "cloud-upload-outline",
          onPress: () => {
            Alert.alert("Sync Data", "Sync all your data to the cloud?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Sync",
                onPress: async () => {
                  try {
                    await performInitialSync();
                    Alert.alert("Success", "Data successfully synced to cloud");
                  } catch (error) {
                    Alert.alert("Error", "Failed to sync data");
                  }
                },
              },
            ]);
          },
        },
        {
          id: "logout",
          title: "Logout",
          type: "link",
          icon: "log-out-outline",
          onPress: () => {
            Alert.alert("Log Out", "Are you sure you want to log out?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Log Out",
                style: "destructive",
                onPress: async () => {
                  try {
                    await logout();
                  } catch (error) {
                    console.error("Logout failed", error);
                    Alert.alert(
                      "Logout Failed",
                      "An error occurred while trying to log out. Please try again."
                    );
                  }
                },
              },
            ]);
          },
        },
      ]
    : [
        {
          id: "login",
          title: "Sign In",
          icon: "log-in-outline",
          onPress: () => router.push("/login"),
        },
      ];

  const settingsSections = [
    {
      title: "App Settings",
      items: [
        {
          id: "notifications",
          title: "Notifications",
          type: "link",
          icon: "notifications-outline",
          onPress: () => router.push("/settings/notifications"),
        },
        {
          id: "darkMode",
          title: "Dark Mode",
          type: "switch",
          value: isDark,
          onValueChange: setDarkMode,
          icon: "contrast-outline",
        },
      ],
    },
    { title: "Account", items: accountSettings },
  ];

  const renderItem = (item: SettingItem) => {
    if (item.type === "switch") {
      return (
        <View key={item.id} style={[styles.settingItem, { height: 54 }]}>
          {item.icon && (
            <Ionicons name={item.icon} size={22} color={theme.accent} />
          )}
          <Text
            style={[
              styles.settingText,
              { marginLeft: item.icon ? 10 : 0, color: theme.text },
            ]}
          >
            {item.title}
          </Text>
          <Switch
            value={item.value}
            onValueChange={item.onValueChange}
            trackColor={{ false: "#ddd", true: theme.accent }}
            thumbColor={"#fff"}
          />
        </View>
      );
    } else {
      return (
        <TouchableOpacity
          key={item.id}
          style={[styles.settingItem, { height: 54 }]}
          onPress={item.onPress}
          disabled={!item.onPress}
        >
          <Ionicons name={item.icon} size={22} color={theme.accent} />
          <Text
            style={[styles.settingText, { marginLeft: 10, color: theme.text }]}
          >
            {item.title}
          </Text>
          {item.onPress && (
            <Ionicons
              style={styles.chevron}
              name="chevron-forward"
              size={20}
              color={theme.textTertiary}
            />
          )}
        </TouchableOpacity>
      );
    }
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
      paddingTop: 60,
      paddingBottom: 20,
      backgroundColor: theme.card,
    },
    title: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.text,
    },
    section: {
      marginTop: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.textSecondary,
      paddingHorizontal: 20,
      marginBottom: 10,
    },
    sectionContent: {
      backgroundColor: theme.card,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: theme.cardBorder,
    },
    settingItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: theme.cardBorder,
    },
    settingText: {
      flex: 1,
      fontSize: 16,
      color: theme.text,
    },
    chevron: {
      marginLeft: 10,
    },
    footer: {
      marginTop: 30,
      alignItems: "center",
    },
    version: {
      fontSize: 14,
      color: theme.textTertiary,
    },
  });

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.navigate("/")}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      {settingsSections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionContent}>
            {section.items.map((item) => renderItem(item as SettingItem))}
          </View>
        </View>
      ))}

      <View style={styles.footer}>
        <Text style={styles.version}>Version 1.0.0</Text>
      </View>
    </View>
  );
}
