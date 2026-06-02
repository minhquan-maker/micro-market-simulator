import { createContext, useContext, useEffect, useState } from "react";

interface ClockContextValue {
  time: string;
}

const ClockContext = createContext<ClockContextValue>({ time: "" });

export function LondonClockProvider({ children }: { children: React.ReactNode }) {
  const [time, setTime] = useState(() => formatTime());

  useEffect(() => {
    const id = setInterval(() => setTime(formatTime()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <ClockContext.Provider value={{ time }}>
      {children}
    </ClockContext.Provider>
  );
}

export function useLondonClock() {
  return useContext(ClockContext);
}

function formatTime() {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Europe/London",
    hour12: false,
  }).format(new Date());
}
