import { XAPI, Tweet } from './x-api';
import { AIGenerator } from './ai-generator';
import fs from 'fs';
import path from 'path';

export interface BotActivity {
    id: string;
    tweetId?: string;
    replyId?: string;
    authorUsername?: string;
    text: string;
    type: 'reply' | 'tweet';
    source: 'search' | 'timeline' | 'original';
    keyword?: string;
    timestamp: string;
    status: 'generated' | 'posted' | 'failed' | 'rate-limited';
    error?: string;
}

export interface BotSettings {
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
}

export class Bot {
    private xApi: XAPI;
    private ai: AIGenerator;
    private settings: BotSettings;
    private repliedIdsPath: string;
    private activityPath: string;
    private repliedIds: Set<string>;
    private activities: BotActivity[];
    private isProcessing: boolean = false;

    constructor(xApi: XAPI, ai: AIGenerator, settings: BotSettings) {
        this.xApi = xApi;
        this.ai = ai;
        this.settings = settings;
        this.repliedIdsPath = path.join(process.cwd(), 'replied_ids.json');
        this.activityPath = path.join(process.cwd(), 'activity.json');

        console.log(`Bot initialized. Data paths:\n- Replied IDs: ${this.repliedIdsPath}\n- Activity: ${this.activityPath}`);

        this.repliedIds = this.loadRepliedIds();
        this.activities = this.loadActivities();
    }

    private loadRepliedIds(): Set<string> {
        try {
            if (fs.existsSync(this.repliedIdsPath)) {
                const data = fs.readFileSync(this.repliedIdsPath, 'utf8');
                return new Set(JSON.parse(data));
            }
        } catch (error) {
            console.error('Failed to load replied IDs:', error);
        }
        return new Set();
    }

