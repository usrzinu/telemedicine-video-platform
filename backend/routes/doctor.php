<?php

/**
 * DOCTOR ROUTE HANDLER
 */

require_once __DIR__ . '/../controllers/DoctorController.php';

// Instantiate the controller
$doctorController = new DoctorController();

// Parse the request URI for endpoint identification
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Get the POST payload (JSON and files)
$data = $_POST;
$files = $_FILES;

// Route logic
if (strpos($uri, '/api/doctor/apply') !== false) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(["status" => "error", "message" => "Method Not Allowed"]);
        exit;
    }
    
    $doctorController->apply($data, $files);
} else if ($uri === '/api/doctors') {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(["status" => "error", "message" => "Method Not Allowed"]);
        exit;
    }
    $doctorController->getApproved();
} else if (strpos($uri, '/api/admin/pending') !== false) {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(["status" => "error", "message" => "Method Not Allowed"]);
        exit;
    }
    $doctorController->getPending();
} else if (strpos($uri, '/api/admin/update-status') !== false) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(["status" => "error", "message" => "Method Not Allowed"]);
        exit;
    }
    // For JSON payload
    $json = json_decode(file_get_contents('php://input'), true);
    $payload = $json ? $json : $_POST;
    $doctorController->updateAppStatus($payload);
} else if (strpos($uri, '/api/admin/stats') !== false) {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(["status" => "error", "message" => "Method Not Allowed"]);
        exit;
    }
    $doctorController->getStats();
} else {
    // Fallback error (should normally be caught by index.php)
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "API endpoint not found in Doctor Router."]);
}
?>
