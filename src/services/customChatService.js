import axios from 'axios';

// 기본 API 설정
const BASE_URL = 'https://aichat.metadium.club'; // HTTPS로 변경
const API_TOKEN = '7e07068a844902578ede8b7330ef51a67ee935937ac188d041b7a112d8d013da';

// 세션 ID 저장
let currentSessionId = null;

// 세션 초기화 (챗봇 세션 생성) - 로그 추가
export const initializeSession = async () => {
  try {
    console.log('세션 초기화 시작');

    const response = await axios.post(
      `${BASE_URL}/api/token-chat/init/`,
      {}, // 빈 객체 전송
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${API_TOKEN}`,
        },
      }
    );

    console.log('세션 초기화 응답:', response);

    // 응답에서 세션 ID 저장
    if (response.data && response.data.session_id) {
      currentSessionId = response.data.session_id;
      console.log('세션 초기화 성공:', currentSessionId);
      return currentSessionId;
    } else {
      console.error('유효한 세션 ID를 받지 못했습니다:', response.data);
      throw new Error('유효한 세션 ID를 받지 못했습니다.');
    }
  } catch (error) {
    console.error('세션 초기화 중 오류 발생:', error.response || error);
    throw new Error('챗봇 세션을 초기화하는 중 문제가 발생했습니다.');
  }
};

// 대체 메서드 - URL 파라미터로 토큰 전달하는 함수
export const sendMessageWithToken = async (message, onContentChunk, onSuggestedQuestions, onDone, onError) => {
  try {
    // 세션이 없으면 초기화 - 이 부분 개선
    if (!currentSessionId) {
      try {
        await initializeSession();

        // 세션 ID가 여전히 없으면 오류 처리
        if (!currentSessionId) {
          throw new Error('세션 ID를 받아오지 못했습니다.');
        }
      } catch (initError) {
        console.error('세션 초기화 실패:', initError);
        if (onError) {
          onError(new Error('챗봇 세션을 초기화하는 중 문제가 발생했습니다.'));
        }
        return null;
      }
    }

    // 인코딩된 메시지로 URL 생성 - 토큰을 쿼리 파라미터로 추가
    const encodedMessage = encodeURIComponent(message);
    const streamUrl = `${BASE_URL}/api/chat/sessions/${currentSessionId}/stream/?message=${encodedMessage}&token=${API_TOKEN}`;

    console.log('스트리밍 요청 URL 생성:', streamUrl); // 디버깅용 로그

    // SSE 연결 생성 (토큰을 URL에 포함)
    const eventSource = new EventSource(streamUrl);

    // 응답 전체 텍스트를 저장할 변수
    let fullResponse = '';

    // 다양한 이벤트 처리
    eventSource.onmessage = (event) => {
      try {
        console.log('SSE 이벤트 수신:', event.data);
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'message_id':
            // 새 메시지 ID 수신 (필요시 저장)
            console.log('새 메시지 ID:', data.message_id);
            break;

          case 'content':
            // 콘텐츠 청크 수신
            fullResponse += data.content;
            if (onContentChunk) {
              onContentChunk(data.content, fullResponse);
            }
            break;

          case 'suggested_questions':
            // 추천 질문 수신
            console.log('추천 질문 수신:', data.suggested_questions);
            if (onSuggestedQuestions) {
              onSuggestedQuestions(data.suggested_questions || []);
            }
            break;

          case 'done':
            // 스트리밍 완료
            console.log('스트리밍 완료:', fullResponse);
            if (onDone) {
              onDone(fullResponse);
            }
            eventSource.close();
            break;

          case 'error':
            // 오류 발생
            console.error('API 응답 오류:', data.error);
            if (onError) {
              onError(new Error(data.error || '응답 생성 중 오류가 발생했습니다.'));
            }
            eventSource.close();
            break;

          default:
            console.log('알 수 없는 이벤트 타입:', data.type);
        }
      } catch (e) {
        console.error('SSE 이벤트 처리 중 오류:', e, '원본 데이터:', event.data);
        if (onError) {
          onError(e);
        }
      }
    };

    // 연결 오류 처리
    eventSource.onerror = (error) => {
      console.error('SSE 연결 오류:', error);
      if (onError) {
        onError(error || new Error('서버 연결에 문제가 발생했습니다.'));
      }
      eventSource.close();
    };

    // 연결 성공 처리
    eventSource.onopen = () => {
      console.log('SSE 연결 성공');
    };

    // EventSource 객체 반환 (호출자가 필요시 닫을 수 있도록)
    return eventSource;
  } catch (error) {
    console.error('메시지 전송 중 오류 발생:', error);
    if (onError) {
      onError(error);
    }
    throw error;
  }
};

// 원래 메서드 - 헤더에 토큰 전달 (CORS 이슈가 있을 수 있음)
export const sendMessageStream = async (message, onContentChunk, onSuggestedQuestions, onDone, onError) => {
  try {
    // 대체 메서드 호출로 전환
    return await sendMessageWithToken(message, onContentChunk, onSuggestedQuestions, onDone, onError);

    /* 원래 코드는 주석 처리
    // 세션이 없으면 초기화
    if (!currentSessionId) {
      await initializeSession();
    }

    // 인코딩된 메시지로 URL 생성
    const encodedMessage = encodeURIComponent(message);
    const streamUrl = `${BASE_URL}/api/chat/sessions/${currentSessionId}/stream/?message=${encodedMessage}`;

    // SSE 연결 생성
    const eventSource = new EventSource(streamUrl, {
      headers: {
        'Authorization': `Token ${API_TOKEN}`,
      },
    });

    // 응답 전체 텍스트를 저장할 변수
    let fullResponse = '';

    // 다양한 이벤트 처리
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'message_id':
            // 새 메시지 ID 수신 (필요시 저장)
            console.log('새 메시지 ID:', data.message_id);
            break;

          case 'content':
            // 콘텐츠 청크 수신
            fullResponse += data.content;
            if (onContentChunk) {
              onContentChunk(data.content, fullResponse);
            }
            break;

          case 'suggested_questions':
            // 추천 질문 수신
            if (onSuggestedQuestions) {
              onSuggestedQuestions(data.suggested_questions || []);
            }
            break;

          case 'done':
            // 스트리밍 완료
            if (onDone) {
              onDone(fullResponse);
            }
            eventSource.close();
            break;

          case 'error':
            // 오류 발생
            console.error('API 응답 오류:', data.error);
            if (onError) {
              onError(new Error(data.error || '응답 생성 중 오류가 발생했습니다.'));
            }
            eventSource.close();
            break;

          default:
            console.log('알 수 없는 이벤트 타입:', data.type);
        }
      } catch (e) {
        console.error('SSE 이벤트 처리 중 오류:', e);
        if (onError) {
          onError(e);
        }
      }
    };

    // 연결 오류 처리
    eventSource.onerror = (error) => {
      console.error('SSE 연결 오류:', error);
      if (onError) {
        onError(error || new Error('서버 연결에 문제가 발생했습니다.'));
      }
      eventSource.close();
    };

    // EventSource 객체 반환 (호출자가 필요시 닫을 수 있도록)
    return eventSource;
    */
  } catch (error) {
    console.error('메시지 전송 중 오류 발생:', error);
    if (onError) {
      onError(error);
    }
    throw error;
  }
};

// 비동기 방식 메시지 전송 API 사용 (스트리밍 외 대안)
export const sendMessageAsync = async (message) => {
  try {
    // 세션이 없으면 초기화
    if (!currentSessionId) {
      await initializeSession();
    }

    // 토큰과 함께 메시지 전송
    const response = await axios.post(
      `${BASE_URL}/api/token-chat/message/${currentSessionId}/`,
      { message },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${API_TOKEN}`,
        },
      }
    );

    // process_id 받기
    const processId = response.data.process_id;

    console.log('비동기 메시지 전송 성공, process ID:', processId);

    // 처리 상태를 폴링으로 확인
    return await pollForResult(processId);
  } catch (error) {
    console.error('비동기 메시지 전송 중 오류 발생:', error);
    throw new Error('메시지 전송 중 문제가 발생했습니다.');
  }
};

