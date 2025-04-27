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
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Audio, AVPlaybackStatus } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { meditationsData } from "../../data/meditationsData";
import {
  getSecureItem,
  setSecureItem,
} from "../../utils/secureStorage";
import { MeditationSession } from "../../types/dataTypes";
import { getTotalMeditationMinutes, getTotalMeditationSessions } from "../../utils/stats";

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

  // Audio cleanup function
  const cleanupAudio = async (soundToCleanup: Audio.Sound) => {
    console.log("Attempting audio cleanup...");
    try {
      stopTimer();

      const status = await soundToCleanup.getStatusAsync();
      if (status.isLoaded) {
        console.log("Sound is loaded, stopping and unloading...");
        await soundToCleanup.stopAsync();
        await soundToCleanup.unloadAsync();
        console.log("Audio cleaned up successfully.");
      } else {
        console.log("Sound was already unloaded or in an error state.");
      }
    } catch (error) {
      console.error("Error during audio cleanup:", error);
    }
  };

  // Audio initialization
  async function initializeAudio() {
    setIsAudioLoading(true);
    const meditationId = Array.isArray(id) ? id[0] : `${id}`;
    const meditation = meditationsData[meditationId];

    if (!meditation) {
      console.error(`Meditation data not found for ID: ${meditationId}`);
      Alert.alert(
        "Error",
        "Could not find meditation data. Please go back and try again."
      );
      setIsAudioLoading(false);
      return null;
    }

    setDuration(meditation.duration);
    const selectedAudio =
      meditation.audio || require("../../assets/audio/calm.mp3");

    try {
      console.log(`Initializing audio for meditation ID: ${meditationId}`);
      const { sound } = await Audio.Sound.createAsync(selectedAudio, {
        shouldPlay: false,
        progressUpdateIntervalMillis: 100,
      });

      const status = await sound.getStatusAsync();
      if (status.isLoaded && status.durationMillis) {
        const actualDuration = Math.ceil(status.durationMillis / 1000);
        console.log(`Actual audio duration: ${actualDuration}s`);
        setDuration(actualDuration);
      } else if (status.isLoaded) {
        console.warn("Audio loaded but durationMillis is not available.");
      } else {
        console.warn("Audio status could not be read after loading.");
      }

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      sound.setOnPlaybackStatusUpdate(updatePlaybackStatus);
      setSound(sound);
      setIsAudioLoading(false);
      console.log("Audio initialized successfully.");
      return sound;
    } catch (error) {
      console.error("Error initializing audio:", error);
      setSound(null);
      setIsAudioLoading(false);

      Alert.alert(
        "Audio Error",
        "Could not load the meditation audio. Please check your connection or try again later."
      );
      return null;
    }
  }

  // Audio control functions
  async function loadAudio() {
    if (sound) {
      try {
        console.log("Attempting to play existing sound object.");
        startTimeRef.current = Date.now();
        await sound.playAsync();
        setIsPlaying(true);
        startTimer();
        console.log("Playback started successfully.");
      } catch (error) {
        console.error(
          "Error playing existing sound, attempting reinitialization:",
          error
        );
        setIsAudioLoading(true);
        setIsPlaying(false);
        stopTimer();

        initializeAudio()
          .then(async (newSound) => {
            if (newSound) {
              try {
                console.log("Reinitialized sound, attempting playback.");
                startTimeRef.current = Date.now();
                await newSound.playAsync();
                setIsPlaying(true);
                startTimer();
                console.log("Playback started after reinitialization.");
              } catch (playError) {
                console.error(
                  "Error playing sound after reinitialization:",
                  playError
                );
                setIsPlaying(false);
                stopTimer();
                Alert.alert(
                  "Playback Error",
                  "Could not start playback even after reloading. Please try again."
                );
              }
            } else {
              console.log("Reinitialization failed, cannot play audio.");
              setIsPlaying(false);
            }
          })
          .finally(() => {
            setIsAudioLoading(false);
          });
      }
    } else {
      console.log("Sound object is null, initializing audio first.");
      setIsAudioLoading(true);
      setIsPlaying(false);
      stopTimer();

      const newSound = await initializeAudio();
      if (newSound) {
        try {
          console.log("Initialized new sound, attempting playback.");
          startTimeRef.current = Date.now();
          await newSound.playAsync();
          setIsPlaying(true);
          startTimer();
          console.log("Playback started with new sound.");
        } catch (playError) {
          console.error("Error playing newly initialized sound:", playError);
          setIsPlaying(false);
          stopTimer();
          Alert.alert(
            "Playback Error",
            "Could not start playback. Please try again."
          );
        }
      } else {
        console.log("Initialization failed, cannot play audio.");
        setIsPlaying(false);
      }
      setIsAudioLoading(false);
    }
  }

  async function handlePlayPause() {
    if (!sound) {
      console.log("Play pressed, but sound not loaded. Calling loadAudio.");
      await loadAudio();
    } else {
      if (isPlaying) {
        try {
          console.log("Pausing audio.");
          await sound.pauseAsync();
          setIsPlaying(false);
          stopTimer();
          console.log("Audio paused.");
        } catch (error) {
          console.error("Error pausing audio:", error);
        }
      } else {
        try {
          console.log("Resuming audio playback.");
          startTimeRef.current = Date.now() - timeElapsed * 1000;
          await sound.playAsync();
          setIsPlaying(true);
          startTimer();
          console.log("Audio resumed");
        } catch (error) {
          console.error("Error resuming audio playback:", error);
          setIsPlaying(false);
          stopTimer();
          Alert.alert(
            "Playback Error",
            "Could not resume playback. Please try again."
          );
        }
      }
    }
  }

  const seekToPosition = async (position: number) => {
    if (!sound) {
      console.warn("Seek attempted but sound is not loaded.");
      return;
    }

    // Prevent seeking if duration is unknown
    if (duration <= 0) {
      console.warn("Seek attempted but duration is unknown or zero.");
      return;
    }

    try {
      setIsSeekingAudio(true);
      const seekPosition = Math.max(
        0,
        Math.min(Math.floor(position), duration)
      );

      console.log(`Seeking to position: ${seekPosition}s`);

      // Update UI immediately for responsiveness
      setTimeElapsed(seekPosition);

      await sound.setPositionAsync(seekPosition * 1000);

      // Verify the position after seeking
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        const actualPosition = Math.floor(status.positionMillis / 1000);
        setTimeElapsed(actualPosition);
        console.log(`Seek completed, actual position: ${actualPosition}s`);
      } else {
        console.warn(
          "Could not verify position after seek, status not loaded."
        );
      }

      // Update the reference start time for the timer
      startTimeRef.current = Date.now() - seekPosition * 1000;

      if (isPlaying) {
        stopTimer();
        startTimer();
      }
    } catch (error) {
      console.error("Error during seek operation:", error);
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
        // handleEndSession();
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

  // Define structure for streak info
  interface StreakInfo {
    lastSessionDate: string | null; // ISO Date string (YYYY-MM-DD)
    currentStreak: number;
  }

  // Session management
  async function saveSession(duration: number, rating?: number) {
    const session: MeditationSession = {
      id: Date.now(),
      meditationId: String(id),
      duration, // Duration in seconds
      rating: rating || 0,
      timestamp: new Date().toISOString(),
    };

    try {
      let sessions = await getSecureItem<MeditationSession[]>(
        "meditation_sessions"
      );
      if (!sessions || !Array.isArray(sessions)) {
        sessions = [];
      }
      const updatedSessions = [...sessions, session];
      await setSecureItem("meditation_sessions", updatedSessions);

      // Update Aggregate Stats
      try {
        const currentTotalSessions = await getTotalMeditationSessions(); // Uses the new optimized getter
        const currentTotalMinutes = await getTotalMeditationMinutes(); // Uses the new optimized getter
        const currentStreakInfo = await getSecureItem<StreakInfo>("stats_streakInfo");

        // Update totals
        await setSecureItem("stats_totalSessions", currentTotalSessions + 1);
        await setSecureItem("stats_totalMinutes", currentTotalMinutes + Math.round(duration / 60));

        // Update streak
        const today = new Date();
        const todayDateString = today.toISOString().split("T")[0]; // YYYY-MM-DD

        let newStreak = 1;
        if (currentStreakInfo?.lastSessionDate) {
          const lastDate = new Date(currentStreakInfo.lastSessionDate);
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);
          const yesterdayDateString = yesterday.toISOString().split("T")[0];

          if (currentStreakInfo.lastSessionDate === todayDateString) {
            // Multiple sessions on the same day don't increase streak beyond 1 for that day
            newStreak = currentStreakInfo.currentStreak;
          } else if (currentStreakInfo.lastSessionDate === yesterdayDateString) {
            // Session yesterday, continue streak
            newStreak = currentStreakInfo.currentStreak + 1;
          }
          // Else: Gap day, streak resets to 1 (already default)
        }

        const newStreakInfo: StreakInfo = {
          lastSessionDate: todayDateString,
          currentStreak: newStreak,
        };
        await setSecureItem("stats_streakInfo", newStreakInfo);

      } catch (statsError) {
        console.error("Failed to update aggregate statistics:", statsError);
        // Non-fatal, session was saved, but stats might be inaccurate
      }
    } catch (error) {
      console.error("Failed to save meditation session:", error);
      Alert.alert(
        "Save Failed",
        "Unfortunately, your meditation session could not be saved. Please try again later if needed."
      );
    }
  }

  async function handleEndSession() {
    const currentSound = sound;
    if (currentSound) {
      try {
        stopTimer();
        setIsPlaying(false);
      } catch (error) {
        console.error("Error stopping audio in handleEndSession:", error);
      }
    }
    setShowRatingPanel(true);
  }

  async function handleRating(rating: number) {
    saveSession(timeElapsed, rating); // Save before cleanup
    setIsPlaying(false);
    setTimeElapsed(0);
    setShowRatingPanel(false);

    const currentSound = sound;
    if (currentSound) {
      try {
        await cleanupAudio(currentSound);
        setSound(null);
      } catch (error) {
        console.error("Error cleaning up audio in handleRating:", error);
        setSound(null); // Ensure sound is nullified even on error
      }
    }
    router.back();
  }

  async function skipRating() {
    saveSession(timeElapsed); // Save before cleanup
    setIsPlaying(false);
    setTimeElapsed(0);
    setShowRatingPanel(false);

    const currentSound = sound;
    if (currentSound) {
      try {
        await cleanupAudio(currentSound);
        setSound(null);
      } catch (error) {
        console.error("Error cleaning up audio in skipRating:", error);
        setSound(null); // Ensure sound is nullified even on error
      }
    }
    router.back();
  }

  // Favorites handling
  const checkFavoriteStatus = async () => {
    try {
      const favorites = await getSecureItem<string[]>("favorite_meditations");
      if (favorites && Array.isArray(favorites)) {
        setIsFavorite(favorites.includes(String(id)));
      } else {
        setIsFavorite(false);
      }
    } catch (error) {
      console.error("Failed to check favorite status:", error);
      // Silent failure in UI
    }
  };

  async function toggleFavorite() {
    const currentId = String(id);

    try {
      let favorites = await getSecureItem<string[]>("favorite_meditations");
      if (!Array.isArray(favorites)) {
        favorites = [];
      }

      let updatedFavorites;
      const currentlyIsFavorite = favorites.includes(currentId);

      if (currentlyIsFavorite) {
        updatedFavorites = favorites.filter((favId) => favId !== currentId);
      } else {
        // Add to favorites
        updatedFavorites = [...favorites, currentId];
      }

      // Save updated favorites with secure storage
      await setSecureItem("favorite_meditations", updatedFavorites);

      setIsFavorite(!currentlyIsFavorite);
    } catch (error) {
      console.error("Failed to update favorites:", error);
      Alert.alert(
        "Update Failed",
        "Could not update your favorites at this time. Please try again."
      );
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
    if (meditationsData[meditationId]) {
      const info = meditationsData[meditationId];
      setMeditationInfo(info);
      setDuration(info.duration);
    }

    checkFavoriteStatus();
    startBreathingAnimation();
    initializeAudio();

    return () => {
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
