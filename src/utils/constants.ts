import type { RizzAISettings } from '../types';

export const DEFAULT_SETTINGS: RizzAISettings = {
  enabled: true,
  apiKey: '',
  apiEndpoint: 'https://api.anthropic.com/v1/messages',
  model: 'claude-sonnet-4-6',
  maxHistoryMessages: 10000,
  autoCapture: true,
  privacyMode: false,
  enabledPlatforms: [
    'instagram',
    'twitter',
    'whatsapp',
    'telegram',
    'messenger',
    'discord',
    'tinder',
  ],
  replyCount: 5,
  defaultTone: 'playful',
  showReasonings: false,
};

export const SCROLL_DELAY_MS = 500;
export const MAX_SCROLL_ATTEMPTS = 200;
export const DOM_OBSERVER_DEBOUNCE_MS = 300;
export const HISTORY_BATCH_SIZE = 50;

export const PLATFORM_URLS: Record<string, string[]> = {
  instagram: ['instagram.com'],
  twitter: ['twitter.com', 'x.com'],
  whatsapp: ['web.whatsapp.com'],
  telegram: ['web.telegram.org'],
  messenger: ['messenger.com', 'facebook.com/messages'],
  discord: ['discord.com'],
  tinder: ['tinder.com'],
};
