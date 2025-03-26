// App.js with voice recognition integration
import React, { useState, useEffect, useRef } from 'react';
import ModelViewer from './components/ModelViewer';
import ChatInterface from './components/ChatInterface';
import DateTimeDisplay from './components/DateTimeDisplay';
import AdminPanel from './components/AdminPanel';
import WelcomePopup from './components/WelcomePopup';
import useLipSync from './components/LipSync';
import { generateAIResponse, speakText } from './services/openaiVoiceService';
import { startSpeechRecognition, stopSpeechRecognition } from './services/speechRecognitionService';
import './App.css';

function App() {
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [messageHistory, setMessageHistory] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [background, setBackground] = useState('default');
  const [currentModel, setCurrentModel] = useState('model1');
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [microphoneAccess, setMicrophoneAccess] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  // 음성 인식 인스턴스 참조
  const recognitionRef = useRef(null);

  // isSpeaking 상태를 립싱크 훅에 전달
  const { lipSyncData } = useLipSync(currentMessage, isSpeaking);

  const audioRef = useRef(null);
  const welcomeMessageRef = useRef('Hello! I\'m your Avatar Assistant');

  // 페이지 로드 시 모바일 여부 감지
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const mobileRegex = /android|iphone|ipad|ipod|blackberry|kindle|silk|opera mini/i;
      setIsMobile(mobileRegex.test(userAgent) || window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    // 모델 로딩 시뮬레이션
    const timer = setTimeout(() => {
      setIsLoading(false);
      // 로딩 완료 후 웰컴 팝업 표시
      setShowWelcomePopup(true);
    }, 2000);

    return () => {
      window.removeEventListener('resize', checkMobile);
      clearTimeout(timer);

      // 오디오 정리
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
        audioRef.current = null;
      }

      // 음성 인식 정리
      stopSpeechRecognition(recognitionRef.current);
    };
  }, []);

  // 음성 인식 시작 함수
  const startVoiceRecognition = () => {
  // 이미 듣고 있다면 중지
  if (isListening) {
    stopSpeechRecognition(recognitionRef.current);
    setIsListening(false);
    setTranscript('');
    return;
  }

  // 모바일 환경 감지
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // 모바일에서는 특별 처리
  if (isMobile) {
    // 먼저 사용자에게 안내
    if (!microphoneAccess) {
      alert("음성 인식을 시작합니다. 마이크 권한 요청이 표시되면 '허용'을 눌러주세요.");
    }

    // 약간의 지연 후 권한 요청 (모바일에서 더 안정적)
    setTimeout(() => {
      navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(() => {
          setMicrophoneAccess(true);

          // 권한 획득 성공 후 약간의 지연
          setTimeout(() => {
            initializeVoiceRecognition();
          }, 300);
        })
        .catch(error => {
          console.error('모바일 마이크 접근 권한이 거부되었습니다:', error);
          alert('음성 인식을 위해서는 마이크 접근 권한이 필요합니다. 브라우저 설정에서 권한을 허용해주세요.');
        });
    }, 300);
  } else {
    // 데스크톱에서는 기존 방식대로
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => {
        setMicrophoneAccess(true);
        initializeVoiceRecognition();
      })
      .catch(error => {
        console.error('마이크 접근 권한이 거부되었습니다:', error);
        alert('음성 인식을 위해서는 마이크 접근 권한이 필요합니다.');
      });
  }
};

  // 음성 인식 초기화 함수
  const initializeVoiceRecognition = () => {
    // 이미 듣고 있다면 중지
    if (isListening) {
      stopSpeechRecognition(recognitionRef.current);
      setIsListening(false);
      setTranscript('');
      return;
    }

    setIsListening(true);
    setTranscript('');

    // 결과 처리 콜백
    const handleResult = (text, isFinal) => {
      setTranscript(text);

      // 최종 결과가 아니면 계속 듣기
      if (!isFinal) return;

      // 최종 결과가 나오면 음성 인식 중지 및 메시지 처리
      if (text.trim()) {
        handleSendMessage(text.trim());
      }

      stopSpeechRecognition(recognitionRef.current);
      setIsListening(false);
      setTranscript('');
    };

    // 종료 처리 콜백
    const handleEnd = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    // 오류 처리 콜백
    const handleError = (error) => {
      console.error('음성 인식 오류:', error);
      setIsListening(false);
      setTranscript('');
    };

    // 음성 인식 시작
    recognitionRef.current = startSpeechRecognition(
      handleResult,
      handleEnd,
      handleError
    );
  };

  // 마이크 접근 허용 후 환영 메시지 처리
  const handleActivateVoice = () => {
    setMicrophoneAccess(true);
    setShowWelcomePopup(false);

    // 초기 메시지 기록 추가
    const welcomeMessage = welcomeMessageRef.current;
    setCurrentMessage(welcomeMessage);

    setMessageHistory([
      {
        role: 'assistant',
        content: welcomeMessage
      }
    ]);

    // 환영 메시지 음성 재생
    handleSpeech(welcomeMessage);
  };

  // 웰컴 팝업 닫기 (마이크 없이 계속하기)
  const handleCloseWelcomePopup = () => {
    setShowWelcomePopup(false);

    // 마이크 없이 텍스트만 사용하는 경우에도 초기 메시지는 표시
    const welcomeMessage = welcomeMessageRef.current;
    setCurrentMessage(welcomeMessage);

    setMessageHistory([
      {
        role: 'assistant',
        content: welcomeMessage
      }
    ]);
  };

  // 텍스트를 음성으로 변환하고 재생하는 함수
  const handleSpeech = async (text) => {
    try {
      // 이전 오디오가 재생 중이면 중지
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
        audioRef.current = null;
      }

      // 메시지는 설정하되, 아직 립싱크는 활성화하지 않음
      setCurrentMessage(text);
      setIsSpeaking(false); // 처음에는 립싱크 비활성화

      console.log("음성 합성 시작:", text);

      // 음성 재생용 오디오 객체 생성
      const voice = 'onyx'; // 남성 음성 사용
      audioRef.current = await speakText(text, voice);

      // 오디오 로딩 상태 관련 이벤트
      audioRef.current.addEventListener('canplay', () => {
        console.log("오디오 재생 준비 완료");
      });

      // 오디오 재생 시작 이벤트 - 이때 립싱크 활성화
      audioRef.current.addEventListener('play', () => {
        console.log("오디오 재생 시작됨 - 립싱크 활성화");
        setIsSpeaking(true); // 오디오 재생이 실제로 시작될 때 립싱크 활성화
      });

      // 오디오 재생 완료 이벤트
      audioRef.current.addEventListener('ended', () => {
        console.log("음성 재생 완료");
        setIsSpeaking(false); // 립싱크 비활성화
        URL.revokeObjectURL(audioRef.current.src);
        audioRef.current = null;
      });

      // 오디오 재생 오류 처리
      audioRef.current.addEventListener('error', (error) => {
        console.error('오디오 재생 오류:', error);
        setIsSpeaking(false); // 립싱크 비활성화
        URL.revokeObjectURL(audioRef.current.src);
        audioRef.current = null;
      });

      // 오디오 일시정지 이벤트
      audioRef.current.addEventListener('pause', () => {
        console.log("오디오 일시정지됨");
        setIsSpeaking(false); // 립싱크 비활성화
      });

      // 이벤트 리스너 설정 후 오디오 재생 시작
      // 실제 재생은 브라우저가 오디오를 준비한 후 시작됨
      audioRef.current.play().catch(error => {
        console.error('오디오 재생 시작 오류:', error);
        setIsSpeaking(false);
      });
    } catch (error) {
      console.error('음성 재생 중 오류 발생:', error);
      setIsSpeaking(false);
    }
  };

  // OpenAI API를 사용하여 응답 생성
  const handleSendMessage = async (message) => {
    try {
      // 음성 인식 중이라면 중지
      if (isListening) {
        stopSpeechRecognition(recognitionRef.current);
        setIsListening(false);
      }

      // 이전 음성 재생 중이면 중지
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
        audioRef.current = null;
        setIsSpeaking(false);
      }

      // 사용자 메시지 기록 추가
      const userMessage = { role: 'user', content: message };
      const updatedHistory = [...messageHistory, userMessage];
      setMessageHistory(updatedHistory);

      // AI 응답 생성 중임을 표시
      setCurrentMessage('응답을 생성하는 중...');

      // OpenAI API 호출
      const aiResponse = await generateAIResponse(updatedHistory);

      // AI 응답 기록 추가
      const assistantMessage = { role: 'assistant', content: aiResponse };
      setMessageHistory([...updatedHistory, assistantMessage]);

      // AI 응답을 음성으로 변환하여 재생
      handleSpeech(aiResponse);

      return {
        id: `bot-response-${updatedHistory.length}`,
        text: aiResponse,
        sender: 'bot'
      };
    } catch (error) {
      console.error('메시지 처리 중 오류 발생:', error);
      const errorMessage = '죄송합니다, 응답을 생성하는 중에 문제가 발생했습니다.';

      // 오류 메시지 기록 추가
      const errorResponse = { role: 'assistant', content: errorMessage };
      setMessageHistory([...messageHistory, { role: 'user', content: message }, errorResponse]);

      setCurrentMessage(errorMessage);

      // 오류 메시지도 음성으로 변환
      handleSpeech(errorMessage);

      return {
        id: `error-response-${messageHistory.length}`,
        text: errorMessage,
        sender: 'bot'
      };
    }
  };

  // 배경 변경 핸들러
  const handleChangeBackground = (newBackground) => {
    console.log('배경 변경:', newBackground);
    setBackground(newBackground);
  };

  // 모델 변경 핸들러
  const handleChangeModel = (newModel) => {
    console.log('모델 변경:', newModel);
    setCurrentModel(newModel);
  };

  return (
    <div className={`app background-${background}`}>
      {isLoading ? (
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <div className="loading-message">
            Loading 3D model and AI capabilities...
          </div>
        </div>
      ) : (
        <>
          {showWelcomePopup && (
            <WelcomePopup
              onActivate={handleActivateVoice}
              onClose={handleCloseWelcomePopup}
            />
          )}

          <div className="model-container">
            <ModelViewer
              lipSyncData={lipSyncData}
              background={background}
              modelPath={`/models/${currentModel}.glb`}
              isSpeaking={isSpeaking}
            />
          </div>

          <DateTimeDisplay />

          <AdminPanel
            onChangeBackground={handleChangeBackground}
            onChangeModel={handleChangeModel}
          />

          <div className="chat-ui-container">
            <ChatInterface
              onSendMessage={handleSendMessage}
              onStartVoiceInput={startVoiceRecognition}
              isSpeaking={isSpeaking}
              isListening={isListening}
              initialMessages={messageHistory.map((msg, index) => ({
                id: `${msg.role}-${index}`,
                text: msg.content,
                sender: msg.role === 'assistant' ? 'bot' : 'user'
              }))}
            />
          </div>

          {/* 음성 인식 중일 때 인식 텍스트 표시 (디버깅용, 필요 시 활성화) */}
          {/* {isListening && transcript && (
            <div className="transcript-container">
              <p>{transcript}</p>
            </div>
          )} */}
        </>
      )}
    </div>
  );
}

export default App;