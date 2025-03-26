// App.js with custom API integration and background change detection
import React, { useState, useEffect, useRef } from 'react';
import ModelViewer from './components/ModelViewer';
import ChatInterface from './components/ChatInterface';
import DateTimeDisplay from './components/DateTimeDisplay';
import AdminPanel from './components/AdminPanel';
import WelcomePopup from './components/WelcomePopup';
import useLipSync from './components/LipSync';
import { initializeSession, sendMessageStream, resetSession } from './services/customChatService';
import { speakText } from './services/openaiVoiceService'; // TTS는 기존 서비스 재사용
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
  const [secondModelPath, setSecondModelPath] = useState('model5'); // 두 번째 모델 경로
  const [secondModelPosition, setSecondModelPosition] = useState([0.8, -0.8, 0]); // 두 번째 모델 위치
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [microphoneAccess, setMicrophoneAccess] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [sessionInitialized, setSessionInitialized] = useState(false);

  // 현재 활성화된 스트리밍 연결 참조
  const activeStreamRef = useRef(null);

  // 음성 인식 인스턴스 참조
  const recognitionRef = useRef(null);

  // isSpeaking 상태를 립싱크 훅에 전달
  const { lipSyncData } = useLipSync(currentMessage, isSpeaking);

  const audioRef = useRef(null);
  const welcomeMessageRef = useRef('Hello, I am your avatar. How can I help you?');

  // 배경 변경 명령 감지 함수
  const detectEnvironmentChangeCommand = (userMessage, aiResponse) => {
    // 사용자 메시지에서 배경 변경 의도 확인
    const backgroundChangeRequests = {
      '밤': /밤.*바꿔|배경.*밤|(밤|저녁|야간).*변경|밤.*설정|꺼줄래|어둡게|불.*꺼/i,
      '석양': /석양.*바꿔|배경.*석양|노을.*변경|석양.*설정/i,
      '아침': /아침.*바꿔|배경.*아침|새벽.*변경|아침.*설정|dawn.*변경/i,
      '기본': /기본.*바꿔|배경.*기본|주간.*변경|낮.*설정|기본.*배경|밝게/i
    };

    // 사용자 메시지에서 배경 변경 요청 확인
    let requestedBackground = null;
    for (const [bgType, pattern] of Object.entries(backgroundChangeRequests)) {
      if (pattern.test(userMessage.toLowerCase())) {
        requestedBackground = bgType === '기본' ? 'default' : bgType;
        break;
      }
    }

    // AI 응답에서 긍정적인 답변 확인 (변경을 승인하는 내용)
    const positiveResponse = /네|알겠|변경|바꿨|적용|완료|했어요|준비|바꾸|설정/i.test(aiResponse);

    // 배경 변경 요청이 있고 AI가 긍정적으로 응답했다면 배경 변경
    if (requestedBackground && positiveResponse) {
      console.log(`배경 변경 요청 감지: ${requestedBackground}`);

      // 여기에서 실제 배경을 변경
      if (requestedBackground === 'default') {
        handleChangeBackground('default');
      } else if (requestedBackground === '밤') {
        handleChangeBackground('night');
      } else if (requestedBackground === '석양') {
        handleChangeBackground('sunset');
      } else if (requestedBackground === '아침') {
        handleChangeBackground('dawn');
      }
    }
  };

  // 페이지 로드 시 초기화 작업
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const mobileRegex = /android|iphone|ipad|ipod|blackberry|kindle|silk|opera mini/i;
      setIsMobile(mobileRegex.test(userAgent) || window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    // 세션 초기화 및 모델 로드 시뮬레이션
    const setupApp = async () => {
      try {
        // 챗봇 세션 초기화 시도
        const sessionId = await initializeSession();
        console.log('App 초기화 - 세션 ID 획득:', sessionId);
        setSessionInitialized(true);

        // 모델 로딩 시뮬레이션
        setTimeout(() => {
          setIsLoading(false);
          // 로딩 완료 후 웰컴 팝업 표시
          setShowWelcomePopup(true);
        }, 2000);
      } catch (error) {
        console.error('앱 초기화 중 오류 발생:', error);
        // 오류가 있어도 UI는 표시
        setTimeout(() => {
          setIsLoading(false);
          setShowWelcomePopup(true);
        }, 2000);
      }
    };

    setupApp();

    return () => {
      window.removeEventListener('resize', checkMobile);

      // 오디오 정리
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
        audioRef.current = null;
      }

      // 진행 중인 스트리밍 연결 종료
      if (activeStreamRef.current) {
        activeStreamRef.current.close();
        activeStreamRef.current = null;
      }

      // 음성 인식 정리
      stopSpeechRecognition(recognitionRef.current);
    };
  }, []);

  // 세션 재설정 함수
  const handleResetSession = async () => {
    try {
      if (activeStreamRef.current) {
        activeStreamRef.current.close();
        activeStreamRef.current = null;
      }

      const sessionId = await resetSession();
      console.log('세션 재설정 완료:', sessionId);
      setSessionInitialized(true);
      return true;
    } catch (error) {
      console.error('세션 재설정 실패:', error);
      setSessionInitialized(false);
      return false;
    }
  };

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
      const currentAudio = audioRef.current;
      const currentSrc = currentAudio.src;

      // 일단 정지시키고
      currentAudio.pause();

      // src가 유효한 경우에만 revoke
      if (currentSrc && currentSrc.startsWith('blob:')) {
        URL.revokeObjectURL(currentSrc);
      }

      audioRef.current = null;
    }

    // 메시지는 설정하되, 아직 립싱크는 활성화하지 않음
    setCurrentMessage(text);
    setIsSpeaking(false); // 처음에는 립싱크 비활성화

    console.log("음성 합성 시작:", text);

    // 음성 재생용 오디오 객체 생성
    const voice = 'onyx'; // 남성 음성 사용
    audioRef.current = await speakText(text, voice);
    const audio = audioRef.current; // 지역 변수에 저장하여 이벤트 핸들러 내에서 안전하게 참조

    // 오디오 로딩 상태 관련 이벤트
    audio.addEventListener('canplay', () => {
      console.log("오디오 재생 준비 완료");
    });

    // 오디오 재생 시작 이벤트 - 이때 립싱크 활성화
    audio.addEventListener('play', () => {
      console.log("오디오 재생 시작됨 - 립싱크 활성화");
      setIsSpeaking(true); // 오디오 재생이 실제로 시작될 때 립싱크 활성화
    });

    // 오디오 재생 완료 이벤트
    audio.addEventListener('ended', () => {
      console.log("음성 재생 완료");
      setIsSpeaking(false); // 립싱크 비활성화

      // 이 시점에서 audio.src가 존재하는지 확인
      if (audio.src && audio.src.startsWith('blob:')) {
        URL.revokeObjectURL(audio.src);
      }

      // 이 시점에서 audioRef.current가 아직 이 오디오 객체를 참조하는 경우에만 null로 설정
      if (audioRef.current === audio) {
        audioRef.current = null;
      }
    });

    // 오디오 재생 오류 처리
    audio.addEventListener('error', (error) => {
      console.error('오디오 재생 오류:', error);
      setIsSpeaking(false); // 립싱크 비활성화

      // 이 시점에서 audio.src가 존재하는지 확인
      if (audio.src && audio.src.startsWith('blob:')) {
        URL.revokeObjectURL(audio.src);
      }

      // 이 시점에서 audioRef.current가 아직 이 오디오 객체를 참조하는 경우에만 null로 설정
      if (audioRef.current === audio) {
        audioRef.current = null;
      }
    });

    // 오디오 일시정지 이벤트
    audio.addEventListener('pause', () => {
      console.log("오디오 일시정지됨");
      setIsSpeaking(false); // 립싱크 비활성화
    });

    // 이벤트 리스너 설정 후 오디오 재생 시작
    // 실제 재생은 브라우저가 오디오를 준비한 후 시작됨
    audio.play().catch(error => {
      console.error('오디오 재생 시작 오류:', error);
      setIsSpeaking(false);
    });
  } catch (error) {
    console.error('음성 재생 중 오류 발생:', error);
    setIsSpeaking(false);
  }
};

  // 커스텀 API를 사용하여 메시지 전송 및 응답 처리
  const handleSendMessage = async (message) => {
    try {
      // 세션이 초기화되지 않았다면 다시 시도
      if (!sessionInitialized) {
        console.log('세션이 초기화되지 않음, 세션 재설정 시도');
        const resetSuccess = await handleResetSession();
        if (!resetSuccess) {
          throw new Error('세션을 초기화할 수 없습니다. 페이지를 새로고침 해주세요.');
        }
      }

      // 음성 인식 중이라면 중지
      if (isListening) {
        stopSpeechRecognition(recognitionRef.current);
        setIsListening(false);
      }

      // 이전 음성 재생 중이면 중지
      if (audioRef.current) {
          const currentAudio = audioRef.current;
          const currentSrc = currentAudio.src;

          currentAudio.pause();

          if (currentSrc && currentSrc.startsWith('blob:')) {
            URL.revokeObjectURL(currentSrc);
          }

          audioRef.current = null;
          setIsSpeaking(false);
        }

      // 진행 중인 스트리밍 연결 종료
      if (activeStreamRef.current) {
        activeStreamRef.current.close();
        activeStreamRef.current = null;
      }

      // 사용자 메시지 기록 추가
      const userMessage = { role: 'user', content: message };
      const updatedHistory = [...messageHistory, userMessage];
      setMessageHistory(updatedHistory);

      // 응답 생성 중임을 표시
      setCurrentMessage('응답을 생성하는 중...');

      // 로딩 상태 메시지 추가
      const loadingMessage = { role: 'assistant', content: '응답을 생성하는 중...' };
      setMessageHistory([...updatedHistory, loadingMessage]);

      // 응답 누적을 위한 변수
      let accumulatedResponse = '';
      let voiceSynthesisQueued = false; // 음성 합성 예약 여부
      let botResponseAdded = true; // 이미 초기 로딩 메시지를 추가했으므로 true로 설정

      console.log('메시지 전송 시작:', message);

      // 스트리밍 응답 처리 시작
      const eventSource = await sendMessageStream(
        message,
        // 콘텐츠 청크 처리 콜백
        (chunk, accumulated) => {
          console.log('청크 수신:', chunk);
          accumulatedResponse = accumulated;

          // 메시지 기록의 마지막 항목 업데이트
          const assistantMessage = { role: 'assistant', content: accumulated };
          setMessageHistory(prev => {
            const newHistory = [...prev];
            newHistory[newHistory.length - 1] = assistantMessage;
            return newHistory;
          });

          // 현재 메시지 업데이트 (립싱크용)
          setCurrentMessage(accumulated);

          // 배경 변경 명령 감지 및 처리
          detectEnvironmentChangeCommand(message, accumulated);

          // 일정 길이 이상의 텍스트가 모이면 음성 합성 예약
          if (accumulated.length > 50 && !voiceSynthesisQueued && !isSpeaking) {
            voiceSynthesisQueued = true;

            // 약간의 지연 후 음성 합성 시작 (더 많은 텍스트가 모이도록)
            setTimeout(() => {
              // 음성 합성 시작
              handleSpeech(accumulated);
            }, 800);
          }
        },
        // 추천 질문 처리 콜백
        (questions) => {
          console.log('추천 질문 수신:', questions);
          setSuggestedQuestions(questions);
        },
        // 완료 처리 콜백
        (finalResponse) => {
          // 최종 응답 처리
          console.log('응답 완료:', finalResponse);

          // 아직 음성 합성이 시작되지 않았다면 최종 응답으로 음성 합성 및 재생
          if (!voiceSynthesisQueued) {
            handleSpeech(finalResponse);
          }
          // 이미 음성 합성이 시작됐고 현재 재생 중이라면 업데이트하지 않음
          else if (!isSpeaking) {
            // 재생 중이 아니면 최신 응답으로 음성 합성
            handleSpeech(finalResponse);
          }

          // 스트리밍 참조 제거
          activeStreamRef.current = null;
        },
        // 오류 처리 콜백
        (error) => {
          console.error('응답 생성 중 오류 발생:', error);
          const errorMessage = '죄송합니다, 응답을 생성하는 중에 문제가 발생했습니다.';

          // 오류 메시지 기록 추가
          const errorResponse = { role: 'assistant', content: errorMessage };
          setMessageHistory(prev => {
            const newHistory = [...prev];
            newHistory[newHistory.length - 1] = errorResponse;
            return newHistory;
          });

          setCurrentMessage(errorMessage);

          // 오류 메시지도 음성으로 변환
          handleSpeech(errorMessage);

          // 스트리밍 참조 제거
          activeStreamRef.current = null;
        }
      );

      // 활성 스트리밍 참조 저장
      activeStreamRef.current = eventSource;

      // 챗인터페이스에서 사용할 응답 객체 반환
      return {
        id: `bot-response-${updatedHistory.length}`,
        text: '응답을 생성하는 중...',
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

  // 추천 질문 선택 처리
  const handleSuggestedQuestionClick = (question) => {
    // 추천 질문을 메시지로 전송
    handleSendMessage(question);
    // 질문 목록 초기화
    setSuggestedQuestions([]);
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

  // 두 번째 모델 위치 변경 핸들러 (필요한 경우 사용)
  const handleSecondModelPositionChange = (newPosition) => {
    console.log('두 번째 모델 위치 변경:', newPosition);
    setSecondModelPosition(newPosition);
  };

  return (
    <div className={`app background-${background}`}>
      {isLoading ? (
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <div className="loading-message">
            Loading 3D models and AI capabilities...
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
              secondModelPath={`/models/${secondModelPath}.glb`}
              secondModelPosition={secondModelPosition}
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

            {/* 추천 질문 UI */}
            {suggestedQuestions.length > 0 && (
              <div className="suggested-questions">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    className="suggested-question-btn"
                    onClick={() => handleSuggestedQuestionClick(question)}
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 음성 인식 중일 때 인식 텍스트 표시 (디버깅용, 필요 시 활성화) */}
          {isListening && transcript && (
            <div className="transcript-container">
              <p>{transcript}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;