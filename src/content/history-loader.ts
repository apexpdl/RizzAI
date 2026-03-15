import type { CapturedMessage, PlatformAdapter } from '../../types';
import { saveMessages, deduplicateMessages } from '../storage/database';
import { HISTORY_BATCH_SIZE } from '../utils/constants';

export interface HistoryLoadProgress {
  status: 'idle' | 'scrolling' | 'capturing' | 'deduplicating' | 'complete' | 'error';
  messagesLoaded: number;
  scrollAttempts: number;
  error?: string;
}

type ProgressCallback = (progress: HistoryLoadProgress) => void;

/**
 * Loads the full conversation history by repeatedly scrolling up
 * and capturing messages as the platform loads older content.
 */
export class HistoryLoader {
  private adapter: PlatformAdapter;
  private onProgress: ProgressCallback;
  private aborted = false;

  constructor(adapter: PlatformAdapter, onProgress: ProgressCallback) {
    this.adapter = adapter;
    this.onProgress = onProgress;
  }

  abort(): void {
    this.aborted = true;
  }

  async loadFullHistory(): Promise<CapturedMessage[]> {
    const allMessages: CapturedMessage[] = [];
    let scrollAttempts = 0;

    try {
      this.onProgress({ status: 'scrolling', messagesLoaded: 0, scrollAttempts: 0 });

      // Phase 1: Scroll through history to force platform to load all messages
      const container = this.adapter.getConversationContainer();
      if (!container) {
        this.onProgress({ status: 'error', messagesLoaded: 0, scrollAttempts: 0, error: 'No conversation container found' });
        return [];
      }

      let previousHeight = container.scrollHeight;
      let noChangeCount = 0;

      while (!this.aborted && noChangeCount < 3) {
        container.scrollTop = 0;
        await this.wait(600);

        const newHeight = container.scrollHeight;
        if (newHeight === previousHeight) {
          noChangeCount++;
        } else {
          noChangeCount = 0;
        }
        previousHeight = newHeight;
        scrollAttempts++;

        // Capture current batch
        const currentMessages = this.adapter.getMessages();
        this.onProgress({
          status: 'scrolling',
          messagesLoaded: currentMessages.length,
          scrollAttempts,
        });

        if (scrollAttempts > 200) break;
      }

      if (this.aborted) return [];

      // Phase 2: Capture all messages now visible
      this.onProgress({ status: 'capturing', messagesLoaded: 0, scrollAttempts });

      // Scroll to bottom first to ensure all messages are rendered
      container.scrollTop = container.scrollHeight;
      await this.wait(500);

      const messages = this.adapter.getMessages();
      allMessages.push(...messages);

      this.onProgress({ status: 'capturing', messagesLoaded: allMessages.length, scrollAttempts });

      // Phase 3: Save in batches
      for (let i = 0; i < allMessages.length; i += HISTORY_BATCH_SIZE) {
        const batch = allMessages.slice(i, i + HISTORY_BATCH_SIZE);
        await saveMessages(batch);
      }

      // Phase 4: Deduplicate
      this.onProgress({ status: 'deduplicating', messagesLoaded: allMessages.length, scrollAttempts });

      const contactInfo = this.adapter.getContactInfo();
      if (contactInfo) {
        await deduplicateMessages(contactInfo.id);
      }

      this.onProgress({ status: 'complete', messagesLoaded: allMessages.length, scrollAttempts });
      return allMessages;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.onProgress({ status: 'error', messagesLoaded: allMessages.length, scrollAttempts, error: msg });
      return allMessages;
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
