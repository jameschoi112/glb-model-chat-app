
import { useState, useEffect } from 'react';

const useLipSync = (text, isSpeaking = false) => {
  const [lipSyncData, setLipSyncData] = useState(null);

  useEffect(() => {
    // text가 없거나 isSpeaking이 false면 립싱크 중지
    if (!text || !isSpeaking) {
      setLipSyncData({ intensity: 0 });
      return;
    }

    let isMounted = true;

    // 립싱크 시뮬레이션
    const simulateLipSync = async () => {
      // 한국어 모음과 자음에 따른 입 벌림 강도 정의
      const koreanVowels = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
      const wideVowels = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅝ', 'ㅞ', 'ㅟ']; // 입을 크게 벌리는 모음
      const narrowVowels = ['ㅓ', 'ㅗ', 'ㅜ', 'ㅠ', 'ㅡ', 'ㅢ']; // 입을 작게 벌리는 모음
      const closeVowels = ['ㅣ']; // 입을 거의 다물고 발음하는 모음

      // 영어 모음
      const englishWideVowels = ['a', 'o', 'e']; // 크게 벌리는 모음
      const englishNarrowVowels = ['i', 'u']; // 작게 벌리는 모음
      const englishConsonants = ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'q', 'r', 's', 't', 'v', 'w', 'x', 'y', 'z'];

      // 특정 발음 조합
      const lipPatterns = {
        'th': 0.3,  // 'th' 발음은 혀를 앞으로 내밀기
        'ch': 0.35, // 'ch' 발음은 입을 약간 앞으로 내밀기
        'sh': 0.3,  // 'sh' 발음은 입술을 둥글게
        'r': 0.25,  // 'r' 발음은 입술을 약간 둥글게
        'w': 0.4,   // 'w' 발음은 입술을 둥글게 오므리기
        'f': 0.25,  // 'f' 발음은 아랫입술을 윗니에 붙이기
        'v': 0.25   // 'v' 발음도 아랫입술을 윗니에 붙이기
      };

      // 말하는 속도 조절
      let isEnglish = /[a-zA-Z]/.test(text);
      const charDuration = isEnglish ? 80 : 60; // 속도 약간 더 빠르게 조정

      // 텍스트 처리
      let units = [];
      if (isEnglish) {
        // 영어는 단어 단위로 나누고 각 문자 처리
        const words = text.split(/\s+/);
        for (const word of words) {
          // 각 단어의 문자들
          for (const char of word) {
            units.push(char);
          }
          units.push(' '); // 단어 사이에 공백 추가
        }
      } else {
        // 한글 및 기타 언어는 문자 단위 처리
        units = text.split('');
      }

      // 불규칙적인 입 움직임을 위한 변동성 추가
      const addVariation = (value, range = 0.1) => {
        return value + (Math.random() * range * 2 - range);
      };

      // 립싱크 강도 계수
      const intensityFactor = isEnglish ? 1.0 : 1.2;

      // 랜덤한 기본 립싱크 애니메이션 시작
      if (isMounted) {
        // 기본 무작위 립싱크 애니메이션 - 더 자주 업데이트
        const randomLipSync = () => {
          if (!isMounted) return;

          const baseIntensity = 0.5;
          const randomVariation = Math.random() * 0.5;
          const intensity = baseIntensity * intensityFactor + randomVariation;

          setLipSyncData({ intensity });

          // 립싱크 강도 빠른 변화 (40-80ms)
          const nextUpdate = 40 + Math.random() * 40;
          setTimeout(randomLipSync, nextUpdate);
        };

        randomLipSync();
      }
    };

    simulateLipSync();

    // 컴포넌트 언마운트나 의존성 변경 시 정리
    return () => {
      isMounted = false;
      setLipSyncData({ intensity: 0 });
    };
  }, [text, isSpeaking]);

  return { lipSyncData, isSpeaking };
};

export default useLipSync;