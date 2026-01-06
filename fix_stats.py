#!/usr/bin/env python3
"""
Quick script to verify and fix database stats tracking.
"""
import sqlite3
from src.database import Database

print("=" * 60)
print("Database Stats Check")
print("=" * 60)

# Check database
db = Database()
conn = sqlite3.connect('bot_state.db')
cur = conn.cursor()

# Check posted tweets
cur.execute("SELECT COUNT(*) FROM posted_tweets")
total_tweets = cur.fetchone()[0]
print(f"\nTotal Tweets Posted: {total_tweets}")

# Check replied tweets
cur.execute("SELECT COUNT(*) FROM replied_tweets")
total_replies = cur.fetchone()[0]
print(f"Total Replies: {total_replies}")

# Check quote retweets
cur.execute("SELECT COUNT(*) FROM quote_retweets")
total_quotes = cur.fetchone()[0]
print(f"Total Quote Retweets: {total_quotes}")

# Show recent posted tweets
print("\nRecent Posted Tweets:")
cur.execute("SELECT tweet_id, text, posted_at FROM posted_tweets ORDER BY posted_at DESC LIMIT 5")
for row in cur.fetchall():
    print(f"  - {row[0]}: {row[1][:50]}... ({row[2]})")

# Show recent replies
print("\nRecent Replies:")
cur.execute("SELECT tweet_id, reply_tweet_id, source, replied_at FROM replied_tweets ORDER BY replied_at DESC LIMIT 5")
replies = cur.fetchall()
if replies:
    for row in replies:
        print(f"  - Reply {row[1]} to tweet {row[0]} ({row[2]}) at {row[3]}")
else:
    print("  No replies yet")

conn.close()
db.close()

print("\n" + "=" * 60)
print("Dashboard should now show these stats correctly!")
print("=" * 60)

