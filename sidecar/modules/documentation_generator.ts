
import { GoogleGenAI } from '@google/genai';
import { StateManager } from './state_manager';
import fs from 'fs';
import path from 'path';

export interface DocSection {
  title: string;
  content: string;
  subsections?: DocSection[];
}

export interface GeneratedDoc {
  id: string;
  title: string;
  type: 'readme' | 'api' | 'guide' | 'architecture' | 'changelog';
  content: string;
  filePath: string;
  generatedAt: number;
  sourceFiles: string[];
}

export class DocumentationGenerator {
  private stateManager: StateManager;
  private apiKey: string;
  private generatedDocs: GeneratedDoc[] = [];
  private docsDir: string;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
    this.apiKey = process.env.API_KEY || '';
    this.docsDir = path.resolve(process.cwd(), 'docs');
    
    if (!fs.existsSync(this.docsDir)) {
      fs.mkdirSync(this.docsDir, { recursive: true });
    }
  }

  async generateReadme(projectPath: string): Promise<GeneratedDoc> {
    // Analyze project structure
    const structure = this.analyzeProject(projectPath);
    const packageJson = this.readPackageJson(projectPath);
    
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    
    const prompt = `Generate a professional README.md for this project:

PROJECT NAME: ${packageJson?.name || 'Project'}
DESCRIPTION: ${packageJson?.description || 'A software project'}
TECH STACK: ${structure.languages.join(', ')}
FILES: ${structure.mainFiles.join(', ')}

Include:
- Title and description
- Installation instructions
- Usage examples
- API documentation (if applicable)
- Contributing guidelines
- License info

Return the complete README content.`;

    const response = await ai.models.generateContent({
      model: 'models/gemini-2.5-flash-native-audio-latest',
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const content = response.text || '# README\n\nProject documentation.';
    
    const doc: GeneratedDoc = {
      id: `readme_${Date.now()}`,
      title: 'README',
      type: 'readme',
      content,
      filePath: path.join(this.docsDir, 'README.md'),
      generatedAt: Date.now(),
      sourceFiles: structure.allFiles
    };

    fs.writeFileSync(doc.filePath, content);
    this.generatedDocs.push(doc);
    
    this.stateManager.addAuditEntry('README generated', 'documentation_generator');
    return doc;
  }

  async generateApiDocs(sourceFiles: string[], outputFormat: 'markdown' | 'html' = 'markdown'): Promise<GeneratedDoc> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    
    // Read source files
    const fileContents = sourceFiles
      .filter(f => fs.existsSync(f))
      .map(f => ({ path: f, content: fs.readFileSync(f, 'utf8') }));

    const prompt = `Generate API documentation from these source files:

${fileContents.map(f => `FILE: ${f.path}\n\`\`\`\n${f.content.substring(0, 2000)}\n\`\`\``).join('\n\n')}

Create comprehensive API docs including:
- Endpoint descriptions
- Request/response schemas
- Authentication
- Error codes
- Code examples

Return in ${outputFormat} format.`;

    const response = await ai.models.generateContent({
      model: 'models/gemini-2.5-flash-native-audio-latest',
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const content = response.text || '# API Documentation\n\nDocumentation unavailable.';
    const ext = outputFormat === 'html' ? 'html' : 'md';
    
    const doc: GeneratedDoc = {
      id: `api_${Date.now()}`,
      title: 'API Documentation',
      type: 'api',
      content,
      filePath: path.join(this.docsDir, `API.${ext}`),
      generatedAt: Date.now(),
      sourceFiles
    };

    fs.writeFileSync(doc.filePath, content);
    this.generatedDocs.push(doc);
    
    this.stateManager.addAuditEntry('API docs generated', 'documentation_generator');
    return doc;
  }

  async generateArchitectureDoc(projectPath: string): Promise<GeneratedDoc> {
    const structure = this.analyzeProject(projectPath);
    
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    
    const prompt = `Generate an Architecture document for this project structure:

DIRECTORIES: ${structure.directories.join(', ')}
MAIN FILES: ${structure.mainFiles.join(', ')}
TECHNOLOGIES: ${structure.languages.join(', ')}

Include:
- System overview
- Component diagram description
- Data flow
- Technology choices
- Deployment architecture

Return markdown format.`;

    const response = await ai.models.generateContent({
      model: 'models/gemini-2.5-flash-native-audio-latest',
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const content = response.text || '# Architecture\n\nArchitecture documentation.';
    
    const doc: GeneratedDoc = {
      id: `arch_${Date.now()}`,
      title: 'Architecture',
      type: 'architecture',
      content,
      filePath: path.join(this.docsDir, 'ARCHITECTURE.md'),
      generatedAt: Date.now(),
      sourceFiles: structure.allFiles
    };

    fs.writeFileSync(doc.filePath, content);
    this.generatedDocs.push(doc);
    
    this.stateManager.addAuditEntry('Architecture doc generated', 'documentation_generator');
    return doc;
  }

  async generateChangelog(commits: Array<{ hash: string; message: string; date: string; author: string }>): Promise<GeneratedDoc> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    
    const prompt = `Generate a CHANGELOG from these commits:

