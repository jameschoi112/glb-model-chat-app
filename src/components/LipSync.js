import { useState, useEffect, useRef } from 'react';

// 영어 발음 패턴에 따른 간소화된 모핑 타겟 매핑
const englishPhonemeMapping = {
  // 모음 (Vowels)
  'a': { mouthOpen: 0.9, mouthSmile: 0.3 },  // 'a' as in 'father'
  'e': { mouthOpen: 0.5, mouthSmile: 0.6 },  // 'e' as in 'bed'
  'i': { mouthOpen: 0.3, mouthSmile: 0.7 },  // 'i' as in 'sit'
  'o': { mouthOpen: 0.7, mouthSmile: 0.2 },  // 'o' as in 'hot'
  'u': { mouthOpen: 0.6, mouthSmile: 0.2 },  // 'u' as in 'put'

  // 이중 모음 (Diphthongs)
  'ai': { mouthOpen: 0.7, mouthSmile: 0.5 },  // 'i' as in 'bite'
  'ei': { mouthOpen: 0.6, mouthSmile: 0.6 },  // 'a' as in 'say'
  'ou': { mouthOpen: 0.5, mouthSmile: 0.3 },  // 'o' as in 'go'
  'au': { mouthOpen: 0.8, mouthSmile: 0.2 },  // 'ow' as in 'now'
  'oi': { mouthOpen: 0.6, mouthSmile: 0.4 },  // 'oy' as in 'boy'

  // 자음 (Consonants)
  'b': { mouthOpen: 0.3, mouthSmile: 0.2 },  // 'b' as in 'boy'
  'p': { mouthOpen: 0.2, mouthSmile: 0.2 },  // 'p' as in 'pen'
  'm': { mouthOpen: 0.1, mouthSmile: 0.3 },  // 'm' as in 'mom'
  'f': { mouthOpen: 0.3, mouthSmile: 0.2 },  // 'f' as in 'fun'
  'v': { mouthOpen: 0.3, mouthSmile: 0.2 },  // 'v' as in 'van'
  'th': { mouthOpen: 0.4, mouthSmile: 0.2 },  // 'th' as in 'think'
  'l': { mouthOpen: 0.5, mouthSmile: 0.4 },  // 'l' as in 'lip'
  'r': { mouthOpen: 0.4, mouthSmile: 0.3 },  // 'r' as in 'run'
  's': { mouthOpen: 0.3, mouthSmile: 0.5 },  // 's' as in 'sit'
  'z': { mouthOpen: 0.3, mouthSmile: 0.5 },  // 'z' as in 'zip'
  'sh': { mouthOpen: 0.3, mouthSmile: 0.2 },  // 'sh' as in 'ship'
  'ch': { mouthOpen: 0.5, mouthSmile: 0.2 },  // 'ch' as in 'chip'
  'j': { mouthOpen: 0.5, mouthSmile: 0.3 },  // 'j' as in 'jam'
  'k': { mouthOpen: 0.6, mouthSmile: 0.2 },  // 'k' as in 'kit'
  'g': { mouthOpen: 0.6, mouthSmile: 0.2 },  // 'g' as in 'go'
  'n': { mouthOpen: 0.3, mouthSmile: 0.3 },  // 'n' as in 'no'
  'ng': { mouthOpen: 0.4, mouthSmile: 0.2 },  // 'ng' as in 'sing'
  't': { mouthOpen: 0.5, mouthSmile: 0.3 },  // 't' as in 'top'
  'd': { mouthOpen: 0.5, mouthSmile: 0.3 },  // 'd' as in 'dog'
  'w': { mouthOpen: 0.3, mouthSmile: 0.2 },  // 'w' as in 'win'
  'y': { mouthOpen: 0.3, mouthSmile: 0.6 },  // 'y' as in 'yes'
  'h': { mouthOpen: 0.5, mouthSmile: 0.2 }  // 'h' as in 'hat'
};

