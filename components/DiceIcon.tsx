
import React from 'react';
import { DiceType } from '../types';

interface DiceIconProps {
  type: DiceType | string;
  value?: number | string;
  isSuccess?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

const DiceIcon: React.FC<DiceIconProps> = ({ type, value, isSuccess, size = 'md', color }) => {
  // A die is custom if its type is an ID (string) and not a standard numeric string
  const isCustom = typeof type === 'string' && !['2', '4', '6', '8', '10', '12', '20'].includes(type);

  const baseClasses = "relative flex items-center justify-center font-bold transition-all duration-300 transform hover:scale-110 overflow-hidden text-center leading-tight shadow-xl";
  const sizeClasses = {
    sm: "w-10 h-10 text-[10px] border-2",
    md: "w-14 h-14 text-xs border-[3px]",
    lg: "w-20 h-20 text-sm border-4"
  };

  let statusClasses = "";
  let style: React.CSSProperties = {};

  if (color) {
    // Determine text color based on success status for colored/custom dice
    let textColor = '#fff';
    let bgClass = "bg-slate-900/90";

    if (isSuccess === true) {
      textColor = '#34d399'; // emerald-400
      bgClass = "bg-emerald-950/30";
    } else if (isSuccess === false) {
      textColor = '#fb7185'; // rose-400
      bgClass = "bg-rose-950/30";
    }

    statusClasses = bgClass;
    style = {
      borderColor: color,
      boxShadow: `0 0 15px ${color}44, inset 0 0 10px ${color}22`,
      color: textColor,
      textShadow: isSuccess !== undefined ? `0 0 10px ${textColor}66` : `0 0 5px ${color}aa`
    };
  } else {
    // Standard dice styling (no custom color provided)
    statusClasses = value !== undefined
      ? (isSuccess === undefined
        ? "bg-slate-800/80 border-slate-600 text-slate-100"
        : (isSuccess
          ? "bg-emerald-950/80 border-emerald-500 text-emerald-300"
          : "bg-rose-950/80 border-rose-500 text-rose-300 opacity-70")
      )
      : "bg-slate-900/50 border-slate-800 text-slate-700";
  }

  const standardShapes: Record<string, string> = {
    "4": "polygon(50% 0%, 0% 100%, 100% 100%)",
    "8": "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
    "10": "polygon(50% 0%, 95% 40%, 50% 100%, 5% 40%)",
    "12": "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
    "20": "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)"
  };

  const typeStr = type.toString();
  if (standardShapes[typeStr]) {
    style.clipPath = standardShapes[typeStr];
    // Adjust padding for clipped shapes so text stays in center
    style.padding = typeStr === "4" ? "20% 0 0 0" : "0";
  } else if (isCustom || typeStr === "6") {
    style.borderRadius = isCustom ? '25%' : '15%';
  } else if (typeStr === "2") {
    style.borderRadius = '50%';
  }

  const displayValue = value?.toString() ?? `D${type}`;
  const isLong = displayValue.length > 3;

  return (
    <div
      className={`${baseClasses} ${sizeClasses[size]} ${statusClasses}`}
      style={style}
    >
      {/* Subtle shine effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

      <span className="mono relative z-10 p-1 break-words w-full" style={isLong ? { fontSize: '0.8em', lineHeight: '1.1' } : {}}>
        {displayValue}
      </span>

      {/* Optional success/failure indicator pulse */}
      {isSuccess !== undefined && color && (
        <div className={`absolute inset-0 animate-pulse pointer-events-none opacity-20 ${isSuccess ? 'bg-emerald-400' : 'bg-rose-400'}`} />
      )}
    </div>
  );
};

export default DiceIcon;
