import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Define categories
const categories = [
  { id: "all", name: "All" },
  { id: "anxiety", name: "Anxiety" },
  { id: "sleep", name: "Sleep" },
  { id: "focus", name: "Focus" },
  { id: "beginners", name: "Beginners" },
];

// Define meditation data with categories
const meditationsData = [
  {
    id: 1,
    title: "Calm Mind",
    description: "Reduce anxiety and find peace",
    duration: 180, // seconds
    category: ["anxiety", "beginners"],
    image: require("../../assets/images/meditation-thumb-1.jpg"),
  },
  {
    id: 2,
    title: "Relaxing Breath",
    description: "Slow breathing for relaxation",
    duration: 300, // seconds
    category: ["anxiety", "focus"],
    image: require("../../assets/images/meditation-thumb-2.jpg"),
  },
  {
    id: 3,
    title: "Gentle Sleep",
    description: "Prepare your mind for restful sleep",
    duration: 600, // seconds
    category: ["sleep"],
    image: require("../../assets/images/meditation-thumb-3.jpg"),
  },
  {
    id: 4,
    title: "Focus Mind",
    description: "Improve concentration and clarity",
    duration: 300, // seconds
    category: ["focus"],
    image: require("../../assets/images/meditation-thumb-4.jpg"),
  },
  {
    id: 5,
    title: "Beginner's Guide",
    description: "Introduction to meditation practice",
    duration: 180, // seconds
    category: ["beginners"],
    image: require("../../assets/images/meditation-thumb-5.jpg"),
  },
];

export default function MeditationListScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const favoritesJson = await AsyncStorage.getItem("favorite_meditations");
      if (favoritesJson) {
        setFavorites(JSON.parse(favoritesJson));
      }
    } catch (error) {
      console.error("Failed to load favorites:", error);
    }
  };

  const filteredMeditations =
    selectedCategory === "all"
      ? meditationsData
      : meditationsData.filter((item) =>
          item.category.includes(selectedCategory)
        );

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min`;
  };

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
    item: (typeof meditationsData)[0];
  }) => {
    const isFavorite = favorites.includes(item.id.toString());

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
              <Ionicons name="time-outline" size={14} color="#777" />
              <Text style={styles.durationText}>
                {formatDuration(item.duration)}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  categoryList: {
    maxHeight: 40,
    backgroundColor: "#fff",
    paddingLeft: 15,
  },
  categoryItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
  },
  selectedCategory: {
    backgroundColor: "#4E9F3D",
  },
  categoryText: {
    color: "#555",
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
    backgroundColor: "#fff",
    marginBottom: 15,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
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
    color: "#333",
    flex: 1,
  },
  meditationDesc: {
    fontSize: 14,
    color: "#777",
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
    color: "#777",
    marginLeft: 4,
  },
  categoryTag: {
    backgroundColor: "#f0f8f0",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  categoryTagText: {
    fontSize: 10,
    color: "#4E9F3D",
    fontWeight: "500",
  },
});
