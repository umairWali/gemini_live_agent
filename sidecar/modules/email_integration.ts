
import { GoogleGenAI } from '@google/genai';
import { StateManager } from './state_manager';

export interface EmailMessage {
  id: string;
  subject: string;
  from: string;
  to: string[];
  body: string;
  timestamp: number;
  isRead: boolean;
  labels: string[];
  attachments?: string[];
}

export interface EmailDraft {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  attachments?: string[];
}

export class EmailIntegration {
  private stateManager: StateManager;
  private apiKey: string;
  private connected: boolean = false;
  private emails: EmailMessage[] = [];
  private unreadCount: number = 0;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
    this.apiKey = process.env.API_KEY || '';
  }

  // Simulate email reading (in real impl, connect to Gmail/Outlook API)
  async connect(provider: 'gmail' | 'outlook', credentials: any): Promise<{ success: boolean; error?: string }> {
    // Mock connection for now - in production use OAuth2
    this.connected = true;
    this.stateManager.addAuditEntry(`Email connected to ${provider}`, 'email_integration');
    return { success: true };
  }

  async fetchEmails(limit: number = 10): Promise<EmailMessage[]> {
    if (!this.connected) {
      throw new Error('Email not connected');
    }
    // Mock data - in production fetch from API
    return this.emails.slice(0, limit);
  }

  async searchEmails(query: string): Promise<EmailMessage[]> {
    if (!this.connected) {
      throw new Error('Email not connected');
    }
    return this.emails.filter(e => 
      e.subject.toLowerCase().includes(query.toLowerCase()) ||
      e.body.toLowerCase().includes(query.toLowerCase())
    );
  }

  async getUnreadCount(): Promise<number> {
    return this.unreadCount;
  }

  async markAsRead(emailId: string): Promise<void> {
    const email = this.emails.find(e => e.id === emailId);
    if (email && !email.isRead) {
      email.isRead = true;
      this.unreadCount--;
    }
  }

  async sendEmail(draft: EmailDraft): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.connected) {
      return { success: false, error: 'Email not connected' };
    }
    
    // Use AI to improve email if needed
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    
    try {
      // In production, send via Gmail/Outlook API
      const messageId = `msg_${Date.now()}`;
      this.stateManager.addAuditEntry(`Email sent to ${draft.to.join(', ')}: ${draft.subject}`, 'email_integration');
      return { success: true, messageId };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async generateAutoReply(email: EmailMessage, tone: 'professional' | 'friendly' | 'brief' = 'professional'): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    
    const prompt = `Write a ${tone} email reply to:
Subject: ${email.subject}
From: ${email.from}
Body: ${email.body.substring(0, 500)}

Keep it concise and appropriate.`;

    try {
      const response = await ai.models.generateContent({
        model: 'models/gemini-2.5-flash-native-audio-latest',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });
      return response.text || 'Thank you for your email. I will get back to you soon.';
    } catch (e) {
      return 'Thank you for your email. I will get back to you soon.';
    }
  }

  async summarizeThread(emails: EmailMessage[]): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    
    const threadText = emails.map(e => `From: ${e.from}\nSubject: ${e.subject}\n${e.body}`).join('\n---\n');
    
    const prompt = `Summarize this email thread in 3 bullet points:
${threadText}`;

    try {
      const response = await ai.models.generateContent({
        model: 'models/gemini-2.5-flash-native-audio-latest',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });
      return response.text || 'Thread summary unavailable';
    } catch (e) {
      return 'Thread summary unavailable';
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}
