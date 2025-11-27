import { getAuth } from "@react-native-firebase/auth";

export type TriageResult = {
  summary: string;
  urgency: "High" | "Medium" | "Low";
  category: string;
  specialist: string;
  suggested_action: string;
};

/**
 * SECURE ARCHITECTURE:
 * 1. Get Firebase ID token (proves user identity)
 * 2. Call your backend API (Lambda/Cloud Function)
 * 3. Backend validates token + generates presigned S3 URL
 * 4. Upload audio to S3 with presigned URL
 * 5. Backend processes via EventBridge/S3 trigger
 *
 * NEVER embed AWS credentials in the app!
 */

const API_ENDPOINT =
  process.env.EXPO_PUBLIC_API_ENDPOINT ||
  "https://your-api.execute-api.us-east-1.amazonaws.com";

const READER_ENDPOINT =
  process.env.EXPO_PUBLIC_READER_ENDPOINT ||
  "https://your-reader.lambda-url.us-east-1.on.aws";

interface PresignedUploadResponse {
  uploadUrl: string;
  key: string; // S3 object key for tracking
  sessionId: string;
}

interface TranscriptionResult {
  transcriptionJobName: string;
  status: "IN_PROGRESS" | "COMPLETED" | "FAILED";
}

/**
 * Step 1: Request a presigned URL from your secure backend
 * Backend holds the AWS credentials, not the app
 *
 * HACKATHON MODE: Using "Gentleman's Security"
 * - Sending userId in body (no Firebase token validation)
 * - Production would validate Firebase ID token on backend
 */
