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
      <View style={styles.content}>
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
      <View style={styles.bottomButton}>
        <TouchableOpacity
          style={styles.longButton}
          onPress={() => router.back()}
        >
          <Text style={styles.longButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  content: {
    flex: 1,
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
  bottomButton: {
    alignItems: "center",
    marginBottom: 20,
  },
  longButton: {
    backgroundColor: "#4E9F3D",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 5,
    width: "80%",
    alignItems: "center",
  },
  longButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
