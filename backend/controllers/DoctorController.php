<?php

/**
 * DOCTOR CONTROLLER
 * Handles doctor application and profile management.
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/DoctorModel.php';
require_once __DIR__ . '/../models/UserModel.php';

class DoctorController {
    private $db;
    private $doctorModel;
    private $userModel;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->doctorModel = new DoctorModel($this->db);
        $this->userModel = new UserModel($this->db);
    }

    /**
     * POST /api/doctor/apply
     */
    public function apply($data, $files) {
        try {
            // 1. Basic validation
            $requiredFields = ['user_id', 'specialization', 'experience', 'qualification', 'consultation_fee', 'license_number'];
            foreach ($requiredFields as $field) {
                if (empty($data[$field])) {
                    $this->response("error", "The field '$field' is required.");
                    return;
                }
            }

            $user_id = $data['user_id'];

            // 2. Check user role is 'doctor'
            $user = $this->userModel->getUserById($user_id);
            if (!$user || $user['role'] !== 'doctor') {
                $this->response("error", "Application only allowed for users with 'doctor' role.");
                return;
            }

            // 3. Check for existing application
            if ($this->doctorModel->checkExisting($user_id)) {
                $this->response("error", "Application already submitted or profile exists.");
                return;
            }

            // 4. File uploads
            if (!isset($files['license_file']) || !isset($files['profile_photo'])) {
                $this->response("error", "Both license file and profile photo are required.");
                return;
            }

            $licensePath = $this->uploadFile($files['license_file'], 'licenses', ['pdf', 'jpg', 'png']);
            $photoPath = $this->uploadFile($files['profile_photo'], 'photos', ['jpg', 'png', 'jpeg']);

            if (is_array($licensePath) && $licensePath['status'] === 'error') {
                $this->response("error", "Medical license upload failed: " . $licensePath['message']);
                return;
            }
            if (is_array($photoPath) && $photoPath['status'] === 'error') {
                $this->response("error", "Profile photo upload failed: " . $photoPath['message']);
                return;
            }

            $licensePathStr = $licensePath['path'];
            $photoPathStr = $photoPath['path'];

            // Auto-resize profile photo to keep standard size (max 800px)
            $this->resizeImage(__DIR__ . "/../../" . $photoPathStr, 800);

            // 5. Save to database
            $doctorData = [
                'user_id' => $user_id,
                'specialization' => $data['specialization'],
                'experience' => $data['experience'],
                'qualification' => $data['qualification'],
                'consultation_fee' => $data['consultation_fee'],
                'license_number' => $data['license_number'],
                'license_file' => $licensePathStr,
                'profile_photo' => $photoPathStr
            ];

            if ($this->doctorModel->apply($doctorData)) {
                $this->response("success", "Application submitted. Waiting for admin approval.");
            } else {
                $this->response("error", "Database operation failed. Application not saved.");
            }

        } catch (Exception $e) {
            $this->response("error", "Server exception: " . $e->getMessage());
        }
    }

    /**
     * File upload helper
     */
    private function uploadFile($file, $subFolder, $allowedExts) {
        $targetDir = __DIR__ . "/../uploads/" . $subFolder . "/";
        
        // Ensure directory exists
        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0777, true);
        }
        

        $fileName = basename($file["name"]);
        $fileSize = $file["size"];
        $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

        // Validate extension
        if (!in_array($ext, $allowedExts)) {
            return ["status" => "error", "message" => "Invalid file format '$ext'. Allowed: " . implode(', ', $allowedExts)];
        }

        // Validate size (20MB)
        if ($fileSize > 20000000) {
            return ["status" => "error", "message" => "File size exceeds 20MB limit."];
        }

        // Generate unique filename
        $newFileName = uniqid($subFolder . "_") . "." . $ext;
        $targetFile = $targetDir . $newFileName;

        if (move_uploaded_file($file["tmp_name"], $targetFile)) {
            return [
                "status" => "success",
                "path" => "backend/uploads/" . $subFolder . "/" . $newFileName
            ];
        }

        return ["status" => "error", "message" => "Server failed to move uploaded file."];
    }

    /**
     * GET /api/doctors
     */
    public function getApproved() {
        try {
            $doctors = $this->doctorModel->getApprovedDoctors();
            echo json_encode([
                "status" => "success",
                "data" => $doctors
            ]);
        } catch (Exception $e) {
            $this->response("error", "Server exception: " . $e->getMessage());
        }
    }

    /**
     * Automatic Image Resizing
     */
    private function resizeImage($filePath, $maxDim) {
        if (!file_exists($filePath)) return false;
        if (!function_exists('imagecreatefromjpeg')) return false;

        list($width, $height, $type) = getimagesize($filePath);
        if (!$width || !$height) return false;
        if ($width <= $maxDim && $height <= $maxDim) return true;

        $ratio = $width / $height;
        if ($ratio > 1) {
            $newWidth = $maxDim;
            $newHeight = $maxDim / $ratio;
        } else {
            $newWidth = $maxDim * $ratio;
            $newHeight = $maxDim;
        }

        $src = null;
        switch ($type) {
            case IMAGETYPE_JPEG: $src = imagecreatefromjpeg($filePath); break;
            case IMAGETYPE_PNG:  $src = imagecreatefrompng($filePath); break;
            case IMAGETYPE_GIF:  $src = imagecreatefromgif($filePath); break;
            default: return false;
        }

        if (!$src) return false;

        $dst = imagecreatetruecolor($newWidth, $newHeight);
        if ($type == IMAGETYPE_PNG) {
            imagealphablending($dst, false);
            imagesavealpha($dst, true);
        }

        imagecopyresampled($dst, $src, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

        switch ($type) {
            case IMAGETYPE_JPEG: imagejpeg($dst, $filePath, 85); break;
            case IMAGETYPE_PNG:  imagepng($dst, $filePath); break;
            case IMAGETYPE_GIF:  imagegif($dst, $filePath); break;
        }

        // Free GD image resources (unset instead of deprecated imagedestroy)
        unset($src);
        unset($dst);
        return true;
    }


    // =========================================================
    //  DOCTOR SLOT MANAGEMENT
    // =========================================================

    /**
     * POST /api/doctor/slot — Add a new availability slot
     */
    public function addSlot() {
        try {
            $input = json_decode(file_get_contents("php://input"), true);

            // Validate required fields
            $required = ['doctor_id', 'date', 'start_time', 'end_time'];
            foreach ($required as $field) {
                if (empty($input[$field])) {
                    $this->response("error", "The field '$field' is required.");
                    return;
                }
            }

            $doctor_id  = $input['doctor_id'];
            $date       = $input['date'];
            $start_time = $input['start_time'];
            $end_time   = $input['end_time'];

            // Check if doctor is banned
            $doc = $this->doctorModel->getByUserId($doctor_id);
            if (!$doc || $doc['status'] === 'banned') {
                $this->response("error", "Your account is suspended. You cannot add new slots.");
                return;
            }

            // Validate date format
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                $this->response("error", "Invalid date format. Use YYYY-MM-DD.");
                return;
            }

            // Validate time format
            if (!preg_match('/^\d{2}:\d{2}$/', $start_time) || !preg_match('/^\d{2}:\d{2}$/', $end_time)) {
                $this->response("error", "Invalid time format. Use HH:MM.");
                return;
            }

            // End time must be after start time
            if ($end_time <= $start_time) {
                $this->response("error", "End time must be after start time.");
                return;
            }

            if ($this->doctorModel->createSlot($doctor_id, $date, $start_time, $end_time)) {
                $this->response("success", "Slot added successfully.");
            } else {
                $this->response("error", "Failed to add slot.");
            }
        } catch (Exception $e) {
            $this->response("error", "Server exception: " . $e->getMessage());
        }
    }

    /**
     * GET /api/doctor/slots?doctor_id=X — Get all slots for a doctor
     */
    public function getSlots() {
        try {
            $doctor_id = $_GET['doctor_id'] ?? null;

            if (empty($doctor_id)) {
                $this->response("error", "doctor_id is required.");
                return;
            }

            $slots = $this->doctorModel->getSlotsByDoctor($doctor_id);
            echo json_encode([
                "status" => "success",
                "data" => $slots
            ]);
        } catch (Exception $e) {
            $this->response("error", "Server exception: " . $e->getMessage());
        }
    }

    /**
     * DELETE /api/doctor/slot — Remove a slot
     */
    public function deleteSlot() {
        try {
            $input = json_decode(file_get_contents("php://input"), true);

            if (empty($input['id']) || empty($input['doctor_id'])) {
                $this->response("error", "Both 'id' and 'doctor_id' are required.");
                return;
            }

            if ($this->doctorModel->deleteSlot($input['id'], $input['doctor_id'])) {
                $this->response("success", "Slot deleted successfully.");
            } else {
                $this->response("error", "Slot not found or unauthorized.");
            }
        } catch (Exception $e) {
            $this->response("error", "Server exception: " . $e->getMessage());
        }
    }

    /**
     * GET /api/doctor/available-slots?doctor_id=X — Get available slots for booking
     */
    public function getAvailableSlots() {
        try {
            $doctor_id = $_GET['doctor_id'] ?? null;

            if (empty($doctor_id)) {
                $this->response("error", "doctor_id is required.");
                return;
            }

            $slots = $this->doctorModel->getAvailableSlotsByDoctor($doctor_id);
            echo json_encode([
                "status" => "success",
                "data" => $slots
            ]);
        } catch (Exception $e) {
            $this->response("error", "Server exception: " . $e->getMessage());
        }
    }

    /**
     * POST /api/doctor/book-slot — Patient books an available slot
     */
    public function bookSlot() {
        try {
            $input = json_decode(file_get_contents("php://input"), true);

            if (empty($input['slot_id']) || empty($input['patient_id'])) {
                $this->response("error", "Both 'slot_id' and 'patient_id' are required.");
                return;
            }

            if ($this->doctorModel->bookSlot($input['slot_id'], $input['patient_id'])) {
                $this->response("success", "Appointment booked successfully!");
            } else {
                $this->response("error", "Slot is no longer available.");
            }
        } catch (Exception $e) {
            $this->response("error", "Server exception: " . $e->getMessage());
        }
    }


    /**
     * GET /api/doctor/appointments?doctor_id=X — Get all appointments
     */
    public function getAppointments() {
        try {
            $doctor_id = $_GET['doctor_id'] ?? null;

            if (empty($doctor_id)) {
                $this->response("error", "doctor_id is required.");
                return;
            }

            $appointments = $this->doctorModel->getAppointmentsByDoctor($doctor_id);
            echo json_encode([
                "status" => "success",
                "data" => $appointments
            ]);
        } catch (Exception $e) {
            $this->response("error", "Server exception: " . $e->getMessage());
        }
    }

    /**
     * GET /api/doctor/patients?doctor_id=X — Get all patients and their appointments
     */
    public function getPatients() {
        try {
            $doctor_id = $_GET['doctor_id'] ?? null;

            if (empty($doctor_id)) {
                $this->response("error", "doctor_id is required.");
                return;
            }

            $rows = $this->doctorModel->getPatientsByDoctor($doctor_id);
            
            // Group by patient
            $patients = [];
            foreach ($rows as $row) {
                $pid = $row['patient_id'];
                if (!isset($patients[$pid])) {
                    $patients[$pid] = [
                        "patient_id" => $pid,
                        "name" => $row['name'],
                        "email" => $row['email'],
                        "appointments" => []
                    ];
                }
                $patients[$pid]['appointments'][] = [
                    "slot_id" => $row['slot_id'],
                    "date" => $row['date'],
                    "start_time" => $row['start_time'],
                    "end_time" => $row['end_time'],
                    "status" => $row['status']
                ];
            }

            echo json_encode([
                "status" => "success",
                "data" => array_values($patients)
            ]);
        } catch (Exception $e) {
            $this->response("error", "Server exception: " . $e->getMessage());
        }
    }

    /**
     * Generic JSON response helper
     */
    private function response($status, $message) {
        http_response_code($status === "success" ? 200 : 400);
        echo json_encode([
            "status" => $status,
            "message" => $message
        ]);
    }
}
?>
