'use client';

import { useState, useEffect } from 'react';

function formatMs(ms: number): string {
  if (ms <= 0) return 'Due now';
  const totalMins = Math.floor(ms / 60000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours >= 48) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h remaining`;
  }
  return `${hours}h ${mins}m remaining`;
}

export default function CountdownTimer({ deadline }: { deadline: string }) {
  const [ms, setMs] = useState(() => new Date(deadline).getTime() - Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setMs(new Date(deadline).getTime() - Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, [deadline]);

  if (!deadline || isNaN(new Date(deadline).getTime())) return null;

  const overdue = ms <= 0;
  return (
    <span className={overdue ? 'text-red-400' : 'text-neutral-200 font-medium'}>
      {formatMs(ms)}
    </span>
  );
}
