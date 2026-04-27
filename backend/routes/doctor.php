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

// --- Doctor Slot Management Routes ---
} else if ($uri === '/api/doctor/slot' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $doctorController->addSlot();

} else if ($uri === '/api/doctor/slots' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $doctorController->getSlots();

} else if ($uri === '/api/doctor/slot' && $_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $doctorController->deleteSlot();

// --- Patient Booking Routes ---
} else if ($uri === '/api/doctor/available-slots' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $doctorController->getAvailableSlots();

} else if ($uri === '/api/doctor/book-slot' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $doctorController->bookSlot();

} else if ($uri === '/api/doctor/appointments' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $doctorController->getAppointments();

} else if ($uri === '/api/doctor/patients' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $doctorController->getPatients();

} else {
    // Fallback error (should normally be caught by index.php)
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "API endpoint not found in Doctor Router."]);
}
?>
