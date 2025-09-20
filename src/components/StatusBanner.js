import React, { useState, useEffect } from 'react';
import './StatusBanner.css';

const StatusBanner = () => {
  const [ollamaStatus, setOllamaStatus] = useState({
    connected: false,
    checking: true,
    lastChecked: null,
    error: null
  });
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [showDataBanner, setShowDataBanner] = useState(true);

  const checkOllamaStatus = async () => {
    setOllamaStatus(prev => ({ ...prev, checking: true, error: null }));

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch('http://localhost:11434/api/tags', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const models = data.models || [];
        const hasLlamaModel = models.some(model =>
          model.name.includes('llama3.1') ||
          model.name.includes('llama3') ||
          model.name.includes('llama2')
        );

        setOllamaStatus({
          connected: true,
          checking: false,
          hasModel: hasLlamaModel,
          modelCount: models.length,
          models: models.map(m => m.name),
          lastChecked: new Date(),
          error: null
        });
        setShowSetupGuide(false);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      let errorMessage = 'Connection failed';

      if (error.name === 'AbortError') {
        errorMessage = 'Connection timeout (5s)';
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Service not running';
      } else {
        errorMessage = error.message;
      }

      setOllamaStatus({
        connected: false,
        checking: false,
        hasModel: false,
        modelCount: 0,
        models: [],
        lastChecked: new Date(),
        error: errorMessage
      });
    }
  };

  useEffect(() => {
    checkOllamaStatus();

    // More frequent checking when disconnected, less frequent when connected
    const getCheckInterval = () => {
      return ollamaStatus.connected ? 60000 : 15000; // 1 min if connected, 15s if disconnected
    };

    const interval = setInterval(checkOllamaStatus, getCheckInterval());

    return () => clearInterval(interval);
  }, [ollamaStatus.connected]);

  const toggleSetupGuide = () => {
    setShowSetupGuide(!showSetupGuide);
  };

  const dismissDataBanner = () => {
    setShowDataBanner(false);
    localStorage.setItem('vibesync_data_banner_dismissed', 'true');
  };

  const formatLastChecked = (date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  useEffect(() => {
    const dismissed = localStorage.getItem('vibesync_data_banner_dismissed');
    if (dismissed) {
      setShowDataBanner(false);
    }
  }, []);

  return (
    <div className="status-banner-container">
      {/* Data Notice Banner */}
      {showDataBanner && (
        <div className="data-banner">
          <div className="data-content">
            <div className="data-text">
              <span className="data-icon">⚠️</span>
              <strong>Notice:</strong> Chats may be sent to server. No illegal prompts.
              No signup required - no identifying info saved.
            </div>
            <button
              className="data-dismiss"
              onClick={dismissDataBanner}
              title="Dismiss this notice"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Ollama Status */}
      <div className="ollama-status">
        <div className="status-content">
          <div className="status-indicator">
            {ollamaStatus.checking ? (
              <>
                <span className="status-dot checking"></span>
                <span>Checking Ollama...</span>
              </>
            ) : ollamaStatus.connected ? (
              <>
                <span className="status-dot connected"></span>
                <span>
                  Ollama Connected
                  {ollamaStatus.hasModel ? (
                    <span className="model-info"> • {ollamaStatus.modelCount} model{ollamaStatus.modelCount !== 1 ? 's' : ''} available</span>
                  ) : (
                    <span className="model-warning"> • No compatible models found</span>
                  )}
                  {ollamaStatus.lastChecked && (
                    <span className="last-checked"> • {formatLastChecked(ollamaStatus.lastChecked)}</span>
                  )}
                </span>
              </>
            ) : (
              <>
                <span className="status-dot disconnected"></span>
                <span>
                  Ollama Disconnected
                  {ollamaStatus.error && (
                    <span className="error-info"> • {ollamaStatus.error}</span>
                  )}
                  {ollamaStatus.lastChecked && (
                    <span className="last-checked"> • {formatLastChecked(ollamaStatus.lastChecked)}</span>
                  )}
                </span>
              </>
            )}
          </div>

          <div className="status-actions">
            {!ollamaStatus.connected && (
              <button
                className="setup-guide-button"
                onClick={toggleSetupGuide}
                title="Show setup instructions"
              >
                📋 Setup
              </button>
            )}
            <button
              className="refresh-status"
              onClick={checkOllamaStatus}
              title="Refresh status"
              disabled={ollamaStatus.checking}
            >
              🔄
            </button>
          </div>
        </div>
      </div>

      {/* Setup Guide */}
      {showSetupGuide && (
        <div className="setup-guide">
          <div className="setup-content">
            <div className="setup-header">
              <h3>🚀 Ollama Setup Guide</h3>
              <button
                className="setup-close"
                onClick={toggleSetupGuide}
                title="Close setup guide"
              >
                ✕
              </button>
            </div>

            <div className="setup-steps">
              <div className="setup-step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h4>Install Ollama</h4>
                  <p>Download and install Ollama from the official website:</p>
                  <code className="setup-code">https://ollama.ai</code>
                </div>
              </div>

              <div className="setup-step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h4>Start Ollama Service</h4>
                  <p>Run Ollama in your terminal:</p>
                  <code className="setup-code">ollama serve</code>
                  <p className="step-note">Keep this terminal window open</p>
                </div>
              </div>

              <div className="setup-step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h4>Install a Model</h4>
                  <p>In a new terminal, install a language model:</p>
                  <div className="code-options">
                    <code className="setup-code">ollama pull llama3.1:8b</code>
                    <span className="code-label">Recommended</span>
                  </div>
                  <div className="alternative-models">
                    <p>Alternative models:</p>
                    <code className="setup-code-alt">ollama pull llama3:latest</code>
                    <code className="setup-code-alt">ollama pull llama2:latest</code>
                  </div>
                </div>
              </div>

              <div className="setup-step">
                <div className="step-number">4</div>
                <div className="step-content">
                  <h4>Verify Installation</h4>
                  <p>Check that everything is working:</p>
                  <code className="setup-code">ollama list</code>
                  <p className="step-note">You should see your installed model(s)</p>
                </div>
              </div>
            </div>

            <div className="setup-footer">
              <div className="setup-help">
                <strong>Need help?</strong> Visit the{' '}
                <a href="https://github.com/jmorganca/ollama" target="_blank" rel="noopener noreferrer">
                  Ollama GitHub repository
                </a>{' '}
                for detailed documentation.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusBanner;