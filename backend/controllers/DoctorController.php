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

        imagedestroy($src);
        imagedestroy($dst);
        return true;
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
