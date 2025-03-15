import React, { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";

// Define theme colors
export const lightTheme = {
  background: "#fff",
  text: "#333",
  textSecondary: "#555",
  textTertiary: "#777",
  card: "#f8f8f8",
  cardBorder: "#eee",
  accent: "#4E9F3D", // Main app green color
  accentLight: "#4E9F3D20",
  inputBackground: "#fff",
};

export const darkTheme = {
  background: "#121212",
  text: "#f1f1f1",
  textSecondary: "#d1d1d1",
  textTertiary: "#a0a0a0",
  card: "#1e1e1e",
  cardBorder: "#333",
  accent: "#5DB54A", // Slightly lighter green for dark mode
  accentLight: "#5DB54A20",
  inputBackground: "#252525",
};

type ThemeType = typeof lightTheme;

interface ThemeContextType {
  theme: ThemeType;
  isDark: boolean;
  toggleTheme: () => void;
  setDarkMode: (isDark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const deviceTheme = useColorScheme();
  const [isDark, setIsDark] = useState<boolean>(false);

  // Load theme preference from storage on mount
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem("theme_preference");
        if (storedTheme !== null) {
          setIsDark(storedTheme === "dark");
        } else {
          // If no stored preference, use device theme
          setIsDark(deviceTheme === "dark");
        }
      } catch (error) {
        console.error("Failed to load theme preference", error);
      }
    };

    loadThemePreference();
  }, [deviceTheme]);

  // Save theme preference whenever it changes
  useEffect(() => {
    const saveThemePreference = async () => {
      try {
        await AsyncStorage.setItem(
          "theme_preference",
          isDark ? "dark" : "light"
        );
      } catch (error) {
        console.error("Failed to save theme preference", error);
      }
    };

    saveThemePreference();
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const setDarkMode = (value: boolean) => {
    setIsDark(value);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: isDark ? darkTheme : lightTheme,
        isDark,
        toggleTheme,
        setDarkMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
