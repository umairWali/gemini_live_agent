# Personal AI Operator - Technical Deployment Guide

This document provides a comprehensive overview of the system architecture, core features, and deployment instructions for the Personal AI Operator. This project utilizes the Google Gemini 2.5 Flash Native Audio API to create a low-latency, multimodal orchestrator.

---

## Technical Overview and Features

The application has been transformed into an elite AI Sidecar with advanced system integration and real-time visualization capabilities.

### 1. Multimodal Interaction Engine
- Voice Intelligence: Utilizing high-fidelity PCM audio streaming (16kHz) for near-instant response times.
- Vision Integration: Dual-stream support for real-time Screen Sharing and Webcam feeds, allowing the AI to "see" and analyze visual context.
- Interruption Management: A dynamic sensitivity slider allows users to tune the Voice Activity Detection (VAD) responsiveness, enabling natural dialogue.

### 2. Intelligent Context and Memory
- Neural Knowledge Graph: Real-time visualization of facts and relationships extracted from conversations. The memory persists across sessions (default persona: Umair).
- Deep Context HUD: A specific visual indicator in the UI that tracks when files (code, documents) are attached, providing specialized analysis focus.
- Empathy Engine: Backend sentiment analysis that detects user emotion (Happy, Normal, Angry) and visually adjusts the UI accent colors and pulsars.

### 3. Autonomous System Orchestration
- Real Command Execution: Beyond basic chat, the agent can execute legitimate system commands (Bash) to perform tasks like listing files, checking system health, or managing processes.
- Security Sandbox: Commands are filtered through a security layer to prevent destructive actions while allowing deep system inspection.

---

## Local Development Setup

To run the Personal AI Operator in a local environment, follow these steps:

1. Environment Configuration
Define your API key in the terminal session:
```bash
export API_KEY='AIzaSyCI...E'
```

2. Start Backend Infrastructure
Start the Node.js/TypeScript sidecar server:
```bash
cd /root/personal-ai-operator
npx tsx sidecar/server.ts
```

3. Initialize Frontend Dashboard
In a separate terminal, start the Vite development server:
```bash
cd /root/personal-ai-operator
npm run dev
```
Navigate to http://localhost:5173 to access the dashboard.

---

## Production Deployment (Google Cloud Run)

The project is optimized for Google Cloud Run deployment. The automated pipeline handles building the production bundle and containerizing the application.

Build and Deploy Sequence:
```bash
cd /root/personal-ai-operator
npm run build && ./deploy.sh
```

The deploy script performs the following:
- Executes Vite production build.
- Packages the frontend as static assets for the Express sidecar.
- Builds a Docker container using Google Cloud Build.
- Deploys a new revision to Cloud Run with public unauthenticated access enabled.

---

## Infrastructure Specifications

- LLM Provider: Google Gemini API
- Primary Model: models/gemini-2.5-flash-native-audio-latest
- Frontend Stack: React 18, Tailwind CSS, Lucide Icons, Framer Motion
- Backend Stack: Node.js, Express, WebSocket (WS), Google GenAI SDK
- Live URL: https://personal-ai-operator-677446941082.us-central1.run.app/
- Repository: https://github.com/Musab1khan/gemini_live_agent.git
