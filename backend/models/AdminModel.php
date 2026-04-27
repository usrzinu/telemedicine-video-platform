<?php
/**
 * Admin Model
 * Wraps DoctorModel functionality for admin-specific queries.
 */


class AdminModel {
    private $doctorModel;
    private $userModel;
    private $db;

    public function __construct($db) {
        $this->db = $db;
        require_once __DIR__ . '/DoctorModel.php';
        require_once __DIR__ . '/UserModel.php';
        $this->doctorModel = new DoctorModel($db);
        $this->userModel = new UserModel($db);
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

    /**
     * Get all doctors (Approved or Banned) for administration
     */
    public function getAllDoctors() {
        $query = "SELECT 
                    d.id, d.user_id, d.specialization, d.status, d.created_at,
                    u.name, u.email
                  FROM doctors d
                  JOIN users u ON d.user_id = u.id
                  WHERE d.status != 'pending'
                  ORDER BY d.created_at DESC";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

}
?>
