import OpenAI from 'openai';

export interface AIConfig {
    bytez?: {
        enabled: boolean;
        apiKey: string;
        model?: string;
        temperature?: number;
    };
    persona?: {
        name: string;
        bio: string;
        tone: string;
        customInstructions: string;
    };
}

export class AIGenerator {
    private bytezClient?: OpenAI;
    private config: AIConfig;
    private rateLimitedUntil: number = 0;
    private bytezModelIndex: number = 0;

    // Bytez models - Prioritize stable 3B models for free tier
    private readonly BYTEZ_MODELS = [
        'Qwen/Qwen2.5-3B-Instruct',
        'Qwen/Qwen3-4B',
        'meta-llama/Llama-3.2-1B-Instruct'
    ];

    constructor(config: AIConfig) {
        this.config = config;

        if (config.bytez?.enabled && config.bytez.apiKey) {
            this.bytezClient = new OpenAI({
                baseURL: 'https://api.bytez.com/models/v2/openai/v1',
                apiKey: config.bytez.apiKey,
                defaultHeaders: {
                    'X-Title': 'Obsidian Intelligence',
                }
            });
            console.log('[AI] Bytez client initialized');
        }
    }

    private isRateLimited(): boolean {
        if (Date.now() < this.rateLimitedUntil) {
            const waitMinutes = Math.ceil((this.rateLimitedUntil - Date.now()) / 60000);
            console.log(`[AI] Rate limited. Wait ${waitMinutes} minutes.`);
            return true;
        }
        return false;
    }

    private getCurrentBytezModel(): string {
        const models = [...this.BYTEZ_MODELS];
        const configModel = this.config.bytez?.model;

        // If config model is specified and not in list, add it to front for first try
        if (configModel && !models.includes(configModel)) {
            models.unshift(configModel);
        } else if (configModel && models.includes(configModel)) {
            // Already in list, but let's make sure it's at index 0 if it's the preferred one
            const idx = models.indexOf(configModel);
            models.splice(idx, 1);
            models.unshift(configModel);
        }

        const selectedIndex = this.bytezModelIndex % models.length;
        const model = models[selectedIndex];
        console.log(`[AI] Bytez Model Rotation - Attempt Index: ${this.bytezModelIndex}, Selected Model: ${model}`);
        return model;
    }

    private getReplySystemPrompt(username: string): string {
        const persona = this.config.persona;
        const identity = persona
            ? `You are ${persona.name}. ${persona.bio}. 
Tone: ${persona.tone}.
${persona.customInstructions}`
            : 'You are a helpful assistant.';

        return `${identity}

TASK:
Write a simple, clear reply to this tweet. Write like you're talking to a friend. Be authentic to your identity above.

Rules:
- Keep it under 270 characters
- Sound natural and conversational
- Mention @${username} at the start
- Don't use fancy jargon (unless it fits your persona)
- Write like a person, not a robot
- NEVER start with "As an AI model", "I cannot", or "I'm sorry"
- If you cannot generate a safe or appropriate reply, return exactly "EMPTY_RESPONSE"`;
    }

    private getOriginalTweetSystemPrompt(topic: string): string {
        const persona = this.config.persona;
        const identity = persona
            ? `You are ${persona.name}. ${persona.bio}. 
Tone: ${persona.tone}.
${persona.customInstructions}`
            : 'You are a helpful assistant.';

        return `${identity}

TASK:
Write an INFORMATIVE tweet about ${topic} that shares real, actionable knowledge.

CONTENT TYPES (pick one):
1. A practical tip that actually works
2. A common mistake and how to avoid it
3. A clear explanation of a concept
4. An actionable step someone can take today
5. A principle or framework that applies broadly

CRITICAL RULES:
- Share ONLY factual, verifiable information
- Do NOT invent statistics, numbers, or revenue figures
- Do NOT claim personal experiences you haven't had
- Keep it under 270 characters
- Be helpful and genuine, not clickbait
- Use simple, clear language
- If mentioning a concept, explain it briefly
- Use 1-2 hashtags: #SaaS #IndieHacker #MicroSaaS #BuildInPublic
- Sound knowledgeable but humble
- NEVER start with "As an AI model", "I cannot", or "I'm sorry"
- If you cannot generate a safe or appropriate tweet, return exactly "EMPTY_RESPONSE"`;
    }

