<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../backend/config/database.php';

// Get posted data
$data = json_decode(file_get_contents("php://input"));

if (!$data || empty($data->user_id)) {
    echo json_encode(["success" => false, "message" => "Invalid data provided."]);
    exit;
}

try {
    $database = new Database();
    $db = $database->getConnection();

    $query = "UPDATE users 
              SET age = :age, 
                  gender = :gender, 
                  blood_group = :blood_group 
              WHERE id = :id";

    $stmt = $db->prepare($query);

    // Sanitize
    $age = intval($data->age);
    $gender = htmlspecialchars(strip_tags($data->gender));
    $blood_group = htmlspecialchars(strip_tags($data->blood_group));
    $user_id = intval($data->user_id);

    $stmt->bindParam(':age', $age);
    $stmt->bindParam(':gender', $gender);
    $stmt->bindParam(':blood_group', $blood_group);
    $stmt->bindParam(':id', $user_id);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Profile updated successfully."]);
    } else {
        echo json_encode(["success" => false, "message" => "Database update failed."]);
    }

} catch (PDOException $e) {
    echo json_encode(["success" => false, "message" => "Server error: " . $e->getMessage()]);
}
?>
