<?php

/**
 * SUBSCRIPTION MODEL
 * Handles database operations for doctor subscriptions.
 */

class SubscriptionModel {
    private $conn;
    private $table_name = "doctor_subscriptions";

    public function __construct($db) {
        $this->conn = $db;
    }

    /**
     * Resolves a doctor_id. If the ID provided is a user_id, it finds the corresponding doctor_id.
     */
    public function resolveDoctorId($id) {
        // First check if it's already a valid doctor ID
        $stmt = $this->conn->prepare("SELECT id FROM doctors WHERE id = :id");
        $stmt->execute([':id' => $id]);
        if ($stmt->fetch()) return $id;

        // If not, check if it's a user ID
        $stmt = $this->conn->prepare("SELECT id FROM doctors WHERE user_id = :id");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ? $row['id'] : $id; // Return resolved ID or original if not found
    }

    /**
     * Get current subscription status for a doctor
     */
    public function getStatus($doctor_id) {
        $doctor_id = $this->resolveDoctorId($doctor_id);
        $query = "SELECT id, subscription_status, subscription_expiry 
                  FROM doctors 
                  WHERE id = :doctor_id LIMIT 1";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':doctor_id', $doctor_id);
        $stmt->execute();

        $data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$data) return null;

        // Auto-expire if date is past
        if ($data['subscription_status'] === 'active' && $data['subscription_expiry']) {
            if (strtotime($data['subscription_expiry']) < time()) {
                $this->updateDoctorStatus($doctor_id, 'expired');
                $data['subscription_status'] = 'expired';
            }
        }

        return $data;
    }

    /**
     * Activate or renew a subscription
     */
    public function activate($doctor_id, $plan_name, $amount, $transaction_id, $days = 30) {
        $doctor_id = $this->resolveDoctorId($doctor_id);
        try {
            $this->conn->beginTransaction();

            // 1. Calculate new expiry date
            $currentStatus = $this->getStatus($doctor_id);
            $startDate = date('Y-m-d H:i:s');
            
            // If already active, extend from current expiry, otherwise from now
            if ($currentStatus && $currentStatus['subscription_status'] === 'active' && strtotime($currentStatus['subscription_expiry']) > time()) {
                $newExpiry = date('Y-m-d H:i:s', strtotime($currentStatus['subscription_expiry'] . " + $days days"));
            } else {
                $newExpiry = date('Y-m-d H:i:s', strtotime("+ $days days"));
            }

            // 2. Update doctors table
            $updateQuery = "UPDATE doctors 
                           SET subscription_status = 'active', 
                               subscription_expiry = :expiry 
                           WHERE id = :doctor_id";
            $updateStmt = $this->conn->prepare($updateQuery);
            $updateStmt->bindParam(':expiry', $newExpiry);
            $updateStmt->bindParam(':doctor_id', $doctor_id);
            $updateStmt->execute();

            // 3. Record transaction
            $insertQuery = "INSERT INTO " . $this->table_name . " 
                           (doctor_id, plan_name, amount, transaction_id, payment_status, start_date, end_date) 
                           VALUES (:doctor_id, :plan, :amount, :txid, 'completed', :start, :end)";
            
            $insertStmt = $this->conn->prepare($insertQuery);
            $insertStmt->bindParam(':doctor_id', $doctor_id);
            $insertStmt->bindParam(':plan', $plan_name);
            $insertStmt->bindParam(':amount', $amount);
            $insertStmt->bindParam(':txid', $transaction_id);
            $insertStmt->bindParam(':start', $startDate);
            $insertStmt->bindParam(':end', $newExpiry);
            $insertStmt->execute();

            $this->conn->commit();
            return true;

        } catch (Exception $e) {
            $this->conn->rollBack();
            throw $e;
        }
    }

    /**
     * Update only the doctor's status
     */
    public function updateDoctorStatus($doctor_id, $status) {
        $query = "UPDATE doctors SET subscription_status = :status WHERE id = :doctor_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':status', $status);
        $stmt->bindParam(':doctor_id', $doctor_id);
        return $stmt->execute();
    }

    /**
     * Get payment history for a doctor
     */
    public function getHistory($doctor_id) {
        $query = "SELECT * FROM " . $this->table_name . " 
                  WHERE doctor_id = :doctor_id 
                  ORDER BY created_at DESC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':doctor_id', $doctor_id);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
?>
