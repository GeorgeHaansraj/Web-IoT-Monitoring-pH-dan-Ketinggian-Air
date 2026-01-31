"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function KolamPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect ke halaman utama karena semua konten sudah terintegrasi
    router.push("/");
  }, [router]);

  return null;
}
