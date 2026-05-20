<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../backend/config/database.php';

function respond(bool $success, string $message, $data = null): void {
    echo json_encode([
        "success" => $success,
        "message" => $message,
        "data"    => $data !== null ? $data : []
    ]);
    exit;
}

$patient_id = isset($_GET['patient_id']) ? (int)$_GET['patient_id'] : null;
$doctor_id = isset($_GET['doctor_id']) ? (int)$_GET['doctor_id'] : 0;

if (!$patient_id) {
    respond(false, "Patient ID is required.");
}

$database = new Database();
$db       = $database->getConnection();

try {
    // Fetch all reports uploaded by this patient across all bookings
    $stmt = $db->prepare("
        SELECT 
            r.id, 
            r.booking_id, 
            r.original_name, 
            r.file_path, 
            r.uploaded_at,
            u.name as doctor_name
        FROM medical_reports r
        LEFT JOIN appointments a ON r.booking_id = a.id
        LEFT JOIN users u ON a.doctor_id = u.id
        WHERE r.patient_id = :patient_id
          AND (:doctor_id = 0 OR a.doctor_id = :doctor_id2)
        ORDER BY r.uploaded_at DESC
    ");

    $stmt->bindParam(':patient_id', $patient_id, PDO::PARAM_INT);
    $stmt->bindParam(':doctor_id', $doctor_id, PDO::PARAM_INT);
    $stmt->bindParam(':doctor_id2', $doctor_id, PDO::PARAM_INT);
    $stmt->execute();

    $reports = $stmt->fetchAll(PDO::FETCH_ASSOC);

    respond(true, "All patient reports retrieved.", $reports);

} catch (PDOException $e) {
    respond(false, "Database error: " . $e->getMessage());
}
