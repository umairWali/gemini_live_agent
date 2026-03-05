import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, httpOptions: { apiVersion: 'v1alpha' } });

async function run() {
    try {
        console.log("Connecting...");
        const liveSession = await ai.live.connect({
            model: 'gemini-2.0-flash-exp',
            config: {
                systemInstruction: { parts: [{ text: "Hello" }] },
                responseModalities: ["AUDIO", "TEXT"]
            },
            callbacks: {
                onmessage: (msg) => {
                    console.log("onmessage length:", JSON.stringify(msg).length);
                },
                onopen: () => console.log('OPENED'),
                onerror: (e) => console.log('ERROR', e),
                onclose: (e) => console.log('CLOSED', e.reason, e.code)
            }
        });

        console.log("connected");
        try {
            liveSession.sendClientContent([{ role: 'user', parts: [{ text: 'hello' }] }]);
        } catch (e) { console.error("Send error", e); }
        setTimeout(() => process.exit(0), 4000);
    } catch (e) {
        console.error("Connect error:", e);
    }
}
run();
