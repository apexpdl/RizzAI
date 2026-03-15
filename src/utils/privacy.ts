import type { CapturedMessage, RizzAISettings } from '../../types';
import { sanitizeForPrivacy } from './helpers';

/**
 * Privacy utilities for anonymizing data before API calls.
 */

/**
 * Anonymize messages before sending to the LLM API.
 * Strips PII patterns (phone numbers, emails, SSNs).
 */
export function anonymizeMessages(
  messages: CapturedMessage[],
  settings: RizzAISettings
): CapturedMessage[] {
  if (!settings.privacyMode) return messages;

  return messages.map((msg) => ({
    ...msg,
    text: sanitizeForPrivacy(msg.text),
  }));
}

/**
 * Anonymize contact names in prompts.
 */
export function anonymizeContactName(name: string, privacyMode: boolean): string {
  if (!privacyMode) return name;
  // Use first letter + asterisks
  if (name.length <= 1) return '*';
  return name[0] + '*'.repeat(name.length - 1);
}

/**
 * Check if text contains potentially sensitive data.
 */
export function containsSensitiveData(text: string): boolean {
  const patterns = [
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // phone
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // email
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/, // credit card
    /\b\d{1,5}\s\w+\s(st|street|ave|avenue|rd|road|dr|drive|ln|lane|ct|court|blvd)\b/i, // address
  ];

  return patterns.some((p) => p.test(text));
}
