"""Scheduling system for bot runs."""
import logging
import schedule
import time
from datetime import datetime, timedelta
from typing import Callable, Optional
import random

logger = logging.getLogger(__name__)


class BotScheduler:
    """Manages scheduled execution of bot runs."""
    
    def __init__(self, bot_run_func: Callable, tweet_post_func: Callable, thread_post_func: Callable, schedule_config: dict, tweet_settings: dict):
        """Initialize scheduler with bot function, tweet posting function, and schedule config."""
        self.bot_run_func = bot_run_func
        self.tweet_post_func = tweet_post_func
        self.thread_post_func = thread_post_func
        
        # Support time ranges (new) or single times (backward compatibility)
        self.morning_start = schedule_config.get("morning_start", schedule_config.get("morning_time", "09:00"))
        self.morning_end = schedule_config.get("morning_end", schedule_config.get("morning_time", "11:00"))
        self.evening_start = schedule_config.get("evening_start", schedule_config.get("evening_time", "18:00"))
        self.evening_end = schedule_config.get("evening_end", schedule_config.get("evening_time", "20:00"))
        
        self.tweet_enabled = tweet_settings.get("enabled", True)
        self.thread_enabled = tweet_settings.get("thread_enabled", True)
        self.tweets_per_run = tweet_settings.get("tweets_per_run", 1)  # How many tweets to post per run
        self.threads_per_run = tweet_settings.get("threads_per_run", 0)  # How many threads to post per run
        self.thread_tweet_count = tweet_settings.get("thread_tweet_count", 3)  # Number of tweets in each thread
        
        # Support both interval_minutes and interval_hours for backward compatibility
        if "interval_minutes" in tweet_settings:
            self.tweet_interval_minutes = tweet_settings.get("interval_minutes", 30)
        elif "interval_hours" in tweet_settings:
            self.tweet_interval_minutes = tweet_settings.get("interval_hours", 1) * 60
        else:
            self.tweet_interval_minutes = 30  # Default to 30 minutes
        self.running = False
        self.last_bot_run = {}  # Track last run time for each period
        self.last_content_post = {}  # Track last content post time
    
    def _parse_time(self, time_str: str) -> tuple:
        """Parse time string (HH:MM) into hours and minutes."""
        try:
            parts = time_str.split(":")
            return int(parts[0]), int(parts[1])
        except:
            return 9, 0  # Default to 9:00
    
    def _is_in_time_range(self, current_time: datetime, start_time: str, end_time: str) -> bool:
        """Check if current time is within the specified time range."""
        start_hour, start_min = self._parse_time(start_time)
        end_hour, end_min = self._parse_time(end_time)
        
        current_hour = current_time.hour
        current_min = current_time.minute
        
        start_minutes = start_hour * 60 + start_min
        end_minutes = end_hour * 60 + end_min
        current_minutes = current_hour * 60 + current_min
        
        # Handle case where end time is next day (e.g., 22:00 to 02:00)
        if end_minutes < start_minutes:
            return current_minutes >= start_minutes or current_minutes <= end_minutes
        else:
            return start_minutes <= current_minutes <= end_minutes
    
    def setup_schedule(self) -> None:
        """Set up scheduled jobs with time ranges."""
        schedule.clear()
        
        # Schedule checks every 5 minutes during time ranges
        schedule.every(5).minutes.do(self._check_and_run)
        
        logger.info(f"Schedule set: Morning {self.morning_start}-{self.morning_end}, Evening {self.evening_start}-{self.evening_end}")
        
        if self.tweet_enabled or self.thread_enabled:
            logger.info(f"Tweet posting enabled: {self.tweets_per_run} tweets, {self.threads_per_run} threads per run")
    
    def _check_and_run(self) -> None:
        """Check if we're in a time range and run bot/tweets if needed."""
        if not self.running:
            return
        
        now = datetime.now()
        in_morning = self._is_in_time_range(now, self.morning_start, self.morning_end)
        in_evening = self._is_in_time_range(now, self.evening_start, self.evening_end)
        
        if in_morning or in_evening:
            run_type = "morning" if in_morning else "evening"
            
            # Run bot (replies) - only once per time range to avoid too many runs
            # We'll use a simple approach: run every 30 minutes during the time range
            if int(now.minute) % 30 == 0:  # Run at :00 and :30 of each hour
                self._run_bot(run_type)
            
            # Post tweets and threads - more frequently but still spaced out
            if int(now.minute) % 15 == 0:  # Run at :00, :15, :30, :45 of each hour
                self._post_content(run_type)
    
    def _run_bot(self, run_type: str) -> None:
        """Wrapper to run bot and handle errors."""
        logger.info(f"Starting scheduled {run_type} run...")
        try:
            self.bot_run_func()
        except Exception as e:
            logger.error(f"Error in scheduled {run_type} run: {e}", exc_info=True)
    
    def _post_content(self, run_type: str) -> None:
        """Post tweets and threads during time ranges."""
        try:
            # Post regular tweets
            if self.tweet_enabled and self.tweets_per_run > 0:
                for _ in range(self.tweets_per_run):
                    try:
                        self.tweet_post_func()
                        # Small delay between tweets
                        time.sleep(random.uniform(30, 90))  # 30-90 seconds between tweets
                    except Exception as e:
                        logger.error(f"Error posting tweet: {e}", exc_info=True)
            
            # Post threads
            if self.thread_enabled and self.threads_per_run > 0:
                for _ in range(self.threads_per_run):
                    try:
                        self.thread_post_func(self.thread_tweet_count)
                        # Delay between threads
                        time.sleep(random.uniform(60, 180))  # 1-3 minutes between threads
                    except Exception as e:
                        logger.error(f"Error posting thread: {e}", exc_info=True)
        except Exception as e:
            logger.error(f"Error in scheduled content posting: {e}", exc_info=True)
    
    def _post_tweet(self) -> None:
        """Wrapper to post tweet and handle errors (backward compatibility)."""
        logger.info("Starting scheduled tweet post...")
        try:
            self.tweet_post_func()
        except Exception as e:
            logger.error(f"Error in scheduled tweet post: {e}", exc_info=True)
    
    def run_continuously(self) -> None:
        """Run the scheduler continuously."""
        self.running = True
        logger.info("Scheduler started. Waiting for scheduled times...")
        logger.info(f"Time ranges: Morning {self.morning_start}-{self.morning_end}, Evening {self.evening_start}-{self.evening_end}")
        
        while self.running:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
        
        logger.info("Scheduler stopped (running flag set to False)")
    
    def stop(self) -> None:
        """Stop the scheduler."""
        self.running = False
        logger.info("Scheduler stopped")
    
    def run_now(self) -> None:
        """Run the bot immediately (for testing)."""
        logger.info("Running bot immediately (manual trigger)...")
        self._run_bot("manual")

