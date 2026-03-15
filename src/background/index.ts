import type { CapturedMessage, ExtensionMessage, RizzAISettings } from '../../types';
import { ReplyGenerator } from '../generation/reply-generator';
import { ProfileBuilder } from '../analysis/profile-builder';
import { ConversationAnalyzer } from '../analysis/conversation-analyzer';
import {
  getSettings,
  saveSettings,
  getContact,
  getRecentMessages,
  getAnalysis,
  saveAnalysis,
  saveContact,
  getMessagesByContact,
} from '../storage/database';

/**
 * Background service worker.
 * Coordinates between content scripts and the popup UI.
 * Handles reply generation via the LLM API.
 */

const replyGenerator = new ReplyGenerator();
const profileBuilder = new ProfileBuilder();
const analyzer = new ConversationAnalyzer();

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    handleMessage(message, sender, sendResponse);
    return true; // keep the message channel open for async responses
  }
);

async function handleMessage(
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): Promise<void> {
  try {
    switch (message.type) {
      case 'GENERATE_REPLIES': {
        const { contactId, recentMessages } = message.payload;
        await handleGenerateReplies(contactId, recentMessages, sender.tab?.id);
        sendResponse({ success: true });
        break;
      }

      case 'GET_CONTACT_PROFILE': {
        const profile = await getContact(message.payload.contactId);
        sendResponse({ profile });
        break;
      }

      case 'GET_ANALYSIS': {
        const analysis = await getAnalysis(message.payload.contactId);
        sendResponse({ analysis });
        break;
      }

      case 'GET_SETTINGS': {
        const settings = await getSettings();
        sendResponse({ settings });
        break;
      }

      case 'UPDATE_SETTINGS': {
        await saveSettings(message.payload);
        sendResponse({ success: true });
        break;
      }

      case 'NEW_MESSAGE': {
        await handleNewMessage(message.payload.message);
        sendResponse({ success: true });
        break;
      }

      case 'HISTORY_CAPTURED': {
        console.log(
          `RizzAI: History captured for ${message.payload.contactId}: ${message.payload.messageCount} messages`
        );
        sendResponse({ success: true });
        break;
      }

      case 'STATUS_UPDATE': {
        // Forward to popup if open
        chrome.runtime.sendMessage(message).catch(() => {});
        sendResponse({ success: true });
        break;
      }

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  } catch (error) {
    console.error('RizzAI background error:', error);
    sendResponse({ error: String(error) });
  }
}

async function handleGenerateReplies(
  contactId: string,
  recentMessages: CapturedMessage[],
  tabId?: number
): Promise<void> {
  const settings = await getSettings();

  if (!settings.apiKey) {
    // Send error back to content script
    if (tabId) {
      chrome.tabs.sendMessage(tabId, {
        type: 'REPLIES_GENERATED',
        payload: {
          suggestions: [
            {
              id: 'error',
              text: 'Please set your API key in the RizzAI popup settings.',
              tone: 'safe',
              confidence: 0,
            },
          ],
        },
      });
    }
    return;
  }

  // Get or build profile
  let profile = await getContact(contactId);
  if (!profile) {
    const messages = recentMessages.length > 0 ? recentMessages : await getRecentMessages(contactId, 50);
    profile = profileBuilder.buildProfile(
      contactId,
      'Unknown',
      messages[0]?.platform || 'instagram',
      messages
    );
    await saveContact(profile);
  }

  // Get or run analysis
  let analysis = await getAnalysis(contactId);
  if (!analysis) {
    const allMessages = await getMessagesByContact(contactId);
    analysis = analyzer.analyze(contactId, allMessages.length > 0 ? allMessages : recentMessages);
    await saveAnalysis(analysis);
  }

  // Generate replies
  const suggestions = await replyGenerator.generateReplies(
    settings,
    profile,
    analysis,
    recentMessages
  );

  // Send to content script
  if (tabId) {
    chrome.tabs.sendMessage(tabId, {
      type: 'REPLIES_GENERATED',
      payload: { suggestions },
    });
  }

  // Also broadcast for popup
  chrome.runtime.sendMessage({
    type: 'REPLIES_GENERATED',
    payload: { suggestions },
  }).catch(() => {});
}

async function handleNewMessage(message: CapturedMessage): Promise<void> {
  // Update profile incrementally
  const existingProfile = await getContact(message.contactId);
  if (existingProfile) {
    const allMessages = await getMessagesByContact(message.contactId);
    const updatedProfile = profileBuilder.updateProfile(
      existingProfile,
      [message],
      allMessages
    );
    await saveContact(updatedProfile);

    // Update analysis
    const analysis = analyzer.analyze(message.contactId, allMessages);
    await saveAnalysis(analysis);
  }
}

// Set up extension install handler
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('RizzAI installed!');
    // Initialize default settings
    await saveSettings({});
  }
});
