import { Stack, Tabs } from "expo-router";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import { ThemeProvider, useTheme } from "../context/ThemeContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import React, { useEffect, useState } from "react";
import { migrateToEncryption } from "../utils/secureStorage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { performInitialSync } from "../utils/firestoreSync";
// Import and initialize Firebase at the app root level
import initializeFirebase from "../utils/firebaseInit";

// Initialize Firebase as early as possible
initializeFirebase();

function TabsNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: theme.accent,
          tabBarInactiveTintColor: theme.textTertiary,
          tabBarStyle: {
            backgroundColor: theme.card,
            borderTopColor: theme.cardBorder,
          },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => (
              <Ionicons name="home-outline" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="mood"
          options={{
            title: "Mood",
            tabBarIcon: ({ color }) => (
              <Ionicons name="happy-outline" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="journal"
          options={{
            title: "Journal",
            tabBarIcon: ({ color }) => (
              <FontAwesome name="pencil" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="meditations"
          options={{
            title: "Meditate",
            tabBarIcon: ({ color }) => (
              <Ionicons name="leaf-outline" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="tools"
          options={{
            title: "Tools",
            tabBarIcon: ({ color }) => (
              <Ionicons name="medical-outline" size={24} color={color} />
            ),
          }}
        />

        {/* Hide these routes from the tab bar */}
        <Tabs.Screen
          name="(other)"
          options={{
            href: null, // This prevents the tab from appearing
          }}
        />
        <Tabs.Screen
          name="(auth)"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </View>
  );
}

function RootNavigation() {
  const { user, initializing } = useAuth();
  const { theme } = useTheme();
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);
  const [checkingFirstLaunch, setCheckingFirstLaunch] = useState(true);
  const [showAuthScreen, setShowAuthScreen] = useState(false);
  
  // Check if it's the first launch
  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        const hasLaunched = await AsyncStorage.getItem("hasLaunched");
        if (hasLaunched === null) {
          await AsyncStorage.setItem("hasLaunched", "true");
          setIsFirstLaunch(true);
        } else {
          setIsFirstLaunch(false);
        }
      } catch (error) {
        console.error("Error checking first launch:", error);
        setIsFirstLaunch(false);
      } finally {
        setCheckingFirstLaunch(false);
      }
    };

    const timeoutId = setTimeout(() => {
      console.warn("First launch check timed out.");
      setCheckingFirstLaunch(false);
      setIsFirstLaunch(false);
    }, 3000); // Reduced timeout to 3 seconds

    checkFirstLaunch().finally(() => clearTimeout(timeoutId));

    return () => clearTimeout(timeoutId);
  }, []);

  // Determine if auth screen should be shown based on user state
  useEffect(() => {
    // If no user is logged in and user has seen intro, prompt for login
    if (!user && !isFirstLaunch && !initializing) {
      setShowAuthScreen(true);
    } else {
      setShowAuthScreen(false);
    }
  }, [user, isFirstLaunch, initializing]);

  // Sync user data when they log in
  useEffect(() => {
    if (user) {
      performInitialSync().catch((error) => {
        console.error("Failed to sync data:", error);
      });
    }
  }, [user]);

  // Run data migration
  useEffect(() => {
    migrateToEncryption().catch((error) => {
      console.error("Failed to migrate data:", error);
    });
  }, []);

  // Add safety timeout to prevent infinite loading
  useEffect(() => {
    const safetyTimeoutId = setTimeout(() => {
      if (initializing || checkingFirstLaunch) {
        console.warn("Safety timeout triggered. Forcing app to continue.");
        if (initializing) {
          console.warn("Auth was still initializing after timeout");
        }
        if (checkingFirstLaunch) {
          console.warn("First launch check was still running after timeout");
          setCheckingFirstLaunch(false);
        }
      }
    }, 5000);

    return () => clearTimeout(safetyTimeoutId);
  }, [initializing, checkingFirstLaunch]);

  if (initializing && checkingFirstLaunch) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.background,
        }}
      >
        <Ionicons name="refresh" size={32} color={theme.accent} />
      </View>
    );
  }

  // For first-time users, show the welcome screen
  if (isFirstLaunch && !user) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="(auth)"
          initialParams={{ screen: "welcome" }}
          options={{ gestureEnabled: false }}
        />
      </Stack>
    );
  }
  
  // For auth screens (login/signup), don't show the tab bar
  if (showAuthScreen) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" initialParams={{ screen: "login" }} />
      </Stack>
    );
  }

  // For all other screens, show the tab navigation
  return <TabsNavigator />;
}

export default function AppLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <RootNavigation />
      </ThemeProvider>
    </AuthProvider>
  );
}
