"use client";

interface VizProps {
  level: number; // Ketinggian air di atas permukaan tanah dalam cm (Hasil ukur sensor ultrasonik)
}

export default function SawahViz({ level }: VizProps) {
  /**
   * LOGIKA VISUALISASI:
   * 1. Titik 0 cm adalah permukaan tanah (bagian atas blok cokelat).
   * 2. Maksimum visualisasi diatur ke 20 cm untuk tampilan dashboard yang optimal.
   * 3. Jika level <= 0, maka air tidak muncul (kering di permukaan).
   */
  const maxVisualCm = 20;
  const percentage = Math.max(0, Math.min(100, (level / maxVisualCm) * 100));
  let statusText = "";
  let statusClasses = "";

  if (level > 10) {
    statusText = `AIR BERLEBIH`;
    statusClasses = "bg-red-100 text-red-700";
  } else if (level > 3) {
    statusText = "AIR NORMAL";
    statusClasses = "bg-green-100 text-green-700";
  } else if (level > 0) {
    statusText = `MENDEKATI 0 (STANDBY)`;
    statusClasses = "bg-amber-100 text-amber-700";
  } else {
    statusText = "TIDAK ADA GENANGAN AIR";
    statusClasses = "bg-slate-100 text-slate-700";
  }

  return (
    <div className="w-full h-48 relative rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-50 shadow-sm">
      {/* 1. Area Udara (Background) */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-white" />

      {/* 2. Lapisan Tanah (Blok Statis di Bawah sebagai Titik 0) */}
      <div className="absolute bottom-0 w-full h-1/3 bg-[#5d4037] z-10 border-t-4 border-[#3e2723]">
        <div className="flex items-center justify-center h-full">
          <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
            Tanah
          </span>
        </div>
      </div>

      {/* 3. Lapisan Air Dinamis (Hanya muncul di atas tanah/level > 0) */}
      <div
        className="absolute bottom-1/3 w-full bg-blue-500/60 transition-all duration-1000 ease-in-out z-20 border-t-2 border-blue-300"
        style={{ height: `calc(${percentage}% * 0.66)` }} // 0.66 agar skala air proporsional dengan sisa ruang di atas tanah
      >
        {/* Efek Kilauan Air */}
        <div className="absolute top-0 w-full h-1 bg-white/40 animate-pulse" />
      </div>

      {/* 4. Skala Pengukuran Samping */}
      <div className="absolute right-2 top-0 h-2/3 flex flex-col justify-between text-[9px] font-bold text-slate-500 py-4 z-30">
        <span>{maxVisualCm} cm</span>
        <span>15 cm</span>
        <span>10 cm</span>
        <span>5 cm</span>
      </div>

      {/* 5. Indikator Status Tekstual Kecil */}
      <div className="absolute top-2 left-2 z-30">
        <div
          className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-sm transition-colors duration-500 ${statusClasses}`}
        >
          {statusText}
        </div>
      </div>
    </div>
  );
}
