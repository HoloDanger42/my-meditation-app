# Step 1: The "Brain" Connection 🧠

**Goal:** When you press the button on the phone, the diagnosis card appears after processing.

---

## Current Status

✅ **Lambda #1 (Presigned Upload)** - Deployed  
✅ **Lambda #2 (S3 → GHOST_EAR → Bedrock)** - Deployed  
⏳ **Lambda #3 (Result Reader)** - Deploy now  
⏳ **App Polling Loop** - Wire up now

---

## Deploy Lambda #3 (The Reader)

### 1. Create Function in AWS Console

1. AWS Console → Lambda → **Create function**
2. Function name: `ChanseyResultReader`
3. Runtime: **Node.js 20.x**
4. Architecture: **arm64**
5. Click **Create function**

### 2. Add Code

Copy this code into the editor (replace all content):

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const dynamoClient = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  try {
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
          message: "Session not found",
        }),
      };
    }

    const item = response.Item;
    const status = item.status || "unknown";
    
    let result = null;
    if (item.result) {
      try {
        result = typeof item.result === 'string' ? JSON.parse(item.result) : item.result;
      } catch (e) {
        result = item.result;
      }
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
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
    console.error("Error:", error);
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

3. Click **Deploy**

### 3. Add Environment Variable

1. Go to **Configuration** → **Environment variables**
2. Click **Edit** → **Add environment variable**
3. Key: `TABLE_NAME`
4. Value: `TriageSessions`
5. Click **Save**

### 4. Add DynamoDB Permission

1. Go to **Configuration** → **Permissions**
2. Click the **Role name** (opens IAM in new tab)
3. Click **Add permissions** → **Attach policies**
4. Search for: `AmazonDynamoDBReadOnlyAccess`
5. Select it → **Add permissions**

### 5. Enable Function URL

1. Go to **Configuration** → **Function URL**
2. Click **Create function URL**
3. Auth type: **NONE**
4. Check **Configure CORS**
5. Click **Save**
6. **Copy the Function URL** (looks like: `https://abc123xyz.lambda-url.us-east-1.on.aws/`)

### 6. Test with PowerShell

```powershell
# Replace with your actual values
$readerUrl = "https://YOUR-READER-URL.lambda-url.us-east-1.on.aws"
$userId = "user123"
$sessionId = "session-40fa84fc-32c5-4f32-a70f-afce9991c400"

curl "$readerUrl`?userId=$userId&sessionId=$sessionId"
```

Expected output:
```json
{
  "status": "completed",
  "result": {
    "summary": "Patient experiencing severe unilateral headache...",
    "urgency": "High",
    "category": "Neurology",
    "action": "Go to ER"
  },
  "sessionId": "session-40fa84fc-32c5-4f32-a70f-afce9991c400"
}
```

---

## Wire Up App Polling

### 1. Create `.env` file

```bash
# Copy the example
cp .env.example .env
```

Edit `.env`:
```bash
# Lambda #1 (already deployed)
EXPO_PUBLIC_API_ENDPOINT=https://YOUR-SIGNER-URL.lambda-url.us-east-1.on.aws

# Lambda #3 (just deployed)
EXPO_PUBLIC_READER_ENDPOINT=https://YOUR-READER-URL.lambda-url.us-east-1.on.aws
```

### 2. Restart Expo

```bash
# Stop current dev server (Ctrl+C)
npx expo start --clear
```

### 3. Test End-to-End

1. Open app on phone
2. Tap **Triage** tab
3. Press and hold the microphone button
4. Speak: "I have a severe headache and feel nauseous"
5. Release button
6. Watch for:
   - Status changes to "Processing..."
   - After 4-8 seconds, diagnosis card appears
   - Urgency level shown (High/Medium/Low)
   - Specialist recommendation displayed

### 4. Debug if Card Doesn't Appear

Open Expo console and check for:

```
Starting poll for session session-xyz123...
Poll attempt 1: status = pending_upload
Poll attempt 2: status = completed
✅ Triage result received: { summary: "...", urgency: "High" }
```

If you see errors:
- Check Lambda #3 CloudWatch logs
- Verify DynamoDB has the session record with `status: "completed"`
- Confirm `.env` URLs are correct

---

## Success Criteria

✅ Press button → record audio → diagnosis appears on phone  
✅ High urgency cases show red card  
✅ Polling completes within 10 seconds

---

## Next: Step 2 - Web Team Data Supply

Give your Web Team the Lambda #3 URL:
```
https://YOUR-READER-URL.lambda-url.us-east-1.on.aws/?userId=USER_ID&sessionId=SESSION_ID
```

They can fetch patient status and display diagnosis on the doctor dashboard.

---

## Next: Step 3 - Agora RTM Integration

Once polling works, we'll add real-time push (< 3 second latency) for the 40% judging criteria.
