<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../backend/config/database.php';

// Simple check for doctor session/ID
$doctorId = isset($_POST['doctor_id']) ? intval($_POST['doctor_id']) : 0;

if (!$doctorId || !isset($_FILES['avatar'])) {
    echo json_encode(["status" => "error", "message" => "Invalid request. Missing Doctor ID or File."]);
    exit;
}

$uploadDir = __DIR__ . '/../../backend/uploads/avatars/';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

$file = $_FILES['avatar'];
$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
$allowed = ['png', 'jpg', 'jpeg', 'webp'];

if (!in_array($ext, $allowed)) {
    echo json_encode(["status" => "error", "message" => "Only PNG, JPG, JPEG, and WEBP files are allowed."]);
    exit;
}

$fileName = "avatar_" . $doctorId . "_" . time() . "." . $ext;
$targetPath = $uploadDir . $fileName;
$dbPath = "backend/uploads/avatars/" . $fileName;

if (move_uploaded_file($file['tmp_name'], $targetPath)) {
    echo json_encode([
        "status" => "success", 
        "message" => "Profile photo uploaded successfully.",
        "path" => $dbPath
    ]);
} else {
    echo json_encode(["status" => "error", "message" => "Failed to save file on server."]);
}
