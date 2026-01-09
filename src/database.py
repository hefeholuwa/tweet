"""Database management for tracking replied tweets using MySQL."""
import pymysql
import logging
import os
import time
from typing import Set, Optional, List, Dict, Any
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class Database:
    """Manages MySQL database for tracking replied tweets."""
    
    def __init__(self, 
                 host: str = None,
                 port: int = None,
                 user: str = None,
                 password: str = None,
                 database: str = None):
        """Initialize database connection and create tables if needed."""
        # Get database config from environment or use defaults
        self.host = host or os.getenv("DB_HOST", "localhost")
        self.port = port or int(os.getenv("DB_PORT", "3306"))
        self.user = user or os.getenv("DB_USER", "root")
        # Handle empty password (common for local MySQL/XAMPP)
        db_password = password or os.getenv("DB_PASSWORD", "")
        self.password = db_password if db_password else ""
        self.database = database or os.getenv("DB_NAME", "twitter")
        
        # Connect to MySQL server with retry logic
        max_retries = 3
        retry_delay = 2  # seconds
        
        for attempt in range(max_retries):
            try:
                # Connect to MySQL server (without database first)
                self.conn = pymysql.connect(
                    host=self.host,
                    port=self.port,
                    user=self.user,
                    password=self.password,
                    charset='utf8mb4',
                    cursorclass=pymysql.cursors.DictCursor,
                    connect_timeout=10
                )
                self._ensure_database_exists()
                self.conn.close()
                
                # Connect to the specific database
                self.conn = pymysql.connect(
                    host=self.host,
                    port=self.port,
                    user=self.user,
                    password=self.password,
                    database=self.database,
                    charset='utf8mb4',
                    cursorclass=pymysql.cursors.DictCursor,
                    autocommit=False,
                    connect_timeout=10
                )
                self.create_tables()
                logger.info(f"Connected to MySQL database '{self.database}' on {self.host}:{self.port}")
                break
                
            except pymysql.OperationalError as e:
                if attempt < max_retries - 1:
                    logger.warning(f"Connection attempt {attempt + 1} failed: {e}. Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                else:
                    logger.error(f"Failed to connect to MySQL database after {max_retries} attempts: {e}")
                    raise
            except Exception as e:
                logger.error(f"Error connecting to MySQL database: {e}")
                raise
    
    def _ensure_database_exists(self) -> None:
        """Ensure the database exists, create if it doesn't."""
        cursor = self.conn.cursor()
        try:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{self.database}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
            self.conn.commit()
            logger.info(f"Database '{self.database}' ensured to exist")
        except Exception as e:
            logger.error(f"Error creating database: {e}")
            raise
        finally:
            cursor.close()
    
    def create_tables(self) -> None:
        """Create necessary tables if they don't exist."""
        cursor = self.conn.cursor()
        try:
            # Create replied_tweets table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS replied_tweets (
                    tweet_id VARCHAR(50) PRIMARY KEY,
                    reply_tweet_id VARCHAR(50),
                    replied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    source VARCHAR(50),
                    keyword VARCHAR(255),
                    INDEX idx_replied_at (replied_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """)
            
            # Create posted_tweets table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS posted_tweets (
                    tweet_id VARCHAR(50) PRIMARY KEY,
                    text TEXT,
                    posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_posted_at (posted_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """)
            
            # Create posted_threads table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS posted_threads (
                    thread_id VARCHAR(50) PRIMARY KEY,
                    first_tweet_id VARCHAR(50),
                    tweet_ids TEXT,
                    texts TEXT,
                    posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_posted_at (posted_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """)
            
            # Create quote_retweets table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS quote_retweets (
                    quote_tweet_id VARCHAR(50) PRIMARY KEY,
                    original_tweet_id VARCHAR(50),
                    text TEXT,
                    posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_posted_at (posted_at),
                    INDEX idx_original_tweet (original_tweet_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """)
            
            # Create bot_logs table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS bot_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    log_level VARCHAR(20),
                    message TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_timestamp (timestamp),
                    INDEX idx_log_level (log_level)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """)
            
            # Create api_credentials table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS api_credentials (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    service_name VARCHAR(50) UNIQUE NOT NULL,
                    consumer_key VARCHAR(255),
                    consumer_secret VARCHAR(255),
                    access_token VARCHAR(255),
                    access_token_secret VARCHAR(255),
                    bearer_token VARCHAR(255),
                    api_key VARCHAR(255),
                    enabled BOOLEAN DEFAULT TRUE,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_service_name (service_name)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """)
            
            self.conn.commit()
            logger.info("Database tables created/verified successfully")
        except Exception as e:
            logger.error(f"Error creating tables: {e}")
            self.conn.rollback()
            raise
        finally:
            cursor.close()
    
    def _row_to_dict(self, row: Dict[str, Any]) -> Dict[str, Any]:
        """Convert MySQL row (already dict) to standard dict."""
        if row is None:
            return None
        # PyMySQL with DictCursor already returns dicts
        return row
    
    def is_tweet_replied(self, tweet_id: str) -> bool:
        """Check if a tweet has already been replied to."""
        cursor = self.conn.cursor()
        try:
            cursor.execute("SELECT tweet_id FROM replied_tweets WHERE tweet_id = %s", (tweet_id,))
            result = cursor.fetchone()
            return result is not None
        finally:
            cursor.close()
    
    def mark_tweet_replied(self, tweet_id: str, reply_tweet_id: str, source: str = "timeline", keyword: Optional[str] = None) -> None:
        """Mark a tweet as replied to."""
        cursor = self.conn.cursor()
        try:
            cursor.execute("""
                INSERT INTO replied_tweets (tweet_id, reply_tweet_id, source, keyword)
                VALUES (%s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    reply_tweet_id = VALUES(reply_tweet_id),
                    source = VALUES(source),
                    keyword = VALUES(keyword),
                    replied_at = CURRENT_TIMESTAMP
            """, (tweet_id, reply_tweet_id, source, keyword))
            self.conn.commit()
            logger.info(f"Marked tweet {tweet_id} as replied (reply: {reply_tweet_id})")
        except Exception as e:
            logger.error(f"Error marking tweet as replied: {e}", exc_info=True)
            self.conn.rollback()
            raise
        finally:
            cursor.close()
    
    def get_replied_tweet_ids(self) -> Set[str]:
        """Get all replied tweet IDs as a set."""
        cursor = self.conn.cursor()
        try:
            cursor.execute("SELECT tweet_id FROM replied_tweets")
            rows = cursor.fetchall()
            return {row['tweet_id'] for row in rows}
        finally:
            cursor.close()
    
    def mark_tweet_posted(self, tweet_id: str, text: str) -> None:
        """Mark a tweet as posted."""
        cursor = self.conn.cursor()
        try:
            cursor.execute("""
                INSERT INTO posted_tweets (tweet_id, text)
                VALUES (%s, %s)
                ON DUPLICATE KEY UPDATE
                    text = VALUES(text),
                    posted_at = CURRENT_TIMESTAMP
            """, (tweet_id, text))
            self.conn.commit()
            logger.info(f"Marked tweet {tweet_id} as posted")
        except Exception as e:
            logger.error(f"Error marking tweet as posted: {e}")
            self.conn.rollback()
            raise
        finally:
            cursor.close()
    
    def mark_thread_posted(self, thread_ids: List[str], texts: List[str]) -> None:
        """Mark a thread as posted."""
        import json
        cursor = self.conn.cursor()
        try:
            thread_id = thread_ids[0] if thread_ids else None
            first_tweet_id = thread_ids[0] if thread_ids else None
            tweet_ids_json = json.dumps(thread_ids)
            texts_json = json.dumps(texts)
            
            cursor.execute("""
                INSERT INTO posted_threads (thread_id, first_tweet_id, tweet_ids, texts)
                VALUES (%s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    first_tweet_id = VALUES(first_tweet_id),
                    tweet_ids = VALUES(tweet_ids),
                    texts = VALUES(texts),
                    posted_at = CURRENT_TIMESTAMP
            """, (thread_id, first_tweet_id, tweet_ids_json, texts_json))
            self.conn.commit()
            logger.info(f"Marked thread {thread_id} as posted ({len(thread_ids)} tweets)")
        except Exception as e:
            logger.error(f"Error marking thread as posted: {e}")
            self.conn.rollback()
            raise
        finally:
            cursor.close()
    
    def mark_quote_retweet_posted(self, quote_tweet_id: str, original_tweet_id: str, text: str) -> None:
        """Mark a quote retweet as posted."""
        cursor = self.conn.cursor()
        try:
            cursor.execute("""
                INSERT INTO quote_retweets (quote_tweet_id, original_tweet_id, text)
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    original_tweet_id = VALUES(original_tweet_id),
                    text = VALUES(text),
                    posted_at = CURRENT_TIMESTAMP
            """, (quote_tweet_id, original_tweet_id, text))
            self.conn.commit()
            logger.info(f"Marked quote retweet {quote_tweet_id} (quoting {original_tweet_id}) as posted")
        except Exception as e:
            logger.error(f"Error marking quote retweet as posted: {e}")
            self.conn.rollback()
            raise
        finally:
            cursor.close()
    
    def log_event(self, level: str, message: str) -> None:
        """Log an event to the database."""
        cursor = self.conn.cursor()
        try:
            cursor.execute("""
                INSERT INTO bot_logs (log_level, message)
                VALUES (%s, %s)
            """, (level, message))
            self.conn.commit()
        except Exception as e:
            logger.error(f"Error logging event: {e}")
            self.conn.rollback()
        finally:
            cursor.close()
    
    def save_api_credentials(self, service_name: str, credentials: Dict[str, Any]) -> None:
        """Save API credentials to database."""
        cursor = self.conn.cursor()
        try:
            cursor.execute("""
                INSERT INTO api_credentials (
                    service_name, consumer_key, consumer_secret, 
                    access_token, access_token_secret, bearer_token, 
                    api_key, enabled
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    consumer_key = VALUES(consumer_key),
                    consumer_secret = VALUES(consumer_secret),
                    access_token = VALUES(access_token),
                    access_token_secret = VALUES(access_token_secret),
                    bearer_token = VALUES(bearer_token),
                    api_key = VALUES(api_key),
                    enabled = VALUES(enabled),
                    updated_at = CURRENT_TIMESTAMP
            """, (
                service_name,
                credentials.get("consumer_key"),
                credentials.get("consumer_secret"),
                credentials.get("access_token"),
                credentials.get("access_token_secret"),
                credentials.get("bearer_token"),
                credentials.get("api_key"),
                credentials.get("enabled", True)
            ))
            self.conn.commit()
            logger.info(f"Saved API credentials for {service_name}")
        except Exception as e:
            logger.error(f"Error saving API credentials: {e}")
            self.conn.rollback()
            raise
        finally:
            cursor.close()
    
    def get_api_credentials(self, service_name: str) -> Optional[Dict[str, Any]]:
        """Get API credentials from database."""
        cursor = self.conn.cursor()
        try:
            cursor.execute("""
                SELECT consumer_key, consumer_secret, access_token, 
                       access_token_secret, bearer_token, api_key, enabled
                FROM api_credentials
                WHERE service_name = %s AND enabled = TRUE
            """, (service_name,))
            row = cursor.fetchone()
            if row:
                return {
                    "consumer_key": row.get("consumer_key"),
                    "consumer_secret": row.get("consumer_secret"),
                    "access_token": row.get("access_token"),
                    "access_token_secret": row.get("access_token_secret"),
                    "bearer_token": row.get("bearer_token"),
                    "api_key": row.get("api_key"),
                    "enabled": row.get("enabled", True)
                }
            return None
        except Exception as e:
            logger.error(f"Error getting API credentials: {e}")
            return None
        finally:
            cursor.close()
    
    def delete_api_credentials(self, service_name: str) -> None:
        """Delete API credentials from database."""
        cursor = self.conn.cursor()
        try:
            cursor.execute("DELETE FROM api_credentials WHERE service_name = %s", (service_name,))
            self.conn.commit()
            logger.info(f"Deleted API credentials for {service_name}")
        except Exception as e:
            logger.error(f"Error deleting API credentials: {e}")
            self.conn.rollback()
            raise
        finally:
            cursor.close()
    
    def list_api_services(self) -> List[str]:
        """List all API service names in database."""
        cursor = self.conn.cursor()
        try:
            cursor.execute("SELECT service_name FROM api_credentials WHERE enabled = TRUE")
            rows = cursor.fetchall()
            return [row["service_name"] for row in rows]
        except Exception as e:
            logger.error(f"Error listing API services: {e}")
            return []
        finally:
            cursor.close()
    
    def close(self) -> None:
        """Close database connection."""
        if self.conn:
            self.conn.close()
            logger.info("Database connection closed")
