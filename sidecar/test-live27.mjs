import { GoogleGenAI } from '@google/genai';
import fs from 'fs';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function run() {
    try {
        console.log("Connecting...");
        const liveSession = await ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-latest',
            config: {
                systemInstruction: { parts: [{ text: "Hello, you are my helpful voice assistant. You must respond!" }] },
                responseModalities: ["AUDIO"]
            },
            callbacks: {
                onmessage: (msg) => {
                    console.log('msg!', JSON.stringify(msg).substring(0, 150));
                    if (msg.serverContent?.modelTurn?.parts) {
                        for (const p of msg.serverContent.modelTurn.parts) {
                            if (p.inlineData?.data) {
                                console.log("RECEIVED AUDIO RESPONSE!! Length:", p.inlineData.data.length);
                            }
                        }
                    }
                },
                onclose: (e) => console.log('CLOSED', e.reason, e.code),
                onopen: () => console.log('OPEN')
            }
        });
        console.log("connected");

        const audioBuffer = fs.readFileSync('test.pcm');
        // Pad with 3 seconds of silence (3 * 24000 * 2 bytes)
        const silence = new Uint8Array(24000 * 2 * 3);
        const fullBuffer = new Uint8Array(audioBuffer.length + silence.length);
        fullBuffer.set(new Uint8Array(audioBuffer), 0);
        fullBuffer.set(silence, audioBuffer.length);

        console.log("Streaming audio...");
        let offset = 0;
        const interval = setInterval(() => {
            if (offset >= fullBuffer.length) {
                clearInterval(interval);
                console.log("Audio completely sent. Waiting for VAD trigger...");
                return;
            }
            const chunk = fullBuffer.subarray(offset, offset + 4096); // ~85ms
            let binary = '';
            for (let i = 0; i < chunk.length; i += 8192) {
                binary += String.fromCharCode(...chunk.subarray(i, i + 8192));
            }
            let b64 = btoa(binary);

            liveSession.sendRealtimeInput([{
                data: b64,
                mimeType: 'audio/pcm;rate=24000'
            }]);
            offset += 4096;
        }, 85);

        setTimeout(() => process.exit(0), 10000);
    } catch (e) {
        console.error("Connect error:", e);
    }
}
run();
