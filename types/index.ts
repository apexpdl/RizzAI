// ============================================================
// RizzAI Core Type Definitions
// ============================================================

/** Supported messaging platforms */
export type Platform =
  | 'instagram'
  | 'twitter'
  | 'whatsapp'
  | 'telegram'
  | 'messenger'
  | 'discord'
  | 'tinder';

/** Message sender type */
export type SenderType = 'user' | 'other';

/** Conversation stage assessment */
export type ConversationStage =
  | 'first_conversation'
  | 'early_chatting'
  | 'comfortable'
  | 'playful_flirting'
  | 'deeper_connection';

/** Conversation energy level */
export type EnergyLevel = 'high' | 'medium' | 'low';

/** Reply tone category */
export type ReplyTone =
  | 'playful'
  | 'curious'
  | 'humorous'
  | 'confident'
  | 'safe';

/** A single captured message */
export interface CapturedMessage {
  id: string;
  contactId: string;
  sender: SenderType;
  text: string;
  timestamp: number;
  platform: Platform;
  metadata: MessageMetadata;
}

/** Metadata extracted from a message */
export interface MessageMetadata {
  emojiCount: number;
  isQuestion: boolean;
  messageLength: number;
  hasMedia: boolean;
  replyToId?: string;
}

/** Persistent profile for a contact */
export interface ContactProfile {
  contactId: string;
  displayName: string;
  platform: Platform;
  firstInteractionDate: number;
  lastInteractionDate: number;
  totalMessages: number;
  responseTimePattern: ResponseTimePattern;
  emotionalTonePattern: EmotionalTonePattern;
  humorStyle: HumorStyle;
  emojiUsage: EmojiUsage;
  insideJokes: string[];
  topicsDiscussed: string[];
  flirtingLevel: number; // 0-10
  preferredMessageLength: 'short' | 'medium' | 'long';
  conversationStage: ConversationStage;
}

export interface ResponseTimePattern {
  averageSeconds: number;
  fastestSeconds: number;
  slowestSeconds: number;
  timeOfDayPreference: string[];
}

export interface EmotionalTonePattern {
  dominant: string;
  secondary: string;
  variability: number; // 0-1
}

export interface HumorStyle {
  type: 'witty' | 'sarcastic' | 'dry' | 'playful' | 'meme-based' | 'pun-lover' | 'none';
  frequency: number; // 0-1
}

export interface EmojiUsage {
  frequency: number; // 0-1
  favorites: string[];
  style: 'heavy' | 'moderate' | 'minimal' | 'none';
}

/** Conversation analysis result */
export interface ConversationAnalysis {
  contactId: string;
  stage: ConversationStage;
  energy: EnergyLevel;
  interestSignals: InterestSignals;
  styleProfile: StyleProfile;
  suggestedStrategy: ConversationStrategy;
}

export interface InterestSignals {
  score: number; // 0-1
  indicators: string[];
  repeatedQuestions: boolean;
  fastResponses: boolean;
  playfulTeasing: boolean;
  curiosity: boolean;
  initiatesConversation: boolean;
}

export interface StyleProfile {
  usesEmojis: boolean;
  usesSlang: boolean;
  usesMemes: boolean;
  sarcasmLevel: number; // 0-1
  formalityLevel: number; // 0-1
  averageMessageLength: number;
}

export interface ConversationStrategy {
  preferredTones: ReplyTone[];
  avoidTones: ReplyTone[];
  messageLength: 'short' | 'medium' | 'long';
  emojiLevel: 'none' | 'light' | 'moderate' | 'heavy';
  tips: string[];
}

/** A generated reply suggestion */
export interface ReplySuggestion {
  id: string;
  text: string;
  tone: ReplyTone;
  confidence: number; // 0-1
  reasoning?: string;
}

/** Platform adapter interface */
export interface PlatformAdapter {
  platform: Platform;
  isActive(): boolean;
  getConversationContainer(): HTMLElement | null;
  getMessages(): CapturedMessage[];
  getContactInfo(): { id: string; name: string } | null;
  scrollToLoadHistory(): Promise<boolean>;
  observeNewMessages(callback: (messages: CapturedMessage[]) => void): MutationObserver | null;
  getInputElement(): HTMLElement | null;
  insertText(element: HTMLElement, text: string): void;
}

/** Settings stored by the extension */
export interface RizzAISettings {
  enabled: boolean;
  apiKey: string;
  apiEndpoint: string;
  model: string;
  maxHistoryMessages: number;
  autoCapture: boolean;
  privacyMode: boolean;
  enabledPlatforms: Platform[];
  replyCount: number;
  defaultTone: ReplyTone;
  showReasonings: boolean;
}

/** Messages between content script and background */
export type ExtensionMessage =
  | { type: 'CAPTURE_HISTORY'; payload: { platform: Platform } }
  | { type: 'HISTORY_CAPTURED'; payload: { contactId: string; messageCount: number } }
  | { type: 'NEW_MESSAGE'; payload: { message: CapturedMessage } }
  | { type: 'GENERATE_REPLIES'; payload: { contactId: string; recentMessages: CapturedMessage[] } }
  | { type: 'REPLIES_GENERATED'; payload: { suggestions: ReplySuggestion[] } }
  | { type: 'GET_CONTACT_PROFILE'; payload: { contactId: string } }
  | { type: 'CONTACT_PROFILE'; payload: { profile: ContactProfile | null } }
  | { type: 'GET_ANALYSIS'; payload: { contactId: string } }
  | { type: 'ANALYSIS_RESULT'; payload: { analysis: ConversationAnalysis } }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<RizzAISettings> }
  | { type: 'GET_SETTINGS' }
  | { type: 'SETTINGS'; payload: { settings: RizzAISettings } }
  | { type: 'STATUS_UPDATE'; payload: { status: string; progress?: number } };

/** Dataset entry for training/retrieval */
export interface DatasetEntry {
  contextMessages: string[];
  reply: string;
  tone: ReplyTone;
  engagementScore: number;
}
