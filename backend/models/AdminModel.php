<?php
/**
 * Admin Model
 * Wraps DoctorModel functionality for admin-specific queries.
 */
class AdminModel {
    private $doctorModel;
    private $userModel;

    public function __construct() {
        require_once __DIR__ . '/DoctorModel.php';
        require_once __DIR__ . '/UserModel.php';
        $this->doctorModel = new DoctorModel();
        $this->userModel = new UserModel();
    }

    // Proxy to DoctorModel::getPendingDoctors()
    public function getPendingDoctors() {
        return $this->doctorModel->getPendingDoctors();
    }

    // Proxy to DoctorModel::updateStatus()
    public function updateDoctorStatus($payload) {
        // Expect payload with 'id' and 'status'
        return $this->doctorModel->updateStatus($payload['id'], $payload['status']);
    }

    // Proxy to DoctorModel::getDashboardStats()
    public function getDashboardStats() {
        return $this->doctorModel->getDashboardStats();
    }

    // Proxy to UserModel::getAllPatients()
    public function getAllPatients() {
        return $this->userModel->getAllPatients();
    }
}
?>

