import React from 'react';
import type { ConversationAnalysis } from '../../../types';

interface InsightsPanelProps {
  analysis: ConversationAnalysis;
}

export function InsightsPanel({ analysis }: InsightsPanelProps) {
  const stageLabels: Record<string, string> = {
    first_conversation: 'First Conversation',
    early_chatting: 'Early Chatting',
    comfortable: 'Comfortable',
    playful_flirting: 'Playful Flirting',
    deeper_connection: 'Deeper Connection',
  };

  return (
    <div className="rizzai-insights">
      <h3 className="rizzai-section-title">Conversation Insights</h3>

      <div className="rizzai-insight-grid">
        <div className="rizzai-insight-item">
          <span className="rizzai-insight-label">Stage</span>
          <span className="rizzai-insight-value">
            {stageLabels[analysis.stage] || analysis.stage}
          </span>
        </div>
        <div className="rizzai-insight-item">
          <span className="rizzai-insight-label">Energy</span>
          <span className={`rizzai-insight-value energy-${analysis.energy}`}>
            {analysis.energy}
          </span>
        </div>
        <div className="rizzai-insight-item">
          <span className="rizzai-insight-label">Interest</span>
          <span className="rizzai-insight-value">
            {Math.round(analysis.interestSignals.score * 100)}%
          </span>
        </div>
        <div className="rizzai-insight-item">
          <span className="rizzai-insight-label">Style</span>
          <span className="rizzai-insight-value">
            {analysis.styleProfile.usesSlang ? 'Casual' : 'Standard'}
            {analysis.styleProfile.usesEmojis ? ' + Emojis' : ''}
          </span>
        </div>
      </div>

      {analysis.interestSignals.indicators.length > 0 && (
        <div className="rizzai-signals">
          <h4 className="rizzai-subsection-title">Interest Signals</h4>
          {analysis.interestSignals.indicators.map((indicator, i) => (
            <div key={i} className="rizzai-signal-item">
              {indicator}
            </div>
          ))}
        </div>
      )}

      {analysis.suggestedStrategy.tips.length > 0 && (
        <div className="rizzai-tips">
          <h4 className="rizzai-subsection-title">Strategy Tips</h4>
          {analysis.suggestedStrategy.tips.map((tip, i) => (
            <div key={i} className="rizzai-tip-item">
              {tip}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
