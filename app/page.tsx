"use client"; // Wajib karena menggunakan state dan effect

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@radix-ui/react-switch";
import { Battery, DollarSign, Wifi, WifiOff, Droplet } from "lucide-react";

export default function Dashboard() {
  const router = useRouter();
  const [battery, setBattery] = useState(85);
  const [credit, setCredit] = useState(50000);
  const [kuota, setKuota] = useState(4.5); // in GB
  const [isOnline, setIsOnline] = useState(true);
  const [activeMode, setActiveMode] = useState<"sawah" | "sumur" | "kolam">(
    "sawah",
  );
  const [pumpOn, setPumpOn] = useState(false);

  // Simulate real-time battery drain
  useEffect(() => {
    const interval = setInterval(() => {
      setBattery((prev) => Math.max(0, prev - Math.random() * 0.5));
      setCredit((prev) => Math.max(0, prev - Math.random() * 100));
      setKuota((prev) => Math.max(0, prev - 0.01));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleModeChange = (mode: "sawah" | "sumur" | "kolam") => {
    setActiveMode(mode);
    // Simulate MQTT publish
    console.log(`MQTT: Changing mode to ${mode}`);
  };

  const handlePumpToggle = (checked: boolean) => {
    setPumpOn(checked);
    // Simulate MQTT publish
    console.log(`MQTT: Pump ${checked ? "ON" : "OFF"}`);
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center py-6">
        <h1 className="text-3xl mb-2">Dashboard IoT</h1>
        <p className="text-gray-600">Monitoring pH & Kontrol Pompa</p>
      </div>

      {/* System Info */}
      <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <h2 className="text-xl mb-4">Informasi Sistem</h2>

        <div className="grid grid-cols-2 gap-4">
          {/* Battery Widget : 3.4 volt menjadi titik 0% baterai*/}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Battery className="w-5 h-5 text-green-600" />
              <span className="text-sm text-gray-600">Baterai</span>
            </div>
            <div className="text-2xl">{battery.toFixed(1)}%</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${battery}%` }}
              ></div>
            </div>
          </div>

          {/* Credit Widget */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-gray-600">Pulsa</span>
            </div>
            <div className="text-2xl">Rp{(credit / 1000).toFixed(1)}k</div>
            <div className="text-xs text-gray-500 mt-1">Tersisa</div>
          </div>
        </div>

        {/* Data Usage Widget */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wifi className="w-5 h-5 text-purple-600" />
            <span className="text-sm text-gray-600">Data</span>
          </div>
          <div>
            <div className="text-2xl">{kuota.toFixed(2)} GB</div>
            <div className="text-xs text-gray-500 mt-1">Tersisa</div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="text-sm">Status Koneksi</span>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <>
                <Wifi className="w-5 h-5 text-green-600" />
                <span className="text-green-600">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-5 h-5 text-red-600" />
                <span className="text-red-600">Offline</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mode Control */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl mb-4">Pilih Mode</h2>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => handleModeChange("sawah")}
            className={`p-4 rounded-lg border-2 transition-all ${
              activeMode === "sawah"
                ? "border-green-600 bg-green-50 text-green-700"
                : "border-gray-200 bg-white text-gray-700 hover:border-green-300"
            }`}
          >
            <div className="text-2xl mb-2">🌾</div>
            <div className="text-sm">Sawah</div>
          </button>

          <button
            onClick={() => handleModeChange("sumur")}
            className={`p-4 rounded-lg border-2 transition-all ${
              activeMode === "sumur"
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-gray-200 bg-white text-gray-700 hover:border-blue-300"
            }`}
          >
            <div className="text-2xl mb-2">🚰</div>
            <div className="text-sm">Sumur</div>
          </button>

          <button
            onClick={() => handleModeChange("kolam")}
            className={`p-4 rounded-lg border-2 transition-all ${
              activeMode === "kolam"
                ? "border-cyan-600 bg-cyan-50 text-cyan-700"
                : "border-gray-200 bg-white text-gray-700 hover:border-cyan-300"
            }`}
          >
            <div className="text-2xl mb-2">🐟</div>
            <div className="text-sm">Kolam</div>
          </button>
        </div>

        <button
          onClick={() => router.push(`/${activeMode}`)}
          className="w-full mt-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Lihat Detail Mode
        </button>
      </div>

      {/* Pump Control */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl mb-4">Kontrol Pompa</h2>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <Droplet
              className={`w-6 h-6 ${pumpOn ? "text-blue-600" : "text-gray-400"}`}
            />
            <div>
              <div className="text-sm mb-1">Relay Pompa</div>
              <div
                className={`text-xs ${pumpOn ? "text-blue-600" : "text-gray-500"}`}
              >
                {pumpOn ? "Pompa Aktif" : "Pompa Mati"}
              </div>
            </div>
          </div>
          <Switch
            checked={pumpOn}
            onCheckedChange={handlePumpToggle}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
              pumpOn ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                pumpOn ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </Switch>
        </div>
      </div>
    </div>
  );
}
