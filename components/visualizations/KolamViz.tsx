"use client";

import { Fish } from "lucide-react";

interface VizProps {
  level: number;
}

export default function KolamViz({ level }: VizProps) {
  return (
    <div className="w-full h-36 bg-cyan-50/30 border-b-4 border-r-2 border-l-2 border-cyan-600 rounded-b-3xl relative overflow-hidden shadow-sm">
      {/* Air Kolam */}
      <div
        className="absolute bottom-0 w-full bg-cyan-500/60 transition-all duration-1000 ease-in-out"
        style={{ height: `${level}%` }}
      >
        <div className="absolute top-0 w-full h-2 bg-white/30 animate-pulse rounded-t-full" />

        {/* Ikan-ikanan (Hanya muncul jika level air > 10%) */}
        {level > 45 && (
          // Gunakan relative container agar posisi absolute ikan dihitung dari sini
          <div className="relative w-full h-full pointer-events-none">
            {/* Ikan 1: Lebih cepat, mulai dari kiri */}
            {/* PERHATIKAN: 'left-0' dihapus. Nama animasi diganti jadi 'swim-patrol' */}
            <div className="absolute top-1/4 animate-[swim-patrol_12s_linear_infinite] text-gray-500 opacity-90">
              <Fish size={24} fill="currentColor" />
            </div>

            {/* Ikan 2: Lebih lambat, mulai seolah-olah dari tengah karena delay negatif */}
            <div className="absolute top-2/3 animate-[swim-patrol_18s_linear_infinite] [animation-delay:-9s] text-gray-500 opacity-50">
              <Fish size={20} fill="currentColor" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
