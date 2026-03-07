
import { GoogleGenAI } from '@google/genai';
import { StateManager } from './state_manager';
import fs from 'fs';
import path from 'path';

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: 'proposal' | 'report' | 'contract' | 'email' | 'memo' | 'custom';
  structure: {
    sections: {
      title: string;
      prompt: string;
      required: boolean;
    }[];
  };
  defaultPrompt: string;
}

export interface GeneratedDocument {
  id: string;
  title: string;
  content: string;
  templateId: string;
  variables: Record<string, string>;
  timestamp: number;
  format: 'md' | 'html' | 'txt';
}

export class DocumentTemplates {
  private stateManager: StateManager;
  private apiKey: string;
  private templates: DocumentTemplate[] = [];
  private documents: GeneratedDocument[] = [];
  private docsDir: string;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
    this.apiKey = process.env.API_KEY || '';
    this.docsDir = path.resolve(process.cwd(), 'data', 'documents');
    
    if (!fs.existsSync(this.docsDir)) {
      fs.mkdirSync(this.docsDir, { recursive: true });
    }
    
    this.initializeDefaultTemplates();
    this.loadDocuments();
  }

  private initializeDefaultTemplates(): void {
    this.templates = [
      {
        id: 'business_proposal',
        name: 'Business Proposal',
        description: 'Professional business proposal document',
        category: 'proposal',
        structure: {
          sections: [
            { title: 'Executive Summary', prompt: 'Write a compelling executive summary for {project_name}', required: true },
            { title: 'Problem Statement', prompt: 'Describe the problem that {project_name} solves', required: true },
            { title: 'Proposed Solution', prompt: 'Detail the solution approach for {project_name}', required: true },
            { title: 'Timeline & Budget', prompt: 'Provide timeline and budget estimates for {project_name}', required: true },
            { title: 'Benefits', prompt: 'List key benefits and ROI for {project_name}', required: true }
          ]
        },
        defaultPrompt: 'Generate a professional business proposal for {project_name} targeting {target_audience}'
      },
      {
        id: 'project_report',
        name: 'Project Status Report',
        description: 'Weekly/monthly project status report',
        category: 'report',
        structure: {
          sections: [
            { title: 'Project Overview', prompt: 'Summarize current status of {project_name}', required: true },
            { title: 'Accomplishments', prompt: 'List completed tasks and milestones', required: true },
            { title: 'Challenges', prompt: 'Describe any blockers or challenges', required: true },
            { title: 'Next Steps', prompt: 'Outline planned activities for next period', required: true },
            { title: 'Metrics', prompt: 'Include key performance metrics', required: false }
          ]
        },
        defaultPrompt: 'Create a project status report for {project_name} as of {date}'
      },
      {
        id: 'meeting_minutes',
        name: 'Meeting Minutes',
        description: 'Formal meeting minutes template',
        category: 'memo',
        structure: {
          sections: [
            { title: 'Meeting Details', prompt: 'Date, time, attendees, and location of meeting', required: true },
            { title: 'Agenda Items', prompt: 'List of agenda topics discussed', required: true },
            { title: 'Key Decisions', prompt: 'Important decisions made during the meeting', required: true },
            { title: 'Action Items', prompt: 'Specific tasks assigned with owners and deadlines', required: true },
            { title: 'Next Meeting', prompt: 'Date and purpose of next meeting', required: false }
          ]
        },
        defaultPrompt: 'Generate formal meeting minutes from this transcript or discussion'
      },
      {
        id: 'technical_spec',
        name: 'Technical Specification',
        description: 'Technical requirements and design doc',
        category: 'report',
        structure: {
          sections: [
            { title: 'Overview', prompt: 'High-level description of the technical solution', required: true },
            { title: 'Requirements', prompt: 'Functional and non-functional requirements', required: true },
            { title: 'Architecture', prompt: 'System architecture and component diagram', required: true },
            { title: 'API Design', prompt: 'API endpoints and data models', required: true },
            { title: 'Implementation Plan', prompt: 'Development phases and timeline', required: true }
          ]
        },
        defaultPrompt: 'Create a technical specification document for {feature_name}'
      },
      {
        id: 'email_formal',
        name: 'Formal Business Email',
        description: 'Professional email template',
        category: 'email',
        structure: {
          sections: [
            { title: 'Subject', prompt: 'Clear and professional subject line', required: true },
            { title: 'Greeting', prompt: 'Appropriate greeting for {recipient_name}', required: true },
            { title: 'Body', prompt: 'Main content of the email', required: true },
            { title: 'Call to Action', prompt: 'Clear next step or request', required: true },
            { title: 'Closing', prompt: 'Professional sign-off', required: true }
          ]
        },
        defaultPrompt: 'Write a formal business email to {recipient_name} about {topic}'
      }
    ];
  }

  getTemplates(): DocumentTemplate[] {
    return this.templates;
  }

  getTemplateById(id: string): DocumentTemplate | undefined {
    return this.templates.find(t => t.id === id);
  }

  addCustomTemplate(template: Omit<DocumentTemplate, 'id'>): DocumentTemplate {
    const newTemplate: DocumentTemplate = {
      ...template,
      id: `custom_${Date.now()}`
    };
    this.templates.push(newTemplate);
    this.stateManager.addAuditEntry(`Custom template created: ${newTemplate.name}`, 'document_templates');
    return newTemplate;
  }

  async generateDocument(templateId: string, variables: Record<string, string>, format: 'md' | 'html' | 'txt' = 'md'): Promise<GeneratedDocument> {
    const template = this.getTemplateById(templateId);
    if (!template) throw new Error('Template not found');
    
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    
    // Build prompt from template structure
    let fullContent = `# ${variables.title || template.name}\n\n`;
    
    for (const section of template.structure.sections) {
      if (!section.required && !variables[`include_${section.title.toLowerCase().replace(/\s+/g, '_')}`]) {
        continue;
      }
      
      // Replace variables in prompt
      let sectionPrompt = section.prompt;
      for (const [key, value] of Object.entries(variables)) {
        sectionPrompt = sectionPrompt.replace(new RegExp(`{${key}}`, 'g'), value);
      }
      
      try {
        const response = await ai.models.generateContent({
          model: 'models/gemini-2.5-flash-native-audio-latest',
          contents: [{ role: 'user', parts: [{ text: sectionPrompt }] }]
        });
        
        fullContent += `## ${section.title}\n\n${response.text || '[Content generation failed]'}\n\n`;
      } catch (e) {
        fullContent += `## ${section.title}\n\n[Failed to generate content]\n\n`;
      }
    }
    
    const doc: GeneratedDocument = {
      id: `doc_${Date.now()}`,
      title: variables.title || template.name,
      content: fullContent,
      templateId,
      variables,
      timestamp: Date.now(),
      format
    };
    
    // Save document
    const docPath = path.join(this.docsDir, `${doc.id}.${format}`);
    fs.writeFileSync(docPath, fullContent);
    
    this.documents.push(doc);
    this.saveDocuments();
    
    this.stateManager.addAuditEntry(`Document generated: ${doc.title}`, 'document_templates');
    return doc;
  }

  async quickGenerate(prompt: string, format: 'md' | 'html' | 'txt' = 'md'): Promise<GeneratedDocument> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    
    const response = await ai.models.generateContent({
      model: 'models/gemini-2.5-flash-native-audio-latest',
      contents: [{ role: 'user', parts: [{ text: `Generate a professional document: ${prompt}` }] }]
    });
    
    const doc: GeneratedDocument = {
      id: `doc_${Date.now()}`,
      title: 'Quick Generated Document',
      content: response.text || '',
      templateId: 'custom',
      variables: { prompt },
      timestamp: Date.now(),
      format
    };
    
    const docPath = path.join(this.docsDir, `${doc.id}.${format}`);
    fs.writeFileSync(docPath, doc.content);
    
    this.documents.push(doc);
    this.saveDocuments();
    
    return doc;
  }

  getDocuments(): GeneratedDocument[] {
    return [...this.documents].sort((a, b) => b.timestamp - a.timestamp);
  }

  getDocumentById(id: string): GeneratedDocument | undefined {
    return this.documents.find(d => d.id === id);
  }

  exportDocument(id: string, format: 'md' | 'html' | 'txt' | 'pdf'): string | null {
    const doc = this.getDocumentById(id);
    if (!doc) return null;
    
    const docPath = path.join(this.docsDir, `${doc.id}.${format}`);
    
    if (format === 'html') {
      const htmlContent = `<!DOCTYPE html>
<html>
<head><title>${doc.title}</title></head>
<body>
${doc.content.replace(/\n/g, '<br>').replace(/# /g, '<h1>').replace(/## /g, '<h2>')}
</body>
</html>`;
      fs.writeFileSync(docPath, htmlContent);
    } else if (format === 'pdf') {
      // Would need PDF library - return markdown for now
      return path.join(this.docsDir, `${doc.id}.md`);
    }
    
    return docPath;
  }

  private saveDocuments(): void {
    const docsPath = path.join(this.docsDir, 'documents.json');
    fs.writeFileSync(docsPath, JSON.stringify(this.documents, null, 2));
  }

  private loadDocuments(): void {
    const docsPath = path.join(this.docsDir, 'documents.json');
    if (fs.existsSync(docsPath)) {
      this.documents = JSON.parse(fs.readFileSync(docsPath, 'utf8'));
    }
  }
}
