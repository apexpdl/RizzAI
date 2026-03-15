import React, { useState } from 'react';
import type { Platform, RizzAISettings } from '../../../types';

interface SettingsPanelProps {
  settings: RizzAISettings;
  onSave: (settings: Partial<RizzAISettings>) => void;
}

const ALL_PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'messenger', label: 'Messenger' },
  { value: 'discord', label: 'Discord' },
  { value: 'tinder', label: 'Tinder' },
];

export function SettingsPanel({ settings, onSave }: SettingsPanelProps) {
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="rizzai-settings">
      <h3 className="rizzai-section-title">Settings</h3>

      {/* API Configuration */}
      <div className="rizzai-setting-group">
        <label className="rizzai-label">API Key</label>
        <div className="rizzai-input-group">
          <input
            type={showKey ? 'text' : 'password'}
            className="rizzai-input"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
          />
          <button className="rizzai-btn small" onClick={() => setShowKey(!showKey)}>
            {showKey ? 'Hide' : 'Show'}
          </button>
          <button
            className="rizzai-btn small primary"
            onClick={() => onSave({ apiKey })}
          >
            Save
          </button>
        </div>
      </div>

      <div className="rizzai-setting-group">
        <label className="rizzai-label">Model</label>
        <select
          className="rizzai-select"
          value={settings.model}
          onChange={(e) => onSave({ model: e.target.value })}
        >
          <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
          <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
          <option value="claude-opus-4-6">Claude Opus 4.6</option>
        </select>
      </div>

      <div className="rizzai-setting-group">
        <label className="rizzai-label">Suggestions Count</label>
        <select
          className="rizzai-select"
          value={settings.replyCount}
          onChange={(e) => onSave({ replyCount: parseInt(e.target.value) })}
        >
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
          <option value="6">6</option>
        </select>
      </div>

      {/* Toggles */}
      <div className="rizzai-setting-group">
        <div className="rizzai-toggle-row">
          <span>Auto-capture messages</span>
          <input
            type="checkbox"
            checked={settings.autoCapture}
            onChange={(e) => onSave({ autoCapture: e.target.checked })}
          />
        </div>
        <div className="rizzai-toggle-row">
          <span>Show reply reasoning</span>
          <input
            type="checkbox"
            checked={settings.showReasonings}
            onChange={(e) => onSave({ showReasonings: e.target.checked })}
          />
        </div>
        <div className="rizzai-toggle-row">
          <span>Privacy mode (anonymize before API calls)</span>
          <input
            type="checkbox"
            checked={settings.privacyMode}
            onChange={(e) => onSave({ privacyMode: e.target.checked })}
          />
        </div>
      </div>

      {/* Platform toggles */}
      <div className="rizzai-setting-group">
        <label className="rizzai-label">Enabled Platforms</label>
        {ALL_PLATFORMS.map((p) => (
          <div key={p.value} className="rizzai-toggle-row">
            <span>{p.label}</span>
            <input
              type="checkbox"
              checked={settings.enabledPlatforms.includes(p.value)}
              onChange={(e) => {
                const platforms = e.target.checked
                  ? [...settings.enabledPlatforms, p.value]
                  : settings.enabledPlatforms.filter((x) => x !== p.value);
                onSave({ enabledPlatforms: platforms });
              }}
            />
          </div>
        ))}
      </div>

      {/* Data management */}
      <div className="rizzai-setting-group">
        <label className="rizzai-label">Data</label>
        <p className="rizzai-hint">
          All conversation data is stored locally in your browser.
          Nothing is uploaded unless you explicitly enable cloud sync.
        </p>
      </div>
    </div>
  );
}
