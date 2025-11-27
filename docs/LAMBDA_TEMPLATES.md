# AWS Lambda Quick Start Templates

Copy these to your Lambda functions. Deploy via AWS Console, SAM, CDK, or Terraform.

## 🔧 Prerequisites

```bash
npm init -y
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @aws-sdk/client-dynamodb firebase-admin
```

## Lambda #1: Generate Presigned URL

**Handler:** `presigned-upload.js`

```javascript
const { S3Client } = require("@aws-sdk/client-s3");
const { createPresignedPost } = require("@aws-sdk/s3-presigned-post");
const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const admin = require("firebase-admin");

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

const s3Client = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });

exports.handler = async (event) => {
  try {
    // 1. Extract and validate Firebase token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader) {
      return { statusCode: 401, body: JSON.stringify({ error: "Missing authorization" }) };
    }

    const token = authHeader.replace(/Bearer /i, "");
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userId = decodedToken.uid;

    // 2. Parse request body
    const body = JSON.parse(event.body || "{}");
    const fileExtension = body.fileExtension || "m4a";

    // 3. Generate unique session ID
    const sessionId = `session-${crypto.randomUUID()}`;
    const timestamp = Date.now();
    const s3Key = `${userId}/${sessionId}.${fileExtension}`;

    // 4. Create presigned POST URL (allows direct upload from client)
    const { url, fields } = await createPresignedPost(s3Client, {
      Bucket: process.env.S3_BUCKET_NAME || "triage-recordings",
      Key: s3Key,
      Conditions: [
        ["content-length-range", 0, 10485760], // Max 10MB
        ["starts-with", "$Content-Type", "audio/"],
      ],
      Fields: {
        "x-amz-meta-user-id": userId,
        "x-amz-meta-session-id": sessionId,
        "x-amz-meta-timestamp": timestamp.toString(),
      },
      Expires: 300, // 5 minutes
    });

    // 5. Store session metadata in DynamoDB
    await dynamoClient.send(
      new PutItemCommand({
        TableName: process.env.DYNAMODB_TABLE || "TriageSessions",
        Item: {
          PK: { S: `USER#${userId}` },
          SK: { S: `SESSION#${sessionId}` },
          sessionId: { S: sessionId },
          userId: { S: userId },
          s3Key: { S: s3Key },
          status: { S: "pending_upload" },
          createdAt: { S: new Date().toISOString() },
          expiresAt: { N: Math.floor(timestamp / 1000 + 2592000).toString() }, // 30 days TTL
        },
      })
    );

    // 6. Return presigned URL details
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // Adjust for production
      },
      body: JSON.stringify({
        uploadUrl: url,
        fields, // Client must include these in FormData
        key: s3Key,
        sessionId,
      }),
    };
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to generate upload URL",
        message: error.message,
      }),
    };
  }
};
```

**Environment Variables:**
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (Store in AWS Secrets Manager!)
- `S3_BUCKET_NAME` = `triage-recordings`
- `DYNAMODB_TABLE` = `TriageSessions`
- `AWS_REGION` = `us-east-1`

**IAM Role Permissions:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl"
      ],
      "Resource": "arn:aws:s3:::triage-recordings/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:*:table/TriageSessions"
    }
  ]
}
```

---

## Lambda #2: S3 Event Processor

**Handler:** `process-upload.js`

