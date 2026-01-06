"""Tweet generation logic for posting original tweets."""
import logging
import random
from typing import Dict, Any, Optional, List
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)


class TweetGenerator:
    """Generates original tweets for posting."""
    
    def __init__(self, templates: List[str], gemini_config: Optional[Dict[str, Any]] = None):
        """Initialize tweet generator with templates and optional Gemini config."""
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
                logger.info("Google Gemini integration enabled for tweet generation")
            except Exception as e:
                logger.warning(f"Gemini initialization failed: {e}. Using templates only.")
    
    def generate_tweet(self, keywords: Optional[List[str]] = None) -> Optional[str]:
        """Generate an original tweet based on keywords."""
        if self.use_ai and hasattr(self, 'gemini_client'):
            return self._generate_ai_tweet(keywords)
        else:
            return self._generate_template_tweet()
    
    def _generate_template_tweet(self, keywords: Optional[List[str]] = None) -> Optional[str]:
        """Generate tweet using templates, expanded to use full character limit."""
        if not self.templates:
            logger.warning("No tweet templates available")
            return None
        
        # Select random template
        template = random.choice(self.templates)
        
        # Expand template to use more characters with paragraphs
        # If template is already long, use it as-is with a question
        if len(template) > 150:
            # Template is already substantial, add a paragraph with engagement
            expanded = f"{template}\n\nWhat's your take on this? Would love to hear your perspective."
        elif keywords and len(keywords) > 0:
            # Use keywords to create a longer, more detailed tweet
            keyword_str = keywords[0]  # Use first keyword
            expanded = f"{template}\n\nThis is especially relevant for {keyword_str}. What's been your experience? How has it impacted your approach?"
        else:
            expanded = f"{template}\n\nWhat are your thoughts on this? Would love to hear different perspectives and learn from your experience."
        
        # Ensure we're using the full limit (aim for 250-280)
        if len(expanded) < 250:
            # Add more context or detail to reach closer to 280
            if keywords and len(keywords) > 1:
                keyword1 = keywords[1] if len(keywords) > 1 else keywords[0]
                keyword2 = keywords[2] if len(keywords) > 2 else keywords[0]
                additional = f" Whether you're focused on {keyword1} or {keyword2}, the core principles of building trust and delivering value remain the same."
                if len(expanded + additional) <= 280:
                    expanded = expanded.rstrip() + additional
            else:
                additional = " The key is consistency, delivering real value, and building genuine connections with your audience over time."
                if len(expanded + additional) <= 280:
                    expanded = expanded.rstrip() + additional
        
        # If still under 250, add a call to action
        if len(expanded) < 250:
            cta = " What strategies have worked best for you?"
            if len(expanded + cta) <= 280:
                expanded = expanded.rstrip() + cta
        
        # Truncate to 280 characters (Twitter limit)
        if len(expanded) > 280:
            # Try to truncate at a sentence boundary
            truncated = expanded[:277]
            last_period = truncated.rfind('.')
            last_question = truncated.rfind('?')
            last_break = max(last_period, last_question)
            if last_break > 200:
                expanded = truncated[:last_break + 1]
            else:
                expanded = truncated + "..."
        
        return expanded.strip()
    
    def _generate_ai_tweet(self, keywords: Optional[List[str]] = None) -> Optional[str]:
        """Generate natural, human-like tweet using Gemini AI based on keywords."""
        if not hasattr(self, 'gemini_client'):
            return self._generate_template_tweet()
        
        try:
            # Build keyword context
            keyword_context = ""
            if keywords and len(keywords) > 0:
                # Use first 5 keywords for context
                relevant_keywords = keywords[:5]
                keyword_context = f"\n\nRelevant topics to consider (incorporate naturally, don't force): {', '.join(relevant_keywords)}"
            
            prompt = f"""Write a natural, authentic tweet that sounds like a real person, not AI-generated. Follow Twitter's AI guidelines.

CRITICAL REQUIREMENTS:
- Use the FULL 280 character limit (aim for 250-280 characters)
- Write in PARAGRAPHS - use line breaks to separate thoughts (use \\n for new lines)
- Sound completely human and authentic - use casual language, personal voice, real experiences
- Be engaging and valuable - share a real insight, tip, question, or thought
- Use natural language - contractions, casual expressions, personal perspective
- Avoid AI-sounding phrases: "I'm excited to share", "I'm thrilled to announce", "I'm passionate about", "I find this interesting"
- Don't use emojis excessively (0-2 max, only if natural)
- Make it conversational, like you're talking to friends
- If relevant to the topics, naturally incorporate them without forcing it
- Follow Twitter's AI disclosure: if AI-generated content, it should be clear, but prioritize sounding human first
- Write as if you're sharing a genuine thought, experience, or insight
- Use variations: sometimes ask questions, sometimes share tips, sometimes reflect
- Be specific, not generic - add real value with concrete examples or insights
- Structure: First paragraph introduces the thought/insight, second paragraph adds detail or asks a question
{keyword_context}

Write a natural, human tweet with paragraphs (use \\n for line breaks, aim for 250-280 characters total, just the text, no quotes or explanations):"""
            
            # Generate content using Gemini API
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
                tweet = response.text.strip()
            elif hasattr(response, 'candidates') and response.candidates:
                tweet = response.candidates[0].content.parts[0].text.strip()
            else:
                tweet = str(response).strip()
            
            # Remove quotes if AI wrapped the tweet in them
            if tweet.startswith('"') and tweet.endswith('"'):
                tweet = tweet[1:-1]
            if tweet.startswith("'") and tweet.endswith("'"):
                tweet = tweet[1:-1]
            
            # Clean up any markdown formatting
            tweet = tweet.replace("**", "").replace("*", "").replace("_", "")
            
            # Ensure we use line breaks for paragraphs (Twitter supports \n)
            # Replace multiple spaces with single space, but preserve intentional line breaks
            import re
            tweet = re.sub(r' +', ' ', tweet)  # Multiple spaces to single
            tweet = tweet.replace('\\n', '\n')  # Convert \n to actual newlines
            
            # If tweet is too short, try to expand it
            if len(tweet) < 200:
                # Add more context or detail
                if keywords and len(keywords) > 0:
                    keyword_note = f" What's your experience with {keywords[0]}?"
                    if len(tweet + keyword_note) <= 280:
                        tweet = tweet.rstrip() + keyword_note
            
            # Ensure we're close to the limit (aim for 250-280)
            if len(tweet) < 250:
                # Try to expand with more detail
                if not tweet.endswith('?'):
                    tweet = tweet.rstrip() + " What do you think?"
                if len(tweet) > 280:
                    tweet = tweet[:277] + "..."
            
            # Truncate to 280 characters if still too long
            if len(tweet) > 280:
                # Try to truncate at a sentence boundary
                truncated = tweet[:277]
                last_period = truncated.rfind('.')
                last_question = truncated.rfind('?')
                last_exclamation = truncated.rfind('!')
                last_break = max(last_period, last_question, last_exclamation)
                if last_break > 200:  # Only if we have a reasonable cutoff point
                    tweet = truncated[:last_break + 1]
                else:
                    tweet = truncated + "..."
            
            return tweet.strip()
        
        except Exception as e:
            logger.error(f"Error generating AI tweet: {e}")
            # Fallback to template
            return self._generate_template_tweet()
    
    def generate_thread(self, keywords: Optional[List[str]] = None, num_tweets: int = 3) -> Optional[List[str]]:
        """Generate a thread of connected tweets based on keywords."""
        if self.use_ai and hasattr(self, 'gemini_client'):
            return self._generate_ai_thread(keywords, num_tweets)
        else:
            return self._generate_template_thread(keywords, num_tweets)
    
    def _generate_template_thread(self, keywords: Optional[List[str]] = None, num_tweets: int = 3) -> Optional[List[str]]:
        """Generate thread using templates, ensuring each tweet uses full 280 character limit."""
        if not self.templates:
            logger.warning("No tweet templates available")
            return None
        
        thread = []
        template = random.choice(self.templates)
        
        # Build thread from template
        if keywords and len(keywords) > 0:
            keyword_str = keywords[0]
            keyword2 = keywords[1] if len(keywords) > 1 else keywords[0]
            keyword3 = keywords[2] if len(keywords) > 2 else keywords[0]
            
            # First tweet introduces the topic - expand to use full limit
            tweet1 = f"{template}\n\nLet me break this down in a thread about {keyword_str} and how it's changing the game for online businesses today."
            # Expand if too short
            if len(tweet1) < 250:
                tweet1 += f" Whether you're just starting out or looking to scale, understanding these principles can make all the difference."
            if len(tweet1) > 280:
                tweet1 = tweet1[:277] + "..."
            thread.append(tweet1)
            
            # Subsequent tweets expand on the topic - make them longer
            for i in range(1, num_tweets):
                if i == 1:
                    tweet = f"{i}/ When it comes to {keyword_str}, the fundamentals matter most. Understanding your audience and their needs is the foundation. But it's not just about knowing who they are - it's about understanding their pain points, their goals, and what keeps them up at night."
                elif i == 2:
                    tweet = f"{i}/ The key is consistency and delivering real value. Whether you're focused on {keyword_str} or building your brand around {keyword2}, authenticity wins every time. People can tell when you're genuine, and that's what builds trust and long-term relationships."
                else:
                    tweet = f"{i}/ What strategies have worked best for you? I'd love to hear your experience with {keyword_str} and {keyword3}. The best lessons come from real-world experience, and sharing what works helps everyone grow together."
                
                # Expand if too short
                if len(tweet) < 250:
                    tweet += " What's been your biggest challenge or win in this area?"
                
                if len(tweet) > 280:
                    # Try to truncate at sentence boundary
                    truncated = tweet[:277]
                    last_period = truncated.rfind('.')
                    last_question = truncated.rfind('?')
                    last_break = max(last_period, last_question)
                    if last_break > 200:
                        tweet = truncated[:last_break + 1]
                    else:
                        tweet = truncated + "..."
                thread.append(tweet)
        else:
            # Generic thread without specific keywords - expand to use full limit
            tweet1 = f"{template}\n\nLet me share some thoughts in this thread about what I've learned and what's working in today's market."
            if len(tweet1) < 250:
                tweet1 += " These insights come from real experience and conversations with people who are building successful businesses online."
            if len(tweet1) > 280:
                tweet1 = tweet1[:277] + "..."
            thread.append(tweet1)
            
            for i in range(1, num_tweets):
                tweet = f"{i}/ The key is building genuine connections and delivering value consistently over time. It's not about quick wins or shortcuts - it's about showing up every day, understanding your audience, and solving real problems for real people."
                if len(tweet) < 250:
                    tweet += " What's your experience been like? I'd love to hear what's working for you."
                if len(tweet) > 280:
                    truncated = tweet[:277]
                    last_period = truncated.rfind('.')
                    last_question = truncated.rfind('?')
                    last_break = max(last_period, last_question)
                    if last_break > 200:
                        tweet = truncated[:last_break + 1]
                    else:
                        tweet = truncated + "..."
                thread.append(tweet)
        
        return thread[:num_tweets] if len(thread) > num_tweets else thread
    
    def _generate_ai_thread(self, keywords: Optional[List[str]] = None, num_tweets: int = 3) -> Optional[List[str]]:
        """Generate a coherent thread using AI based on keywords."""
        if not hasattr(self, 'gemini_client'):
            return self._generate_template_thread(keywords, num_tweets)
        
        try:
            # Build keyword context
            keyword_context = ""
            if keywords and len(keywords) > 0:
                relevant_keywords = keywords[:5]
                keyword_context = f"\n\nTopics to cover naturally: {', '.join(relevant_keywords)}"
            
            prompt = f"""Write a thread of {num_tweets} connected tweets about the given topics. Each tweet should:
- Use the FULL 280 character limit (aim for 250-280 characters per tweet)
- Build on the previous tweet to form a coherent narrative
- Use line breaks (\\n) for paragraphs where natural
- Sound natural and human - use casual language, personal voice
- Cover different aspects of the topics naturally
- Each tweet should feel like a continuation of the conversation
- Avoid AI-sounding phrases
- Use contractions and natural expressions
- Make it valuable and engaging
- IMPORTANT: Each tweet must be close to 280 characters - don't make them short
{keyword_context}

Format: Return each tweet on a new line, numbered 1-{num_tweets} (like "1/ First tweet text", "2/ Second tweet text", etc.). Just the numbered tweets, no explanations or quotes."""

            # Generate content using Gemini API
            response = self.gemini_client.models.generate_content(
                model=self.gemini_model_name,
                contents=[prompt],
                config=types.GenerateContentConfig(
                    temperature=self.ai_temperature,
                    max_output_tokens=800,  # More tokens for multiple tweets
                )
            )
            
            # Extract text from response
            if hasattr(response, 'text'):
                thread_text = response.text.strip()
            elif hasattr(response, 'candidates') and response.candidates:
                thread_text = response.candidates[0].content.parts[0].text.strip()
            else:
                thread_text = str(response).strip()
            
            # Parse the thread - split by numbered lines
            import re
            # Match lines that start with numbers like "1/", "2/", etc.
            tweet_pattern = r'^\d+/\s*(.+?)(?=^\d+/\s*|\Z)'
            matches = re.findall(tweet_pattern, thread_text, re.MULTILINE | re.DOTALL)
            
            if matches:
                thread = [match.strip() for match in matches]
            else:
                # Fallback: split by newlines and filter
                lines = thread_text.split('\n')
                thread = []
                for line in lines:
                    line = line.strip()
                    # Remove leading numbers and slashes if present
                    line = re.sub(r'^\d+/\s*', '', line)
                    if line and len(line) > 20:  # Valid tweet length
                        thread.append(line)
            
            # Clean up each tweet
            cleaned_thread = []
            for tweet in thread[:num_tweets]:
                # Remove quotes if wrapped
                if tweet.startswith('"') and tweet.endswith('"'):
                    tweet = tweet[1:-1]
                if tweet.startswith("'") and tweet.endswith("'"):
                    tweet = tweet[1:-1]
                
                # Clean markdown
                tweet = tweet.replace("**", "").replace("*", "").replace("_", "")
                
                # Expand if too short - aim for 250-280 characters
                if len(tweet) < 250:
                    # Try to expand with more detail
                    if keywords and len(keywords) > 0:
                        keyword_note = f" What's your experience with {keywords[0]}?"
                        if len(tweet + keyword_note) <= 280:
                            tweet = tweet.rstrip() + keyword_note
                    
                    # If still short, add a question or thought
                    if len(tweet) < 250:
                        expansion = " What do you think? I'd love to hear your perspective."
                        if len(tweet + expansion) <= 280:
                            tweet = tweet.rstrip() + expansion
                
                # Ensure proper length - truncate if too long
                if len(tweet) > 280:
                    truncated = tweet[:277]
                    last_period = truncated.rfind('.')
                    last_question = truncated.rfind('?')
                    last_exclamation = truncated.rfind('!')
                    last_break = max(last_period, last_question, last_exclamation)
                    if last_break > 200:
                        tweet = truncated[:last_break + 1]
                    else:
                        tweet = truncated + "..."
                
                if tweet and len(tweet) > 10:  # Valid tweet
                    cleaned_thread.append(tweet.strip())
            
            # Ensure we have the right number of tweets
            if len(cleaned_thread) < num_tweets:
                # Generate additional tweets if needed
                logger.warning(f"Generated only {len(cleaned_thread)} tweets, expected {num_tweets}")
                # Fill with template-based tweets if needed
                while len(cleaned_thread) < num_tweets:
                    additional = self._generate_template_thread(keywords, 1)
                    if additional and len(additional) > 0:
                        cleaned_thread.append(additional[0])
                    else:
                        break
            
            if not cleaned_thread:
                logger.warning("Failed to generate thread, falling back to template")
                return self._generate_template_thread(keywords, num_tweets)
            
            return cleaned_thread[:num_tweets]
        
        except Exception as e:
            logger.error(f"Error generating AI thread: {e}")
            # Fallback to template
            return self._generate_template_thread(keywords, num_tweets)

