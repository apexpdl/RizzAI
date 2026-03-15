import type { Platform } from '../../types';
import { BaseAdapter } from './base';
import { hashString } from '../utils/helpers';

export class InstagramAdapter extends BaseAdapter {
  platform: Platform = 'instagram';

  protected conversationContainerSelector = 'div[role="main"] div[class*="x78zum5"]';
  protected messageSelector = 'div[role="row"]';
  protected senderSelector = 'span[dir="auto"]';
  protected messageTextSelector = 'div[dir="auto"] span';
  protected timestampSelector = 'time';
  protected inputSelector = 'div[role="textbox"][contenteditable="true"]';
  protected ownMessageClass = 'xat24cr';

  getContactInfo(): { id: string; name: string } | null {
    // Instagram DM header usually contains the contact name
    const header = document.querySelector(
      'div[role="main"] header span, div[role="main"] a[role="link"] span'
    );
    if (header?.textContent) {
      const name = header.textContent.trim();
      return { id: hashString(`instagram:${name}`), name };
    }
    return null;
  }

  protected detectSender(el: Element): 'user' | 'other' {
    // Instagram positions own messages on the right
    const container = el.closest('div[class*="x78zum5"]');
    if (container) {
      const style = window.getComputedStyle(container);
      if (style.justifyContent === 'flex-end' || style.alignItems === 'flex-end') {
        return 'user';
      }
    }
    // Fallback: own messages typically have a blue/purple background
    const bubble = el.querySelector('div[style*="background"]');
    if (bubble) {
      const bg = window.getComputedStyle(bubble).backgroundColor;
      if (bg.includes('0, 149, 246') || bg.includes('88, 81, 219')) {
        return 'user';
      }
    }
    return 'other';
  }
}
