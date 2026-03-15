import React, { useEffect, useState } from 'react';
import type { ContactProfile } from '../../types';

export function ContactList() {
  const [contacts, setContacts] = useState<ContactProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all contacts from background
    chrome.runtime.sendMessage(
      { type: 'GET_ALL_CONTACTS' },
      (response: { contacts?: ContactProfile[] }) => {
        if (response?.contacts) {
          setContacts(response.contacts);
        }
        setLoading(false);
      }
    );
  }, []);

  if (loading) {
    return <div className="rizzai-loading">Loading contacts...</div>;
  }

  if (contacts.length === 0) {
    return (
      <div className="rizzai-empty-state">
        <div className="rizzai-empty-icon">👤</div>
        <p>No contacts yet</p>
        <p className="rizzai-subtitle">
          Open a conversation and scan the history to build contact profiles
        </p>
      </div>
    );
  }

  const stageEmoji: Record<string, string> = {
    first_conversation: '👋',
    early_chatting: '💬',
    comfortable: '😊',
    playful_flirting: '😏',
    deeper_connection: '❤️',
  };

  return (
    <div className="rizzai-contacts">
      <h3 className="rizzai-section-title">Contacts ({contacts.length})</h3>
      {contacts
        .sort((a, b) => b.lastInteractionDate - a.lastInteractionDate)
        .map((contact) => (
          <div key={contact.contactId} className="rizzai-contact-card">
            <div className="rizzai-contact-header">
              <strong>{contact.displayName}</strong>
              <span className="rizzai-platform-tag">{contact.platform}</span>
            </div>
            <div className="rizzai-contact-details">
              <span>{stageEmoji[contact.conversationStage] || ''} {contact.conversationStage.replace(/_/g, ' ')}</span>
              <span>{contact.totalMessages} messages</span>
              <span>Flirt: {contact.flirtingLevel}/10</span>
            </div>
            <div className="rizzai-contact-meta">
              <span>Humor: {contact.humorStyle.type}</span>
              <span>Emoji: {contact.emojiUsage.style}</span>
              <span>Length: {contact.preferredMessageLength}</span>
            </div>
            {contact.topicsDiscussed.length > 0 && (
              <div className="rizzai-contact-topics">
                {contact.topicsDiscussed.map((topic) => (
                  <span key={topic} className="rizzai-topic-tag">{topic}</span>
                ))}
              </div>
            )}
          </div>
        ))}
    </div>
  );
}
