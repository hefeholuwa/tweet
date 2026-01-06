#!/usr/bin/env python3
"""
Script to quote tweet and reply to a specific tweet.
"""
import logging
import sys
import tweepy
from src.config import Config
from src.x_api import XAPI
from src.reply_generator import ReplyGenerator

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)

logger = logging.getLogger(__name__)

def fetch_tweet(x_api, tweet_id):
    """Fetch a tweet by ID."""
    try:
        # Try API v2 first
        if x_api.client:
            try:
                tweet = x_api.client.get_tweet(
                    id=tweet_id,
                    tweet_fields=['text', 'author_id', 'created_at', 'public_metrics'],
                    expansions=['author_id'],
                    user_fields=['username', 'public_metrics']
                )
                
                if tweet and tweet.data:
                    # Get user info
                    users = {}
                    if tweet.includes and 'users' in tweet.includes:
                        for user in tweet.includes['users']:
                            users[user.id] = {
                                'username': user.username,
                                'followers_count': user.public_metrics.get('followers_count', 0) if hasattr(user, 'public_metrics') else 0
                            }
                    
                    user_data = users.get(tweet.data.author_id, {'username': 'unknown', 'followers_count': 0})
                    
                    return {
                        "id": str(tweet.data.id),
                        "text": tweet.data.text,
                        "author_id": str(tweet.data.author_id),
                        "author_username": user_data['username'],
                        "author_followers_count": user_data['followers_count'],
                        "created_at": tweet.data.created_at if hasattr(tweet.data, 'created_at') else None
                    }
            except Exception as e:
                logger.warning(f"API v2 failed, trying v1.1: {e}")
        
        # Fallback to API v1.1
        if x_api.api:
            tweet = x_api.api.get_status(tweet_id, tweet_mode='extended')
            return {
                "id": str(tweet.id),
                "text": getattr(tweet, 'full_text', tweet.text),
                "author_id": str(tweet.user.id),
                "author_username": tweet.user.screen_name,
                "author_followers_count": tweet.user.followers_count,
                "created_at": tweet.created_at
            }
    except Exception as e:
        logger.error(f"Error fetching tweet: {e}")
        return None

def main():
    """Quote tweet and reply to a specific tweet."""
    tweet_id = "2008564944791273606"  # The tweet ID from the URL
    
    logger.info("=" * 60)
    logger.info("Quote Tweeting and Replying")
    logger.info("=" * 60)
    
    try:
        # Load config
        config = Config()
        
        # Initialize API
        x_api = XAPI(config.get_x_api_credentials())
        
        # Fetch the actual tweet
        logger.info(f"\n[1/4] Fetching tweet {tweet_id}...")
        tweet_data = fetch_tweet(x_api, tweet_id)
        
        if not tweet_data:
            logger.error("Failed to fetch tweet. Please check the tweet ID.")
            return
        
        logger.info(f"Found tweet by @{tweet_data['author_username']}")
        logger.info(f"Tweet text: {tweet_data['text'][:100]}...")
        
        # Initialize reply generator
        reply_gen = ReplyGenerator(
            config.get_reply_templates(),
            config.get_gemini_config()
        )
        
        # Generate reply text based on actual tweet
        logger.info("\n[2/4] Generating thoughtful reply...")
        reply_text = reply_gen.generate_reply(tweet_data, keyword=None)
        
        if not reply_text:
            logger.error("Failed to generate reply")
            return
        
        logger.info(f"Generated reply: {reply_text}")
        logger.info(f"Length: {len(reply_text)} characters")
        
        # Post quote tweet (includes the reply text + original tweet)
        logger.info("\n[3/4] Posting quote tweet...")
        quote_tweet_id = x_api.quote_tweet(reply_text, tweet_id)
        
        if quote_tweet_id:
            logger.info(f"[OK] Successfully posted quote tweet!")
            logger.info(f"Quote Tweet ID: {quote_tweet_id}")
            logger.info(f"View at: https://twitter.com/i/web/status/{quote_tweet_id}")
            
            # Track in database
            try:
                from src.database import Database
                db = Database()
                db.mark_quote_retweet_posted(quote_tweet_id, tweet_id, reply_text)
                db.close()
            except Exception as db_error:
                logger.warning(f"Could not track in database: {db_error}")
            
            logger.info("\n" + "=" * 60)
            logger.info("Quote tweet posted successfully!")
            logger.info("=" * 60)
        else:
            logger.error("[FAIL] Failed to post quote tweet")
    
    except Exception as e:
        logger.error(f"[FAIL] Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

