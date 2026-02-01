<?php
/**
 * input-enhanced.php - IoT Ingest Endpoint dengan State Synchronization
 * 
 * ALUR:
 * 1. ESP32 mengirim POST dengan sensor data + pump_status (feedback)
 * 2. PHP menyimpan data ke DB
 * 3. PHP mengecek device_controls untuk command terbaru (berdasarkan mode & durasi)
 * 4. PHP membalas dengan command state (ON/OFF)
 * 5. ESP32 membaca response dan menjalankan command
 * 
 * PERBAIKAN UTAMA:
 * - Terima signal_strength dan pump_status dari ESP32
 * - Gunakan UUID v4 proper atau biarkan DB generate
 * - State-based control (bukan trigger sesaat)
 * - Track updated_at untuk durasi command
 */

require_once 'config_psql.php';

function get_input($key, $default = null) {
    return $_POST[$key] ?? $_GET[$key] ?? $default;
}

// ==================== 1. PARSING INPUT ====================
$json_input = json_decode(file_get_contents('php://input'), true);
if ($json_input) {
    $ph = $json_input['ph'] ?? null;
    $battery = $json_input['battery'] ?? null;
    $location = $json_input['location'] ?? 'sawah';
    $level = $json_input['level'] ?? null;
    
    // BARU: Field dari ESP32
    $signal = $json_input['signal'] ?? 0;        // 0-31 (CSQ dari SIM800L)
    $pump_status = $json_input['pump_status'] ?? false;  // true/false - status relay aktual
    $device_id = $json_input['device_id'] ?? 'ESP32-DEFAULT';
} else {
    // Fallback ke GET/POST form-urlencoded
    $ph = get_input('ph');
    $battery = get_input('battery');
    $location = get_input('location', 'sawah');
    $level = get_input('level');
    $signal = get_input('signal', 0);
    $pump_status = get_input('pump_status', false);
    $device_id = get_input('device_id', 'ESP32-DEFAULT');
}

// ==================== 2. VALIDASI INPUT ====================
if ($ph === null || $battery === null || $level === null) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Missing required parameters: ph, battery, level',
        'command' => 'OFF'  // Safety: Selalu kirim OFF jika request error
    ]);
    exit;
}

// ==================== 3. SANITASI DATA ====================
$ph_clean = (float)$ph;
$battery_clean = (float)$battery;
$level_clean = (float)$level;
$signal_clean = (int)$signal;
$pump_status_clean = filter_var($pump_status, FILTER_VALIDATE_BOOLEAN);
$location_clean = preg_replace('/[^a-zA-Z0-9\-\_]/', '', $location) ?: 'unknown';
$device_id_clean = preg_replace('/[^a-zA-Z0-9\-\_]/', '', $device_id) ?: 'unknown';

// ==================== 4. INSERT MONITORING DATA ====================
try {
    // 4A. Insert ke monitoring_logs (+ signal_strength baru)
    $sql_monitor = "INSERT INTO monitoring_logs 
        (ph_value, battery_level, location, signal_strength, device_id, created_at) 
        VALUES 
        ($ph_clean, $battery_clean, '$location_clean', $signal_clean, '$device_id_clean', NOW())
        ON CONFLICT DO NOTHING;";
    psql_execute($sql_monitor);

    // 4B. Insert water level readings
    // Catatan: Jika schema gunakan UUID auto-generate di DB, jangan kirim ID manual
    $sql_water = "INSERT INTO water_level_readings 
        (level, location, device_id, timestamp) 
        VALUES 
        ($level_clean, '$location_clean', '$device_id_clean', NOW())
        ON CONFLICT DO NOTHING;";
    psql_execute($sql_water);

    // 4C. Update pump_status feedback di database
    // Ini membantu dashboard tahu apakah perintah sebelumnya sukses dieksekusi
    $sql_pump_feedback = "INSERT INTO pump_status 
        (mode, is_on, device_id, updated_at) 
        VALUES 
        ('$location_clean', $pump_status_clean, '$device_id_clean', NOW())
        ON CONFLICT (mode) DO UPDATE SET 
        is_on = $pump_status_clean,
        updated_at = NOW()
        WHERE device_id = '$device_id_clean';";
    psql_execute($sql_pump_feedback);

    // ==================== 5. CARI COMMAND DARI DEVICE_CONTROLS ====================
    // PERBAIKAN LOGIKA: Ambil command berdasarkan mode/device & cek durasi
    $sql_command = "SELECT 
        dc.command,
        dc.mode,
        dc.updated_at,
        EXTRACT(EPOCH FROM (NOW() - dc.updated_at)) as age_seconds
        FROM device_controls dc
        WHERE dc.device_id = '$device_id_clean' OR dc.mode = '$location_clean'
        ORDER BY dc.updated_at DESC 
        LIMIT 1;";

    // Eksekusi query command
    $result = psql_fetch_row($sql_command);
    
    if ($result) {
        $command = $result[0];      // ON/OFF/NULL
        $mode = $result[1];
        $updated_at = $result[2];
        $age_seconds = (int)$result[3];

        // LOGIKA: Jika command lebih dari 2 jam lalu, consider sebagai expired
        // (Pastikan ini konsisten dengan timeout di Next.js dashboard)
        $command_expired = ($age_seconds > 7200);  // 2 jam = 7200 detik

        if ($command_expired) {
            // Command sudah lama, default ke OFF untuk safety
            $command = 'OFF';
        }
    } else {
        // Tidak ada command, default safety
        $command = 'OFF';
    }

    // ==================== 6. RESPONS KE ESP32 ====================
    // Format JSON agar mudah di-parse di ESP32
    $response = [
        'success' => true,
        'command' => $command,
        'device_id' => $device_id_clean,
        'mode' => $location_clean,
        'timestamp' => date('Y-m-d H:i:s')
    ];

    header('Content-Type: application/json');
    http_response_code(200);
    echo json_encode($response);

    // ==================== 7. LOG UNTUK DEBUG ====================
    error_log("[INPUT-ENHANCED] Device: $device_id_clean | Mode: $location_clean | Command: $command | PH: $ph_clean | Battery: $battery_clean% | Signal: $signal_clean/31");

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'command' => 'OFF'
    ]);
    error_log("[INPUT-ENHANCED] ERROR: " . $e->getMessage());
}
?>
