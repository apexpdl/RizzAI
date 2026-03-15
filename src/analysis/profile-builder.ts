import type {
  CapturedMessage,
  ContactProfile,
  ConversationStage,
  Platform,
  ResponseTimePattern,
  EmotionalTonePattern,
  HumorStyle,
  EmojiUsage,
} from '../types';

/**
 * Builds and updates a ContactProfile from conversation messages.
 * Analyzes message patterns, timing, tone, humor, and topics.
 */
export class ProfileBuilder {
  /**
   * Build a full contact profile from messages.
   */
  buildProfile(
    contactId: string,
    displayName: string,
    platform: Platform,
    messages: CapturedMessage[]
  ): ContactProfile {
    const otherMessages = messages.filter((m) => m.sender === 'other');
    const userMessages = messages.filter((m) => m.sender === 'user');
    const allTimestamps = messages.map((m) => m.timestamp).sort((a, b) => a - b);

    return {
      contactId,
      displayName,
      platform,
      firstInteractionDate: allTimestamps[0] || Date.now(),
      lastInteractionDate: allTimestamps[allTimestamps.length - 1] || Date.now(),
      totalMessages: messages.length,
      responseTimePattern: this.analyzeResponseTime(messages),
      emotionalTonePattern: this.analyzeEmotionalTone(otherMessages),
      humorStyle: this.analyzeHumorStyle(otherMessages),
      emojiUsage: this.analyzeEmojiUsage(otherMessages),
      insideJokes: this.detectInsideJokes(messages),
      topicsDiscussed: this.extractTopics(messages),
      flirtingLevel: this.assessFlirtingLevel(messages),
      preferredMessageLength: this.getPreferredLength(otherMessages),
      conversationStage: this.assessConversationStage(messages),
    };
  }

  /**
   * Update an existing profile with new messages.
   */
  updateProfile(
    existing: ContactProfile,
    newMessages: CapturedMessage[],
    allMessages: CapturedMessage[]
  ): ContactProfile {
    const updated = this.buildProfile(
      existing.contactId,
      existing.displayName,
      existing.platform,
      allMessages
    );

    // Preserve manually set or accumulated data
    updated.insideJokes = [
      ...new Set([...existing.insideJokes, ...updated.insideJokes]),
    ];
    updated.topicsDiscussed = [
      ...new Set([...existing.topicsDiscussed, ...updated.topicsDiscussed]),
    ];

    return updated;
  }

  private analyzeResponseTime(messages: CapturedMessage[]): ResponseTimePattern {
    const responseTimes: number[] = [];
    const timeOfDay: number[] = [];

    for (let i = 1; i < messages.length; i++) {
      const prev = messages[i - 1];
      const curr = messages[i];

      // Only count responses (sender changed)
      if (prev.sender !== curr.sender && curr.sender === 'other') {
        const diffSeconds = (curr.timestamp - prev.timestamp) / 1000;
        if (diffSeconds > 0 && diffSeconds < 86400) {
          responseTimes.push(diffSeconds);
        }
      }

      if (curr.sender === 'other') {
        const hour = new Date(curr.timestamp).getHours();
        timeOfDay.push(hour);
      }
    }

    const avg = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    // Find peak hours
    const hourCounts = new Array(24).fill(0);
    timeOfDay.forEach((h) => hourCounts[h]++);
    const peakHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((h) => `${h.hour}:00`);

    return {
      averageSeconds: Math.round(avg),
      fastestSeconds: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      slowestSeconds: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      timeOfDayPreference: peakHours,
    };
  }

  private analyzeEmotionalTone(messages: CapturedMessage[]): EmotionalTonePattern {
    const toneScores: Record<string, number> = {
      positive: 0,
      neutral: 0,
      playful: 0,
      serious: 0,
      affectionate: 0,
    };

    for (const msg of messages) {
      const text = msg.text.toLowerCase();

      if (/haha|lol|lmao|😂|🤣|😆/.test(text)) toneScores.playful += 2;
      if (/❤|💕|🥰|😘|love|miss/.test(text)) toneScores.affectionate += 2;
      if (/!{2,}|omg|wow|amazing|😍/.test(text)) toneScores.positive += 2;
      if (/\?{2,}|seriously|actually|honestly/.test(text)) toneScores.serious += 1;
      if (msg.metadata.emojiCount > 0) toneScores.positive += 1;
      if (msg.metadata.messageLength > 100) toneScores.serious += 1;

      toneScores.neutral += 0.5;
    }

    const sorted = Object.entries(toneScores).sort(([, a], [, b]) => b - a);
    const total = Object.values(toneScores).reduce((a, b) => a + b, 1);

    return {
      dominant: sorted[0]?.[0] || 'neutral',
      secondary: sorted[1]?.[0] || 'neutral',
      variability: sorted.length > 1 ? 1 - (sorted[0][1] / total) : 0,
    };
  }

  private analyzeHumorStyle(messages: CapturedMessage[]): HumorStyle {
    let humorCount = 0;
    const styles: Record<string, number> = {
      witty: 0,
      sarcastic: 0,
      dry: 0,
      playful: 0,
      'meme-based': 0,
      'pun-lover': 0,
    };

    for (const msg of messages) {
      const text = msg.text.toLowerCase();

      if (/haha|lol|lmao|😂|🤣|😆|💀/.test(text)) {
        humorCount++;
        styles.playful++;
      }
      if (/sure|right|totally|obviously/i.test(text) && text.length < 30) {
        styles.sarcastic++;
        humorCount++;
      }
      if (/😏|👀|🙃/.test(text)) {
        styles.witty++;
        humorCount++;
      }
      if (/bruh|dead|skull|💀|no way/.test(text)) {
        styles['meme-based']++;
        humorCount++;
      }
    }

    const frequency = messages.length > 0 ? humorCount / messages.length : 0;
    const topStyle = Object.entries(styles).sort(([, a], [, b]) => b - a)[0];

    return {
      type: (topStyle?.[1] || 0) > 0 ? (topStyle[0] as HumorStyle['type']) : 'none',
      frequency: Math.min(frequency, 1),
    };
  }

