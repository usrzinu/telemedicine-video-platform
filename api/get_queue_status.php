<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

require_once __DIR__ . '/../backend/config/database.php';

$database = new Database();
$db = $database->getConnection();

$slot_id = isset($_GET['slot_id']) ? $_GET['slot_id'] : null;

if (!empty($slot_id) && is_numeric($slot_id)) {
    try {
        // Get list of patients for this slot_id with their queue_position and consultation_status
        $query = "SELECT a.id as booking_id, a.patient_id, a.queue_position as queue_serial, a.consultation_status, 
                         u.name as patient_name, u.age, u.gender, u.blood_group, s.date 
                  FROM appointments a
                  JOIN users u ON a.patient_id = u.id
                  JOIN doctor_slots s ON a.slot_id = s.id
                  WHERE a.slot_id = :slot_id 
                  ORDER BY a.queue_position ASC NULLS LAST, a.id ASC";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(":slot_id", $slot_id, PDO::PARAM_INT);
        $stmt->execute();

        $patients = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $patients[] = $row;
        }

        echo json_encode([
            "success" => true,
            "message" => "Queue status retrieved successfully.",
            "data" => ["queue" => $patients]
        ]);

    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "error_code" => "DB_ERROR",
            "message" => "Database error: " . $e->getMessage(),
            "data" => new stdClass()
        ]);
    }
} else {
    echo json_encode([
        "success" => false,
        "error_code" => "INVALID_INPUT",
        "message" => "Valid numeric slot_id is required.",
        "data" => new stdClass()
    ]);
}
?>
