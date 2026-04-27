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

            $result = $this->appointmentModel->create($input['doctor_id'], $input['patient_id'], $input['slot_id']);

            if ($result === "Slot Full") {
                $this->response("error", "This slot is full. Please select another slot.");
                return;
            }

            if ($result !== false) {
                http_response_code(200);
                echo json_encode([
                    "status" => "success",
                    "message" => "Booking request sent. Awaiting doctor approval.",
                    "appointment_id" => $result['id']
                ]);
            } else {
                $this->response("error", "Failed to book appointment.");
            }
        } catch (Exception $e) {
            $this->response("error", "Server exception: " . $e->getMessage());
        }
    }

    /**
     * GET /api/appointment/requests?doctor_id=X
     * Returns all pending_doctor appointments for a doctor
     */
    public function getIncomingRequests() {
        try {
            $doctor_id = isset($_GET['doctor_id']) ? intval($_GET['doctor_id']) : null;

            if (!$doctor_id) {
                $this->response("error", "doctor_id is required.");
                return;
            }

            $requests = $this->appointmentModel->getPendingRequestsByDoctor($doctor_id);

            http_response_code(200);
            echo json_encode([
                "status" => "success",
                "data"   => $requests
            ]);
        } catch (Exception $e) {
            $this->response("error", "Server exception: " . $e->getMessage());
        }
    }

    /**
     * POST /api/appointment/update-status
     * Body: { appointment_id, status } where status = 'approved' | 'rejected'
     */
    public function updateStatus() {
        try {
            $input = json_decode(file_get_contents("php://input"), true);

            if (empty($input['appointment_id']) || empty($input['status'])) {
                $this->response("error", "appointment_id and status are required.");
                return;
            }

            $allowed = ['approved', 'rejected'];
            if (!in_array($input['status'], $allowed)) {
                $this->response("error", "Invalid status. Allowed: approved, rejected.");
                return;
            }

            $ok = $this->appointmentModel->updateStatus(
                intval($input['appointment_id']),
                $input['status']
            );

            if ($ok === "Slot Full") {
                $this->response("error", "Cannot approve: This slot has already reached its maximum capacity (20 patients).");
                return;
            }

            if ($ok) {
                $msg = $input['status'] === 'approved'
                    ? "Appointment approved. Patient can now proceed with payment."
                    : "Appointment request rejected.";
                $this->response("success", $msg);
            } else {
                $this->response("error", "Update failed. Appointment not found, slot already full, or already processed.");
            }
        } catch (Exception $e) {
            $this->response("error", "Server exception: " . $e->getMessage());
        }
    }

    /**
     * GET /api/appointment/patient?patient_id=X
     */
    public function getPatientAppointments() {
        try {
            $patient_id = isset($_GET['patient_id']) ? intval($_GET['patient_id']) : null;

            if (!$patient_id) {
                $this->response("error", "patient_id is required.");
                return;
            }

            $appointments = $this->appointmentModel->getPatientAppointments($patient_id);

            http_response_code(200);
            echo json_encode([
                "status" => "success",
                "data" => $appointments
            ]);
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
