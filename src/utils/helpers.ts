import { v4 as uuidv4 } from 'uuid';
import type { Platform, MessageMetadata } from '../../types';
import { PLATFORM_URLS } from './constants';

/** Generate a unique ID */
export function generateId(): string {
  return uuidv4();
}

/** Detect which platform the current page belongs to */
export function detectPlatform(): Platform | null {
  const url = window.location.hostname + window.location.pathname;
  for (const [platform, patterns] of Object.entries(PLATFORM_URLS)) {
    if (patterns.some((p) => url.includes(p))) {
      return platform as Platform;
    }
  }
  return null;
}

/** Extract metadata from message text */
export function extractMetadata(text: string): MessageMetadata {
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  const emojis = text.match(emojiRegex) || [];
  const isQuestion = /\?/.test(text);

  return {
    emojiCount: emojis.length,
    isQuestion,
    messageLength: text.length,
    hasMedia: false,
  };
}

/** Debounce a function */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/** Sleep for ms */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Hash a string for contact IDs */
export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/** Sanitize text for privacy (strip PII patterns) */
export function sanitizeForPrivacy(text: string): string {
  return text
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]');
}

/** Truncate text to max length */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
