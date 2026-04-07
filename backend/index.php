<?php

/**
 * AURAMED - Backend Entry Point (Front Controller)
 * 
 * This file handles all incoming requests, sets up the environment,
 * and routes requests to the appropriate handlers.
 */

// 1. Simple .env Loader
// This function reads the .env file and populates the $_ENV array.
function loadEnv($path) {
    if (!file_exists($path)) return;
    
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue; // Skip comments
        
        list($name, $value) = explode('=', $line, 2);
        $_ENV[trim($name)] = trim($value);
        putenv(trim($name) . "=" . trim($value));
    }
}

// Load environment variables from the .env file
loadEnv(__DIR__ . '/.env');

// 2. Set Global Headers
// Allow requests from any origin (CORS) and specify JSON response format.
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 3. Simple Routing System
// Identify the requested endpoint based on the URI.
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$basePath = '/backend'; // Adjust this if your project is in a different folder

// Normalize the URI (remove the base path)
$route = str_replace($basePath, '', $requestUri);

// Route Logic
switch ($route) {
    case '/api/login':
    case '/api/register':
        // Include the authentication route handler
        require_once __DIR__ . '/routes/auth.php';
        break;

    case '/api/doctor/apply':
    case '/api/doctors':
        // Include the doctor route handler
        require_once __DIR__ . '/routes/doctor.php';
        break;

    default:
        // Return 404 if the route isn't found
        http_response_code(404);
        echo json_encode([
            "status" => "error", 
            "message" => "Endpoint not found: " . $route
        ]);
        break;
}
?>
