"use client";
import React, { useEffect, useState } from 'react';

export default function CountUp({ value, duration = 500 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(value);
    if (start === end) return;

    let totalMilisecondsStep = duration / end;
    let timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start === end) clearInterval(timer);
    }, totalMilisecondsStep);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{count}</span>;
}
