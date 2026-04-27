<?php

/**
 * APPOINTMENT MODEL
 * Handles database operations for the appointments table.
 */

class AppointmentModel {
    private $conn;
    private $table_name = "appointments";

    public function __construct($db) {
        $this->conn = $db;
    }

    /**
     * Create a new appointment and generate queue position
     */
    public function create($doctor_id, $patient_id, $slot_id) {
        try {
            $this->conn->beginTransaction();

            // Check slot capacity (Max 20)
            $count_query = "SELECT COUNT(*) FROM " . $this->table_name . " 
                            WHERE slot_id = :slot_id 
                            AND status IN ('pending_doctor', 'approved', 'payment_pending', 'paid')";
            $stmtCount = $this->conn->prepare($count_query);
            $stmtCount->bindParam(':slot_id', $slot_id);
            $stmtCount->execute();
            $count = $stmtCount->fetchColumn();

            if ($count >= 20) {
                $this->conn->rollBack();
                return "Slot Full";
            }

            // Insert appointment WITHOUT queue position, awaiting doctor approval
            $insert_query = "INSERT INTO " . $this->table_name . " 
                             (doctor_id, patient_id, slot_id, queue_position, status) 
                             VALUES (:doctor_id, :patient_id, :slot_id, NULL, 'pending_doctor') RETURNING id";
                             
            $stmtInsert = $this->conn->prepare($insert_query);
            $stmtInsert->bindParam(':doctor_id', $doctor_id);
            $stmtInsert->bindParam(':patient_id', $patient_id);
            $stmtInsert->bindParam(':slot_id', $slot_id);
            
            if ($stmtInsert->execute()) {
                $row = $stmtInsert->fetch(PDO::FETCH_ASSOC);
                $appointment_id = $row['id'];
                $this->conn->commit();
                return ["id" => $appointment_id];
            } else {
                $this->conn->rollBack();
                return false;
            }
        } catch (Exception $e) {
            $this->conn->rollBack();
            throw $e;
        }
    }

