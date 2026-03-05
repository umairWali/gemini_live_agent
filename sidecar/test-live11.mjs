import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function run() {
    try {
        console.log("Connecting...");
        const liveSession = await ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-latest',
            callbacks: {
                onclose: (e) => console.log('CLOSED', e.reason, e.code),
                onopen: () => console.log('OPEN')
            }
        });
        console.log("connected");
        setTimeout(() => process.exit(0), 4000);
    } catch (e) {
        console.error("Connect error:", e);
    }
}
run();
