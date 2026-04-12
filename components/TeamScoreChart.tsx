"use client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  label: string;
  avgScore: number;
}

export default function TeamScoreChart({ data }: { data: DataPoint[] }) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        Nahrajte alespoň 2 soutěže pro zobrazení trendu
      </div>
    );
  }

  const min = Math.floor(Math.min(...data.map(d => d.avgScore)) - 1);
  const max = Math.ceil(Math.max(...data.map(d => d.avgScore)) + 1);

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={[...data].reverse()} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
        <YAxis domain={[min, max]} tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          formatter={(value: any) => [(Number(value)).toFixed(3) + " b.", "Průměr týmu"]}
          contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
        />
        <Line
          type="monotone"
          dataKey="avgScore"
          stroke="#1a3a5c"
          strokeWidth={2.5}
          dot={{ r: 4, fill: "#1a3a5c", strokeWidth: 0 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
