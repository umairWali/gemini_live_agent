
import { GoogleGenAI, Type } from "@google/genai";

export const getAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const summarizeMeeting = async (transcription: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: `Summarize this meeting transcript technically. Identify actors, specific requirements, and potential scope creep: "${transcription}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          requirements: { type: Type.ARRAY, items: { type: Type.STRING } },
          actors: { type: Type.ARRAY, items: { type: Type.STRING } },
          edgeCases: { type: Type.ARRAY, items: { type: Type.STRING } },
          unknowns: { type: Type.ARRAY, items: { type: Type.STRING } },
          actionItems: { type: Type.ARRAY, items: { type: Type.STRING } },
          scopeCreepWarnings: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["requirements", "actionItems", "actors"]
      }
    }
  });
  
  const text = response.text || "{}";
  return JSON.parse(text);
};

export const reviewCode = async (code: string, diff: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-1.5-pro',
    contents: `Review the following code changes (diff) for risks, performance hits, and security vulnerabilities: \n\nCODE:\n${code}\n\nDIFF:\n${diff}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          riskScore: { type: Type.NUMBER, description: "Risk from 0 to 10" },
          vulnerabilities: { type: Type.ARRAY, items: { type: Type.STRING } },
          performanceImpact: { type: Type.STRING },
          recommendedFixes: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["riskScore", "vulnerabilities"]
      }
    }
  });
  
  const text = response.text || "{}";
  return JSON.parse(text);
};
