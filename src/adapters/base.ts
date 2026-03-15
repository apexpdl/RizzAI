import type { CapturedMessage, Platform, PlatformAdapter } from '../../types';
import { generateId, extractMetadata, sleep } from '../utils/helpers';
import { SCROLL_DELAY_MS, MAX_SCROLL_ATTEMPTS } from '../utils/constants';

/**
 * Base adapter with shared logic for all platform adapters.
 * Subclasses override selectors and platform-specific behaviors.
 */
export abstract class BaseAdapter implements PlatformAdapter {
  abstract platform: Platform;

  // Selectors to be overridden by platform adapters
  protected abstract conversationContainerSelector: string;
  protected abstract messageSelector: string;
  protected abstract senderSelector: string;
  protected abstract messageTextSelector: string;
  protected abstract timestampSelector: string;
  protected abstract inputSelector: string;
  protected abstract ownMessageClass: string;

  isActive(): boolean {
    return this.getConversationContainer() !== null;
  }

  getConversationContainer(): HTMLElement | null {
    return document.querySelector(this.conversationContainerSelector);
  }

  getContactInfo(): { id: string; name: string } | null {
    // Override per platform for better detection
    return null;
  }

  getMessages(): CapturedMessage[] {
    const container = this.getConversationContainer();
    if (!container) return [];

    const messageEls = container.querySelectorAll(this.messageSelector);
    const messages: CapturedMessage[] = [];
    const contactInfo = this.getContactInfo();
    const contactId = contactInfo?.id || 'unknown';

    messageEls.forEach((el) => {
      const text = this.extractMessageText(el);
      if (!text) return;

      const sender = this.detectSender(el);
      const timestamp = this.extractTimestamp(el);

      messages.push({
        id: generateId(),
        contactId,
        sender,
        text,
        timestamp,
        platform: this.platform,
        metadata: extractMetadata(text),
      });
    });

    return messages;
  }

  protected extractMessageText(el: Element): string {
    const textEl = el.querySelector(this.messageTextSelector);
    return textEl?.textContent?.trim() || '';
  }

  protected detectSender(el: Element): 'user' | 'other' {
    if (this.ownMessageClass && el.closest(`.${this.ownMessageClass}`)) {
      return 'user';
    }
    const senderEl = el.querySelector(this.senderSelector);
    // Heuristic: if no explicit sender marker, try class-based detection
    if (!senderEl) {
      return el.classList.contains(this.ownMessageClass) ? 'user' : 'other';
    }
    return 'other';
  }

  protected extractTimestamp(el: Element): number {
    const timeEl = el.querySelector(this.timestampSelector);
    if (timeEl) {
      const datetime = timeEl.getAttribute('datetime') || timeEl.getAttribute('title') || timeEl.textContent;
      if (datetime) {
        const parsed = Date.parse(datetime);
        if (!isNaN(parsed)) return parsed;
      }
    }
    return Date.now();
  }

  async scrollToLoadHistory(): Promise<boolean> {
    const container = this.getConversationContainer();
    if (!container) return false;

    let previousHeight = container.scrollHeight;
    let attempts = 0;

    while (attempts < MAX_SCROLL_ATTEMPTS) {
      container.scrollTop = 0;
      await sleep(SCROLL_DELAY_MS);

      const newHeight = container.scrollHeight;
      if (newHeight === previousHeight) {
        // No new content loaded — we've likely reached the top
        return true;
      }
      previousHeight = newHeight;
      attempts++;
    }

    return true; // Max attempts reached
  }

  observeNewMessages(
    callback: (messages: CapturedMessage[]) => void
  ): MutationObserver | null {
    const container = this.getConversationContainer();
    if (!container) return null;

    const observer = new MutationObserver((mutations) => {
      const newMessages: CapturedMessage[] = [];

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            const msgEl = node.matches(this.messageSelector)
              ? node
              : node.querySelector(this.messageSelector);
            if (msgEl) {
              const text = this.extractMessageText(msgEl);
              if (text) {
                const contactInfo = this.getContactInfo();
                newMessages.push({
                  id: generateId(),
                  contactId: contactInfo?.id || 'unknown',
                  sender: this.detectSender(msgEl),
                  text,
                  timestamp: Date.now(),
                  platform: this.platform,
                  metadata: extractMetadata(text),
                });
              }
            }
          }
        }
      }

      if (newMessages.length > 0) {
        callback(newMessages);
      }
    });

    observer.observe(container, { childList: true, subtree: true });
    return observer;
  }

  getInputElement(): HTMLElement | null {
    return document.querySelector(this.inputSelector);
  }

  insertText(element: HTMLElement, text: string): void {
    // Use execCommand for contenteditable, or set value for input/textarea
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.value = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (element.getAttribute('contenteditable')) {
      element.focus();
      document.execCommand('selectAll', false);
      document.execCommand('insertText', false, text);
    }
  }
}
