import React, { useState, useEffect } from 'react';
import { X, Check, Palette } from 'lucide-react';
import '../styles/ThemeSettings.css';

// 테마 옵션 정의
const THEME_OPTIONS = [
  {
    id: 'default',
    name: 'Default Theme',
    description: 'Classic dark blue design',
    colors: {
      primaryBg: '#1a1b26',
      secondaryBg: '#24283b',
      tertiaryBg: '#2c3048',
      accentColor: '#7aa2f7',
      accentHover: '#8ab4ff',
      textPrimary: '#c0caf5',
      textSecondary: '#a9b1d6',
      borderColor: 'rgba(140, 170, 238, 0.3)'
    }
  },
  {
    id: 'emerald',
    name: 'Emerald Theme',
    description: 'Calm green tone design',
    colors: {
      primaryBg: '#0f172a',
      secondaryBg: '#1e293b',
      tertiaryBg: '#334155',
      accentColor: '#10b981',
      accentHover: '#34d399',
      textPrimary: '#f1f5f9',
      textSecondary: '#cbd5e1',
      borderColor: 'rgba(16, 185, 129, 0.3)'
    }
  },
  {
    id: 'sunset',
    name: 'Sunset Theme',
    description: 'Warm orange color design',
    colors: {
      primaryBg: '#27272a',
      secondaryBg: '#3f3f46',
      tertiaryBg: '#52525b',
      accentColor: '#f97316',
      accentHover: '#fb923c',
      textPrimary: '#fafafa',
      textSecondary: '#e4e4e7',
      borderColor: 'rgba(249, 115, 22, 0.3)'
    }
  },
  {
    id: 'lavender',
    name: 'Lavender Theme',
    description: 'Soft purple color design',
    colors: {
      primaryBg: '#1e1b4b',
      secondaryBg: '#312e81',
      tertiaryBg: '#4338ca',
      accentColor: '#a78bfa',
      accentHover: '#c4b5fd',
      textPrimary: '#f5f3ff',
      textSecondary: '#ddd6fe',
      borderColor: 'rgba(167, 139, 250, 0.3)'
    }
  }
];

const ThemeSettings = ({ isOpen, onClose, onApply, currentTheme = 'default' }) => {
  // 현재 선택된 테마 ID
  const [selectedThemeId, setSelectedThemeId] = useState(currentTheme);

  // 초기 설정 로드
  useEffect(() => {
    const savedTheme = localStorage.getItem('avatarTheme');
    if (savedTheme) {
      setSelectedThemeId(savedTheme);
    } else {
      setSelectedThemeId(currentTheme);
    }
  }, [currentTheme]);

  // 설정 적용 함수
  const handleApply = () => {
    // 로컬 스토리지에 설정 저장
    localStorage.setItem('avatarTheme', selectedThemeId);

    // 선택된 테마 정보 찾기
    const selectedTheme = THEME_OPTIONS.find(theme => theme.id === selectedThemeId);

    // 부모 컴포넌트에 설정 전달
    onApply(selectedTheme);
    onClose();
  };

  // 취소 시 설정 초기화
  const handleCancel = () => {
    const savedTheme = localStorage.getItem('avatarTheme') || currentTheme;
    setSelectedThemeId(savedTheme);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="theme-settings-overlay">
      <div className="theme-settings-panel">
        <div className="theme-settings-header">
          <h3>
            <Palette size={18} />
            Theme Settings
          </h3>
          <button className="close-button" onClick={handleCancel}>
            <X size={18} />
          </button>
        </div>

        <div className="theme-settings-content">
          <div className="theme-options-grid">
            {THEME_OPTIONS.map(theme => (
              <div
                key={theme.id}
                className={`theme-option ${selectedThemeId === theme.id ? 'selected' : ''}`}
                onClick={() => setSelectedThemeId(theme.id)}
              >
                <div className="theme-preview" style={{
                  backgroundColor: theme.colors.primaryBg
                }}>
                  <div className="preview-header" style={{
                    backgroundColor: theme.colors.secondaryBg,
                    borderBottom: `1px solid ${theme.colors.borderColor}`
                  }}>
                    <div className="preview-dots">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                  <div className="preview-body">
                    <div className="preview-accent" style={{
                      backgroundColor: theme.colors.accentColor
                    }}></div>
                    <div className="preview-text" style={{
                      backgroundColor: theme.colors.tertiaryBg
                    }}></div>
                    <div className="preview-text" style={{
                      backgroundColor: theme.colors.tertiaryBg
                    }}></div>
                  </div>
                </div>
                <div className="theme-info">
                  <h4>{theme.name}</h4>
                  <p>{theme.description}</p>
                </div>
                {selectedThemeId === theme.id && (
                  <div className="theme-selected-indicator">
                    <Check size={16} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="theme-settings-footer">
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

export default ThemeSettings;
export { THEME_OPTIONS };