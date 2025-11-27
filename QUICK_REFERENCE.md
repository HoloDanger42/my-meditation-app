# 🎴 Voice Triage Quick Reference Card

## 📱 Client Implementation (React Native)

### **Files Modified/Created:**
```
✅ app/index.tsx                    - Main triage screen (120 lines, clean!)
✅ hooks/useTriageRecorder.ts       - Recording logic (224 lines)
✅ hooks/useTriageAnimations.ts     - Animations (51 lines)
✅ components/TriageButton.tsx      - Hold-to-talk UI (86 lines)
✅ components/ResultCard.tsx        - Result display (248 lines)
✅ utils/triageColors.ts            - Color utility (21 lines)
✅ utils/awsTriageService.ts        - AWS integration (208 lines)
```

### **Usage Example:**
```typescript
// In your component
const { status, lastResult, startRecording, stopRecording } = useTriageRecorder();

<TriageButton
  status={status}
  onPressIn={startRecording}  // Hold
  onPressOut={stopRecording}  // Release
/>

{lastResult && <ResultCard result={lastResult} />}
```

---

## ☁️ AWS Resources Required

### **S3 Buckets (2)**
```bash
1. triage-recordings       # Input audio files
2. triage-transcripts      # Transcribe output
```

### **DynamoDB Table (1)**
```bash
Table: TriageSessions
PK: USER#<firebase-uid>
SK: SESSION#<uuid>
TTL: expiresAt (30 days)
```

### **Lambda Functions (4)**
```bash
1. presigned-upload        # POST /triage/presigned-upload
2. process-upload          # S3 ObjectCreated trigger
3. bedrock-analysis        # EventBridge Transcribe complete
4. get-result              # GET /triage/result/{sessionId}
```

### **API Gateway (1)**
```bash
Type: REST API
Endpoints:
  - POST /triage/presigned-upload
  - GET  /triage/result/{sessionId}
```

### **EventBridge Rule (1)**
```bash
Source: aws.transcribe
Event: TranscriptionJobStatus = COMPLETED
Target: Lambda #3
```

---

## 🔑 Environment Variables

### **App (.env)**
```bash
EXPO_PUBLIC_API_ENDPOINT=https://xxx.execute-api.us-east-1.amazonaws.com
```

### **Lambda Functions**
```bash
# All Lambdas
AWS_REGION=us-east-1

# Lambda #1 & #4 (require Firebase)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=service-account@...
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...

# Lambda #1
S3_BUCKET_NAME=triage-recordings
DYNAMODB_TABLE=TriageSessions

# Lambda #2
TRANSCRIBE_OUTPUT_BUCKET=triage-transcripts
TRANSCRIBE_VOCABULARY=medical-terms (optional)
DYNAMODB_TABLE=TriageSessions

# Lambda #3
TRANSCRIBE_OUTPUT_BUCKET=triage-transcripts
DYNAMODB_TABLE=TriageSessions

# Lambda #4
DYNAMODB_TABLE=TriageSessions
```

---

## 🔒 Security Checklist

- [ ] ✅ **No AWS credentials in app** (client only has API endpoint)
- [ ] ✅ **Firebase token required** for all API calls
- [ ] ✅ **S3 buckets blocked public access**
- [ ] ✅ **Presigned URLs expire in 5 minutes**
- [ ] ✅ **DynamoDB enforces userId isolation**
- [ ] ✅ **Lambda IAM roles use least privilege**
- [ ] ✅ **All data encrypted at rest** (KMS default)
- [ ] ✅ **All data encrypted in transit** (TLS 1.2+)
- [ ] ✅ **CloudWatch logging enabled**
- [ ] ✅ **30-day data retention** (DynamoDB TTL)

---

## 💰 Cost Calculator

### **Pricing (US East 1, as of 2024)**
| Service | Price | Per 1000 Sessions |
|---------|-------|-------------------|
| S3 Storage (30 days) | $0.023/GB/month | $0.01 |
| S3 Requests | $0.005/1000 PUT | $0.01 |
| Lambda | $0.20/1M requests | $0.42 |
| Transcribe | $0.024/minute | $24.00 |
| Bedrock Claude | $0.003/1K tokens | $3.00 |
| DynamoDB | $1.25/M writes | $1.28 |
| API Gateway | $3.50/M requests | $0.01 |
| **TOTAL** | | **$28.73** |

**Break-even at ~35 sessions/day** (vs. dedicated server at $30/mo)

---

## 🚀 Deployment Commands

### **1. Create Infrastructure**
```bash
# S3 Buckets
aws s3 mb s3://triage-recordings --region us-east-1
aws s3 mb s3://triage-transcripts --region us-east-1

# DynamoDB Table
aws dynamodb create-table \
  --table-name TriageSessions \
  --attribute-definitions AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S \
  --key-schema AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST

# Enable TTL
aws dynamodb update-time-to-live \
  --table-name TriageSessions \
  --time-to-live-specification "Enabled=true, AttributeName=expiresAt"
```

### **2. Deploy Lambda Functions**
```bash
# Create deployment packages
cd lambda/presigned-upload && npm install && zip -r function.zip . && cd ../..
cd lambda/process-upload && npm install && zip -r function.zip . && cd ../..
cd lambda/bedrock-analysis && npm install && zip -r function.zip . && cd ../..
cd lambda/get-result && npm install && zip -r function.zip . && cd ../..

# Upload to Lambda (use AWS Console or CLI)
aws lambda create-function \
  --function-name triage-presigned-upload \
  --runtime nodejs20.x \
  --handler index.handler \
  --zip-file fileb://lambda/presigned-upload/function.zip \
  --role arn:aws:iam::ACCOUNT_ID:role/LambdaTriageRole
```

