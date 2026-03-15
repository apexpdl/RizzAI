import type {
  CapturedMessage,
  ConversationAnalysis,
  ConversationStage,
  ConversationStrategy,
  EnergyLevel,
  InterestSignals,
  ReplyTone,
  StyleProfile,
} from '../../types';

/**
 * Analyzes conversation dynamics, interest signals, energy levels,
 * and generates a conversation strategy for reply generation.
 */
export class ConversationAnalyzer {
  analyze(contactId: string, messages: CapturedMessage[]): ConversationAnalysis {
    const otherMessages = messages.filter((m) => m.sender === 'other');
    const userMessages = messages.filter((m) => m.sender === 'user');

    const stage = this.detectStage(messages);
    const energy = this.measureEnergy(otherMessages);
    const interestSignals = this.detectInterestSignals(messages, otherMessages);
    const styleProfile = this.analyzeStyle(otherMessages);
    const suggestedStrategy = this.buildStrategy(stage, energy, interestSignals, styleProfile);

    return {
      contactId,
      stage,
      energy,
      interestSignals,
      styleProfile,
      suggestedStrategy,
    };
  }

  private detectStage(messages: CapturedMessage[]): ConversationStage {
    const count = messages.length;
    if (count < 10) return 'first_conversation';
    if (count < 50) return 'early_chatting';

    const recentMessages = messages.slice(-30);
    let flirtCount = 0;
    let deepCount = 0;

    for (const msg of recentMessages) {
      const text = msg.text.toLowerCase();
      if (/😏|😘|😍|🥰|💕|❤|🔥|miss|cute|hot/.test(text)) flirtCount++;
      if (/feel|love|future|together|relationship|trust|serious/.test(text)) deepCount++;
    }

    if (deepCount > 5) return 'deeper_connection';
    if (flirtCount > 5) return 'playful_flirting';
    return 'comfortable';
  }

  private measureEnergy(otherMessages: CapturedMessage[]): EnergyLevel {
    if (otherMessages.length === 0) return 'low';

    const recent = otherMessages.slice(-20);
    let energyScore = 0;

    for (const msg of recent) {
      // Message length contribution
      if (msg.metadata.messageLength > 50) energyScore += 1;
      if (msg.metadata.messageLength > 100) energyScore += 1;

      // Emoji contribution
      if (msg.metadata.emojiCount > 0) energyScore += 1;
      if (msg.metadata.emojiCount > 2) energyScore += 1;

      // Question marks show engagement
      if (msg.metadata.isQuestion) energyScore += 2;

      // Exclamation marks show enthusiasm
      if (/!/.test(msg.text)) energyScore += 1;
    }

    const avgEnergy = energyScore / recent.length;
    if (avgEnergy > 4) return 'high';
    if (avgEnergy > 2) return 'medium';
    return 'low';
  }

