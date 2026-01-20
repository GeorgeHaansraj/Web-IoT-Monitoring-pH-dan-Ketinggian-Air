"use client";

interface VizProps {
  level: number; // Menerima data level air (0-100)
}

export default function SumurViz({ level }: VizProps) {
  return (
    <div className="w-24 h-36 bg-gray-50 border-4 border-gray-400 rounded-b-xl relative overflow-hidden shadow-inner">
      {/* Air */}
      <div
        className="absolute bottom-0 w-full bg-blue-500/80 transition-all duration-1000 ease-in-out"
        style={{ height: `${level}%` }}
      >
        {/* Efek Gelombang Atas */}
        <div
          className="absolute top-0 w-full h-2 bg-white/30 animate-pulse"
          style={{ borderRadius: "50% 50% 0 0" }}
        />
      </div>
      {/* Garis Ukur */}
      <div className="absolute right-1 top-0 h-full flex flex-col justify-between text-[8px] text-gray-600 py-1 pointer-events-none">
        <span>100</span>
        <span>50</span>
        <span>0</span>
      </div>
    </div>
  );
}
