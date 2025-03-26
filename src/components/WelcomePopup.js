import React, { useState } from 'react';
import { Mic, MicOff, Info, ChevronRight, X } from 'lucide-react';
import '../styles/WelcomePopup.css';

const WelcomePopup = ({ onActivate, onClose }) => {
  const [step, setStep] = useState(1);

  const handleMicrophonePermission = () => {
  // 모바일 환경 감지
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    // iOS 사파리에서는 특별 처리 필요
    if (isIOS) {
      // iOS에서는 안내 메시지를 먼저 표시
      alert("마이크 접근 권한이 필요합니다. '허용'을 눌러주세요.");
    }

    // 권한 요청 전 약간의 지연 (특히 iOS에서 효과적)
    setTimeout(() => {
      navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then((stream) => {
          // 스트림 정리
          stream.getTracks().forEach(track => track.stop());

          // 권한 획득 성공 후 약간의 지연
          setTimeout(() => {
            onActivate();
          }, 300);
        })
        .catch((error) => {
          console.error('모바일 마이크 권한 오류:', error);

          // 모바일에서는 더 친절한 오류 메시지
          if (isMobile) {
            alert("마이크 접근이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.");
          }
          setStep(3); // 오류 상태로 전환
        });
    }, 500); // 모바일에서는 약간의 지연이 도움됨
  } else {
    console.error('getUserMedia is not supported in this browser');
    alert("이 브라우저는 마이크 접근을 지원하지 않습니다. 다른 브라우저를 사용해보세요.");
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