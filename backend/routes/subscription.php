<?php
require_once __DIR__ . '/../controllers/SubscriptionController.php';

$controller = new SubscriptionController();
$method = $_SERVER['REQUEST_METHOD'];

// Get the specific route from the request URI
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$route = str_replace('/backend', '', $requestUri);

switch ($route) {
    case '/api/subscription/status':
        if ($method === 'GET') {
            $controller->getStatus();
        } else {
            http_response_code(405);
            echo json_encode(["status" => "error", "message" => "Method not allowed"]);
        }
        break;

    case '/api/subscription/renew':
        if ($method === 'POST') {
            $controller->renew();
        } else {
            http_response_code(405);
            echo json_encode(["status" => "error", "message" => "Method not allowed"]);
        }
        break;

    default:
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Route not found"]);
        break;
}
?>
