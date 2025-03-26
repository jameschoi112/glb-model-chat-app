import React, { useState } from 'react';
import { Mic, MicOff, Info, ChevronRight, X } from 'lucide-react';
import '../styles/WelcomePopup.css';

const WelcomePopup = ({ onActivate, onClose }) => {
  const [step, setStep] = useState(1);

  const handleMicrophonePermission = () => {
    // Check if browser supports getUserMedia
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          // Stop all tracks after getting permission
          stream.getTracks().forEach(track => track.stop());
          onActivate();
        })
        .catch((error) => {
          console.error('Microphone permission denied:', error);
          // Move to error state if permission denied
          setStep(3);
        });
    } else {
      console.error('getUserMedia is not supported in this browser');
      setStep(3);
    }
  };

  return (
    <div className="welcome-popup-overlay">
      <div className="welcome-popup">
        <button className="close-button" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        {step === 1 && (
          <div className="welcome-content">
            <div className="welcome-icon">
              <Mic size={36} color="#0084ff" />
            </div>
            <h2 className="welcome-title">Welcome to Avatar Assistant</h2>
            <p className="welcome-description">
              This application uses your device's microphone to enable voice interaction with the AI avatar.
              We need your permission to access the microphone for full functionality.
            </p>
            <div className="info-box">
              <Info size={20} color="#0084ff" />
              <p>Your voice data is processed securely and not stored permanently.</p>
            </div>
            <div className="welcome-buttons">
              <button className="secondary-button" onClick={() => setStep(2)}>
                Learn More
              </button>
              <button className="primary-button" onClick={handleMicrophonePermission}>
                Allow Microphone <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="welcome-content">
            <div className="welcome-icon">
              <Info size={36} color="#0084ff" />
            </div>
            <h2 className="welcome-title">How It Works</h2>
            <div className="steps-container">
              <div className="step-item">
                <div className="step-number">1</div>
                <p>Your voice is captured through the microphone</p>
              </div>
              <div className="step-item">
                <div className="step-number">2</div>
                <p>Speech is converted to text and processed by AI</p>
              </div>
              <div className="step-item">
                <div className="step-number">3</div>
                <p>The avatar responds with voice and animations</p>
              </div>
            </div>
            <div className="info-box">
              <Info size={20} color="#0084ff" />
              <p>You can use the text chat if you prefer not to use voice interaction.</p>
            </div>
            <div className="welcome-buttons">
              <button className="secondary-button" onClick={() => setStep(1)}>
                Back
              </button>
              <button className="primary-button" onClick={handleMicrophonePermission}>
                Allow Microphone <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="welcome-content">
            <div className="welcome-icon error">
              <MicOff size={36} color="#ff3b30" />
            </div>
            <h2 className="welcome-title">Microphone Access Denied</h2>
            <p className="welcome-description">
              We couldn't access your microphone. Voice interaction requires microphone permission.
            </p>
            <div className="info-box warning">
              <Info size={20} color="#ff3b30" />
              <p>
                You can still use text chat, but for the full experience, please allow microphone
                access in your browser settings.
              </p>
            </div>
            <div className="browser-instructions">
              <p>To enable microphone access:</p>
              <ul>
                <li>Click the lock/info icon in your browser's address bar</li>
                <li>Find "Microphone" permissions and change to "Allow"</li>
                <li>Refresh the page and try again</li>
              </ul>
            </div>
            <div className="welcome-buttons">
              <button className="secondary-button" onClick={() => setStep(1)}>
                Back
              </button>
              <button className="primary-button" onClick={onClose}>
                Continue with Text Only
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WelcomePopup;