import axios from 'axios';

// 기본 API 설정
const BASE_URL = 'http://aichat.metadium.club';
const API_TOKEN = '7e07068a844902578ede8b7330ef51a67ee935937ac188d041b7a112d8d013da';

// 세션 ID 저장
let currentSessionId = null;

// 세션 초기화 (챗봇 세션 생성)
export const initializeSession = async () => {
  try {
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

    // 응답에서 세션 ID 저장
    currentSessionId = response.data.session_id;
    console.log('세션 초기화 성공:', currentSessionId);
    return currentSessionId;
  } catch (error) {
    console.error('세션 초기화 중 오류 발생:', error);
    throw new Error('챗봇 세션을 초기화하는 중 문제가 발생했습니다.');
  }
};

// 메시지 전송 및 응답 스트리밍 처리
export const sendMessageStream = async (message, onContentChunk, onSuggestedQuestions, onDone, onError) => {
  try {
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
  } catch (error) {
    console.error('메시지 전송 중 오류 발생:', error);
    if (onError) {
      onError(error);
    }
    throw error;
  }
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