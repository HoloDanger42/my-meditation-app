# Step 2: Data Supply for Web Team 🌐

**Goal:** Give your Web Team the endpoint to fetch patient diagnosis data for the Doctor Dashboard.

---

## API Endpoint for Web Team

### ChanseyReader (Lambda #3) - Patient Result Fetcher

**Base URL:** `https://YOUR-READER-URL.lambda-url.us-east-1.on.aws`

**Method:** `GET`

**Query Parameters:**
- `userId` (required) - The patient's Firebase user ID
- `sessionId` (required) - The triage session ID

**Example Request:**
```
GET https://YOUR-READER-URL.lambda-url.us-east-1.on.aws/?userId=user123&sessionId=session-40fa84fc-32c5-4f32-a70f-afce9991c400
```

**Response Format:**

```json
{
  "status": "completed",
  "result": {
    "summary": "Patient experiencing severe unilateral headache with photophobia and nausea",
    "urgency": "High",
    "category": "Neurology",
    "action": "Go to ER",
    "reasoning": "Symptoms characteristic of migraine or other serious neurological condition requiring immediate evaluation"
  },
  "transcript": "I have a severe headache on one side of my head, and the light hurts my eyes. I feel nauseous.",
  "sessionId": "session-40fa84fc-32c5-4f32-a70f-afce9991c400",
  "userId": "user123",
  "createdAt": "2025-11-27T05:14:45.058Z",
  "completedAt": "2025-11-27T05:21:43.436Z"
}
```

**Status Values:**
- `pending_upload` - Waiting for audio file
- `processing` - Audio uploaded, AI analyzing
- `completed` - Diagnosis ready
- `failed` - Processing error
- `not_found` - Invalid session/user ID

---

## Integration Guide for Web Team

### React/Next.js Example

```typescript
// lib/api/triage.ts
const READER_ENDPOINT = process.env.NEXT_PUBLIC_READER_ENDPOINT;

export interface TriageResult {
  status: string;
  result?: {
    summary: string;
    urgency: 'High' | 'Medium' | 'Low';
    category: string;
    action: string;
    reasoning: string;
  };
  transcript?: string;
  sessionId: string;
  userId: string;
  createdAt: string;
  completedAt?: string;
}

export async function getPatientDiagnosis(
  userId: string,
  sessionId: string
): Promise<TriageResult> {
  const response = await fetch(
    `${READER_ENDPOINT}?userId=${userId}&sessionId=${sessionId}`
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch diagnosis: ${response.status}`);
  }
  
  return response.json();
}

// Poll for completion
export async function waitForDiagnosis(
  userId: string,
  sessionId: string,
  maxAttempts = 30
): Promise<TriageResult> {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await getPatientDiagnosis(userId, sessionId);
    
    if (result.status === 'completed') {
      return result;
    }
    
    await new Promise(r => setTimeout(r, 2000)); // Wait 2s
  }
  
  throw new Error('Diagnosis timeout');
}
```

### Dashboard Component Example

```tsx
// components/PatientCard.tsx
'use client';

import { useState, useEffect } from 'react';
import { getPatientDiagnosis, TriageResult } from '@/lib/api/triage';

export function PatientCard({ userId, sessionId }: Props) {
  const [result, setResult] = useState<TriageResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const poll = async () => {
      try {
        const data = await getPatientDiagnosis(userId, sessionId);
        setResult(data);

        if (data.status === 'completed') {
          clearInterval(interval);
          setLoading(false);
        }
      } catch (error) {
        console.error('Poll error:', error);
      }
    };

    poll(); // Initial fetch
    interval = setInterval(poll, 3000); // Poll every 3s

    return () => clearInterval(interval);
  }, [userId, sessionId]);

  if (loading || !result?.result) {
    return <div>Loading diagnosis...</div>;
  }

  const { result: diagnosis } = result;
  const urgencyColor = {
    High: 'bg-red-500',
    Medium: 'bg-yellow-500',
    Low: 'bg-green-500',
  }[diagnosis.urgency];

  return (
    <div className="border rounded-lg p-6 shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <div className={`${urgencyColor} w-4 h-4 rounded-full`} />
        <h2 className="text-xl font-bold">{diagnosis.urgency} Urgency</h2>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-gray-700">Summary</h3>
          <p>{diagnosis.summary}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold text-gray-700">Category</h3>
            <p>{diagnosis.category}</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-700">Action</h3>
            <p className="font-bold">{diagnosis.action}</p>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-gray-700">Patient Statement</h3>
          <p className="italic text-gray-600">&quot;{result.transcript}&quot;</p>
        </div>

        <div>
          <h3 className="font-semibold text-gray-700">Clinical Reasoning</h3>
          <p className="text-sm">{diagnosis.reasoning}</p>
        </div>

        <div className="text-xs text-gray-500 pt-4 border-t">
          Session: {sessionId}
          <br />
          Completed: {result.completedAt ? new Date(result.completedAt).toLocaleString() : 'Pending'}
        </div>
      </div>
    </div>
  );
}
```

---

## CORS Configuration

The Lambda already has CORS enabled:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

**For Production:** Change `*` to your specific domain in the Lambda code.

---

## Testing the Endpoint

### Browser Console Test
```javascript
fetch('https://YOUR-READER-URL.lambda-url.us-east-1.on.aws/?userId=user123&sessionId=session-40fa84fc-32c5-4f32-a70f-afce9991c400')
  .then(r => r.json())
  .then(data => console.log(data));
```

### cURL Test
```bash
curl "https://YOUR-READER-URL.lambda-url.us-east-1.on.aws/?userId=user123&sessionId=session-40fa84fc-32c5-4f32-a70f-afce9991c400"
```

---

## What to Tell Your Web Team

> **"Here's the API endpoint for fetching patient diagnoses:**
> 
> **Endpoint:** `https://YOUR-READER-URL.lambda-url.us-east-1.on.aws`
> 
> **Usage:** `GET /?userId={userId}&sessionId={sessionId}`
> 
> **When `status === 'completed'`, display the diagnosis to the doctor.**
> 
> **Poll every 2-3 seconds until status changes from `pending_upload` to `completed`.**
> 
> **Urgency levels:** `High` (red), `Medium` (yellow), `Low` (green)"**

---

## Next: Step 3 - Call Specialist Button

Once the diagnosis card appears on mobile and Web dashboard shows patient data, add the "Call Specialist" button that triggers the Agora video call (handled by your teammates' Agora integration).

---

## Data Flow Summary

```
Mobile App → Records Audio → Uploads to S3
                ↓
         Lambda #2 (Bedrock Analysis)
                ↓
            DynamoDB
                ↓
    Lambda #3 (ChanseyReader) ← Mobile App polls (2s intervals)
                ↓                ↓
         Web Dashboard      Diagnosis Card Appears
```

**Latency:** 4-10 seconds from recording stop to diagnosis display (acceptable for demo).
