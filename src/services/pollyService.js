import AWS from 'aws-sdk';

// AWS 설정
const configureAWS = () => {
  AWS.config.update({
    region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
  });

  // AWS SDK 설정 상태 검증
  if (!process.env.REACT_APP_AWS_ACCESS_KEY_ID || !process.env.REACT_APP_AWS_SECRET_ACCESS_KEY) {
    console.error('AWS 인증 정보가 설정되지 않았습니다. .env 파일을 확인하세요.');
    return false;
  }
  return true;
};

// Polly 서비스 인스턴스 생성
const createPolly = () => {
  if (!configureAWS()) {
    return null;
  }
  return new AWS.Polly({ apiVersion: '2016-06-10' });
};

// 텍스트를 음성으로 변환
export const synthesizeSpeech = async (text, voiceId = 'Seoyeon') => {
  try {
    const polly = createPolly();
    if (!polly) {
      throw new Error('Polly 서비스 초기화에 실패했습니다.');
    }

    // 텍스트가 없거나 너무 긴 경우 처리
    if (!text || text.length === 0) {
      throw new Error('변환할 텍스트가 없습니다.');
    }

    // Amazon Polly는 한 번에 최대 3000자까지 처리 가능
    const maxLength = 3000;
    if (text.length > maxLength) {
      console.warn(`텍스트가 너무 깁니다. 처음 ${maxLength}자만 변환합니다.`);
      text = text.substring(0, maxLength);
    }

    // Polly 요청 파라미터 설정
    const params = {
      OutputFormat: 'mp3',
      SampleRate: '22050',
      Text: text,
      TextType: 'text',
      VoiceId: voiceId, // 한국어: 'Seoyeon'
      Engine: 'neural' // 뉴럴 엔진 사용 (더 자연스러운 음성)
    };

    console.log(`Amazon Polly 요청 중... (텍스트 길이: ${text.length}자, 음성: ${voiceId})`);

    // Polly API 호출
    const data = await polly.synthesizeSpeech(params).promise();

    if (data.AudioStream) {
      // AudioStream을 Blob으로 변환
      const uInt8Array = new Uint8Array(data.AudioStream);
      const blob = new Blob([uInt8Array], { type: 'audio/mpeg' });

      // Blob에서 URL 생성
      const url = URL.createObjectURL(blob);
      return { url, blob };
    } else {
      throw new Error('오디오 스트림을 받지 못했습니다.');
    }
  } catch (error) {
    console.error('음성 합성 중 오류 발생:', error);
    throw error;
  }
};

// 오디오 재생 함수
export const playAudio = (audioUrl) => {
  return new Promise((resolve, reject) => {
    try {
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        resolve(); // 오디오 재생 완료 시 Promise 해결
      };

      audio.onerror = (error) => {
        console.error('오디오 재생 오류:', error);
        reject(error); // 오류 발생 시 Promise 거부
      };

      // 오디오 재생 시작
      audio.play()
        .catch(error => {
          console.error('오디오 재생 시작 실패:', error);
          reject(error);
        });

      return audio; // 오디오 객체 반환 (필요 시 제어 가능)
    } catch (error) {
      console.error('오디오 객체 생성 오류:', error);
      reject(error);
    }
  });
};

// 텍스트를 음성으로 변환하고 재생
export const speakText = async (text, voiceId = 'Seoyeon') => {
  try {
    const { url } = await synthesizeSpeech(text, voiceId);
    return await playAudio(url);
  } catch (error) {
    console.error('텍스트 음성 변환 및 재생 중 오류:', error);
    throw error;
  }
};