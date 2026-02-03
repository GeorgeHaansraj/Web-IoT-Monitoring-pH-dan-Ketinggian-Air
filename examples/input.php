<?php
/**
 * input.php - FINAL FIX
 * Solusi Error: "null value in column id violates not-null constraint"
 * Fitur: Auto-Generate UUID & Support Signal/Pump Status
 */

// Konfigurasi Database (Sesuaikan credential Anda jika perlu)
require_once 'config_psql.php';

// --- FUNGSI GENERATOR UUID V4 (Wajib untuk Postgres) ---
function gen_uuid() {
    return sprintf( '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand( 0, 0xffff ), mt_rand( 0, 0xffff ),
        mt_rand( 0, 0xffff ),
        mt_rand( 0, 0x0fff ) | 0x4000,
        mt_rand( 0, 0x3fff ) | 0x8000,
        mt_rand( 0, 0xffff ), mt_rand( 0, 0xffff ), mt_rand( 0, 0xffff )
    );
}

function get_input($key, $default = null) {
    return $_POST[$key] ?? $_GET[$key] ?? $default;
}

// 1. TERIMA DATA (Support JSON & Form-Data)
$json_input = json_decode(file_get_contents('php://input'), true);
if ($json_input) {
    $ph = $json_input['ph'] ?? null;
    $battery = $json_input['battery'] ?? null;
    $location = $json_input['location'] ?? 'unknown';
    $level = $json_input['level'] ?? null;
    $signal = $json_input['signal'] ?? 0;        // Data Baru
    $pump = $json_input['pump_status'] ?? false; // Data Baru
} else {
    $ph = get_input('ph');
    $battery = get_input('battery');
    $location = get_input('location', 'unknown');
    $level = get_input('level');
    $signal = get_input('signal', 0);
    $pump = get_input('pump_status', 'false');
}

// Konversi boolean pump status ke string 'true'/'false' untuk log
$pump_val = ($pump === true || $pump === 'true' || $pump == 1) ? 'true' : 'false';

// Validasi Dasar
if ($ph === null) {
    http_response_code(400);
    echo "Error: Data tidak lengkap (ph missing)";
    exit;
}

// Sanitasi
$ph_clean = (float)$ph;
$battery_clean = (float)$battery;
$level_clean = (float)$level;
$signal_clean = (int)$signal;
$location_clean = preg_replace('/[^a-zA-Z0-9\-\_]/', '', $location);

// --- GENERATE ID UNTUK DATABASE ---
$new_id_log = gen_uuid(); 
$new_id_wl = gen_uuid();

try {
    // 2. QUERY INSERT UTAMA (MONITORING_LOGS)
    // Perbaikan: Menambahkan kolom 'id' secara eksplisit
    $sql1 = "INSERT INTO monitoring_logs 
            (id, ph_value, battery_level, location, signal_strength, pump_status, created_at) 
            VALUES 
            ('$new_id_log', $ph_clean, $battery_clean, '$location_clean', $signal_clean, $pump_val, NOW());";
    
    psql_execute($sql1);

    // 3. QUERY INSERT WATER LEVEL (Jika ada data level)
    if ($level !== null) {
        $sql2 = "INSERT INTO water_level_readings (id, level, timestamp) VALUES ('$new_id_wl', $level_clean, NOW());";
        psql_execute($sql2);
    }

    // 4. CEK PERINTAH KONTROL (Feedback ke ESP32)
    // Ambil perintah terakhir untuk lokasi/device ini
    $sql_c = "SELECT command FROM device_controls ORDER BY updated_at DESC LIMIT 1;";
    $command = psql_fetch_value($sql_c);

    // Format Response JSON (Agar ESP32 mudah baca)
    header('Content-Type: application/json');
    
    if ($command && !empty($command)) {
        // Kirim command yang ada di DB
        echo json_encode(["status" => "success", "command" => $command]);
    } else {
        // Default aman
        echo json_encode(["status" => "success", "command" => "OFF"]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo "Error: " . $e->getMessage();
}
?>