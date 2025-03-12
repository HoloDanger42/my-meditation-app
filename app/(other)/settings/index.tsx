import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Switch } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function SettingsScreen() {
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(false);
  const [darkModeEnabled, setDarkModeEnabled] = React.useState(false);

  const settingsSections = [
    {
      title: "App Settings",
      items: [
        {
          id: "notifications",
          title: "Notifications",
          type: "switch",
          value: notificationsEnabled,
          onValueChange: setNotificationsEnabled,
        },
        {
          id: "darkMode",
          title: "Dark Mode",
          type: "switch",
          value: darkModeEnabled,
          onValueChange: setDarkModeEnabled,
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
          <Text style={styles.settingText}>{item.title}</Text>
          <Switch
            value={item.value}
            onValueChange={item.onValueChange}
            trackColor={{ false: "#ddd", true: "#4E9F3D" }}
            thumbColor={"#fff"}
          />
        </View>
      );
    } else {
      return (
        <TouchableOpacity key={item.id} style={styles.settingItem}>
          <Ionicons name={item.icon} size={22} color="#4E9F3D" />
          <Text style={[styles.settingText, { marginLeft: 10 }]}>
            {item.title}
          </Text>
          <Ionicons
            style={styles.chevron}
            name="chevron-forward"
            size={20}
            color="#999"
          />
        </TouchableOpacity>
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
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
    paddingTop: 40,
    paddingBottom: 20,
    backgroundColor: "white",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#555",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionContent: {
    backgroundColor: "white",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
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
    color: "#999",
  },
});
