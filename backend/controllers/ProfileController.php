<?php
require_once __DIR__ . '/../models/DoctorModel.php';

class ProfileController {
    private $db;
    private $doctorModel;

    public function __construct($db) {
        $this->db = $db;
        $this->doctorModel = new DoctorModel($db);
        $this->ensureSchema();
    }

    private function ensureSchema() {
        try {
            $this->db->exec("
                DO $$ 
                BEGIN 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='doctors' AND column_name='clinic_address') THEN
                        ALTER TABLE doctors ADD COLUMN clinic_address TEXT;
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='doctors' AND column_name='consultation_time') THEN
                        ALTER TABLE doctors ADD COLUMN consultation_time INTEGER DEFAULT 20;
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='dob') THEN
                        ALTER TABLE users ADD COLUMN dob DATE;
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='gender') THEN
                        ALTER TABLE users ADD COLUMN gender VARCHAR(20);
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='bio') THEN
                        ALTER TABLE users ADD COLUMN bio TEXT;
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='phone') THEN
                        ALTER TABLE users ADD COLUMN phone VARCHAR(20);
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='doctors' AND column_name='signature_path') THEN
                        ALTER TABLE doctors ADD COLUMN signature_path VARCHAR(255);
                    END IF;
                END $$;
            ");
        } catch (Exception $e) {
            // Ignore if columns already exist or other DB errors
        }
    }

    public function getProfile($id) {
        // Try fetching by Doctor ID first
        $profile = $this->doctorModel->getById($id);
        
        // If not found, it might be a User ID
        if (!$profile) {
            $profile = $this->doctorModel->getByUserId($id);
        }

        if ($profile) {
            $this->response("success", "Profile loaded", $profile);
        } else {
            $this->response("error", "Profile not found for ID: " . $id);
        }
    }

    public function updateProfile() {
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            if (!$data || !isset($data['doctor_id'])) {
                $this->response("error", "Invalid data: Doctor ID missing.");
                return;
            }

            $ok = $this->doctorModel->updateProfile($data['doctor_id'], $data);
            if ($ok) {
                $this->response("success", "Profile updated successfully");
            } else {
                $this->response("error", "Failed to update profile database records.");
            }
        } catch (Exception $e) {
            $this->response("error", "Update Error: " . $e->getMessage());
        }
    }

    private function response($status, $message, $data = null) {
        header('Content-Type: application/json');
        echo json_encode([
            "status" => $status,
            "message" => $message,
            "data" => $data
        ]);
        exit();
    }
}
?>
