import React from "react";
import { Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function MeditationListScreen() {
  const router = useRouter();

  const meditations = [
    { id: 1, title: "Calm Mind", description: "Reduce anxiety and find peace" },
    {
      id: 2,
      title: "Relaxing Breath",
      description: "Slow breathing for relaxation",
    },
    {
      id: 3,
      title: "Gentle Sleep",
      description: "Prepare your mind for restful sleep",
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Meditations</Text>
      <Text style={styles.subtitle}>
        Select a meditation to begin your practice
      </Text>

      {meditations.map((meditation) => (
        <TouchableOpacity
          key={meditation.id}
          style={styles.meditationItem}
          onPress={() => router.push(`/meditations/${meditation.id}`)}
        >
          <View style={styles.meditationIcon}>
            <Ionicons name="leaf-outline" size={24} color="#4E9F3D" />
          </View>
          <View style={styles.meditationContent}>
            <Text style={styles.meditationTitle}>{meditation.title}</Text>
            <Text style={styles.meditationDesc}>{meditation.description}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
    marginBottom: 20,
  },
  meditationItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#f8f8f8",
    marginBottom: 15,
    borderRadius: 10,
  },
  meditationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f8f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  meditationContent: {
    flex: 1,
  },
  meditationTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  meditationDesc: {
    fontSize: 14,
    color: "#777",
    marginTop: 4,
  },
});
