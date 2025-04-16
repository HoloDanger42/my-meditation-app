import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { StatusBar } from "expo-status-bar";

export default function ToolsScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();

  const tools = [
    { id: "breathing", title: "Breathing Exercises", icon: "pulse-outline" },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: 60,
      paddingHorizontal: 20,
      backgroundColor: theme.background,
    },
    header: {
      marginBottom: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 10,
      color: theme.text,
    },
    subtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      marginBottom: 20,
    },
    toolItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: 15,
      backgroundColor: theme.card,
      marginBottom: 15,
      borderRadius: 10,
      shadowColor: isDark ? "#000" : "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 2,
      elevation: isDark ? 3 : 1,
    },
    toolName: {
      fontSize: 16,
      flex: 1,
      marginLeft: 15,
      color: theme.text,
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

      {tools.map((tool) => (
        <TouchableOpacity
          key={tool.id}
          style={styles.toolItem}
          onPress={() => router.push(`/tools/${tool.id}` as any)}
        >
          <Ionicons name={tool.icon as any} size={24} color={theme.accent} />
          <Text style={styles.toolName}>{tool.title}</Text>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.textTertiary}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}
