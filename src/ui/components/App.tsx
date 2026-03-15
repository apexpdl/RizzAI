import React, { useState, useEffect, useCallback } from 'react';
import type { ContactProfile, ConversationAnalysis, ReplySuggestion, RizzAISettings } from '../../../types';
import { DEFAULT_SETTINGS } from '../../utils/constants';
import { Header } from './Header';
import { SuggestionsPanel } from './SuggestionsPanel';
import { InsightsPanel } from './InsightsPanel';
import { SettingsPanel } from './SettingsPanel';
import { ContactList } from './ContactList';
import '../styles/popup.css';

type View = 'main' | 'settings' | 'contacts';

export function App() {
  const [view, setView] = useState<View>('main');
  const [settings, setSettings] = useState<RizzAISettings>(DEFAULT_SETTINGS);
  const [suggestions, setSuggestions] = useState<ReplySuggestion[]>([]);
  const [analysis, setAnalysis] = useState<ConversationAnalysis | null>(null);
  const [currentContact, setCurrentContact] = useState<ContactProfile | null>(null);
  const [status, setStatus] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);

  // Load settings on mount
  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response: { settings?: RizzAISettings }) => {
      if (response?.settings) setSettings(response.settings);
    });

    // Check if content script is active
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_STATUS' }, (response) => {
          if (chrome.runtime.lastError) {
            setIsConnected(false);
            return;
          }
          if (response?.isActive) {
            setIsConnected(true);
            setStatus(`Connected to ${response.platform}`);
            if (response.contactInfo) {
              chrome.runtime.sendMessage(
                { type: 'GET_CONTACT_PROFILE', payload: { contactId: response.contactInfo.id } },
                (profileResp: { profile?: ContactProfile }) => {
                  if (profileResp?.profile) setCurrentContact(profileResp.profile);
                }
              );
              chrome.runtime.sendMessage(
                { type: 'GET_ANALYSIS', payload: { contactId: response.contactInfo.id } },
                (analysisResp: { analysis?: ConversationAnalysis }) => {
                  if (analysisResp?.analysis) setAnalysis(analysisResp.analysis);
                }
              );
            }
          }
        });
      }
    });

    // Listen for reply generation results
    const listener = (message: { type: string; payload?: { suggestions?: ReplySuggestion[]; status?: string } }) => {
      if (message.type === 'REPLIES_GENERATED' && message.payload?.suggestions) {
        setSuggestions(message.payload.suggestions);
      }
      if (message.type === 'STATUS_UPDATE' && message.payload?.status) {
        setStatus(message.payload.status);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const handleSaveSettings = useCallback((newSettings: Partial<RizzAISettings>) => {
    const merged = { ...settings, ...newSettings };
    setSettings(merged);
    chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', payload: newSettings });
  }, [settings]);

  const handleCaptureHistory = useCallback(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'CAPTURE_HISTORY' });
        setStatus('Scanning conversation history...');
      }
    });
  }, []);

  const handleRegenerate = useCallback(() => {
    if (currentContact) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'GENERATE_REPLIES',
            payload: { contactId: currentContact.contactId },
          });
        }
      });
    }
  }, [currentContact]);

  const handleInsertReply = useCallback((text: string) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'INSERT_REPLY',
          payload: { text },
        });
      }
    });
  }, []);

  return (
    <div className="rizzai-popup">
      <Header
        view={view}
        onChangeView={setView}
        isConnected={isConnected}
        status={status}
      />

      {view === 'main' && (
        <div className="rizzai-content">
          {!isConnected ? (
            <div className="rizzai-empty-state">
              <div className="rizzai-empty-icon">💬</div>
              <p>Open a supported messaging platform to get started</p>
              <p className="rizzai-subtitle">
                Instagram, Twitter/X, WhatsApp, Telegram, Messenger, Discord, or Tinder
              </p>
            </div>
          ) : (
            <>
              <div className="rizzai-actions">
                <button className="rizzai-btn primary" onClick={handleCaptureHistory}>
                  📥 Scan Full History
                </button>
                <button className="rizzai-btn" onClick={handleRegenerate}>
                  🔄 New Suggestions
                </button>
              </div>

              {currentContact && (
                <div className="rizzai-contact-card">
                  <strong>{currentContact.displayName}</strong>
                  <span className="rizzai-platform-tag">{currentContact.platform}</span>
                  <span className="rizzai-msg-count">{currentContact.totalMessages} messages</span>
                </div>
              )}

              <SuggestionsPanel
                suggestions={suggestions}
                onInsert={handleInsertReply}
                showReasonings={settings.showReasonings}
              />

              {analysis && <InsightsPanel analysis={analysis} />}
            </>
          )}
        </div>
      )}

      {view === 'settings' && (
        <SettingsPanel settings={settings} onSave={handleSaveSettings} />
      )}

      {view === 'contacts' && <ContactList />}
    </div>
  );
}
