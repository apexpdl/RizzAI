# RizzAI Training Dataset Format

## Dataset Entry Structure

Each entry in the dataset follows this JSON format:

```json
{
  "context_messages": [
    "Hey what are you up to tonight?",
    "Not much, just chilling. You?"
  ],
  "reply": "Come chill with me then, I make great company 😏",
  "tone": "confident",
  "engagement_score": 0.85
}
```

## Fields

- **context_messages**: Array of preceding messages in the conversation (alternating between speakers)
- **reply**: The suggested reply to learn from
- **tone**: One of: `playful`, `curious`, `humorous`, `confident`, `safe`
- **engagement_score**: Float 0-1 indicating how well the reply keeps the conversation going

## Data Sources

Curate training data from:

1. **Reddit** — Conversation-heavy communities on dating advice, social skills, humor
2. **Twitter/X** — Viral banter threads, witty reply chains
3. **TikTok** — Niche dating/texting advice creators (not generic content)
4. **Books** — Interpersonal communication, humor writing, social psychology insights

## Usage with RAG

These entries get embedded and stored in a vector database (FAISS/Pinecone/Weaviate).
During reply generation, the system:

1. Embeds the current conversation context
2. Searches for similar past conversations
3. Retrieves top-k similar entries
4. Feeds them as examples to the LLM

## Volume

Target: millions of entries for comprehensive coverage across:
- Different conversation stages
- Various tones and styles
- Multiple cultural contexts
- Different flirting levels
