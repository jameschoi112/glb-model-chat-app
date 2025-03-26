import axios from 'axios';

// 기본 API 설정
const BASE_URL = 'https://aichat.metadium.club';
const API_TOKEN = '7e07068a844902578ede8b7330ef51a67ee935937ac188d041b7a112d8d013da';

// 세션 ID 저장
let currentSessionId = null;

// 세션 초기화 (챗봇 세션 생성)
export const initializeSession = async () => {
  try {
    console.log('세션 초기화 시작');

    const response = await axios.post(
      `${BASE_URL}/api/token-chat/init/`,
      {}, // 빈 객체 전송
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${API_TOKEN.trim()}`, // 공백 제거
        },
      }
    );

    console.log('세션 초기화 응답:', response);

    // 응답에서 세션 ID 저장
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

// Fetch API를 사용한 SSE 스트리밍 구현
export const sendMessageStream = async (message, onContentChunk, onSuggestedQuestions, onDone, onError) => {
  try {
    // 세션이 없으면 초기화
    if (!currentSessionId) {
      try {
        await initializeSession();
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

    // 인코딩된 메시지로 URL 생성
    const encodedMessage = encodeURIComponent(message);
    const streamUrl = `${BASE_URL}/api/chat/sessions/${currentSessionId}/stream/?message=${encodedMessage}`;

    console.log('스트리밍 요청 URL 생성:', streamUrl);
    console.log('Authorization 헤더:', `Token ${API_TOKEN}`);

    // AbortController 생성 (요청 중단을 위해)
    const controller = new AbortController();
    const signal = controller.signal;

    let fullResponse = '';
    let isStreamingComplete = false;

    // fetch API를 사용하여 스트리밍 요청
    fetch(streamUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${API_TOKEN}`,
        'Accept': 'text/event-stream'
      },
      signal
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP 에러! 상태: ${response.status}, ${response.statusText}`);
      }

      // 스트림 읽기 설정
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // 청크를 읽고 처리하는 함수
      function readChunk() {
        if (isStreamingComplete) return;

        reader.read().then(({ done, value }) => {
          if (done) {
            console.log('스트리밍 완료 (EOF)');
            if (!isStreamingComplete && onDone) {
              onDone(fullResponse);
              isStreamingComplete = true;
            }
            return;
          }

          // 바이너리 데이터를 텍스트로 변환
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // 전체 이벤트를 찾아 처리
          const events = buffer.split('\n\n');
          buffer = events.pop() || ''; // 마지막 불완전한 이벤트는 버퍼에 유지

          // 각 이벤트 처리
          for (const event of events) {
            if (!event.trim()) continue;

            // data: 접두사 제거 및 파싱
            const lines = event.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.substring(6);
                try {
                  const parsedData = JSON.parse(data);
                  console.log('SSE 이벤트 수신:', parsedData);

                  switch (parsedData.type) {
                    case 'message_id':
                      console.log('새 메시지 ID:', parsedData.message_id);
                      break;

                    case 'content':
                      fullResponse += parsedData.content;
                      if (onContentChunk) {
                        onContentChunk(parsedData.content, fullResponse);
                      }
                      break;

                    case 'suggested_questions':
                      console.log('추천 질문 수신:', parsedData.suggested_questions);
                      if (onSuggestedQuestions) {
                        onSuggestedQuestions(parsedData.suggested_questions || []);
                      }
                      break;

                    case 'done':
                      console.log('스트리밍 완료:', fullResponse);
                      if (onDone) {
                        onDone(fullResponse);
                        isStreamingComplete = true;
                      }
                      controller.abort(); // 연결 종료
                      return;

                    case 'error':
                      console.error('API 응답 오류:', parsedData.error);
                      if (onError) {
                        onError(new Error(parsedData.error || '응답 생성 중 오류가 발생했습니다.'));
                        isStreamingComplete = true;
                      }
                      controller.abort(); // 연결 종료
                      return;

                    default:
                      console.log('알 수 없는 이벤트 타입:', parsedData.type);
                  }
                } catch (e) {
                  console.error('SSE 데이터 파싱 오류:', e, data);
                }
              }
            }
          }

          // 다음 청크 읽기 (재귀)
          if (!isStreamingComplete) {
            readChunk();
          }
        }).catch(error => {
          if (signal.aborted) {
            console.log('사용자에 의해 스트리밍이 중단되었습니다.');
            return;
          }

          console.error('스트림 읽기 오류:', error);
          if (!isStreamingComplete && onError) {
            onError(error);
            isStreamingComplete = true;
          }
        });
      }

      // 처리 시작
      readChunk();
    })
    .catch(error => {
      console.error('Fetch 요청 오류:', error);
      if (!isStreamingComplete && onError) {
        onError(error);
        isStreamingComplete = true;
      }
    });

    // 연결 종료 메서드를 가진 컨트롤러 객체 반환 (EventSource와 유사한 인터페이스)
    return {
      close: () => {
        if (!isStreamingComplete) {
          console.log('스트리밍 연결 종료 요청됨');
          controller.abort();
          isStreamingComplete = true;
        }
      }
    };
  } catch (error) {
    console.error('메시지 전송 준비 중 오류 발생:', error);
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