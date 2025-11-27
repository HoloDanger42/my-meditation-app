export function getTriageColors(theme: any, highContrast: boolean) {
  if (highContrast) {
    return {
      bg: "#000000",
      text: "#FFD400",
      button: "#FFD400",
      buttonText: "#000000",
      border: "#FFD400",
      card: "#111",
      subtle: "#333",
    };
  }

  return {
    bg: theme.background,
    text: theme.text,
    button: theme.accent,
    buttonText: "#FFFFFF",
    border: theme.cardBorder,
    card: theme.card,
    subtle: theme.text + "30", // 30% opacity
  };
}
