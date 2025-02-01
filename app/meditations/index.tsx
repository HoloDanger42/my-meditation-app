import { Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function MeditationListScreen() {
  const router = useRouter();

  const meditations = [
    { id: 1, title: "Calm Mind" },
    { id: 2, title: "Relaxing Breath" },
    { id: 3, title: "Gentle Sleep" },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Meditation List</Text>
      {meditations.map((meditation) => (
        <TouchableOpacity
          key={meditation.id}
          style={styles.meditationItem}
          onPress={() => router.push(`/meditations/${meditation.id}`)}
        >
          <Text style={styles.meditationText}>{meditation.title}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  meditationItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  meditationText: {
    fontSize: 18,
  },
});
