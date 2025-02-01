import { View, Text, StyleSheet, Button } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { useState, useEffect } from "react";
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function MeditationPlayerScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(
    null
  );

  const audioMapping: { [key: string]: any } = {
    "1": require("../../assets/audio/calm.mp3"),
    "2": require("../../assets/audio/relaxing_breath.mp3"),
    "3": require("../../assets/audio/gentle_sleep.mp3"),
  };

  async function loadAudio() {
    const meditationId = Array.isArray(id) ? id[0] : id;
    const audioFile =
      audioMapping[meditationId] ||
      require("../../assets/audio/meditation.mp3");
    const { sound } = await Audio.Sound.createAsync(audioFile, {
      shouldPlay: true,
    });
    setSound(sound);
    setIsPlaying(true);
    startTimer();
  }

  function startTimer() {
    const interval = setInterval(() => {
      setTimeElapsed((prevTime) => prevTime + 1);
    }, 1000);
    setTimerInterval(interval);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
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

  async function saveSession(duration: number) {
    const session = {
      id: Date.now(),
      meditationId: id,
      duration,
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
    await saveSession(timeElapsed);
    setIsPlaying(false);
    setTimeElapsed(0);
    router.back();
  }

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      stopTimer();
    };
  }, [sound]);

  function formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes < 10 ? "0" : ""}${minutes}:${
      secs < 10 ? "0" : ""
    }${secs}`;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Meditation Player</Text>
      <Text style={styles.description}>Meditation ID: {id}</Text>
      <Text style={styles.description}>Time: {formatTime(timeElapsed)}</Text>
      <View style={styles.buttonContainer}>
        <Button
          title={isPlaying ? "Pause" : "Play"}
          onPress={handlePlayPause}
        />
      </View>
      <View style={styles.buttonContainer}>
        <Button title="End Session" onPress={handleEndSession} />
      </View>
      <View style={styles.buttonContainer}>
        <Button title="Go Back" onPress={() => router.back()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    marginBottom: 20,
  },
  timer: {
    fontSize: 18,
    marginBottom: 20,
  },
  buttonContainer: {
    marginVertical: 10,
    width: "80%",
  },
});
