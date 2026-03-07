
import { GoogleGenAI } from '@google/genai';
import { StateManager } from './state_manager';
import fs from 'fs';
import path from 'path';

export interface TranscriptionResult {
  text: string;
  confidence: number;
  segments: {
    start: number;
    end: number;
    text: string;
    speaker?: string;
  }[];
  language: string;
}

export interface SavedNote {
  id: string;
  title: string;
  content: string;
  audioFile?: string;
  timestamp: number;
  tags: string[];
  isTranscribed: boolean;
}

export class VoiceTranscription {
  private stateManager: StateManager;
  private apiKey: string;
  private notes: SavedNote[] = [];
  private notesDir: string;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
    this.apiKey = process.env.API_KEY || '';
    this.notesDir = path.resolve(process.cwd(), 'data', 'voice_notes');
    
    // Ensure notes directory exists
    if (!fs.existsSync(this.notesDir)) {
      fs.mkdirSync(this.notesDir, { recursive: true });
    }
    
    this.loadNotes();
  }

  async transcribeAudio(audioBase64: string, mimeType: string = 'audio/wav'): Promise<TranscriptionResult> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    
    try {
      const response = await ai.models.generateContent({
        model: 'models/gemini-2.5-flash-native-audio-latest',
        contents: [{
          role: 'user',
          parts: [
            { text: 'Transcribe this audio. Return the full text and any timestamps if discernible.' },
            { inlineData: { mimeType, data: audioBase64 } }
          ]
        }]
      });

      const text = response.text || '';
      
      this.stateManager.addAuditEntry(`Audio transcribed (${text.length} chars)`, 'voice_transcription');
      
      return {
        text,
        confidence: 0.9,
        segments: [{ start: 0, end: 0, text }],
        language: 'en'
      };
    } catch (e: any) {
      this.stateManager.addAuditEntry(`Transcription failed: ${e.message}`, 'voice_transcription');
      throw e;
    }
  }

  async transcribeAndSave(audioBase64: string, title?: string): Promise<SavedNote> {
    const result = await this.transcribeAudio(audioBase64);
    
    const note: SavedNote = {
      id: `note_${Date.now()}`,
      title: title || `Voice Note ${new Date().toLocaleString()}`,
      content: result.text,
      timestamp: Date.now(),
      tags: ['voice', 'auto-transcribed'],
      isTranscribed: true
    };
    
    // Save audio file
    const audioPath = path.join(this.notesDir, `${note.id}.wav`);
    fs.writeFileSync(audioPath, Buffer.from(audioBase64, 'base64'));
    note.audioFile = audioPath;
    
    this.notes.push(note);
    this.saveNotes();
    
    this.stateManager.addAuditEntry(`Voice note saved: ${note.title}`, 'voice_transcription');
    return note;
  }

  async createTextNote(title: string, content: string, tags: string[] = []): Promise<SavedNote> {
    const note: SavedNote = {
      id: `note_${Date.now()}`,
      title,
      content,
      timestamp: Date.now(),
      tags,
      isTranscribed: false
    };
    
    this.notes.push(note);
    this.saveNotes();
    
    this.stateManager.addAuditEntry(`Text note created: ${title}`, 'voice_transcription');
    return note;
  }

  getNotes(): SavedNote[] {
    return [...this.notes].sort((a, b) => b.timestamp - a.timestamp);
  }

  getNoteById(id: string): SavedNote | undefined {
    return this.notes.find(n => n.id === id);
  }

  searchNotes(query: string): SavedNote[] {
    const lowerQuery = query.toLowerCase();
    return this.notes.filter(n => 
      n.title.toLowerCase().includes(lowerQuery) ||
      n.content.toLowerCase().includes(lowerQuery) ||
      n.tags.some(t => t.toLowerCase().includes(lowerQuery))
    );
  }

  deleteNote(id: string): boolean {
    const idx = this.notes.findIndex(n => n.id === id);
    if (idx === -1) return false;
    
    const note = this.notes[idx];
    if (note.audioFile && fs.existsSync(note.audioFile)) {
      fs.unlinkSync(note.audioFile);
    }
    
    this.notes.splice(idx, 1);
    this.saveNotes();
    return true;
  }

  async summarizeNote(noteId: string): Promise<string> {
    const note = this.getNoteById(noteId);
    if (!note) return 'Note not found';
    
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    
    try {
      const response = await ai.models.generateContent({
        model: 'models/gemini-2.5-flash-native-audio-latest',
        contents: [{ role: 'user', parts: [{ text: `Summarize this note in 2-3 sentences:\n\n${note.content}` }] }]
      });
      
      return response.text || 'Summary unavailable';
    } catch {
      return 'Summary unavailable';
    }
  }

  private saveNotes(): void {
    const notesPath = path.join(this.notesDir, 'notes.json');
    fs.writeFileSync(notesPath, JSON.stringify(this.notes, null, 2));
  }

  private loadNotes(): void {
    const notesPath = path.join(this.notesDir, 'notes.json');
    if (fs.existsSync(notesPath)) {
      this.notes = JSON.parse(fs.readFileSync(notesPath, 'utf8'));
    }
  }
}
