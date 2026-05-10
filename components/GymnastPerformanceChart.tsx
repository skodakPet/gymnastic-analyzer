"use client";
import { useState } from "react";
import PerformanceChart from "./PerformanceChart";

interface DataPoint {
  label: string;
  date: string | null;
  value: number;
}

interface Series {
  key: string;
  name: string;
  data: DataPoint[];
}

interface Props {
  series: Series[];
  defaultIdx?: number;
}

export default function GymnastPerformanceChart({ series, defaultIdx = 0 }: Props) {
  const initialIdx = series[defaultIdx]?.data.length > 0
    ? defaultIdx
    : series.findIndex(s => s.data.length > 0);
  const [idx, setIdx] = useState(initialIdx === -1 ? 0 : initialIdx);
  const active = series[idx];

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {series.map((s, i) => {
          const disabled = s.data.length === 0;
          const isActive = i === idx;
          return (
            <button
              key={s.key}
              type="button"
              disabled={disabled}
              onClick={() => setIdx(i)}
              className={[
                "text-xs px-3 py-1.5 rounded-full border transition-colors",
                isActive
                  ? "bg-[#1a3a5c] text-white border-[#1a3a5c]"
                  : disabled
                    ? "bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed"
                    : "bg-white text-[#1a3a5c] border-gray-200 hover:bg-gray-50",
              ].join(" ")}
            >
              {s.name}
              <span className={`ml-1.5 text-[10px] ${isActive ? "opacity-70" : "opacity-50"}`}>
                {s.data.length}
              </span>
            </button>
          );
        })}
      </div>
      <PerformanceChart data={active?.data ?? []} />
    </div>
  );
}
