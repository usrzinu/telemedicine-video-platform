<?php

/**
 * ADMIN CONTROLLER
 * Handles admin-specific API endpoints.
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/DoctorModel.php';
require_once __DIR__ . '/../models/UserModel.php';

class AdminController {
    private $db;
    private $doctorModel;
    private $userModel;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->doctorModel = new DoctorModel($this->db);
        $this->userModel = new UserModel($this->db);
    }

    /**
     * GET /api/admin/pending
     */
    public function getPending() {
        try {
            $pending = $this->doctorModel->getPendingDoctors();
            echo json_encode([
                "status" => "success",
                "data" => $pending
            ]);
        } catch (Exception $e) {
            $this->response("error", "Server exception: " . $e->getMessage());
        }
    }

    /**
     * POST /api/admin/update-status
     */
    public function updateAppStatus($data) {
        try {
            if (empty($data['id']) || empty($data['status'])) {
                $this->response("error", "Doctor ID and status are required.");
                return;
            }

            $allowed = ['approved', 'rejected'];
            if (!in_array($data['status'], $allowed)) {
                $this->response("error", "Invalid status. Allowed: " . implode(', ', $allowed));
                return;
            }

            if ($this->doctorModel->updateStatus($data['id'], $data['status'])) {
                $this->response("success", "Doctor application " . $data['status'] . " successfully.");
            } else {
                $this->response("error", "Failed to update doctor status.");
            }
        } catch (Exception $e) {
            $this->response("error", "Server exception: " . $e->getMessage());
        }
    }

    /**
     * GET /api/admin/stats
     */
    public function getStats() {
        try {
            $stats = $this->doctorModel->getDashboardStats();
            echo json_encode([
                "status" => "success",
                "data" => $stats
            ]);
        } catch (Exception $e) {
            $this->response("error", "Server exception: " . $e->getMessage());
        }
    }

    /**
     * GET /api/admin/patients
     */
    public function getPatients() {
        try {
            $patients = $this->userModel->getAllPatients();
            echo json_encode([
                "status" => "success",
                "data" => $patients
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
