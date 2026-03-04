<div align="center">
  <h1>Personal AI Operator</h1>
  <i>A Next-Generation Voice-First Assistant powered by Gemini Live API</i>
  <br/><br/>
  <b>Built for the Gemini Live Agent Challenge (Live Agents Category)</b>
</div>

---

## Overview

The **Personal AI Operator** is a real-time, bidirectional voice agent that acts as your smart, context-aware companion. It breaks out of the standard "chatbot text box" paradigm by enabling true, fluid voice conversations. You speak naturally to it, and it responds intelligently with spoken audio in real-time.

**Category**: Live Agents  
**Technologies**: React (Frontend), Node.js (Backend), Google GenAI SDK (`gemini-live-2.5-flash-preview`), WebSockets, Google Cloud Run.

### Key Features
- **Real-Time Voice Streaming**: Uses the Gemini Live API via WebSockets for sub-second bidirectional audio streaming (no browser-based pseudo-TTS).
- **Interruption Handling**: The agent understands when you interrupt it (barge-in capability) naturally.
- **Multimodal Feedback**: Streams audio while simultaneously updating a synchronized text UI.
- **Bilingual**: Understands and responds in Urdu and English natively.
- **Cloud Native**: Deployed on Google Cloud Run for high scalability.

- **Neural Knowledge Graph (Visual Memory)**: An interactive 2D graph in the "Memory" tab that visualizes the AI's long-term understanding of your persona, projects, and preferences.
- **Multi-Agent War Room**: Visualizes the internal state of different agent roles (Planner, Executor, Healer, etc.) in real-time as they collaborate to solve your tasks.
- **Autonomous Mission Board**: A persistent goal-tracking system in the sidebar. The agent autonomously updates your "Missions" as you progress through tasks.
- **Developer Fix Agent**: Uses `run_fix` tool to autonomously analyze build errors or code bugs and attempt an immediate patch.
- **Meeting Minute Assistant**: Enable Screen Share during Google Meet/Teams. The agent uses Vision frames to prepare minutes, identify speakers, and extract action items directly into your Mission Board.
- **Daily Elite Briefing**: Every time you connect, the agent proactively provides a spoken summary of your active goals, system status, and pending reminders.
- **Live Desktop Vision**: Real-time screen capture streaming into the Gemini Live session for visual-context-aware conversations.
- **Dynamic Tool Calling**: Autonomous execution of local system actions (commands, files, dirs) directly from the live voice session.
- **Sentiment-Aware UI**: Real-time UI theme shifting based on voice sentiment analysis (Happy/Angry/Normal).
- **Session History**: Persistent storage for previous voice sessions.

---

## Architecture

See our [architecture.md](./architecture.md) representation showing how the frontend, WebSocket server, and Gemini Live API coordinate raw PCM audio chunks.

---

## Running the Project Locally (Spin-up Instructions)

Follow these steps to reproduce and run the project locally.

### Prerequisites
- Node.js (v20+)
- Google Cloud Account with an active project
- A valid Gemini API Key (`API_KEY`)

### 1. Clone & Install
```bash
git clone https://github.com/Musab1khan/gemini_live_agent.git
cd gemini_live_agent
npm install
```

### 2. Configure Environment variables
Create a `.env` file in the root directory and add your API Key:
```env
API_KEY=your_gemini_api_key_here
```

### 3. Build the Application
Compile the React frontend and TypeScript sidecar server:
```bash
npm run build
```

### 4. Start the Application
Start the Node.js Express server with the WebSocket bridge:
```bash
npm start
```
*The app will be available at `http://localhost:8080`*

*(Note: Modern browsers require HTTPS or `localhost` for microphone access via navigator.mediaDevices).*

---

## Google Cloud Deployment (Automated)

This project features Infrastructure-as-Code automation to earn the Cloud Deployment bonus point.

### Prerequisites
- Install the [Google Cloud CLI (`gcloud`)](https://cloud.google.com/sdk/docs/install)
- Authenticate via `gcloud auth login`
- Set your target project: `gcloud config set project [YOUR_PROJECT_ID]`
- Enable Cloud Run Admin and Cloud Build APIs.

### One-Click Deploy Script
We have included a custom `./deploy.sh` script to automate building and pushing to Cloud Run seamlessly:

```bash
export API_KEY="your_api_key"
./deploy.sh
```

Alternatively, you can manually trigger Google Cloud Run:
```bash
gcloud run deploy personal-ai-operator --source . --region us-central1 --allow-unauthenticated --set-env-vars="API_KEY=$API_KEY"
```

---

## Hackathon Compliance
- Built specifically for the Live Agents Category.
- Uses Gemini Live API (ai.live.connect) over WebSockets.
- Uses @google/genai (Google GenAI SDK v1.41.0+).
- Cloud Native deployment via Google Cloud Run.
- Architecture Diagram included (`architecture.md`).
- Fully supports English & Urdu language.
