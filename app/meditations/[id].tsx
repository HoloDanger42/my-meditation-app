import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Animated,
  Dimensions,
  PanResponder,
  GestureResponderEvent,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Audio, AVPlaybackStatus } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

const BACKGROUNDS = [
  require("../../assets/images/meditation-bg-1.jpg"),
  require("../../assets/images/meditation-bg-2.jpg"),
  require("../../assets/images/meditation-bg-3.jpg"),
];

const { width } = Dimensions.get("window");

export default function MeditationPlayerScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  // Audio state
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeekingAudio, setIsSeekingAudio] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(true);

  // UI state
  const [selectedBackground, setSelectedBackground] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showRatingPanel, setShowRatingPanel] = useState(false);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [showProgressThumb, setShowProgressThumb] = useState(false);
  const [meditationInfo, setMeditationInfo] = useState({
    title: "Loading...",
    description: "",
    duration: 0,
  });

  // Refs
  const breathAnim = useRef(new Animated.Value(1)).current;
  const breathingAnimationRef = useRef<Animated.CompositeAnimation | null>(
    null
  );
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Meditation data - could be moved to a separate file
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

  // Animation functions
  const startBreathingAnimation = useCallback(() => {
    if (breathingAnimationRef.current) {
      breathingAnimationRef.current.stop();
    }

    breathAnim.setValue(1);
    breathingAnimationRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, {
          toValue: 1.15,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(breathAnim, {
          toValue: 1.0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    );

    breathingAnimationRef.current.start();
  }, []);

  // Timer functions
  function startTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    startTimeRef.current = Date.now() - timeElapsed * 1000;
    timerRef.current = setInterval(() => {
      if (sound && isPlaying && !isDraggingProgress && !isSeekingAudio) {
        sound
          .getStatusAsync()
          .then((status) => {
            if (status.isLoaded && status.isPlaying) {
              setTimeElapsed(Math.floor(status.positionMillis / 1000));
            }
          })
          .catch(() => {
            // Fallback if we can't get status
            const fallbackElapsed = Math.floor(
              (Date.now() - startTimeRef.current) / 1000
            );
            setTimeElapsed(fallbackElapsed);
          });
      }
    }, 250);
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  // Audio cleanup function (used in multiple places)
  const cleanupAudio = async (soundToCleanup: Audio.Sound) => {
    try {
      stopTimer();

      const status = await soundToCleanup.getStatusAsync();
      if (status.isLoaded) {
        await soundToCleanup.stopAsync();
        await soundToCleanup.unloadAsync();
      }
    } catch (error) {
      // Silent failure
    }
  };

  // Audio initialization
  async function initializeAudio() {
    setIsAudioLoading(true);
    const meditationId = Array.isArray(id) ? id[0] : `${id}`;
    const meditation =
      meditationData[meditationId as keyof typeof meditationData];

    if (!meditation) {
      setIsAudioLoading(false);
      return null;
    }

    setDuration(meditation.duration);
    const selectedAudio =
      meditation.audio || require("../../assets/audio/meditation.mp3");

    try {
      const { sound } = await Audio.Sound.createAsync(selectedAudio, {
        shouldPlay: false,
        progressUpdateIntervalMillis: 100,
      });

      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        const actualDuration = status.durationMillis
          ? Math.ceil(status.durationMillis / 1000)
          : meditation.duration;
        setDuration(actualDuration);
      }

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      sound.setOnPlaybackStatusUpdate(updatePlaybackStatus);
      setSound(sound);
      setIsAudioLoading(false);
      return sound;
    } catch (error) {
      setIsAudioLoading(false);
      return null;
    }
  }

  // Audio control functions
  async function loadAudio() {
    if (sound) {
      try {
        startTimeRef.current = Date.now();
        await sound.playAsync();
        setIsPlaying(true);
        startTimer();
      } catch (error) {
        // If playback fails, reinitialize
        initializeAudio().then((newSound) => {
          if (newSound) {
            newSound.playAsync();
            setIsPlaying(true);
            startTimer();
          }
        });
      }
    } else {
      const newSound = await initializeAudio();
      if (newSound) {
        startTimeRef.current = Date.now();
        await newSound.playAsync();
        setIsPlaying(true);
        startTimer();
      }
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
        startTimeRef.current = Date.now() - timeElapsed * 1000;
        await sound.playAsync();
        setIsPlaying(true);
        startTimer();
      }
    }
  }

  const seekToPosition = async (position: number) => {
    if (!sound) return;

    try {
      setIsSeekingAudio(true);
      const seekPosition = Math.max(
        0,
        Math.min(Math.floor(position), duration)
      );

      // Update UI first for responsive feel
      setTimeElapsed(seekPosition);

      await sound.setPositionAsync(seekPosition * 1000);

      // Verify the position
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        setTimeElapsed(Math.floor(status.positionMillis / 1000));
      }

      // Update time reference
      startTimeRef.current = Date.now() - seekPosition * 1000;

      if (isPlaying) {
        stopTimer();
        startTimer();
      }
    } catch (error) {
      // Silent failure
    } finally {
      setIsSeekingAudio(false);
    }
  };

  const updatePlaybackStatus = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    if (!isDraggingProgress && !isSeekingAudio) {
      const currentPosition = Math.floor(status.positionMillis / 1000);
      setTimeElapsed(currentPosition);

      if (
        status.didJustFinish ||
        (currentPosition >= duration && duration > 0)
      ) {
        handleEndSession();
      }
    }
  };

  // Progress bar handling with PanResponder
  const progressPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,

        onPanResponderGrant: async (evt) => {
          const { locationX } = evt.nativeEvent;
          setIsDraggingProgress(true);
          setShowProgressThumb(true);

          if (sound && isPlaying) {
            await sound.pauseAsync();
          }

          const progressBarWidth = width - 40;
          const percentage = Math.max(
            0,
            Math.min(locationX / progressBarWidth, 1)
          );
          const newPosition = Math.floor(percentage * duration);

          setTimeElapsed(newPosition);
        },

        onPanResponderMove: (evt: GestureResponderEvent) => {
          const { locationX } = evt.nativeEvent;
          const progressBarWidth = width - 40;
          const percentage = Math.max(
            0,
            Math.min(locationX / progressBarWidth, 1)
          );
          const newPosition = Math.floor(percentage * duration);

          setTimeElapsed(newPosition);
        },

        onPanResponderRelease: async (evt: GestureResponderEvent) => {
          const { locationX } = evt.nativeEvent;
          const progressBarWidth = width - 40;
          const percentage = Math.max(
            0,
            Math.min(locationX / progressBarWidth, 1)
          );
          const newPosition = Math.floor(percentage * duration);

          try {
            await seekToPosition(newPosition);

            if (isPlaying) {
              await sound?.playAsync();
              startTimer();
            }
          } catch (error) {
            // Silent failure
          } finally {
            setIsDraggingProgress(false);
          }
        },
      }),
    [duration, sound, isPlaying]
  );

  // Session management
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
      // Silent failure
    }
  }

  async function handleEndSession() {
    if (sound) {
      try {
        stopTimer();
        setIsPlaying(false);

        await cleanupAudio(sound);
        setSound(null);
      } catch (error) {
        setSound(null);
      }
    }
    setShowRatingPanel(true);
  }

  function handleRating(rating: number) {
    saveSession(timeElapsed, rating);
    setIsPlaying(false);
    setTimeElapsed(0);
    setShowRatingPanel(false);

    if (sound) {
      (async () => {
        try {
          await cleanupAudio(sound);
          setSound(null);
        } catch (error) {
          setSound(null);
        }
      })();
    }
    router.back();
  }

  function skipRating() {
    saveSession(timeElapsed);
    setIsPlaying(false);
    setTimeElapsed(0);
    setShowRatingPanel(false);

    if (sound) {
      (async () => {
        try {
          await cleanupAudio(sound);
          setSound(null);
        } catch (error) {
          setSound(null);
        }
      })();
    }
    router.back();
  }

  // Favorites handling
  const checkFavoriteStatus = async () => {
    try {
      const favoritesJson = await AsyncStorage.getItem("favorite_meditations");
      if (favoritesJson) {
        const favorites = JSON.parse(favoritesJson);
        setIsFavorite(favorites.includes(id));
      }
    } catch (error) {
      // Silent failure
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
      // Silent failure
    }
  }

  // UI helpers
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

  // UseEffect hooks
  useEffect(() => {
    if (showProgressThumb) {
      const hideThumbTimer = setTimeout(() => {
        setShowProgressThumb(false);
      }, 2000);
      return () => clearTimeout(hideThumbTimer);
    }
  }, [showProgressThumb]);

  useEffect(() => {
    // Set up meditation info
    const meditationId = Array.isArray(id) ? id[0] : `${id}`;
    if (meditationData[meditationId as keyof typeof meditationData]) {
      const info = meditationData[meditationId as keyof typeof meditationData];
      setMeditationInfo(info);
      setDuration(info.duration);
    }

    checkFavoriteStatus();
    startBreathingAnimation();
    initializeAudio();

    return () => {
      if (sound) sound.unloadAsync();
      if (timerRef.current) clearInterval(timerRef.current);
      if (breathingAnimationRef.current) breathingAnimationRef.current.stop();
    };
  }, [id, startBreathingAnimation]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        // Clean up audio when screen loses focus
        if (sound) {
          const soundToCleanup = sound;
          setIsPlaying(false);
          setSound(null);
          cleanupAudio(soundToCleanup);
        }
      };
    }, [sound])
  );

  // Render UI
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
            onPress={async () => {
              if (sound) {
                const soundToCleanup = sound;
                setIsPlaying(false);
                setSound(null);
                await cleanupAudio(soundToCleanup);
              }
              router.back();
            }}
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
            {isAudioLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                  style={{ marginRight: 10 }}
                />
                <Text style={styles.timeText}>Loading audio...</Text>
              </View>
            ) : (
              <>
                <Text style={styles.timeText}>{formatTime(timeElapsed)}</Text>
                {duration > 0 && (
                  <Text style={styles.timeText}>{formatTime(duration)}</Text>
                )}
              </>
            )}
          </View>

          <View
            style={[
              styles.progressBarContainer,
              isAudioLoading && { opacity: 0.5 },
            ]}
            {...(isAudioLoading ? {} : progressPanResponder.panHandlers)}
            onTouchStart={() => !isAudioLoading && setShowProgressThumb(true)}
          >
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${(timeElapsed / (duration || 600)) * 100}%` },
                ]}
              />
            </View>

            {!isAudioLoading && (isDraggingProgress || showProgressThumb) && (
              <View
                style={[
                  styles.progressThumb,
                  {
                    left: `${(timeElapsed / (duration || 600)) * 100}%`,
                    transform: [{ scale: isDraggingProgress ? 1.4 : 1 }],
                    backgroundColor: isDraggingProgress
                      ? "rgba(78, 159, 61, 0.95)"
                      : "rgba(78, 159, 61, 0.7)",
                    shadowColor: "#fff",
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: isDraggingProgress ? 0.8 : 0.4,
                    shadowRadius: isDraggingProgress ? 6 : 3,
                  },
                ]}
              />
            )}
          </View>

          <TouchableOpacity
            style={[styles.endButton, isAudioLoading && { opacity: 0.5 }]}
            onPress={!isAudioLoading ? handleEndSession : undefined}
            disabled={isAudioLoading}
          >
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
    paddingHorizontal: 0,
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
  progressThumb: {
    position: "absolute",
    width: 14,
    height: 14,
    backgroundColor: "rgba(78, 159, 61, 0.9)",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 7,
    marginLeft: -7,
    top: 12,
    marginTop: -12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
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
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 5,
  },
});
