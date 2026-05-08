<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../backend/config/database.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['booking_id']) || !isset($data['doctor_id'])) {
    echo json_encode(["success" => false, "message" => "Invalid parameters."]);
    exit;
}

$booking_id = $data['booking_id'];
$doctor_id = $data['doctor_id'];
$symptoms = $data['symptoms'] ?? '';
$diagnosis = $data['diagnosis'] ?? '';
$advice = $data['advice'] ?? '';

$database = new Database();
$db = $database->getConnection();

try {
    // 1. Get patient_id from booking
    $stmt = $db->prepare("SELECT patient_id FROM appointments WHERE id = :booking_id LIMIT 1");
    $stmt->bindParam(':booking_id', $booking_id, PDO::PARAM_INT);
    $stmt->execute();
    
    if ($stmt->rowCount() === 0) {
        echo json_encode(["success" => false, "message" => "Booking not found."]);
        exit;
    }
    
    $booking = $stmt->fetch(PDO::FETCH_ASSOC);
    $patient_id = $booking['patient_id'];

    $weight = $data['weight'] ?? '';
    $bp = $data['blood_pressure'] ?? '';
    $temp = $data['temperature'] ?? '';
    $oxygen = $data['oxygen_level'] ?? '';

    // 2. Check if a record already exists
    $checkStmt = $db->prepare("SELECT id FROM consultation_records WHERE booking_id = :booking_id LIMIT 1");
    $checkStmt->bindParam(':booking_id', $booking_id, PDO::PARAM_INT);
    $checkStmt->execute();

    if ($checkStmt->rowCount() > 0) {
        // Update
        $row = $checkStmt->fetch(PDO::FETCH_ASSOC);
        $record_id = $row['id'];
        
        $updateStmt = $db->prepare("
            UPDATE consultation_records 
            SET symptoms = :symptoms, diagnosis = :diagnosis, advice = :advice,
                weight = :weight, blood_pressure = :bp, temperature = :temp, oxygen_level = :oxygen
            WHERE id = :id
        ");
        $updateStmt->bindParam(':symptoms', $symptoms);
        $updateStmt->bindParam(':diagnosis', $diagnosis);
        $updateStmt->bindParam(':advice', $advice);
        $updateStmt->bindParam(':weight', $weight);
        $updateStmt->bindParam(':bp', $bp);
        $updateStmt->bindParam(':temp', $temp);
        $updateStmt->bindParam(':oxygen', $oxygen);
        $updateStmt->bindParam(':id', $record_id, PDO::PARAM_INT);
        $updateStmt->execute();
        
        echo json_encode(["success" => true, "message" => "Notes & Vitals updated successfully.", "record_id" => $record_id]);
    } else {
        // Insert
        $insertStmt = $db->prepare("
            INSERT INTO consultation_records (booking_id, doctor_id, patient_id, symptoms, diagnosis, advice, weight, blood_pressure, temperature, oxygen_level)
            VALUES (:booking_id, :doctor_id, :patient_id, :symptoms, :diagnosis, :advice, :weight, :bp, :temp, :oxygen)
            RETURNING id
        ");
        $insertStmt->bindParam(':booking_id', $booking_id, PDO::PARAM_INT);
        $insertStmt->bindParam(':doctor_id', $doctor_id, PDO::PARAM_INT);
        $insertStmt->bindParam(':patient_id', $patient_id, PDO::PARAM_INT);
        $insertStmt->bindParam(':symptoms', $symptoms);
        $insertStmt->bindParam(':diagnosis', $diagnosis);
        $insertStmt->bindParam(':advice', $advice);
        $insertStmt->bindParam(':weight', $weight);
        $insertStmt->bindParam(':bp', $bp);
        $insertStmt->bindParam(':temp', $temp);
        $insertStmt->bindParam(':oxygen', $oxygen);
        $insertStmt->execute();
        
        $new_row = $insertStmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode(["success" => true, "message" => "Notes & Vitals saved successfully.", "record_id" => $new_row['id']]);
    }

} catch (PDOException $e) {
    echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
}
?>
