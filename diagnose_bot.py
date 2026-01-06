#!/usr/bin/env python3
"""Diagnose why bot isn't posting"""
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def diagnose():
    """Diagnose bot issues"""
    try:
        from src.config import Config
        from src.bot import AutoReplyBot
        
        logger.info("=" * 60)
        logger.info("BOT DIAGNOSTIC")
        logger.info("=" * 60)
        
        config = Config()
        bot = AutoReplyBot(config)
        
        # Check filters
        filters = config.get_filters()
        logger.info(f"\nFilters:")
        logger.info(f"  Min followers: {filters.get('min_followers', 0)}")
        logger.info(f"  Exclude retweets: {filters.get('exclude_retweets', True)}")
        logger.info(f"  Exclude own tweets: {filters.get('exclude_own_tweets', True)}")
        logger.info(f"  Exclude replied: {filters.get('exclude_replied_tweets', True)}")
        
        if filters.get('min_followers', 0) >= 10000:
            logger.warning(f"\n⚠️  WARNING: min_followers is {filters.get('min_followers')} - this is VERY HIGH!")
            logger.warning("   Most tweets will be filtered out. Consider lowering to 100-1000.")
        
        # Check reply settings
        reply_settings = config.get_reply_settings()
        logger.info(f"\nReply Settings:")
        logger.info(f"  Max replies per run: {reply_settings.get('max_replies_per_run', 10)}")
        logger.info(f"  Delay: {reply_settings.get('delay_minutes_min', 30)}-{reply_settings.get('delay_minutes_max', 40)} minutes")
        
        # Try collecting candidates
        logger.info(f"\nCollecting tweet candidates...")
        candidates = bot._collect_tweet_candidates()
        logger.info(f"Found {len(candidates)} candidates")
        
        if len(candidates) == 0:
            logger.error("❌ No candidates found! Possible reasons:")
            logger.error("   - Rate limits (wait 15 minutes)")
            logger.error("   - All tweets already replied to")
            logger.error("   - Timeline access restricted (403 error)")
            logger.error("   - Keywords not matching any tweets")
        else:
            logger.info(f"✅ Found {len(candidates)} candidates")
            
            # Check follower counts
            follower_counts = [t.get('author_followers_count', 0) for t in candidates[:10]]
            logger.info(f"\nSample follower counts: {follower_counts}")
            min_followers = filters.get('min_followers', 0)
            if min_followers > 0:
                passing = sum(1 for f in follower_counts if f >= min_followers)
                logger.info(f"  Tweets with >= {min_followers} followers: {passing}/{len(follower_counts)}")
            
            # Try filtering
            logger.info(f"\nFiltering tweets...")
            filtered = bot._filter_tweets(candidates)
            logger.info(f"After filtering: {len(filtered)} tweets")
            
            if len(filtered) == 0:
                logger.error("❌ All tweets filtered out!")
                logger.error(f"   Check min_followers setting: {min_followers}")
                logger.error("   Most tweets don't have 10,000+ followers")
            else:
                logger.info(f"✅ {len(filtered)} tweets passed filters")
                logger.info(f"   Will reply to: {min(len(filtered), reply_settings.get('max_replies_per_run', 10))} tweets")
        
        bot.close()
        
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)

if __name__ == "__main__":
    diagnose()

