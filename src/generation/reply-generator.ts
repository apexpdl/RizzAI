import type {
  CapturedMessage,
  ContactProfile,
  ConversationAnalysis,
  ReplyTone,
  ReplySuggestion,
  RizzAISettings,
} from '../types';
import { PromptBuilder } from './prompt-builder';
import { generateId } from '../utils/helpers';

/**
 * Generates reply suggestions by calling the configured LLM API.
 * Supports multiple tones and conversation rescue mode.
 */
export class ReplyGenerator {
  private promptBuilder = new PromptBuilder();

  async generateReplies(
    settings: RizzAISettings,
    profile: ContactProfile,
    analysis: ConversationAnalysis,
    recentMessages: CapturedMessage[],
    requestedTones?: ReplyTone[]
  ): Promise<ReplySuggestion[]> {
    const tones: ReplyTone[] = requestedTones ||
      analysis.suggestedStrategy.preferredTones.length > 0
        ? analysis.suggestedStrategy.preferredTones
        : ['playful', 'curious', 'humorous', 'confident', 'safe'];

    const count = settings.replyCount || 5;
    const systemPrompt = this.promptBuilder.buildSystemPrompt(profile, analysis);
    const userPrompt = this.promptBuilder.buildUserPrompt(recentMessages, tones, count);

    try {
      const response = await this.callLLM(settings, systemPrompt, userPrompt);
      return this.parseResponse(response, tones);
    } catch (error) {
      console.error('RizzAI: Reply generation failed:', error);
      return this.getFallbackReplies(recentMessages);
    }
  }

  async generateRescueReplies(
    settings: RizzAISettings,
    profile: ContactProfile,
    lastMessages: CapturedMessage[]
  ): Promise<ReplySuggestion[]> {
    const systemPrompt = `You are a socially intelligent texting assistant helping re-engage a conversation that has gone cold. Sound natural and human.`;
    const userPrompt = this.promptBuilder.buildRescuePrompt(profile, lastMessages);

    try {
      const response = await this.callLLM(settings, systemPrompt, userPrompt);
      return this.parseResponse(response, ['playful', 'curious', 'confident']);
    } catch {
      return this.getFallbackReplies(lastMessages);
    }
  }

  private async callLLM(
    settings: RizzAISettings,
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    if (!settings.apiKey) {
      throw new Error('API key not configured');
    }

    const response = await fetch(settings.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: settings.model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || '';
  }

  private parseResponse(
    responseText: string,
    expectedTones: ReplyTone[]
  ): ReplySuggestion[] {
    try {
      // Extract JSON array from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]) as Array<{
        text: string;
        tone: string;
        reasoning?: string;
      }>;

      return parsed.map((item, i) => ({
        id: generateId(),
        text: item.text,
        tone: (expectedTones.includes(item.tone as ReplyTone)
          ? item.tone
          : expectedTones[i % expectedTones.length]) as ReplyTone,
        confidence: 0.8 - i * 0.05,
        reasoning: item.reasoning,
      }));
    } catch {
      // If parsing fails, treat the whole response as a single suggestion
      return [{
        id: generateId(),
        text: responseText.trim(),
        tone: expectedTones[0] || 'safe',
        confidence: 0.5,
      }];
    }
  }

  private getFallbackReplies(messages: CapturedMessage[]): ReplySuggestion[] {
    const lastMessage = messages[messages.length - 1];
    const isQuestion = lastMessage?.metadata.isQuestion;

    const fallbacks: ReplySuggestion[] = [
      {
        id: generateId(),
        text: isQuestion ? "That's a great question honestly" : "Haha that's actually so true",
        tone: 'safe',
        confidence: 0.3,
      },
      {
        id: generateId(),
        text: isQuestion ? "Hmm let me think about that" : "Wait tell me more about that",
        tone: 'curious',
        confidence: 0.3,
      },
      {
        id: generateId(),
        text: "Ok but you can't just say that and not explain 😂",
        tone: 'playful',
        confidence: 0.3,
      },
    ];

    return fallbacks;
  }
}
