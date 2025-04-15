export interface Meditation {
  id: string;
  title: string;
  description: string;
  audio: any; // Could be a require statement or URL
  duration: number;
  category: string[];
}

// Combined meditation data with categories for recommendations
export const meditationsData: { [key: string]: Meditation } = {
  "1": {
    id: "1",
    title: "Calm Mind",
    description: "Reduce anxiety and find peace",
    audio: require("../assets/audio/calm.mp3"),
    duration: 180, // 3 minutes
    category: ["anxiety", "breathing", "beginner"],
  },
  "2": {
    id: "2",
    title: "Relaxing Breath",
    description: "Slow breathing for relaxation",
    audio: require("../assets/audio/relaxing_breath.mp3"),
    duration: 300, // 5 minutes
    category: ["stress", "breathing", "intermediate"],
  },
  "3": {
    id: "3",
    title: "Gentle Sleep",
    description: "Prepare your mind for restful sleep",
    audio: require("../assets/audio/gentle_sleep.mp3"),
    duration: 600, // 10 minutes
    category: ["sleep", "relaxation", "evening"],
  },
  "breathing-calm": {
    id: "breathing-calm",
    title: "Calming Breath Work",
    description: "A gentle breathing meditation to calm anxiety",
    audio: require("../assets/audio/calm.mp3"), // Use appropriate audio file
    duration: 300,
    category: ["anxiety", "breathing", "beginner"],
  },
  "body-scan": {
    id: "body-scan",
    title: "Full Body Scan",
    description: "Release tension throughout your body",
    audio: require("../assets/audio/relaxing_breath.mp3"), // Use appropriate audio file
    duration: 600,
    category: ["stress", "body", "intermediate"],
  },
};
