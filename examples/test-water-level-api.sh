#!/bin/bash

# Contoh pengiriman data water level dari hardware/curl ke API
# File ini menunjukkan bagaimana hardware mengirimkan data ketinggian air

API_URL="http://localhost:3000/api/water-level"

# Contoh 1: Sawah dengan level 45 cm (optimal)
echo "Mengirim data Sawah: 45cm"
curl -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "sawah",
    "level": 45,
    "location": "Sawah Utama",
    "deviceId": "device-001"
  }'

echo -e "\n\n"

# Contoh 2: Kolam dengan level 120 cm (optimal)
echo "Mengirim data Kolam: 120cm"
curl -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "kolam",
    "level": 120,
    "location": "Kolam Ikan",
    "deviceId": "device-002"
  }'

echo -e "\n\n"

# Contoh 3: Sawah dengan level rendah (25 cm - low status)
echo "Mengirim data Sawah: 25cm (LOW)"
curl -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "sawah",
    "level": 25,
    "location": "Sawah Utama",
    "deviceId": "device-001"
  }'

echo -e "\n\n"

# Contoh 4: Kolam dengan level kritis (35 cm - critical)
echo "Mengirim data Kolam: 35cm (CRITICAL)"
curl -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "kolam",
    "level": 35,
    "location": "Kolam Ikan",
    "deviceId": "device-002"
  }'

echo -e "\n\n"

# Mengambil data water level terbaru
echo "Mengambil data water level terbaru:"
curl -X GET "$API_URL?location=Sawah%20Utama&limit=5"

echo -e "\n"