    async generateOriginalTweet(topic: string): Promise<string | null> {
        if (this.isRateLimited()) {
            console.log('[AI] Skipping generation due to rate limit');
            return null;
        }

        // Try Bytez
        if (this.bytezClient && this.config.bytez?.enabled) {
            for (let attempt = 0; attempt < this.BYTEZ_MODELS.length; attempt++) {
                const model = this.getCurrentBytezModel();
                try {
                    console.log(`[AI] Generating tweet using Bytez model: ${model}`);
                    const response = await this.bytezClient.chat.completions.create({
                        model: model,
                        messages: [
                            { role: 'system', content: this.getOriginalTweetSystemPrompt(topic) },
                            { role: 'user', content: `Write a tweet about: ${topic}` }
                        ],
                        temperature: 0.8,
                        max_tokens: 500  // Higher for thinking models
                    });
                    const content = response.choices[0].message.content || '';
                    console.log(`[AI] Bytez raw response (${content.length} chars): "${content.substring(0, 150)}..."`);

                    if (this.isRefusal(content)) {
                        console.log(`[AI] Response flagged as refusal`);
                        return null;
                    }

                    const cleaned = this.cleanOriginalTweet(content);
                    if (cleaned && cleaned.length > 10) {
                        console.log(`[AI] Cleaned tweet: "${cleaned}"`);
                        return cleaned;
                    } else {
                        console.log(`[AI] Cleaned result was empty or too short, trying next model...`);
                        this.bytezModelIndex = (this.bytezModelIndex + 1) % this.BYTEZ_MODELS.length;
                        continue;
                    }
                } catch (error: any) {
                    const errorMessage = error.message || String(error);
                    console.error(`[AI] Bytez generation failed (${model}):`, errorMessage);

                    console.log(`[AI] Error on ${model}, waiting 2s before next model...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    this.bytezModelIndex = (this.bytezModelIndex + 1) % this.BYTEZ_MODELS.length;
                    continue;
                }
            }
        }

        return null;
    }

    private cleanOriginalTweet(tweet: string): string {
        let cleaned = tweet.trim();

        // 1. Remove ANY content between <think> tags (including tags themselves)
        cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');

        // 2. If there's an opening <think> but no closing, strip everything from <think> onwards
        if (cleaned.toLowerCase().includes('<think>')) {
            cleaned = cleaned.split(/<think>/i)[0];
        }

        // 3. If there's a stray closing </think>, take only what comes after
        if (cleaned.toLowerCase().includes('</think>')) {
            cleaned = cleaned.split(/<\/think>/i).pop() || '';
        }

        cleaned = cleaned.trim();

        // Detect leaked reasoning content (no tags but still thinking aloud)
        const reasoningPhrases = [
            'okay, the user', 'let me start', 'the user wants', 'first, i need',
            'i should think', 'let me think', 'hmm,', 'alright,', 'so the user',
            'i will write', 'i will generate', 'here is a tweet', 'i need to',
            'the tweet should', 'let\'s create', 'i\'ll write', 'now, let me',
            'first,', 'okay,', 'so,', 'well,', 'now,', 'thinking about',
            'let me craft', 'i\'m going to', 'the user is asking'
        ];
        const lowerCleaned = cleaned.toLowerCase();
        if (reasoningPhrases.some(phrase => lowerCleaned.startsWith(phrase))) {
            console.log(`[AI] Detected leaked reasoning, rejecting: "${cleaned.substring(0, 50)}..."`);
            return ''; // This is reasoning, not a tweet
        }

        // Also check if the content looks like it contains meta-commentary
        if (lowerCleaned.includes('(268 characters)') ||
            lowerCleaned.includes('characters)') ||
            lowerCleaned.includes('word count') ||
            lowerCleaned.includes('here\'s the tweet')) {
            // Try to extract just the tweet content before any meta-commentary
            const metaMatch = cleaned.match(/^(.+?)\s*\([0-9]+ characters?\)/i);
            if (metaMatch) {
                cleaned = metaMatch[1].trim();
            } else {
                // Remove the meta-commentary
                cleaned = cleaned.replace(/\s*\([0-9]+ characters?\)/gi, '').trim();
            }
        }

        // Remove any remaining HTML/XML tags
        cleaned = cleaned.replace(/<[^>]+>/g, '').trim();

        // Remove quotes around the entire text
        if (cleaned.startsWith('"') && cleaned.endsWith('"')) cleaned = cleaned.slice(1, -1);
        if (cleaned.startsWith("'") && cleaned.endsWith("'")) cleaned = cleaned.slice(1, -1);

        // Remove lead-ins like "Tweet: " or "Here is your tweet:"
        cleaned = cleaned.replace(/^(tweet|post|here is a tweet|here's a tweet|here is a post|here's the tweet|output):/i, '').trim();

        // Clean markdown formatting
        cleaned = cleaned.replace(/\*\*/g, '').replace(/\*/g, '').replace(/_/g, '');

        // Final check: if still contains obvious reasoning markers anywhere, reject
        if (lowerCleaned.includes('the user') || lowerCleaned.includes('i will') || lowerCleaned.includes('i should')) {
            console.log(`[AI] Content still contains reasoning markers, rejecting`);
            return '';
        }

        // Truncate if too long
        if (cleaned.length > 280) {
            cleaned = cleaned.slice(0, 277) + '...';
        }

        return cleaned.trim();
    }

    async generateReply(tweetText: string, authorUsername: string, keyword?: string): Promise<string | null> {
        if (this.isRateLimited()) {
            console.log('[AI] Skipping reply generation due to rate limit');
            return null;
        }

        // Try Bytez
        if (this.bytezClient && this.config.bytez?.enabled) {
            for (let attempt = 0; attempt < this.BYTEZ_MODELS.length; attempt++) {
                const model = this.getCurrentBytezModel();
                try {
                    console.log(`[AI] Generating reply using Bytez model: ${model}`);
                    const response = await this.bytezClient.chat.completions.create({
                        model: model,
                        messages: [
                            { role: 'system', content: this.getReplySystemPrompt(authorUsername) },
                            { role: 'user', content: `Tweet: "${tweetText}"\n\nReply:` }
                        ],
                        temperature: 0.7,
                        max_tokens: 150
                    });
                    const content = response.choices[0].message.content || '';
                    if (this.isRefusal(content)) return null;
                    return this.cleanReply(content, authorUsername);
                } catch (error: any) {
                    const errorMessage = error.message || String(error);
                    console.error(`[AI] Bytez reply failed (${model}):`, errorMessage);

                    console.log(`[AI] Error on ${model}, waiting 2s before next model...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    this.bytezModelIndex = (this.bytezModelIndex + 1) % this.BYTEZ_MODELS.length;
                    continue;
                }
            }
        }

        return null;
    }

    private isRefusal(text: string): boolean {
        const lower = text.toLowerCase();
        const markers = [
            'EMPTY_RESPONSE',
            "i can't",
            "i cannot",
            "as an ai",
            "sorry, as a",
            "i'm sorry",
            "content that involves",
            "creation of explicit",
            "safety guidelines",
            "policy prevents",
            "cannot create content"
        ];

        return markers.some(marker => lower.includes(marker));
    }

    private cleanReply(reply: string, username: string): string {
        let cleaned = reply.trim();

        // 1. Remove ANY content between <think> tags (including tags themselves)
        cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');

        // 2. If there's an opening <think> but no closing, strip everything after it
        if (cleaned.toLowerCase().includes('<think>')) {
            cleaned = cleaned.split(/<think>/i)[0];
        }

        // 3. If there's a stray closing </think>, strip everything before it
        if (cleaned.toLowerCase().includes('</think>')) {
            cleaned = cleaned.split(/<\/think>/i).pop() || '';
        }

        cleaned = cleaned.trim();
        if (cleaned.startsWith('"') && cleaned.endsWith('"')) cleaned = cleaned.slice(1, -1);
        if (cleaned.startsWith("'") && cleaned.endsWith("'")) cleaned = cleaned.slice(1, -1);

        // Remove lead-ins
        cleaned = cleaned.replace(/^(reply|response|here is a reply|here's a reply):/i, '').trim();

        cleaned = cleaned.replace(/\*\*/g, '').replace(/\*/g, '').replace(/_/g, '');

        if (!cleaned.startsWith(`@${username}`) && !cleaned.includes(`@${username}`)) {
            cleaned = `@${username} ${cleaned}`;
        }

        if (cleaned.length > 280) {
            cleaned = cleaned.slice(0, 277) + '...';
        }
        return cleaned.trim();
    }

    async analyzeWritingStyle(username: string, tweetTexts: string): Promise<{
        name: string;
        bio: string;
        tone: string;
        customInstructions: string;
    } | null> {
        const stylePrompt = `You are a writing style analyst. Analyze the following tweets from @${username} and extract their writing style DNA.

TWEETS TO ANALYZE:
${tweetTexts}

Based on these tweets, create a persona description that captures their unique voice. Output ONLY a JSON object with these exact fields:

{
  "name": "A creative name for this writing style (e.g., 'The Minimalist Philosopher' or 'Tech Optimist')",
  "bio": "A 1-2 sentence description of this persona's identity and what they tweet about",
  "tone": "The emotional tone (e.g., 'Witty and provocative', 'Calm and philosophical', 'Energetic and motivational')",
  "customInstructions": "Detailed writing instructions that capture their style. Include: sentence length patterns, emoji usage, hashtag habits, hook styles, favorite phrases or patterns, punctuation style, capitalization habits"
}

Be specific and detailed in customInstructions. Focus on ACTIONABLE style rules.
Output ONLY valid JSON, no other text.`;

        // Try Bytez
        if (this.bytezClient && this.config.bytez?.enabled) {
            try {
                console.log(`[AI] Analyzing writing style for @${username}...`);
                const response = await this.bytezClient.chat.completions.create({
                    model: this.getCurrentBytezModel(),
                    messages: [
                        { role: 'user', content: stylePrompt }
                    ],
                    temperature: 0.7,
                    max_tokens: 800
                });

                let content = response.choices[0].message.content || '';
                console.log(`[AI] Style analysis response: ${content.substring(0, 200)}...`);

                // Clean thinking tags if present
                if (content.includes('</think>')) {
                    content = content.split('</think>').pop() || content;
                }

                // Extract JSON from response
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    return {
                        name: parsed.name || `Style of @${username}`,
                        bio: parsed.bio || `Writing style cloned from @${username}`,
                        tone: parsed.tone || 'Professional and engaging',
                        customInstructions: parsed.customInstructions || 'Write naturally and authentically.'
                    };
                }
            } catch (error: any) {
                console.error('[AI] Style analysis failed:', error.message || error);
            }
        }

        return null;
    }
}
