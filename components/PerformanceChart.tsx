"use client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

interface DataPoint {
  label: string;  // competition name (short)
  date: string | null;
  value: number;
}

interface Props {
  data: DataPoint[];
  color?: string;
}

export default function PerformanceChart({ data, color = "#2563a8" }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        Nedostatek dat pro zobrazení grafu
      </div>
    );
  }

  const avg = data.reduce((s, d) => s + d.value, 0) / data.length;
  const min = Math.floor(Math.min(...data.map(d => d.value)) - 1);
  const max = Math.ceil(Math.max(...data.map(d => d.value)) + 1);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[min, max]}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip
          formatter={(value: any) => [(Number(value)).toFixed(3) + " b.", "Celkem"]}
          labelFormatter={(label: any) => String(label)}
          contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
        />
        <ReferenceLine y={avg} stroke="#f6a96e" strokeDasharray="4 4" strokeWidth={1.5} />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2.5}
          dot={{ r: 4, fill: color, strokeWidth: 0 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
