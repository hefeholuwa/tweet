# Automation Guide - Running the Bot Continuously

This guide explains how to set up the Auto-Reply X Bot to run automatically and engage with tweets twice daily.

## How It Works

The bot is designed to:
- **Run twice daily**: Morning (default 9:00 AM) and Evening (default 6:00 PM)
- **Engage with tweets**: Finds tweets matching your keywords and from your timeline
- **Post thoughtful replies**: Uses AI (Gemini) to generate natural, human-like replies
- **Delay between replies**: Waits 30-40 minutes between each reply to appear natural
- **Track replies**: Prevents duplicate replies to the same tweet

## Prerequisites

1. **Twitter/X API credentials** - Set up in the dashboard
2. **Gemini API key** - For AI-powered replies (recommended for natural responses)
3. **Keywords configured** - Set in the dashboard under "Keywords & Filters"
4. **Python installed** - The bot needs to run continuously

## Setup Steps

### 1. Configure the Bot

1. Log into the dashboard
2. Go to "Credentials" and add your Twitter API keys
3. Add your Gemini API key (for natural AI replies)
4. Go to "Keywords & Filters" and set up:
   - Keywords to search for
   - Max replies per run (recommended: 5-10 to start)
   - Delay settings (30-40 minutes is already set)

### 2. Test the Bot First

Before running continuously, test it once:

```bash
python main.py --run-once
```

This will run the bot once and exit, so you can verify everything works.

### 3. Run Continuously

#### Option A: Simple Python Script (Recommended)

**Windows:**
```bash
python run_bot.py
```

Or double-click `run_bot.bat`

**Linux/Mac:**
```bash
python3 run_bot.py
```

The bot will now run continuously and execute twice daily at the scheduled times.

#### Option B: Using main.py Directly

```bash
python main.py
```

This will start the scheduler and run continuously.

### 4. Keep It Running

The bot needs to stay running to execute on schedule. You have several options:

#### Windows: Run as Background Service

1. **Using Task Scheduler** (Recommended):
   - Open Task Scheduler
   - Create Basic Task
   - Set trigger: "When the computer starts"
   - Action: Start a program
   - Program: `pythonw.exe` (runs without window)
   - Arguments: `run_bot.py`
   - Start in: `C:\Users\USER\Desktop\tweetpy`
   - Check "Run whether user is logged on or not"

2. **Using NSSM (Non-Sucking Service Manager)**:
   - Download NSSM from https://nssm.cc/
   - Install as Windows service:
     ```
     nssm install XBot "C:\Python\python.exe" "C:\Users\USER\Desktop\tweetpy\run_bot.py"
     nssm start XBot
     ```

#### Linux: Run as Systemd Service

Create `/etc/systemd/system/xbot.service`:

```ini
[Unit]
Description=Auto-Reply X Bot
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/tweetpy
ExecStart=/usr/bin/python3 /path/to/tweetpy/run_bot.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable xbot
sudo systemctl start xbot
sudo systemctl status xbot
```

## Monitoring

### Check Logs

The bot creates a `bot.log` file with all activity:

```bash
# Windows
type bot.log

# Linux/Mac
tail -f bot.log
```

### Dashboard

Check the dashboard at `http://localhost:5001` to see:
- Total replies posted
- Last reply time
- Recent replies

## Schedule Configuration

Edit `config.json` to change schedule times:

```json
{
  "schedule": {
    "morning_time": "09:00",
    "evening_time": "18:00",
    "timezone": "UTC"
  }
}
```

Times are in 24-hour format. Adjust timezone if needed.

## Reply Settings

Configure in `config.json` or via dashboard:

```json
{
  "reply_settings": {
    "max_replies_per_run": 10,
    "delay_minutes_min": 30,
    "delay_minutes_max": 40,
    "timeline_count": 50,
    "keyword_search_count": 20
  }
}
```

- **max_replies_per_run**: How many replies per scheduled run (recommended: 5-10)
- **delay_minutes_min/max**: Random delay between replies (30-40 minutes is natural)
- **timeline_count**: How many tweets to fetch from your timeline
- **keyword_search_count**: How many tweets per keyword to search

## Natural Replies

The bot uses Google Gemini AI to generate natural, human-like replies. The AI is configured to:
- Sound conversational and authentic
- Avoid generic AI phrases
- Add real value to conversations
- Use natural language and casual expressions
- Vary response styles (questions, experiences, insights)

## Troubleshooting

### Bot Not Running

1. Check if Python is running: `python --version`
2. Check logs: `bot.log`
3. Verify credentials in dashboard
4. Test with `--run-once` flag first

### No Replies Being Posted

1. Check keywords are set correctly
2. Verify Twitter API credentials
3. Check filters aren't too restrictive
4. Review `bot.log` for errors

### Replies Sound Too AI-Like

1. Ensure Gemini API is enabled in credentials
2. The prompt is optimized for natural replies
3. You can adjust temperature in config (higher = more creative)

## Stopping the Bot

- If running in terminal: Press `Ctrl+C`
- If running as service: Stop the service
- If running in background: Find process and kill it

## Best Practices

1. **Start Small**: Begin with 3-5 replies per run to test
2. **Monitor Initially**: Watch the first few runs to ensure quality
3. **Review Replies**: Check your Twitter account to see how replies look
4. **Adjust Keywords**: Fine-tune keywords based on what you want to engage with
5. **Set Filters**: Use minimum followers filter to engage with quality accounts
6. **Respect Limits**: Don't set max_replies_per_run too high to avoid spam detection

## Security Notes

- Keep your `config.json` file secure (contains API keys)
- Don't commit API keys to version control
- Use environment variables in production if possible
- Regularly rotate API keys

---

**Need Help?** Check the logs in `bot.log` or review the main README.md file.

