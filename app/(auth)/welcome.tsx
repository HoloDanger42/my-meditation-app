import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";

export default function WelcomeScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    },
    logo: {
      marginBottom: 40,
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      textAlign: "center",
      marginBottom: 20,
      color: theme.text,
    },
    subtitle: {
      fontSize: 16,
      textAlign: "center",
      marginBottom: 40,
      color: theme.textSecondary,
      lineHeight: 24,
    },
    buttonContainer: {
      width: "100%",
      marginBottom: 20,
    },
    signupButton: {
      backgroundColor: theme.accent,
      paddingVertical: 15,
      borderRadius: 8,
      alignItems: "center",
      marginBottom: 15,
    },
    loginButton: {
      backgroundColor: "transparent",
      paddingVertical: 15,
      borderRadius: 8,
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.accent,
    },
    signupText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "bold",
    },
    loginText: {
      color: theme.accent,
      fontSize: 16,
      fontWeight: "bold",
    },
    skipText: {
      color: theme.textSecondary,
      fontSize: 16,
      marginTop: 20,
    },
  });

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.logo}>
          <Ionicons name="leaf" size={100} color={theme.accent} />
        </View>

        <Text style={styles.title}>Welcome to Zenith</Text>
        <Text style={styles.subtitle}>
          Your personal meditation companion to help you reduce stress and
          improve focus. Create an account to sync your progress across devices.
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.signupButton}
            onPress={() => router.push("/signup")}
          >
            <Text style={styles.signupText}>Create Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.loginText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/")}>
            <Text style={styles.skipText}>Continue without an account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
