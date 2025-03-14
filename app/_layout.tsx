import { Tabs } from "expo-router";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import { ThemeProvider, useTheme } from "../context/ThemeContext";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";

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
      </Tabs>
    </View>
  );
}

export default function AppLayout() {
  return (
    <ThemeProvider>
      <TabsNavigator />
    </ThemeProvider>
  );
}
