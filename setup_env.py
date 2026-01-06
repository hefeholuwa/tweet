#!/usr/bin/env python3
"""Helper script to create .env file from user input."""
import os
from pathlib import Path

def create_env_file():
    """Interactive script to create .env file."""
    env_path = Path(".env")
    
    if env_path.exists():
        response = input(".env file already exists. Overwrite? (y/n): ")
        if response.lower() != 'y':
            print("Cancelled.")
            return
    
    print("Creating .env file for Auto-Reply X Bot")
    print("Enter your API credentials (press Enter to skip optional fields):\n")
    
    env_content = []
    
    # X API credentials
    print("X (Twitter) API Credentials (Required):")
    env_content.append(f"X_CONSUMER_KEY={input('Consumer Key: ')}")
    env_content.append(f"X_CONSUMER_SECRET={input('Consumer Secret: ')}")
    env_content.append(f"X_ACCESS_TOKEN={input('Access Token: ')}")
    env_content.append(f"X_ACCESS_TOKEN_SECRET={input('Access Token Secret: ')}")
    
    bearer = input('Bearer Token (optional): ')
    if bearer:
        env_content.append(f"X_BEARER_TOKEN={bearer}")
    else:
        env_content.append("X_BEARER_TOKEN=")
    
    env_content.append("")
    
    # OpenAI API (optional)
    print("\nOpenAI API (Optional - for AI-generated replies):")
    openai_key = input('OpenAI API Key (optional, press Enter to skip): ')
    if openai_key:
        env_content.append(f"OPENAI_API_KEY={openai_key}")
    
    # Write file
    with open(env_path, 'w') as f:
        f.write('\n'.join(env_content))
    
    print(f"\n.env file created at {env_path.absolute()}")
    print("Remember to also create config.json from config.json.example")

if __name__ == "__main__":
    create_env_file()

