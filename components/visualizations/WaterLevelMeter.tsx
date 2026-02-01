"use client";

interface WaterLevelMeterProps {
  level: number; // dalam cm
  mode: "sawah" | "kolam";
  maxHeight?: number; // tinggi maksimal dalam cm
}

export default function WaterLevelMeter({
  level,
  mode,
  maxHeight = 100,
}: WaterLevelMeterProps) {
  const percentage = (level / maxHeight) * 100;

  return (
    <div className="w-full">
      <div className="flex items-center gap-6">
        {/* Vertical Line - Garis Vertikal dengan Tanda di Ujung */}
        <div className="flex-shrink-0 flex flex-col items-center gap-1">
          {/* Label Device */}
          <p className="text-xs font-semibold text-gray-600">device</p>

          {/* Top Line Segment */}
          <div className="w-0.5 h-4 bg-black"></div>

          {/* Main Vertical Line */}
          <div className="w-0.5 h-40 bg-black"></div>

          {/* Bottom Line Segment */}
          <div className="w-0.5 h-4 bg-black"></div>

          {/* Label Permukaan Air */}
          <p className="text-xs font-semibold text-gray-600">permukaan air</p>
        </div>

        {/* Number Display - Angka Dinamis */}
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          {/* Large Number */}
          <div className="text-6xl font-semibold text-blue-500 tracking-tight">
            {level.toFixed(1)}
          </div>
          <p className="text-sm text-gray-500 font-medium">cm</p>
        </div>
      </div>
    </div>
  );
}
