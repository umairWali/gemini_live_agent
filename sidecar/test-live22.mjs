import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function run() {
    try {
        console.log("Connecting...");
        const liveSession = await ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-latest',
            config: {
                systemInstruction: { parts: [{ text: "Hello" }] }
                // no responseModalities 
            },
            callbacks: {
                onmessage: (msg) => {
                    console.log('msg!', JSON.stringify(msg).substring(0, 200));
                },
                onclose: (e) => console.log('CLOSED', e.reason, e.code),
                onopen: () => console.log('OPEN')
            }
        });
        console.log("connected");
        liveSession.sendClientContent([{
            role: 'user',
            parts: [{ text: "Hello! the sky is blue." }]
        }]);
        setTimeout(() => process.exit(0), 10000);
    } catch (e) {
        console.error("Connect error:", e);
    }
}
run();
