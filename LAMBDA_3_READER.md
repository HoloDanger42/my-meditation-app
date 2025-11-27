# Lambda #3: The Reader (Polling Endpoint)

**Purpose:** Safety net for retrieving triage results when Agora RTM fails or for debugging.

**Handler:** `get-result.mjs` (Node.js 20+ ESM)

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const dynamoClient = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  try {
    // Parse query parameters (Lambda Function URL format)
    const params = event.queryStringParameters || {};
    const userId = params.userId;
    const sessionId = params.sessionId;

    if (!userId || !sessionId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Missing userId or sessionId" }),
      };
    }

    console.log(`Fetching result for USER#${userId} / SESSION#${sessionId}`);

    // Query DynamoDB
    const response = await docClient.send(
      new GetCommand({
        TableName: process.env.TABLE_NAME || "TriageSessions",
        Key: {
          PK: `USER#${userId}`,
          SK: `SESSION#${sessionId}`,
        },
      })
    );

    if (!response.Item) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          status: "not_found",
          message: "Session not found or access denied",
        }),
      };
    }

    // Return result
    const item = response.Item;
    const status = item.status || "unknown";
    
    // Parse result if it exists (stored as JSON string)
    let result = null;
    if (item.result) {
      try {
        result = typeof item.result === 'string' ? JSON.parse(item.result) : item.result;
      } catch (e) {
        console.error("Failed to parse result JSON:", e);
        result = item.result;
      }
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({
        status,
        result,
        transcript: item.transcript,
        sessionId: item.sessionId,
        userId: item.userId,
        createdAt: item.createdAt,
        completedAt: item.completedAt,
      }),
    };
  } catch (error) {
    console.error("Error fetching result:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        error: "Internal server error",
        message: error.message,
      }),
    };
  }
};
```

---

## Deployment Steps (AWS Console)

### 1. Create Lambda Function
- **Name:** `ChanseyResultReader`
- **Runtime:** Node.js 20.x
- **Architecture:** arm64 (cheaper)
- **Execution Role:** Create new role with DynamoDB read permissions

### 2. Add Code
- Copy the code above into the Lambda editor (index.mjs)
- Click **Deploy**

### 3. Configure Environment Variables
- `TABLE_NAME` = `TriageSessions`

### 4. Set IAM Permissions
Add this policy to the execution role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:*:table/TriageSessions"
    }
  ]
}
```

### 5. Enable Function URL
- Go to **Configuration** → **Function URL**
- Click **Create function URL**
- Auth type: **NONE** (CORS enabled)
- Click **Save**
- Copy the Function URL: `https://xxxxxx.lambda-url.us-east-1.on.aws/`

---

## Test with curl

```bash
# Test with your actual userId and sessionId
curl "https://YOUR-FUNCTION-URL.lambda-url.us-east-1.on.aws/?userId=user123&sessionId=session-40fa84fc-32c5-4f32-a70f-afce9991c400"
```

Expected response:
```json
{
  "status": "completed",
  "result": {
    "summary": "Patient experiencing severe unilateral headache...",
    "urgency": "High",
    "category": "Neurology",
    "action": "Go to ER",
    "reasoning": "..."
  },
  "transcript": "I have a severe headache...",
  "sessionId": "session-40fa84fc-32c5-4f32-a70f-afce9991c400",
  "userId": "user123",
  "createdAt": "2025-11-27T05:14:45.058Z",
  "completedAt": "2025-11-27T05:21:43.436Z"
}
```

---

## Client-Side Integration (Fallback Polling)

```typescript
// utils/awsTriageService.ts - Add to existing file

export async function pollForResults(
  sessionId: string,
  userId: string,
  maxAttempts = 30,
  intervalMs = 2000
): Promise<TriageResult | null> {
  const readerUrl = process.env.EXPO_PUBLIC_READER_ENDPOINT; // Lambda #3 Function URL
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(
        `${readerUrl}?userId=${userId}&sessionId=${sessionId}`
      );
      
      if (!response.ok) {
        console.warn(`Poll attempt ${i + 1} failed: ${response.status}`);
        await new Promise(r => setTimeout(r, intervalMs));
        continue;
      }
      
      const data = await response.json();
      
      if (data.status === 'completed' && data.result) {
        return data.result;
      }
      
      if (data.status === 'failed') {
        throw new Error('Triage processing failed on backend');
      }
      
      console.log(`Poll ${i + 1}: status = ${data.status}`);
      await new Promise(r => setTimeout(r, intervalMs));
    } catch (error) {
      console.error(`Poll error:`, error);
      await new Promise(r => setTimeout(r, intervalMs));
    }
  }
  
  throw new Error('Triage result timeout after 60 seconds');
}
```

---

## Add to .env

```bash
EXPO_PUBLIC_READER_ENDPOINT=https://YOUR-FUNCTION-URL.lambda-url.us-east-1.on.aws/
```

---

## Role in Architecture

**Primary Flow (with Agora RTM):**
```
Phone → S3 → Lambda #2 → Bedrock → Agora RTM → Phone (instant)
```

**Fallback Flow (if RTM fails):**
```
Phone → S3 → Lambda #2 → Bedrock → DynamoDB
Phone polls Lambda #3 every 2s → gets result
```

**Demo Day Guarantee:**
- Even if WiFi drops Agora connection, polling still works
- Judges see result within 2-4 seconds (acceptable)
- You can demo both: "Real-time via RTM, with polling fallback"

---

## Estimated Deployment Time: 5 minutes

1. Create Lambda (2 min)
2. Enable Function URL (1 min)
3. Test with curl (1 min)
4. Update app .env (30 sec)

**Next:** Agora RTM integration for the "Wow Factor"