async function getPresignedUploadUrl(
  userId: string,
  fileExtension: string
): Promise<PresignedUploadResponse> {
  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      fileExtension,
      timestamp: Date.now(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get upload URL: ${response.status}`);
  }

  return response.json();
}

/**
 * Step 2: Upload the audio file to S3 using the presigned URL
 * Uses proper Content-Type for Transcribe compatibility
 */
async function uploadAudioToS3(
  presignedUrl: string,
  audioUri: string,
  contentType: string
): Promise<void> {
  // Read the file as a blob
  const response = await fetch(audioUri);
  const blob = await response.blob();

  const uploadResponse = await fetch(presignedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body: blob,
  });

  if (!uploadResponse.ok) {
    throw new Error(`Upload failed: ${uploadResponse.status}`);
  }
}

/**
 * Step 3: Poll for results or wait for Agora RTM message
 *
 * IMPLEMENTATION OPTIONS:
 *
 * A) Polling (Current - Works for hackathon):
 *    - Client polls ChanseyReader (Lambda #3) every 2 seconds
 *    - Simple, no extra dependencies
 *    - ~4-10 second total latency (acceptable for demo)
 *
 * B) Agora RTM Push (Day 2 - Real-time):
 *    - Backend pushes result via Agora RTM
 *    - Client receives message instantly
 *    - <3 second total latency (40% judging criteria!)
 *    - See utils/agoraRTM.ts for integration
 */
async function pollForResults(
  userId: string,
  sessionId: string,
  maxAttempts = 30,
  intervalMs = 2000
): Promise<TriageResult> {
  console.log(`Starting poll for session ${sessionId}...`);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(
        `${READER_ENDPOINT}?userId=${userId}&sessionId=${sessionId}`
      );

      if (!response.ok) {
        console.warn(`Poll attempt ${attempt + 1} failed: ${response.status}`);
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
        continue;
      }

      const data = await response.json();
      console.log(`Poll attempt ${attempt + 1}: status = ${data.status}`);

      if (data.status === "completed" && (data.result || data.data)) {
        // Lambda #3 returns "data" field, not "result"
        const rawResult = data.result || data.data;
        console.log("✅ Triage result received:", rawResult);
        
        // Parse result if it's a JSON string
        let result = rawResult;
        if (typeof result === 'string') {
          try {
            result = JSON.parse(result);
          } catch (e) {
            console.error('Failed to parse result JSON:', e);
          }
        }
        
        // Map Lambda #3 format to app's TriageResult format
        const mappedResult: TriageResult = {
          summary: result.clinical_summary?.symptoms || result.summary || "Symptoms analyzed",
          urgency: result.risk_assessment?.urgency_label?.includes("High") ? "High" 
                 : result.risk_assessment?.urgency_label?.includes("Medium") ? "Medium"
                 : result.urgency || "Low",
          category: result.clinical_summary?.category || result.category || "General",
          specialist: result.clinical_summary?.specialist_label || result.specialist || "General Practitioner",
          suggested_action: result.suggested_actions?.[0] || result.suggested_action || "Seek medical advice",
        };
        
        return mappedResult;
      }

      if (data.status === "failed") {
        throw new Error("Triage processing failed on backend");
      }

      // Wait before next attempt
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    } catch (error) {
      console.error(`Poll error on attempt ${attempt + 1}:`, error);
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  throw new Error(`Triage result timeout after ${maxAttempts * intervalMs / 1000} seconds`);
}

/**
 * Step 3B: Listen for Agora RTM result (Alternative to polling)
 *
 * USAGE (Day 2 implementation):
 *
 * import { agoraRTMClient } from '../utils/agoraRTM';
 *
 * // Replace pollForResults() with:
 * const result = await new Promise<TriageResult>((resolve, reject) => {
 *   const timeout = setTimeout(() => reject(new Error("Timeout")), 30000);
 *
 *   agoraRTMClient.on('MessageFromPeer', (message, peerId) => {
 *     if (message.text.includes(sessionId)) {
 *       clearTimeout(timeout);
 *       const result = JSON.parse(message.text);
 *       resolve(result.data);
 *     }
 *   });
 * });
 *
 * Backend Lambda must send via Agora SDK:
 * await agoraClient.sendMessageToPeer(
 *   { text: JSON.stringify({ sessionId, data: triageResult }) },
 *   userId
 * );
 */

/**
 * Main entry point: Secure end-to-end triage processing
 *
 * Audio Format Handling:
 * - Expo Audio on Android outputs: .m4a (AAC) or .3gp
 * - AWS Transcribe accepts: FLAC, MP3, MP4, Ogg, WebM, AMR, WAV
 * - We detect format and set correct Content-Type
 */
export async function processTriageAudio(
  audioUri: string
): Promise<TriageResult> {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User must be authenticated for triage");
  }

  try {
    // Detect audio format from URI
    const fileExtension = audioUri.split(".").pop()?.toLowerCase() || "m4a";
    const contentTypeMap: Record<string, string> = {
      m4a: "audio/mp4",
      mp4: "audio/mp4",
      mp3: "audio/mpeg",
      wav: "audio/wav",
      "3gp": "audio/3gpp",
      ogg: "audio/ogg",
      flac: "audio/flac",
    };

    const contentType = contentTypeMap[fileExtension] || "audio/mp4";

    // Step 1: Get presigned URL with session metadata
    const { uploadUrl, key, sessionId } = await getPresignedUploadUrl(
      user.uid,
      fileExtension
    );

    // Step 2: Upload to S3
    await uploadAudioToS3(uploadUrl, audioUri, contentType);

    // Step 3: Poll for results (backend processes via Lambda)
    const result = await pollForResults(user.uid, sessionId);

    return result;
  } catch (error) {
    console.error("Triage processing failed:", error);

    // Fallback: Mock result for development
    if (__DEV__) {
      await new Promise((r) => setTimeout(r, 2000));
      return {
        summary: "[DEV MODE] Simulated triage result",
        urgency: "Medium",
        category: "General",
        specialist: "General Practitioner",
        suggested_action: "Schedule appointment within 24 hours.",
      };
    }

    throw error;
  }
}

/**
 * BACKEND IMPLEMENTATION CHECKLIST:
 *
 * 1. Lambda Function: POST /triage/presigned-upload
 *    - Validate Firebase ID token
 *    - Generate unique sessionId (UUID)
 *    - Create S3 key: triage-recordings/{userId}/{sessionId}.{ext}
 *    - Generate presigned PUT URL (5 min expiry)
 *    - Store metadata in DynamoDB: { sessionId, userId, timestamp, status: "pending" }
 *    - Return { uploadUrl, key, sessionId }
 *
 * 2. S3 Event Trigger → Lambda: Process Upload
 *    - Extract userId/sessionId from S3 key
 *    - Start AWS Transcribe job with medical vocabulary
 *    - Update DynamoDB: status = "transcribing"
 *
 * 3. EventBridge Rule → Lambda: On Transcribe Complete
 *    - Fetch transcript from S3
 *    - Call AWS Bedrock (Claude) with medical triage prompt
 *    - Parse urgency/category/specialist from LLM response
 *    - Update DynamoDB: status = "completed", result = {...}
 *    - Optionally: Send push notification via FCM
 *
 * 4. Lambda Function: GET /triage/result/{sessionId}
 *    - Validate Firebase ID token
 *    - Query DynamoDB for sessionId
 *    - Verify userId matches token
 *    - Return { status, data }
 *
 * SECURITY NOTES:
 * - S3 bucket must have public access BLOCKED
 * - Presigned URLs expire after 5 minutes
 * - All API calls require valid Firebase ID token
 * - DynamoDB has userId as partition key (data isolation)
 * - CloudWatch logs for audit trail
 */
