/**
 * TEMPORARY TEST SCREEN
 * Delete this file after verification completes
 * 
 * Purpose: Verify S3 upload works before Day 2
 * 
 * To access: Navigate to /other/test-upload in your app
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, TextInput } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { verifyUplink, VerificationResult } from '../../utils/verifyUplink';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { processTriageAudio } from '../../utils/awsTriageService';

export default function TestUploadScreen() {
  const { theme } = useTheme();
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  
  // Real recording state
  const [userId, setUserId] = useState('user123');
  const [sessionId, setSessionId] = useState('session-chest-test');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);

  const runTest = async () => {
    setTesting(true);
    setResult(null);

    try {
      const testResult = await verifyUplink();
      setResult(testResult);
    } catch (error: any) {
      setResult({
        success: false,
        steps: {
          auth: false,
          apiEndpoint: false,
          presignedUrl: false,
          s3Upload: false,
        },
        error: error.message,
      });
    } finally {
      setTesting(false);
    }
  };

  const getStepIcon = (passed: boolean) => {
    return passed ? '✅' : '❌';
  };

  const getStepColor = (passed: boolean) => {
    return passed ? '#4CAF50' : '#FF4444';
  };

  const startRealRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
      setIsRecording(true);
      setUploadResult(null);
    } catch (err: any) {
      setUploadResult(`❌ Record failed: ${err.message}`);
    }
  };

  const stopAndUpload = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      if (!uri) {
        setUploadResult('❌ No audio URI');
        return;
      }

      setUploading(true);
      setUploadResult('⏳ Uploading...');

      // Manual upload for testing with custom session ID
      const API_ENDPOINT = process.env.EXPO_PUBLIC_API_ENDPOINT;
      if (!API_ENDPOINT) {
        throw new Error('API_ENDPOINT not configured');
      }

      // Get presigned URL
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, sessionId }),
      });

      if (!response.ok) {
        throw new Error(`Presigned URL failed: ${response.status}`);
      }

      const { uploadUrl } = await response.json();

      // Upload audio
      const audioBlob = await fetch(uri).then(r => r.blob());
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'audio/mp4' },
        body: audioBlob,
      });

      if (!uploadResponse.ok) {
        throw new Error(`S3 upload failed: ${uploadResponse.status}`);
      }
      
      setUploadResult(`✅ Uploaded to s3://triage-recordings/${userId}/${sessionId}.m4a`);
      setRecording(null);
    } catch (err: any) {
      setUploadResult(`❌ Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 20 }}
    >
      {/* Header */}
      <View style={{ marginBottom: 30 }}>
        <Text
          style={{
            color: theme.text,
            fontSize: 24,
            fontWeight: '800',
            marginTop: 40,
            marginBottom: 8,
          }}
        >
          🔍 Uplink Verification
        </Text>
        <Text style={{ color: theme.text, opacity: 0.7, lineHeight: 22 }}>
          Tests Firebase auth → API Gateway → S3 upload pipeline.
          Run this before Day 2 to catch issues early.
        </Text>
      </View>

      {/* Real Recording Section */}
      <View
        style={{
          backgroundColor: theme.card,
          padding: 20,
          borderRadius: 12,
          marginBottom: 20,
          borderWidth: 2,
          borderColor: '#FF6B6B',
        }}
      >
        <Text
          style={{
            color: theme.text,
            fontSize: 18,
            fontWeight: '800',
            marginBottom: 12,
          }}
        >
          🎤 Record & Upload Real Audio
        </Text>

        <TextInput
          value={userId}
          onChangeText={setUserId}
          placeholder="User ID"
          placeholderTextColor={theme.textTertiary}
          style={{
            backgroundColor: theme.background,
            color: theme.text,
            padding: 12,
            borderRadius: 8,
            marginBottom: 8,
            fontSize: 14,
          }}
        />

        <TextInput
          value={sessionId}
          onChangeText={setSessionId}
          placeholder="Session ID"
          placeholderTextColor={theme.textTertiary}
          style={{
            backgroundColor: theme.background,
            color: theme.text,
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 14,
          }}
        />

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable
            onPress={isRecording ? stopAndUpload : startRealRecording}
            disabled={uploading}
            style={{
              flex: 1,
              backgroundColor: isRecording ? '#FF4444' : '#4CAF50',
              padding: 16,
              borderRadius: 12,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Ionicons
              name={isRecording ? 'stop' : 'mic'}
              size={24}
              color="#FFF"
            />
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>
              {isRecording ? 'Stop & Upload' : 'Record'}
            </Text>
          </Pressable>
        </View>

        {uploadResult && (
          <View
            style={{
              marginTop: 12,
              padding: 12,
              backgroundColor: theme.background,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: theme.text, fontSize: 14 }}>
              {uploadResult}
            </Text>
          </View>
        )}
      </View>

      {/* Verification Test Button */}
      <Pressable
        onPress={runTest}
        disabled={testing}
        style={{
          backgroundColor: testing ? theme.cardBorder : theme.accent,
          padding: 16,
          borderRadius: 12,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 12,
          marginBottom: 30,
        }}
      >
        {testing ? (
          <>
            <ActivityIndicator color="#FFF" />
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>
              Testing...
            </Text>
          </>
        ) : (
          <>
            <Ionicons name="flash" size={24} color="#FFF" />
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>
              Run Verification Test (Synthetic)
            </Text>
          </>
        )}
      </Pressable>

      {/* Results */}
      {result && (
        <View
          style={{
            backgroundColor: theme.card,
            padding: 20,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: result.success ? '#4CAF50' : '#FF4444',
          }}
        >
          {/* Overall Status */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 20,
              paddingBottom: 20,
              borderBottomWidth: 1,
              borderBottomColor: theme.cardBorder,
            }}
          >
            <Text style={{ fontSize: 40, marginRight: 12 }}>
              {result.success ? '🎉' : '❌'}
            </Text>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: theme.text,
                  fontSize: 20,
                  fontWeight: '800',
                }}
              >
                {result.success ? 'ALL TESTS PASSED' : 'TESTS FAILED'}
              </Text>
              {result.success && (
                <Text style={{ color: theme.text, opacity: 0.7, marginTop: 4 }}>
                  Ready for Day 2 deployment
                </Text>
              )}
            </View>
          </View>

          {/* Step Results */}
          <Text
            style={{
              color: theme.text,
              fontSize: 16,
              fontWeight: '700',
              marginBottom: 12,
            }}
          >
            Test Steps:
          </Text>

          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 24 }}>{getStepIcon(result.steps.auth)}</Text>
              <Text
                style={{
                  color: getStepColor(result.steps.auth),
                  fontSize: 15,
                  fontWeight: '600',
                }}
              >
                Firebase Authentication
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 24 }}>
                {getStepIcon(result.steps.apiEndpoint)}
              </Text>
              <Text
                style={{
                  color: getStepColor(result.steps.apiEndpoint),
                  fontSize: 15,
                  fontWeight: '600',
                }}
              >
                API Endpoint Configuration
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 24 }}>
                {getStepIcon(result.steps.presignedUrl)}
              </Text>
              <Text
                style={{
                  color: getStepColor(result.steps.presignedUrl),
                  fontSize: 15,
                  fontWeight: '600',
                }}
              >
                Presigned URL Generation
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 24 }}>
                {getStepIcon(result.steps.s3Upload)}
              </Text>
              <Text
                style={{
                  color: getStepColor(result.steps.s3Upload),
                  fontSize: 15,
                  fontWeight: '600',
                }}
              >
                S3 Upload
              </Text>
            </View>
          </View>

          {/* Session Data */}
          {result.success && result.data && (
            <View
              style={{
                marginTop: 20,
                padding: 16,
                backgroundColor: theme.background,
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  color: theme.text,
                  fontSize: 14,
                  fontWeight: '700',
                  marginBottom: 8,
                }}
              >
                📋 Verification Data:
              </Text>
              <Text
                style={{
                  color: theme.text,
                  opacity: 0.8,
                  fontSize: 12,
                  fontFamily: 'monospace',
                  lineHeight: 20,
                }}
              >
                Session: {result.data.sessionId.substring(0, 20)}...{'\n'}
                S3 Key: {result.data.s3Key.substring(0, 40)}...{'\n'}
                User: {result.data.userId.substring(0, 20)}...
              </Text>
            </View>
          )}

          {/* Error Message */}
          {result.error && (
            <View
              style={{
                marginTop: 20,
                padding: 16,
                backgroundColor: '#FF4444',
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  color: '#FFF',
                  fontSize: 14,
                  fontWeight: '700',
                  marginBottom: 8,
                }}
              >
                ⚠️ Error Details:
              </Text>
              <Text
                style={{
                  color: '#FFF',
                  fontSize: 13,
                  lineHeight: 20,
                }}
              >
                {result.error}
              </Text>
            </View>
          )}

          {/* Next Steps */}
          {result.success && (
            <View
              style={{
                marginTop: 20,
                padding: 16,
                backgroundColor: theme.background,
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  color: theme.text,
                  fontSize: 14,
                  fontWeight: '700',
                  marginBottom: 8,
                }}
              >
                🚀 Next Steps:
              </Text>
              <Text style={{ color: theme.text, opacity: 0.8, lineHeight: 20 }}>
                1. Check AWS S3 Console for uploaded file{'\n'}
                2. Verify CloudWatch logs show successful Lambda execution{'\n'}
                3. Check DynamoDB for session record{'\n'}
                4. Deploy Lambda #2 (Transcribe trigger){'\n'}
                5. Deploy Lambda #3 (Bedrock analysis){'\n'}
                6. Integrate Agora RTM for real-time results
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Instructions */}
      {!result && !testing && (
        <View
          style={{
            backgroundColor: theme.card,
            padding: 20,
            borderRadius: 12,
          }}
        >
          <Text
            style={{
              color: theme.text,
              fontSize: 16,
              fontWeight: '700',
              marginBottom: 12,
            }}
          >
            📚 Before Testing:
          </Text>
          <Text style={{ color: theme.text, opacity: 0.8, lineHeight: 22 }}>
            1. Ensure you're signed in with Firebase{'\n'}
            2. Set EXPO_PUBLIC_API_ENDPOINT in .env{'\n'}
            3. Deploy Lambda #1 (presigned-upload){'\n'}
            4. Create S3 bucket (triage-recordings){'\n'}
            5. Configure API Gateway endpoint{'\n\n'}
            This test will verify your entire upload pipeline in 30 seconds.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
