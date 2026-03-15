import type { Platform } from '../types';
import { BaseAdapter } from './base';
import { hashString } from '../utils/helpers';

export class DiscordAdapter extends BaseAdapter {
  platform: Platform = 'discord';

  protected conversationContainerSelector = 'ol[data-list-id="chat-messages"], div[class*="chatContent"]';
  protected messageSelector = 'li[id^="chat-messages-"], div[class*="message-"]';
  protected senderSelector = 'span[class*="username"]';
  protected messageTextSelector = 'div[id^="message-content-"], div[class*="messageContent"]';
  protected timestampSelector = 'time';
  protected inputSelector = 'div[role="textbox"][data-slate-editor="true"], div[class*="textArea"] div[role="textbox"]';
  protected ownMessageClass = '';

  private currentUsername: string | null = null;

  getContactInfo(): { id: string; name: string } | null {
    // For Discord DMs, the channel header contains the other user's name
    const header = document.querySelector(
      'h1[class*="privateChannel"], div[class*="channelName"]'
    );
    if (header?.textContent) {
      const name = header.textContent.trim();
      return { id: hashString(`discord:${name}`), name };
    }
    return null;
  }

  protected detectSender(el: Element): 'user' | 'other' {
    if (!this.currentUsername) {
      // Try to get the current user's name from the bottom bar
      const userTag = document.querySelector(
        'section[class*="panels"] div[class*="nameTag"], div[class*="panelTitle"]'
      );
      this.currentUsername = userTag?.textContent?.trim() || null;
    }

    const senderEl = el.querySelector(this.senderSelector);
    const sender = senderEl?.textContent?.trim();
    if (sender && this.currentUsername && sender === this.currentUsername) {
      return 'user';
    }
    return 'other';
  }
}
