import type { Platform } from '../types';
import { BaseAdapter } from './base';
import { hashString } from '../utils/helpers';

export class TwitterAdapter extends BaseAdapter {
  platform: Platform = 'twitter';

  protected conversationContainerSelector = 'div[data-testid="DmScrollerContainer"], section[role="region"]';
  protected messageSelector = 'div[data-testid="messageEntry"]';
  protected senderSelector = 'div[data-testid="User-Name"] span';
  protected messageTextSelector = 'div[data-testid="tweetText"], div[dir="auto"]';
  protected timestampSelector = 'time';
  protected inputSelector = 'div[data-testid="dmComposerTextInput"], div[role="textbox"]';
  protected ownMessageClass = '';

  getContactInfo(): { id: string; name: string } | null {
    const header = document.querySelector(
      'div[data-testid="DmScrollerContainer"] h2 span, div[data-testid="conversation"] span'
    );
    if (header?.textContent) {
      const name = header.textContent.trim();
      return { id: hashString(`twitter:${name}`), name };
    }
    return null;
  }

  protected detectSender(el: Element): 'user' | 'other' {
    // Twitter/X own messages are typically right-aligned with blue background
    const style = window.getComputedStyle(el);
    if (style.alignSelf === 'flex-end' || style.marginLeft === 'auto') {
      return 'user';
    }
    const bubble = el.querySelector('div[dir="auto"]')?.parentElement;
    if (bubble) {
      const bg = window.getComputedStyle(bubble).backgroundColor;
      if (bg.includes('29, 155, 240')) return 'user';
    }
    return 'other';
  }
}
