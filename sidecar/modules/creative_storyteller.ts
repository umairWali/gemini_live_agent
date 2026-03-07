
import { GoogleGenAI } from '@google/genai';
import { StateManager } from './state_manager';
import fs from 'fs';
import path from 'path';

export interface StorySegment {
  type: 'text' | 'image' | 'audio' | 'video';
  content: string;
  prompt?: string;
  timestamp: number;
}

export interface GeneratedStory {
  id: string;
  title: string;
  segments: StorySegment[];
  theme: string;
  targetAudience: string;
  createdAt: number;
}

export class CreativeStoryteller {
  private stateManager: StateManager;
  private apiKey: string;
  private stories: GeneratedStory[] = [];
  private outputDir: string;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
    this.apiKey = process.env.API_KEY || '';
    this.outputDir = path.resolve(process.cwd(), 'data', 'stories');
    
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Creates interleaved multimedia story - text + images mixed together
   * This is the KEY feature for Creative Storyteller category
   */
  async createInterleavedStory(
    topic: string,
    style: 'storybook' | 'marketing' | 'educational' | 'social',
    targetAudience: string = 'general',
    segmentCount: number = 5
  ): Promise<GeneratedStory> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });

    // Step 1: Generate story outline with image prompts
    const outlinePrompt = `Create a ${style} story about "${topic}" for ${targetAudience} audience.
    Break it into ${segmentCount} segments. For each segment, provide:
    1. Narrative text (2-3 sentences)
    2. Image generation prompt that matches the scene
    
    Return JSON format:
    {
      "segments": [
        { "text": "story text here", "imagePrompt": "detailed image description" }
      ]
    }`;

    const outlineResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-native-audio-latest',
      contents: [{ role: 'user', parts: [{ text: outlinePrompt }] }]
    });

    let outline;
    try {
      const text = outlineResponse.text || '{}';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      outline = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch {
      outline = { segments: [{ text: topic, imagePrompt: topic }] };
    }

    // Step 2: Generate interleaved content (text + images)
    const segments: StorySegment[] = [];
    
    for (let i = 0; i < outline.segments.length; i++) {
      const seg = outline.segments[i];
      
      // Add text segment
      segments.push({
        type: 'text',
        content: seg.text,
        timestamp: Date.now()
      });

      // Generate image for this segment
      try {
        const imageData = await this.generateImage(seg.imagePrompt, style);
        segments.push({
          type: 'image',
          content: imageData,
          prompt: seg.imagePrompt,
          timestamp: Date.now()
        });
      } catch (e) {
        console.log('Image generation failed for segment', i);
      }
    }

    const story: GeneratedStory = {
      id: `story_${Date.now()}`,
      title: topic,
      segments,
      theme: style,
      targetAudience,
      createdAt: Date.now()
    };

    this.stories.push(story);
    this.saveStory(story);

    this.stateManager.addAuditEntry(`Interleaved story created: ${topic}`, 'creative_storyteller');
    return story;
  }

  /**
   * Marketing Asset Generator - Copy + visuals in one flow
   */
  async generateMarketingAsset(
    productName: string,
    productDescription: string,
    platform: 'instagram' | 'twitter' | 'linkedin' | 'facebook'
  ): Promise<GeneratedStory> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });

    const prompt = `Create a complete marketing asset for "${productName}".
    Product: ${productDescription}
    Platform: ${platform}
    
    Generate:
    1. Catchy headline
    2. Engaging body copy (2-3 sentences)
    3. Call-to-action
    4. 3-5 relevant hashtags
    5. Image prompt for product visual
    
    Return as JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-native-audio-latest',
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const content = response.text || '';
    
    // Parse and create interleaved output
    const segments: StorySegment[] = [
      { type: 'text', content: `📢 ${productName}`, timestamp: Date.now() }
    ];

    // Generate marketing image
    try {
      const imageData = await this.generateImage(
        `${productName} product photography, professional marketing, ${platform} style, high quality`,
        'marketing'
      );
      segments.push({ type: 'image', content: imageData, timestamp: Date.now() });
    } catch (e) {}

    segments.push({ type: 'text', content, timestamp: Date.now() });

    const story: GeneratedStory = {
      id: `marketing_${Date.now()}`,
      title: `${productName} - ${platform}`,
      segments,
      theme: 'marketing',
      targetAudience: platform,
      createdAt: Date.now()
    };

    this.stories.push(story);
    return story;
  }

  /**
   * Educational Explainer - Narration with diagrams
   */
  async createEducationalExplainer(
    topic: string,
    complexity: 'simple' | 'medium' | 'advanced'
  ): Promise<GeneratedStory> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });

    const prompt = `Explain "${topic}" at ${complexity} level.
    Create an educational explainer with:
    1. Introduction (2 sentences)
    2. Key concept explanation
    3. Visual diagram description
    4. Real-world example
    5. Summary
    
    Include image prompts for diagrams.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-native-audio-latest',
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    // Generate diagram image
    let imageData = '';
    try {
      imageData = await this.generateImage(
        `Educational diagram of ${topic}, clean infographic style, labeled, white background`,
        'educational'
      );
    } catch (e) {}

    const segments: StorySegment[] = [
      { type: 'text', content: response.text || topic, timestamp: Date.now() }
    ];

    if (imageData) {
      segments.push({
        type: 'image',
        content: imageData,
        prompt: `Diagram: ${topic}`,
        timestamp: Date.now()
      });
    }

    const story: GeneratedStory = {
      id: `edu_${Date.now()}`,
      title: `Learn: ${topic}`,
      segments,
      theme: 'educational',
      targetAudience: complexity,
      createdAt: Date.now()
    };

    this.stories.push(story);
    return story;
  }

  /**
   * Social Content Creator - Caption + image + hashtags
   */
  async createSocialContent(
    topic: string,
    mood: 'funny' | 'inspirational' | 'informative' | 'trendy'
  ): Promise<GeneratedStory> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });

    const prompt = `Create social media content about "${topic}" with ${mood} mood.
    Generate:
    1. Attention-grabbing caption (1-2 sentences)
    2. Relevant hashtags (5-7)
    3. Image description for visual content`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-native-audio-latest',
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    // Generate social media image
    let imageData = '';
    try {
      imageData = await this.generateImage(
        `${topic}, social media style, ${mood} aesthetic, Instagram worthy, vibrant colors`,
        'social'
      );
    } catch (e) {}

    const segments: StorySegment[] = [];
    
    if (imageData) {
      segments.push({ type: 'image', content: imageData, timestamp: Date.now() });
    }
    
    segments.push({ type: 'text', content: response.text || topic, timestamp: Date.now() });

    const story: GeneratedStory = {
      id: `social_${Date.now()}`,
      title: `${topic} - ${mood}`,
      segments,
      theme: 'social',
      targetAudience: mood,
      createdAt: Date.now()
    };

    this.stories.push(story);
    return story;
  }

  /**
   * Generate image using Gemini's image generation
   */
  private async generateImage(prompt: string, style: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    
    const stylePrefix = {
      storybook: 'Children book illustration style, whimsical, colorful',
      marketing: 'Professional marketing photography, high quality, commercial',
      educational: 'Clean educational diagram, infographic style, labeled',
      social: 'Social media aesthetic, vibrant, Instagram style'
    };

    const fullPrompt = `${stylePrefix[style as keyof typeof stylePrefix] || ''}, ${prompt}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp-image-generation',
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      config: { responseModalities: ['TEXT', 'IMAGE'] }
    });

    // Extract image data from response
    const parts = (response as any).candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        return part.inlineData.data; // Base64 image
      }
    }

    throw new Error('No image generated');
  }

  /**
   * Generate video from story segments (using image sequence)
   */
  async generateVideoFromStory(storyId: string): Promise<string | null> {
    const story = this.stories.find(s => s.id === storyId);
    if (!story) return null;

    // Collect all images from story
    const images = story.segments
      .filter(s => s.type === 'image')
      .map(s => s.content);

    if (images.length === 0) return null;

    // Create video metadata
    const videoData = {
      storyId,
      frameCount: images.length,
      duration: images.length * 3, // 3 seconds per frame
      frames: images
    };

    // Save video data
    const videoPath = path.join(this.outputDir, `${storyId}_video.json`);
    fs.writeFileSync(videoPath, JSON.stringify(videoData, null, 2));

    this.stateManager.addAuditEntry(`Video generated from story: ${story.title}`, 'creative_storyteller');
    return videoPath;
  }

  getStories(): GeneratedStory[] {
    return [...this.stories].sort((a, b) => b.createdAt - a.createdAt);
  }

  getStoryById(id: string): GeneratedStory | undefined {
    return this.stories.find(s => s.id === id);
  }

  private saveStory(story: GeneratedStory): void {
    const storyPath = path.join(this.outputDir, `${story.id}.json`);
    fs.writeFileSync(storyPath, JSON.stringify(story, null, 2));
  }

  /**
   * Export story as HTML for sharing
   */
  exportStoryAsHTML(storyId: string): string | null {
    const story = this.getStoryById(storyId);
    if (!story) return null;

    let html = `<!DOCTYPE html>
<html>
<head><title>${story.title}</title>
<style>
  body { font-family: system-ui; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
  .segment { margin: 20px 0; padding: 20px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  .text { line-height: 1.6; font-size: 16px; }
  .image { max-width: 100%; border-radius: 8px; }
  h1 { color: #333; }
</style>
</head>
<body>
<h1>${story.title}</h1>
<p style="color: #666;">Theme: ${story.theme} | Audience: ${story.targetAudience}</p>
`;

    for (const seg of story.segments) {
      if (seg.type === 'text') {
        html += `<div class="segment text">${seg.content.replace(/\n/g, '<br>')}</div>\n`;
      } else if (seg.type === 'image') {
        html += `<div class="segment"><img src="data:image/png;base64,${seg.content}" class="image" /></div>\n`;
      }
    }

    html += '</body></html>';

    const exportPath = path.join(this.outputDir, `${storyId}.html`);
    fs.writeFileSync(exportPath, html);
    return exportPath;
  }
}
