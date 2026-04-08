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

        // Start Database Transaction
        $this->db->beginTransaction();

        try {
            // Create user
            if (!$this->userModel->createUser($data->name, $data->email, $hashedPassword, $data->role)) {
                throw new Exception("Failed to create user account.");
            }

            $user = $this->userModel->findUserByEmail($data->email);
            
            // Handle Doctor Profile
            if ($data->role === 'doctor') {
                require_once __DIR__ . '/../controllers/DoctorController.php';
                $doctorCtrl = new DoctorController();
                
                // Upload files using helper
                $licensePath = $this->uploadHelper($files['license_file'], 'licenses', ['pdf', 'jpg', 'png']);
                $photoPath = $this->uploadHelper($files['profile_photo'], 'photos', ['jpg', 'png', 'jpeg']);

                if (is_array($licensePath) && $licensePath['status'] === 'error') {
                    throw new Exception("Medical license upload failed: " . $licensePath['message']);
                }
                if (is_array($photoPath) && $photoPath['status'] === 'error') {
                    throw new Exception("Profile photo upload failed: " . $photoPath['message']);
                }

                $licensePathStr = $licensePath['path'];
                $photoPathStr = $photoPath['path'];

                // Auto-resize profile photo to keep standard size (max 800px)
                $this->resizeImage(__DIR__ . "/../../" . $photoPathStr, 800);

                require_once __DIR__ . '/../models/DoctorModel.php';
                $doctorModel = new DoctorModel($this->db);
                $docData = [
                    'user_id' => $user['id'],
                    'specialization' => $data->specialization,
                    'experience' => $data->experience,
                    'qualification' => $data->qualification,
                    'consultation_fee' => $data->consultation_fee,
                    'license_number' => $data->license_number,
                    'license_file' => $licensePathStr,
                    'profile_photo' => $photoPathStr
                ];

                if (!$doctorModel->apply($docData)) {
                    throw new Exception("Failed to create doctor profile.");
                }
                

                $this->db->commit();
                echo json_encode([
                    "status" => "success",
                    "message" => "Application submitted. Waiting for admin approval.",
                    "require_approval" => true
                ]);

            } else {
                // Auto-login for Patients/Admins
                $this->db->commit();
                echo json_encode([
                    "status" => "success",
                    "message" => "Registration successful.",
                    "id" => $user['id'],
                    "name" => $user['name'],
                    "role" => $user['role']
                ]);
            }

        } catch (Exception $e) {
            // Roll back everything if any part fails
            $this->db->rollBack();
            $this->sendResponse("error", $e->getMessage());
        }
    }

    /**
     * File upload helper
     */
    private function uploadHelper($file, $subFolder, $allowedExts) {
        $targetDir = __DIR__ . "/../uploads/" . $subFolder . "/";
        if (!is_dir($targetDir)) mkdir($targetDir, 0777, true);
        
        $ext = strtolower(pathinfo($file["name"], PATHINFO_EXTENSION));
        
        // 1. Validate extension
        if (!in_array($ext, $allowedExts)) {
            return ["status" => "error", "message" => "Invalid file format '$ext'. Allowed: " . implode(', ', $allowedExts)];
        }

        // 2. Size limit (Increased to 20MB / how much size matters? No matter system)
        if ($file["size"] > 20000000) { 
            return ["status" => "error", "message" => "File size exceeds 20MB limit."];
        }

        $newFileName = uniqid($subFolder . "_") . "." . $ext;
        if (move_uploaded_file($file["tmp_name"], $targetDir . $newFileName)) {
            return [
                "status" => "success",
                "path" => "backend/uploads/" . $subFolder . "/" . $newFileName
            ];
        }
        
        return ["status" => "error", "message" => "Server failed to move uploaded file."];
    }

    /**
     * Automatic Image Resizing
     * Scales image down proportionally to fit within $maxDim
     */
    private function resizeImage($filePath, $maxDim) {
        if (!file_exists($filePath)) return false;
        
        // Check if GD is available
        if (!function_exists('imagecreatefromjpeg')) return false;

        list($width, $height, $type) = getimagesize($filePath);
        if (!$width || !$height) return false;

        // Only resize if it's larger than max dimension
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
        
        // Handle transparency for PNGs
        if ($type == IMAGETYPE_PNG) {
            imagealphablending($dst, false);
            imagesavealpha($dst, true);
        }

        imagecopyresampled($dst, $src, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

        // Overwrite the original file with the resized version
        switch ($type) {
            case IMAGETYPE_JPEG: imagejpeg($dst, $filePath, 85); break;
            case IMAGETYPE_PNG:  imagepng($dst, $filePath); break;
            case IMAGETYPE_GIF:  imagegif($dst, $filePath); break;
        }

        imagedestroy($src);
        imagedestroy($dst);
        return true;
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
            
            // Check doctor approval status if applicable
            if ($user['role'] === 'doctor') {
                require_once __DIR__ . '/../models/DoctorModel.php';
                $doctorModel = new DoctorModel($this->db);
                $doc = $doctorModel->getByUserId($user['id']);
                
                if (!$doc || $doc['status'] === 'pending') {
                    $this->sendResponse("error", "Account pending admin approval. Please check back later.");
                    return;
                } else if ($doc['status'] === 'rejected') {
                    $this->sendResponse("error", "Your doctor application was rejected. Please contact support.");
                    return;
                }
            }

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
