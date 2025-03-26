import React, { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { Mic, Send, ChevronUp, ChevronDown, Loader, AlertCircle } from 'lucide-react';
import '../styles/ChatInterface.css';

// 음성 재생 인디케이터 컴포넌트
const SpeakingIndicator = () => (
  <div className="speaking-indicator">
    <div className="speaking-dot"></div>
    <div className="speaking-dot"></div>
    <div className="speaking-dot"></div>
  </div>
);

// 로딩 인디케이터 컴포넌트
const LoadingIndicator = () => (
  <div className="loading-indicator">
    <div className="loading-dot"></div>
    <div className="loading-dot"></div>
    <div className="loading-dot"></div>
    <span>Processing...</span>
  </div>
);

const ChatInterface = ({
  onSendMessage,
  initialMessages = [],
  isSpeaking = false,
  onStartVoiceInput = null, // 음성 입력 시작 콜백
  isListening = false // 음성 인식 상태
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState(initialMessages);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);
  const chatHistoryRef = useRef(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);

  // 초기 메시지가 변경되면 채팅 기록 업데이트
  useEffect(() => {
    if (initialMessages.length > 0) {
      // 초기 메시지가 업데이트되었지만, 채팅 기록이 비어있거나
      // 초기 메시지의 길이가 채팅 기록보다 크면 채팅 기록 업데이트
      if (chatHistory.length === 0 || initialMessages.length > chatHistory.length) {
        setChatHistory(initialMessages);
      }
    }
  }, [initialMessages, chatHistory.length]);

  // 채팅창 확장/축소 애니메이션
  const toggleChatExpansion = (e) => {
    if (e) {
      e.stopPropagation(); // 이벤트 버블링 방지
    }

    if (!isExpanded) {
      // 확장 전에 먼저 overflow를 hidden으로 설정
      if (chatContainerRef.current) {
        chatContainerRef.current.style.overflow = 'hidden';
      }

      gsap.to(chatContainerRef.current, {
        height: '350px', // 높이 증가
        duration: 0.5,
        ease: 'power2.out',
        onComplete: () => {
          if (inputRef.current) {
            inputRef.current.focus();
          }

          // 채팅 기록 영역 스크롤을 맨 아래로
          if (chatHistoryRef.current) {
            chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
          }

          // 스크롤 인디케이터 확인
          checkScrollIndicator();
        }
      });
    } else {
      gsap.to(chatContainerRef.current, {
        height: '120px', // 접힌 상태의 높이 증가 (마지막 메시지 표시)
        duration: 0.5,
        ease: 'power2.in',
        onComplete: () => {
          // 애니메이션 완료 후 overflow를 visible로 변경
          if (chatContainerRef.current) {
            chatContainerRef.current.style.overflow = 'visible';
          }
        }
      });
    }
    setIsExpanded(!isExpanded);
  };

  // 스크롤 인디케이터 필요 여부 확인
  const checkScrollIndicator = () => {
    if (chatHistoryRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatHistoryRef.current;
      setShowScrollIndicator(scrollHeight > clientHeight && scrollTop < scrollHeight - clientHeight - 20);
    }
  };

  // 채팅 기록 스크롤 이벤트
  useEffect(() => {
    const handleScroll = () => {
      checkScrollIndicator();
    };

    const chatHistoryElement = chatHistoryRef.current;
    if (chatHistoryElement) {
      chatHistoryElement.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (chatHistoryElement) {
        chatHistoryElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  // 메시지 전송 처리
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (message.trim() === '' || isWaitingForResponse) return;

    // 사용자 메시지 추가
    const userMessage = {
      id: `user-${chatHistory.length}`,
      text: message,
      sender: 'user'
    };

    setChatHistory(prev => [...prev, userMessage]);

    // 입력 필드 초기화
    setMessage('');

    // 응답 대기 상태 설정
    setIsWaitingForResponse(true);

    try {
      // 부모 컴포넌트에서 AI 응답 생성 함수 호출
      const botResponse = await onSendMessage(message);

      // 응답이 있으면 채팅 기록에 추가
      if (botResponse) {
        // 응답에 고유한 ID 할당
        const botMessageWithId = {
          ...botResponse,
          id: `bot-${chatHistory.length}`
        };
        setChatHistory(prev => [...prev, botMessageWithId]);
      }
    } catch (error) {
      console.error('응답 생성 중 오류:', error);

      // 오류 메시지 추가
      const errorMessage = {
        id: `error-${chatHistory.length}`,
        text: '죄송합니다, 응답을 생성하는 중에 문제가 발생했습니다.',
        sender: 'bot'
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      // 응답 대기 상태 해제
      setIsWaitingForResponse(false);
    }
  };

  // 음성 입력 버튼 핸들러
  const handleVoiceInputClick = () => {
    if (onStartVoiceInput && typeof onStartVoiceInput === 'function') {
      onStartVoiceInput();
    }
  };

  // 스크롤 인디케이터 클릭 처리
  const scrollToBottom = () => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTo({
        top: chatHistoryRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // 채팅 기록이 업데이트될 때 스크롤을 맨 아래로
  useEffect(() => {
    if (chatHistoryRef.current && isExpanded) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
      checkScrollIndicator();
    }
  }, [chatHistory, isExpanded]);

  // 마지막 메시지 또는 대화 요약 표시
  const renderCollapsedContent = () => {
    if (chatHistory.length === 0) {
      return (
        <div className="collapsed-chat-placeholder">
          <p>Start a conversation with the AI assistant...</p>
        </div>
      );
    }

    // 마지막 메시지 가져오기
    const lastMessage = chatHistory[chatHistory.length - 1];

    return (
      <div className="collapsed-chat-content">
        <div className={`last-message ${lastMessage.sender}`}>
          <div className="last-message-sender">
            {lastMessage.sender === 'bot' ? 'AI:' : 'You:'}
          </div>
          <div className="last-message-text">
            {lastMessage.text.length > 120
              ? `${lastMessage.text.substring(0, 120)}...`
              : lastMessage.text
            }
            {lastMessage.sender === 'bot' && isSpeaking && <SpeakingIndicator />}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={chatContainerRef}
      className={`chat-container ${isExpanded ? 'expanded' : 'collapsed'} ${isSpeaking ? 'speaking' : ''}`}
    >
      <div className="chat-header" onClick={toggleChatExpansion}>
        <div className="chat-title">
          <span>Chat with AI Assistant</span>
          {isListening && <span className="listening-indicator">Listening...</span>}
        </div>
        <button className="toggle-button" aria-label={isExpanded ? "Collapse chat" : "Expand chat"}>
          {isExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>
      </div>

      {!isExpanded && (
        <div className="collapsed-content" onClick={toggleChatExpansion}>
          {renderCollapsedContent()}
        </div>
      )}

      {isExpanded && (
        <>
          <div className="chat-history" ref={chatHistoryRef}>
            {chatHistory.map(chat => (
              <div
                key={chat.id}
                className={`chat-message ${chat.sender === 'user' ? 'user-message' : 'bot-message'}`}
              >
                {chat.text}
                {chat.sender === 'bot' &&
                  chat.id === `bot-${chatHistory.length - 1}` &&
                  isSpeaking &&
                  <SpeakingIndicator />
                }
              </div>
            ))}

            {isWaitingForResponse && (
              <div className="chat-message bot-message">
                <LoadingIndicator />
              </div>
            )}

            {showScrollIndicator && (
              <button className="scroll-indicator" onClick={scrollToBottom} aria-label="Scroll to bottom">
                <ChevronDown size={16} />
              </button>
            )}
          </div>

          <div className="chat-input-area">
            <form onSubmit={handleSendMessage}>
              <input
                ref={inputRef}
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="chat-input"
                disabled={isWaitingForResponse || isListening}
              />

              {/* 음성 입력 버튼 */}
              <button
                type="button"
                className={`voice-button ${isListening ? 'listening' : ''}`}
                onClick={handleVoiceInputClick}
                disabled={isWaitingForResponse}
                aria-label="Voice input"
              >
                <Mic size={18} />
              </button>

              <button
                type="submit"
                className={`send-button ${isWaitingForResponse || message.trim() === '' ? 'disabled' : ''}`}
                aria-label="Send message"
                disabled={isWaitingForResponse || message.trim() === ''}
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </>
      )}

      {/* 음성 재생 상태 표시 */}
      {isSpeaking && !isExpanded && (
        <div className="speaking-status">
          <SpeakingIndicator />
        </div>
      )}
    </div>
  );
};

export default ChatInterface;