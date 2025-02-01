import { Text, View, StyleSheet, Button } from "react-native";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Meditation App</Text>
      <Text style={styles.description}>
        Welcome to your personal meditation experience.
      </Text>
      <Button
        title="Go to Meditations"
        onPress={() => router.push("./meditations")}
      />
      <Button title="Settings" onPress={() => router.push("./settings")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
});
