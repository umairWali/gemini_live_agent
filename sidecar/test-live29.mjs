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

        const audioBuffer = fs.readFileSync('test16.pcm');
        let binary = '';
        for (let i = 0; i < audioBuffer.length; i += 8192) {
            binary += String.fromCharCode(...audioBuffer.subarray(i, i + 8192));
        }
        let b64 = btoa(binary);

        try {
            liveSession.sendClientContent([{
                role: 'user',
                parts: [{
                    inlineData: {
                        mimeType: 'audio/pcm;rate=16000',
                        data: b64
                    }
                }]
            }]);
            console.log("Sent clientContent with Audio");
        } catch (e) { console.error("Send Error:", e); }

        setTimeout(() => process.exit(0), 10000);
    } catch (e) {
        console.error("Connect error:", e);
    }
}
run();
