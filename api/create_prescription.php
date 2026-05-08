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

if (!isset($data['consultation_id']) || !isset($data['medicines'])) {
    echo json_encode(["success" => false, "message" => "Invalid parameters."]);
    exit;
}

$consultation_id = $data['consultation_id'];
$booking_id = $data['booking_id'];
$doctor_id = $data['doctor_id'];
$medicines = $data['medicines'];

$database = new Database();
$db = $database->getConnection();

try {
    $db->beginTransaction();

    // 1. Get patient_id from consultation
    $stmt = $db->prepare("SELECT patient_id, symptoms, diagnosis, advice FROM consultation_records WHERE id = :id LIMIT 1");
    $stmt->bindParam(':id', $consultation_id, PDO::PARAM_INT);
    $stmt->execute();
    
    if ($stmt->rowCount() === 0) {
        throw new Exception("Consultation record not found.");
    }
    
    $cons = $stmt->fetch(PDO::FETCH_ASSOC);
    $patient_id = $cons['patient_id'];

    // 2. Create Prescription Metadata
    // Check if already exists
    $checkStmt = $db->prepare("SELECT id FROM prescriptions WHERE consultation_id = :id LIMIT 1");
    $checkStmt->bindParam(':id', $consultation_id, PDO::PARAM_INT);
    $checkStmt->execute();

    if ($checkStmt->rowCount() > 0) {
        $prescription_id = $checkStmt->fetch(PDO::FETCH_ASSOC)['id'];
        // Delete old medicines for this prescription to avoid duplicates
        $delStmt = $db->prepare("DELETE FROM prescription_medicines WHERE prescription_id = :id");
        $delStmt->bindParam(':id', $prescription_id, PDO::PARAM_INT);
        $delStmt->execute();
    } else {
        $insStmt = $db->prepare("
            INSERT INTO prescriptions (consultation_id, booking_id, patient_id, doctor_id, symptoms, diagnosis, advice)
            VALUES (:consultation_id, :booking_id, :patient_id, :doctor_id, :symptoms, :diagnosis, :advice)
            RETURNING id
        ");
        $insStmt->bindParam(':consultation_id', $consultation_id, PDO::PARAM_INT);
        $insStmt->bindParam(':booking_id', $booking_id, PDO::PARAM_INT);
        $insStmt->bindParam(':patient_id', $patient_id, PDO::PARAM_INT);
        $insStmt->bindParam(':doctor_id', $doctor_id, PDO::PARAM_INT);
        $insStmt->bindParam(':symptoms', $cons['symptoms']);
        $insStmt->bindParam(':diagnosis', $cons['diagnosis']);
        $insStmt->bindParam(':advice', $cons['advice']);
        $insStmt->execute();
        $prescription_id = $insStmt->fetch(PDO::FETCH_ASSOC)['id'];
    }

    // 3. Insert Medicines
    $medStmt = $db->prepare("
        INSERT INTO prescription_medicines (prescription_id, medicine_name, dosage, frequency, duration, instructions)
        VALUES (:prescription_id, :name, :dosage, :frequency, :duration, :instructions)
    ");

    foreach ($medicines as $med) {
        $medStmt->bindParam(':prescription_id', $prescription_id, PDO::PARAM_INT);
        $medStmt->bindParam(':name', $med['name']);
        $medStmt->bindParam(':dosage', $med['dosage']);
        $medStmt->bindParam(':frequency', $med['frequency']);
        $medStmt->bindParam(':duration', $med['duration']);
        $medStmt->bindParam(':instructions', $med['instructions']);
        $medStmt->execute();
    }

    $db->commit();
    echo json_encode(["success" => true, "message" => "Prescription created successfully.", "prescription_id" => $prescription_id]);

} catch (Exception $e) {
    $db->rollBack();
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
?>
