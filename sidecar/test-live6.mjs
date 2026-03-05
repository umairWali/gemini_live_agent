import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function run() {
    try {
        console.log("Connecting...");
        const liveSession = await ai.live.connect({
            model: 'models/gemini-2.5-flash-native-audio-latest',
            config: {
                systemInstruction: { parts: [{ text: "Hello" }] },
                responseModalities: ["AUDIO", "TEXT"]
            },
            callbacks: {
                onmessage: (msg) => {
                    console.log("onmessage:", JSON.stringify(msg).substring(0, 100));
                },
                onopen: () => console.log('OPENED'),
                onerror: (e) => console.log('ERROR', e),
                onclose: (e) => console.log('CLOSED', e.reason, e.code)
            }
        });

        console.log("connected", !!liveSession.send);
        try {
            liveSession.send({
                clientContent: {
                    turns: [{
                        role: 'user',
                        parts: [{ text: "Hello!" }]
                    }],
                    turnComplete: true
                }
            });
        } catch (e) { console.error("Send error", e); }
        setTimeout(() => process.exit(0), 4000);
    } catch (e) {
        console.error("Connect error:", e);
    }
}
run();
