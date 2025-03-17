import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Switch } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../context/ThemeContext";
import { StatusBar } from "expo-status-bar";

export default function SettingsScreen() {
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(false);
  const { isDark, setDarkMode, theme } = useTheme();

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
        },
      ],
    },
    {
      title: "Account",
      items: [
        {
          id: "profile",
          title: "Edit Profile",
          type: "link",
          icon: "person-outline",
        },
        {
          id: "privacy",
          title: "Privacy Settings",
          type: "link",
          icon: "lock-closed-outline",
        },
      ],
    },
    {
      title: "Support",
      items: [
        {
          id: "help",
          title: "Help Center",
          type: "link",
          icon: "help-circle-outline",
        },
        {
          id: "feedback",
          title: "Send Feedback",
          type: "link",
          icon: "chatbox-outline",
        },
      ],
    },
  ];

  const renderItem = (item: any) => {
    if (item.type === "switch") {
      return (
        <View key={item.id} style={styles.settingItem}>
          <Text style={[styles.settingText, { color: theme.text }]}>
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
          style={styles.settingItem}
          onPress={item.onPress}
        >
          <Ionicons name={item.icon} size={22} color={theme.accent} />
          <Text
            style={[styles.settingText, { marginLeft: 10, color: theme.text }]}
          >
            {item.title}
          </Text>
          <Ionicons
            style={styles.chevron}
            name="chevron-forward"
            size={20}
            color={theme.textTertiary}
          />
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
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      {settingsSections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionContent}>
            {section.items.map(renderItem)}
          </View>
        </View>
      ))}

      <View style={styles.footer}>
        <Text style={styles.version}>Version 1.0.0</Text>
      </View>
    </View>
  );
}
