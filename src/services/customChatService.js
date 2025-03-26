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

    // 응답에서 세션 ID 저장 - id 필드 사용
    if (response.data && response.data.id) {
      currentSessionId = response.data.id;
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

// 스트리밍 대신 HTTP 폴링 메서드 사용 (SSE 연결 문제 해결)
export const sendMessageWithPolling = async (message, onContentChunk, onSuggestedQuestions, onDone, onError) => {
  try {
    // 세션이 없으면 초기화
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

    console.log('메시지 폴링 방식으로 전송 시작:', message);

    // 토큰과 함께 메시지 전송 (비동기 메서드 사용)
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
    console.log('메시지 전송 성공, process ID:', processId);

    // 폴링 시작
    let attempts = 0;
    const maxAttempts = 30;
    const delay = 800; // 800ms 간격으로 폴링
    let fullResponse = '';
    let isDone = false;

    // 폴링 함수
    const pollResult = async () => {
      while (attempts < maxAttempts && !isDone) {
        try {
          const pollResponse = await axios.get(
            `${BASE_URL}/api/chat/process/${processId}/`,
            {
              headers: {
                'Authorization': `Token ${API_TOKEN}`,
              },
            }
          );

          const { status, response: result, suggested_questions } = pollResponse.data;

          if (status === 'completed') {
            console.log('응답 생성 완료:', result);

            // 완성된 응답을 전달
            fullResponse = result;

            if (onContentChunk) {
              onContentChunk(result, result);
            }

            if (onSuggestedQuestions && suggested_questions) {
              onSuggestedQuestions(suggested_questions);
            }

            if (onDone) {
              onDone(result);
            }

            isDone = true;
            return;
          } else if (status === 'error') {
            console.error('응답 생성 중 오류 발생');
            if (onError) {
              onError(new Error('응답 생성 중 오류가 발생했습니다.'));
            }
            isDone = true;
            return;
          } else if (status === 'processing') {
            console.log('응답 생성 중...', attempts);
            // 생성 중인 경우 계속 대기
          }

          // 처리 중인 경우 대기 후 재시도
          await new Promise(resolve => setTimeout(resolve, delay));
          attempts++;
        } catch (error) {
          console.error('결과 폴링 중 오류 발생:', error);
          if (onError) {
            onError(new Error('응답 확인 중 문제가 발생했습니다.'));
          }
          isDone = true;
          return;
        }
      }

      if (!isDone) {
        console.error('응답 시간 초과');
        if (onError) {
          onError(new Error('응답 시간이 초과되었습니다.'));
        }
      }
    };

    // 폴링 시작
    pollResult();

    // 폴링 컨트롤러 객체 (이벤트 소스와 비슷한 인터페이스 제공)
    return {
      close: () => {
        isDone = true;
        console.log('폴링 요청 종료');
      }
    };
  } catch (error) {
    console.error('메시지 전송 중 오류 발생:', error);
    if (onError) {
      onError(error);
    }
    throw error;
  }
};

// 원래 스트리밍 메서드 (폴링 메서드로 대체)
export const sendMessageStream = async (message, onContentChunk, onSuggestedQuestions, onDone, onError) => {
  try {
    // 폴링 메서드로 대체
    return await sendMessageWithPolling(message, onContentChunk, onSuggestedQuestions, onDone, onError);
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