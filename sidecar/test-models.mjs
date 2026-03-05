import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function run() {
    try {
        const response = await ai.models.list(); // or similar method to list models
        for await (const model of ai.models.list()) {
            if (model.name.includes('gemini-2.0')) {
                console.log(model.name, "supportedGenerateMethods:", model.supportedGenerateMethods);
            }
        }
    } catch (e) {
        console.error("Connect error:", e);
    }
}
run();
