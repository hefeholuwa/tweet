'use client';

import React, { useState, useEffect } from 'react';
import {
    UserCircle,
    Save,
    Loader2,
    Sparkles,
    Zap,
    MessageSquare,
    Target,
    Copy,
    Check
} from 'lucide-react';
import { AppConfig } from '@/lib/config-helper';

export default function PersonaPage() {
    const [config, setConfig] = useState<AppConfig | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [handleInput, setHandleInput] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<{
        name: string;
        bio: string;
        tone: string;
        customInstructions: string;
    } | null>(null);

    useEffect(() => {
        fetch('/api/config')
            .then(res => res.json())
            .then(data => setConfig(data))
            .catch(err => console.error('Failed to load config:', err));
    }, []);

    const handleSave = async () => {
        if (!config) return;
        setIsSaving(true);
        try {
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            if (res.ok) {
                alert('Persona updated successfully!');
            }
        } catch (error) {
            alert('Failed to save persona');
        } finally {
            setIsSaving(false);
        }
    };

    const analyzeStyle = async () => {
        if (!handleInput.trim()) return;
        setIsAnalyzing(true);
        setAnalysisResult(null);
        try {
            const res = await fetch('/api/analyze-style', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pastedTweets: handleInput })
            });
            const data = await res.json();
            if (data.persona) {
                setAnalysisResult(data.persona);
            } else {
                alert(data.error || 'Failed to analyze style');
            }
        } catch (error) {
            alert('Failed to analyze style');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const applyAnalyzedStyle = () => {
        if (!analysisResult || !config) return;
        setConfig({
            ...config,
            bot: {
                ...config.bot,
                persona: {
                    name: analysisResult.name,
                    bio: analysisResult.bio,
                    tone: analysisResult.tone,
                    customInstructions: analysisResult.customInstructions
                }
            }
        });
        setAnalysisResult(null);
        setHandleInput('');
    };

    if (!config) {
        return (
            <div className="h-96 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-5xl font-bold tracking-tighter text-white mb-2 font-outfit">AI Persona</h1>
                    <p className="text-muted-foreground">Define your bot's unique voice and identity.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-primary/20 flex items-center gap-3 disabled:opacity-50 w-full md:w-auto justify-center"
                >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    <span>Save Changes</span>
                </button>
            </div>

            {/* Style Cloner */}
            <section className="glass p-8 rounded-3xl ring-1 ring-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center ring-1 ring-primary/30">
                        <Copy className="text-primary w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white font-outfit">Clone Viral Style</h2>
                        <p className="text-sm text-muted-foreground">Analyze any Twitter account and clone their writing style</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <textarea
                            value={handleInput}
                            onChange={(e) => setHandleInput(e.target.value)}
                            placeholder="Paste 10-20 tweets here (one per line or separated by line breaks). Copy them directly from the Twitter profile you want to clone."
                            rows={6}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/40 outline-none transition-all text-white resize-none"
                        />
                    </div>
                    <button
                        onClick={analyzeStyle}
                        disabled={isAnalyzing || !handleInput.trim()}
                        className="bg-primary hover:bg-primary/90 text-white px-6 py-4 rounded-2xl font-bold transition-all flex items-center gap-2 disabled:opacity-50 justify-center w-full sm:w-auto"
                    >
                        {isAnalyzing ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Analyzing...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5" />
                                <span>Extract Style DNA</span>
                            </>
                        )}
                    </button>
                </div>

                {analysisResult && (
                    <div className="mt-6 p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-white">Extracted Style DNA</h3>
                            <button
                                onClick={applyAnalyzedStyle}
                                className="bg-green-500/20 hover:bg-green-500/30 text-green-400 px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 text-sm"
                            >
                                <Check className="w-4 h-4" />
                                Apply to Persona
                            </button>
                        </div>
                        <div className="grid gap-3 text-sm">
                            <div><span className="text-muted-foreground">Name:</span> <span className="text-white">{analysisResult.name}</span></div>
                            <div><span className="text-muted-foreground">Tone:</span> <span className="text-white">{analysisResult.tone}</span></div>
                            <div><span className="text-muted-foreground">Bio:</span> <span className="text-white">{analysisResult.bio}</span></div>
                            <div className="pt-2 border-t border-white/10">
                                <span className="text-muted-foreground block mb-1">Style Instructions:</span>
                                <span className="text-white/80 text-xs leading-relaxed">{analysisResult.customInstructions}</span>
                            </div>
                        </div>
                    </div>
                )}
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Basic Identity */}
                <section className="glass p-8 rounded-3xl space-y-8 ring-1 ring-white/10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center ring-1 ring-primary/20">
                            <UserCircle className="text-primary w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-bold text-white font-outfit">Identity</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Persona Name</label>
                            <input
                                type="text"
                                value={config.bot.persona.name}
                                onChange={(e) => setConfig({
                                    ...config,
                                    bot: { ...config.bot, persona: { ...config.bot.persona, name: e.target.value } }
                                })}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/40 outline-none transition-all text-white"
                                placeholder="e.g. Satoshi's Apprentice"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Bio / Background</label>
                            <textarea
                                value={config.bot.persona.bio}
                                onChange={(e) => setConfig({
                                    ...config,
                                    bot: { ...config.bot, persona: { ...config.bot.persona, bio: e.target.value } }
                                })}
                                rows={4}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/40 outline-none transition-all resize-none text-white"
                                placeholder="Describe who this bot is, its inspirations, and its expertise..."
                            />
                        </div>
                    </div>
                </section>

                {/* Voice & Style */}
                <section className="glass p-8 rounded-3xl space-y-8 ring-1 ring-white/10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center ring-1 ring-primary/20">
                            <Zap className="text-primary w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-bold text-white font-outfit">Voice & Style</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Tone of Voice</label>
                            <input
                                type="text"
                                value={config.bot.persona.tone}
                                onChange={(e) => setConfig({
                                    ...config,
                                    bot: { ...config.bot, persona: { ...config.bot.persona, tone: e.target.value } }
                                })}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/40 outline-none transition-all text-white"
                                placeholder="e.g. Witty, Academic, Hype-man, Sarcastic..."
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Custom Instructions</label>
                            <textarea
                                value={config.bot.persona.customInstructions}
                                onChange={(e) => setConfig({
                                    ...config,
                                    bot: { ...config.bot, persona: { ...config.bot.persona, customInstructions: e.target.value } }
                                })}
                                rows={4}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/40 outline-none transition-all resize-none text-white"
                                placeholder="Specific rules: 'Never use emojis', 'Always ask a follow-up question', 'Be brief'..."
                            />
                        </div>
                    </div>
                </section>

                {/* Preview Cards */}
                <section className="md:col-span-2 glass p-8 rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-white/5 to-transparent">
                    <div className="flex items-center gap-3 mb-8">
                        <Sparkles className="text-primary w-5 h-5" />
                        <h2 className="text-xl font-bold text-white font-outfit">Tone Preview</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                <MessageSquare className="w-3 h-3" />
                                Reply Style
                            </div>
                            <p className="text-sm italic text-muted-foreground">
                                "Responding as <span className="text-primary font-bold">{config.bot.persona.name || 'Bot'}</span> using a <span className="text-white font-medium">{config.bot.persona.tone || 'neutral'}</span> tone..."
                            </p>
                        </div>
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                <Target className="w-3 h-3" />
                                Original Content
                            </div>
                            <p className="text-sm italic text-muted-foreground">
                                "Generating unique insights based on: <span className="text-white font-medium truncate inline-block max-w-[200px] align-bottom">{config.bot.persona.bio || 'Your background'}</span>"
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
