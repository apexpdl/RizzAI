import React from 'react';
import type { ReplySuggestion } from '../../../types';

interface SuggestionsPanelProps {
  suggestions: ReplySuggestion[];
  onInsert: (text: string) => void;
  showReasonings: boolean;
}

const toneColors: Record<string, string> = {
  playful: '#667eea',
  curious: '#48bb78',
  humorous: '#ed8936',
  confident: '#e53e3e',
  safe: '#a0aec0',
};

export function SuggestionsPanel({ suggestions, onInsert, showReasonings }: SuggestionsPanelProps) {
  if (suggestions.length === 0) {
    return (
      <div className="rizzai-suggestions-empty">
        <p>No suggestions yet. Click "New Suggestions" or wait for an incoming message.</p>
      </div>
    );
  }

  return (
    <div className="rizzai-suggestions">
      <h3 className="rizzai-section-title">Suggested Replies</h3>
      {suggestions.map((s) => (
        <div key={s.id} className="rizzai-suggestion-card">
          <div className="rizzai-suggestion-header">
            <span
              className="rizzai-tone-badge"
              style={{ backgroundColor: toneColors[s.tone] || '#667eea' }}
            >
              {s.tone}
            </span>
            <span className="rizzai-confidence">
              {Math.round(s.confidence * 100)}%
            </span>
          </div>
          <p className="rizzai-suggestion-text">{s.text}</p>
          {showReasonings && s.reasoning && (
            <p className="rizzai-suggestion-reasoning">{s.reasoning}</p>
          )}
          <div className="rizzai-suggestion-actions">
            <button
              className="rizzai-btn small primary"
              onClick={() => onInsert(s.text)}
            >
              Use
            </button>
            <button
              className="rizzai-btn small"
              onClick={() => navigator.clipboard.writeText(s.text)}
            >
              Copy
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
