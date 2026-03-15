import type { Platform, PlatformAdapter } from '../types';
import { InstagramAdapter } from './instagram';
import { TwitterAdapter } from './twitter';
import { WhatsAppAdapter } from './whatsapp';
import { TelegramAdapter } from './telegram';
import { MessengerAdapter } from './messenger';
import { DiscordAdapter } from './discord';
import { TinderAdapter } from './tinder';
import { detectPlatform } from '../utils/helpers';

const adapterMap: Record<Platform, () => PlatformAdapter> = {
  instagram: () => new InstagramAdapter(),
  twitter: () => new TwitterAdapter(),
  whatsapp: () => new WhatsAppAdapter(),
  telegram: () => new TelegramAdapter(),
  messenger: () => new MessengerAdapter(),
  discord: () => new DiscordAdapter(),
  tinder: () => new TinderAdapter(),
};

/**
 * Get the adapter for the current page, or null if unsupported.
 */
export function getActiveAdapter(): PlatformAdapter | null {
  const platform = detectPlatform();
  if (!platform) return null;

  const adapter = adapterMap[platform]();
  return adapter.isActive() ? adapter : null;
}

/**
 * Get adapter for a specific platform.
 */
export function getAdapter(platform: Platform): PlatformAdapter {
  return adapterMap[platform]();
}
