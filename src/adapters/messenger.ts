import type { Platform } from '../../types';
import { BaseAdapter } from './base';
import { hashString } from '../utils/helpers';

export class MessengerAdapter extends BaseAdapter {
  platform: Platform = 'messenger';

  protected conversationContainerSelector = 'div[role="main"] div[class*="__fb-light-mode"]';
  protected messageSelector = 'div[role="row"]';
  protected senderSelector = 'span[class*="x1lliihq"]';
  protected messageTextSelector = 'div[dir="auto"]';
  protected timestampSelector = 'span[data-testid="timestamp"]';
  protected inputSelector = 'div[role="textbox"][contenteditable="true"]';
  protected ownMessageClass = '';

  getContactInfo(): { id: string; name: string } | null {
    const header = document.querySelector(
      'div[role="main"] h1, div[role="main"] a[role="link"] span'
    );
    if (header?.textContent) {
      const name = header.textContent.trim();
      return { id: hashString(`messenger:${name}`), name };
    }
    return null;
  }

  protected detectSender(el: Element): 'user' | 'other' {
    // Messenger positions own messages on the right with a colored background
    const parent = el.closest('div[class*="x78zum5"]');
    if (parent) {
      const style = window.getComputedStyle(parent);
      if (style.justifyContent === 'flex-end') return 'user';
    }
    const bubble = el.querySelector('div[style*="background-color"]');
    if (bubble) {
      const bg = window.getComputedStyle(bubble).backgroundColor;
      // Meta's default blue
      if (bg.includes('0, 132, 255')) return 'user';
    }
    return 'other';
  }
}
