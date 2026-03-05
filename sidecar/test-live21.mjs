import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function run() {
    try {
        console.log("Connecting...");
        const liveSession = await ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-latest',
            config: {
                systemInstruction: { parts: [{ text: "Respond with the word 'Hello' when you hear audio." }] },
                responseModalities: ["AUDIO"]
            },
            callbacks: {
                onmessage: (msg) => {
                    console.log('msg!', JSON.stringify(msg).substring(0, 200));
                    if (msg.serverContent?.modelTurn) {
                        console.log('MODEL TURN!');
                    }
                },
                onclose: (e) => console.log('CLOSED', e.reason, e.code),
                onopen: () => console.log('OPEN')
            }
        });
        console.log("connected");

        let pcmData = new Int16Array(24000 * 2).fill(0); // 2 seconds of silence/noise? Wait, silence might not trigger it. Let's add noise.
        for (let i = 0; i < pcmData.length; i++) {
            pcmData[i] = Math.random() * 10000 - 5000;
        }

        const bytes = new Uint8Array(pcmData.buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i += 8192) {
            binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
        }
        let b64 = btoa(binary);

        liveSession.sendRealtimeInput([{
            data: b64,
            mimeType: 'audio/pcm;rate=24000'
        }]);

        console.log("Sent audio.");
        setTimeout(() => {
            console.log("Ending turn...");
            try {
                liveSession.sendClientContent([{ role: 'user', parts: [{ text: "" }] }], { turnComplete: true });
            } catch (e) { }
        }, 3000);
        setTimeout(() => process.exit(0), 15000);
    } catch (e) {
        console.error("Connect error:", e);
    }
}
run();
