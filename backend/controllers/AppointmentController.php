<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/AppointmentModel.php';

class AppointmentController {
    private $db;
    private $appointmentModel;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->appointmentModel = new AppointmentModel($this->db);
    }

    /**
     * POST /api/appointment/book
     */
    public function book() {
        try {
            $input = json_decode(file_get_contents("php://input"), true);

            if (empty($input['doctor_id']) || empty($input['patient_id']) || empty($input['slot_id'])) {
                $this->response("error", "doctor_id, patient_id, and slot_id are required.");
                return;
            }

            $queue_position = $this->appointmentModel->create($input['doctor_id'], $input['patient_id'], $input['slot_id']);

            if ($queue_position !== false) {
                http_response_code(200);
                echo json_encode([
                    "status" => "success",
                    "message" => "Appointment booked successfully.",
                    "queue_position" => $queue_position
                ]);
            } else {
                $this->response("error", "Failed to book appointment.");
            }
        } catch (Exception $e) {
            $this->response("error", "Server exception: " . $e->getMessage());
        }
    }

    /**
     * Generic JSON response helper
     */
    private function response($status, $message) {
        http_response_code($status === "success" ? 200 : 400);
        echo json_encode([
            "status" => $status,
            "message" => $message
        ]);
    }
}
?>
