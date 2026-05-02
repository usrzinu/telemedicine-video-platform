<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

require_once __DIR__ . '/../backend/config/database.php';

$database = new Database();
$db = $database->getConnection();

$doctor_id = isset($_GET['doctor_id']) ? $_GET['doctor_id'] : null;

if (!empty($doctor_id) && is_numeric($doctor_id)) {
    try {
        $query = "
            SELECT id as session_id, slot_id, status, meeting_link 
            FROM sessions 
            WHERE doctor_id = :doctor_id AND status = 'active' 
            ORDER BY started_at DESC LIMIT 1
        ";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(":doctor_id", $doctor_id, PDO::PARAM_INT);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            $session = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!empty($session['meeting_link'])) {
                echo json_encode([
                    "success" => true,
                    "message" => "Meeting link retrieved successfully.",
                    "data" => [
                        "session_id" => $session['session_id'],
                        "slot_id" => $session['slot_id'],
                        "meeting_link" => $session['meeting_link']
                    ]
                ]);
            } else {
                echo json_encode([
                    "success" => false,
                    "error_code" => "NO_MEETING_LINK",
                    "message" => "Meeting link has not been generated for this session.",
                    "data" => new stdClass()
                ]);
            }
        } else {
            echo json_encode([
                "success" => false,
                "error_code" => "NO_ACTIVE_SESSION",
                "message" => "No active session found for this doctor.",
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
        "message" => "Valid numeric doctor_id is required.",
        "data" => new stdClass()
    ]);
}
?>
