import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function ToolsScreen() {
  const router = useRouter();

  const tools = [
    { id: "breathing", title: "Breathing Exercises", icon: "pulse-outline" },
    { id: "thoughts", title: "Thought Reframing", icon: "bulb-outline" },
    { id: "grounding", title: "Grounding Techniques", icon: "leaf-outline" },
    {
      id: "affirmations",
      title: "Positive Affirmations",
      icon: "sunny-outline",
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wellness Tools</Text>
      <Text style={styles.subtitle}>
        Select a tool to help manage stress and anxiety
      </Text>

      {tools.map((tool) => (
        <TouchableOpacity
          key={tool.id}
          style={styles.toolItem}
          onPress={() => router.push(`/tools/${tool.id}` as any)}
        >
          <Ionicons name={tool.icon as any} size={24} color="#4E9F3D" />
          <Text style={styles.toolName}>{tool.title}</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
    marginBottom: 20,
  },
  toolItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#f8f8f8",
    marginBottom: 15,
    borderRadius: 10,
  },
  toolName: {
    fontSize: 16,
    flex: 1,
    marginLeft: 15,
  },
});
