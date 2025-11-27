/**
 * UPLINK VERIFICATION TEST
 * Run this BEFORE Day 2 to verify:
 * 1. Firebase auth works
 * 2. API endpoint is configured
 * 3. Presigned URL generation works
 * 4. S3 upload succeeds
 * 
 * Usage:
 * - Add a test button in your app
 * - Call verifyUplink() and display results
 * - Check AWS Console to confirm file uploaded
 */

import { getAuth } from '@react-native-firebase/auth';

export interface VerificationResult {
  success: boolean;
  steps: {
    auth: boolean;
    apiEndpoint: boolean;
    presignedUrl: boolean;
    s3Upload: boolean;
  };
  data?: {
    sessionId: string;
    s3Key: string;
    userId: string;
  };
  error?: string;
}

export async function verifyUplink(): Promise<VerificationResult> {
  const result: VerificationResult = {
    success: false,
    steps: {
      auth: false,
      apiEndpoint: false,
      presignedUrl: false,
      s3Upload: false,
    },
  };

  try {
    // ========================================
    // STEP 1: VERIFY USER ID EXISTS
    // ========================================
    console.log('🔐 Step 1: Checking user ID...');
    
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('User not authenticated. Please sign in first.');
    }
    
    result.steps.auth = true;
    console.log('✅ User ID found:', user.uid);

    // ========================================
    // STEP 2: VERIFY API ENDPOINT
    // ========================================
    console.log('\n🌐 Step 2: Verifying API Endpoint...');
    
    const API_ENDPOINT = process.env.EXPO_PUBLIC_API_ENDPOINT;
    
    if (!API_ENDPOINT) {
      throw new Error('EXPO_PUBLIC_API_ENDPOINT not set in .env');
    }
    
    if (API_ENDPOINT.includes('your-api')) {
      throw new Error('API_ENDPOINT still has placeholder value. Update .env with real endpoint.');
    }
    
    result.steps.apiEndpoint = true;
    console.log('✅ API Endpoint:', API_ENDPOINT);

    // ========================================
    // STEP 3: REQUEST PRESIGNED URL
    // ========================================
    console.log('\n📝 Step 3: Requesting Presigned Upload URL...');
    
    const presignedResponse = await fetch(
      `${API_ENDPOINT}/triage/presigned-upload`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          fileExtension: 'm4a',
          timestamp: Date.now(),
        }),
      }
    );

    if (!presignedResponse.ok) {
      const errorText = await presignedResponse.text();
      throw new Error(
        `Presigned URL request failed: ${presignedResponse.status}\n${errorText}`
      );
    }

    const presignedData = await presignedResponse.json();
    const { uploadUrl, key, sessionId } = presignedData;

    if (!uploadUrl || !key || !sessionId) {
      throw new Error('Invalid presigned URL response. Missing required fields.');
    }

    result.steps.presignedUrl = true;
    console.log('✅ Presigned URL received');
    console.log('   Session ID:', sessionId);
    console.log('   S3 Key:', key);
    console.log('   URL valid for: ~5 minutes');

    // ========================================
    // STEP 4: TEST S3 UPLOAD
    // ========================================
    console.log('\n☁️ Step 4: Testing S3 Upload...');
    
    // Create a small test audio file (just test data)
    const testAudioData = 'TEST_AUDIO_DATA_FOR_UPLINK_VERIFICATION';
    const testBlob = new Blob([testAudioData], { type: 'audio/mp4' });

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'audio/mp4',
      },
      body: testBlob,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(
        `S3 upload failed: ${uploadResponse.status}\n${errorText}`
      );
    }

    result.steps.s3Upload = true;
    console.log('✅ S3 Upload successful!');
    console.log('   File size:', testAudioData.length, 'bytes');

    // ========================================
    // SUCCESS!
    // ========================================
    result.success = true;
    result.data = {
      sessionId,
      s3Key: key,
      userId: user.uid,
    };

    console.log('\n🎉 UPLINK VERIFICATION COMPLETE!');
    console.log('✅ All systems operational');
    console.log('\n📋 Next Steps:');
    console.log('1. Check AWS S3 Console for file:', key);
    console.log('2. Verify Content-Type: audio/mp4');
    console.log('3. Check CloudWatch Logs for Lambda execution');
    console.log('4. Verify DynamoDB record (if table exists)');
    console.log('\n🚀 Ready to build "The Brain" (Transcribe + Bedrock)');

    return result;
  } catch (error: any) {
    console.error('\n❌ VERIFICATION FAILED:', error.message);
    result.error = error.message;
    
    // Debug information
    console.error('\n🔍 Debug Info:');
    console.error('Auth step:', result.steps.auth ? '✅' : '❌');
    console.error('API step:', result.steps.apiEndpoint ? '✅' : '❌');
    console.error('Presigned URL step:', result.steps.presignedUrl ? '✅' : '❌');
    console.error('S3 Upload step:', result.steps.s3Upload ? '✅' : '❌');

    return result;
  }
}

/**
 * AWS CONSOLE VERIFICATION CHECKLIST
 * 
 * After running verifyUplink(), manually check:
 * 
 * 1. S3 BUCKET (triage-recordings or your bucket name)
 *    □ Object exists with key: {userId}/{sessionId}.m4a
 *    □ Object size: ~40 bytes (test data)
 *    □ Content-Type: audio/mp4
 *    □ Metadata headers: user-id, session-id, timestamp
 * 
 * 2. CLOUDWATCH LOGS (/aws/lambda/triage-presigned-upload)
 *    □ Recent log stream exists
 *    □ No error messages
 *    □ Request logged with correct userId
 *    □ Presigned URL generated successfully
 * 
 * 3. DYNAMODB TABLE (TriageSessions - if created)
 *    □ Record exists: PK=USER#{userId}, SK=SESSION#{sessionId}
 *    □ status: "pending_upload"
 *    □ createdAt timestamp is recent
 *    □ expiresAt is ~30 days in future
 * 
 * 4. API GATEWAY LOGS
 *    □ POST request logged
 *    □ 200 response code
 *    □ No CORS errors
 * 
 * If all ✅ → Proceed to Lambda #2 (Transcribe)
 * If any ❌ → Debug that step before continuing
 */
