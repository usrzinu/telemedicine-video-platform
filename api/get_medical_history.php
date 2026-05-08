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

$patient_id = isset($_GET['patient_id']) ? (int)$_GET['patient_id'] : null;

if (!$patient_id) {
    echo json_encode(["success" => false, "message" => "Patient ID is required."]);
    exit;
}

$database = new Database();
$db = $database->getConnection();

try {
    // Fetch all consultations for the patient
    $stmt = $db->prepare("
        SELECT cr.*, 
               u_doc.name AS doctor_name, 
               d.specialization AS doctor_specialization,
               p.id AS prescription_id
        FROM consultation_records cr
        JOIN users u_doc ON cr.doctor_id = u_doc.id
        LEFT JOIN doctors d ON u_doc.id = d.user_id
        LEFT JOIN prescriptions p ON cr.id = p.consultation_id
        WHERE cr.patient_id = :patient_id
        ORDER BY cr.created_at DESC
    ");
    $stmt->bindParam(':patient_id', $patient_id, PDO::PARAM_INT);
    $stmt->execute();
    
    $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // For each consultation, fetch reports
    foreach ($history as &$cons) {
        $repStmt = $db->prepare("SELECT id, original_name, file_path FROM medical_reports WHERE consultation_id = :id OR booking_id = :bid");
        $repStmt->bindParam(':id', $cons['id'], PDO::PARAM_INT);
        $repStmt->bindParam(':bid', $cons['booking_id'], PDO::PARAM_INT);
        $repStmt->execute();
        $cons['reports'] = $repStmt->fetchAll(PDO::FETCH_ASSOC);
    }

    echo json_encode(["success" => true, "data" => $history]);

} catch (PDOException $e) {
    echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
}
?>
