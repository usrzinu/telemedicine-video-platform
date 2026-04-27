<?php
require_once __DIR__ . '/../controllers/AppointmentController.php';

$appointmentController = new AppointmentController();

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if ($uri === '/api/appointment/book' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $appointmentController->book();
} else {
    // Fallback error
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "API endpoint not found in Appointment Router."]);
}
?>