  private detectInterestSignals(
    allMessages: CapturedMessage[],
    otherMessages: CapturedMessage[]
  ): InterestSignals {
    const indicators: string[] = [];

    // Fast responses
    let fastResponseCount = 0;
    for (let i = 1; i < allMessages.length; i++) {
      if (allMessages[i].sender === 'other' && allMessages[i - 1].sender === 'user') {
        const diff = (allMessages[i].timestamp - allMessages[i - 1].timestamp) / 1000;
        if (diff < 120) fastResponseCount++;
      }
    }
    const fastResponses = fastResponseCount > otherMessages.length * 0.3;
    if (fastResponses) indicators.push('Responds quickly to your messages');

    // Questions asked
    const questionCount = otherMessages.filter((m) => m.metadata.isQuestion).length;
    const repeatedQuestions = questionCount > otherMessages.length * 0.3;
    if (repeatedQuestions) indicators.push('Asks you lots of questions');

    // Playful teasing
    let playfulCount = 0;
    for (const msg of otherMessages) {
      const text = msg.text.toLowerCase();
      if (/haha|lol|omg|stop|you're|ur\s+(so|too)|😂|🤣|😏/.test(text)) playfulCount++;
    }
    const playfulTeasing = playfulCount > otherMessages.length * 0.2;
    if (playfulTeasing) indicators.push('Uses playful/teasing language');

    // Initiates conversation
    let initiationCount = 0;
    let lastSender: string | null = null;
    for (const msg of allMessages) {
      const gap = lastSender === null
        ? Infinity
        : msg.timestamp - (allMessages[allMessages.indexOf(msg) - 1]?.timestamp || 0);
      if (msg.sender === 'other' && gap > 3600000) initiationCount++;
      lastSender = msg.sender;
    }
    const initiatesConversation = initiationCount > 3;
    if (initiatesConversation) indicators.push('Often starts conversations');

    // Curiosity
    const curiosity = questionCount > 10;
    if (curiosity) indicators.push('Shows curiosity about you');

    // Overall score
    const signalCount = [fastResponses, repeatedQuestions, playfulTeasing, initiatesConversation, curiosity]
      .filter(Boolean).length;
    const score = signalCount / 5;

    return {
      score,
      indicators,
      repeatedQuestions,
      fastResponses,
      playfulTeasing,
      curiosity,
      initiatesConversation,
    };
  }

  private analyzeStyle(messages: CapturedMessage[]): StyleProfile {
    if (messages.length === 0) {
      return {
        usesEmojis: false,
        usesSlang: false,
        usesMemes: false,
        sarcasmLevel: 0,
        formalityLevel: 0.5,
        averageMessageLength: 0,
      };
    }

    const emojiUsers = messages.filter((m) => m.metadata.emojiCount > 0).length;
    const usesEmojis = emojiUsers / messages.length > 0.2;

    let slangCount = 0;
    let memeCount = 0;
    let sarcasmCount = 0;
    let formalCount = 0;

    for (const msg of messages) {
      const text = msg.text.toLowerCase();
      if (/bruh|ngl|fr|lowkey|highkey|vibes|bet|ong|no cap|slay|deadass/.test(text)) slangCount++;
      if (/💀|dead|bruh moment|ratio|based|cope|sus/.test(text)) memeCount++;
      if (/sure|right|totally|obviously|wow.*really|oh.*great/.test(text) && text.length < 40) sarcasmCount++;
      if (/please|thank|would you|could you|appreciate/.test(text)) formalCount++;
    }

    const n = messages.length;
    const avgLength = messages.reduce((s, m) => s + m.metadata.messageLength, 0) / n;

    return {
      usesEmojis,
      usesSlang: slangCount / n > 0.1,
      usesMemes: memeCount / n > 0.05,
      sarcasmLevel: Math.min(sarcasmCount / n, 1),
      formalityLevel: Math.min(formalCount / n, 1),
      averageMessageLength: Math.round(avgLength),
    };
  }

  private buildStrategy(
    stage: ConversationStage,
    energy: EnergyLevel,
    interest: InterestSignals,
    style: StyleProfile
  ): ConversationStrategy {
    const preferredTones: ReplyTone[] = [];
    const avoidTones: ReplyTone[] = [];
    const tips: string[] = [];

    // Tone selection based on stage and signals
    if (stage === 'first_conversation') {
      preferredTones.push('curious', 'safe');
      avoidTones.push('confident');
      tips.push('Keep it light and ask questions to show interest');
    } else if (stage === 'early_chatting') {
      preferredTones.push('curious', 'playful');
      tips.push('Build rapport by finding shared interests');
    } else if (stage === 'comfortable') {
      preferredTones.push('playful', 'humorous');
      tips.push('You can be more relaxed and show personality');
    } else if (stage === 'playful_flirting') {
      preferredTones.push('playful', 'confident', 'humorous');
      tips.push('Keep the playful energy going with teasing');
    } else {
      preferredTones.push('confident', 'playful');
      tips.push('Be genuine and maintain emotional depth');
    }

    // Adjust based on energy
    if (energy === 'low') {
      tips.push('Energy is low — try to re-engage with a fun question or callback');
      preferredTones.unshift('curious');
    }
    if (energy === 'high') {
      tips.push('Energy is high — match their enthusiasm');
    }

    // Interest-based tips
    if (interest.fastResponses) tips.push('They reply fast — keep momentum');
    if (interest.playfulTeasing) tips.push('They enjoy playful banter — tease back');
    if (!interest.initiatesConversation) tips.push('They rarely start convos — you may need to initiate');

    // Message length
    const messageLength: 'short' | 'medium' | 'long' =
      style.averageMessageLength < 30 ? 'short' :
      style.averageMessageLength < 100 ? 'medium' : 'long';

    // Emoji level
    const emojiLevel: 'none' | 'light' | 'moderate' | 'heavy' =
      !style.usesEmojis ? 'none' :
      style.usesEmojis && style.averageMessageLength < 50 ? 'moderate' : 'light';

    return {
      preferredTones,
      avoidTones,
      messageLength,
      emojiLevel,
      tips,
    };
  }
}