    private loadActivities(): BotActivity[] {
        try {
            if (fs.existsSync(this.activityPath)) {
                const data = fs.readFileSync(this.activityPath, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Failed to load activities:', error);
        }
        return [];
    }

    private saveState() {
        try {
            console.log(`[Bot] Saving state to ${this.activityPath}...`);
            const activityData = JSON.stringify(this.activities, null, 2);
            fs.writeFileSync(this.activityPath, activityData);

            const idsData = JSON.stringify(Array.from(this.repliedIds));
            fs.writeFileSync(this.repliedIdsPath, idsData);

            console.log(`[Bot] State saved successfully. Activities count: ${this.activities.length}`);
        } catch (error: any) {
            console.error('[Bot] CRITICAL: Failed to save state:', error.message || error);
        }
    }

    async run() {
        if (this.isProcessing) {
            console.log('[Bot] Skipping run: already processing a neural cycle.');
            return;
        }

        console.log('--- Starting Bot Iteration ---');
        this.isProcessing = true;

        try {
            if (this.settings.isRunning === false) {
                console.log('Bot is disabled in settings (isRunning: false). Skipping run.');
                return;
            }

            // 1. Original Tweets
            if (this.settings.tweetSettings?.enabled) {
                await this.handleOriginalTweets();
            }

            let totalProcessed = 0;

            // 1. Search by keywords
            console.log(`Starting keyword search for ${this.settings.keywords.length} keywords...`);
            for (const keyword of this.settings.keywords) {
                if (totalProcessed >= this.settings.maxRepliesPerRun) break;

                const tweets = await this.xApi.searchTweets(keyword, 5);
                if (tweets.length === 0) {
                    console.log(`No new tweets found for keyword: ${keyword} (Note: Search is restricted on Twitter Free Tier)`);
                    continue;
                }

                console.log(`Found ${tweets.length} tweets for keyword: ${keyword}`);
                for (const tweet of tweets) {
                    if (totalProcessed >= this.settings.maxRepliesPerRun) break;

                    if (await this.shouldReply(tweet)) {
                        await this.processTweet(tweet, keyword);
                        totalProcessed++;
                    }
                }
            }

            // 2. Check timeline
            if (totalProcessed < this.settings.maxRepliesPerRun) {
                const timelineTweets = await this.xApi.getHomeTimeline(20);
                for (const tweet of timelineTweets) {
                    if (totalProcessed >= this.settings.maxRepliesPerRun) break;

                    if (await this.shouldReply(tweet)) {
                        await this.processTweet(tweet);
                        totalProcessed++;
                    }
                }
            }

        } finally {
            this.isProcessing = false;
            this.saveState();
            console.log('Bot run finished.');
        }
    }

    private async shouldReply(tweet: Tweet): Promise<boolean> {
        if (this.repliedIds.has(tweet.id)) return false;
        if (this.settings.avoidRetweets && tweet.isRetweet) return false;
        if (this.settings.avoidReplies && tweet.inReplyToStatusId) return false;

        return true;
    }

    private async handleOriginalTweets() {
        const tweetsToPost = this.settings.tweetSettings.tweetsPerRun;
        console.log(`Generating ${tweetsToPost} original tweets...`);

        for (let i = 0; i < tweetsToPost; i++) {
            const topic = this.settings.tweetSettings.topics[Math.floor(Math.random() * this.settings.tweetSettings.topics.length)];
            console.log(`[OriginalTweet] Step 1: Selected topic "${topic}"`);

            let tweetText = '';
            let isDuplicate = true;
            let attempts = 0;

            while (isDuplicate && attempts < 3) {
                attempts++;
                tweetText = await this.ai.generateOriginalTweet(topic) || '';

                if (!tweetText) break;

                isDuplicate = this.activities.some(a => a.text.trim().toLowerCase() === tweetText.trim().toLowerCase());

                if (isDuplicate) {
                    console.log(`[OriginalTweet] Loop: Generated text is a duplicate of a recent post. Retrying (Attempt ${attempts}/3)...`);
                }
            }

            console.log(`[OriginalTweet] Step 2: AI result is ${tweetText ? 'PRESENT (' + tweetText.length + ' chars)' : 'MISSING'}`);

            if (tweetText && !isDuplicate) {
                // Log activity as generated first
                const activity: BotActivity = {
                    id: Math.random().toString(36).substring(7),
                    text: tweetText,
                    type: 'tweet',
                    source: 'original',
                    keyword: topic,
                    timestamp: new Date().toISOString(),
                    status: 'generated'
                };

                this.activities.unshift(activity);
                if (this.activities.length > 100) this.activities.pop();
                this.saveState();

                console.log(`[OriginalTweet] Step 3: Posting to X...`);
                const tweetId = await this.xApi.postTweet(tweetText);

                if (tweetId) {
                    activity.tweetId = tweetId;
                    activity.status = 'posted';
                    console.log(`[OriginalTweet] SUCCESS: Posted and updated activity ${activity.id}`);
                } else {
                    // Check if it was a rate limit
                    if (this.xApi.isRateLimited()) {
                        activity.status = 'rate-limited';
                        activity.error = 'Twitter API Rate Limit';
                        console.log(`[OriginalTweet] RATE LIMITED: Post skipped/failed for activity ${activity.id}`);
                    } else {
                        activity.status = 'failed';
                        activity.error = 'Rejected by Twitter (Duplicate or Permission)';
                        console.log(`[OriginalTweet] FAILED: Post failed for activity ${activity.id}`);
                    }
                }
                this.saveState();
            } else {
                console.log(`[OriginalTweet] FAILED: No content generated for topic "${topic}"`);
            }
        }
    }

    private async processTweet(tweet: Tweet, keyword?: string) {
        console.log(`Processing tweet ${tweet.id} from @${tweet.authorUsername}`);

        const replyText = await this.ai.generateReply(tweet.text, tweet.authorUsername, keyword);
        if (replyText) {
            // Log as generated first
            const activity: BotActivity = {
                id: Math.random().toString(36).substring(7),
                tweetId: tweet.id,
                authorUsername: tweet.authorUsername,
                text: replyText,
                type: 'reply',
                source: keyword ? 'search' : 'timeline',
                keyword: keyword,
                timestamp: new Date().toISOString(),
                status: 'generated'
            };

            this.activities.unshift(activity);
            if (this.activities.length > 100) this.activities.pop();
            this.saveState();

            console.log(`[Reply] Posting reply to X...`);
            const replyId = await this.xApi.postReply(replyText, tweet.id);
            if (replyId) {
                activity.replyId = replyId;
                activity.status = 'posted';
                this.repliedIds.add(tweet.id);
                console.log(`Successfully replied to ${tweet.id} with ${replyId}`);
            } else {
                if (this.xApi.isRateLimited()) {
                    activity.status = 'rate-limited';
                    console.log(`Rate limited while replying to ${tweet.id}`);
                } else {
                    activity.status = 'failed';
                    console.log(`Failed to post reply to ${tweet.id}`);
                }
            }
            this.saveState();
        } else {
            console.log(`No reply generated for tweet: ${tweet.id} (Refusal or error). Marking as processed to avoid retry.`);
            this.repliedIds.add(tweet.id);
        }
    }
}
