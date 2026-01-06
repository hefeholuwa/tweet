#!/usr/bin/env python3
"""Interactive setup script for Auto-Reply X Bot configuration."""
import json
import os
from pathlib import Path


def print_header():
    """Print welcome header."""
    print("=" * 60)
    print("Auto-Reply X Bot - Configuration Setup")
    print("=" * 60)
    print()


def get_input(prompt, default=None, required=True, secret=False):
    """Get user input with optional default value."""
    if default:
        prompt_text = f"{prompt} [{default}]: "
    else:
        prompt_text = f"{prompt}: "
    
    if secret:
        import getpass
        value = getpass.getpass(prompt_text)
    else:
        value = input(prompt_text).strip()
    
    if not value and default:
        return default
    if not value and required:
        print("This field is required. Please enter a value.")
        return get_input(prompt, default, required, secret)
    return value if value else ""


def get_bool_input(prompt, default=True):
    """Get boolean input from user."""
    default_text = "Y/n" if default else "y/N"
    response = input(f"{prompt} [{default_text}]: ").strip().lower()
    
    if not response:
        return default
    return response in ['y', 'yes', 'true', '1']


def get_int_input(prompt, default=None, min_val=None):
    """Get integer input from user."""
    while True:
        value = get_input(prompt, str(default) if default else None, required=(default is None))
        try:
            int_value = int(value)
            if min_val is not None and int_value < min_val:
                print(f"Value must be at least {min_val}.")
                continue
            return int_value
        except ValueError:
            print("Please enter a valid number.")


def setup_config():
    """Interactive setup for config.json."""
    config_path = Path("config.json")
    
    if config_path.exists():
        response = input("config.json already exists. Overwrite? [y/N]: ").strip().lower()
        if response not in ['y', 'yes']:
            print("Setup cancelled.")
            return
    
    config = {}
    
    print("\n--- X (Twitter) API Credentials ---")
    print("Get your credentials from: https://developer.twitter.com/en/portal/dashboard")
    print()
    
    config["x_api"] = {
        "consumer_key": get_input("Consumer Key (API Key)", required=True, secret=True),
        "consumer_secret": get_input("Consumer Secret (API Secret)", required=True, secret=True),
        "access_token": get_input("Access Token", required=True, secret=True),
        "access_token_secret": get_input("Access Token Secret", required=True, secret=True),
        "bearer_token": get_input("Bearer Token (optional)", required=False, secret=True)
    }
    
    print("\n--- OpenAI API (Optional) ---")
    print("Leave blank to skip AI-generated replies (uses templates instead)")
    print()
    
    use_openai = get_bool_input("Enable OpenAI for AI-generated replies?", default=False)
    config["openai"] = {
        "api_key": get_input("OpenAI API Key", required=use_openai, secret=True) if use_openai else "",
        "enabled": use_openai,
        "model": "gpt-3.5-turbo",
        "temperature": 0.7
    }
    
    print("\n--- Schedule Settings ---")
    print()
    
    config["schedule"] = {
        "morning_time": get_input("Morning run time (HH:MM)", "09:00"),
        "evening_time": get_input("Evening run time (HH:MM)", "18:00"),
        "timezone": get_input("Timezone", "UTC")
    }
    
    print("\n--- Reply Settings ---")
    print()
    
    config["reply_settings"] = {
        "max_replies_per_run": get_int_input("Max replies per run", 10, min_val=1),
        "delay_minutes_min": get_int_input("Minimum delay between replies (minutes)", 30, min_val=1),
        "delay_minutes_max": get_int_input("Maximum delay between replies (minutes)", 40, min_val=1),
        "timeline_count": get_int_input("Number of timeline tweets to fetch", 50, min_val=1),
        "keyword_search_count": get_int_input("Number of tweets per keyword to fetch", 20, min_val=1)
    }
    
    print("\n--- Keywords ---")
    print("Enter keywords/topics to search for (one per line, empty line to finish):")
    keywords = []
    while True:
        keyword = input(f"Keyword {len(keywords) + 1}: ").strip()
        if not keyword:
            break
        keywords.append(keyword)
    
    if not keywords:
        keywords = ["python programming", "AI ethics"]
        print(f"No keywords entered. Using defaults: {keywords}")
    
    config["keywords"] = keywords
    
    print("\n--- Reply Templates (if not using AI) ---")
    print("Enter reply templates (one per line, empty line to finish):")
    print("Use {context}, {topic}, {related_idea}, {personal_insight} as placeholders")
    templates = []
    while True:
        template = input(f"Template {len(templates) + 1}: ").strip()
        if not template:
            break
        templates.append(template)
    
    if not templates:
        templates = [
            "That's an interesting perspective! {context}",
            "Thanks for sharing this. I've been thinking about {topic} recently.",
            "Great point! Have you considered {related_idea}?",
            "This resonates with me. {personal_insight}"
        ]
        print(f"No templates entered. Using defaults.")
    
    config["reply_templates"] = templates
    
    print("\n--- Filters ---")
    print()
    
    config["filters"] = {
        "exclude_retweets": get_bool_input("Exclude retweets?", True),
        "exclude_own_tweets": get_bool_input("Exclude your own tweets?", True),
        "exclude_replied_tweets": get_bool_input("Exclude already-replied tweets?", True),
        "min_followers": get_int_input("Minimum followers (0 to disable)", 0, min_val=0)
    }
    
    # Save config
    with open(config_path, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Configuration saved to {config_path.absolute()}")
    print("\nNext steps:")
    print("1. Test your configuration: python test_credentials.py")
    print("2. Run the bot once: python main.py --run-once")
    print("3. Run with scheduler: python main.py")


if __name__ == "__main__":
    print_header()
    setup_config()

