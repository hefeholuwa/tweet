"""Reply generation logic for tweets."""
import logging
import random
import re
from typing import Dict, Any, Optional, List
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)


class ReplyGenerator:
    """Generates contextual replies to tweets."""
    
    def __init__(self, templates: List[str], gemini_config: Optional[Dict[str, Any]] = None):
        """Initialize reply generator with templates and optional Gemini config."""
        self.templates = templates
        self.gemini_model = None
        self.use_ai = False
        
        if gemini_config and gemini_config.get("enabled") and gemini_config.get("api_key"):
            try:
                self.gemini_client = genai.Client(api_key=gemini_config["api_key"])
                # Use gemini-1.5-pro or gemini-pro based on what's available
                model_name = gemini_config.get("model", "gemini-1.5-pro")
                # Map common model names
                if model_name == "gemini-pro":
                    model_name = "gemini-1.5-pro"
                elif model_name == "gemini-1.5-flash":
                    model_name = "gemini-1.5-flash"
                self.gemini_model_name = model_name
                self.use_ai = True
                self.ai_temperature = gemini_config.get("temperature", 0.7)
                logger.info("Google Gemini integration enabled")
            except Exception as e:
                logger.warning(f"Gemini initialization failed: {e}. Using templates only.")
    
    def generate_reply(self, tweet: Dict[str, Any], keyword: Optional[str] = None) -> Optional[str]:
        """Generate a reply for a tweet."""
        if self.use_ai and hasattr(self, 'gemini_client'):
            return self._generate_ai_reply(tweet, keyword)
        else:
            return self._generate_template_reply(tweet, keyword)
    
    def _generate_template_reply(self, tweet: Dict[str, Any], keyword: Optional[str] = None) -> Optional[str]:
        """Generate simple reply using templates with plain English."""
        if not self.templates:
            logger.warning("No reply templates available")
            return None
        
        # Select random template
        template = random.choice(self.templates)
        
        # Extract topic/keyword from tweet text or use provided keyword
        topic = keyword or self._extract_topic(tweet["text"])
        tweet_preview = tweet["text"][:60] + "..." if len(tweet["text"]) > 60 else tweet["text"]
        
        # Simple placeholder replacement - use plain English
        reply = template.replace("{context}", tweet_preview)
        reply = reply.replace("{topic}", topic or "this")
        reply = reply.replace("{related_idea}", f"trying a different approach")
        reply = reply.replace("{personal_insight}", f"I've been working on {topic} too. What's your experience?")
        
        # Simplify the language - remove complex phrases
        reply = reply.replace("I'd love to hear more about your thoughts on this, especially regarding", "What do you think about")
        reply = reply.replace("understanding the nuances really helps", "it helps to understand the basics")
        reply = reply.replace("exploring from different angles", "trying different ways")
        
        # Add simple mention if needed
        author_username = tweet.get("author_username", "")
        if author_username and f"@{author_username}" not in reply:
            if len(reply) < 250:
                reply = f"@{author_username} {reply}"
        
        # Truncate to 280 characters
        if len(reply) > 280:
            reply = reply[:277] + "..."
        
        return reply.strip()
    
    def _generate_ai_reply(self, tweet: Dict[str, Any], keyword: Optional[str] = None) -> Optional[str]:
        """Generate detailed, thoughtful reply using Google Gemini API."""
        if not hasattr(self, 'gemini_client'):
            return self._generate_template_reply(tweet, keyword)
        
        try:
            # Construct detailed prompt for AI
            author_username = tweet.get('author_username', 'user')
            keyword_context = f" (related to keyword: {keyword})" if keyword else ""
            
            prompt = f"""Write a simple, clear reply to this tweet. Use plain English that anyone can understand. Write like you're talking to a friend.

Rules:
- Use simple words and short sentences
- Be direct and clear - say what you mean
- Keep it between 150-250 characters (under 280 total)
- Sound natural - use "I" and "you" like normal conversation
- Ask a simple question or share a simple thought
- Mention @{author_username} at the start
- Don't use fancy words or complicated phrases
- Don't repeat what they said - add your own simple thought
- Write like a normal person, not a robot

Tweet:
"{tweet['text']}"
{keyword_context}

Write a simple, clear reply in plain English (just the text, no quotes):"""
            
            # Generate content using the new Gemini API
            response = self.gemini_client.models.generate_content(
                model=self.gemini_model_name,
                contents=[prompt],
                config=types.GenerateContentConfig(
                    temperature=self.ai_temperature,
                    max_output_tokens=200,
                )
            )
            
            # Extract text from response
            if hasattr(response, 'text'):
                reply = response.text.strip()
            elif hasattr(response, 'candidates') and response.candidates:
                reply = response.candidates[0].content.parts[0].text.strip()
            else:
                reply = str(response).strip()
            
            # Remove quotes if AI wrapped the reply in them
            if reply.startswith('"') and reply.endswith('"'):
                reply = reply[1:-1]
            if reply.startswith("'") and reply.endswith("'"):
                reply = reply[1:-1]
            
            # Clean up any markdown formatting
            reply = reply.replace("**", "").replace("*", "").replace("_", "")
            
            # Ensure it mentions the author if it doesn't already
            if author_username and f"@{author_username}" not in reply:
                # Add mention at the start if there's room
                if len(reply) < 260:
                    reply = f"@{author_username} {reply}"
            
            # Truncate to 280 characters (Twitter limit)
            if len(reply) > 280:
                reply = reply[:277] + "..."
            
            return reply.strip()
        
        except Exception as e:
            logger.error(f"Error generating AI reply: {e}")
            # Fallback to template
            return self._generate_template_reply(tweet, keyword)
    
    def _extract_topic(self, text: str) -> str:
        """Extract a topic/keyword from tweet text (simple implementation)."""
        # Remove URLs and mentions
        text = re.sub(r'http\S+|www\.\S+', '', text)
        text = re.sub(r'@\w+', '', text)
        text = re.sub(r'#\w+', '', text)
        
        # Get first few meaningful words
        words = text.split()[:5]
        return ' '.join(words) if words else "this topic"

