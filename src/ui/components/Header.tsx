import React from 'react';

interface HeaderProps {
  view: string;
  onChangeView: (view: 'main' | 'settings' | 'contacts') => void;
  isConnected: boolean;
  status: string;
}

export function Header({ view, onChangeView, isConnected, status }: HeaderProps) {
  return (
    <div className="rizzai-header">
      <div className="rizzai-header-top">
        <h1 className="rizzai-logo">RizzAI</h1>
        <div className="rizzai-status">
          <span className={`rizzai-status-dot ${isConnected ? 'connected' : ''}`} />
          <span className="rizzai-status-text">{status || 'Not connected'}</span>
        </div>
      </div>
      <nav className="rizzai-nav">
        <button
          className={`rizzai-nav-btn ${view === 'main' ? 'active' : ''}`}
          onClick={() => onChangeView('main')}
        >
          Replies
        </button>
        <button
          className={`rizzai-nav-btn ${view === 'contacts' ? 'active' : ''}`}
          onClick={() => onChangeView('contacts')}
        >
          Contacts
        </button>
        <button
          className={`rizzai-nav-btn ${view === 'settings' ? 'active' : ''}`}
          onClick={() => onChangeView('settings')}
        >
          Settings
        </button>
      </nav>
    </div>
  );
}
