<?php

/**
 * ADMIN CONTROLLER
 * Handles admin-specific API endpoints.
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/AdminModel.php';


class AdminController {
    private $adminModel;

    public function __construct() {
        $database = new \Database();
        $db = $database->getConnection();
        $this->adminModel = new \AdminModel($db);
    }

    /**
     * GET /api/admin/pending
     */
    public function getPending() {
        try {
            $pending = $this->adminModel->getPendingDoctors();
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

            $allowed = ['approved', 'rejected', 'banned'];
            if (!in_array($data['status'], $allowed)) {
                $this->response("error", "Invalid status. Allowed: approved, rejected, banned");
                return;
            }

            if ($this->adminModel->updateDoctorStatus($data)) {
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
            $stats = $this->adminModel->getDashboardStats();
            echo json_encode([
                "status" => "success",
                "data" => $stats
            ]);
        } catch (Exception $e) {
            $this->response("error", "Server exception: " . $e->getMessage());
        }
    }

    /**
     * GET /api/admin/doctors
     */
    public function getAllDoctors() {
        try {
            $doctors = $this->adminModel->getAllDoctors();
            echo json_encode([
                "status" => "success",
                "data" => $doctors
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
