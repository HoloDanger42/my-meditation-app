// Load RNFirebase modular migration flags early
import "../utils/rnfbFlags";
import { Stack, Tabs } from "expo-router";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import { ThemeProvider, useTheme } from "../context/ThemeContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import React, { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { performInitialSync } from "../utils/firestoreSync";
import * as SplashScreen from "expo-splash-screen";
import initializeFirebase from "../utils/firebaseInit";
import { runDataMigrationIfNeeded } from "@/utils/secureStorage";

// Initialize Firebase as early as possible
initializeFirebase();

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

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
        {/* TRIAGE HOME - Voice-First Interface */}
        <Tabs.Screen
          name="index"
          options={{
            title: "Triage",
            tabBarIcon: ({ color }) => (
              <Ionicons name="mic-outline" size={28} color={color} />
            ),
          }}
        />

        {/* HISTORY - Past Triage Sessions */}
        <Tabs.Screen
          name="journal"
          options={{
            title: "History",
            tabBarIcon: ({ color }) => (
              <Ionicons name="time-outline" size={24} color={color} />
            ),
          }}
        />

        {/* CONNECT - Agora Video/RTM */}
        <Tabs.Screen
          name="tools"
          options={{
            title: "Connect",
            tabBarIcon: ({ color }) => (
              <Ionicons name="call-outline" size={24} color={color} />
            ),
          }}
        />

        {/* DISABLED: Wellness Features */}
        <Tabs.Screen
          name="mood"
          options={{
            href: null, // Hidden from navigation
          }}
        />

        <Tabs.Screen
          name="meditations"
          options={{
            href: null, // Hidden from navigation
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

type InitialRoute = "welcome" | "login" | "tabs";

function RootNavigation() {
  const { user, initializing } = useAuth();
  const { theme } = useTheme();
  const [appReady, setAppReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<InitialRoute | null>(null);

  useEffect(() => {
    async function prepareApp() {
      let isFirstLaunch = false;
      try {
        await runDataMigrationIfNeeded();
        console.log("Migration check complete.");

        const hasLaunched = await AsyncStorage.getItem("hasLaunched");
        if (hasLaunched === null) {
          await AsyncStorage.setItem("hasLaunched", "true");
          isFirstLaunch = true;
        } else {
          isFirstLaunch = false;
        }
      } catch (e) {
        console.warn("Error during app preparation:", e);
        isFirstLaunch = false;
      } finally {
        (window as any).__tempIsFirstLaunch = isFirstLaunch; // For debugging purposes
      }
    }

    prepareApp();
  }, []);

  useEffect(() => {
    // Only proceed if auth is no longer initializing
    if (!initializing) {
      // Retrieve the first launch status determined in the prepareApp effect
      const isFirstLaunch = (window as any).__tempIsFirstLaunch ?? false;
      delete (window as any).__tempIsFirstLaunch; // Clean up temporary store

      let route: InitialRoute;
      if (isFirstLaunch && !user) {
        route = "welcome";
      } else if (!user) {
        route = "login";
      } else {
        route = "tabs";
      }
      setInitialRoute(route);
      setAppReady(true); // Mark app as ready to hide splash screen
    }
  }, [initializing, user]);

  // Effect to hide splash screen once app is ready
  const onLayoutRootView = useCallback(async () => {
    if (appReady) {
      await SplashScreen.hideAsync();
    }
  }, [appReady]);

  // Sync user data when they log in (or are already logged in)
  useEffect(() => {
    if (user && appReady) {
      performInitialSync().catch((error) => {
        console.error("Failed to sync data:", error);
      });
    }
  }, [user, appReady]);

  // Render nothing until the layout callback runs and hides the splash screen
  if (!appReady || !initialRoute) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      {initialRoute === "welcome" && (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name="(auth)"
            initialParams={{ screen: "welcome" }}
            options={{ gestureEnabled: false }}
          />
        </Stack>
      )}
      {initialRoute === "login" && (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" initialParams={{ screen: "login" }} />
        </Stack>
      )}
      {initialRoute === "tabs" && <TabsNavigator />}
    </View>
  );
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
