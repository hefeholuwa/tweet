import { TwitterApi, TwitterApiReadOnly } from 'twitter-api-v2';
import fs from 'fs';
import path from 'path';

export interface XCredentials {
    consumerKey: string;
    consumerSecret: string;
    accessToken: string;
    accessTokenSecret: string;
    bearerToken?: string;
}

export interface Tweet {
    id: string;
    text: string;
    authorId: string;
    authorUsername: string;
    authorFollowersCount: number;
    createdAt: string;
    isRetweet: boolean;
    inReplyToStatusId?: string | null;
}

export class XAPI {
    private client: TwitterApi;
    private readClient: TwitterApiReadOnly;
    private userId: string | null = null;
    private rateLimitedUntil: number = 0;
    private lastRateLimitMessage: string = '';

    constructor(credentials: XCredentials) {
        this.client = new TwitterApi({
            appKey: credentials.consumerKey,
            appSecret: credentials.consumerSecret,
            accessToken: credentials.accessToken,
            accessSecret: credentials.accessTokenSecret,
        });
        this.readClient = credentials.bearerToken
            ? new TwitterApi(credentials.bearerToken).readOnly
            : this.client.readOnly;
    }

    isRateLimited(): boolean {
        if (Date.now() < this.rateLimitedUntil) {
            const resetTime = new Date(this.rateLimitedUntil).toLocaleTimeString();
            console.log(`[X API] Still rate limited until ${resetTime}. (${this.lastRateLimitMessage})`);
            return true;
        }
        return false;
    }

    private handleRateLimit(error: any) {
        // Twitter rate limits typically reset every 15 minutes
        this.rateLimitedUntil = Date.now() + 15 * 60 * 1000;
        this.lastRateLimitMessage = error.message || 'Unknown rate limit';
        console.log('[X API] Rate limit detected. Will retry in 15 minutes.');
    }

    async authenticate() {
        try {
            const me = await this.client.v2.me();
            this.userId = me.data.id;
            return me.data;
        } catch (error) {
            console.error('Authentication failed:', error);
            throw error;
        }
    }

    async getHomeTimeline(count: number = 20): Promise<Tweet[]> {
        try {
            const timeline = await this.client.v2.homeTimeline({
                max_results: Math.max(10, Math.min(count, 100)),
                'tweet.fields': ['created_at', 'author_id', 'in_reply_to_user_id', 'public_metrics'],
                expansions: ['author_id'],
                'user.fields': ['username', 'public_metrics'],
            });

            const users = new Map(timeline.includes?.users?.map(u => [u.id, u]) || []);

            return timeline.data.data.map(tweet => {
                const user = users.get(tweet.author_id!);
                return {
                    id: tweet.id,
                    text: tweet.text,
                    authorId: tweet.author_id!,
                    authorUsername: user?.username || 'unknown',
                    authorFollowersCount: user?.public_metrics?.followers_count || 0,
                    createdAt: tweet.created_at!,
                    isRetweet: false, // V2 doesn't return RTs by default in homeTimeline same way
                    inReplyToStatusId: tweet.in_reply_to_user_id || null,
                };
            });
        } catch (error) {
            console.error('Error fetching home timeline:', error);
            return [];
        }
    }

    async searchTweets(query: string, count: number = 10): Promise<Tweet[]> {
        try {
            const search = await this.client.v2.search(query, {
                max_results: Math.max(10, Math.min(count, 100)),
                'tweet.fields': ['created_at', 'author_id', 'in_reply_to_user_id', 'public_metrics'],
                expansions: ['author_id'],
                'user.fields': ['username', 'public_metrics'],
            });

            const users = new Map(search.includes?.users?.map(u => [u.id, u]) || []);

            return search.data.data.map(tweet => {
                const user = users.get(tweet.author_id!);
                return {
                    id: tweet.id,
                    text: tweet.text,
                    authorId: tweet.author_id!,
                    authorUsername: user?.username || 'unknown',
                    authorFollowersCount: user?.public_metrics?.followers_count || 0,
                    createdAt: tweet.created_at!,
                    isRetweet: false,
                    inReplyToStatusId: tweet.in_reply_to_user_id || null,
                };
            });
        } catch (error: any) {
            if (error.code === 403) {
                console.error(`ERROR 403: Search is not available on your current Twitter API tier (Free). Upgrade to Basic for keyword search.`);
            } else {
                console.error(`Error searching tweets for "${query}":`, error.message || error);
            }
            return [];
        }
    }

    async getUserTweets(username: string, count: number = 50): Promise<Tweet[]> {
        try {
            // First get the user ID from username
            const user = await this.client.v2.userByUsername(username, {
                'user.fields': ['public_metrics']
            });

            if (!user.data) {
                console.error(`User @${username} not found`);
                return [];
            }

            const userId = user.data.id;
            console.log(`[X API] Found user @${username} (ID: ${userId})`);

            // Get their tweets
            const tweets = await this.client.v2.userTimeline(userId, {
                max_results: Math.min(count, 100),
                'tweet.fields': ['created_at', 'public_metrics'],
                exclude: ['retweets', 'replies']
            });

            const results: Tweet[] = [];
            for (const tweet of tweets.data?.data || []) {
                results.push({
                    id: tweet.id,
                    text: tweet.text,
                    authorId: userId,
                    authorUsername: username,
                    authorFollowersCount: user.data.public_metrics?.followers_count || 0,
                    createdAt: tweet.created_at || new Date().toISOString(),
                    isRetweet: false,
                    inReplyToStatusId: null
                });
            }

            console.log(`[X API] Fetched ${results.length} tweets from @${username}`);
            return results;
        } catch (error: any) {
            if (error.code === 403) {
                console.error(`ERROR 403: Cannot fetch tweets from @${username}. API tier limitation.`);
            } else {
                console.error(`Error fetching tweets from @${username}:`, error.message || error);
            }
            return [];
        }
    }

    async postReply(text: string, inReplyToTweetId: string) {
        if (this.isRateLimited()) {
            console.log('[X API] Skipping reply due to rate limit');
            return null;
        }
        try {
            const reply = await this.client.v2.reply(text, inReplyToTweetId);
            return reply.data.id;
        } catch (error: any) {
            if (error.code === 429 || error.message?.includes('429')) {
                this.handleRateLimit(error);
            }
            console.error('Error posting reply:', error.message || error);
            return null;
        }
    }

    async postTweet(text: string) {
        if (this.isRateLimited()) {
            console.log('[X API] Skipping tweet due to rate limit');
            return null;
        }
        try {
            console.log(`[X API] Attempting to post tweet: "${text.substring(0, 50)}..."`);
            const tweet = await this.client.v2.tweet(text);
            return tweet.data.id;
        } catch (error: any) {
            const errorMsg = error.message || String(error);
            const errorData = error.data ? JSON.stringify(error.data) : '';
            console.error(`[X API] Post failed! Error: ${errorMsg} | Data: ${errorData}`);

            if (error.code === 429 || errorMsg.includes('429')) {
                this.handleRateLimit(error);
            } else if (error.code === 403) {
                const isDuplicate = errorMsg.toLowerCase().includes('duplicate') || errorData.toLowerCase().includes('duplicate');
                if (isDuplicate) {
                    console.error(`[X API] ERROR 403: Duplicate tweet detected.`);
                } else {
                    console.error(`[X API] ERROR 403: Forbidden. Check app permissions.`);
                }
            }
            return null;
        }
    }
}
