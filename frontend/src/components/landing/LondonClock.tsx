import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

function formatLondonTime() {
  return new Date().toLocaleTimeString("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function LondonClock() {
  const [time, setTime] = useState(formatLondonTime());

  useEffect(() => {
    const id = setInterval(() => setTime(formatLondonTime()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-1.5 text-gray-600">
      <Clock size={14} strokeWidth={2} />
      <span className="text-[13px]">{time} in London</span>
    </div>
  );
}
