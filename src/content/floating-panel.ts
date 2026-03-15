import type { ConversationAnalysis, PlatformAdapter, ReplySuggestion } from '../../types';

/**
 * Floating UI panel injected near the message input box.
 * Shows reply suggestions, contact insights, and controls.
 */
export class FloatingPanel {
  private adapter: PlatformAdapter;
  private container: HTMLDivElement | null = null;
  private suggestionsContainer: HTMLDivElement | null = null;
  private insightsContainer: HTMLDivElement | null = null;
  private isVisible = false;
  private isLoading = false;

  constructor(adapter: PlatformAdapter) {
    this.adapter = adapter;
  }

  mount(): void {
    if (this.container) return;

    this.container = document.createElement('div');
    this.container.id = 'rizzai-panel';
    this.container.innerHTML = this.getTemplate();
    this.applyStyles();
    document.body.appendChild(this.container);

    this.suggestionsContainer = this.container.querySelector('#rizzai-suggestions');
    this.insightsContainer = this.container.querySelector('#rizzai-insights');

    // Toggle button
    const toggleBtn = this.container.querySelector('#rizzai-toggle');
    toggleBtn?.addEventListener('click', () => this.toggle());

    // Minimize button
    const minimizeBtn = this.container.querySelector('#rizzai-minimize');
    minimizeBtn?.addEventListener('click', () => this.toggle());

    // Capture history button
    const captureBtn = this.container.querySelector('#rizzai-capture');
    captureBtn?.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'CAPTURE_HISTORY', payload: { platform: this.adapter.platform } });
    });

    // Regenerate button
    const regenBtn = this.container.querySelector('#rizzai-regenerate');
    regenBtn?.addEventListener('click', () => {
      const contactInfo = this.adapter.getContactInfo();
      if (contactInfo) {
        chrome.runtime.sendMessage({
          type: 'GENERATE_REPLIES',
          payload: { contactId: contactInfo.id },
        });
      }
    });

    // Listen for replies from background
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'REPLIES_GENERATED') {
        this.showSuggestions(message.payload.suggestions);
      }
    });

    this.isVisible = false;
  }

  unmount(): void {
    this.container?.remove();
    this.container = null;
  }

  toggle(): void {
    this.isVisible = !this.isVisible;
    const panel = this.container?.querySelector('#rizzai-main-panel') as HTMLElement;
    const toggleBtn = this.container?.querySelector('#rizzai-toggle') as HTMLElement;

    if (panel) {
      panel.style.display = this.isVisible ? 'flex' : 'none';
    }
    if (toggleBtn) {
      toggleBtn.textContent = this.isVisible ? '' : 'RizzAI';
      toggleBtn.style.display = this.isVisible ? 'none' : 'flex';
    }
  }

  setLoading(loading: boolean, message?: string): void {
    this.isLoading = loading;
    const loader = this.container?.querySelector('#rizzai-loader') as HTMLElement;
    if (loader) {
      loader.style.display = loading ? 'flex' : 'none';
      if (message) {
        const text = loader.querySelector('span');
        if (text) text.textContent = message;
      }
    }
  }

  showSuggestions(suggestions: ReplySuggestion[]): void {
    if (!this.suggestionsContainer) return;
    this.setLoading(false);

    if (!this.isVisible) this.toggle();

    this.suggestionsContainer.innerHTML = suggestions
      .map(
        (s) => `
        <div class="rizzai-suggestion" data-text="${this.escapeHtml(s.text)}" data-tone="${s.tone}">
          <div class="rizzai-suggestion-tone">${s.tone}</div>
          <div class="rizzai-suggestion-text">${this.escapeHtml(s.text)}</div>
          ${s.reasoning ? `<div class="rizzai-suggestion-reason">${this.escapeHtml(s.reasoning)}</div>` : ''}
          <div class="rizzai-suggestion-actions">
            <button class="rizzai-btn-insert" title="Insert into input">Use</button>
            <button class="rizzai-btn-copy" title="Copy to clipboard">Copy</button>
          </div>
        </div>
      `
      )
      .join('');

    // Bind click handlers
    this.suggestionsContainer.querySelectorAll('.rizzai-btn-insert').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const card = (e.target as HTMLElement).closest('.rizzai-suggestion');
        const text = card?.getAttribute('data-text');
        if (text) {
          const input = this.adapter.getInputElement();
          if (input) this.adapter.insertText(input, text);
        }
      });
    });

    this.suggestionsContainer.querySelectorAll('.rizzai-btn-copy').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const card = (e.target as HTMLElement).closest('.rizzai-suggestion');
        const text = card?.getAttribute('data-text');
        if (text) navigator.clipboard.writeText(text);
      });
    });
  }

  updateAnalysis(analysis: ConversationAnalysis): void {
    if (!this.insightsContainer) return;

    const stageEmoji: Record<string, string> = {
      first_conversation: '👋',
      early_chatting: '💬',
      comfortable: '😊',
      playful_flirting: '😏',
      deeper_connection: '❤️',
    };

    const energyEmoji: Record<string, string> = {
      high: '🔥',
      medium: '⚡',
      low: '💤',
    };

    this.insightsContainer.innerHTML = `
      <div class="rizzai-insight-row">
        <span>Vibe</span>
        <span>${stageEmoji[analysis.stage] || ''} ${analysis.stage.replace(/_/g, ' ')}</span>
      </div>
      <div class="rizzai-insight-row">
        <span>Energy</span>
        <span>${energyEmoji[analysis.energy] || ''} ${analysis.energy}</span>
      </div>
      <div class="rizzai-insight-row">
        <span>Interest</span>
        <span>${Math.round(analysis.interestSignals.score * 100)}%</span>
      </div>
      ${analysis.interestSignals.indicators.length > 0 ? `
        <div class="rizzai-insight-signals">
          ${analysis.interestSignals.indicators.map((i) => `<span class="rizzai-signal">${i}</span>`).join('')}
        </div>
      ` : ''}
      ${analysis.suggestedStrategy.tips.length > 0 ? `
        <div class="rizzai-insight-tips">
          <strong>Tips:</strong>
          ${analysis.suggestedStrategy.tips.map((t) => `<div class="rizzai-tip">${t}</div>`).join('')}
        </div>
      ` : ''}
    `;
  }

  private getTemplate(): string {
    return `
      <button id="rizzai-toggle">RizzAI</button>
      <div id="rizzai-main-panel" style="display: none;">
        <div id="rizzai-header">
          <span id="rizzai-title">RizzAI</span>
          <div id="rizzai-header-actions">
            <button id="rizzai-capture" title="Load full chat history">📥 Scan</button>
            <button id="rizzai-regenerate" title="Get new suggestions">🔄</button>
            <button id="rizzai-minimize" title="Minimize">✕</button>
          </div>
        </div>
        <div id="rizzai-loader" style="display: none;">
          <div class="rizzai-spinner"></div>
          <span>Loading...</span>
        </div>
        <div id="rizzai-suggestions"></div>
        <div id="rizzai-insights-header">Conversation Insights</div>
        <div id="rizzai-insights"></div>
      </div>
    `;
  }

  private applyStyles(): void {
    if (!this.container) return;

    const style = document.createElement('style');
    style.textContent = `
      #rizzai-panel {
        position: fixed;
        bottom: 80px;
        right: 20px;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
      }
      #rizzai-toggle {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 24px;
        padding: 10px 20px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        display: flex;
        align-items: center;
        gap: 6px;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      #rizzai-toggle:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
      }
      #rizzai-main-panel {
        background: #1a1a2e;
        border: 1px solid #333;
        border-radius: 16px;
        width: 340px;
        max-height: 500px;
        overflow-y: auto;
        flex-direction: column;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      }
      #rizzai-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid #333;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 16px 16px 0 0;
      }
      #rizzai-title {
        font-weight: 700;
        font-size: 15px;
        color: white;
      }
      #rizzai-header-actions {
        display: flex;
        gap: 6px;
      }
      #rizzai-header-actions button {
        background: rgba(255,255,255,0.2);
        border: none;
        border-radius: 8px;
        color: white;
        padding: 4px 10px;
        cursor: pointer;
        font-size: 12px;
        transition: background 0.2s;
      }
      #rizzai-header-actions button:hover {
        background: rgba(255,255,255,0.3);
      }
      #rizzai-loader {
        padding: 16px;
        align-items: center;
        gap: 8px;
        color: #aaa;
      }
      .rizzai-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid #444;
        border-top-color: #667eea;
        border-radius: 50%;
        animation: rizzai-spin 0.8s linear infinite;
      }
      @keyframes rizzai-spin { to { transform: rotate(360deg); } }
      #rizzai-suggestions {
        padding: 8px;
      }
      .rizzai-suggestion {
        background: #16213e;
        border: 1px solid #333;
        border-radius: 12px;
        padding: 10px 12px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: border-color 0.2s, transform 0.1s;
      }
      .rizzai-suggestion:hover {
        border-color: #667eea;
        transform: translateY(-1px);
      }
      .rizzai-suggestion-tone {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #667eea;
        margin-bottom: 4px;
        font-weight: 600;
      }
      .rizzai-suggestion-text {
        color: #e0e0e0;
        line-height: 1.4;
      }
      .rizzai-suggestion-reason {
        font-size: 11px;
        color: #777;
        margin-top: 4px;
        font-style: italic;
      }
      .rizzai-suggestion-actions {
        display: flex;
        gap: 6px;
        margin-top: 8px;
      }
      .rizzai-suggestion-actions button {
        background: #667eea;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 4px 12px;
        cursor: pointer;
        font-size: 11px;
        font-weight: 500;
        transition: opacity 0.2s;
      }
      .rizzai-suggestion-actions button:hover {
        opacity: 0.8;
      }
      .rizzai-btn-copy {
        background: #333 !important;
      }
      #rizzai-insights-header {
        padding: 8px 16px 4px;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #667eea;
        font-weight: 600;
      }
      #rizzai-insights {
        padding: 4px 16px 12px;
      }
      .rizzai-insight-row {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
        color: #ccc;
        font-size: 12px;
      }
      .rizzai-insight-row span:first-child {
        color: #888;
      }
      .rizzai-insight-signals {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 6px;
      }
      .rizzai-signal {
        background: #16213e;
        border: 1px solid #333;
        border-radius: 6px;
        padding: 2px 8px;
        font-size: 10px;
        color: #aaa;
      }
      .rizzai-insight-tips {
        margin-top: 8px;
        font-size: 11px;
        color: #888;
      }
      .rizzai-tip {
        padding: 2px 0;
        color: #aaa;
      }
      .rizzai-tip::before {
        content: "→ ";
        color: #667eea;
      }
    `;
    document.head.appendChild(style);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
