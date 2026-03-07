
import { GoogleGenAI } from '@google/genai';
import { StateManager } from './state_manager';

export interface OCRResult {
  text: string;
  confidence: number;
  regions: {
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
  }[];
  language: string;
}

export interface ExtractedData {
  emails: string[];
  phones: string[];
  urls: string[];
  dates: string[];
  amounts: string[];
  names: string[];
}

export class ScreenshotOCR {
  private stateManager: StateManager;
  private apiKey: string;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
    this.apiKey = process.env.API_KEY || '';
  }

  async processImage(imageBase64: string): Promise<OCRResult> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    
    try {
      // Use Gemini's vision capabilities for OCR
      const response = await ai.models.generateContent({
        model: 'models/gemini-2.5-flash-native-audio-latest',
        contents: [{
          role: 'user',
          parts: [
            { text: 'Extract all text from this image. Return in JSON format: { "text": "full text", "regions": [{"x": 0, "y": 0, "width": 100, "height": 50, "text": "detected text"}] }' },
            { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
          ]
        }]
      });

      const resultText = response.text || '{"text": "", "regions": []}';
      
      // Try to parse JSON response
      let parsed;
      try {
        parsed = JSON.parse(resultText);
      } catch {
        // If not valid JSON, wrap the text
        parsed = { text: resultText, regions: [] };
      }

      this.stateManager.addAuditEntry(`OCR processed image`, 'screenshot_ocr');
      
      return {
        text: parsed.text || '',
        confidence: 0.9,
        regions: parsed.regions || [],
        language: 'en'
      };
    } catch (e: any) {
      this.stateManager.addAuditEntry(`OCR failed: ${e.message}`, 'screenshot_ocr');
      throw e;
    }
  }

  async extractStructuredData(imageBase64: string): Promise<ExtractedData> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    
    const prompt = `Extract structured data from this image. Return JSON:
{
  "emails": ["found@emails.com"],
  "phones": ["+1234567890"],
  "urls": ["https://example.com"],
  "dates": ["2024-01-01"],
  "amounts": ["$100"],
  "names": ["John Doe"]
}`;

    try {
      const response = await ai.models.generateContent({
        model: 'models/gemini-2.5-flash-native-audio-latest',
        contents: [{
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
          ]
        }]
      });

      const resultText = response.text || '{}';
      
      try {
        return JSON.parse(resultText);
      } catch {
        return { emails: [], phones: [], urls: [], dates: [], amounts: [], names: [] };
      }
    } catch (e) {
      return { emails: [], phones: [], urls: [], dates: [], amounts: [], names: [] };
    }
  }

  async captureAndProcess(): Promise<OCRResult> {
    // This would integrate with system screenshot capture
    // For now, placeholder that expects base64 input
    throw new Error('Direct screenshot capture not implemented. Use processImage() with base64 data.');
  }

  async searchInImage(imageBase64: string, searchText: string): Promise<{ found: boolean; regions: any[] }> {
    const ocr = await this.processImage(imageBase64);
    const found = ocr.text.toLowerCase().includes(searchText.toLowerCase());
    
    const regions = ocr.regions.filter(r => 
      r.text.toLowerCase().includes(searchText.toLowerCase())
    );
    
    return { found, regions };
  }
}
