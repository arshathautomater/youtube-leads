'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

function formatDelivery(ms: number): { line1: string; line2: string; urgent: boolean } {
  if (ms <= 0) return { line1: 'Your video is ready', line2: 'Delivery complete', urgent: false };

  const totalMins = Math.floor(ms / 60000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;

  if (days >= 2) {
    return {
      line1: `Your video will be delivered in ${days} days`,
      line2: `${remHours > 0 ? `${remHours}h remaining today` : 'On schedule'}`,
      urgent: false,
    };
  }
  if (hours >= 24) {
    return {
      line1: 'Your video will be delivered tomorrow',
      line2: `${remHours}h ${mins}m remaining`,
      urgent: false,
    };
  }
  if (hours >= 1) {
    return {
      line1: `Your video will be delivered in ${hours}h ${mins}m`,
      line2: "We're working hard on it",
      urgent: hours < 3,
    };
  }
  return {
    line1: `Your video will be delivered in ${mins} minutes`,
    line2: "Almost there!",
    urgent: true,
  };
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

  const { line1, line2, urgent } = formatDelivery(ms);
  const done = ms <= 0;

  return (
    <div className={`rounded-xl px-4 py-3 flex items-center gap-3 ${
      done
        ? 'bg-green-950/40 border border-green-800/40'
        : urgent
        ? 'bg-orange-950/40 border border-orange-800/40'
        : 'bg-indigo-950/40 border border-indigo-800/40'
    }`}>
      <div className={`rounded-lg p-2 shrink-0 ${
        done ? 'bg-green-900/50' : urgent ? 'bg-orange-900/50' : 'bg-indigo-900/50'
      }`}>
        <Clock className={`h-4 w-4 ${done ? 'text-green-400' : urgent ? 'text-orange-400' : 'text-indigo-400'}`} />
      </div>
      <div>
        <p className={`text-sm font-medium ${done ? 'text-green-300' : urgent ? 'text-orange-300' : 'text-indigo-200'}`}>
          {line1}
        </p>
        <p className={`text-xs mt-0.5 ${done ? 'text-green-500' : urgent ? 'text-orange-500' : 'text-indigo-500'}`}>
          {line2}
        </p>
      </div>
    </div>
  );
}
