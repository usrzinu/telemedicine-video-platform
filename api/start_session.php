<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

require_once __DIR__ . '/../backend/config/database.php';

$database = new Database();
$db = $database->getConnection();

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->doctor_id) && !empty($data->slot_id) && is_numeric($data->doctor_id) && is_numeric($data->slot_id)) {
    $doctor_id = $data->doctor_id;
    $slot_id = $data->slot_id;

    try {
        $db->beginTransaction();

        // 1. Validate doctor role
        $check_role = "SELECT id FROM users WHERE id = :doctor_id AND role = 'doctor' LIMIT 1";
        $stmt_role = $db->prepare($check_role);
        $stmt_role->bindParam(":doctor_id", $doctor_id, PDO::PARAM_INT);
        $stmt_role->execute();

        if ($stmt_role->rowCount() == 0) {
            $db->rollBack();
            echo json_encode([
                "success" => false, 
                "error_code" => "INVALID_DOCTOR", 
                "message" => "Invalid doctor ID or the user is not a doctor.", 
                "data" => new stdClass()
            ]);
            exit;
        }

        // 2. Check if active session already exists for this doctor and slot
        $check_session = "SELECT id FROM sessions WHERE doctor_id = :doctor_id AND slot_id = :slot_id AND status = 'active' LIMIT 1";
        $stmt_session = $db->prepare($check_session);
        $stmt_session->bindParam(":doctor_id", $doctor_id, PDO::PARAM_INT);
        $stmt_session->bindParam(":slot_id", $slot_id, PDO::PARAM_INT);
        $stmt_session->execute();

        if ($stmt_session->rowCount() > 0) {
            $db->rollBack();
            echo json_encode([
                "success" => false, 
                "error_code" => "SESSION_EXISTS", 
                "message" => "An active session already exists for this slot.", 
                "data" => new stdClass()
            ]);
            exit;
        }

        // 3. Create new session with meeting link
        $room_name = "doctor_" . $doctor_id . "_slot_" . $slot_id . "_" . uniqid();
        $meeting_link = "https://meet.jit.si/" . $room_name;

        $insert_session = "INSERT INTO sessions (doctor_id, slot_id, status, meeting_link) VALUES (:doctor_id, :slot_id, 'active', :meeting_link) RETURNING id";
        $stmt_insert = $db->prepare($insert_session);
        $stmt_insert->bindParam(":doctor_id", $doctor_id, PDO::PARAM_INT);
        $stmt_insert->bindParam(":slot_id", $slot_id, PDO::PARAM_INT);
        $stmt_insert->bindParam(":meeting_link", $meeting_link, PDO::PARAM_STR);
        
        if ($stmt_insert->execute()) {
            $row = $stmt_insert->fetch(PDO::FETCH_ASSOC);
            $session_id = $row['id'];
            
            // 4. Automatically call the first patient in the queue
            $get_next = "SELECT id FROM appointments WHERE slot_id = :slot_id AND consultation_status = 'waiting' ORDER BY queue_position ASC LIMIT 1";
            $stmt_next = $db->prepare($get_next);
            $stmt_next->bindParam(":slot_id", $slot_id, PDO::PARAM_INT);
            $stmt_next->execute();

            if ($stmt_next->rowCount() > 0) {
                $next_patient = $stmt_next->fetch(PDO::FETCH_ASSOC);
                $next_id = $next_patient['id'];

                $update_next = "UPDATE appointments SET consultation_status = 'ongoing' WHERE id = :next_id";
                $stmt_update_next = $db->prepare($update_next);
                $stmt_update_next->bindParam(":next_id", $next_id, PDO::PARAM_INT);
                $stmt_update_next->execute();
            }

            $db->commit();
            
            echo json_encode([
                "success" => true,
                "message" => "Session started successfully.",
                "data" => [
                    "session_id" => $session_id,
                    "meeting_link" => $meeting_link
                ]
            ]);
        } else {
            $db->rollBack();
            echo json_encode([
                "success" => false, 
                "error_code" => "INSERT_FAILED",
                "message" => "Failed to start session.", 
                "data" => new stdClass()
            ]);
        }
    } catch (PDOException $e) {
        $db->rollBack();
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
        "message" => "Valid numeric doctor_id and slot_id are required.", 
        "data" => new stdClass()
    ]);
}
?>