### **3. Configure Triggers**
```bash
# S3 → Lambda #2
aws s3api put-bucket-notification-configuration \
  --bucket triage-recordings \
  --notification-configuration file://s3-trigger-config.json

# EventBridge → Lambda #3
aws events put-rule \
  --name TranscribeComplete \
  --event-pattern '{"source":["aws.transcribe"],"detail-type":["Transcribe Job State Change"],"detail":{"TranscriptionJobStatus":["COMPLETED"]}}'

aws events put-targets \
  --rule TranscribeComplete \
  --targets "Id=1,Arn=arn:aws:lambda:us-east-1:ACCOUNT_ID:function:triage-bedrock-analysis"
```

### **4. Create API Gateway**
```bash
# Use AWS Console or CDK
# Create REST API with:
# - POST /triage/presigned-upload → Lambda #1
# - GET /triage/result/{sessionId} → Lambda #4
# - Enable CORS
# - Deploy to prod stage
```

### **5. Update App**
```bash
# Set environment variable
echo "EXPO_PUBLIC_API_ENDPOINT=https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod" > .env

# Rebuild app
npx expo prebuild --clean
npm run android
```

---

## 🧪 Testing Checklist

### **Unit Tests (Client)**
- [ ] Test `useTriageRecorder` hook in isolation
- [ ] Test presigned URL fetch with mock API
- [ ] Test S3 upload with mock presigned URL
- [ ] Test result polling logic
- [ ] Test audio format detection

### **Integration Tests (Backend)**
- [ ] Test Lambda #1: Token validation + presigned URL generation
- [ ] Test Lambda #2: S3 trigger → Start Transcribe job
- [ ] Test Lambda #3: EventBridge → Bedrock → DynamoDB write
- [ ] Test Lambda #4: Get result with valid token

### **End-to-End Test**
```bash
1. Record 10-second audio in app
2. Verify S3 upload successful (check S3 console)
3. Verify Transcribe job started (check Transcribe console)
4. Wait 30-60 seconds
5. Verify EventBridge triggered Lambda #3 (check CloudWatch logs)
6. Verify result appears in app within 2 seconds
7. Verify result matches audio content
8. Verify urgency classification is reasonable
```

---

## 🐛 Troubleshooting

| Issue | Symptom | Solution |
|-------|---------|----------|
| No upload URL | "Failed to get upload URL" | Check Lambda #1 logs, verify Firebase token |
| Upload fails | HTTP 403 on S3 PUT | Presigned URL expired (5 min), regenerate |
| No transcription | Transcribe job not starting | Check S3 trigger config, Lambda #2 logs |
| Wrong format | Transcribe fails | Verify Content-Type header, check audio format |
| No results | Polling times out | Check EventBridge rule, Lambda #3 logs |
| Wrong urgency | AI misclassifies | Tune Bedrock prompt, add medical context |

### **Debug Commands**
```bash
# Check Lambda logs
aws logs tail /aws/lambda/triage-presigned-upload --follow

# Check Transcribe jobs
aws transcribe list-transcription-jobs --status FAILED

# Query DynamoDB
aws dynamodb get-item \
  --table-name TriageSessions \
  --key '{"PK":{"S":"USER#abc123"},"SK":{"S":"SESSION#uuid"}}'
```

---

## 📊 Monitoring

### **CloudWatch Metrics to Watch**
```bash
Lambda #1: Invocations, Errors, Duration
Lambda #2: S3 trigger count, Transcribe starts
Lambda #3: Bedrock API calls, DynamoDB writes
Lambda #4: Invocations (polling frequency)

Transcribe: Job duration, failure rate
Bedrock: Token usage, latency
DynamoDB: Read/write capacity, throttles
```

### **Alarms to Set**
```bash
- Lambda error rate > 5%
- Transcribe failure rate > 10%
- API Gateway 5xx rate > 1%
- DynamoDB throttled requests > 0
- Lambda duration > 10s (indicates cold start issues)
```

---

## 📚 Documentation Index

1. **ARCHITECTURE.md** - Complete security audit and flow
2. **LAMBDA_TEMPLATES.md** - Copy-paste Lambda code
3. **FLOW_DIAGRAM.md** - Visual data flow with security checkpoints
4. **IMPLEMENTATION_SUMMARY.md** - High-level overview
5. **QUICK_REFERENCE.md** - This file (cheat sheet)
6. **README.md** - Updated project documentation
7. **.env.example** - Required environment variables

---

## ✅ Pre-Production Checklist

- [ ] All 4 Lambdas deployed with correct IAM roles
- [ ] S3 buckets created with public access blocked
- [ ] DynamoDB table created with TTL enabled
- [ ] API Gateway endpoints tested with Postman
- [ ] Firebase service account configured in Lambdas
- [ ] CloudWatch logging verified for all functions
- [ ] CloudWatch alarms configured
- [ ] End-to-end test passed with real audio
- [ ] Cost tracking enabled (AWS Cost Explorer)
- [ ] Security audit passed (no credentials in code)
- [ ] CORS configured correctly (mobile app domain)
- [ ] Error handling tested (network failures, timeouts)
- [ ] Push notifications configured (optional)
- [ ] HIPAA compliance review (if applicable)

---

**Keep this file handy during deployment! 🚀**

**Need help?** Check the other documentation files or the code comments.
