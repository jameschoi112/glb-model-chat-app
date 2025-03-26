// src/services/openaiVoiceService.js
import axios from 'axios';

// OpenAI API 설정
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
const TEXT_API_URL = 'https://api.openai.com/v1/chat/completions';
const SPEECH_API_URL = 'https://api.openai.com/v1/audio/speech';

// API 키가 설정되어 있는지 확인
if (!OPENAI_API_KEY) {
  console.error('OpenAI API 키가 설정되지 않았습니다. .env 파일에 REACT_APP_OPENAI_API_KEY를 설정해주세요.');
}

// OpenAI GPT-4o를 사용하여 챗봇 응답 생성
export const generateAIResponse = async (messageHistory) => {
  try {
    // messageHistory가 배열인지 확인
    if (!Array.isArray(messageHistory)) {
      throw new Error('메시지 기록은 배열이어야 합니다.');
    }

    // 시스템 메시지가 없을 경우 추가
    let messages = [...messageHistory];
    if (!messages.some(msg => msg.role === 'system')) {
      messages.unshift({
        role: 'system',
        content: 'you are helpful ai assistant'
      });
    }

    const response = await axios.post(
      TEXT_API_URL,
      {
        model: 'gpt-4o', // GPT-4o 모델 사용
        messages: messages,
        max_tokens: 500, // 응답 길이 제한
        temperature: 0.7, // 창의성 조절 (0.0 ~ 1.0)
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );

    // API 응답에서 AI 메시지 추출
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API 호출 중 오류 발생:', error);

    // 오류 발생 시 기본 응답
    if (error.response) {
      console.error('API 응답 오류:', error.response.data);
    }

    throw new Error('AI 응답을 생성하는 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'));
  }
};

// OpenAI TTS API를 사용하여 텍스트를 음성으로 변환 (Promise 반환)
export const speakText = async (text, voice = 'nova') => {
  try {
    console.log(`음성 생성 요청: ${voice} 음성으로 "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}" 변환 시작`);

    const response = await axios.post(
      SPEECH_API_URL,
      {
        model: 'tts-1', // 기본 TTS 모델
        input: text,
        voice: voice, // 'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer' 중 선택
        response_format: 'mp3',
        speed: 1.0, // 음성 속도 (0.25 ~ 4.0)
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        responseType: 'arraybuffer', // 바이너리 데이터로 응답 받기
      }
    );

    console.log('음성 생성 API 응답 받음');

    // ArrayBuffer를 Blob으로 변환하여 오디오 객체 생성
    const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(audioBlob);

    // 오디오 객체 생성
    const audio = new Audio(audioUrl);

    // 오디오 프리로드 시작
    audio.preload = 'auto';

    // Promise로 감싸서 반환 - 더 이상 여기서 이벤트 핸들러를 직접 설정하지 않음
    return audio;
  } catch (error) {
    console.error('OpenAI TTS API 호출 중 오류 발생:', error);

    if (error.response) {
      try {
        // ArrayBuffer를 텍스트로 변환하여 오류 메시지 확인
        const errorMessage = new TextDecoder().decode(error.response.data);
        console.error('API 응답 오류:', errorMessage);
      } catch (decodeError) {
        console.error('오류 메시지 디코딩 실패:', decodeError);
      }
    }

    throw new Error('음성 합성 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'));
  }
};