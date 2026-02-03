<?php
/**
 * BRIDGE CONTROL FILE
 * File: control.php
 * Location: 20.2.138.40/control.php
 * 
 * Middleware antara Vercel API dan ESP32
 * Receive commands from Vercel API, forward ke ESP32
 */

// --- 1. KONFIGURASI ---
define('BRIDGE_VERSION', '1.0');
define('LOG_FILE', '/var/log/bridge_control.log');

// ESP32 Configuration
$ESP32_CONFIG = [
    'http_url' => 'http://192.168.1.100:8080', // Ganti dengan ESP32 IP
    'mqtt_enabled' => false, // Set true jika pakai MQTT
    'mqtt_broker' => 'broker.emqx.io',
    'mqtt_port' => 1883
];

// Database Configuration (Optional)
$DB_CONFIG = [
    'host' => 'localhost',
    'user' => 'root',
    'pass' => 'password',
    'name' => 'monitoring_db'
];

// --- 2. LOGGING FUNCTION ---
function logBridge($message, $level = 'INFO') {
    $timestamp = date('Y-m-d H:i:s');
    $log_msg = "[$timestamp] [$level] $message\n";
    error_log($log_msg, 3, LOG_FILE);
    error_log($log_msg); // Also to PHP error log
}

// --- 3. VALIDATE REQUEST ---
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

// Optional: Validate API Key from Vercel
$api_key = $_POST['api_key'] ?? '';
$vercel_api_key = getenv('API_KEY_VERCEL');
// if ($vercel_api_key && $api_key !== $vercel_api_key) {
//     http_response_code(401);
//     echo json_encode(['error' => 'Unauthorized']);
//     exit;
// }

header('Content-Type: application/json');

// --- 4. PARSE REQUEST ---
$action = $_POST['action'] ?? null;
$mode = $_POST['mode'] ?? 'sawah';
$state = $_POST['state'] ?? '0';

logBridge("Request received: action=$action, mode=$mode, state=$state", 'INFO');

// --- 5. ROUTE HANDLER ---

// CASE 1: SET PUMP (Dari Dashboard)
if ($action === 'set_pump') {
    logBridge(">>> Handling SET_PUMP for mode=$mode, state=$state");
    
    $pump_on = ($state === '1' || $state === 'true');
    $command = $pump_on ? 'POMPA_ON' : 'POMPA_OFF';
    
    // Option A: Send to ESP32 via HTTP
    $success = sendToESP32HTTP($mode, $state);
    
    // Option B: Send to ESP32 via MQTT (uncomment if using MQTT)
    // $success = sendToESP32MQTT($mode, $command);
    
    if ($success) {
        logBridge("✓ Command forwarded to ESP32 successfully");
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => "Pompa $mode " . ($pump_on ? 'dihidupkan' : 'dimatikan'),
            'command_sent' => $command
        ]);
    } else {
        logBridge("✗ Failed to forward command to ESP32", 'ERROR');
        http_response_code(503);
        echo json_encode([
            'success' => false,
            'error' => 'Failed to contact ESP32'
        ]);
    }
}

// CASE 2: GET PUMP STATUS
elseif ($action === 'get_status') {
    logBridge(">>> Handling GET_STATUS for mode=$mode");
    
    $status = getESP32Status($mode);
    
    if ($status !== null) {
        logBridge("✓ Status retrieved: " . ($status ? 'ON' : 'OFF'));
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'mode' => $mode,
            'pump_on' => $status,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    } else {
        logBridge("✗ Could not retrieve status", 'ERROR');
        http_response_code(503);
        echo json_encode([
            'success' => false,
            'error' => 'Status unavailable'
        ]);
    }
}

// CASE 3: GET HEALTH CHECK
elseif ($action === 'health') {
    logBridge(">>> Health check from Vercel");
    
    $esp32_reachable = checkESP32Reachable();
    
    http_response_code(200);
    echo json_encode([
        'status' => 'ok',
        'version' => BRIDGE_VERSION,
        'esp32_reachable' => $esp32_reachable,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}

// DEFAULT: Unknown action
else {
    logBridge("✗ Unknown action: $action", 'WARNING');
    http_response_code(400);
    echo json_encode(['error' => 'Unknown action']);
}

// --- 6. HELPER FUNCTIONS ---

/**
 * Send command to ESP32 via HTTP
 */
function sendToESP32HTTP($mode, $state) {
    global $ESP32_CONFIG;
    
    $url = $ESP32_CONFIG['http_url'] . '/relay';
    $post_data = http_build_query([
        'mode' => $mode,
        'state' => $state
    ]);
    
    logBridge("HTTP Request: $url with state=$state");
    
    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => 'Content-Type: application/x-www-form-urlencoded',
            'content' => $post_data,
            'timeout' => 5
        ]
    ]);
    
    $response = @file_get_contents($url, false, $context);
    
    if ($response === false) {
        logBridge("✗ HTTP request failed to: $url", 'ERROR');
        return false;
    }
    
    logBridge("✓ HTTP Response: $response");
    return true;
}

/**
 * Send command to ESP32 via MQTT (Optional)
 */
function sendToESP32MQTT($mode, $command) {
    global $ESP32_CONFIG;
    
    if (!$ESP32_CONFIG['mqtt_enabled']) {
        return false;
    }
    
    $topic = "esp32/{$mode}/relay";
    
    // Using shell command (requires mosquitto-clients)
    $cmd = "mosquitto_pub -h " . $ESP32_CONFIG['mqtt_broker'] . 
           " -p " . $ESP32_CONFIG['mqtt_port'] . 
           " -t '$topic' -m '$command'";
    
    logBridge("MQTT Publish: topic=$topic, message=$command");
    
    $output = shell_exec($cmd . ' 2>&1');
    
    if ($output !== null) {
        logBridge("✓ MQTT published successfully");
        return true;
    } else {
        logBridge("✗ MQTT publish failed", 'ERROR');
        return false;
    }
}

/**
 * Get current pump status from ESP32
 */
function getESP32Status($mode) {
    global $ESP32_CONFIG;
    
    $url = $ESP32_CONFIG['http_url'] . '/status?mode=' . urlencode($mode);
    
    logBridge("Fetching status from: $url");
    
    $context = stream_context_create([
        'http' => ['timeout' => 5]
    ]);
    
    $response = @file_get_contents($url, false, $context);
    
    if ($response === false) {
        logBridge("✗ Failed to get status from ESP32", 'ERROR');
        return null;
    }
    
    // Parse JSON response dari ESP32
    $data = json_decode($response, true);
    if ($data && isset($data['pump_on'])) {
        return $data['pump_on'];
    }
    
    return null;
}

/**
 * Check if ESP32 is reachable
 */
function checkESP32Reachable() {
    global $ESP32_CONFIG;
    
    $url = $ESP32_CONFIG['http_url'] . '/health';
    
    $context = stream_context_create([
        'http' => ['timeout' => 3]
    ]);
    
    $response = @file_get_contents($url, false, $context);
    return $response !== false;
}

// --- 7. FOOTER ---
logBridge("=== Request completed ===");
?>