```javascript
const { TranscribeClient, StartTranscriptionJobCommand } = require("@aws-sdk/client-transcribe");
const { DynamoDBClient, UpdateItemCommand } = require("@aws-sdk/client-dynamodb");

const transcribeClient = new TranscribeClient({ region: process.env.AWS_REGION || "us-east-1" });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });

exports.handler = async (event) => {
  try {
    // Parse S3 event
    const s3Record = event.Records[0].s3;
    const bucket = s3Record.bucket.name;
    const key = decodeURIComponent(s3Record.object.key.replace(/\+/g, " "));

    console.log(`Processing upload: s3://${bucket}/${key}`);

    // Extract metadata from key: {userId}/{sessionId}.{ext}
    const [userId, fileNameWithExt] = key.split("/");
    const [sessionId, extension] = fileNameWithExt.split(".");

    // Determine media format for Transcribe
    const formatMap = {
      m4a: "mp4",
      mp3: "mp3",
      wav: "wav",
      flac: "flac",
      ogg: "ogg",
      "3gp": "mp4", // 3GP uses MP4 container
    };
    const mediaFormat = formatMap[extension] || "mp4";

    // Start AWS Transcribe job
    const jobName = `triage-${sessionId}`;
    await transcribeClient.send(
      new StartTranscriptionJobCommand({
        TranscriptionJobName: jobName,
        LanguageCode: "en-US",
        MediaFormat: mediaFormat,
        Media: {
          MediaFileUri: `s3://${bucket}/${key}`,
        },
        OutputBucketName: process.env.TRANSCRIBE_OUTPUT_BUCKET || "triage-transcripts",
        Settings: {
          VocabularyName: process.env.TRANSCRIBE_VOCABULARY, // Optional: medical terms
        },
      })
    );

    console.log(`Started Transcribe job: ${jobName}`);

    // Update DynamoDB status
    await dynamoClient.send(
      new UpdateItemCommand({
        TableName: process.env.DYNAMODB_TABLE || "TriageSessions",
        Key: {
          PK: { S: `USER#${userId}` },
          SK: { S: `SESSION#${sessionId}` },
        },
        UpdateExpression: "SET #status = :status, transcribeJobName = :jobName, uploadedAt = :uploadedAt",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":status": { S: "transcribing" },
          ":jobName": { S: jobName },
          ":uploadedAt": { S: new Date().toISOString() },
        },
      })
    );

    return { statusCode: 200, body: "Transcription started" };
  } catch (error) {
    console.error("Error processing upload:", error);
    throw error; // Retry via Lambda DLQ
  }
};
```

**Trigger:** S3 Event Notification
- Event Type: `s3:ObjectCreated:*`
- Bucket: `triage-recordings`
- Prefix: (none)
- Suffix: `.m4a, .mp3, .wav`

**IAM Permissions:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "transcribe:StartTranscriptionJob"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::triage-recordings/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:UpdateItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:*:table/TriageSessions"
    }
  ]
}
```

---

## Lambda #3: Bedrock Analysis

**Handler:** `bedrock-analysis.js`

```javascript
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");
const { DynamoDBClient, UpdateItemCommand } = require("@aws-sdk/client-dynamodb");

const s3Client = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || "us-east-1" });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });

exports.handler = async (event) => {
  try {
    // EventBridge event from Transcribe job completion
    const jobName = event.detail.TranscriptionJobName;
    const sessionId = jobName.replace("triage-", "");

    console.log(`Processing completed transcription: ${jobName}`);

    // 1. Fetch transcript from S3
    const transcriptKey = `${jobName}.json`;
    const transcriptObj = await s3Client.send(
      new GetObjectCommand({
        Bucket: process.env.TRANSCRIBE_OUTPUT_BUCKET || "triage-transcripts",
        Key: transcriptKey,
      })
    );

    const transcriptData = await transcriptObj.Body.transformToString();
    const transcript = JSON.parse(transcriptData);
    const transcriptText = transcript.results.transcripts[0].transcript;

    console.log(`Transcript: ${transcriptText}`);

    // 2. Call Bedrock Claude for analysis
    const prompt = `You are a medical triage AI assistant. Analyze this patient's symptom description and provide a structured assessment.

Patient Description: "${transcriptText}"

Provide your response in valid JSON format with these exact fields:
{
  "summary": "Brief 1-2 sentence summary of symptoms",
  "urgency": "High|Medium|Low",
  "category": "Medical category (e.g., Respiratory, Cardiovascular, Neurological)",
  "specialist": "Recommended specialist type",
  "suggested_action": "Clear next steps for the patient"
}

