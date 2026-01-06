#!/usr/bin/env python3
"""
Simple script to run the bot continuously.
This will keep the bot running and executing twice daily (morning and evening).
"""
import sys
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

from main import main

if __name__ == "__main__":
    print("=" * 60)
    print("Auto-Reply X Bot - Starting Continuous Mode")
    print("=" * 60)
    print("\nThe bot will run twice daily:")
    print("- Morning run (default: 09:00)")
    print("- Evening run (default: 18:00)")
    print("\nReplies will be posted with 30-40 minute delays between them.")
    print("\nPress Ctrl+C to stop the bot.\n")
    print("=" * 60)
    
    try:
        # Run main() which will start the scheduler
        main()
    except KeyboardInterrupt:
        print("\n\nBot stopped by user.")
        sys.exit(0)
    except Exception as e:
        print(f"\n\nFatal error: {e}")
        sys.exit(1)

