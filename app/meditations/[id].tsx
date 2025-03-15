import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Animated,
  Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

const BACKGROUNDS = [
  require("../../assets/images/meditation-bg-1.jpg"),
  require("../../assets/images/meditation-bg-2.jpg"),
  require("../../assets/images/meditation-bg-3.jpg"),
];

export default function MeditationPlayerScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedBackground, setSelectedBackground] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showRatingPanel, setShowRatingPanel] = useState(false);
  const [meditationInfo, setMeditationInfo] = useState({
    title: "Loading...",
    description: "",
    duration: 0,
  });
  const breathAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Mapping meditation IDs to audio files and durations (in seconds)
  const meditationData = {
    "1": {
      title: "Calm Mind",
      description: "Reduce anxiety and find peace",
      audio: require("../../assets/audio/calm.mp3"),
      duration: 180, // 3 minutes
    },
    "2": {
      title: "Relaxing Breath",
      description: "Slow breathing for relaxation",
      audio: require("../../assets/audio/relaxing_breath.mp3"),
      duration: 300, // 5 minutes
    },
    "3": {
      title: "Gentle Sleep",
      description: "Prepare your mind for restful sleep",
      audio: require("../../assets/audio/gentle_sleep.mp3"),
      duration: 600, // 10 minutes
    },
  };

  let breathingAnimation: Animated.CompositeAnimation;

  useEffect(() => {
    // Set up meditation info
    const meditationId = Array.isArray(id) ? id[0] : `${id}`;
    if (meditationData[meditationId as keyof typeof meditationData]) {
      const info = meditationData[meditationId as keyof typeof meditationData];
      setMeditationInfo(info);
      setDuration(info.duration);
    }

    // Check if this meditation is favorited
    checkFavoriteStatus();

    // Set up breathing animation
    startBreathingAnimation();

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (breathingAnimation) {
        breathingAnimation.stop();
      }
    };
  }, [id]);

  const startBreathingAnimation = () => {
    breathingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: false,
        }),
        Animated.timing(breathAnim, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: false,
        }),
      ])
    );

    breathingAnimation.start();
  };

  const checkFavoriteStatus = async () => {
    try {
      const favoritesJson = await AsyncStorage.getItem("favorite_meditations");
      if (favoritesJson) {
        const favorites = JSON.parse(favoritesJson);
        setIsFavorite(favorites.includes(id));
      }
    } catch (error) {
      console.error("Failed to check favorite status:", error);
    }
  };

  async function toggleFavorite() {
    try {
      const favoritesJson = await AsyncStorage.getItem("favorite_meditations");
      const favorites = favoritesJson ? JSON.parse(favoritesJson) : [];

      let updatedFavorites;
      if (isFavorite) {
        updatedFavorites = favorites.filter((favId: string) => favId !== id);
      } else {
        updatedFavorites = [...favorites, id];
      }

      await AsyncStorage.setItem(
        "favorite_meditations",
        JSON.stringify(updatedFavorites)
      );
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    }
  }

  async function loadAudio() {
    const meditationId = Array.isArray(id) ? id[0] : `${id}`;
    const selectedAudio =
      meditationData[meditationId as keyof typeof meditationData]?.audio ||
      require("../../assets/audio/meditation.mp3");
    try {
      const { sound } = await Audio.Sound.createAsync(selectedAudio, {
        shouldPlay: true,
      });

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      setSound(sound);
      setIsPlaying(true);
      startTimer();
    } catch (error) {
      console.error("Failed to load audio:", error);
    }
  }

  function startTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setTimeElapsed((prevTime) => {
        const newTime = prevTime + 1;
        // Auto-stop if reached duration
        if (newTime >= duration && duration > 0) {
          handleEndSession();
        }
        return newTime;
      });
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function handlePlayPause() {
    if (!sound) {
      await loadAudio();
    } else {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
        stopTimer();
      } else {
        await sound.playAsync();
        setIsPlaying(true);
        startTimer();
      }
    }
  }

  async function saveSession(duration: number, rating?: number) {
    const session = {
      id: Date.now(),
      meditationId: id,
      duration,
      rating: rating || 0,
      timestamp: new Date().toISOString(),
    };

    try {
      const storedSessions = await AsyncStorage.getItem("meditation_sessions");
      const sessions = storedSessions ? JSON.parse(storedSessions) : [];
      sessions.push(session);
      await AsyncStorage.setItem(
        "meditation_sessions",
        JSON.stringify(sessions)
      );
    } catch (error) {
      console.error("Failed to save session: ", error);
    }
  }

  async function handleEndSession() {
    if (sound) {
      await sound.pauseAsync();
      await sound.unloadAsync();
      setSound(null);
    }
    stopTimer();
    setShowRatingPanel(true);
  }

  function handleRating(rating: number) {
    saveSession(timeElapsed, rating);
    setIsPlaying(false);
    setTimeElapsed(0);
    setShowRatingPanel(false);
    router.back();
  }

  function skipRating() {
    saveSession(timeElapsed);
    setIsPlaying(false);
    setTimeElapsed(0);
    setShowRatingPanel(false);
    router.back();
  }

  function formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes < 10 ? "0" : ""}${minutes}:${
      secs < 10 ? "0" : ""
    }${secs}`;
  }

  function changeBackground() {
    setSelectedBackground((prev) => (prev + 1) % BACKGROUNDS.length);
  }

  return (
    <ImageBackground
      source={BACKGROUNDS[selectedBackground]}
      style={styles.container}
    >
      <StatusBar style="light" />
      <View style={styles.overlay}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={28} color="white" />
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <Text style={styles.title}>{meditationInfo.title}</Text>
            <Text style={styles.subtitle}>{meditationInfo.description}</Text>
          </View>

          <TouchableOpacity style={styles.iconButton} onPress={toggleFavorite}>
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={28}
              color={isFavorite ? "#FF6B6B" : "white"}
            />
          </TouchableOpacity>
        </View>

        {/* Meditation Circle */}
        <View style={styles.meditationContainer}>
          <TouchableOpacity
            style={styles.bgChangeButton}
            onPress={changeBackground}
          >
            <Ionicons name="image-outline" size={24} color="white" />
          </TouchableOpacity>

          <TouchableOpacity onPress={handlePlayPause}>
            <Animated.View
              style={[
                styles.meditationCircle,
                { transform: [{ scale: breathAnim }] },
              ]}
            >
              <View style={styles.playPauseContainer}>
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={60}
                  color="white"
                />
              </View>
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* Controls */}
        <View style={styles.controlsContainer}>
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(timeElapsed)}</Text>
            {duration > 0 && (
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            )}
          </View>

          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${(timeElapsed / (duration || 600)) * 100}%` },
                ]}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.endButton} onPress={handleEndSession}>
            <Text style={styles.endButtonText}>End Session</Text>
          </TouchableOpacity>
        </View>

        {/* Rating Panel */}
        {showRatingPanel && (
          <View style={styles.ratingPanel}>
            <Text style={styles.ratingTitle}>How was your session?</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => handleRating(star)}
                  style={styles.starButton}
                >
                  <Ionicons name="star" size={40} color="#FFD700" />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.skipButton} onPress={skipRating}>
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ImageBackground>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 60,
    marginBottom: 30,
  },
  iconButton: {
    padding: 8,
  },
  titleContainer: {
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 5,
  },
  meditationContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  meditationCircle: {
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.5)",
    backgroundColor: "rgba(78, 159, 61, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  playPauseContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  bgChangeButton: {
    position: "absolute",
    top: 0,
    right: 0,
    padding: 12,
  },
  controlsContainer: {
    marginBottom: 40,
  },
  timeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  timeText: {
    color: "white",
    fontSize: 16,
  },
  progressBarContainer: {
    width: "100%",
    height: 40,
    justifyContent: "center",
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 3,
  },
  endButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 20,
    borderWidth: 1,
    borderColor: "white",
  },
  endButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  ratingPanel: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  ratingTitle: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 30,
  },
  starButton: {
    padding: 10,
  },
  skipButton: {
    padding: 15,
  },
  skipButtonText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 16,
  },
});
