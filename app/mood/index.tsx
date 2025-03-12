import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function MoodScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mood Tracking</Text>
      <Text style={styles.text}>Mood tracking feature coming soon...</Text>
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
    marginBottom: 20,
  },
  text: {
    fontSize: 16,
    color: "#555",
  },
});
