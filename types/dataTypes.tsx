import { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";

// Define a specific type for Ionicons names
export type IoniconsName = ComponentProps<typeof Ionicons>["name"];

export interface MoodEntry {
  id: number;
  mood: {
    id: number;
    name: string;
    icon: IoniconsName;
    color: string;
  };
  intensity: number;
  notes: string;
  timestamp: string;
}

export interface MeditationSession {
  id: number;
  meditationId: string;
  duration: number;
  rating?: number;
  timestamp: string;
}

// Define the structure for meditation content
export interface Meditation {
  id: string;
  title: string;
  description: string;
  audio: any; // Consider defining a more specific type if possible
  duration: number;
  category: string[];
  imageUrl?: string; // Optional image URL
  personalizedMessage?: string; // Optional personalized message
}

export interface JournalEntry {
  id: number;
  title: string;
  content: string;
  mood: MoodEntry["mood"] | null; // Use the mood part of MoodEntry
  timestamp: string;
  relatedSessionId?: number | null;
}

export interface Recommendations {
  recommendedMeditations: Meditation[];
  moodInsights: string;
  journalPrompts: string[];
}
