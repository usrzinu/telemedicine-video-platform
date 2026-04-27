<?php
require_once __DIR__ . '/../controllers/PaymentController.php';

$controller = new PaymentController();

// Extract the route
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$route = str_replace('/backend', '', $requestUri);

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $route === '/api/payment/pay') {
    $controller->pay();
} else if ($_SERVER['REQUEST_METHOD'] === 'GET' && $route === '/api/payment/doctor-requests') {
    $controller->getDoctorPaymentRequests();
} else if ($_SERVER['REQUEST_METHOD'] === 'POST' && $route === '/api/payment/verify-doctor') {
    $controller->verifyByDoctor();
} else {
    http_response_code(404);
    echo json_encode([
        "status" => "error", 
        "message" => "Endpoint not found in payment routes"
    ]);
}
?>
