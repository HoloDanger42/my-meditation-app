import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";

export default function NewJournalEntryScreen() {
  const [entry, setEntry] = useState("");
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>New Journal Entry</Text>
      <TextInput
        style={styles.input}
        multiline
        placeholder="How are you feeling today?"
        value={entry}
        onChangeText={setEntry}
      />
      <View style={styles.buttonContainer}></View>
      <TouchableOpacity style={styles.saveButton} onPress={() => router.back()}>
        <Text style={styles.buttonText}>Save Entry</Text>
      </TouchableOpacity>
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
  input: {
    height: 300,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
    textAlignVertical: "top",
  },
  buttonContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  saveButton: {
    backgroundColor: "#4E9F3D",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  buttonText: {
    color: "white",
    fontWeight: "500",
    fontSize: 16,
  },
});
