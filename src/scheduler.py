"""Scheduling system for bot runs."""
import logging
import schedule
import time
from datetime import datetime
from typing import Callable

logger = logging.getLogger(__name__)


class BotScheduler:
    """Manages scheduled execution of bot runs."""
    
    def __init__(self, bot_run_func: Callable, tweet_post_func: Callable, schedule_config: dict, tweet_settings: dict):
        """Initialize scheduler with bot function, tweet posting function, and schedule config."""
        self.bot_run_func = bot_run_func
        self.tweet_post_func = tweet_post_func
        self.morning_time = schedule_config.get("morning_time", "09:00")
        self.evening_time = schedule_config.get("evening_time", "18:00")
        self.tweet_enabled = tweet_settings.get("enabled", True)
        # Support both interval_minutes and interval_hours for backward compatibility
        if "interval_minutes" in tweet_settings:
            self.tweet_interval_minutes = tweet_settings.get("interval_minutes", 30)
        elif "interval_hours" in tweet_settings:
            self.tweet_interval_minutes = tweet_settings.get("interval_hours", 1) * 60
        else:
            self.tweet_interval_minutes = 30  # Default to 30 minutes
        self.running = False
    
    def setup_schedule(self) -> None:
        """Set up scheduled jobs."""
        schedule.clear()
        schedule.every().day.at(self.morning_time).do(self._run_bot, "morning")
        schedule.every().day.at(self.evening_time).do(self._run_bot, "evening")
        logger.info(f"Schedule set: Morning at {self.morning_time}, Evening at {self.evening_time}")
        
        # Set up tweet posting if enabled
        if self.tweet_enabled:
            schedule.every(self.tweet_interval_minutes).minutes.do(self._post_tweet)
            logger.info(f"Tweet posting enabled: every {self.tweet_interval_minutes} minute(s)")
    
    def _run_bot(self, run_type: str) -> None:
        """Wrapper to run bot and handle errors."""
        logger.info(f"Starting scheduled {run_type} run...")
        try:
            self.bot_run_func()
        except Exception as e:
            logger.error(f"Error in scheduled {run_type} run: {e}", exc_info=True)
    
    def _post_tweet(self) -> None:
        """Wrapper to post tweet and handle errors."""
        logger.info("Starting scheduled tweet post...")
        try:
            self.tweet_post_func()
        except Exception as e:
            logger.error(f"Error in scheduled tweet post: {e}", exc_info=True)
    
    def run_continuously(self) -> None:
        """Run the scheduler continuously."""
        self.running = True
        logger.info("Scheduler started. Waiting for scheduled times...")
        
        while self.running:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
    
    def stop(self) -> None:
        """Stop the scheduler."""
        self.running = False
        logger.info("Scheduler stopped")
    
    def run_now(self) -> None:
        """Run the bot immediately (for testing)."""
        logger.info("Running bot immediately (manual trigger)...")
        self._run_bot("manual")

