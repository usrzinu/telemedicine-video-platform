<?php

/**
 * Admin Controller
 * Handles admin-specific API endpoints.
 * Methods are thin wrappers around existing DoctorModel queries.
 */
class AdminController {
    private $doctorModel;

    public function __construct() {
        require_once __DIR__ . '/../models/DoctorModel.php';
        $this->doctorModel = new DoctorModel();
    }

    // GET /api/admin/pending
    public function getPending() {
        $this->doctorModel->getPendingDoctors();
    }

    // POST /api/admin/update-status
    public function updateAppStatus($payload) {
        $this->doctorModel->updateDoctorStatus($payload);
    }

    // GET /api/admin/stats
    public function getStats() {
        $this->doctorModel->getAdminStats();
    }

    // GET /api/admin/patients
    public function getPatients() {
        $this->doctorModel->getAllPatients();
    }
}
?>

