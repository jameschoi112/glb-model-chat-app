// src/services/speechRecognitionService.js
const startSpeechRecognition = (onResult, onEnd, onError) => {
  // 브라우저 지원 확인
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    if (onError) {
      onError(new Error('Speech recognition is not supported in this browser'));
    }
    return null;
  }

  try {
    // 모바일 환경 감지
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // 음성 인식 인스턴스 생성
    const recognition = new SpeechRecognition();

    // 모바일 최적화 설정
    recognition.continuous = false; // 모바일에서는 단일 인식이 더 안정적
    recognition.interimResults = isMobile ? false : true; // 모바일에서는 최종 결과만 받기
    recognition.lang = 'ko-KR';

    // 모바일에서는 타임아웃 설정
    if (isMobile) {
      recognition.maxAlternatives = 1;
      // 안드로이드 크롬에서 음성 인식 시간 제한
      setTimeout(() => {
        try {
          if (recognition) {
            recognition.stop();
          }
        } catch (e) {
          console.log('Recognition already stopped');
        }
      }, 10000); // 10초 제한
    }

    // 이벤트 핸들러 설정
    recognition.onresult = (event) => {
      try {
        const result = event.results[0];
        const transcript = result[0].transcript;
        const isFinal = result.isFinal;

        if (onResult) {
          onResult(transcript, isFinal);
        }
      } catch (err) {
        console.error('Recognition result error:', err);
      }
    };

    recognition.onend = () => {
      if (onEnd) {
        onEnd();
      }
    };

    recognition.onerror = (event) => {
      if (onError) {
        onError(new Error(`Speech recognition error: ${event.error}`));
      }
    };

    // 약간의 지연 후 시작 (모바일에서 더 안정적)
    setTimeout(() => {
      try {
        recognition.start();
      } catch (err) {
        console.error('Recognition start error:', err);
        if (onError) {
          onError(err);
        }
      }
    }, isMobile ? 300 : 0);

    return recognition;

  } catch (error) {
    if (onError) {
      onError(error);
    }
    return null;
  }
};

// 음성 인식 중지 함수
const stopSpeechRecognition = (recognitionInstance) => {
  if (recognitionInstance) {
    try {
      recognitionInstance.stop();
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
  }
};

// 두 함수 모두 명시적으로 내보내기
export { startSpeechRecognition, stopSpeechRecognition };