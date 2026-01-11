import fs from 'fs';
import path from 'path';

export interface AppConfig {
    x: {
        consumerKey: string;
        consumerSecret: string;
        accessToken: string;
        accessTokenSecret: string;
        bearerToken?: string;
    };
    ai: {
        gemini: {
            enabled: boolean;
            apiKey: string;
        };
        bytez?: {
            enabled: boolean;
            apiKey: string;
            model?: string;
        };
        openrouter: {
            enabled: boolean;
            apiKey: string;
            model?: string;
        };
    };
    bot: {
        keywords: string[];
        intervalMinutes: number;
        maxRepliesPerRun: number;
        avoidRetweets: boolean;
        avoidReplies: boolean;
        isRunning: boolean;
        tweetSettings: {
            enabled: boolean;
            tweetsPerRun: number;
            topics: string[];
        };
        persona: {
            name: string;
            bio: string;
            tone: string;
            customInstructions: string;
        };
    };
}

const CONFIG_PATH = "/Users/user/Desktop/PROJECT 0/tweetpy/dashboard/config.json";

const DEFAULT_CONFIG: AppConfig = {
    x: {
        consumerKey: '',
        consumerSecret: '',
        accessToken: '',
        accessTokenSecret: '',
    },
    ai: {
        gemini: {
            enabled: false,
            apiKey: '',
        },
        bytez: {
            enabled: true,
            apiKey: '',
            model: 'Qwen/Qwen3-4B',
        },
        openrouter: {
            enabled: false,
            apiKey: '',
        },
    },
    bot: {
        keywords: ['nextjs', 'typescript', 'ai'],
        intervalMinutes: 30,
        maxRepliesPerRun: 5,
        avoidRetweets: true,
        avoidReplies: true,
        isRunning: false,
        tweetSettings: {
            enabled: true,
            tweetsPerRun: 1,
            topics: ['Next.js tips', 'AI automation', 'TypeScript tricks'],
        },
        persona: {
            name: 'X Bot',
            bio: 'A sophisticated AI assistant bridging the gap between tech and human creativity.',
            tone: 'Intellectual yet accessible',
            customInstructions: 'Focus on insightful observations. Use clean formatting. Prioritize value over hype.',
        },
    },
};

export function getConfig(): AppConfig {
    let savedConfig: any = {};
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const data = fs.readFileSync(CONFIG_PATH, 'utf8');
            savedConfig = JSON.parse(data);
        }
    } catch (error) {
        console.error('Error reading config file:', error);
    }

    // Merge logic: Default -> File -> Environment Variables
    const config: AppConfig = {
        ...DEFAULT_CONFIG,
        ...savedConfig,
        x: {
            ...DEFAULT_CONFIG.x,
            ...(savedConfig.x || {}),
            consumerKey: process.env.X_CONSUMER_KEY || savedConfig.x?.consumerKey || DEFAULT_CONFIG.x.consumerKey,
            consumerSecret: process.env.X_CONSUMER_SECRET || savedConfig.x?.consumerSecret || DEFAULT_CONFIG.x.consumerSecret,
            accessToken: process.env.X_ACCESS_TOKEN || savedConfig.x?.accessToken || DEFAULT_CONFIG.x.accessToken,
            accessTokenSecret: process.env.X_ACCESS_TOKEN_SECRET || savedConfig.x?.accessTokenSecret || DEFAULT_CONFIG.x.accessTokenSecret,
            bearerToken: process.env.X_BEARER_TOKEN || savedConfig.x?.bearerToken || DEFAULT_CONFIG.x.bearerToken,
        },
        ai: {
            ...DEFAULT_CONFIG.ai,
            ...(savedConfig.ai || {}),
            gemini: {
                ...DEFAULT_CONFIG.ai.gemini,
                ...(savedConfig.ai?.gemini || {}),
                apiKey: process.env.GEMINI_API_KEY || savedConfig.ai?.gemini?.apiKey || DEFAULT_CONFIG.ai.gemini.apiKey,
                enabled: process.env.GEMINI_ENABLED === 'true' || savedConfig.ai?.gemini?.enabled || DEFAULT_CONFIG.ai.gemini.enabled,
            },
            bytez: {
                ...DEFAULT_CONFIG.ai.bytez,
                ...(savedConfig.ai?.bytez || {}),
                apiKey: process.env.BYTEZ_API_KEY || savedConfig.ai?.bytez?.apiKey || (DEFAULT_CONFIG.ai.bytez as any).apiKey,
                enabled: process.env.BYTEZ_ENABLED === 'true' || savedConfig.ai?.bytez?.enabled || (DEFAULT_CONFIG.ai.bytez as any).enabled,
            },
            openrouter: {
                ...DEFAULT_CONFIG.ai.openrouter,
                ...(savedConfig.ai?.openrouter || {}),
                apiKey: process.env.OPENROUTER_API_KEY || savedConfig.ai?.openrouter?.apiKey || DEFAULT_CONFIG.ai.openrouter.apiKey,
                enabled: process.env.OPENROUTER_ENABLED === 'true' || savedConfig.ai?.openrouter?.enabled || DEFAULT_CONFIG.ai.openrouter.enabled,
                model: process.env.OPENROUTER_MODEL || savedConfig.ai?.openrouter?.model || DEFAULT_CONFIG.ai.openrouter.model,
            },
        },
        bot: {
            ...DEFAULT_CONFIG.bot,
            ...(savedConfig.bot || {}),
            isRunning: process.env.BOT_RUNNING === 'true' || savedConfig.bot?.isRunning || DEFAULT_CONFIG.bot.isRunning,
            keywords: process.env.BOT_KEYWORDS ? process.env.BOT_KEYWORDS.split(',') : (savedConfig.bot?.keywords || DEFAULT_CONFIG.bot.keywords),
            tweetSettings: {
                ...DEFAULT_CONFIG.bot.tweetSettings,
                ...(savedConfig.bot?.tweetSettings || {}),
                topics: process.env.BOT_TOPICS ? process.env.BOT_TOPICS.split(',') : (savedConfig.bot?.tweetSettings?.topics || DEFAULT_CONFIG.bot.tweetSettings.topics),
            },
            persona: {
                ...DEFAULT_CONFIG.bot.persona,
                ...(savedConfig.bot?.persona || {})
            }
        }
    };

    return config;
}

export function saveConfig(config: AppConfig) {
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
    } catch (error) {
        console.error('Error saving config:', error);
        throw error;
    }
}
