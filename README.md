# Tweetpy - AI-Powered X Bot

A modern, stateless Auto-Reply bot for X (Twitter) built with Next.js 15, TypeScript, and Google Gemini / OpenRouter.

## 🚀 Overview

This project has been fully migrated from a legacy Python Flask application to a premium Next.js 15 stack. It features:
- **Premium Dashboard**: Glassmorphic UI with real-time automation controls.
- **Stateless Architecture**: No database required. Bot state and credentials are persisted in local JSON files.
- **AI-Powered Replies**: Seamless integration with Google Gemini and OpenRouter.

## 📁 Project Structure

```text
.
├── dashboard/          # Next.js 15 Web Application
│   ├── src/            # App Router & UI Components
│   └── scripts/        # Background Worker Logic
├── config.json         # Local configuration (API keys, bot settings)
├── replied_ids.json    # Tracking for replied tweets
└── package.json        # Root scripts for easy execution
```

## 🛠️ Getting Started

### 1. Installation
```bash
npm install
```

### 2. Run Dashboard
```bash
npm run dev
```
Accessible at [http://localhost:3000](http://localhost:3000)

### 3. Run Bot Worker
```bash
npm run worker
```

## ⚙️ Configuration

Use the **Credentials** page in the dashboard to set up your X API and AI provider keys. All settings are saved to `config.json`.

---
*Powered by Next.js & AI*