import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AccessibilityInfo } from "react-native";
import * as Haptics from "expo-haptics";
import {
  useAudioRecorder,
  RecordingPresets,
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
} from "expo-audio";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { processTriageAudio } from "../utils/awsTriageService";

export type TriageResult = {
  summary: string;
  urgency: "High" | "Medium" | "Low";
  category: string;
  specialist: string;
  suggested_action: string;
};

type TriageStatus = "idle" | "recording" | "processing";

export function useTriageRecorder() {
  const audioRecorder = useAudioRecorder(
    RecordingPresets.HIGH_QUALITY
  );

  const [status, setStatus] = useState<TriageStatus>("idle");
  const [lastResult, setLastResult] = useState<TriageResult | null>(null);
  const isMounted = useRef(true);
  const isRecordingRef = useRef(false);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (audioRecorder.isRecording) {
        audioRecorder.stop().catch(() => {});
      }
    };
  }, [audioRecorder]);

  const ensurePermissions = useCallback(async () => {
    const { status } = await getRecordingPermissionsAsync();
    if (status !== "granted") {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert(
          "Microphone Access",
          "Microphone permission is required for triage."
        );
        return false;
      }
    }
    return true;
  }, []);

  const startRecording = useCallback(() => {
    if (isRecordingRef.current || status !== "idle") {
      return;
    }

    (async () => {
      const ok = await ensurePermissions();
      if (!ok) return;

      try {
        isRecordingRef.current = true;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        try {
          await audioRecorder.prepareToRecordAsync();
        } catch (prepError) {
          // Prepare not needed or failed - continue anyway
        }

        audioRecorder.record();
        await new Promise((resolve) => setTimeout(resolve, 300));

        if (audioRecorder.isRecording) {
          setStatus("recording");
          AccessibilityInfo.announceForAccessibility(
            "Recording started. Release to stop."
          );
        } else {
          console.error("Recording failed to start");
          isRecordingRef.current = false;
        }
      } catch (e) {
        console.error("Failed to start recording:", e);
        isRecordingRef.current = false;
        setStatus("idle");
        const errorMessage =
          e instanceof Error ? e.message : "Unknown error occurred";
        Alert.alert(
          "Recording Error",
          `Could not start recording: ${errorMessage}`
        );
      }
    })();
  }, [ensurePermissions, audioRecorder, status]);

  const stopRecording = useCallback(() => {
    if (!isRecordingRef.current) {
      return;
    }

    (async () => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        let uri: string | null = null;

        if (audioRecorder.isRecording) {
          AccessibilityInfo.announceForAccessibility(
            "Recording stopped. Processing."
          );
          await audioRecorder.stop();
          await new Promise((resolve) => setTimeout(resolve, 200));
          uri = audioRecorder.uri;
        }

        isRecordingRef.current = false;

        if (!uri || typeof uri !== "string") {
          setStatus("idle");
          Alert.alert(
            "Recording Issue",
            "No audio file created. Please try holding the button for at least 1 second."
          );
          return;
        }

        setStatus("processing");

        try {
          const result = await processTriageAudio(uri);

          if (!isMounted.current) return;

          setStatus("idle");
          setLastResult(result);

          AccessibilityInfo.announceForAccessibility(
            `Triage complete. ${result.urgency} urgency. Routed to ${result.specialist}.`
          );
        } catch (err) {
          console.error("Processing error:", err);
          const item = {
            id: `triage_${Date.now()}`,
            type: "audio_recording",
            uri,
            createdAt: new Date().toISOString(),
            status: "pending_upload",
          };
          await AsyncStorage.setItem(item.id, JSON.stringify(item));
          if (isMounted.current) {
            setStatus("idle");
            Alert.alert("Offline", "Network issue. Saved locally for sync.");
          }
        }
      } catch (e) {
        console.error("Failed to stop recording", e);
        isRecordingRef.current = false;
        if (isMounted.current) {
          setStatus("idle");
        }
      }
    })();
  }, [audioRecorder]);

  return {
    status,
    lastResult,
    startRecording,
    stopRecording,
  };
}
