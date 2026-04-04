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

    // Process Registration
    public function register($data) {
        // Validate inputs
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

        // Hash the password securely
        $hashedPassword = password_hash($data->password, PASSWORD_BCRYPT);

        // Attempt to create user
        if ($this->userModel->createUser($data->name, $data->email, $hashedPassword, $data->role)) {
            $this->sendResponse("success", "Registration successful.");
        } else {
            $this->sendResponse("error", "Failed to register user. Please try again.");
        }
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
