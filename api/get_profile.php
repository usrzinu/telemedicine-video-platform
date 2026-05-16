<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../backend/config/database.php';

$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;

if (!$user_id) {
    echo json_encode(["success" => false, "message" => "User ID required."]);
    exit;
}

try {
    $database = new Database();
    $db = $database->getConnection();

    $query = "SELECT age, gender, blood_group FROM users WHERE id = :id LIMIT 1";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':id', $user_id);
    $stmt->execute();

    if ($stmt->rowCount() > 0) {
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode(["success" => true, "data" => $row]);
    } else {
        echo json_encode(["success" => false, "message" => "User not found."]);
    }

} catch (PDOException $e) {
    echo json_encode(["success" => false, "message" => "Server error."]);
}
?>
