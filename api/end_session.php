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
        // 1. Validate doctor ownership of the session
        $check_query = "SELECT id FROM sessions WHERE id = :session_id AND doctor_id = :doctor_id AND status = 'active' LIMIT 1";
        $stmt_check = $db->prepare($check_query);
        $stmt_check->bindParam(":session_id", $session_id, PDO::PARAM_INT);
        $stmt_check->bindParam(":doctor_id", $doctor_id, PDO::PARAM_INT);
        $stmt_check->execute();

        if ($stmt_check->rowCount() == 0) {
            echo json_encode([
                "success" => false, 
                "error_code" => "INVALID_SESSION", 
                "message" => "Invalid session_id, not an active session, or you do not have permission to end this session.", 
                "data" => new stdClass()
            ]);
            exit;
        }

        // 2. Update session status to ended
        $update_query = "UPDATE sessions SET status = 'ended', ended_at = NOW() WHERE id = :session_id";
        $stmt_update = $db->prepare($update_query);
        $stmt_update->bindParam(":session_id", $session_id, PDO::PARAM_INT);

        if ($stmt_update->execute()) {
            echo json_encode([
                "success" => true,
                "message" => "Session ended successfully.",
                "data" => ["session_id" => $session_id]
            ]);
        } else {
            echo json_encode([
                "success" => false, 
                "error_code" => "UPDATE_FAILED",
                "message" => "Failed to end session.", 
                "data" => new stdClass()
            ]);
        }
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
        "message" => "Valid numeric session_id and doctor_id are required.", 
        "data" => new stdClass()
    ]);
}
?>
