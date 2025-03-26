import React, { useState, useEffect } from 'react';
import { Clock, Calendar } from 'lucide-react';
import '../styles/DateTimeDisplay.css';

const DateTimeDisplay = () => {
  const [dateTime, setDateTime] = useState(new Date());
  const [shouldBlink, setShouldBlink] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setDateTime(new Date());

      // 시간이 변경될 때만 깜빡임 효과
      setShouldBlink(true);
      setTimeout(() => setShouldBlink(false), 500);
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  // 요일 구하는 함수
  const getDayOfWeek = (date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };

  // 날짜 포맷: 2025.03.25 Tuesday
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = getDayOfWeek(date);

    return {
      formatted: `${year}.${month.toString().padStart(2, '0')}.${day.toString().padStart(2, '0')}`,
      dayName: dayOfWeek
    };
  };

  // 시간 포맷: 15:30 PM
  const formatTime = (date) => {
    const hours24 = date.getHours();
    const hours = hours24 > 12 ? hours24 - 12 : hours24 === 0 ? 12 : hours24;
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const ampm = hours24 >= 12 ? 'PM' : 'AM';

    return {
      hours: hours.toString().padStart(2, '0'),
      minutes,
      seconds,
      ampm
    };
  };

  const dateInfo = formatDate(dateTime);
  const timeInfo = formatTime(dateTime);

  return (
    <div className="datetime-display">
      <div className="datetime-container">

        <div className="datetime-info">
        <div className="date">
          <span className="date-text">{dateInfo.formatted}</span>
          <span className="day-name">{dateInfo.dayName}</span>

        </div>

        <div className="time">
          <div className="time-digits">
            <span className="hours">{timeInfo.hours}</span>
            <span className={`separator ${shouldBlink ? 'blink' : ''}`}>:</span>
            <span className="minutes">{timeInfo.minutes}</span>
            <span className={`separator sec-separator ${shouldBlink ? 'blink' : ''}`}>:</span>
            <span className="seconds">{timeInfo.seconds}</span>
          </div>
          <div className="ampm">{timeInfo.ampm}</div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default DateTimeDisplay;