// 한국어 발음 패턴에 따른 간소화된 모핑 타겟 매핑
const koreanPhonemeMapping = {
  // 모음
  'ㅏ': { mouthOpen: 0.8, mouthSmile: 0.3 },       // 'a'
  'ㅓ': { mouthOpen: 0.7, mouthSmile: 0.2 },       // 'eo'
  'ㅗ': { mouthOpen: 0.6, mouthSmile: 0.2 },       // 'o'
  'ㅜ': { mouthOpen: 0.5, mouthSmile: 0.2 },       // 'u'
  'ㅡ': { mouthOpen: 0.3, mouthSmile: 0.3 },       // 'eu'
  'ㅣ': { mouthOpen: 0.3, mouthSmile: 0.7 },       // 'i'
  'ㅔ': { mouthOpen: 0.5, mouthSmile: 0.6 },       // 'e'
  'ㅐ': { mouthOpen: 0.6, mouthSmile: 0.5 },       // 'ae'

  // 이중 모음
  'ㅘ': { mouthOpen: 0.7, mouthSmile: 0.3 },       // 'wa'
  'ㅝ': { mouthOpen: 0.6, mouthSmile: 0.2 },       // 'wo'
  'ㅚ': { mouthOpen: 0.5, mouthSmile: 0.5 },       // 'oe'
  'ㅟ': { mouthOpen: 0.4, mouthSmile: 0.6 },       // 'wi'
  'ㅢ': { mouthOpen: 0.4, mouthSmile: 0.4 },       // 'ui'

  // 자음
  'ㄱ': { mouthOpen: 0.5, mouthSmile: 0.3 },       // 'g/k'
  'ㄴ': { mouthOpen: 0.4, mouthSmile: 0.3 },       // 'n'
  'ㄷ': { mouthOpen: 0.5, mouthSmile: 0.3 },       // 'd/t'
  'ㄹ': { mouthOpen: 0.4, mouthSmile: 0.4 },       // 'r/l'
  'ㅁ': { mouthOpen: 0.3, mouthSmile: 0.3 },       // 'm'
  'ㅂ': { mouthOpen: 0.3, mouthSmile: 0.2 },       // 'b/p'
  'ㅅ': { mouthOpen: 0.3, mouthSmile: 0.5 },       // 's'
  'ㅈ': { mouthOpen: 0.4, mouthSmile: 0.3 },       // 'j'
  'ㅊ': { mouthOpen: 0.5, mouthSmile: 0.3 },       // 'ch'
  'ㅋ': { mouthOpen: 0.6, mouthSmile: 0.2 },       // 'k'
  'ㅌ': { mouthOpen: 0.5, mouthSmile: 0.2 },       // 't'
  'ㅍ': { mouthOpen: 0.4, mouthSmile: 0.2 },       // 'p'
  'ㅎ': { mouthOpen: 0.5, mouthSmile: 0.2 }        // 'h'
};

// 표정 표현을 위한 간소화된 모핑 매핑
const expressionMapping = {
  'happy': { mouthSmile: 0.9, mouthOpen: 0.3 },
  'friendly': { mouthSmile: 0.7, mouthOpen: 0.2 },
  'curious': { mouthSmile: 0.4, mouthOpen: 0.4 },
  'thoughtful': { mouthSmile: 0.3, mouthOpen: 0.2 },
  'surprised': { mouthSmile: 0.3, mouthOpen: 0.8 },
  'emphasis': { mouthSmile: 0.5, mouthOpen: 0.5 }
};

// 주요 단어/구문에 따른 추가 표정 변화
const wordExpressionMapping = {
  'good': 'happy',
  'great': 'happy',
  'wonderful': 'happy',
  'amazing': 'surprised',
  'awesome': 'happy',
  'excellent': 'happy',
  'hello': 'friendly',
  'hi': 'friendly',
  'welcome': 'friendly',
  'thank': 'friendly',
  'please': 'friendly',
  'sorry': 'thoughtful',
  'why': 'curious',
  'how': 'curious',
  'what': 'curious',
  'where': 'curious',
  'when': 'curious',
  'who': 'curious',
  'which': 'curious',
  'could': 'thoughtful',
  'would': 'thoughtful',
  'should': 'thoughtful',
  'maybe': 'thoughtful',
  'perhaps': 'thoughtful',
  'interesting': 'curious',
  'wow': 'surprised',
  'oh': 'surprised',
  'yes': 'happy',
  'sure': 'friendly',
  'absolutely': 'happy',
  'definitely': 'emphasis',
  'important': 'emphasis',
  '?': 'curious',
  '!': 'surprised'
};

// 기본 웃는 표정 세팅
const defaultSmileSettings = {
  mouthSmile: 0.3,
  mouthOpen: 0.1
};

