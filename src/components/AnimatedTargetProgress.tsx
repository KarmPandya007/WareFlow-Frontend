"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface AnimatedTargetProgressProps {
  initialValue: number;
  currentValue: number;
  targetValue: number;
  status: string;
}

export default function AnimatedTargetProgressProps({
  initialValue,
  currentValue,
  targetValue,
  status
}: AnimatedTargetProgressProps) {
  const [hasAnimated, setHasAnimated] = useState(false);
  const progress = Math.min((currentValue / targetValue) * 100, 100);
  const runnerPosition = Math.min(((currentValue - initialValue) / (targetValue - initialValue)) * 100, 100) || 0;

  const getProgressColor = () => {
    if (status === 'completed') return 'bg-emerald-500';
    if (status === 'overdue') return 'bg-rose-500';
    if (progress < 50) return 'bg-rose-500';
    if (progress < 80) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  useEffect(() => {
    const timer = setTimeout(() => setHasAnimated(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full h-16 mb-2">
      {/* Track */}
      <div className="absolute bottom-6 left-0 right-0 h-3 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${getProgressColor()}`}
          initial={{ width: "0%" }}
          animate={{ width: hasAnimated ? `${progress}%` : "0%" }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        />
      </div>

      {/* Running Person Video */}
      <motion.div
        className="absolute bottom-2 z-10"
        initial={{ left: "0%" }}
        animate={{ left: hasAnimated ? `${runnerPosition}%` : "0%" }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
        style={{ transform: "translateX(-50%)" }}
      >
        <div className="w-12 h-12 bg-white rounded-full shadow-md overflow-hidden">
          <video
            src="/running-person.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover scale-[2.2]"
          />
        </div>
      </motion.div>

      {/* Labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-600">
        <span>{initialValue}</span>
        <motion.span
          className="font-semibold text-gray-800"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          {currentValue.toLocaleString()}
        </motion.span>
        <span>{targetValue.toLocaleString()}</span>
      </div>
    </div>
  );
}
