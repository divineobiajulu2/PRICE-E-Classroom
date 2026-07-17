import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  endTime: Date | string;
  onTimeUp?: () => void;
  className?: string;
  showLabel?: boolean;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({
  endTime,
  onTimeUp,
  className = '',
  showLabel = true
}) => {
  const [timeLeft, setTimeLeft] = useState<string>('Loading...');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const deadline = typeof endTime === 'string' ? new Date(endTime) : endTime;
      const now = new Date();
      const difference = deadline.getTime() - now.getTime();

      if (difference <= 0) {
        setTimeLeft('Time is up!');
        setIsExpired(true);
        if (onTimeUp) onTimeUp();
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }

      if (difference < 60000) {
        setIsExpired(true);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [endTime, onTimeUp]);

  const timerColor = isExpired
    ? 'text-red-600 dark:text-red-400 font-bold'
    : 'text-slate-600 dark:text-slate-300';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Clock size={16} className={timerColor} />
      <span className={`${timerColor} font-mono`}>{timeLeft}</span>
      {showLabel && <span className="text-xs text-slate-500">remaining</span>}
    </div>
  );
};

export default CountdownTimer;
