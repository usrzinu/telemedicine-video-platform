<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/UserModel.php';

class AuthController {
    private $db;
    private $userModel;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->userModel = new UserModel($this->db);
    }

    // Process Registration (Now supports unified doctor signup)
    public function register($data, $files = null) {
        // Validate basic inputs
        if (empty($data->name) || empty($data->email) || empty($data->password) || empty($data->role)) {
            $this->sendResponse("error", "All fields are required.");
            return;
        }

        // Validate role
        $allowedRoles = ['admin', 'doctor', 'patient'];
        if (!in_array($data->role, $allowedRoles)) {
            $this->sendResponse("error", "Invalid role specified.");
            return;
        }
        
        // Validate email format
        if (!filter_var($data->email, FILTER_VALIDATE_EMAIL)) {
            $this->sendResponse("error", "Invalid email format.");
            return;
        }

        // Check if user already exists
        if ($this->userModel->findUserByEmail($data->email)) {
            $this->sendResponse("error", "User with this email already exists.");
            return;
        }

        // Doctor Specific Validation
        if ($data->role === 'doctor') {
            $requiredDoctorFields = ['specialization', 'experience', 'qualification', 'consultation_fee', 'license_number'];
            foreach ($requiredDoctorFields as $field) {
                if (empty($data->$field)) {
                    $this->sendResponse("error", "Doctor field '$field' is required.");
                    return;
                }
            }
            if (!$files || !isset($files['license_file']) || !isset($files['profile_photo'])) {
                $this->sendResponse("error", "Medical license and profile photo are required for doctors.");
                return;
            }
        }

        // Hash the password
        $hashedPassword = password_hash($data->password, PASSWORD_BCRYPT);

        // Start Transaction (if possible, but using simple logic here)
        if ($this->userModel->createUser($data->name, $data->email, $hashedPassword, $data->role)) {
            $user = $this->userModel->findUserByEmail($data->email);
            
            // Handle Doctor Profile
            if ($data->role === 'doctor') {
                require_once __DIR__ . '/../controllers/DoctorController.php';
                $doctorCtrl = new DoctorController();
                
                // Upload files using helper
                $licensePath = $this->uploadHelper($files['license_file'], 'licenses', ['pdf', 'jpg', 'png']);
                $photoPath = $this->uploadHelper($files['profile_photo'], 'photos', ['jpg', 'png', 'jpeg']);

                if (!$licensePath || !$photoPath) {
                    $this->sendResponse("error", "File upload failed. Check format and size.");
                    return;
                }

                require_once __DIR__ . '/../models/DoctorModel.php';
                $doctorModel = new DoctorModel($this->db);
                $docData = [
                    'user_id' => $user['id'],
                    'specialization' => $data->specialization,
                    'experience' => $data->experience,
                    'qualification' => $data->qualification,
                    'consultation_fee' => $data->consultation_fee,
                    'license_number' => $data->license_number,
                    'license_file' => $licensePath,
                    'profile_photo' => $photoPath
                ];

                if ($doctorModel->apply($docData)) {
                    echo json_encode([
                        "status" => "success",
                        "message" => "Application submitted. Waiting for admin approval.",
                        "require_approval" => true
                    ]);
                } else {
                    $this->sendResponse("error", "Failed to create doctor profile.");
                }
            } else {
                // Auto-login for Patients/Admins
                echo json_encode([
                    "status" => "success",
                    "message" => "Registration successful.",
                    "id" => $user['id'],
                    "name" => $user['name'],
                    "role" => $user['role']
                ]);
            }
        } else {
            $this->sendResponse("error", "Failed to register user.");
        }
    }

    /**
     * File upload helper
     */
    private function uploadHelper($file, $subFolder, $allowedExts) {
        $targetDir = __DIR__ . "/../uploads/" . $subFolder . "/";
        if (!is_dir($targetDir)) mkdir($targetDir, 0777, true);
        $ext = strtolower(pathinfo($file["name"], PATHINFO_EXTENSION));
        if (!in_array($ext, $allowedExts) || $file["size"] > 2000000) return false;
        $newFileName = uniqid($subFolder . "_") . "." . $ext;
        if (move_uploaded_file($file["tmp_name"], $targetDir . $newFileName)) {
            return "backend/uploads/" . $subFolder . "/" . $newFileName;
        }
        return false;
    }

    // Process Login
    public function login($data) {
        // Validate inputs
        if (empty($data->email) || empty($data->password)) {
            $this->sendResponse("error", "Email and password are required.");
            return;
        }

        // Find user by email
        $user = $this->userModel->findUserByEmail($data->email);

        if (!$user) {
            $this->sendResponse("error", "Invalid credentials.");
            return;
        }

        // Verify password
        if (password_verify($data->password, $user['password'])) {
            // Success response
            echo json_encode([
                "status" => "success",
                "message" => "Login successful",
                "id" => $user['id'],
                "name" => $user['name'],
                "role" => $user['role']
            ]);
        } else {
            // Password incorrect
            $this->sendResponse("error", "Invalid credentials.");
        }
    }

    // Helper for sending JSON response
    private function sendResponse($status, $message) {
        echo json_encode([
            "status" => $status,
            "message" => $message
        ]);
    }
}
?>
