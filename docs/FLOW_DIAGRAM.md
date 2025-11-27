# 🔄 Voice Triage Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLIENT (React Native App)                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 1. User holds button
                                    │    Records audio
                                    ▼
                          ┌──────────────────┐
                          │  Expo Audio      │
                          │  Recording       │
                          │  → .m4a file     │
                          └──────────────────┘
                                    │
                                    │ 2. Get Firebase ID token
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        FIREBASE AUTHENTICATION                           │
│  - Validates user identity                                              │
│  - Issues ID token (JWT)                                                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 3. POST /triage/presigned-upload
                                    │    Authorization: Bearer <token>
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         AWS API GATEWAY                                  │
│  - HTTPS endpoint                                                       │
│  - CORS enabled                                                         │
│  - Rate limiting                                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 4. Invoke Lambda #1
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              LAMBDA #1: Generate Presigned URL                          │
│  ┌────────────────────────────────────────────────────────┐            │
│  │ 1. Verify Firebase token                               │            │
│  │ 2. Generate sessionId = UUID                           │            │
│  │ 3. Create S3 key: userId/sessionId.m4a                 │            │
│  │ 4. Generate presigned PUT URL (5 min expiry)           │            │
│  │ 5. Store metadata in DynamoDB                          │            │
│  └────────────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────┘
                    │                                 │
                    │ 5. Return presigned URL         │ 6. DynamoDB write
                    ▼                                 ▼
          ┌──────────────────┐          ┌──────────────────────────┐
          │  CLIENT          │          │  DynamoDB Table          │
          │  Receives:       │          │  TriageSessions          │
          │  - uploadUrl     │          │                          │
          │  - sessionId     │          │  PK: USER#abc123         │
          │  - key           │          │  SK: SESSION#uuid        │
          └──────────────────┘          │  status: pending_upload  │
                    │                    └──────────────────────────┘
                    │ 7. PUT audio to presigned URL
                    │    Content-Type: audio/mp4
                    │    (Direct S3 upload, no Lambda)
                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    S3 BUCKET: triage-recordings                         │
│  ┌────────────────────────────────────────────────────────┐            │
│  │  s3://triage-recordings/                               │            │
│  │    └── abc123/                                         │            │
│  │        └── session-550e8400-....m4a                    │            │
│  │                                                         │            │
│  │  Metadata:                                             │            │
│  │    x-amz-meta-user-id: abc123                          │            │
│  │    x-amz-meta-session-id: session-550e8400...          │            │
│  │    x-amz-meta-timestamp: 1732752000000                 │            │
│  └────────────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 8. S3 Event: ObjectCreated
                                    │    (Automatic trigger)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                LAMBDA #2: Process Upload (S3 Trigger)                   │
│  ┌────────────────────────────────────────────────────────┐            │
│  │ 1. Parse S3 event (bucket, key)                        │            │
│  │ 2. Extract userId/sessionId from key                   │            │
│  │ 3. Start AWS Transcribe job                            │            │
│  │    - Input: s3://triage-recordings/userId/session.m4a  │            │
│  │    - Format: mp4                                       │            │
│  │    - Language: en-US                                   │            │
│  │    - Vocabulary: medical-terms                         │            │
│  │ 4. Update DynamoDB: status = "transcribing"            │            │
│  └────────────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 9. Transcribe processes
                                    │    (async, 30-60 seconds)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         AWS TRANSCRIBE                                   │
│  - Converts speech → text                                               │
│  - Uses medical vocabulary                                              │
│  - Outputs JSON transcript to S3                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 10. Output saved
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  S3 BUCKET: triage-transcripts                          │
│  triage-session-550e8400-....json                                       │
│  {                                                                      │
│    "results": {                                                         │
│      "transcripts": [{                                                  │
│        "transcript": "I'm having chest pain..."                         │
│      }]                                                                 │
│    }                                                                    │
│  }                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 11. EventBridge Rule
                                    │     (Transcribe Job Complete)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│            LAMBDA #3: Bedrock Analysis (EventBridge Trigger)            │
│  ┌────────────────────────────────────────────────────────┐            │
│  │ 1. Fetch transcript from S3                            │            │
│  │ 2. Call AWS Bedrock (Claude 3)                         │            │
│  │    Prompt: "Analyze symptoms, urgency, category..."    │            │
│  │ 3. Parse AI response → TriageResult JSON               │            │
│  │ 4. Update DynamoDB:                                    │            │
│  │    - status = "completed"                              │            │
│  │    - result = { urgency, category, specialist, ... }   │            │
│  │ 5. [Optional] Send push notification if High urgency   │            │
│  └────────────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 12. Write result
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    DynamoDB: TriageSessions (Updated)                   │
│  PK: USER#abc123                                                        │
│  SK: SESSION#550e8400-...                                               │
│  status: "completed"                                                    │
│  result: {                                                              │
│    "summary": "Patient reports chest pain...",                          │
│    "urgency": "High",                                                   │
│    "category": "Cardiovascular",                                        │
│    "specialist": "Cardiologist",                                        │
│    "suggested_action": "Emergency protocol..."                          │
│  }                                                                      │
│  createdAt: "2024-11-27T12:00:00Z"                                      │
│  completedAt: "2024-11-27T12:01:23Z"                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 13. Client polls for results
                                    │     GET /triage/result/{sessionId}
                                    │     (Every 1 second, max 30 attempts)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   LAMBDA #4: Get Results (API Gateway)                  │
