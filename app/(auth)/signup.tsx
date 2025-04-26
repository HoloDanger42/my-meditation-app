import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter, Link } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";

export default function SignupScreen() {
  const { signup } = useAuth();
  const router = useRouter();
  const { theme, isDark } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert("Input Required", "Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        "Password Mismatch",
        "The passwords you entered do not match"
      );
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "Password Too Short",
        "Password must be at least 6 characters long"
      );
      return;
    }

    try {
      setLoading(true);
      await signup(email, password);
    } catch (error: any) {
      let title = "Signup Failed";
      let message = "An unexpected error occurred during signup.";

      if (error.code === "auth/email-already-in-use") {
        message =
          "The email address you entered is already registered. Please try logging in instead.";
      } else if (error.code === "auth/invalid-email") {
        message =
          "The email address you entered is not valid. Please check the format.";
      } else if (error.code === "auth/weak-password") {
        title = "Password Too Weak";
        message = "Your password should be at least 6 characters long.";
      } else if (error.code === "auth/network-request-failed") {
        message =
          "Could not connect to the signup service. Please check your internet connection.";
      }
      // Log the original error for debugging purposes
      console.error("Signup UI Error:", error.code, error.message);

      Alert.alert(title, message);
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: "center",
    },
    logoContainer: {
      alignItems: "center",
      marginBottom: 40,
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      color: theme.text,
      textAlign: "center",
      marginBottom: 30,
    },
    subtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: "center",
      marginBottom: 30,
    },
    input: {
      height: 50,
      borderWidth: 1,
      borderColor: theme.cardBorder,
      borderRadius: 8,
      padding: 15,
      marginBottom: 15,
      backgroundColor: theme.inputBackground || theme.card,
      color: theme.text,
    },
    passwordContainer: {
      flexDirection: "row",
      borderWidth: 1,
      borderColor: theme.cardBorder,
      borderRadius: 8,
      backgroundColor: theme.inputBackground || theme.card,
      marginBottom: 15,
      alignItems: "center",
    },
    passwordInput: {
      flex: 1,
      height: 50,
      padding: 15,
      color: theme.text,
    },
    visibilityToggle: {
      padding: 10,
    },
    signupButton: {
      backgroundColor: theme.accent,
      height: 50,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
      marginTop: 15,
    },
    buttonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "600",
    },
    loginContainer: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: 20,
    },
    footerText: {
      color: theme.textSecondary,
    },
    loginText: {
      color: theme.accent,
      fontWeight: "600",
      marginLeft: 5,
    },
    backButton: {
      position: "absolute",
      top: 50,
      left: 20,
      padding: 10,
      zIndex: 10,
    },
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style={isDark ? "light" : "dark"} />

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        style={styles.container}
      >
        <View style={styles.logoContainer}>
          <Ionicons name="leaf" size={80} color={theme.accent} />
        </View>

        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>
          Sign up to sync your meditation progress across devices
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={theme.textTertiary}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor={theme.textTertiary}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            style={styles.visibilityToggle}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={22}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Confirm Password"
            placeholderTextColor={theme.textTertiary}
            secureTextEntry={!showConfirmPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <TouchableOpacity
            style={styles.visibilityToggle}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            <Ionicons
              name={showConfirmPassword ? "eye-off" : "eye"}
              size={22}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.signupButton}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <View style={styles.loginContainer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Link href="/login" asChild>
            <TouchableOpacity>
              <Text style={styles.loginText}>Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
