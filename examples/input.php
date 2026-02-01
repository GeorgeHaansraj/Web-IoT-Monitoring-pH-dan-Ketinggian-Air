<?php
// input.php - IoT Ingest Endpoint (PSQL Workaround)
require_once 'config_psql.php';

function get_input($key, $default = null) {
    return $_POST[$key] ?? $_GET[$key] ?? $default;
}

$json_input = json_decode(file_get_contents('php://input'), true);
if ($json_input) {
    $ph = $json_input['ph'] ?? null;
    $battery = $json_input['battery'] ?? null;
    $location = $json_input['location'] ?? null;
    $level = $json_input['level'] ?? null; 
} else {
    $ph = get_input('ph');
    $battery = get_input('battery');
    $location = get_input('location');
    $level = get_input('level'); 
}

// Validasi
if ($ph === null || $battery === null || $location === null || $level === null) {
    http_response_code(400);
    echo "Error: Missing parameters. Required: ph, battery, location, level.";
    exit;
}

// Sanitasi Data (PENTING karena kita pakai query string manual)
// Pastikan angka benar-benar angka
$ph_clean = (float)$ph;
$battery_clean = (float)$battery;
$level_clean = (float)$level;
// Lokasi hanya boleh string simple (alphanumeric, dash, underscore)
$location_clean = preg_replace('/[^a-zA-Z0-9\-\_]/', '', $location); 
if (empty($location_clean)) $location_clean = 'unknown';

try {
    // 1. Masukkan ke tabel log umum
    $sql1 = "INSERT INTO monitoring_logs (ph_value, battery_level, location, created_at) VALUES ($ph_clean, $battery_clean, '$location_clean', NOW());";
    psql_execute($sql1);

    // 2. Masukkan ke tabel water_level_readings
    $uuid = uniqid('wl_', true); 
    // UUID aman (alphanumeric)
    $sql2 = "INSERT INTO water_level_readings (id, level, timestamp) VALUES ('$uuid', $level_clean, NOW());";
    $output2 = psql_execute($sql2);

    // Cek keberhasilan insert (output psql biasanya "INSERT 0 1")
    if (strpos($output2, 'INSERT') !== false) {
        
        // 3. Cek perintah global
        $sql_c = "SELECT command FROM device_controls ORDER BY updated_at DESC LIMIT 1;";
        $command = psql_fetch_value($sql_c);

        if ($command && !empty($command)) {
            echo $command;
        } else {
            echo "OK";
        }
        
    } else {
        // Jika gagal insert (misal error SQL)
        http_response_code(500);
        // Log output error untuk debug
        echo "Error: Insert failed. " . $output2;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo "Error: " . $e->getMessage();
}
?>