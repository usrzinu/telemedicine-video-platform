<?php

/**
 * DOCTOR MODEL
 * Handles database operations for the doctors table.
 */

class DoctorModel {
    private $conn;
    private $table_name = "doctors";

    public function __construct($db) {
        $this->conn = $db;
    }

    /**
     * Create a new doctor application
     */
    public function apply($data) {
        $query = "INSERT INTO " . $this->table_name . " 
                  (user_id, specialization, experience, qualification, consultation_fee, license_number, license_file, profile_photo) 
                  VALUES (:user_id, :specialization, :experience, :qualification, :consultation_fee, :license_number, :license_file, :profile_photo)";

        $stmt = $this->conn->prepare($query);

        // Sanitize and bind
        $stmt->bindParam(':user_id', $data['user_id']);
        $stmt->bindParam(':specialization', $data['specialization']);
        $stmt->bindParam(':experience', $data['experience']);
        $stmt->bindParam(':qualification', $data['qualification']);
        $stmt->bindParam(':consultation_fee', $data['consultation_fee']);
        $stmt->bindParam(':license_number', $data['license_number']);
        $stmt->bindParam(':license_file', $data['license_file']);
        $stmt->bindParam(':profile_photo', $data['profile_photo']);

        if ($stmt->execute()) {
            return true;
        }

        return false;
    }

    /**
     * Check if user already has an application
     */
    public function checkExisting($user_id) {
        $query = "SELECT id FROM " . $this->table_name . " WHERE user_id = :user_id LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }

    /**
     * Get doctor profile by user ID
     */
    public function getByUserId($user_id) {
        $query = "SELECT * FROM " . $this->table_name . " WHERE user_id = :user_id LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->execute();

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    /**
     * Get all approved doctors for the landing page
     */
    public function getApprovedDoctors() {
        $query = "SELECT d.id, d.specialization, d.experience, d.qualification, d.consultation_fee, d.profile_photo, u.name as doctor_name 
                  FROM " . $this->table_name . " d
                  JOIN users u ON d.user_id = u.id
                  WHERE d.status = 'approved'
                  ORDER BY d.created_at DESC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
?>
