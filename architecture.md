# System Architecture Diagram

This diagram visualizes how the Personal AI Operator interacts with the Google GenAI SDK and handles real-time audio through WebSockets.

```mermaid
sequenceDiagram
    participant User
    participant Frontend UI (React)
    participant Backend (Node.js/Cloud Run)
    participant Gemini Live API
    
    User->>Frontend UI (React): Clicks Microphone
    Frontend UI (React)->>Frontend UI (React): getUserMedia(16kHz audio)
    Frontend UI (React)->>Backend (Node.js/Cloud Run): START_VOICE (WebSocket)
    Backend (Node.js/Cloud Run)->>Gemini Live API: ai.live.connect()
    Gemini Live API-->>Backend (Node.js/Cloud Run): Session Connected
    Backend (Node.js/Cloud Run)-->>Frontend UI (React): VOICE_READY
    
    loop Every Audio Frame
        User-->>Frontend UI (React): Speaks commands
        Frontend UI (React)->>Backend (Node.js/Cloud Run): VOICE_AUDIO (b64 PCM 16kHz)
        Backend (Node.js/Cloud Run)->>Gemini Live API: session.sendRealtimeInput(audio)
    end
    
    loop API Processing
        Gemini Live API-->>Backend (Node.js/Cloud Run): Audio Parts / Response Text
        Backend (Node.js/Cloud Run)-->>Frontend UI (React): VOICE_RESPONSE (b64 PCM 24kHz)
        Frontend UI (React)->>User: AudioContext Playback (Speaks)
        Backend (Node.js/Cloud Run)-->>Frontend UI (React): VOICE_TEXT (Real-time transcription)
        Frontend UI (React)->>Frontend UI (React): Updates Chat Bubble Output
    end

    User->>Frontend UI (React): Clicks Microphone Off
    Frontend UI (React)->>Backend (Node.js/Cloud Run): STOP_VOICE (WebSocket)
    Backend (Node.js/Cloud Run)->>Gemini Live API: session.close()
    Gemini Live API-->>Backend (Node.js/Cloud Run): Session Closed
```
