import React, { useState, useEffect } from 'react';
import { X, Volume2, Check } from 'lucide-react';
import '../styles/VoiceSettings.css';

// OpenAI 음성 옵션
const VOICE_OPTIONS = [
  { id: 'alloy', name: 'Alloy', description: 'Neutral and balanced voice' },
  { id: 'echo', name: 'Echo', description: 'Deep and thoughtful male voice' },
  { id: 'fable', name: 'Fable', description: 'Warm and friendly female voice' },
  { id: 'onyx', name: 'Onyx', description: 'Strong and confident male voice' },
  { id: 'nova', name: 'Nova', description: 'Bright and cheerful female voice' }
];

const VoiceSettings = ({ isOpen, onClose, onApply }) => {
  // 설정 상태 관리
  const [voiceId, setVoiceId] = useState('onyx');
  const [speechRate, setSpeechRate] = useState(1.0);

  // 초기 설정 로드
  useEffect(() => {
    const savedVoiceId = localStorage.getItem('avatarVoiceId');
    const savedSpeechRate = localStorage.getItem('avatarSpeechRate');

    if (savedVoiceId) {
      setVoiceId(savedVoiceId);
    }

    if (savedSpeechRate) {
      setSpeechRate(parseFloat(savedSpeechRate));
    }
  }, []);

  // 설정 적용 함수
  const handleApply = () => {
    // 로컬 스토리지에 설정 저장
    localStorage.setItem('avatarVoiceId', voiceId);
    localStorage.setItem('avatarSpeechRate', speechRate.toString());

    // 부모 컴포넌트에 설정 전달
    onApply({ voiceId, speechRate });
    onClose();
  };

  // 취소 시 설정 초기화
  const handleCancel = () => {
    const savedVoiceId = localStorage.getItem('avatarVoiceId') || 'onyx';
    const savedSpeechRate = localStorage.getItem('avatarSpeechRate') || '1.0';

    setVoiceId(savedVoiceId);
    setSpeechRate(parseFloat(savedSpeechRate));

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="voice-settings-overlay">
      <div className="voice-settings-panel">
        <div className="voice-settings-header">
          <h3>
            <Volume2 size={18} />
            Voice settings
          </h3>
          <button className="close-button" onClick={handleCancel}>
            <X size={18} />
          </button>
        </div>

        <div className="voice-settings-content">
          {/* 음성 선택 드롭다운 */}
          <div className="settings-group">
            <label>Choose a voice</label>
            <select
              className="voice-select"
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
            >
              {VOICE_OPTIONS.map(voice => (
                <option key={voice.id} value={voice.id}>
                  {voice.name} - {voice.description}
                </option>
              ))}
            </select>
          </div>

          {/* 음성 속도 슬라이더 */}
          <div className="settings-group">
            <div className="slider-header">
              <label>Voice speed</label>
              <span>{speechRate.toFixed(1)}x</span>
            </div>
            <div className="slider-container">
              <span className="slider-label">Slow</span>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                className="speed-slider"
              />
              <span className="slider-label">Fast</span>
            </div>
          </div>

          {/* 현재 음성 미리 듣기 (실제 구현 시 필요) */}
          <div className="preview-section">
            <p className="preview-note">
              Changes will take effect from the next conversation.
            </p>
          </div>
        </div>

        <div className="voice-settings-footer">
          <button className="cancel-button" onClick={handleCancel}>
            Cancel
          </button>
          <button className="apply-button" onClick={handleApply}>
            <Check size={16} />
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceSettings;