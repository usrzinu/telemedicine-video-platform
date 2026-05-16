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
                  (user_id, specialization, experience, qualification, consultation_fee, license_number, license_file, profile_photo, status) 
                  VALUES (:user_id, :specialization, :experience, :qualification, :consultation_fee, :license_number, :license_file, :profile_photo, 'pending')";

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
        $query = "SELECT d.id, d.user_id, d.specialization, d.experience, d.qualification, d.consultation_fee, d.profile_photo, u.name as doctor_name, u.email 
                  FROM " . $this->table_name . " d
                  JOIN users u ON d.user_id = u.id
                  WHERE d.status = 'approved' AND d.subscription_status = 'active'
                  ORDER BY d.created_at DESC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get all pending doctor applications for admin
     */
    public function getPendingDoctors() {
        $query = "SELECT d.id, d.specialization, d.experience, d.qualification, d.consultation_fee, d.license_number, d.license_file, d.profile_photo, u.name as doctor_name, u.email 
                  FROM " . $this->table_name . " d
                  JOIN users u ON d.user_id = u.id
                  WHERE d.status = 'pending'
                  ORDER BY d.created_at ASC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Update doctor application status
     */
    public function updateStatus($id, $status) {
        $query = "UPDATE " . $this->table_name . " SET status = :status WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':status', $status);
        $stmt->bindParam(':id', $id);
        
        return $stmt->execute();
    }

    /**
     * Get statistics for admin dashboard
     */
    public function getDashboardStats() {
        // Get total approved doctors
        $dCountQuery = "SELECT COUNT(*) as count FROM " . $this->table_name . " WHERE status = 'approved'";
        $dStmt = $this->conn->prepare($dCountQuery);
        $dStmt->execute();
        $dCount = $dStmt->fetch(PDO::FETCH_ASSOC)['count'];

        // Get total pending registrations
        $pendingQuery = "SELECT COUNT(*) as count FROM " . $this->table_name . " WHERE status = 'pending'";
        $pendingStmt = $this->conn->prepare($pendingQuery);
        $pendingStmt->execute();
        $pendingCount = $pendingStmt->fetch(PDO::FETCH_ASSOC)['count'];

        return [
            "doctors" => $dCount,
            "pending" => $pendingCount
        ];
    }

    // =========================================================
    //  DOCTOR SLOT MANAGEMENT
    // =========================================================

    /**
     * Create a new availability slot for a doctor
     */
    public function createSlot($doctor_id, $date, $start_time, $end_time) {
        $query = "INSERT INTO doctor_slots (doctor_id, date, start_time, end_time, status)
                  VALUES (:doctor_id, :date, :start_time, :end_time, 'available')";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':doctor_id', $doctor_id);
        $stmt->bindParam(':date', $date);
        $stmt->bindParam(':start_time', $start_time);
        $stmt->bindParam(':end_time', $end_time);

        return $stmt->execute();
    }

    /**
     * Get all slots for a specific doctor
     */
    public function getSlotsByDoctor($doctor_id) {
        $query = "SELECT id, doctor_id, date, start_time, end_time, status, created_at
                  FROM doctor_slots
                  WHERE doctor_id = :doctor_id
                  ORDER BY date ASC, start_time ASC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':doctor_id', $doctor_id);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Delete a slot by ID (only if it belongs to the doctor)
     */
    public function deleteSlot($slot_id, $doctor_id) {
        $query = "DELETE FROM doctor_slots WHERE id = :id AND doctor_id = :doctor_id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $slot_id);
        $stmt->bindParam(':doctor_id', $doctor_id);
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }

    /**
     * Get only available slots for a specific doctor (for patient booking)
     */
    public function getAvailableSlotsByDoctor($doctor_id) {
        $query = "SELECT id, doctor_id, date, start_time, end_time, status
                  FROM doctor_slots
                  WHERE doctor_id = :doctor_id AND status = 'available' AND date >= CURRENT_DATE
                  ORDER BY date ASC, start_time ASC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':doctor_id', $doctor_id);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Book a slot — set status to 'booked' and assign patient_id
     */
    public function bookSlot($slot_id, $patient_id) {
        $query = "UPDATE doctor_slots SET status = 'booked', patient_id = :patient_id
                  WHERE id = :id AND status = 'available'";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':patient_id', $patient_id);
        $stmt->bindParam(':id', $slot_id);
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }
    /**
     * Get all appointments (booked slots) for a doctor
     */
    public function getAppointmentsByDoctor($doctor_id) {
        $query = "SELECT a.id, a.status, a.consultation_status, a.queue_position,
                         s.id as slot_id, s.date, s.start_time, s.end_time, 
                         u.name as patient_name
                  FROM appointments a
                  JOIN doctor_slots s ON a.slot_id = s.id
                  JOIN users u ON a.patient_id = u.id
                  WHERE a.doctor_id = :doctor_id
                  ORDER BY s.date ASC, s.start_time ASC, a.queue_position ASC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':doctor_id', $doctor_id);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    /**
     * Get all unique patients that have booked a slot with a specific doctor, along with their appointment history
     */
    public function getPatientsByDoctor($doctor_id) {
        $query = "SELECT u.id as patient_id, u.name, u.email, u.age, u.gender, u.blood_group,
                         s.date, s.start_time, s.end_time, s.status, s.id as slot_id,
                         a.id as appointment_id
                  FROM doctor_slots s
                  JOIN users u ON s.patient_id = u.id
                  LEFT JOIN appointments a ON s.id = a.slot_id
                  WHERE s.doctor_id = :doctor_id AND s.patient_id IS NOT NULL
                  ORDER BY u.name ASC, s.date DESC, s.start_time DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':doctor_id', $doctor_id);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    /**
     * Generate structured data for professional patient consultation reports
     */
    public function getPatientConsultationReport($doctor_id, $period, $start_date = null, $end_date = null) {
        $where = "WHERE a.doctor_id = :doctor_id";
        $params = [':doctor_id' => $doctor_id];

        if ($period === 'today') {
            $where .= " AND s.date = CURRENT_DATE";
        } else if ($period === 'weekly') {
            $where .= " AND s.date >= (CURRENT_DATE - INTERVAL '7 days')";
        } else if ($period === 'monthly') {
            $where .= " AND s.date >= (CURRENT_DATE - INTERVAL '30 days')";
        } else if ($period === 'custom' && $start_date && $end_date) {
            $where .= " AND s.date BETWEEN :start AND :end";
            $params[':start'] = $start_date;
            $params[':end'] = $end_date;
        }

        // 1. Fetch Summary Stats
        $summaryQuery = "SELECT 
                            COUNT(DISTINCT a.patient_id) as total_patients,
                            COUNT(a.id) as total_consultations
                         FROM appointments a
                         JOIN doctor_slots s ON a.slot_id = s.id
                         $where";
        
        $stmt = $this->conn->prepare($summaryQuery);
        foreach ($params as $key => $val) { $stmt->bindValue($key, $val); }
        $stmt->execute();
        $summary = $stmt->fetch(PDO::FETCH_ASSOC);

        // Calculate New vs Returning
        // New = Patients whose first ever appointment is in this range
        // Returning = Patients who had at least one appointment before this range
        $returningQuery = "SELECT COUNT(DISTINCT a.patient_id) as count
                           FROM appointments a
                           JOIN doctor_slots s ON a.slot_id = s.id
                           $where AND EXISTS (
                               SELECT 1 FROM appointments a2 
                               JOIN doctor_slots s2 ON a2.slot_id = s2.id
                               WHERE a2.patient_id = a.patient_id 
                               AND s2.date < s.date
                           )";
        $stmt = $this->conn->prepare($returningQuery);
        foreach ($params as $key => $val) { $stmt->bindValue($key, $val); }
        $stmt->execute();
        $returningCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'] ?? 0;

        $summary['returning_patients'] = $returningCount;
        $summary['new_patients'] = $summary['total_patients'] - $returningCount;

        // 2. Fetch Detailed Patient List for Table
        $listQuery = "SELECT u.name, u.age, u.gender, u.blood_group,
                             (SELECT COUNT(*) FROM appointments a3 WHERE a3.patient_id = u.id AND a3.doctor_id = :doctor_id) as visit_count,
                             MAX(s.date) as last_visit,
                             a.consultation_status
                      FROM appointments a
                      JOIN doctor_slots s ON a.slot_id = s.id
                      JOIN users u ON a.patient_id = u.id
                      $where
                      GROUP BY u.id, u.name, u.age, u.gender, u.blood_group, a.consultation_status
                      ORDER BY u.name ASC";
        
        $stmt = $this->conn->prepare($listQuery);
        foreach ($params as $key => $val) { $stmt->bindValue($key, $val); }
        $stmt->execute();
        $patients = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            "summary" => $summary,
            "patients" => $patients
        ];
    }
}
?>
