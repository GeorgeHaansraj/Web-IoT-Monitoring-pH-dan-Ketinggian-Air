"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
  const handleDurationSelect = (duration: number | null, isManual: boolean) => {
    onSelect(duration, isManual);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Pilih Durasi Pompa</DialogTitle>
          <DialogDescription>
            Berapa lama pompa akan menyala?
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          <Button
            onClick={() => handleDurationSelect(1, false)}
            variant="outline"
            disabled={isLoading}
            className="h-12 text-base"
          >
            1 Jam
          </Button>

          <Button
            onClick={() => handleDurationSelect(2, false)}
            variant="outline"
            disabled={isLoading}
            className="h-12 text-base"
          >
            2 Jam
          </Button>

          <Button
            onClick={() => handleDurationSelect(3, false)}
            variant="outline"
            disabled={isLoading}
            className="h-12 text-base"
          >
            3 Jam
          </Button>

          <div className="border-t pt-3 mt-2">
            <Button
              onClick={() => handleDurationSelect(null, true)}
              variant="secondary"
              disabled={isLoading}
              className="w-full h-12 text-base"
            >
              Manual (Tidak Otomatis Mati)
            </Button>
          </div>

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
