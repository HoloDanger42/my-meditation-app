# Step 3: Call Specialist Button 📞

**Goal:** After diagnosis appears, patient can call a specialist via Agora video/voice.

---

## Current State

✅ Mobile app shows diagnosis card with urgency level  
✅ Web dashboard displays patient data  
⏳ "Call Specialist" button needs Agora integration

---

## Integration Point in Mobile App

The diagnosis card is displayed by `ResultCard.tsx`. We need to add a button that triggers the Agora call.

### Location to Add Button

`components/ResultCard.tsx` - Add after the diagnosis information, before the card closes.

### What the Button Should Do

When tapped:
1. Extract `userId` and `sessionId` from the current session
2. Call Agora setup function (provided by Web Team)
3. Join video/voice channel with specialist
4. Display in-call UI

---

## Code Template for Agora Team

**What you need from your teammates:**

```typescript
// Request this from your Agora team:

export interface AgoraCallConfig {
  appId: string;
  channel: string;
  token: string;
  userId: string;
}

export async function initializeAgoraCall(
  config: AgoraCallConfig
): Promise<void> {
  // Their implementation here
  // Should handle:
  // - RTC engine initialization
  // - Channel join
  // - Local/remote video streams
  // - Call controls (mute, hang up)
}
```

---

## Fallback if Agora Team Only Built for Web

If your teammates only implemented Agora for Web (React), you'll need to adapt it for React Native:

### Install Agora React Native SDK

```bash
npm install react-native-agora
npx expo prebuild
```

### Basic Agora Voice Call Setup

```typescript
// utils/agoraCall.ts
import { createAgoraRtcEngine, ChannelProfileType, ClientRoleType } from 'react-native-agora';

const APP_ID = 'YOUR_AGORA_APP_ID';

export async function startVoiceCall(
  channelName: string,
  token: string,
  userId: string
) {
  const engine = createAgoraRtcEngine();
  
  await engine.initialize({ appId: APP_ID });
  await engine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
  await engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
  
  // Enable audio
  await engine.enableAudio();
  
  // Join channel
  await engine.joinChannel(token, channelName, 0, { uid: userId });
  
  return engine;
}

export async function endCall(engine: any) {
  await engine.leaveChannel();
  await engine.release();
}
```

---

## Adding Button to ResultCard

### Modify `components/ResultCard.tsx`

Add this after the suggested action section:

```tsx
{result.urgency === 'High' && (
  <Pressable
    onPress={() => handleCallSpecialist()}
    style={{
      backgroundColor: '#FF4444',
      padding: 16,
      borderRadius: 12,
      marginTop: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    }}
  >
    <Ionicons name="call" size={24} color="#FFF" />
    <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '700' }}>
      Call Specialist Now
    </Text>
  </Pressable>
)}
```

Handler:
```typescript
const handleCallSpecialist = async () => {
  try {
    // Option A: Your teammates' Agora implementation
    await initializeAgoraCall({
      appId: 'YOUR_APP_ID',
      channel: `triage-${sessionId}`,
      token: 'YOUR_TOKEN',
      userId: currentUserId,
    });
    
    // Option B: Navigate to in-call screen
    router.push(`/call/${sessionId}`);
  } catch (error) {
    Alert.alert('Call Failed', 'Could not connect to specialist');
  }
};
```

---

## Channel Naming Convention

Use consistent channel names so Web dashboard can join the same call:

```
Channel Name: triage-{sessionId}
Example: triage-session-40fa84fc-32c5-4f32-a70f-afce9991c400
```

This way:
- Mobile patient joins `triage-{sessionId}`
- Web doctor joins same channel name
- They connect automatically

---

## Token Generation

**Security Warning:** Never hardcode Agora tokens in the app.

**Proper Flow:**
1. Call your backend: `POST /agora/token`
2. Backend generates temporary token (Agora SDK)
3. Return token to app
4. Use token to join channel

**Hackathon Shortcut (not production):**
- Use Agora Console to generate 24-hour test tokens
- Paste in env variable: `EXPO_PUBLIC_AGORA_TOKEN`

---

## What to Tell Your Teammates

> **"I need the Agora call setup function for React Native.**
> 
> **Input:** `{ appId, channel, token, userId }`
> 
> **Output:** Initializes call and returns engine reference
> 
> **Channel naming:** Use `triage-{sessionId}` so Web dashboard can join the same call.
> 
> **If you only have Web code:** Share your Web implementation, I'll adapt it to React Native."**

---

## Minimal Test Without Full Integration

If Agora integration is blocked, you can stub the button for demo:

```tsx
const handleCallSpecialist = () => {
  Alert.alert(
    'Connecting to Specialist',
    'In production, this would initiate a video call via Agora',
    [
      { text: 'Cancel' },
      { text: 'Simulate Call', onPress: () => console.log('Call started') }
    ]
  );
};
```

This shows the judge the UX flow even if real-time calling isn't fully wired.

---

## Next Steps

1. **Add "Call Specialist" button to ResultCard** (high urgency cases only)
2. **Get Agora setup code from teammates** (or adapt their Web code)
3. **Test with fake channel** (join from mobile, join from Web, verify connection)
4. **Demo flow:** Record symptoms → Diagnosis → Call button → Video connects

---

## Success Criteria

✅ Diagnosis card shows "Call Specialist" button for High urgency  
✅ Button tap initiates Agora connection  
✅ Doctor on Web dashboard can join same channel  
✅ Audio/video streams work both directions

---

**Current Priority:** Since Agora RTM can't be done, focus on getting the polling loop working (Step 1) and giving Web Team the API endpoint (Step 2). The call button can be added later when teammates provide Agora client code.
