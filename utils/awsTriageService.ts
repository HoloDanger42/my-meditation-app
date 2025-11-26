export type TriageResult = {
  summary: string;
  urgency: "High" | "Medium" | "Low";
  category: string;
  suggested_action: string;
};

export async function processTriageAudio(
  audioUri: string
): Promise<TriageResult> {
  // Simulated AWS Transcribe + Bedrock pipeline
  await new Promise((r) => setTimeout(r, 800));
  return {
    summary:
      "User reports difficulty breathing and chest tightness starting 30 minutes ago.",
    urgency: "High",
    category: "Respiratory",
    suggested_action:
      "Initiate emergency protocol and connect to a specialist.",
  };
}
