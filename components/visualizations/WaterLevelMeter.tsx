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

  // Tentukan warna berdasarkan level
  let waterColor = "bg-blue-400";
  let levelStatus = "";

  if (mode === "sawah") {
    // Sawah optimal: 30-60cm
    if (level < 15) {
      waterColor = "bg-red-500";
      levelStatus = "Kritis";
    } else if (level < 30) {
      waterColor = "bg-orange-400";
      levelStatus = "Rendah";
    } else if (level <= 60) {
      waterColor = "bg-green-500";
      levelStatus = "Optimal";
    } else if (level < 75) {
      waterColor = "bg-blue-400";
      levelStatus = "Tinggi";
    } else {
      waterColor = "bg-blue-600";
      levelStatus = "Sangat Tinggi";
    }
  } else if (mode === "kolam") {
    // Kolam optimal: 80-130cm
    if (level < 40) {
      waterColor = "bg-red-500";
      levelStatus = "Kritis";
    } else if (level < 80) {
      waterColor = "bg-orange-400";
      levelStatus = "Rendah";
    } else if (level <= 130) {
      waterColor = "bg-green-500";
      levelStatus = "Optimal";
    } else if (level < 150) {
      waterColor = "bg-blue-400";
      levelStatus = "Tinggi";
    } else {
      waterColor = "bg-blue-600";
      levelStatus = "Sangat Tinggi";
    }
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-6">
        {/* Vertical Bar - Garis Vertikal */}
        <div className="flex-shrink-0">
          <div className="h-64 w-12 bg-gray-100 rounded-lg border-2 border-gray-300 overflow-hidden relative shadow-sm flex items-end justify-center">
            {/* Water Fill - dari bawah ke atas */}
            <div
              className={`w-full transition-all duration-500 ${waterColor} rounded-t-lg`}
              style={{ height: `${Math.min(percentage, 100)}%` }}
            >
              {/* Wave Effect */}
              <div className="absolute top-0 w-full h-0.5 bg-white opacity-40"></div>
            </div>

            {/* Markings - Garis acuan */}
            <div className="absolute inset-0 pointer-events-none">
              {[0, 25, 50, 75, 100].map((mark) => (
                <div
                  key={mark}
                  className="absolute w-full border-t border-gray-300 border-dashed"
                  style={{ bottom: `${mark}%` }}
                ></div>
              ))}
            </div>
          </div>
          {/* Max Height Label */}
          <p className="text-xs text-gray-500 text-center mt-2 font-medium">
            {maxHeight}cm
          </p>
        </div>

        {/* Number Display & Status - Angka Dinamis */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Large Number */}
          <div className="text-center">
            <div className="text-6xl font-bold text-gray-900 tracking-tight">
              {level.toFixed(1)}
            </div>
            <p className="text-sm text-gray-500 font-medium mt-1">cm</p>
          </div>

          {/* Status Badge */}
          <div className="text-center">
            <p
              className={`text-sm font-semibold px-4 py-2 rounded-full inline-block ${
                levelStatus === "Optimal"
                  ? "bg-green-100 text-green-700"
                  : levelStatus === "Rendah"
                    ? "bg-orange-100 text-orange-700"
                    : levelStatus === "Kritis"
                      ? "bg-red-100 text-red-700"
                      : levelStatus === "Tinggi"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-blue-200 text-blue-800"
              }`}
            >
              {levelStatus}
            </p>
          </div>

          {/* Info Text */}
          <div className="text-xs text-gray-600 text-center">
            {mode === "sawah" ? (
              <>
                <p className="font-medium">Sawah Padi</p>
                <p>Optimal: 30-60 cm</p>
              </>
            ) : (
              <>
                <p className="font-medium">Kolam Ikan</p>
                <p>Optimal: 80-130 cm</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
