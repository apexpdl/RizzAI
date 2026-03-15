import type { Platform } from '../types';
import { BaseAdapter } from './base';
import { hashString } from '../utils/helpers';

export class TelegramAdapter extends BaseAdapter {
  platform: Platform = 'telegram';

  protected conversationContainerSelector = '.bubbles-inner, .messages-container';
  protected messageSelector = '.message, .bubble';
  protected senderSelector = '.peer-title, .name';
  protected messageTextSelector = '.message-text, .text-content';
  protected timestampSelector = '.time, .message-time';
  protected inputSelector = '.input-message-input, div[contenteditable="true"]';
  protected ownMessageClass = 'is-out';

  getContactInfo(): { id: string; name: string } | null {
    const header = document.querySelector(
      '.chat-info .peer-title, .top-bar .user-title'
    );
    if (header?.textContent) {
      const name = header.textContent.trim();
      return { id: hashString(`telegram:${name}`), name };
    }
    return null;
  }

  protected detectSender(el: Element): 'user' | 'other' {
    if (el.classList.contains('is-out')) return 'user';
    if (el.classList.contains('is-in')) return 'other';
    return 'other';
  }
}
