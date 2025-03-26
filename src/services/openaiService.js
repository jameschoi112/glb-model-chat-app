// src/services/openaiService.js
import axios from 'axios';

// OpenAI API 설정
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
const API_URL = 'https://api.openai.com/v1/chat/completions';

// API 키가 설정되어 있는지 확인
if (!OPENAI_API_KEY) {
  console.error('OpenAI API 키가 설정되지 않았습니다. .env 파일에 REACT_APP_OPENAI_API_KEY를 설정해주세요.');
}

// OpenAI GPT-4o를 사용하여 챗봇 응답 생성
export const generateAIResponse = async (messages) => {
  try {
    const response = await axios.post(
      API_URL,
      {
        model: 'gpt-4o', // GPT-4o 모델 사용
        messages: messages,
        max_tokens: 300, // 응답 길이 제한
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

    return '죄송합니다, 응답을 생성하는 중에 문제가 발생했습니다. 다시 시도해 주세요.';
  }
};