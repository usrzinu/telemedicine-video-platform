<?php

/**
 * PAYMENT MODEL
 * Handles database operations for the payments table.
 */

class PaymentModel {
    private $conn;
    private $table_name = "payments";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function createPayment($appointment_id, $patient_id, $amount, $payment_method, $transaction_id, $phone_number, $card_number) {
        try {
            $this->conn->beginTransaction();

            // Check if appointment exists and is pending
            $check_query = "SELECT status FROM appointments WHERE id = :appointment_id AND patient_id = :patient_id";
            $stmtCheck = $this->conn->prepare($check_query);
            $stmtCheck->bindParam(':appointment_id', $appointment_id);
            $stmtCheck->bindParam(':patient_id', $patient_id);
            $stmtCheck->execute();

            if ($stmtCheck->rowCount() == 0) {
                $this->conn->rollBack();
                return "Appointment not found or unauthorized.";
            }

            $appointment = $stmtCheck->fetch(PDO::FETCH_ASSOC);
            if ($appointment['status'] === 'pending_doctor') {
                $this->conn->rollBack();
                return "Your booking is awaiting doctor approval. Payment will be enabled once approved.";
            }
            if ($appointment['status'] === 'rejected') {
                $this->conn->rollBack();
                return "This appointment request was rejected by the doctor.";
            }
            if ($appointment['status'] === 'payment_pending' || $appointment['status'] === 'paid') {
                $this->conn->rollBack();
                return "A payment is already submitted or confirmed for this appointment.";
            }
            if ($appointment['status'] !== 'approved') {
                $this->conn->rollBack();
                return "Appointment is not in a valid state for payment.";
            }

            // Check for duplicate payment
            $dup_query = "SELECT id FROM " . $this->table_name . " WHERE appointment_id = :appointment_id AND status != 'failed'";
            $stmtDup = $this->conn->prepare($dup_query);
            $stmtDup->bindParam(':appointment_id', $appointment_id);
            $stmtDup->execute();
            if ($stmtDup->rowCount() > 0) {
                $this->conn->rollBack();
                return "A payment is already pending or completed for this appointment.";
            }

            // Check for duplicate transaction ID
            if ($transaction_id) {
                $tx_check = "SELECT id FROM " . $this->table_name . " WHERE transaction_id = :tx_id AND status != 'failed'";
                $stmtTx = $this->conn->prepare($tx_check);
                $stmtTx->bindParam(':tx_id', $transaction_id);
                $stmtTx->execute();
                if ($stmtTx->rowCount() > 0) {
                    $this->conn->rollBack();
                    return "This Transaction ID has already been used.";
                }
            }

            // Insert payment (status = pending)
            $insert_query = "INSERT INTO " . $this->table_name . " 
                            (appointment_id, patient_id, amount, payment_method, transaction_id, phone_number, card_number, status) 
                            VALUES (:appointment_id, :patient_id, :amount, :payment_method, :transaction_id, :phone_number, :card_number, 'pending')";
            
            $stmtInsert = $this->conn->prepare($insert_query);
            $stmtInsert->bindParam(':appointment_id', $appointment_id);
            $stmtInsert->bindParam(':patient_id', $patient_id);
            $stmtInsert->bindParam(':amount', $amount);
            $stmtInsert->bindParam(':payment_method', $payment_method);
            $stmtInsert->bindParam(':transaction_id', $transaction_id);
            $stmtInsert->bindParam(':phone_number', $phone_number);
            $stmtInsert->bindParam(':card_number', $card_number);

            if ($stmtInsert->execute()) {
                // Update appointment status to 'payment_pending'
                $update_app = "UPDATE appointments SET status = 'payment_pending' WHERE id = :appointment_id";
                $stmtUpdate = $this->conn->prepare($update_app);
                $stmtUpdate->bindParam(':appointment_id', $appointment_id);
                
                if ($stmtUpdate->execute()) {
                    $this->conn->commit();
                    return true;
                } else {
                    $this->conn->rollBack();
                    return "Failed to update appointment status.";
                }
            } else {
                $this->conn->rollBack();
                return "Failed to insert payment record.";
            }
        } catch (Exception $e) {
            $this->conn->rollBack();
            throw $e;
        }
    }

    /**
     * Get pending payments for a specific doctor
     */
    public function getPendingPaymentsByDoctor($doctor_id) {
        $query = "SELECT 
                    p.id as payment_id,
                    p.amount,
                    p.payment_method,
                    p.transaction_id,
                    p.phone_number,
                    p.created_at as payment_date,
                    a.id as appointment_id,
                    s.date as slot_date,
                    s.start_time,
                    s.end_time,
                    u.name as patient_name
                  FROM " . $this->table_name . " p
                  JOIN appointments a ON p.appointment_id = a.id
                  JOIN doctor_slots s ON a.slot_id = s.id
                  JOIN users u ON p.patient_id = u.id
                  WHERE a.doctor_id = :doctor_id AND p.status = 'pending'
                  ORDER BY p.created_at ASC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':doctor_id', $doctor_id);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Doctor verifies a payment (Approve/Reject)
     */
    public function doctorVerifyPayment($appointment_id, $status, $appointmentModel) {
        try {
            $this->conn->beginTransaction();

            // 1. Update Payment Status
            $p_status = ($status === 'confirmed') ? 'paid' : 'rejected';
            $update_p = "UPDATE " . $this->table_name . " SET status = :status WHERE appointment_id = :app_id";
            $stmtP = $this->conn->prepare($update_p);
            $stmtP->bindParam(':status', $p_status);
            $stmtP->bindParam(':app_id', $appointment_id);
            $stmtP->execute();

            // 2. Update Appointment Status
            $a_status = ($status === 'confirmed') ? 'confirmed' : 'cancelled';
            $update_a = "UPDATE appointments SET status = :status WHERE id = :app_id";
            $stmtA = $this->conn->prepare($update_a);
            $stmtA->bindParam(':status', $a_status);
            $stmtA->bindParam(':app_id', $appointment_id);
            $stmtA->execute();

            // 3. Generate Queue if approved
            $queue_pos = null;
            if ($status === 'confirmed') {
                $queue_pos = $appointmentModel->assignQueue($appointment_id);
            }

            $this->conn->commit();
            return ["status" => "success", "queue_position" => $queue_pos];

        } catch (Exception $e) {
            $this->conn->rollBack();
            throw $e;
        }
    }
}
?>