const useLipSync = (text, isSpeaking = false) => {
  const [lipSyncData, setLipSyncData] = useState({
    morphTargets: { ...defaultSmileSettings },
    intensity: 0.3,
    expression: 'friendly'
  });
  const [currentExpression, setCurrentExpression] = useState('friendly');
  const [expressionHistory, setExpressionHistory] = useState(['friendly', 'happy']);

  // 애니메이션 프레임 ID와 마운트 상태를 추적하기 위한 ref
  const animationFrameRef = useRef(null);
  const isMountedRef = useRef(true);

  // 텍스트에서 감정/표현 분석
  const analyzeExpression = (text) => {
    if (!text) return 'friendly';

    const lowerText = text.toLowerCase();

    // 텍스트에서 특정 단어 발견 시 표정 매핑
    let foundExpression = 'friendly';
    let highestPriority = 0;

    // 우선순위 매핑 (높을수록 우선)
    const expressionPriority = {
      'surprised': 5,
      'happy': 4,
      'curious': 3,
      'emphasis': 2,
      'thoughtful': 1,
      'friendly': 0
    };

    // 단어별 표정 확인
    Object.entries(wordExpressionMapping).forEach(([word, expression]) => {
      if (lowerText.includes(word)) {
        const priority = expressionPriority[expression] || 0;
        if (priority > highestPriority) {
          highestPriority = priority;
          foundExpression = expression;
        }
      }
    });

    // 추가 패턴 검사
    if (lowerText.includes('!') && expressionPriority['surprised'] > highestPriority) {
      foundExpression = 'surprised';
    } else if (lowerText.includes('?') && expressionPriority['curious'] > highestPriority) {
      foundExpression = 'curious';
    } else if ((lowerText.includes('happy') || lowerText.includes('glad') ||
               lowerText.includes('pleasure') || lowerText.includes('smile') ||
               lowerText.includes('좋') || lowerText.includes('기쁘')) &&
               expressionPriority['happy'] > highestPriority) {
      foundExpression = 'happy';
    }

    return foundExpression;
  };

  // 텍스트에서 발음 구분
  const getPhonemes = (text) => {
    if (!text) return [];

    // 언어 감지
    const isEnglish = /[a-zA-Z]/.test(text);
    const phonemeMapping = isEnglish ? englishPhonemeMapping : koreanPhonemeMapping;

    let phonemes = [];
    if (isEnglish) {
      // 영어 텍스트 처리
      const words = text.toLowerCase().split(/\s+/);

      for (const word of words) {
        let i = 0;
        while (i < word.length) {
          let found = false;

          // 2자 발음 확인 (th, sh, ch 등)
          if (i < word.length - 1) {
            const digraph = word.substring(i, i + 2).toLowerCase();
            if (['th', 'sh', 'ch', 'ng', 'ai', 'ei', 'ou', 'au', 'oi'].includes(digraph)) {
              // 단어 내 위치에 따라 강도 조절 (첫/마지막 글자 강조)
              const positionFactor = (i === 0 || i >= word.length - 2) ? 1.2 : 1.0;
              const emphasis = word.length <= 3 ? 1.2 : 1.0; // 짧은 단어 강조

              const phonemeData = {
                char: digraph,
                ...phonemeMapping[digraph],
                // 단어 위치 정보 추가
                wordStart: i === 0,
                wordEnd: i >= word.length - 2,
                emphasis: positionFactor * emphasis
              };

              phonemes.push(phonemeData);
              i += 2;
              found = true;
              continue;
            }
          }

          // 1자 발음 확인
          if (!found && i < word.length) {
            const char = word[i].toLowerCase();
            if (/[a-z]/.test(char)) {
              // 단어 내 위치에 따라 강도 조절
              const positionFactor = (i === 0 || i === word.length - 1) ? 1.2 : 1.0;
              const emphasis = word.length <= 3 ? 1.2 : 1.0; // 짧은 단어 강조

              const phonemeData = {
                char,
                ...(phonemeMapping[char] || {}),
                // 단어 위치 정보 추가
                wordStart: i === 0,
                wordEnd: i === word.length - 1,
                emphasis: positionFactor * emphasis
              };

              phonemes.push(phonemeData);
            }
            i++;
          }
        }

        // 단어 사이에 공백 발음 추가 (입을 약간 다물고 미소)
        phonemes.push({
          char: ' ',
          mouthOpen: 0.1,
          mouthSmile: 0.35,
          isSpace: true
        });
      }
    } else {
      // 한글 텍스트 처리
      const chars = Array.from(text);

      for (let i = 0; i < chars.length; i++) {
        const char = chars[i];

        // 한글 음절 확인
        if (/[가-힣]/.test(char)) {
          // 자모 분해 (실제로는 더 정교한 알고리즘 필요)
          // 여기서는 예시로 첫 자음, 중성 모음 정도만 추출
          const charCode = char.charCodeAt(0) - 0xAC00;
          const consonantIndex = Math.floor(charCode / 28 / 21);
          const vowelIndex = Math.floor((charCode / 28) % 21);

          // 자음과 모음 매핑을 찾아 적용
          const consonantKey = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'][consonantIndex] || 'ㄱ';
          const vowelKey = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'][vowelIndex] || 'ㅏ';

          // 위치 강조 효과
          const positionFactor = (i === 0 || i === chars.length - 1) ? 1.3 : 1.0;

          // 자음 추가
          phonemes.push({
            char: consonantKey,
            ...(phonemeMapping[consonantKey] || {}),
            wordStart: i === 0,
            emphasis: positionFactor
          });

          // 모음 추가 (모음은 더 강조)
          phonemes.push({
            char: vowelKey,
            ...(phonemeMapping[vowelKey] || {}),
            emphasis: positionFactor * 1.2
          });
        } else if (char === ' ') {
          // 공백 처리 - 미소 유지
          phonemes.push({
            char: ' ',
            mouthOpen: 0.1,
            mouthSmile: 0.35,
            isSpace: true
          });
        } else {
          // 한글이 아닌 경우 (공백, 특수문자 등)
          phonemes.push({ char });
        }
      }
    }

    return phonemes;
  };

  // 립싱크 데이터 생성
  const generateLipSyncData = (currentIndex, phonemes, expression, baseSpeakingIntensity, isSpace) => {
    // 현재 발음 가져오기
    const currentPhoneme = phonemes[currentIndex] || {};

    // 모핑 타겟 초기화 (기본값은 웃는 표정)
    const morphTargets = {
      // 기본 웃는 표정 설정
      ...defaultSmileSettings
    };

    // 현재 발음에 따른 모핑 타겟 적용
    if (isSpeaking) {
      // 발음 모핑 타겟 적용 전에 강조 효과 반영
      const emphasis = currentPhoneme.emphasis || 1.0;

      // 모든 발음 관련 모핑 타겟에 강조 효과 적용
      if (currentPhoneme.mouthOpen !== undefined) {
        morphTargets.mouthOpen = currentPhoneme.mouthOpen * baseSpeakingIntensity * emphasis;
      }

      if (currentPhoneme.mouthSmile !== undefined) {
        morphTargets.mouthSmile = currentPhoneme.mouthSmile * baseSpeakingIntensity * emphasis;
      }

      // 항상 웃으면서 말하기 위한 추가 처리
      if (!isSpace) {
        morphTargets.mouthSmile = Math.max(morphTargets.mouthSmile, 0.4);
      }
    }

    // 감정 표현 적용 (가중치 부여)
    const currentExpressionMap = expressionMapping[expression] || expressionMapping.friendly;
    const expressionWeight = isSpeaking ? 0.8 : 0.9;

    // 표정에 따른 입 모양 적용
    morphTargets.mouthOpen = Math.max(
      morphTargets.mouthOpen,
      (currentExpressionMap.mouthOpen || 0) * expressionWeight
    );

    morphTargets.mouthSmile = Math.max(
      morphTargets.mouthSmile,
      (currentExpressionMap.mouthSmile || 0) * expressionWeight
    );

    // 자연스러운 변화를 위한 랜덤 변동성
    const addRandomVariation = (value, range = 0.05) => {
      return value + (Math.random() * range * 2 - range);
    };

    // 모핑 타겟에 약간의 랜덤성 추가
    morphTargets.mouthOpen = Math.max(0, Math.min(1, addRandomVariation(morphTargets.mouthOpen)));
    morphTargets.mouthSmile = Math.max(0, Math.min(1, addRandomVariation(morphTargets.mouthSmile)));

    // 입 모양 조정 - 너무 크게 웃으면서 입 벌리는 것 방지
    if (morphTargets.mouthSmile > 0.7 && morphTargets.mouthOpen > 0.7) {
      // 둘 중 하나 감소
      morphTargets.mouthOpen *= 0.8;
    }

    return {
      morphTargets,
      intensity: baseSpeakingIntensity + (Math.random() * 0.2 - 0.1),
      expression
    };
  };

  useEffect(() => {
    // 컴포넌트 마운트 시 설정
    isMountedRef.current = true;

    // 마지막 감정 변화 시간, 애니메이션 상태 등을 추적하기 위한 변수들
    const animationState = {
      currentIndex: 0,
      lastUpdateTime: Date.now(),
      lastExpressionChange: Date.now(),
      emotionCounter: 0,
      expression: analyzeExpression(text)
    };

    // 감정 분석 및 기록 업데이트
    if (text) {
      const expression = isSpeaking ? analyzeExpression(text) : 'friendly';
      animationState.expression = expression;

      setCurrentExpression(expression);
      setExpressionHistory(prev => {
        const newHistory = [...prev, expression];
        return newHistory.length > 5 ? newHistory.slice(-5) : newHistory;
      });
    }

    // 말하지 않을 때는 기본 표정만 설정
    if (!text || !isSpeaking) {
      setLipSyncData({
        morphTargets: { ...defaultSmileSettings },
        intensity: 0.3,
        expression: 'friendly'
      });
      return;
    }

    // 텍스트를 발음으로 분석
    const phonemes = getPhonemes(text);
    if (phonemes.length === 0) return;

    // 립싱크 애니메이션 프레임 함수
    const animate = () => {
      if (!isMountedRef.current) return;

      const now = Date.now();
      const elapsed = now - animationState.lastUpdateTime;

      // 발음 인덱스 업데이트 (일정 시간마다)
      const baseSpeed = 80; // ms
      if (elapsed > baseSpeed && phonemes.length > 0 && isSpeaking) {
        animationState.currentIndex = (animationState.currentIndex + 1) % phonemes.length;
        animationState.lastUpdateTime = now;
      }

      // 감정 변화 주기 확인
      animationState.emotionCounter++;
      const expressionInterval = 5000; // 5초

      if (now - animationState.lastExpressionChange > expressionInterval ||
          animationState.emotionCounter % 100 === 0) {
        if (Math.random() < 0.4 || animationState.emotionCounter % 100 === 0) {
          // 주로 웃는 표정 위주로 변화
          const happyExpressions = ['happy', 'friendly', 'emphasis'];
          const otherExpressions = ['curious', 'thoughtful', 'surprised'];
          const expressionPool = Math.random() < 0.8 ? happyExpressions :
                               [...happyExpressions, ...otherExpressions];

          if (Math.random() < 0.6 && expressionHistory.length > 0) {
            // 기존 표정 기록에서 선택
            const randomHistoryIndex = Math.floor(Math.random() * expressionHistory.length);
            animationState.expression = expressionHistory[randomHistoryIndex];
          } else {
            // 새로운 표정 선택
            animationState.expression = expressionPool[Math.floor(Math.random() * expressionPool.length)];
          }

          animationState.lastExpressionChange = now;
        }
      }

      // 현재 발음이 공백인지 확인
      const isSpace = phonemes[animationState.currentIndex]?.isSpace || false;

      // 립싱크 데이터 생성 및 업데이트
      const baseSpeakingIntensity = isSpeaking ? 0.85 : 0.3;
      const newLipSyncData = generateLipSyncData(
        animationState.currentIndex,
        phonemes,
        animationState.expression,
        baseSpeakingIntensity,
        isSpace
      );

      // 상태 업데이트
      setLipSyncData(newLipSyncData);

      // 다음 프레임 요청 (정리 가능하도록 참조 저장)
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // 애니메이션 시작
    animationFrameRef.current = requestAnimationFrame(animate);

    // 정리 함수: 컴포넌트 언마운트 시 애니메이션 중지
    return () => {
      isMountedRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [text, isSpeaking]); // 의존성 배열 유지 - 이 값들이 변경될 때만 효과 실행

  return { lipSyncData, currentExpression };
};

export default useLipSync;