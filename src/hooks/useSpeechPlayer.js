import { useState, useEffect, useRef } from 'react';

const useSpeechPlayer = () => {
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const audioRef = useRef(null);
  const queuedAudioRef = useRef(null); // 대기 중인 오디오 참조

  // 음성 URL 설정 및 재생 시작
  const playAudio = (url) => {
    if (!url) return;

    // 현재 재생 중인 오디오가 있다면 정리
    if (audioRef.current && isPlaying) {
      // 기존 오디오 재생이 진행 중일 때는 새 요청을 대기열에 추가하고 반환
      queuedAudioRef.current = url;
      return;
    }

    // 이전 오디오가 있다면 정리
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    // 새 오디오 설정
    setAudioUrl(url);
    setIsReady(false);

    audioRef.current = new Audio(url);

    // 이벤트 리스너 설정
    audioRef.current.addEventListener('canplaythrough', () => {
      setIsReady(true);
    });

    audioRef.current.addEventListener('play', () => {
      setIsPlaying(true);
    });

    audioRef.current.addEventListener('pause', () => {
      setIsPlaying(false);
    });

    audioRef.current.addEventListener('ended', () => {
      console.log('오디오 재생 완료');
      setIsPlaying(false);
      setProgress(0);
      setIsReady(false);

      // URL 객체 메모리 해제
      URL.revokeObjectURL(url);
      setAudioUrl(null);
      audioRef.current = null;

      // 대기 중인 오디오가 있다면 재생
      if (queuedAudioRef.current) {
        const nextUrl = queuedAudioRef.current;
        queuedAudioRef.current = null;
        setTimeout(() => playAudio(nextUrl), 100);
      }
    });

    // 재생 진행률 업데이트
    audioRef.current.addEventListener('timeupdate', () => {
      const duration = audioRef.current.duration;
      if (duration) {
        setProgress((audioRef.current.currentTime / duration) * 100);
      }
    });

    // 오류 처리
    audioRef.current.addEventListener('error', (error) => {
      console.error('오디오 재생 오류:', error);
      setIsPlaying(false);
      setIsReady(false);

      // URL 객체 메모리 해제
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }

      audioRef.current = null;

      // 대기 중인 오디오가 있다면 재생
      if (queuedAudioRef.current) {
        const nextUrl = queuedAudioRef.current;
        queuedAudioRef.current = null;
        setTimeout(() => playAudio(nextUrl), 100);
      }
    });

    // 재생 시작 (canplaythrough 이벤트 발생 후)
    audioRef.current.addEventListener('canplaythrough', () => {
      if (audioRef.current) {
        audioRef.current.play().catch(error => {
          console.error('오디오 재생 시작 오류:', error);
          setIsPlaying(false);
        });
      }
    }, { once: true }); // 이벤트가 한 번만 발생하도록 설정

    // 프리로드 설정
    audioRef.current.load();
  };

  // 재생 일시정지
  const pauseAudio = () => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
    }
  };

  // 재생 재개
  const resumeAudio = () => {
    if (audioRef.current && !isPlaying && isReady) {
      audioRef.current.play().catch(error => {
        console.error('오디오 재생 오류:', error);
      });
    }
  };

  // 재생 중지
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setProgress(0);

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }

      // 대기 중인 오디오도 정리
      queuedAudioRef.current = null;
    }
  };

  // 대기 중인 오디오 설정 (재생 중인 오디오가 끝나면 자동 재생)
  const queueAudio = (url) => {
    if (!url) return;

    if (!audioRef.current || !isPlaying) {
      // 현재 재생 중인 오디오가 없으면 즉시 재생
      playAudio(url);
    } else {
      // 대기열에 추가
      queuedAudioRef.current = url;
    }
  };

  // 컴포넌트 언마운트 시 오디오 정리
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      queuedAudioRef.current = null;
    };
  }, [audioUrl]);

  return {
    isPlaying,
    isReady,
    progress,
    playAudio,
    pauseAudio,
    resumeAudio,
    stopAudio,
    queueAudio
  };
};

export default useSpeechPlayer;