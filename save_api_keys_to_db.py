#!/usr/bin/env python3
"""
Utility script to save API keys from config.json to the database.
"""
import logging
import sys
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)

logger = logging.getLogger(__name__)

def main():
    """Save API keys from config.json to database."""
    logger.info("=" * 60)
    logger.info("Saving API Keys to Database")
    logger.info("=" * 60)
    
    try:
        from src.config import Config
        from src.database import Database
        
        # Load config from file
        logger.info("\n[1/3] Loading configuration from config.json...")
        config = Config(use_database=False)  # Don't load from DB yet
        logger.info("[OK] Config loaded")
        
        # Save to database
        logger.info("\n[2/3] Saving API keys to database...")
        config.save_to_database(force=True)  # Force save even if use_database is False
        logger.info("[OK] API keys saved to database")
        
        # Verify by loading from database
        logger.info("\n[3/3] Verifying saved credentials...")
        db = Database()
        
        x_creds = db.get_api_credentials("x_api")
        if x_creds and x_creds.get("consumer_key"):
            logger.info("[OK] X API credentials found in database")
        else:
            logger.warning("[WARN] X API credentials not found in database")
        
        gemini_creds = db.get_api_credentials("gemini")
        if gemini_creds and gemini_creds.get("api_key"):
            logger.info("[OK] Gemini API credentials found in database")
        else:
            logger.warning("[WARN] Gemini API credentials not found in database")
        
        db.close()
        
        logger.info("\n" + "=" * 60)
        logger.info("Done! API keys are now stored in the database.")
        logger.info("The bot will automatically load them from the database.")
        logger.info("=" * 60)
    
    except Exception as e:
        logger.error(f"[FAIL] Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

