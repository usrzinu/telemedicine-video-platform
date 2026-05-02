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
        // 1. Validate booking exists and get its slot_id, consultation_status
        $query = "
            SELECT a.consultation_status, s.status as session_status
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

            // 2. Check if session is active
            if ($row['session_status'] !== 'active') {
                echo json_encode([
                    "success" => true,
                    "data" => [
                        "can_join" => false,
                        "message" => "Session has not started yet or has ended."
                    ]
                ]);
                exit;
            }

            // 3. Check consultation_status
            if ($row['consultation_status'] === 'ongoing') {
                echo json_encode([
                    "success" => true,
                    "data" => [
                        "can_join" => true,
                        "message" => "Join Now"
                    ]
                ]);
            } else if ($row['consultation_status'] === 'waiting') {
                echo json_encode([
                    "success" => true,
                    "data" => [
                        "can_join" => false,
                        "message" => "Waiting for your turn"
                    ]
                ]);
            } else {
                echo json_encode([
                    "success" => true,
                    "data" => [
                        "can_join" => false,
                        "message" => "Consultation completed"
                    ]
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