  private analyzeEmojiUsage(messages: CapturedMessage[]): EmojiUsage {
    const emojiCounts: Record<string, number> = {};
    let totalWithEmoji = 0;

    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;

    for (const msg of messages) {
      const emojis = msg.text.match(emojiRegex) || [];
      if (emojis.length > 0) totalWithEmoji++;
      for (const emoji of emojis) {
        emojiCounts[emoji] = (emojiCounts[emoji] || 0) + 1;
      }
    }

    const frequency = messages.length > 0 ? totalWithEmoji / messages.length : 0;
    const favorites = Object.entries(emojiCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([emoji]) => emoji);

    let style: EmojiUsage['style'];
    if (frequency > 0.7) style = 'heavy';
    else if (frequency > 0.3) style = 'moderate';
    else if (frequency > 0.05) style = 'minimal';
    else style = 'none';

    return { frequency, favorites, style };
  }

  private detectInsideJokes(messages: CapturedMessage[]): string[] {
    // Simple approach: find phrases repeated by both parties
    const userPhrases = new Map<string, number>();
    const otherPhrases = new Map<string, number>();

    for (const msg of messages) {
      const words = msg.text.toLowerCase().split(/\s+/);
      const map = msg.sender === 'user' ? userPhrases : otherPhrases;

      // Look at 2-4 word ngrams
      for (let n = 2; n <= 4; n++) {
        for (let i = 0; i <= words.length - n; i++) {
          const ngram = words.slice(i, i + n).join(' ');
          if (ngram.length > 5) {
            map.set(ngram, (map.get(ngram) || 0) + 1);
          }
        }
      }
    }

    // Inside jokes = phrases used by both parties more than once
    const jokes: string[] = [];
    for (const [phrase, count] of userPhrases) {
      const otherCount = otherPhrases.get(phrase) || 0;
      if (count >= 2 && otherCount >= 2) {
        jokes.push(phrase);
      }
    }

    return jokes.slice(0, 10);
  }

  private extractTopics(messages: CapturedMessage[]): string[] {
    const topicKeywords: Record<string, string[]> = {
      food: ['eat', 'food', 'dinner', 'lunch', 'restaurant', 'cook', 'hungry'],
      travel: ['trip', 'travel', 'flight', 'vacation', 'beach', 'country'],
      music: ['song', 'music', 'playlist', 'concert', 'album', 'artist'],
      movies: ['movie', 'film', 'watch', 'netflix', 'show', 'series'],
      fitness: ['gym', 'workout', 'run', 'exercise', 'health'],
      work: ['work', 'job', 'meeting', 'project', 'boss', 'office'],
      school: ['class', 'study', 'exam', 'school', 'college', 'homework'],
      nightlife: ['party', 'club', 'drink', 'bar', 'night out'],
      pets: ['dog', 'cat', 'pet', 'puppy', 'kitten'],
      gaming: ['game', 'play', 'stream', 'console', 'level'],
    };

    const topicScores: Record<string, number> = {};
    const allText = messages.map((m) => m.text.toLowerCase()).join(' ');

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      for (const keyword of keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = allText.match(regex);
        if (matches) {
          topicScores[topic] = (topicScores[topic] || 0) + matches.length;
        }
      }
    }

    return Object.entries(topicScores)
      .filter(([, score]) => score > 2)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic);
  }

  private assessFlirtingLevel(messages: CapturedMessage[]): number {
    let flirtSignals = 0;
    const total = messages.length || 1;

    for (const msg of messages) {
      const text = msg.text.toLowerCase();
      if (/😏|😘|😍|🥰|💕|❤|🔥|👀/.test(text)) flirtSignals++;
      if (/cute|hot|handsome|beautiful|gorgeous|attractive/.test(text)) flirtSignals++;
      if (/haha\s*(you|ur|your)|you're\s*(funny|hilarious|too much)/.test(text)) flirtSignals++;
      if (/miss you|thinking about you|can't stop/.test(text)) flirtSignals += 2;
      if (/date|hang out|come over|see you/.test(text)) flirtSignals++;
    }

    return Math.min(Math.round((flirtSignals / total) * 20), 10);
  }

  private getPreferredLength(messages: CapturedMessage[]): 'short' | 'medium' | 'long' {
    if (messages.length === 0) return 'medium';
    const avgLength =
      messages.reduce((sum, m) => sum + m.metadata.messageLength, 0) / messages.length;

    if (avgLength < 30) return 'short';
    if (avgLength < 100) return 'medium';
    return 'long';
  }

  private assessConversationStage(messages: CapturedMessage[]): ConversationStage {
    const count = messages.length;
    if (count < 10) return 'first_conversation';
    if (count < 50) return 'early_chatting';

    // Check for flirting signals
    const flirtLevel = this.assessFlirtingLevel(messages);
    if (flirtLevel >= 7) return 'deeper_connection';
    if (flirtLevel >= 4) return 'playful_flirting';
    return 'comfortable';
  }
}
