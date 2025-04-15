export interface MoodEntry {
  id: number;
  mood: {
    id: number;
    name: string;
    icon: string;
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
