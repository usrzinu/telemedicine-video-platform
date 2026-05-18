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
// exclude_booking_id is optional (used by doctor workspace to hide current booking)
$exclude_id = isset($_GET['exclude_booking_id']) ? (int)$_GET['exclude_booking_id'] : 0;
// doctor_id is optional (enforces strict privacy so doctors only see their own records)
$doctor_id = isset($_GET['doctor_id']) ? (int)$_GET['doctor_id'] : 0;

if (!$patient_id) {
    respond(false, "Patient ID is required.");
}

$database = new Database();
$db       = $database->getConnection();

try {
    // Fetch all completed consultation records for this patient
    $stmt = $db->prepare("
        SELECT
            cr.id,
            cr.booking_id,
            cr.symptoms,
            cr.diagnosis,
            cr.advice,
            cr.weight,
            cr.blood_pressure,
            cr.temperature,
            cr.oxygen_level,
            cr.created_at,
            s.date,
            u.name   AS doctor_name,
            dp.specialization AS doctor_specialization
        FROM consultation_records cr
        JOIN appointments a  ON cr.booking_id = a.id
        JOIN doctor_slots s  ON a.slot_id = s.id
        JOIN users u         ON cr.doctor_id = u.id
        LEFT JOIN doctors dp ON dp.user_id = u.id
        WHERE a.patient_id = :patient_id
          AND (:exclude_id = 0 OR a.id != :exclude_id2)
          AND (:doctor_id = 0 OR cr.doctor_id = :doctor_id2)
        ORDER BY s.date DESC, cr.created_at DESC
    ");

    $stmt->bindParam(':patient_id', $patient_id, PDO::PARAM_INT);
    $stmt->bindParam(':exclude_id', $exclude_id, PDO::PARAM_INT);
    $stmt->bindParam(':exclude_id2', $exclude_id, PDO::PARAM_INT);
    $stmt->bindParam(':doctor_id', $doctor_id, PDO::PARAM_INT);
    $stmt->bindParam(':doctor_id2', $doctor_id, PDO::PARAM_INT);
    $stmt->execute();

    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // For each record, fetch associated prescription id and reports
    foreach ($records as &$record) {
        $bid = (int)$record['booking_id'];

        // Fetch prescription id (latest)
        $pStmt = $db->prepare("
            SELECT id FROM prescriptions
            WHERE consultation_id = :cid
            ORDER BY created_at DESC LIMIT 1
        ");
        $pStmt->bindParam(':cid', $record['id'], PDO::PARAM_INT);
        $pStmt->execute();
        $pRow = $pStmt->fetch(PDO::FETCH_ASSOC);
        $record['prescription_id'] = $pRow ? $pRow['id'] : null;

        // Fetch medical reports for this booking
        $rStmt = $db->prepare("
            SELECT id, original_name, file_path, uploaded_at
            FROM medical_reports
            WHERE booking_id = :bid
            ORDER BY uploaded_at DESC
        ");
        $rStmt->bindParam(':bid', $bid, PDO::PARAM_INT);
        $rStmt->execute();
        $record['reports'] = $rStmt->fetchAll(PDO::FETCH_ASSOC);
    }
    unset($record);

    respond(true, "Medical history retrieved.", $records);

} catch (PDOException $e) {
    respond(false, "Database error: " . $e->getMessage());
}
?>
