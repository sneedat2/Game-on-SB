import { useEffect, useState } from 'react';

/** Re-renders every `intervalMs`, aligned to the wall-clock second so countdowns tick in sync. */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const align = setTimeout(() => {
      setNow(new Date());
      interval = setInterval(() => setNow(new Date()), intervalMs);
    }, intervalMs - (Date.now() % intervalMs));
    return () => {
      clearTimeout(align);
      if (interval) clearInterval(interval);
    };
  }, [intervalMs]);
  return now;
}