│  ┌────────────────────────────────────────────────────────┐            │
│  │ 1. Verify Firebase token                               │            │
│  │ 2. Query DynamoDB by sessionId                         │            │
│  │ 3. Verify userId matches (security check)              │            │
│  │ 4. Return { status, data }                             │            │
│  └────────────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 14. Return result
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (React Native)                         │
│  ┌────────────────────────────────────────────────────────┐            │
│  │ Receives TriageResult:                                 │            │
│  │ - Display ResultCard with urgency badge                │            │
│  │ - Fade-in animation                                    │            │
│  │ - Color-coded based on urgency                         │            │
│  │ - Show specialist recommendation                       │            │
│  │ - "Connect to specialist" button (if High)             │            │
│  └────────────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Checkpoints

| Step | Security Measure |
|------|-----------------|
| **1-2** | Audio recorded locally, never transmitted before auth |
| **3** | Firebase validates user before ANY AWS access |
| **4** | Lambda verifies Firebase token, generates unique sessionId |
| **5** | Presigned URL expires in 5 minutes (time-limited access) |
| **7** | Direct S3 upload (no Lambda in path = faster + cheaper) |
| **8** | S3 trigger only fires for authorized bucket |
| **9-10** | Transcribe reads from private bucket (IAM role) |
| **11** | EventBridge filters only completed Transcribe jobs |
| **12** | DynamoDB enforces userId partition (data isolation) |
| **13** | Every poll request requires fresh Firebase token |
| **14** | Lambda verifies userId matches sessionId owner |

---

## ⏱️ Timeline Breakdown

| Phase | Duration | Who Does It |
|-------|----------|-------------|
| Audio Recording | 5-30 seconds | User |
| Get Presigned URL | <500ms | Lambda #1 |
| Upload to S3 | 1-3 seconds | Client → S3 |
| Trigger Lambda #2 | <100ms | S3 Event |
| Transcribe Job | 30-60 seconds | AWS Transcribe |
| Bedrock Analysis | 2-5 seconds | Lambda #3 + Bedrock |
| Result Available | <100ms | DynamoDB write |
| Client Polls & Receives | 1-2 seconds | Lambda #4 |
| **Total (Best Case)** | **~40 seconds** | End-to-end |
| **Total (Worst Case)** | **~90 seconds** | Longer audio/processing |

---

## 💡 Key Design Decisions

1. **Direct S3 Upload (Not via Lambda)**
   - ✅ Faster (no Lambda cold start)
   - ✅ Cheaper (no data transfer through Lambda)
   - ✅ Scalable (S3 handles high concurrency)
   - ✅ Secure (presigned URL = time-limited token)

2. **Polling (Not WebSocket)**
   - ✅ Simpler infrastructure (no persistent connections)
   - ✅ Works with API Gateway REST (no need for WebSocket API)
   - ✅ Mobile-friendly (handles network interruptions)
   - ❌ Slightly higher latency (1-2 sec polling interval)
   - 🔄 **Alternative:** Push notifications via FCM (future enhancement)

3. **EventBridge (Not Direct Lambda Trigger)**
   - ✅ Decouples Transcribe from Bedrock analysis
   - ✅ Allows multiple downstream consumers
   - ✅ Built-in retry logic and DLQ support
   - ✅ Easy to add monitoring/alerting

4. **DynamoDB (Not RDS)**
   - ✅ Serverless (no capacity planning)
   - ✅ Auto-scaling (handles traffic spikes)
   - ✅ TTL support (auto-delete after 30 days)
   - ✅ Single-digit millisecond latency
   - ✅ Cost-effective at low/medium volume

---

## 🎯 Cost Optimization Tips

1. **S3 Lifecycle Policies:**
   ```json
   {
     "Rules": [{
       "Id": "DeleteOldRecordings",
       "Status": "Enabled",
       "Expiration": { "Days": 30 }
     }]
   }
   ```

2. **DynamoDB On-Demand Pricing:**
   - Pay per request (no minimum capacity)
   - Enable TTL to auto-delete expired sessions

3. **Lambda Memory Optimization:**
   - Start with 512MB, monitor CloudWatch metrics
   - Lower memory = lower cost (if execution time doesn't increase)

4. **API Gateway Caching:**
   - Cache GET results for 5 seconds (reduces Lambda invocations)
   - Not recommended for this use case (results change rapidly)

5. **Transcribe Custom Vocabulary:**
   - Pre-load medical terms to improve accuracy
   - Reduces re-processing costs from errors

---

**This flow ensures maximum security while maintaining sub-minute response times!** 🚀
