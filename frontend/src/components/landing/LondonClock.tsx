import { Clock } from "lucide-react";
import { useLondonClock } from "../../contexts/LondonClockContext";

export default function LondonClock() {
  const { time } = useLondonClock();

  return (
    <div className="flex items-center gap-1.5 text-gray-600">
      <Clock size={14} strokeWidth={2} />
      <span className="text-[13px]">{time} in London</span>
    </div>
  );
}
