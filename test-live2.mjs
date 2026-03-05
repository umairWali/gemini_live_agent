import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

// Ensure API key is found
const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("API_KEY missing");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

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
            }
        });

        console.log("Session connected. Sending some dummy text...");
        // the new sdk approach
        liveSession.send({
            clientContent: {
                turns: [{
                    role: 'user',
                    parts: [{ text: "Hello!" }]
                }],
                turnComplete: true
            }
        });

        liveSession.receive().forEach((msg) => {
            console.log("Received a message (iterator):", JSON.stringify(msg));
        });
        console.log("Waiting...");
    } catch (e) {
        console.error("Connect error:", e);
    }
}
run();
