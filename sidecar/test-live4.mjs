import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function run() {
    try {
        console.log("Connecting...");
        const liveSession = await ai.live.connect({
            model: 'gemini-2.0-flash-exp',
            config: {
                systemInstruction: { parts: [{ text: "Hello" }] },
                responseModalities: ["AUDIO", "TEXT"]
            }
        });

        console.log("connected", !!liveSession.send);
        liveSession.on('open', () => console.log('o'));
        liveSession.on('close', (e) => console.log('c', e));
        liveSession.on('error', (e) => console.log('er', e));
        liveSession.on('message', (e) => console.log('m', e));
        liveSession.sendClientContent([{ role: 'user', parts: [{ text: 'hello' }] }]);
        setTimeout(() => process.exit(0), 4000);
    } catch (e) {
        console.error("Connect error:", e);
    }
}
run();
