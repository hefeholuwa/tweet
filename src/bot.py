"""Main bot logic that orchestrates fetching, generating, and posting replies."""
import logging
import random
import time
from typing import List, Dict, Any, Optional
from datetime import datetime

from .config import Config
from .database import Database
from .x_api import XAPI
from .reply_generator import ReplyGenerator
from .tweet_generator import TweetGenerator

logger = logging.getLogger(__name__)


class AutoReplyBot:
    """Main bot class that orchestrates the auto-reply functionality."""
    
    def __init__(self, config: Config):
        """Initialize the bot with configuration."""
        self.config = config
        self.db = Database()
        self.x_api = XAPI(config.get_x_api_credentials())
        self.reply_generator = ReplyGenerator(
            config.get_reply_templates(),
            config.get_gemini_config()
        )
        self.tweet_generator = TweetGenerator(
            config.get_tweet_templates(),
            config.get_gemini_config()
        )
        self.reply_settings = config.get_reply_settings()
        self.tweet_settings = config.get_tweet_settings()
        self.filters = config.get_filters()
    
    def run(self) -> Dict[str, Any]:
        """Execute one bot run: fetch tweets, generate replies, and post them."""
        logger.info("Starting bot run...")
        start_time = datetime.now()
        
        stats = {
            "tweets_fetched": 0,
            "tweets_filtered": 0,
            "replies_generated": 0,
            "replies_posted": 0,
            "errors": 0
        }
        
        try:
            # Collect tweets from timeline and keyword searches
            candidates = self._collect_tweet_candidates()
            stats["tweets_fetched"] = len(candidates)
            
            # Filter candidates
            filtered = self._filter_tweets(candidates)
            stats["tweets_filtered"] = len(filtered)
            
            # Limit to max replies per run
            max_replies = self.reply_settings.get("max_replies_per_run", 10)
            selected = filtered[:max_replies]
            
            # Calculate timing to spread replies over 30-40 minutes
            # This ensures the bot runs for the full duration, not too fast
            delay_min = self.reply_settings.get("delay_minutes_min", 30)
            delay_max = self.reply_settings.get("delay_minutes_max", 40)
            
            # Calculate total time window (30-40 minutes in seconds)
            total_time_min = delay_min * 60
            total_time_max = delay_max * 60
            
            # If we have multiple replies, spread them evenly over the time window
            if len(selected) > 1:
                # Use the minimum time to ensure we don't go too fast
                time_per_reply = total_time_min / len(selected)
                # Add some randomness but keep it within bounds
                time_per_reply = max(time_per_reply * 0.8, time_per_reply * 1.2)
            else:
                time_per_reply = total_time_min
            
            logger.info(f"Spreading {len(selected)} replies over {delay_min}-{delay_max} minutes")
            
            # Generate and post replies with calculated delays
            for idx, tweet in enumerate(selected):
                try:
                    reply_text = self.reply_generator.generate_reply(
                        tweet,
                        keyword=tweet.get("keyword")
                    )
                    
                    if not reply_text:
                        logger.warning(f"Failed to generate reply for tweet {tweet['id']}")
                        stats["errors"] += 1
                        continue
                    
                    stats["replies_generated"] += 1
                    logger.info(f"Generated reply for tweet {tweet['id']}: {reply_text[:50]}...")
                    
                    # Post reply
                    reply_id = self.x_api.post_reply(reply_text, tweet["id"])
                    
                    if reply_id:
                        self.db.mark_tweet_replied(
                            tweet["id"],
                            reply_id,
                            source=tweet.get("source", "unknown"),
                            keyword=tweet.get("keyword")
                        )
                        stats["replies_posted"] += 1
                        logger.info(f"Successfully posted reply {reply_id}")
                    else:
                        stats["errors"] += 1
                    
                    # Delay between replies - spread evenly over 30-40 minutes
                    if idx < len(selected) - 1:  # Don't delay after last reply
                        # Calculate delay with some randomness
                        base_delay = time_per_reply
                        # Add randomness: ±20% variation
                        delay_variation = base_delay * 0.2
                        delay_seconds = int(base_delay + random.uniform(-delay_variation, delay_variation))
                        # Ensure minimum delay of at least 5 minutes between replies
                        delay_seconds = max(delay_seconds, 5 * 60)
                        # Ensure maximum doesn't exceed 45 minutes
                        delay_seconds = min(delay_seconds, 45 * 60)
                        
                        delay_minutes = delay_seconds // 60
                        logger.info(f"Waiting {delay_minutes} minutes before next reply... (Run will complete in ~{delay_min * (len(selected) - idx - 1)}-{delay_max * (len(selected) - idx - 1)} minutes)")
                        time.sleep(delay_seconds)
                
                except Exception as e:
                    logger.error(f"Error processing tweet {tweet.get('id', 'unknown')}: {e}")
                    stats["errors"] += 1
                    continue
            
            duration = (datetime.now() - start_time).total_seconds()
            logger.info(f"Bot run completed in {duration:.1f} seconds. Stats: {stats}")
            
            return stats
        
        except Exception as e:
            logger.error(f"Error in bot run: {e}", exc_info=True)
            stats["errors"] += 1
            return stats
    
    def _collect_tweet_candidates(self) -> List[Dict[str, Any]]:
        """Collect tweet candidates from timeline and keyword searches."""
        candidates = []
        replied_ids = self.db.get_replied_tweet_ids()
        
        # Fetch from timeline
        timeline_count = self.reply_settings.get("timeline_count", 50)
        timeline_tweets = self.x_api.get_home_timeline(count=timeline_count)
        for tweet in timeline_tweets:
            if tweet["id"] not in replied_ids:
                tweet["source"] = "timeline"
                candidates.append(tweet)
        
        # Fetch from keyword searches
        keywords = self.config.get_keywords()
        keyword_count = self.reply_settings.get("keyword_search_count", 20)
        
        for keyword in keywords:
            search_tweets = self.x_api.search_tweets(keyword, count=keyword_count)
            for tweet in search_tweets:
                if tweet["id"] not in replied_ids:
                    tweet["source"] = "keyword_search"
                    tweet["keyword"] = keyword
                    candidates.append(tweet)
        
        # Remove duplicates (same tweet ID)
        seen_ids = set()
        unique_candidates = []
        for tweet in candidates:
            if tweet["id"] not in seen_ids:
                seen_ids.add(tweet["id"])
                unique_candidates.append(tweet)
        
        return unique_candidates
    
    def _filter_tweets(self, tweets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Filter tweets based on configuration filters."""
        filtered = []
        user_id = str(self.x_api.user_id) if self.x_api.user_id else None
        min_followers = self.filters.get("min_followers", 0)
        
        for tweet in tweets:
            # Exclude retweets
            if self.filters.get("exclude_retweets", True) and tweet.get("is_retweet"):
                continue
            
            # Exclude own tweets
            if self.filters.get("exclude_own_tweets", True) and user_id:
                if tweet.get("author_id") == user_id:
                    continue
            
            # Filter by minimum followers
            if min_followers > 0:
                author_followers = tweet.get("author_followers_count", 0)
                if author_followers < min_followers:
                    logger.debug(f"Excluding tweet {tweet['id']} - author has {author_followers} followers (min: {min_followers})")
                    continue
            
            # Exclude already replied tweets (double-check)
            if self.filters.get("exclude_replied_tweets", True):
                if self.db.is_tweet_replied(tweet["id"]):
                    continue
            
            filtered.append(tweet)
        
        # Shuffle to add randomness
        random.shuffle(filtered)
        
        return filtered
    
    def post_tweet(self) -> Dict[str, Any]:
        """Post a single original tweet based on keywords."""
        logger.info("Posting a new tweet...")
        stats = {
            "tweet_posted": False,
            "error": None
        }
        
        try:
            # Get keywords for context
            keywords = self.config.get_keywords()
            
            # Generate tweet content based on keywords
            tweet_text = self.tweet_generator.generate_tweet(keywords=keywords)
            
            if not tweet_text:
                logger.warning("Failed to generate tweet content")
                stats["error"] = "Failed to generate tweet"
                return stats
            
            logger.info(f"Generated tweet: {tweet_text[:50]}...")
            
            # Post tweet
            tweet_id = self.x_api.post_tweet(tweet_text)
            
            if tweet_id:
                # Track in database
                self.db.mark_tweet_posted(tweet_id, tweet_text)
                stats["tweet_posted"] = True
                stats["tweet_id"] = tweet_id
                logger.info(f"Successfully posted tweet {tweet_id}")
            else:
                stats["error"] = "Failed to post tweet"
                logger.error("Failed to post tweet")
        
        except Exception as e:
            logger.error(f"Error posting tweet: {e}", exc_info=True)
            stats["error"] = str(e)
        
        return stats
    
    def post_thread_tweet(self, num_tweets: int = 3) -> Dict[str, Any]:
        """Post a thread of tweets based on keywords."""
        logger.info(f"Posting a new thread with {num_tweets} tweets...")
        stats = {
            "thread_posted": False,
            "error": None
        }
        
        try:
            # Get keywords for context (same as single tweets)
            keywords = self.config.get_keywords()
            
            # Generate thread content based on keywords
            tweet_texts = self.tweet_generator.generate_thread(keywords=keywords, num_tweets=num_tweets)
            
            if not tweet_texts or len(tweet_texts) == 0:
                logger.warning("Failed to generate thread content")
                stats["error"] = "Failed to generate thread"
                return stats
            
            logger.info(f"Generated thread with {len(tweet_texts)} tweets")
            for idx, text in enumerate(tweet_texts):
                logger.debug(f"Thread tweet {idx + 1}: {text[:50]}...")
            
            # Post thread
            thread_ids = self.x_api.post_thread(tweet_texts)
            
            if thread_ids and len(thread_ids) > 0:
                # Track in database
                self.db.mark_thread_posted(thread_ids, tweet_texts)
                stats["thread_posted"] = True
                stats["thread_ids"] = thread_ids
                stats["num_tweets"] = len(thread_ids)
                logger.info(f"Successfully posted thread with {len(thread_ids)} tweets")
            else:
                stats["error"] = "Failed to post thread"
                logger.error("Failed to post thread")
        
        except Exception as e:
            logger.error(f"Error posting thread: {e}", exc_info=True)
            stats["error"] = str(e)
        
        return stats
    
    def close(self) -> None:
        """Clean up resources."""
        self.db.close()

