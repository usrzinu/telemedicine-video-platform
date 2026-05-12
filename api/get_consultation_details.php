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

$booking_id = isset($_GET['booking_id']) ? (int)$_GET['booking_id'] : null;

if (!$booking_id) {
    echo json_encode(["success" => false, "message" => "Booking ID is required."]);
    exit;
}

$database = new Database();
$db = $database->getConnection();

try {
    // 1. Fetch Consultation Record
    $stmt = $db->prepare("
        SELECT 
            cr.*, 
            p.id as prescription_id, 
            u.name as patient_name, 
            u.age, 
            u.gender, 
            u.blood_group, 
            s.date,
            a.queue_position as queue_serial
        FROM consultation_records cr
        JOIN users u ON cr.patient_id = u.id
        JOIN appointments a ON cr.booking_id = a.id
        JOIN doctor_slots s ON a.slot_id = s.id
        LEFT JOIN prescriptions p ON cr.id = p.consultation_id
        WHERE cr.booking_id = :booking_id
        LIMIT 1
    ");
    $stmt->bindParam(':booking_id', $booking_id, PDO::PARAM_INT);
    $stmt->execute();
    
    $record = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$record) {
        // It's possible there is no record yet for this booking
        echo json_encode(["success" => true, "data" => null]);
        exit;
    }

    // 2. Fetch Prescription Medicines if prescription exists
    if ($record['prescription_id']) {
        $medStmt = $db->prepare("SELECT * FROM prescription_medicines WHERE prescription_id = :pid");
        $medStmt->bindParam(':pid', $record['prescription_id'], PDO::PARAM_INT);
        $medStmt->execute();
        $record['medicines'] = $medStmt->fetchAll(PDO::FETCH_ASSOC);
    } else {
        $record['medicines'] = [];
    }

    echo json_encode(["success" => true, "data" => $record]);

} catch (PDOException $e) {
    echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
}
?>
