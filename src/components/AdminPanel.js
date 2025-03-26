import React, { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { Settings, Layout, User, ChevronDown, ChevronUp, Hand, UserCircle, Music } from 'lucide-react';
import '../styles/AdminPanel.css';

const AdminPanel = ({ onChangeBackground, onChangeModel }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const panelRef = useRef(null);
  const buttonRef = useRef(null);
  const actionsRef = useRef(null);

  // 관리자 모드 패널 토글
  const togglePanel = () => {
    if (!isOpen) {
      // 패널 열기
      gsap.to(panelRef.current, {
        x: 0,
        duration: 0.5,
        ease: 'power3.out'
      });

      // 버튼 회전
      gsap.to(buttonRef.current, {
        rotation: 180,
        duration: 0.5,
        ease: 'power2.inOut'
      });
    } else {
      // 패널 닫기
      gsap.to(panelRef.current, {
        x: '-100%',
        duration: 0.5,
        ease: 'power3.in'
      });

      // 버튼 회전 원래대로
      gsap.to(buttonRef.current, {
        rotation: 0,
        duration: 0.5,
        ease: 'power2.inOut'
      });
    }
    setIsOpen(!isOpen);
  };

  // 액션 버튼 토글
  const toggleActions = () => {
    if (!showActions) {
      // 액션 버튼들 펼치기
      gsap.to(actionsRef.current, {
        height: 'auto',
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out'
      });
    } else {
      // 액션 버튼들 접기
      gsap.to(actionsRef.current, {
        height: 0,
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in'
      });
    }
    setShowActions(!showActions);
  };

  // 배경 변경 옵션
  const backgrounds = [
    { name: '기본', value: 'default' },
    { name: '석양', value: 'sunset' },
    { name: '밤', value: 'night' },
    { name: '아침', value: 'dawn' }
  ];

  // 모델 변경 옵션
  const models = [
    { name: '기본 모델', value: 'model1' },
    { name: '여성 모델', value: 'model3' }
  ];

  // 배경 변경 핸들러
  const handleBackgroundChange = (background) => {
    if (onChangeBackground) {
      onChangeBackground(background);
    }
  };

  // 모델 변경 핸들러
  const handleModelChange = (model) => {
    if (onChangeModel) {
      onChangeModel(model);
    }
  };

  // 동작 실행 핸들러
  const executeAction = (action) => {
    console.log(`${action} 동작 실행`);
    // 여기에 각 동작에 맞는 실제 코드 구현
    // 예: 손흔들기, 인사하기, 춤추기 등의 동작

    // 액션 실행 후 액션 메뉴 닫기
    setTimeout(() => {
      setShowActions(false);
      gsap.to(actionsRef.current, {
        height: 0,
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in'
      });
    }, 500);
  };

  return (
    <div className="admin-controls">
      {/* 관리자 모드 버튼 */}
      <button
        className={`admin-button ${isOpen ? 'active' : ''}`}
        onClick={togglePanel}
        aria-label="관리자 모드"
      >
        <span ref={buttonRef} className="admin-icon">
          <Settings size={22} />
        </span>
      </button>

      {/* 동작 버튼 (하나로 통합) */}
      <button
        className={`action-main-button ${showActions ? 'active' : ''}`}
        onClick={toggleActions}
        aria-label="동작 메뉴"
      >
        <UserCircle size={20} />
        <span className="action-label">동작</span>
        {showActions ?
          <ChevronUp size={16} className="action-arrow" /> :
          <ChevronDown size={16} className="action-arrow" />
        }
      </button>

      {/* 동작 버튼 확장 메뉴 */}
      <div ref={actionsRef} className="actions-dropdown">
        <button className="action-dropdown-item" onClick={() => executeAction('wave')}>
          <Hand size={18} />
          <span>손 흔들기</span>
        </button>
        <button className="action-dropdown-item" onClick={() => executeAction('bow')}>
          <User size={18} />
          <span>인사하기</span>
        </button>
        <button className="action-dropdown-item" onClick={() => executeAction('dance')}>
          <Music size={18} />
          <span>춤추기</span>
        </button>
      </div>

      {/* 관리자 패널 (왼쪽에서 슬라이드) */}
      <div ref={panelRef} className="admin-panel">
        <h3>관리자 설정</h3>

        {/* 배경 변경 섹션 */}
        <div className="panel-section">
          <h4><Layout size={18} /> 배경 변경</h4>
          <div className="option-grid">
            {backgrounds.map((bg) => (
              <button
                key={bg.value}
                className="option-button"
                onClick={() => handleBackgroundChange(bg.value)}
              >
                {bg.name}
              </button>
            ))}
          </div>
        </div>

        {/* 모델 변경 섹션 */}
        <div className="panel-section">
          <h4><User size={18} /> 모델 변경</h4>
          <div className="option-grid">
            {models.map((model) => (
              <button
                key={model.value}
                className="option-button"
                onClick={() => handleModelChange(model.value)}
              >
                {model.name}
              </button>
            ))}
          </div>
        </div>

        {/* 추가 설정 섹션 */}
        <div className="panel-section">
          <h4><Settings size={18} /> 추가 설정</h4>
          <div className="setting-row">
            <label htmlFor="lip-sync-strength">립싱크 강도</label>
            <input
              type="range"
              id="lip-sync-strength"
              min="0.5"
              max="1.5"
              step="0.1"
              defaultValue="1.0"
            />
          </div>
          <div className="setting-row">
            <label htmlFor="voice-speed">음성 속도</label>
            <input
              type="range"
              id="voice-speed"
              min="0.8"
              max="1.2"
              step="0.1"
              defaultValue="1.0"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;