${commits.map(c => `- ${c.hash}: ${c.message}`).join('\n')}

Format as a standard CHANGELOG with sections:
- Added
- Changed
- Fixed
- Removed

Return markdown format.`;

    const response = await ai.models.generateContent({
      model: 'models/gemini-2.5-flash-native-audio-latest',
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const content = response.text || '# Changelog\n\nNo changes recorded.';
    
    const doc: GeneratedDoc = {
      id: `changelog_${Date.now()}`,
      title: 'Changelog',
      type: 'changelog',
      content,
      filePath: path.join(this.docsDir, 'CHANGELOG.md'),
      generatedAt: Date.now(),
      sourceFiles: []
    };

    fs.writeFileSync(doc.filePath, content);
    this.generatedDocs.push(doc);
    
    this.stateManager.addAuditEntry('Changelog generated', 'documentation_generator');
    return doc;
  }

  async generateUserGuide(feature: string, screenshots?: string[]): Promise<GeneratedDoc> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    
    let prompt = `Generate a user guide for this feature: ${feature}

Include:
- Overview
- Step-by-step instructions
- Tips and tricks
- Troubleshooting

Return markdown format.`;

    if (screenshots && screenshots.length > 0) {
      prompt += '\n\nScreenshots provided for reference.';
    }

    const response = await ai.models.generateContent({
      model: 'models/gemini-2.5-flash-native-audio-latest',
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const content = response.text || `# ${feature} Guide\n\nGuide content.`;
    
    const doc: GeneratedDoc = {
      id: `guide_${Date.now()}`,
      title: `${feature} User Guide`,
      type: 'guide',
      content,
      filePath: path.join(this.docsDir, `GUIDE_${feature.replace(/\s+/g, '_').toUpperCase()}.md`),
      generatedAt: Date.now(),
      sourceFiles: []
    };

    fs.writeFileSync(doc.filePath, content);
    this.generatedDocs.push(doc);
    
    this.stateManager.addAuditEntry(`User guide generated: ${feature}`, 'documentation_generator');
    return doc;
  }

  async generateAllDocs(projectPath: string): Promise<GeneratedDoc[]> {
    const docs: GeneratedDoc[] = [];
    
    docs.push(await this.generateReadme(projectPath));
    docs.push(await this.generateArchitectureDoc(projectPath));
    
    // Find API source files
    const apiFiles = this.findApiFiles(projectPath);
    if (apiFiles.length > 0) {
      docs.push(await this.generateApiDocs(apiFiles));
    }
    
    return docs;
  }

  getGeneratedDocs(): GeneratedDoc[] {
    return this.generatedDocs;
  }

  private analyzeProject(projectPath: string): { 
    directories: string[]; 
    mainFiles: string[]; 
    allFiles: string[];
    languages: string[];
  } {
    const result = {
      directories: [] as string[],
      mainFiles: [] as string[],
      allFiles: [] as string[],
      languages: new Set<string>()
    };

    const langMap: Record<string, string> = {
      '.ts': 'TypeScript', '.tsx': 'TypeScript',
      '.js': 'JavaScript', '.jsx': 'JavaScript',
      '.py': 'Python', '.go': 'Go', '.rs': 'Rust',
      '.java': 'Java', '.rb': 'Ruby', '.php': 'PHP'
    };

    const scanDir = (dir: string) => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          result.directories.push(item);
          try {
            scanDir(fullPath);
          } catch {}
        } else if (stat.isFile()) {
          result.allFiles.push(fullPath);
          const ext = path.extname(item);
          if (['.ts', '.tsx', '.js', '.jsx', '.py'].includes(ext)) {
            result.mainFiles.push(item);
          }
          if (langMap[ext]) {
            result.languages.add(langMap[ext]);
          }
        }
      }
    };

    scanDir(projectPath);
    
    return {
      directories: result.directories,
      mainFiles: result.mainFiles,
      allFiles: result.allFiles,
      languages: Array.from(result.languages)
    };
  }

  private readPackageJson(projectPath: string): any {
    try {
      const pkgPath = path.join(projectPath, 'package.json');
      if (fs.existsSync(pkgPath)) {
        return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      }
    } catch {}
    return null;
  }

  private findApiFiles(projectPath: string): string[] {
    const apiFiles: string[] = [];
    
    const scan = (dir: string) => {
      try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            scan(fullPath);
          } else if (stat.isFile() && /(api|route|controller|handler)/i.test(item)) {
            apiFiles.push(fullPath);
          }
        }
      } catch {}
    };
    
    scan(projectPath);
    return apiFiles.slice(0, 10); // Limit to 10 files
  }
}
