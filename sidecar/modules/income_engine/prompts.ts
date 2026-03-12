
export const CONTENT_PROMPTS = {
    blog_affiliate: (topic: string, links: any) => `
    Write a high-conversion affiliate blog post about "${topic}".
    Use these affiliate markers: ${JSON.stringify(links)}.
    Include:
    1. Hook headline.
    2. Problem-solving approach.
    3. Product reviews with affiliate links.
    4. Call to action.
    Format in Markdown.
  `,
    urdu_story: (topic: string) => `
    Create a highly engaging Urdu blog post about "${topic}".
    Target: Pakistani audience interested in passive income and technology.
    Tone: Friendly, expert, encouraging.
    Provide in Urdu (UTF-8) with catchy English headings where appropriate.
  `,
    trending_search: (niche: string) => `
    List 5 currently trending blog topics in the "${niche}" niche.
    Focus on topics that attract high search volume and affiliate clicks.
    Return as a JSON array of strings.
  `
};
