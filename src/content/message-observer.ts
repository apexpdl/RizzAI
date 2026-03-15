import type { CapturedMessage, PlatformAdapter } from '../../types';
import { saveMessages } from '../storage/database';
import { debounce } from '../utils/helpers';
import { DOM_OBSERVER_DEBOUNCE_MS } from '../utils/constants';

/**
 * Watches the DOM for new incoming messages using MutationObserver.
 * On each new message, saves it to the database and notifies listeners.
 */
export class MessageObserver {
  private adapter: PlatformAdapter;
  private observer: MutationObserver | null = null;
  private listeners: Array<(messages: CapturedMessage[]) => void> = [];

  constructor(adapter: PlatformAdapter) {
    this.adapter = adapter;
  }

  start(): void {
    if (this.observer) return;

    const debouncedHandler = debounce(
      (messages: CapturedMessage[]) => this.handleNewMessages(messages),
      DOM_OBSERVER_DEBOUNCE_MS
    );

    this.observer = this.adapter.observeNewMessages((messages) => {
      debouncedHandler(messages as unknown as CapturedMessage[]);
    });
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  onNewMessage(listener: (messages: CapturedMessage[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private async handleNewMessages(messages: CapturedMessage[]): Promise<void> {
    if (messages.length === 0) return;

    // Persist new messages
    await saveMessages(messages);

    // Notify listeners
    for (const listener of this.listeners) {
      listener(messages);
    }

    // Notify background script
    try {
      for (const msg of messages) {
        chrome.runtime.sendMessage({
          type: 'NEW_MESSAGE',
          payload: { message: msg },
        });
      }
    } catch {
      // Extension context may be invalid
    }
  }
}
