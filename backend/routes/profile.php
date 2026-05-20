<?php
require_once __DIR__ . '/../controllers/ProfileController.php';
require_once __DIR__ . '/../config/Database.php';

$db = (new Database())->getConnection();
$controller = new ProfileController($db);
$method = $_SERVER['REQUEST_METHOD'];

$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$route = str_replace('/backend', '', $requestUri);

switch ($route) {
    case '/api/profile/get':
        if ($method === 'GET') {
            $controller->getProfile($_GET['doctor_id'] ?? 0);
        } else {
            http_response_code(405);
            echo json_encode(["status" => "error", "message" => "Method not allowed"]);
        }
        break;

    case '/api/profile/update':
        if ($method === 'POST') {
            $controller->updateProfile();
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
