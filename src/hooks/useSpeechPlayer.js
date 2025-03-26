// src/hooks/useSpeechPlayer.js
import { useState, useEffect, useRef } from 'react';

const useSpeechPlayer = () => {
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(new Audio());

  // 음성 URL 설정 및 재생 시작
  const playAudio = (url) => {
    if (!url) return;

    // 이전 오디오가 있다면 정리
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    // 새 오디오 설정
    setAudioUrl(url);
    audioRef.current = new Audio(url);

    // 이벤트 리스너 설정
    audioRef.current.addEventListener('play', () => setIsPlaying(true));
    audioRef.current.addEventListener('pause', () => setIsPlaying(false));
    audioRef.current.addEventListener('ended', () => {
      setIsPlaying(false);
      setProgress(0);

      // URL 객체 메모리 해제
      URL.revokeObjectURL(url);
      setAudioUrl(null);
    });

    // 재생 진행률 업데이트
    audioRef.current.addEventListener('timeupdate', () => {
      const duration = audioRef.current.duration;
      if (duration) {
        setProgress((audioRef.current.currentTime / duration) * 100);
      }
    });

    // 재생 시작
    audioRef.current.play().catch(error => {
      console.error('오디오 재생 오류:', error);
      setIsPlaying(false);
    });
  };

  // 재생 일시정지
  const pauseAudio = () => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
    }
  };

  // 재생 재개
  const resumeAudio = () => {
    if (audioRef.current && !isPlaying) {
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
    };
  }, [audioUrl]);

  return {
    isPlaying,
    progress,
    playAudio,
    pauseAudio,
    resumeAudio,
    stopAudio
  };
};

export default useSpeechPlayer;