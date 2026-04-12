<?php

/**
 * ADMIN ROUTE HANDLER
 */

require_once __DIR__ . '/../controllers/AdminController.php';

// Instantiate the controller
$adminController = new AdminController();

// Parse the request URI for endpoint identification
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Route logic
if (strpos($uri, '/api/admin/pending') !== false) {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(["status" => "error", "message" => "Method Not Allowed"]);
        exit;
    }
    $adminController->getPending();
} else if (strpos($uri, '/api/admin/update-status') !== false) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(["status" => "error", "message" => "Method Not Allowed"]);
        exit;
    }
    // For JSON payload
    $json = json_decode(file_get_contents('php://input'), true);
    $payload = $json ? $json : $_POST;
    $adminController->updateAppStatus($payload);
} else if (strpos($uri, '/api/admin/stats') !== false) {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(["status" => "error", "message" => "Method Not Allowed"]);
        exit;
    }
    $adminController->getStats();
} else if (strpos($uri, '/api/admin/patients') !== false) {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(["status" => "error", "message" => "Method Not Allowed"]);
        exit;
    }
    $adminController->getPatients();
} else {
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "API endpoint not found in Admin Router."]);
}
?>
