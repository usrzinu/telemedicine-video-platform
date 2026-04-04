<?php
// Set CORS headers if needed for frontend separation
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

require_once __DIR__ . '/../controllers/AuthController.php';

// Instantiate the controller
$authController = new AuthController();

// Parse the request URI
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Only allow POST requests for auth operations
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method Not Allowed"]);
    exit;
}

// Get the POST JSON payload
$data = json_decode(file_get_contents("php://input"));

// Route logic
if (strpos($uri, '/api/register') !== false) {
    // Handle Registration
    $authController->register($data);
} else if (strpos($uri, '/api/login') !== false) {
    // Handle Login
    $authController->login($data);
} else {
    // 404 Route Not Found
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "API endpoint not found."]);
}
?>
