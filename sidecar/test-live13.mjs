import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function run() {
    try {
        console.log("Connecting...");
        const liveSession = await ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-latest',
            config: {
                systemInstruction: { parts: [{ text: "Hello" }] },
                responseModalities: ["AUDIO"]
            },
            callbacks: {
                onmessage: (msg) => { console.log('msg!'); },
                onclose: (e) => console.log('CLOSED', e.reason, e.code),
                onopen: () => console.log('OPEN')
            }
        });
        console.log("connected");
        liveSession.send({
            clientContent: {
                turns: [{ role: 'user', parts: [{ text: "Hello!" }] }],
                turnComplete: true
            }
        });
        setTimeout(() => process.exit(0), 4000);
    } catch (e) {
        console.error("Connect error:", e);
    }
}
run();
