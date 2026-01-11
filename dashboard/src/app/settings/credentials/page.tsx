'use client';

import React, { useState, useEffect } from 'react';
import {
    Twitter,
    Cpu,
    ShieldCheck,
    Save,
    Eye,
    EyeOff,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { AppConfig } from '@/lib/config-helper';

export default function CredentialsPage() {
    const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
    const [config, setConfig] = useState<AppConfig | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetch('/api/config')
            .then(res => res.json())
            .then(data => setConfig(data))
            .catch(err => console.error('Failed to load config:', err));
    }, []);

    const toggleKey = (key: string) => {
        setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = async () => {
        if (!config) return;
        setIsSaving(true);
        try {
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });
            if (!res.ok) throw new Error('Save failed');
            alert('Settings saved successfully!');
        } catch (error) {
            console.error(error);
            alert('Failed to save settings.');
        } finally {
            setIsSaving(false);
        }
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
            <div>
                <h1 className="text-4xl font-bold tracking-tight text-white mb-2 font-outfit">Credentials & API</h1>
                <p className="text-muted-foreground">Manage your connections to X (Twitter) and AI providers.</p>
            </div>

            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Twitter Section */}
                <section className="glass p-8 rounded-3xl relative overflow-hidden ring-1 ring-white/10">
                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
                        <Twitter className="w-32 h-32" />
                    </div>

                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center ring-1 ring-primary/20">
                            <Twitter className="text-primary w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white font-outfit">X / Twitter API</h2>
                            <p className="text-sm text-muted-foreground">Standard v2 API credentials</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        {[
                            { label: 'Consumer Key', id: 'consumerKey' },
                            { label: 'Consumer Secret', id: 'consumerSecret' },
                            { label: 'Access Token', id: 'accessToken' },
                            { label: 'Access Token Secret', id: 'accessTokenSecret' },
                        ].map((field) => (
                            <div key={field.id} className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">{field.label}</label>
                                <div className="relative group">
                                    <input
                                        type={showKeys[field.id] ? 'text' : 'password'}
                                        value={config.x[field.id as keyof typeof config.x] || ''}
                                        onChange={(e) => setConfig({
                                            ...config,
                                            x: { ...config.x, [field.id]: e.target.value }
                                        })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/40 focus:bg-white/10 outline-none transition-all pr-14"
                                    />
                                    <button
                                        onClick={() => toggleKey(field.id)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                                    >
                                        {showKeys[field.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        ))}
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Bearer Token (Optional)</label>
                            <div className="relative group">
                                <input
                                    type={showKeys['bearerToken'] ? 'text' : 'password'}
                                    value={config.x.bearerToken || ''}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        x: { ...config.x, bearerToken: e.target.value }
                                    })}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/40 focus:bg-white/10 outline-none transition-all pr-14"
                                />
                                <button
                                    onClick={() => toggleKey('bearerToken')}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                                >
                                    {showKeys['bearerToken'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* AI Providers Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
                    {/* Bytez */}
                    <section className="glass p-8 rounded-3xl flex flex-col ring-1 ring-white/10">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center ring-1 ring-emerald-500/20">
                                    <Cpu className="text-emerald-400 w-6 h-6" />
                                </div>
                                <h2 className="text-xl font-bold text-white font-outfit">Bytez AI</h2>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={config.ai.bytez?.enabled}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        ai: { ...config.ai, bytez: { ...config.ai.bytez, enabled: e.target.checked, apiKey: config.ai.bytez?.apiKey || '' } }
                                    })}
                                />
                                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                        </div>

                        <div className="flex-1 space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">API Key</label>
                                <input
                                    type="password"
                                    value={config.ai.bytez?.apiKey || ''}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        ai: { ...config.ai, bytez: { ...config.ai.bytez!, apiKey: e.target.value } }
                                    })}
                                    placeholder="Enter Bytez API Key"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/40 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Model Override</label>
                                <input
                                    type="text"
                                    value={config.ai.bytez?.model || ''}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        ai: { ...config.ai, bytez: { ...config.ai.bytez!, model: e.target.value } }
                                    })}
                                    placeholder="Qwen/Qwen3-4B"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/40 outline-none transition-all"
                                />
                            </div>
                            <div className="flex items-start gap-2 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                                <AlertCircle className="w-4 h-4 text-emerald-400 mt-0.5" />
                                <p className="text-[11px] text-emerald-300 leading-relaxed">
                                    Primary provider for thinking models. High quality reasoning recommended for complex threads.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Gemini */}
                    <section className="glass p-8 rounded-3xl flex flex-col ring-1 ring-white/10">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center ring-1 ring-blue-500/20">
                                    <ShieldCheck className="text-blue-400 w-6 h-6" />
                                </div>
                                <h2 className="text-xl font-bold text-white font-outfit">Google Gemini</h2>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={config.ai.gemini.enabled}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        ai: { ...config.ai, gemini: { ...config.ai.gemini, enabled: e.target.checked } }
                                    })}
                                />
                                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                        </div>

                        <div className="flex-1 space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">API Key</label>
                                <input
                                    type="password"
                                    value={config.ai.gemini.apiKey}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        ai: { ...config.ai, gemini: { ...config.ai.gemini, apiKey: e.target.value } }
                                    })}
                                    placeholder="Enter Gemini API Key"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/40 outline-none transition-all"
                                />
                            </div>
                            <div className="flex items-start gap-2 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                                <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5" />
                                <p className="text-[11px] text-blue-300 leading-relaxed">
                                    Recommended for free use. Get yours from the <a href="https://aistudio.google.com/" target="_blank" className="font-bold underline">Google AI Studio</a> portal.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* OpenRouter */}
                    <section className="glass p-8 rounded-3xl flex flex-col ring-1 ring-white/10">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center ring-1 ring-purple-500/20">
                                    <Cpu className="text-purple-400 w-6 h-6" />
                                </div>
                                <h2 className="text-xl font-bold text-white font-outfit">OpenRouter</h2>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={config.ai.openrouter.enabled}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        ai: { ...config.ai, openrouter: { ...config.ai.openrouter, enabled: e.target.checked } }
                                    })}
                                />
                                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                        </div>

                        <div className="flex-1 space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">API Key</label>
                                <input
                                    type="password"
                                    value={config.ai.openrouter.apiKey}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        ai: { ...config.ai, openrouter: { ...config.ai.openrouter, apiKey: e.target.value } }
                                    })}
                                    placeholder="Enter OpenRouter API Key"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/40 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Model Override</label>
                                <input
                                    type="text"
                                    value={config.ai.openrouter.model || ''}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        ai: { ...config.ai, openrouter: { ...config.ai.openrouter, model: e.target.value } }
                                    })}
                                    placeholder="meta-llama/llama-3.2-3b-instruct:free"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/40 outline-none transition-all"
                                />
                            </div>
                        </div>
                    </section>
                </div>

                <div className="flex items-center justify-between p-8 glass rounded-3xl ring-1 ring-white/10">
                    <div>
                        <h3 className="text-lg font-bold text-white font-outfit">Confirm Changes</h3>
                        <p className="text-sm text-muted-foreground">Save your API keys and provider preferences.</p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-3 bg-primary hover:bg-primary/90 text-white px-10 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-primary/30 hover:shadow-primary/40 active:scale-95 disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        <span>Update Configuration</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
