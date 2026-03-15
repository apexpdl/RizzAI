import type { Platform } from '../../types';
import { BaseAdapter } from './base';
import { hashString } from '../utils/helpers';

export class TinderAdapter extends BaseAdapter {
  platform: Platform = 'tinder';

  protected conversationContainerSelector = 'div[class*="messageList"], div[class*="chat"]';
  protected messageSelector = 'div[class*="msgRow"], div[class*="message"]';
  protected senderSelector = '';
  protected messageTextSelector = 'span[class*="text"], div[class*="messageText"]';
  protected timestampSelector = 'span[class*="timestamp"]';
  protected inputSelector = 'textarea[class*="chatInput"], div[contenteditable="true"]';
  protected ownMessageClass = 'sent';

  getContactInfo(): { id: string; name: string } | null {
    const header = document.querySelector(
      'a[class*="matchName"], span[class*="matchName"], h1'
    );
    if (header?.textContent) {
      const name = header.textContent.trim();
      return { id: hashString(`tinder:${name}`), name };
    }
    return null;
  }

  protected detectSender(el: Element): 'user' | 'other' {
    // Tinder uses different classes for sent vs received
    const classList = el.className.toLowerCase();
    if (classList.includes('sent') || classList.includes('self') || classList.includes('own')) {
      return 'user';
    }
    if (classList.includes('received') || classList.includes('other')) {
      return 'other';
    }
    // Fallback: own messages align right
    const style = window.getComputedStyle(el);
    if (style.alignSelf === 'flex-end' || style.textAlign === 'right') {
      return 'user';
    }
    return 'other';
  }
}
