import { Meditation } from "../types/dataTypes";

// Combined meditation data with categories for recommendations
export const meditationsData: { [key: string]: Meditation } = {
  "1": {
    id: "1",
    title: "Calm Mind",
    description: "Reduce anxiety and find peace",
    audio: require("../assets/audio/calm.mp3"),
    duration: 180, // 3 minutes
    category: ["calm", "peaceful", "happy"],
  },
  "2": {
    id: "2",
    title: "Relaxing Breath",
    description: "Slow breathing for relaxation",
    audio: require("../assets/audio/relaxing_breath.mp3"),
    duration: 180, // 5 minutes
    category: ["happy", "relaxing", "ambient"],
  },
  "3": {
    id: "3",
    title: "Gentle Sleep",
    description: "Prepare your mind for restful sleep",
    audio: require("../assets/audio/gentle_sleep.mp3"),
    duration: 180, // 10 minutes
    category: ["sleep", "ambient", "happy"],
  },
};