    /**
     * Assigns the queue position ONLY after payment is submitted
     */
    public function assignQueue($appointment_id) {
        $inTransaction = $this->conn->inTransaction();
        try {
            if (!$inTransaction) {
                $this->conn->beginTransaction();
            }

            // Check if queue is already assigned
            $check_query = "SELECT doctor_id, slot_id, queue_position FROM " . $this->table_name . " WHERE id = :id";
            $stmtCheck = $this->conn->prepare($check_query);
            $stmtCheck->bindParam(':id', $appointment_id);
            $stmtCheck->execute();
            
            $app = $stmtCheck->fetch(PDO::FETCH_ASSOC);
            if (!$app || $app['queue_position'] !== null) {
                if (!$inTransaction) $this->conn->rollBack();
                return $app['queue_position'] ?? false;
            }

            // Get max(queue_position) for that doctor AND slot where queue_position IS NOT NULL
            $max_query = "SELECT MAX(queue_position) as max_pos 
                          FROM " . $this->table_name . " 
                          WHERE doctor_id = :doctor_id 
                          AND slot_id = :slot_id 
                          AND queue_position IS NOT NULL
                          AND status != 'cancelled'";
            $stmtMax = $this->conn->prepare($max_query);
            $stmtMax->bindParam(':doctor_id', $app['doctor_id']);
            $stmtMax->bindParam(':slot_id', $app['slot_id']);
            $stmtMax->execute();
            
            $row = $stmtMax->fetch(PDO::FETCH_ASSOC);
            $next_position = ($row['max_pos'] === null) ? 1 : $row['max_pos'] + 1;

            // Update the appointment with the new queue_position
            $update_query = "UPDATE " . $this->table_name . " SET queue_position = :queue_pos WHERE id = :id";
            $stmtUpdate = $this->conn->prepare($update_query);
            $stmtUpdate->bindParam(':queue_pos', $next_position);
            $stmtUpdate->bindParam(':id', $appointment_id);
            
            if ($stmtUpdate->execute()) {
                if (!$inTransaction) $this->conn->commit();
                return $next_position;
            } else {
                if (!$inTransaction) $this->conn->rollBack();
                return false;
            }
        } catch (Exception $e) {
            if (!$inTransaction && $this->conn->inTransaction()) {
                $this->conn->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Get all appointments for a specific patient
     */
    public function getPatientAppointments($patient_id) {
        $query = "SELECT 
                    a.id as appointment_id,
                    a.queue_position,
                    a.status as appointment_status,
                    a.created_at,
                    s.date,
                    s.start_time,
                    s.end_time,
                    u.name as doctor_name,
                    d.specialization,
                    d.profile_photo,
                    d.consultation_fee,
                    p.amount,
                    p.status as payment_status
                  FROM " . $this->table_name . " a
                  JOIN doctor_slots s ON a.slot_id = s.id
                  JOIN users u ON a.doctor_id = u.id
                  JOIN doctors d ON u.id = d.user_id
                  LEFT JOIN payments p ON a.id = p.appointment_id
                  WHERE a.patient_id = :patient_id
                  ORDER BY s.date DESC, s.start_time DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':patient_id', $patient_id);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get all pending booking requests for a specific doctor
     */
    public function getPendingRequestsByDoctor($doctor_id) {
        $query = "SELECT 
                    a.id as appointment_id,
                    a.status,
                    a.created_at,
                    s.date,
                    s.start_time,
                    s.end_time,
                    u.name as patient_name,
                    u.email as patient_email
                  FROM " . $this->table_name . " a
                  JOIN doctor_slots s ON a.slot_id = s.id
                  JOIN users u ON a.patient_id = u.id
                  WHERE a.doctor_id = :doctor_id AND a.status = 'pending_doctor'
                  ORDER BY a.created_at ASC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':doctor_id', $doctor_id);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Update appointment status (approve or reject)
     */
    public function updateStatus($appointment_id, $status) {
        try {
            $this->conn->beginTransaction();

            // 1. Get appointment details (doctor_id, patient_id, slot_id)
            $get_query = "SELECT doctor_id, patient_id, slot_id, status FROM " . $this->table_name . " WHERE id = :id";
            $stmtGet = $this->conn->prepare($get_query);
            $stmtGet->bindParam(':id', $appointment_id);
            $stmtGet->execute();
            $app = $stmtGet->fetch(PDO::FETCH_ASSOC);

            if (!$app) {
                $this->conn->rollBack();
                return false;
            }

            // 2. Update appointment status
            $update_query = "UPDATE " . $this->table_name . " SET status = :status WHERE id = :id";
            $stmtUpdate = $this->conn->prepare($update_query);
            $stmtUpdate->bindParam(':status', $status);
            $stmtUpdate->bindParam(':id', $appointment_id);
            
            if (!$stmtUpdate->execute()) {
                $this->conn->rollBack();
                return false;
            }

            // 3. If approved, update doctor_slots to 'booked'
            if ($status === 'approved') {
                // Check capacity again during approval
                $count_query = "SELECT COUNT(*) FROM " . $this->table_name . " 
                                WHERE slot_id = :slot_id 
                                AND status IN ('approved', 'payment_pending', 'paid')";
                $stmtCount = $this->conn->prepare($count_query);
                $stmtCount->bindParam(':slot_id', $app['slot_id']);
                $stmtCount->execute();
                $count = $stmtCount->fetchColumn();

                if ($count >= 20) {
                    $this->conn->rollBack();
                    return "Slot Full";
                }

                // Check if slot is still available (status check is mainly for singular slots, 
                // but for capacity-based ones we might need a different check. 
                // However, the requirement says "20 patients per slot", implying 
                // multiple patients can book the SAME slot_id).
                
                // In the current system, 'doctor_slots' table marks a slot as 'booked' 
                // when ONE patient is assigned to it. If we allow 20 patients, 
                // we should probably only mark it 'booked' when capacity is 20.
                
                $slot_status_update = ($count + 1 >= 20) ? 'booked' : 'available';

                $slot_update = "UPDATE doctor_slots SET status = :slot_status, patient_id = :patient_id WHERE id = :slot_id";
                $stmtSlot = $this->conn->prepare($slot_update);
                $stmtSlot->bindParam(':slot_status', $slot_status_update);
                $stmtSlot->bindParam(':patient_id', $app['patient_id']); // This sets patient_id to the LAST approved patient
                $stmtSlot->bindParam(':slot_id', $app['slot_id']);
                
                if (!$stmtSlot->execute()) {
                    $this->conn->rollBack();
                    return false;
                }
            }

            $this->conn->commit();
            return true;

        } catch (Exception $e) {
            $this->conn->rollBack();
            throw $e;
        }
    }
}
?>