// 결과 폴링 함수
const pollForResult = async (processId, maxAttempts = 20, delay = 1000) => {
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const response = await axios.get(
        `${BASE_URL}/api/chat/process/${processId}/`,
        {
          headers: {
            'Authorization': `Token ${API_TOKEN}`,
          },
        }
      );

      const { status, response: result, suggested_questions } = response.data;

      if (status === 'completed') {
        return { result, suggested_questions };
      } else if (status === 'error') {
        throw new Error('응답 생성 중 오류가 발생했습니다.');
      }

      // 처리 중인 경우 대기 후 재시도
      await new Promise(resolve => setTimeout(resolve, delay));
      attempts++;
    } catch (error) {
      console.error('결과 폴링 중 오류 발생:', error);
      throw new Error('응답 확인 중 문제가 발생했습니다.');
    }
  }

  throw new Error('응답 시간이 초과되었습니다.');
};

// 간소화된 메시지 전송 함수 (Promise 기반)
export const sendMessage = (message) => {
  return new Promise((resolve, reject) => {
    let fullResponse = '';

    sendMessageStream(
      message,
      (chunk, accumulated) => {
        fullResponse = accumulated;
      },
      null, // 추천 질문 무시
      () => {
        resolve(fullResponse); // 완료시 전체 응답 반환
      },
      (error) => {
        reject(error); // 오류 발생시 거부
      }
    );
  });
};

// 세션 재설정 함수
export const resetSession = async () => {
  currentSessionId = null;
  return await initializeSession();
};