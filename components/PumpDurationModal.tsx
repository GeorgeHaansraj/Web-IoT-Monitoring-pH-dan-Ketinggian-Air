"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PumpDurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (duration: number | null, isManualMode: boolean) => void;
  isLoading?: boolean;
}

export function PumpDurationModal({
  isOpen,
  onClose,
  onSelect,
  isLoading = false,
}: PumpDurationModalProps) {
  const [customDuration, setCustomDuration] = useState<string>("");
  const [unit, setUnit] = useState<"minute" | "hour" | "day">("hour");

  const handleDurationSelect = (duration: number | null, isManual: boolean) => {
    onSelect(duration, isManual);
    onClose();
    setCustomDuration("");
    setUnit("hour");
  };

  const handleCustomDuration = () => {
    if (!customDuration || isNaN(Number(customDuration))) {
      alert("Masukkan angka yang valid");
      return;
    }

    const numDuration = Number(customDuration);
    let durationInMinutes = numDuration;

    // Convert to minutes
    if (unit === "hour") {
      durationInMinutes = numDuration * 60;
    } else if (unit === "day") {
      durationInMinutes = numDuration * 24 * 60;
    }

    if (durationInMinutes <= 0) {
      alert("Durasi harus lebih dari 0");
      return;
    }

    handleDurationSelect(durationInMinutes, false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Pilih Durasi Pompa</DialogTitle>
          <DialogDescription>Berapa lama pompa akan menyala?</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Custom Duration Input */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Masukkan durasi"
                value={customDuration}
                onChange={(e) => setCustomDuration(e.target.value)}
                disabled={isLoading}
                className="flex-1"
                min="1"
              />
              <select
                value={unit}
                onChange={(e) =>
                  setUnit(e.target.value as "minute" | "hour" | "day")
                }
                disabled={isLoading}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="minute">Menit</option>
                <option value="hour">Jam</option>
                <option value="day">Hari</option>
              </select>
            </div>

            <Button
              onClick={handleCustomDuration}
              disabled={isLoading || !customDuration}
              className="w-full h-10 bg-blue-600 hover:bg-blue-700"
            >
              Hidup (Custom)
            </Button>
          </div>

          {/* Divider */}
          <div className="border-t pt-2"></div>

          {/* Manual Mode */}
          <Button
            onClick={() => handleDurationSelect(null, true)}
            variant="secondary"
            disabled={isLoading}
            className="w-full h-10"
          >
            Manual (Matikan Manual)
          </Button>

          {/* Cancel Button */}
          <Button
            onClick={onClose}
            variant="ghost"
            disabled={isLoading}
            className="h-10"
          >
            Batal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
