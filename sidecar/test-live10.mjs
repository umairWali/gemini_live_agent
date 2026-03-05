import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function run() {
    try {
        console.log("Connecting...");
        const liveSession = await ai.live.connect({
            model: 'gemini-2.0-flash-exp',
            callbacks: {
                onclose: (e) => console.log('CLOSED', e.reason, e.code)
            }
        });
        console.log("connected");
        setTimeout(() => process.exit(0), 4000);
    } catch (e) {
        console.error("Connect error:", e);
    }
}
run();
