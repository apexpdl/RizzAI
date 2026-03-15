import type { CapturedMessage, PlatformAdapter, ReplySuggestion } from '../types';
import { getActiveAdapter } from '../adapters';
import { HistoryLoader } from './history-loader';
import { MessageObserver } from './message-observer';
import { ProfileBuilder } from '../analysis/profile-builder';
import { ConversationAnalyzer } from '../analysis/conversation-analyzer';
import {
  saveMessages,
  getMessagesByContact,
  getRecentMessages,
  saveContact,
  saveAnalysis,
  getSettings,
} from '../storage/database';
import { FloatingPanel } from './floating-panel';

/**
 * Content script entry point.
 * Detects the active platform, sets up message capture,
 * and injects the floating UI panel.
 */
class RizzAIContentScript {
  private adapter: PlatformAdapter | null = null;
  private historyLoader: HistoryLoader | null = null;
  private messageObserver: MessageObserver | null = null;
  private floatingPanel: FloatingPanel | null = null;
  private profileBuilder = new ProfileBuilder();
  private analyzer = new ConversationAnalyzer();
  private isActive = false;

  async init(): Promise<void> {
    // Wait for the page to be fully loaded
    if (document.readyState !== 'complete') {
      await new Promise<void>((resolve) => {
        window.addEventListener('load', () => resolve(), { once: true });
      });
    }

    // Retry adapter detection since SPAs may not have the DOM ready immediately
    let attempts = 0;
    while (!this.adapter && attempts < 10) {
      this.adapter = getActiveAdapter();
      if (!this.adapter) {
        await new Promise((r) => setTimeout(r, 2000));
        attempts++;
      }
    }

    if (!this.adapter) {
      console.log('RizzAI: No supported platform detected');
      return;
    }

    console.log(`RizzAI: Detected platform — ${this.adapter.platform}`);

    // Check settings
    const settings = await getSettings();
    if (!settings.enabled) return;
    if (!settings.enabledPlatforms.includes(this.adapter.platform)) return;

    this.isActive = true;

    // Inject floating panel
    this.floatingPanel = new FloatingPanel(this.adapter);
    this.floatingPanel.mount();

    // Set up message listener
    this.setupMessageListener();

    // Listen for messages from background/popup
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      this.handleExtensionMessage(message, sendResponse);
      return true; // keep channel open for async response
    });

    // Auto-start observation
    this.startObserving();

    // Watch for navigation changes (SPA)
    this.watchForNavigation();
  }

  private setupMessageListener(): void {
    if (!this.adapter) return;

    this.messageObserver = new MessageObserver(this.adapter);
    this.messageObserver.onNewMessage(async (messages) => {
      console.log(`RizzAI: ${messages.length} new message(s) detected`);

      const contactInfo = this.adapter?.getContactInfo();
      if (!contactInfo) return;

      // Update profile and analysis
      const allMessages = await getMessagesByContact(contactInfo.id);
      const profile = this.profileBuilder.buildProfile(
        contactInfo.id,
        contactInfo.name,
        this.adapter!.platform,
        allMessages
      );
      await saveContact(profile);

      const analysis = this.analyzer.analyze(contactInfo.id, allMessages);
      await saveAnalysis(analysis);

      // Auto-generate replies for incoming messages
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender === 'other') {
        this.requestReplies(contactInfo.id);
      }

      // Update floating panel
      this.floatingPanel?.updateAnalysis(analysis);
    });
  }

  private startObserving(): void {
    this.messageObserver?.start();
    console.log('RizzAI: Observing new messages');
  }

  private async handleExtensionMessage(
    message: { type: string; payload?: Record<string, unknown> },
    sendResponse: (response: unknown) => void
  ): Promise<void> {
    switch (message.type) {
      case 'CAPTURE_HISTORY':
        await this.captureHistory();
        sendResponse({ success: true });
        break;

      case 'GENERATE_REPLIES': {
        const contactId = message.payload?.contactId as string;
        if (contactId) {
          this.requestReplies(contactId);
        }
        sendResponse({ success: true });
        break;
      }

      case 'GET_STATUS':
        sendResponse({
          isActive: this.isActive,
          platform: this.adapter?.platform,
          contactInfo: this.adapter?.getContactInfo(),
        });
        break;

      case 'INSERT_REPLY': {
        const text = message.payload?.text as string;
        if (text && this.adapter) {
          const input = this.adapter.getInputElement();
          if (input) {
            this.adapter.insertText(input, text);
          }
        }
        sendResponse({ success: true });
        break;
      }

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  }

  private async captureHistory(): Promise<void> {
    if (!this.adapter) return;

    const contactInfo = this.adapter.getContactInfo();
    if (!contactInfo) return;

    this.floatingPanel?.setLoading(true, 'Loading conversation history...');

    this.historyLoader = new HistoryLoader(this.adapter, (progress) => {
      this.floatingPanel?.setLoading(true, `${progress.status}: ${progress.messagesLoaded} messages`);
      chrome.runtime.sendMessage({
        type: 'STATUS_UPDATE',
        payload: { status: progress.status, progress: progress.messagesLoaded },
      }).catch(() => {});
    });

    const messages = await this.historyLoader.loadFullHistory();

    // Build profile
    const profile = this.profileBuilder.buildProfile(
      contactInfo.id,
      contactInfo.name,
      this.adapter.platform,
      messages
    );
    await saveContact(profile);

    // Run analysis
    const analysis = this.analyzer.analyze(contactInfo.id, messages);
    await saveAnalysis(analysis);

    this.floatingPanel?.setLoading(false);
    this.floatingPanel?.updateAnalysis(analysis);

    chrome.runtime.sendMessage({
      type: 'HISTORY_CAPTURED',
      payload: { contactId: contactInfo.id, messageCount: messages.length },
    }).catch(() => {});
  }

  private async requestReplies(contactId: string): Promise<void> {
    const recentMessages = await getRecentMessages(contactId, 30);
    chrome.runtime.sendMessage({
      type: 'GENERATE_REPLIES',
      payload: { contactId, recentMessages },
    }).catch(() => {});
  }

  private watchForNavigation(): void {
    // Watch for URL changes in SPAs
    let lastUrl = location.href;
    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        // Re-detect adapter on navigation
        setTimeout(() => {
          this.adapter = getActiveAdapter();
          if (this.adapter?.isActive()) {
            this.messageObserver?.stop();
            this.setupMessageListener();
            this.startObserving();
          }
        }, 1000);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}

// Initialize
const rizzAI = new RizzAIContentScript();
rizzAI.init().catch(console.error);
