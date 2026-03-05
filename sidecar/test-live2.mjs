import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function run() {
    try {
        console.log("Connecting...");
        const liveSession = await ai.live.connect({
            model: 'gemini-2.0-flash-exp',
            config: {
                systemInstruction: { parts: [{ text: "Hello" }] },
                tools: [{
                    functionDeclarations: [{
                        name: "execute_action",
                        description: "System tools",
                        parameters: {
                            type: Type.OBJECT,
                            properties: {
                                action: { type: Type.STRING },
                                target: { type: Type.STRING },
                                args: { type: Type.STRING }
                            }
                        }
                    }]
                }]
            },
            callbacks: {
                onmessage: (msg) => {
                    console.log("onmessage:", JSON.stringify(msg).substring(0, 100));
                },
                onopen: () => console.log('OPENED'),
                onerror: (e) => console.log('ERROR', e),
                onclose: (e) => console.log('CLOSED', e)
            }
        });

        console.log("Session connect call finished.");

        liveSession.send({
            clientContent: {
                turns: [{
                    role: 'user',
                    parts: [{ text: "Hello!" }]
                }],
                turnComplete: true
            }
        });

        setTimeout(() => process.exit(0), 3000);
    } catch (e) {
        console.error("Connect error:", e);
    }
}
run();
