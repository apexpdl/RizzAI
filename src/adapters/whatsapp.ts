import type { Platform } from '../../types';
import { BaseAdapter } from './base';
import { hashString } from '../utils/helpers';

export class WhatsAppAdapter extends BaseAdapter {
  platform: Platform = 'whatsapp';

  protected conversationContainerSelector = '#main div[role="application"], #main div.copyable-area';
  protected messageSelector = 'div.message-in, div.message-out';
  protected senderSelector = 'span[data-testid="author"]';
  protected messageTextSelector = 'span.selectable-text';
  protected timestampSelector = 'span[data-testid="msg-time"], div[data-pre-plain-text]';
  protected inputSelector = 'div[contenteditable="true"][data-tab="10"], footer div[contenteditable="true"]';
  protected ownMessageClass = 'message-out';

  getContactInfo(): { id: string; name: string } | null {
    const header = document.querySelector(
      '#main header span[title], #main header span[dir="auto"]'
    );
    if (header?.textContent) {
      const name = header.textContent.trim();
      return { id: hashString(`whatsapp:${name}`), name };
    }
    return null;
  }

  protected detectSender(el: Element): 'user' | 'other' {
    if (el.classList.contains('message-out')) return 'user';
    if (el.classList.contains('message-in')) return 'other';
    return 'other';
  }

  protected extractTimestamp(el: Element): number {
    const preText = el.querySelector('div[data-pre-plain-text]');
    if (preText) {
      const attr = preText.getAttribute('data-pre-plain-text');
      if (attr) {
        // Format: [HH:MM, DD/MM/YYYY] Name:
        const match = attr.match(/\[(\d+:\d+),\s*(\d+\/\d+\/\d+)\]/);
        if (match) {
          const [, time, date] = match;
          const [day, month, year] = date.split('/');
          const parsed = Date.parse(`${year}-${month}-${day}T${time}:00`);
          if (!isNaN(parsed)) return parsed;
        }
      }
    }
    return super.extractTimestamp(el);
  }
}
