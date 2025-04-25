import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { StatusBar } from "expo-status-bar";
import { IoniconsName } from "../../types/dataTypes";

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: IoniconsName;
}

export default function ToolsScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();

  const tools: Tool[] = [
    {
      id: "breathing",
      name: "Deep Breathing Exercise",
      description: "Guided breathing patterns to reduce stress and anxiety",
      icon: "medical",
    },
    {
      id: "breathing-history", // New entry for history
      name: "Breathing History",
      description: "View your breathing exercise statistics",
      icon: "bar-chart",
    },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      padding: 20,
      paddingTop: 60,
      backgroundColor: theme.card,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: theme.textSecondary,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    toolItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: 20,
      backgroundColor: theme.card,
      borderRadius: 12,
      marginBottom: 15,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 2,
      elevation: isDark ? 3 : 1,
    },
    toolIcon: {
      backgroundColor: theme.accentLight,
      padding: 12,
      borderRadius: 10,
      marginRight: 15,
    },
    toolTextContainer: {
      flex: 1,
      paddingRight: 10,
    },
    toolName: {
      fontSize: 16,
      fontWeight: "500",
      color: theme.text,
    },
    toolDescription: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 4,
    },
    chevronContainer: {
      paddingLeft: 10,
    },
  });

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={styles.header}>
        <Text style={styles.title}>Wellness Tools</Text>
        <Text style={styles.subtitle}>
          Select a tool to help manage stress and anxiety
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {tools.map((tool) => (
          <TouchableOpacity
            key={tool.id}
            style={styles.toolItem}
            onPress={() => router.push(`/tools/${tool.id}`)}
          >
            <View style={styles.toolIcon}>
              <Ionicons name={tool.icon} size={24} color={theme.accent} />
            </View>
            <View style={styles.toolTextContainer}>
              <Text style={styles.toolName}>{tool.name}</Text>
              <Text style={styles.toolDescription}>{tool.description}</Text>
            </View>
            <View style={styles.chevronContainer}>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.textSecondary}
              />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
