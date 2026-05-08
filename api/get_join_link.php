<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

require_once __DIR__ . '/../backend/config/database.php';

$database = new Database();
$db = $database->getConnection();

$booking_id = isset($_GET['booking_id']) ? $_GET['booking_id'] : null;

if (!empty($booking_id) && is_numeric($booking_id)) {
    try {
        $query = "
            SELECT a.consultation_status, s.status as session_status, s.meeting_link
            FROM appointments a
            LEFT JOIN sessions s ON a.slot_id = s.slot_id AND a.doctor_id = s.doctor_id AND s.status = 'active'
            WHERE a.id = :booking_id
            LIMIT 1
        ";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(":booking_id", $booking_id, PDO::PARAM_INT);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            // 1. Check if session is active
            if ($row['session_status'] !== 'active') {
                echo json_encode([
                    "success" => false,
                    "error_code" => "NO_ACTIVE_SESSION",
                    "message" => "There is no active session for this appointment.",
                    "data" => new stdClass()
                ]);
                exit;
            }

            // 2. Check consultation status
            if ($row['consultation_status'] !== 'ongoing') {
                echo json_encode([
                    "success" => false,
                    "error_code" => "NOT_YOUR_TURN",
                    "message" => "It is not your turn yet, or your consultation has ended.",
                    "data" => new stdClass()
                ]);
                exit;
            }

            // 3. Return meeting link
            if (!empty($row['meeting_link'])) {
                echo json_encode([
                    "success" => true,
                    "message" => "Join link retrieved successfully.",
                    "data" => ["meeting_link" => $row['meeting_link']]
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
                "error_code" => "INVALID_BOOKING",
                "message" => "Booking not found.",
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
        "message" => "Valid numeric booking_id is required.",
        "data" => new stdClass()
    ]);
}
?>
