<div align="center">
  <h1> Personal Operator</h1>
  <i>A Next-Generation Real-Time Voice AI Agent powered by Gemini 2.5 Live API</i>
  <br/><br/>
  <b>Built for the Gemini Live Agent Challenge — Live Agents 🗣 Category</b>
  <br/><br/>
  <a href="https://personal-ai-operator-677446941082.us-central1.run.app/"> Live Demo</a> |
  <a href="./ARCHITECTURE.md"> Architecture Diagram</a>
</div>

---

##  What Problem Does It Solve?

Most AI assistants feel slow and robotic — they wait for you to finish speaking, then take seconds to respond. **Personal Operator** eliminates this friction by enabling **natural, interruption-friendly real-time voice conversations** powered by Google Gemini 2.5 Native Audio Live API.

It goes beyond a chatbot — it's a **personal system orchestrator** you can *talk* to. It monitors your infrastructure, tracks your missions, and acts autonomously on your behalf.

---

##  Key Features

| Feature | Description |
|---|---|
|  **Real-Time Voice Streaming** | Bidirectional PCM audio streaming at 16kHz using Gemini Live API |
|  **Zero Delay Interruption** | VAD-based barge-in: interrupt Gemini mid-sentence naturally |
|  **Live Transcription** | Shows what you said and what Gemini replied, in real-time text |
|  **Bilingual** | Understands and responds in Urdu + English natively |
|  **Screen Vision** | Share your screen and let Gemini "see" and comment on it |
|  **Autonomous Missions** | AI autonomously tracks and updates your active goals |
|  **System Health Monitor** | Real-time CPU/RAM monitoring with HUD dashboard |
|  **Live Tool Execution** | Voice-triggered shell commands, code fixes, file operations |
|  **Cloud Native** | Fully deployed on Google Cloud Run |

---

##  Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER (React)                          │
│  ┌──────────────┐   PCM Audio   ┌────────────────────────────┐  │
│  │ Microphone   │──────────────▶│    AudioWorklet Processor  │  │
│  │ (16kHz)      │               │    (VAD + Buffering)       │  │
│  └──────────────┘               └────────────┬───────────────┘  │
│                                              │ Base64 PCM        │
│  ┌───────────────────┐                       │ WebSocket Msg     │
│  │  UI / HUD / Chat  │◀─────────────────────┐│                   │
│  │  Visualizers      │  VOICE_TEXT / AUDIO   ││                   │
│  └───────────────────┘                       ││                   │
└──────────────────────────────────────────────┼┼───────────────────┘
                                               ││
                              WebSocket (/ws/) ││
                                               ││
┌──────────────────────────────────────────────┼┼───────────────────┐
│             GOOGLE CLOUD RUN (Node.js)        ││                   │
│                                               ▼│                   │
│  ┌────────────────────────────────────────────┐│                   │
│  │           server.ts (Express + WS)         ││                   │
│  │  ┌────────────────────────────────────┐    ││                   │
│  │  │  Gemini Live Session Manager       │    ││                   │
│  │  │  ┌──────────────────────────────┐  │    ││                   │
│  │  │  │ ai.live.connect(callbacks)   │  │    ││                   │
│  │  │  │  onmessage → VOICE_RESPONSE  │  │◀───┘│                   │
│  │  │  │  onopen → VOICE_READY        │  │     │                   │
│  │  │  └──────────────┬───────────────┘  │     │                   │
│  │  └─────────────────┼───────────────────┘     │                   │
│  └────────────────────┼─────────────────────────┘                   │
│                       │ sendRealtimeInput({audio})                    │
│                       ▼                                               │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │            GEMINI 2.5 NATIVE AUDIO LIVE API                  │    │
│  │  wss://generativelanguage.googleapis.com/...                 │    │
│  │  Model: gemini-2.5-flash-native-audio-latest                 │    │
│  └──────────────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────────────┘
```

---

##  Running Locally (Spin-Up Instructions)

### Prerequisites
- Node.js v20+
- A valid [Google Gemini API Key](https://aistudio.google.com/app/apikey)

### 1. Clone & Install
```bash
git clone https://github.com/Musab1khan/gemini_live_agent.git
cd gemini_live_agent
npm install
```

### 2. Set Environment
```bash
export API_KEY="your_gemini_api_key_here"
```

### 3. Build
```bash
npm run build
```

### 4. Start
```bash
npm start
```
App will be available at `http://localhost:3000`

>  Chrome requires HTTPS or `localhost` for microphone access.

---

##  Cloud Deployment (Automated)

This project earns the **Infrastructure-as-Code bonus** with a fully automated deploy script.

### Prerequisites
- [gcloud CLI](https://cloud.google.com/sdk/docs/install) installed and authenticated
- Cloud Run & Cloud Build APIs enabled

### One-Command Deploy
```bash
export API_KEY="your_api_key"
npm run build && ./deploy.sh
```

The `deploy.sh` script automatically:
- Builds a Docker container using Cloud Build
- Pushes and deploys to Cloud Run (region: `us-central1`)
- Sets environment variables securely
- Configures unauthenticated public access

### Manual Deploy (alternative)
```bash
gcloud run deploy personal-ai-operator \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="API_KEY=$API_KEY"
```

---

##  Tech Stack

| Technology | Purpose |
|---|---|
| **Gemini 2.5 Flash Native Audio Live** | Real-time Bidirectional Voice AI |
| **@google/genai SDK v1.41+** | Official Google GenAI SDK for Live API |
| **React 19 + TypeScript** | Frontend UI |
| **Node.js + Express** | Backend WebSocket Server |
| **Web Audio API + AudioWorklet** | Low-latency PCM Microphone Processing |
| **Google Cloud Run** | Serverless Container Hosting |
| **WebSocket (ws)** | Real-time Browser ↔ Server communication |

---

##  Hackathon Compliance

 **Live Agents Category** — Real-time interruption-capable voice agent  
 **Gemini Live API** — `ai.live.connect()` with `onmessage` callbacks  
 **@google/genai SDK** — Official Google GenAI SDK  
 **Google Cloud Run** — Backend deployed and live  
 **Automated Deployment** — `deploy.sh` IaC script (bonus)  
 **Multimodal** — Voice + Screen Vision + Text + Audio Output  
 **Architecture Diagram** — Included in this README  

---

##  Live URLs

- **App**: https://personal-ai-operator-677446941082.us-central1.run.app/
- **API Key Model**: `gemini-2.5-flash-native-audio-latest`
