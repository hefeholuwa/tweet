'use client';

import React, { useState, useEffect } from 'react';
import {
    Play,
    Pause,
    Clock,
    Filter,
    MessageCircle,
    RefreshCw,
    Target,
    Loader2,
    Save,
    Sparkles,
    Send
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AppConfig } from '@/lib/config-helper';

export default function AutomationPage() {
    const [config, setConfig] = useState<AppConfig | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [newKeyword, setNewKeyword] = useState('');
    const [newTopic, setNewTopic] = useState('');

    useEffect(() => {
        fetch('/api/config')
            .then(res => res.json())
            .then(data => setConfig(data))
            .catch(err => console.error('Failed to load config:', err));
    }, []);

    const handleSave = async (updatedConfig: AppConfig = config!) => {
        if (!updatedConfig) return;
        setIsSaving(true);
        try {
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedConfig),
            });
            if (!res.ok) throw new Error('Save failed');
            alert('Automation settings updated!');
        } catch (error) {
            console.error(error);
            alert('Failed to save settings.');
        } finally {
            setIsSaving(false);
        }
    };

    const toggleBot = async () => {
        if (!config) return;
        const newRunningState = !config.bot.isRunning;
        const updated = { ...config, bot: { ...config.bot, isRunning: newRunningState } };
        setConfig(updated);
        await handleSave(updated);

        // If we just started the bot, trigger an immediate run
        if (newRunningState) {
            try {
                const res = await fetch('/api/trigger', { method: 'POST' });
                if (res.ok) {
                    alert('Bot started and first run triggered! Check the Overview for activity.');
                } else {
                    const err = await res.json();
                    alert(`Bot enabled, but first run failed: ${err.error}`);
                }
            } catch (error) {
                alert('Bot enabled, but could not trigger first run.');
            }
        } else {
            alert('Bot stopped.');
        }
    };

    const addKeyword = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && newKeyword.trim() && config) {
            const updated = { ...config, bot: { ...config.bot, keywords: [...config.bot.keywords, newKeyword.trim()] } };
            setConfig(updated);
            setNewKeyword('');
        }
    };

    const removeKeyword = (kw: string) => {
        if (!config) return;
        const updated = { ...config, bot: { ...config.bot, keywords: config.bot.keywords.filter(k => k !== kw) } };
        setConfig(updated);
    };

    const addTopic = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && newTopic.trim() && config) {
            const updated = {
                ...config,
                bot: {
                    ...config.bot,
                    tweetSettings: {
                        ...config.bot.tweetSettings,
                        topics: [...config.bot.tweetSettings.topics, newTopic.trim()]
                    }
                }
            };
            setConfig(updated);
            setNewTopic('');
        }
    };

    const removeTopic = (topic: string) => {
        if (!config) return;
        const updated = {
            ...config,
            bot: {
                ...config.bot,
                tweetSettings: {
                    ...config.bot.tweetSettings,
                    topics: config.bot.tweetSettings.topics.filter(t => t !== topic)
                }
            }
        };
        setConfig(updated);
    };

    if (!config) {
        return (
            <div className="h-96 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-white mb-2 font-outfit">Automation Settings</h1>
                    <p className="text-muted-foreground">Configure how and when your bot engages with X (Twitter).</p>
                </div>

                <button
                    onClick={toggleBot}
                    disabled={isSaving}
                    className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-bold transition-all shadow-xl ${config.bot.isRunning
                        ? "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20"
                        : "bg-emerald-500 text-white shadow-emerald-500/20 hover:bg-emerald-600"
                        } disabled:opacity-50`}
                >
                    {config.bot.isRunning ? (
                        <>
                            <Pause className="w-5 h-5 fill-current" />
                            <span>Stop Bot</span>
                        </>
                    ) : (
                        <>
                            <Play className="w-5 h-5 fill-current" />
                            <span>Start Bot</span>
                        </>
                    )}
                </button>
            </div>

            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
                    {/* Scheduling Section */}
                    <section className="glass p-8 rounded-3xl flex flex-col ring-1 ring-white/10">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center ring-1 ring-primary/20">
                                <Clock className="text-primary w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white font-outfit">Scheduling</h2>
                                <p className="text-xs text-muted-foreground">Control bot frequency</p>
                            </div>
                        </div>

                        <div className="flex-1 space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Run Every (Minutes)</label>
                                <input
                                    type="number"
                                    value={config.bot.intervalMinutes}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        bot: { ...config.bot, intervalMinutes: parseInt(e.target.value) }
                                    })}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/40 outline-none transition-all font-mono"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Max Replies Per Run</label>
                                <input
                                    type="number"
                                    value={config.bot.maxRepliesPerRun}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        bot: { ...config.bot, maxRepliesPerRun: parseInt(e.target.value) }
                                    })}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/40 outline-none transition-all font-mono"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Filters Section */}
                    <section className="glass p-8 rounded-3xl flex flex-col ring-1 ring-white/10">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center ring-1 ring-amber-500/20">
                                <Filter className="text-amber-500 w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white font-outfit">Filters</h2>
                                <p className="text-xs text-muted-foreground">Safety & Targeting</p>
                            </div>
                        </div>

                        <div className="flex-1 space-y-6">
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                                <div>
                                    <div className="text-sm font-semibold text-white">Avoid Retweets</div>
                                    <div className="text-[10px] text-muted-foreground">Don&apos;t engage with RTs</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={config.bot.avoidRetweets}
                                        onChange={(e) => setConfig({
                                            ...config,
                                            bot: { ...config.bot, avoidRetweets: e.target.checked }
                                        })}
                                    />
                                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                                <div>
                                    <div className="text-sm font-semibold text-white">Avoid Replies</div>
                                    <div className="text-[10px] text-muted-foreground">Prevent reply loops</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={config.bot.avoidReplies}
                                        onChange={(e) => setConfig({
                                            ...config,
                                            bot: { ...config.bot, avoidReplies: e.target.checked }
                                        })}
                                    />
                                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                            </div>
                        </div>
                    </section>

                    {/* Original Tweets Section */}
                    <section className="glass p-8 rounded-3xl flex flex-col md:col-span-2 ring-1 ring-white/10">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center ring-1 ring-primary/20">
                                    <Sparkles className="text-primary w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white font-outfit">Original Tweets</h2>
                                    <p className="text-xs text-muted-foreground">AI-generated standalone content</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={config.bot.tweetSettings?.enabled || false}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        bot: {
                                            ...config.bot,
                                            tweetSettings: { ...config.bot.tweetSettings, enabled: e.target.checked }
                                        }
                                    })}
                                />
                                <div className="w-14 h-7 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                        </div>

                        {config.bot.tweetSettings.enabled && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-4 md:col-span-1">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Tweets Per Run</label>
                                        <input
                                            type="number"
                                            value={config.bot.tweetSettings.tweetsPerRun}
                                            onChange={(e) => setConfig({
                                                ...config,
                                                bot: {
                                                    ...config.bot,
                                                    tweetSettings: { ...config.bot.tweetSettings, tweetsPerRun: parseInt(e.target.value) }
                                                }
                                            })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/40 outline-none transition-all font-mono"
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground px-1">How many original tweets to post in each cycle.</p>
                                </div>

                                <div className="md:col-span-2 space-y-4">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Tweet Topics</label>
                                    <div className="bg-white/5 rounded-2xl p-4 border border-white/10 min-h-[120px] flex flex-wrap items-start content-start gap-2">
                                        {config.bot.tweetSettings.topics.map(topic => (
                                            <motion.div
                                                initial={{ scale: 0.9, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                key={topic}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-xl text-xs text-primary font-medium group cursor-default"
                                            >
                                                <span>{topic}</span>
                                                <button
                                                    onClick={() => removeTopic(topic)}
                                                    className="hover:scale-125 transition-transform text-primary/60 hover:text-primary font-bold"
                                                >
                                                    ×
                                                </button>
                                            </motion.div>
                                        ))}
                                        <input
                                            type="text"
                                            placeholder="Add topic + Enter..."
                                            value={newTopic}
                                            onChange={(e) => setNewTopic(e.target.value)}
                                            onKeyDown={addTopic}
                                            className="bg-transparent border-none outline-none text-xs px-2 py-1.5 flex-1 min-w-[150px] text-white placeholder:text-muted-foreground/50"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Keyword Management */}
                    <section className="glass p-8 rounded-3xl space-y-8 md:col-span-2 ring-1 ring-white/10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center ring-1 ring-emerald-500/20">
                                    <Target className="text-emerald-500 w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white font-outfit">Targeting & Keywords</h2>
                                    <p className="text-xs text-muted-foreground">Engage with these topics</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setConfig({ ...config, bot: { ...config.bot, keywords: [] } })}
                                className="text-primary text-xs font-bold tracking-widest uppercase hover:bg-primary/10 px-4 py-2 rounded-xl transition-colors flex items-center gap-2"
                            >
                                <RefreshCw className="w-3 h-3" />
                                Clear All
                            </button>
                        </div>

                        <div className="bg-white/5 rounded-3xl p-6 border border-white/10 min-h-[160px] flex flex-wrap items-start content-start gap-3">
                            {config.bot.keywords.map(tag => (
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    key={tag}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-2xl text-sm text-primary font-medium group cursor-default"
                                >
                                    <span>{tag}</span>
                                    <button
                                        onClick={() => removeKeyword(tag)}
                                        className="hover:scale-125 transition-transform text-primary/60 hover:text-primary"
                                    >
                                        ×
                                    </button>
                                </motion.div>
                            ))}
                            <input
                                type="text"
                                placeholder="Add keyword + Enter..."
                                value={newKeyword}
                                onChange={(e) => setNewKeyword(e.target.value)}
                                onKeyDown={addKeyword}
                                className="bg-transparent border-none outline-none text-sm px-2 py-2 flex-1 min-w-[200px] text-white placeholder:text-muted-foreground/50"
                            />
                        </div>
                    </section>

                    <section className="md:col-span-2 flex items-center justify-between p-8 glass rounded-3xl ring-1 ring-white/10">
                        <div>
                            <h3 className="text-lg font-bold text-white font-outfit">Confirm Changes</h3>
                            <p className="text-sm text-muted-foreground">Update your engagement strategy.</p>
                        </div>
                        <button
                            onClick={() => handleSave()}
                            disabled={isSaving}
                            className="flex items-center gap-3 bg-primary hover:bg-primary/90 text-white px-10 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-primary/30 hover:shadow-primary/40 active:scale-95 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            <span>Update Automation</span>
                        </button>
                    </section>
                </div>
            </div>
        </div>
    );
}
