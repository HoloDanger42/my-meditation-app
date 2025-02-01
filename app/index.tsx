export const unstable_settings = {
  title: "Home",
};

import { Text, View, StyleSheet, Button, ImageBackground } from "react-native";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ImageBackground
      source={require("../assets/images/background.jpg")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <Text style={styles.title}>Breath of the Wild</Text>
        <Text style={styles.description}>
          Welcome to your personal meditation experience.
        </Text>
        <View style={styles.buttonContainer}>
          <Button
            title="Go to Meditations"
            onPress={() => router.push("./meditations")}
            color="#4E9F3D"
          />
        </View>
        <View style={styles.buttonContainer}>
          <Button
            title="Settings"
            onPress={() => router.push("./settings")}
            color="#4E9F3D"
          />
        </View>
        <View style={styles.buttonContainer}>
          <Button
            title="Session History"
            onPress={() => router.push("./history")}
            color="#4E9F3D"
          />
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
    color: "#555",
  },
  buttonContainer: {
    marginVertical: 10,
    width: "80%",
  },
});
