import React, { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { Mic, Send, ChevronDown, Loader, AlertCircle, Search } from 'lucide-react';
import '../styles/ChatInterface.css';

// 음성 재생 인디케이터 컴포넌트
const SpeakingIndicator = () => (
  <div className="speaking-indicator">
    <div className="speaking-dot"></div>
    <div className="speaking-dot"></div>
    <div className="speaking-dot"></div>
  </div>
);

// 로딩 인디케이터 컴포넌트 - 개선된 애니메이션
const LoadingIndicator = () => (
  <div className="loading-indicator">
    <div className="loading-circle">
      <div className="loading-circle-inner"></div>
    </div>
    <div className="loading-dots">
      <div className="loading-dot"></div>
      <div className="loading-dot"></div>
      <div className="loading-dot"></div>
    </div>
    <span>Avatar is thinking</span>
  </div>
);

// 타이핑 애니메이션 컴포넌트
const TypingAnimation = ({ text }) => {
  return (
    <div className="typing-animation">
      <div className="typing-bubble">
        <div className="typing-dots">
          <div className="typing-dot"></div>
          <div className="typing-dot"></div>
          <div className="typing-dot"></div>
        </div>
      </div>
    </div>
  );
};

// 마크다운 파서 함수
const parseMarkdown = (markdown) => {
  if (!markdown) return '';

  let html = markdown;

  // 코드 블록 (```) 처리
  html = html.replace(/```(\w*)\n([\s\S]*?)\n```/g, '<pre><code class="language-$1">$2</code></pre>');

  // 인라인 코드 (`) 처리
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // 굵은 텍스트 (**) 처리
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // 기울임 텍스트 (*) 처리
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // 취소선 (~~) 처리
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // 링크 처리
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // 제목 처리 (# ## ###)
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');

  // 순서 없는 목록 처리
  html = html.replace(/^\* (.*$)/gm, '<li>$1</li>');
  html = html.replace(/^- (.*$)/gm, '<li>$1</li>');
  html = html.replace(/<\/li>\n<li>/g, '</li><li>');
  html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');

  // 순서 있는 목록 처리
  html = html.replace(/^\d+\. (.*$)/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gs, '<ol>$1</ol>');

  // 인용구 처리
  html = html.replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>');

  // 수평선 처리
  html = html.replace(/^---$/gm, '<hr />');

  // 이미지 처리
  html = html.replace(/!\[([^\]]+)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');

  // 개행 처리 (두 번의 개행은 단락으로)
  html = html.replace(/\n\n/g, '</p><p>');

  // 단일 개행 처리
  html = html.replace(/\n/g, '<br />');

  // 전체 텍스트를 p 태그로 감싸기 (이미 p 태그가 있는 경우 제외)
  if (!html.includes('<p>')) {
    html = `<p>${html}</p>`;
  }

  return html;
};

// 마크다운 메시지 렌더링 컴포넌트
const MarkdownMessage = ({ content }) => {
  // 로딩 표시기이거나 일반 문자열이면 그대로 표시
  if (content === '응답을 생성하는 중...') {
    return <LoadingIndicator />;
  }

  // HTML 변환 후 dangerouslySetInnerHTML 사용
  const htmlContent = parseMarkdown(content);

  return (
    <div
      className="markdown-content"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

const ChatInterface = ({
  onSendMessage,
  initialMessages = [],
  isSpeaking = false,
  onStartVoiceInput = null, // 음성 입력 시작 콜백
  isListening = false // 음성 인식 상태
}) => {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState(initialMessages);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const inputRef = useRef(null);
  const chatHistoryRef = useRef(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);

  // 초기 메시지가 변경되면 채팅 기록 업데이트
  useEffect(() => {
    if (initialMessages.length > 0) {
      setChatHistory(initialMessages);

      // 메시지가 추가되면 스트리밍 상태 감지
      const lastMessage = initialMessages[initialMessages.length - 1];

      // 마지막 메시지가 봇 메시지이고, '응답을 생성하는 중...'이면 스트리밍 상태로 설정
      if (lastMessage.sender === 'bot') {
        if (lastMessage.text === '응답을 생성하는 중...') {
          setIsWaitingForResponse(true);
          setIsStreaming(false);
        } else if (lastMessage.text !== chatHistory[chatHistory.length - 1]?.text) {
          // 마지막 메시지 텍스트가 변경되었다면 스트리밍 상태로 설정
          setIsStreaming(true);
          setIsWaitingForResponse(false);
        } else {
          // 완료된 메시지
          setIsStreaming(false);
          setIsWaitingForResponse(false);
        }
      }
    }
  }, [initialMessages, chatHistory]);

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
    setIsStreaming(false);

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

      // 응답 대기 상태 해제
      setIsWaitingForResponse(false);
      setIsStreaming(false);
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
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
      checkScrollIndicator();
    }
  }, [chatHistory]);

  // 컴포넌트 마운트시 인풋에 포커스
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // 채팅 내용에서 코드 블록 신택스 하이라이팅 적용
  useEffect(() => {
    // Prism이나 highlight.js 같은 라이브러리가 있다면 불러와서 사용
    // 예: const Prism = window.Prism;
    // if (Prism) Prism.highlightAll();

    // 기본 코드 블록 하이라이팅 스타일 적용
    const style = document.createElement('style');
    style.textContent = `
      .bot-message pre {
        background-color: rgba(30, 30, 44, 0.9);
        border-radius: 8px;
        padding: 12px;
        overflow-x: auto;
      }
      .bot-message code {
        font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
        font-size: 13px;
      }
      .markdown-content h1, .markdown-content h2, .markdown-content h3 {
        margin-top: 12px;
        margin-bottom: 8px;
        color: var(--accent-color);
      }
      .markdown-content h1 { font-size: 1.5em; }
      .markdown-content h2 { font-size: 1.3em; }
      .markdown-content h3 { font-size: 1.1em; }
      .markdown-content ul, .markdown-content ol {
        padding-left: 20px;
        margin: 8px 0;
      }
      .markdown-content blockquote {
        border-left: 3px solid var(--accent-color);
        padding-left: 10px;
        margin: 8px 0;
        color: var(--text-muted);
      }
      .markdown-content a {
        color: var(--accent-color);
        text-decoration: none;
      }
      .markdown-content a:hover {
        text-decoration: underline;
      }
      .markdown-content img {
        max-width: 100%;
        border-radius: 6px;
      }
      .markdown-content p {
        margin: 8px 0;
      }
      .markdown-content hr {
        border: none;
        border-top: 1px solid var(--border-color);
        margin: 16px 0;
      }
      .markdown-content strong {
        color: var(--accent-color);
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="chat-title">
          <span>Chat with Avatar</span>
          {isListening && <span className="listening-indicator">Listening...</span>}
        </div>
      </div>

      <div className="chat-history" ref={chatHistoryRef}>
        {chatHistory.map((chat, index) => (
          <div
            key={chat.id}
            className={`chat-message ${chat.sender === 'user' ? 'user-message' : 'bot-message'} ${
              isStreaming && index === chatHistory.length - 1 && chat.sender === 'bot' ? 'streaming' : ''
            }`}
          >
            {chat.sender === 'user' ? (
              // 사용자 메시지는 마크다운 처리하지 않음
              chat.text
            ) : (
              // 봇 메시지는 마크다운 처리
              <MarkdownMessage content={chat.text} />
            )}

            {/* 음성 재생 중이고 마지막 메시지일 때 표시 */}
            {chat.sender === 'bot' &&
              chat.id === `bot-${chatHistory.length - 1}` &&
              isSpeaking &&
              <SpeakingIndicator />
            }

            {/* 스트리밍 중이고 마지막 메시지일 때 타이핑 애니메이션 표시 */}
            {isStreaming &&
              index === chatHistory.length - 1 &&
              chat.sender === 'bot' &&
              !isSpeaking &&
              <TypingAnimation />
            }
          </div>
        ))}

        {/*
          채팅 기록에 '응답을 생성하는 중...' 메시지가 없을 때만
          별도의 로딩 인디케이터를 표시
        */}
        {isWaitingForResponse && !isStreaming &&
          !chatHistory.some(chat => chat.text === '응답을 생성하는 중...') && (
          <div className="chat-message bot-message loading">
            <LoadingIndicator />
          </div>
        )}

        {showScrollIndicator && (
          <button className="scroll-indicator" onClick={scrollToBottom} aria-label="아래로 스크롤">
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
            placeholder="Type your message."
            className="chat-input"
            disabled={isWaitingForResponse || isListening}
          />

          {/* 음성 입력 버튼 */}
          <button
            type="button"
            className={`voice-button ${isListening ? 'listening' : ''}`}
            onClick={handleVoiceInputClick}
            disabled={isWaitingForResponse}
            aria-label="음성 입력"
          >
            <Mic size={18} />
          </button>

          <button
            type="submit"
            className={`send-button ${isWaitingForResponse || message.trim() === '' ? 'disabled' : ''}`}
            aria-label="메시지 보내기"
            disabled={isWaitingForResponse || message.trim() === ''}
          >
            <Send size={18} />
          </button>
        </form>
      </div>

      {/* 음성 재생 상태 표시 */}
      {isSpeaking && (
        <div className="speaking-status">
          <SpeakingIndicator />
        </div>
      )}
    </div>
  );
};

export default ChatInterface;