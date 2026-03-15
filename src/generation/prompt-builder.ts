import type {
  CapturedMessage,
  ContactProfile,
  ConversationAnalysis,
  ConversationStrategy,
  ReplyTone,
} from '../types';

/**
 * Builds the LLM prompt for generating reply suggestions.
 * Incorporates conversation history, contact profile, and analysis.
 */
export class PromptBuilder {
  /**
   * Build the system instruction for the AI model.
   */
  buildSystemPrompt(profile: ContactProfile, analysis: ConversationAnalysis): string {
    const strategy = analysis.suggestedStrategy;

    return `You are a socially intelligent texting assistant. Your job is to help the user craft natural, witty, confident replies in a conversation.

CRITICAL RULES:
- Sound like a real person texting a friend or romantic interest
- Keep messages concise — match the conversation's natural message length
- NEVER sound robotic, overly formal, or like an AI
- Use natural language, slang when appropriate, and match the vibe
- Adapt to the other person's communication style

ABOUT THIS CONVERSATION:
- Contact: ${profile.displayName}
- Stage: ${this.describeStage(analysis.stage)}
- Energy level: ${analysis.energy}
- Interest signals: ${analysis.interestSignals.indicators.join(', ') || 'none detected yet'}
- Their humor style: ${profile.humorStyle.type} (frequency: ${Math.round(profile.humorStyle.frequency * 100)}%)
- Their emoji style: ${profile.emojiUsage.style} (favorites: ${profile.emojiUsage.favorites.join(' ') || 'none'})
- Flirting level: ${profile.flirtingLevel}/10
- Topics discussed: ${profile.topicsDiscussed.join(', ') || 'various'}
- Inside jokes: ${profile.insideJokes.join(', ') || 'none yet'}

STRATEGY:
- Preferred message length: ${strategy.messageLength}
- Emoji level: ${strategy.emojiLevel}
- Preferred tones: ${strategy.preferredTones.join(', ')}
- Avoid: ${strategy.avoidTones.join(', ') || 'nothing specific'}
- Tips: ${strategy.tips.join('; ')}

When generating replies, provide exactly the number requested. Each reply should have a different tone/approach. Format each reply as a JSON object.`;
  }

  /**
   * Build the user prompt with recent conversation context.
   */
  buildUserPrompt(
    recentMessages: CapturedMessage[],
    tones: ReplyTone[],
    count: number
  ): string {
    const conversationContext = recentMessages
      .slice(-20) // Last 20 messages for context
      .map((m) => {
        const sender = m.sender === 'user' ? 'You' : 'Them';
        return `${sender}: ${m.text}`;
      })
      .join('\n');

    const lastMessage = recentMessages[recentMessages.length - 1];
    const lastSender = lastMessage?.sender === 'user' ? 'You' : 'Them';

    return `Here's the recent conversation:

${conversationContext}

The last message was from ${lastSender}: "${lastMessage?.text || ''}"

Generate ${count} reply suggestions with these tones: ${tones.join(', ')}

Respond ONLY with a JSON array of objects, each with "text", "tone", and "reasoning" fields. Example:
[
  {"text": "the reply text", "tone": "playful", "reasoning": "why this works"}
]

Do NOT include any other text outside the JSON array.`;
  }

  /**
   * Build a prompt for conversation rescue (when chat goes cold).
   */
  buildRescuePrompt(
    profile: ContactProfile,
    lastMessages: CapturedMessage[]
  ): string {
    const topics = profile.topicsDiscussed;
    const jokes = profile.insideJokes;

    return `The conversation with ${profile.displayName} has gone cold. Generate 3 re-engagement messages.

Previous topics: ${topics.join(', ') || 'general chat'}
Inside jokes: ${jokes.join(', ') || 'none'}
Last few messages:
${lastMessages.slice(-5).map((m) => `${m.sender === 'user' ? 'You' : 'Them'}: ${m.text}`).join('\n')}

Generate 3 conversation starters that:
1. Reference something from past conversations (callback)
2. Ask a fun/interesting question (topic changer)
3. Use playful humor to re-engage

Respond ONLY with a JSON array of objects with "text", "tone", and "reasoning" fields.`;
  }

  private describeStage(stage: string): string {
    const descriptions: Record<string, string> = {
      first_conversation: 'This is a new conversation — still getting to know each other',
      early_chatting: 'Early chatting phase — building rapport',
      comfortable: 'Comfortable with each other — natural flowing conversation',
      playful_flirting: 'Playful flirting stage — teasing and light flirting',
      deeper_connection: 'Deeper connection — emotional and meaningful exchanges',
    };
    return descriptions[stage] || stage;
  }
}