Use "High" urgency only for life-threatening symptoms (chest pain, difficulty breathing, severe bleeding, etc.).`;

    const response = await bedrockClient.send(
      new InvokeModelCommand({
        modelId: "anthropic.claude-3-sonnet-20240229-v1:0",
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 1024,
          temperature: 0.3, // Low temperature for consistent medical responses
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      })
    );

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const aiResponse = responseBody.content[0].text;
    
    // Extract JSON from response (Claude might wrap it in markdown)
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    const triageResult = JSON.parse(jsonMatch[0]);

    console.log("Triage result:", triageResult);

    // 3. Extract userId from DynamoDB (query by sessionId)
    // For simplicity, we'll extract from S3 metadata or use a GSI
    // Here's a simplified version - adjust based on your data model
    const userId = transcript.jobName.split("-")[1]; // Adjust based on actual structure

    // 4. Update DynamoDB with final result
    await dynamoClient.send(
      new UpdateItemCommand({
        TableName: process.env.DYNAMODB_TABLE || "TriageSessions",
        Key: {
          PK: { S: `USER#${userId}` },
          SK: { S: `SESSION#${sessionId}` },
        },
        UpdateExpression: "SET #status = :status, #result = :result, completedAt = :completedAt, transcript = :transcript",
        ExpressionAttributeNames: {
          "#status": "status",
          "#result": "result",
        },
        ExpressionAttributeValues: {
          ":status": { S: "completed" },
          ":result": { S: JSON.stringify(triageResult) },
          ":completedAt": { S: new Date().toISOString() },
          ":transcript": { S: transcriptText },
        },
      })
    );

    // 5. Optional: Send push notification for high urgency
    if (triageResult.urgency === "High") {
      // TODO: Integrate with FCM/SNS
      console.log("HIGH URGENCY - Send push notification!");
    }

    return { statusCode: 200, body: "Analysis complete" };
  } catch (error) {
    console.error("Error in Bedrock analysis:", error);
    throw error;
  }
};
```

**Trigger:** EventBridge Rule
- Event Source: `aws.transcribe`
- Event Pattern:
```json
{
  "source": ["aws.transcribe"],
  "detail-type": ["Transcribe Job State Change"],
  "detail": {
    "TranscriptionJobStatus": ["COMPLETED"]
  }
}
```

**IAM Permissions:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::triage-transcripts/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:UpdateItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:*:table/TriageSessions"
    }
  ]
}
```

---

## Lambda #4: Get Results

**Handler:** `get-result.js`

```javascript
const { DynamoDBClient, GetItemCommand } = require("@aws-sdk/client-dynamodb");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });

exports.handler = async (event) => {
  try {
    // 1. Validate Firebase token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader) {
      return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
    }

    const token = authHeader.replace(/Bearer /i, "");
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userId = decodedToken.uid;

    // 2. Extract sessionId from path
    const sessionId = event.pathParameters?.sessionId;
    if (!sessionId) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing sessionId" }) };
    }

    // 3. Query DynamoDB
    const response = await dynamoClient.send(
      new GetItemCommand({
        TableName: process.env.DYNAMODB_TABLE || "TriageSessions",
        Key: {
          PK: { S: `USER#${userId}` },
          SK: { S: `SESSION#${sessionId}` },
        },
      })
    );

    if (!response.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Session not found or access denied" }),
      };
    }

    // 4. Parse and return result
    const status = response.Item.status.S;
    const result = response.Item.result?.S ? JSON.parse(response.Item.result.S) : null;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        status,
        data: result,
        sessionId,
      }),
    };
  } catch (error) {
    console.error("Error fetching result:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
```

**API Gateway Route:**
- Method: `GET`
- Path: `/triage/result/{sessionId}`
- Authorization: None (handled in Lambda)

---

## 🚀 Deployment Checklist

1. **Create S3 Buckets:**
   ```bash
   aws s3 mb s3://triage-recordings --region us-east-1
   aws s3 mb s3://triage-transcripts --region us-east-1
   
   # Block public access
   aws s3api put-public-access-block \
     --bucket triage-recordings \
     --public-access-block-configuration \
     "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
   ```

2. **Create DynamoDB Table:**
   ```bash
   aws dynamodb create-table \
     --table-name TriageSessions \
     --attribute-definitions \
       AttributeName=PK,AttributeType=S \
       AttributeName=SK,AttributeType=S \
     --key-schema \
       AttributeName=PK,KeyType=HASH \
       AttributeName=SK,KeyType=RANGE \
     --billing-mode PAY_PER_REQUEST \
     --time-to-live-specification \
       Enabled=true,AttributeName=expiresAt
   ```

3. **Deploy Lambda Functions:**
   - Package each function with dependencies
   - Set environment variables
   - Configure triggers (S3, EventBridge, API Gateway)

4. **Create API Gateway:**
   ```bash
   # Use AWS Console or CDK to create REST API with routes:
   POST /triage/presigned-upload -> presigned-upload.js
   GET /triage/result/{sessionId} -> get-result.js
   ```

5. **Update App Environment:**
   ```bash
   echo "EXPO_PUBLIC_API_ENDPOINT=https://your-api-id.execute-api.us-east-1.amazonaws.com/prod" > .env
   ```

6. **Test End-to-End:**
   - Record audio in app
   - Check S3 for uploaded file
   - Verify Transcribe job starts
   - Wait for EventBridge trigger
   - Poll for results

---

**Status:** Ready for deployment! 🚀
