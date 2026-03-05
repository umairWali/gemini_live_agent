import { GoogleGenAI, Type } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
async function run() {
    try {
        console.log("Connecting...");
        const liveSession = await ai.live.connect({
            model: 'gemini-2.0-flash-exp'
        });
        console.log("Methods:", Object.keys(liveSession));
        console.log("Prototype:", Object.getOwnPropertyNames(Object.getPrototypeOf(liveSession)));
        process.exit(0);
    } catch(e) { console.error(e); }
}
run();
