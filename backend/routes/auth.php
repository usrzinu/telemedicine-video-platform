<?php

/**
 * AUTH ROUTE HANDLER
 */

require_once __DIR__ . '/../controllers/AuthController.php';

// Instantiate the controller
$authController = new AuthController();

// Parse the request URI for endpoint identification
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Handle Registration (Supports JSON and Multipart/FormData)
if (strpos($uri, '/api/register') !== false) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(["status" => "error", "message" => "Method Not Allowed"]);
        exit;
    }
    
    // Check if it's a FormData request or JSON
    $contentType = isset($_SERVER["CONTENT_TYPE"]) ? $_SERVER["CONTENT_TYPE"] : '';
    if (strpos($contentType, 'multipart/form-data') !== false) {
        $data = (object)$_POST;
        $files = $_FILES;
        $authController->register($data, $files);
    } else {
        $data = json_decode(file_get_contents("php://input"));
        $authController->register($data);
    }
} else if (strpos($uri, '/api/login') !== false) {
    // Check if correct method
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(["status" => "error", "message" => "Method Not Allowed"]);
        exit;
    }
    // Handle Login
    $data = json_decode(file_get_contents("php://input"));
    $authController->login($data);
} else {
    // Fallback error (should normally be caught by index.php)
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "API endpoint not found in Auth Router."]);
}
?>
