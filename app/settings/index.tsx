import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.description}>
          Adjust your app preferences here.
        </Text>
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
  description: {
    fontSize: 16,
    marginBottom: 20,
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
