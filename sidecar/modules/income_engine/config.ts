
export interface IncomeConfig {
    niche: string;
    targetPlatforms: ('wordpress' | 'blogger' | 'medium' | 'linkedin' | 'social')[];
    postFrequency: number; // minutes between posts
    affiliateLinks: { [key: string]: string };
    keywords: string[];
    autoMode: boolean;
}

export const DEFAULT_INCOME_CONFIG: IncomeConfig = {
    niche: 'AI Tech & Productivity',
    targetPlatforms: ['medium', 'social'],
    postFrequency: 360, // 6 hours
    affiliateLinks: {
        'amazon': 'https://amazon.com/?tag=your-tag-20',
        'hosting': 'https://hostinger.com/ref-link'
    },
    keywords: ['AI automation', 'passive income', 'Gemini AI', 'smart work'],
    autoMode: false
};
