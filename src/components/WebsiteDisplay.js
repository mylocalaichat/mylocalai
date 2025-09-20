import React, { useState } from 'react';
import './WebsiteDisplay.css';

const WebsiteDisplay = ({ currentUrl, onLoadWebsite }) => {
  const [urlInput, setUrlInput] = useState(currentUrl);

  const handleLoadWebsite = () => {
    if (urlInput.trim()) {
      onLoadWebsite(urlInput.trim());
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLoadWebsite();
    }
  };

  const handleSuggestionClick = (url) => {
    setUrlInput(url);
    onLoadWebsite(url);
  };

  const suggestions = [
    { name: 'Wikipedia', url: 'https://www.wikipedia.org' },
    { name: 'MDN', url: 'https://developer.mozilla.org' },
    { name: 'HTTP Test', url: 'https://httpbin.org' },
    { name: 'JSON API', url: 'https://jsonplaceholder.typicode.com' }
  ];

  return (
    <div className="website-display">
      <div className="website-header">
        <div className="website-title">
          <span className="website-icon">🌐</span>
          Website Display
        </div>
      </div>

      <div className="url-input-section">
        <input
          type="url"
          className="url-input"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter website URL..."
        />
        <button
          className="load-button"
          onClick={handleLoadWebsite}
        >
          Load
        </button>
      </div>

      <div className="suggestions-section">
        <p className="suggestions-text">Try these iframe-friendly sites:</p>
        <div className="suggestions">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              className="suggestion-btn"
              onClick={() => handleSuggestionClick(suggestion.url)}
            >
              {suggestion.name}
            </button>
          ))}
        </div>
      </div>

      <div className="iframe-container">
        <iframe
          src={currentUrl}
          title="Website Display"
          className="website-iframe"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
};

export default WebsiteDisplay;