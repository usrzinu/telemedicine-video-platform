<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

require_once __DIR__ . '/../backend/config/database.php';

$database = new Database();
$db = $database->getConnection();

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->session_id) && !empty($data->doctor_id) && is_numeric($data->session_id) && is_numeric($data->doctor_id)) {
    $session_id = $data->session_id;
    $doctor_id = $data->doctor_id;

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
                "message" => "Invalid doctor ID or you are not a doctor.",
                "data" => new stdClass()
            ]);
            exit;
        }

        // 2. Validate session belongs to this doctor and is active, and get slot_id
        $check_session = "SELECT slot_id FROM sessions WHERE id = :session_id AND doctor_id = :doctor_id AND status = 'active' LIMIT 1";
        $stmt_session = $db->prepare($check_session);
        $stmt_session->bindParam(":session_id", $session_id, PDO::PARAM_INT);
        $stmt_session->bindParam(":doctor_id", $doctor_id, PDO::PARAM_INT);
        $stmt_session->execute();

        if ($stmt_session->rowCount() == 0) {
            $db->rollBack();
            echo json_encode([
                "success" => false,
                "error_code" => "INVALID_SESSION",
                "message" => "No active session found for this doctor and session_id.",
                "data" => new stdClass()
            ]);
            exit;
        }

        $session_row = $stmt_session->fetch(PDO::FETCH_ASSOC);
        $slot_id = $session_row['slot_id'];

        // 3. Update current 'ongoing' patient to 'completed'
        $update_ongoing = "UPDATE appointments SET consultation_status = 'completed' WHERE slot_id = :slot_id AND consultation_status = 'ongoing'";
        $stmt_update_ongoing = $db->prepare($update_ongoing);
        $stmt_update_ongoing->bindParam(":slot_id", $slot_id, PDO::PARAM_INT);
        $stmt_update_ongoing->execute();

        // 4. Get next patient in queue
        $get_next = "SELECT id FROM appointments WHERE slot_id = :slot_id AND consultation_status = 'waiting' ORDER BY queue_position ASC LIMIT 1";
        $stmt_next = $db->prepare($get_next);
        $stmt_next->bindParam(":slot_id", $slot_id, PDO::PARAM_INT);
        $stmt_next->execute();

        if ($stmt_next->rowCount() > 0) {
            $next_patient = $stmt_next->fetch(PDO::FETCH_ASSOC);
            $next_id = $next_patient['id'];

            // 5. Update next -> 'ongoing'
            $update_next = "UPDATE appointments SET consultation_status = 'ongoing' WHERE id = :next_id";
            $stmt_update_next = $db->prepare($update_next);
            $stmt_update_next->bindParam(":next_id", $next_id, PDO::PARAM_INT);
            $stmt_update_next->execute();

            $db->commit();

            echo json_encode([
                "success" => true,
                "message" => "Next patient called successfully.",
                "data" => ["ongoing_appointment_id" => $next_id]
            ]);
        } else {
            $db->commit(); // Commit the completed status of the previous patient
            echo json_encode([
                "success" => true,
                "message" => "All patients completed",
                "data" => ["ongoing_appointment_id" => null]
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
        "message" => "Valid numeric session_id and doctor_id are required.",
        "data" => new stdClass()
    ]);
}
?>
