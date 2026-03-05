import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
async function run() {
    try {
        console.log("Connecting...");
        const liveSession = await ai.live.connect({
            model: 'gemini-2.0-flash-exp', // Or 'models/gemini-2.0-flash-exp'
            config: {
                systemInstruction: { parts: [{ text: "Hello" }] }
            }
        });
        console.log("Connected.");
        liveSession.on('close', () => console.log('Closed'));
        liveSession.on('error', (e) => console.log('Error', e));
        setTimeout(() => process.exit(0), 2000);
    } catch(e) {
        console.error("Connect error:", e);
    }
}
run();
