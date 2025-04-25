import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { StatusBar } from "expo-status-bar";
import { Audio } from "expo-av";
import { getSecureItem } from "../../utils/secureStorage";
import { meditationsData } from "../../data/meditationsData";

// Define categories
const categories = [
  { id: "all", name: "All" },
  { id: "calm", name: "Calm" },
  { id: "peaceful", name: "Peaceful" },
  { id: "happy", name: "Happy" },
  { id: "relaxing", name: "Relaxing" },
  { id: "ambient", name: "Ambient" },
  { id: "sleep", name: "Sleep" },
];

const meditationImages: { [key: string]: any } = {
  "1": require("../../assets/images/meditation-thumb-1.jpg"),
  "2": require("../../assets/images/meditation-thumb-2.jpg"),
  "3": require("../../assets/images/meditation-thumb-3.jpg"),
};

const meditationsArray = Object.values(meditationsData).map((meditation) => ({
  ...meditation,
  id: parseInt(meditation.id), // Convert string ID to number
  image:
    meditationImages[meditation.id] ||
    require("../../assets/images/meditation-thumb-5.jpg"),
}));

export default function MeditationListScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [favorites, setFavorites] = useState<string[]>([]);
  const { theme, isDark } = useTheme();

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const favorites = await getSecureItem<string[]>("favorite_meditations");
      if (favorites) {
        setFavorites(favorites);
      }
    } catch (error) {
      console.error("Failed to load favorites:", error);
    }
  };

  const filteredMeditations =
    selectedCategory === "all"
      ? meditationsArray
      : meditationsArray.filter((item) =>
          item.category.includes(selectedCategory)
        );

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min`;
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      paddingTop: 60,
      paddingHorizontal: 20,
      paddingBottom: 15,
      backgroundColor: theme.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.cardBorder,
      shadowColor: isDark ? "#000" : "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 3,
      elevation: 3,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.text,
    },
    categoryList: {
      maxHeight: 40,
      backgroundColor: theme.background,
      paddingLeft: 15,
      marginTop: 15,
    },
    categoryItem: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      marginRight: 10,
      borderRadius: 20,
      backgroundColor: isDark ? "#333" : "#f5f5f5",
    },
    selectedCategory: {
      backgroundColor: theme.accent,
    },
    categoryText: {
      color: theme.textSecondary,
      fontWeight: "500",
    },
    selectedCategoryText: {
      color: "#fff",
    },
    meditationsList: {
      padding: 15,
    },
    meditationItem: {
      flexDirection: "row",
      backgroundColor: theme.card,
      marginBottom: 15,
      borderRadius: 12,
      overflow: "hidden",
      shadowColor: isDark ? "#000" : "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 3,
      elevation: isDark ? 4 : 2,
    },
    meditationImage: {
      width: 100,
      height: 100,
      borderTopLeftRadius: 12,
      borderBottomLeftRadius: 12,
    },
    meditationContent: {
      flex: 1,
      padding: 12,
      justifyContent: "space-between",
    },
    meditationHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    meditationTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.text,
      flex: 1,
    },
    meditationDesc: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 4,
    },
    meditationMeta: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 8,
    },
    durationContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    durationText: {
      fontSize: 12,
      color: theme.textTertiary,
      marginLeft: 4,
    },
    categoryTag: {
      backgroundColor: isDark ? theme.accent + "20" : "#f0f8f0",
      paddingVertical: 2,
      paddingHorizontal: 8,
      borderRadius: 12,
    },
    categoryTagText: {
      fontSize: 10,
      color: theme.accent,
      fontWeight: "500",
    },
    loadingIndicator: {
      marginLeft: 5,
    },
  });

  const renderCategoryItem = ({ item }: { item: (typeof categories)[0] }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        selectedCategory === item.id && styles.selectedCategory,
      ]}
      onPress={() => setSelectedCategory(item.id)}
    >
      <Text
        style={[
          styles.categoryText,
          selectedCategory === item.id && styles.selectedCategoryText,
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderMeditationItem = ({
    item,
  }: {
    item: (typeof meditationsArray)[0];
  }) => {
    const isFavorite = favorites.includes(item.id.toString());
    const displayDuration = item.duration;

    return (
      <TouchableOpacity
        style={styles.meditationItem}
        onPress={() => router.push(`/meditations/${item.id}`)}
      >
        <Image source={item.image} style={styles.meditationImage} />
        <View style={styles.meditationContent}>
          <View style={styles.meditationHeader}>
            <Text style={styles.meditationTitle}>{item.title}</Text>
            {isFavorite && <Ionicons name="heart" size={18} color="#FF6B6B" />}
          </View>
          <Text style={styles.meditationDesc}>{item.description}</Text>
          <View style={styles.meditationMeta}>
            <View style={styles.durationContainer}>
              <Ionicons
                name="time-outline"
                size={14}
                color={theme.textTertiary}
              />
              <Text style={styles.durationText}>
                {formatDuration(displayDuration)}
              </Text>
            </View>
            <View style={styles.categoryTag}>
              <Text style={styles.categoryTagText}>
                {item.category[0].charAt(0).toUpperCase() +
                  item.category[0].slice(1)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={styles.header}>
        <Text style={styles.title}>Meditations</Text>
      </View>

      <FlatList
        data={categories}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={renderCategoryItem}
        keyExtractor={(item) => item.id}
        style={styles.categoryList}
      />

      <FlatList
        data={filteredMeditations}
        renderItem={renderMeditationItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.meditationsList}
      />
    </View>
  );
}
