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
            // Start transaction for atomic operations
            $this->conn->beginTransaction();

            // Get max(queue_position) for that doctor
            $max_query = "SELECT COALESCE(MAX(queue_position), 0) as max_pos FROM " . $this->table_name . " WHERE doctor_id = :doctor_id";
            $stmtMax = $this->conn->prepare($max_query);
            $stmtMax->bindParam(':doctor_id', $doctor_id);
            $stmtMax->execute();
            
            $row = $stmtMax->fetch(PDO::FETCH_ASSOC);
            $next_position = $row['max_pos'] + 1;

            // Insert appointment
            $insert_query = "INSERT INTO " . $this->table_name . " 
                             (doctor_id, patient_id, slot_id, queue_position, status) 
                             VALUES (:doctor_id, :patient_id, :slot_id, :queue_pos, 'pending')";
                             
            $stmtInsert = $this->conn->prepare($insert_query);
            $stmtInsert->bindParam(':doctor_id', $doctor_id);
            $stmtInsert->bindParam(':patient_id', $patient_id);
            $stmtInsert->bindParam(':slot_id', $slot_id);
            $stmtInsert->bindParam(':queue_pos', $next_position);
            
            if ($stmtInsert->execute()) {
                $this->conn->commit();
                return $next_position;
            } else {
                $this->conn->rollBack();
                return false;
            }
        } catch (Exception $e) {
            $this->conn->rollBack();
            throw $e;
        }
    }
}
?>
