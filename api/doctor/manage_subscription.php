<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../backend/config/database.php';

$doctor_id = isset($_GET['doctor_id']) ? (int)$_GET['doctor_id'] : null;

if (!$doctor_id && $_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode(["success" => false, "message" => "Doctor ID is required."]);
    exit;
}

$database = new Database();
$db = $database->getConnection();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $db->prepare("
            SELECT * FROM doctor_subscriptions 
            WHERE doctor_id = :doctor_id 
            ORDER BY expiry_date DESC 
            LIMIT 1
        ");
        $stmt->bindParam(':doctor_id', $doctor_id, PDO::PARAM_INT);
        $stmt->execute();
        
        if ($stmt->rowCount() > 0) {
            $sub = $stmt->fetch(PDO::FETCH_ASSOC);
            $is_expired = strtotime($sub['expiry_date']) < time();
            $sub['is_expired'] = $is_expired;
            echo json_encode(["success" => true, "data" => $sub]);
        } else {
            echo json_encode(["success" => true, "data" => null]);
        }
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Subscription Renewal Simulation
    $data = json_decode(file_get_contents("php://input"), true);
    $doctor_id = $data['doctor_id'];
    $plan = $data['plan']; // 'Basic' or 'Premium'
    $price = ($plan === 'Premium') ? 1999 : 999;
    $duration = 30; // 30 days
    
    try {
        $expiry_date = date('Y-m-d H:i:s', strtotime("+$duration days"));
        
        $stmt = $db->prepare("
            INSERT INTO doctor_subscriptions (doctor_id, plan_name, price, expiry_date, status)
            VALUES (:doctor_id, :plan_name, :price, :expiry_date, 'active')
            RETURNING id
        ");
        $stmt->bindParam(':doctor_id', $doctor_id, PDO::PARAM_INT);
        $stmt->bindParam(':plan_name', $plan);
        $stmt->bindParam(':price', $price);
        $stmt->bindParam(':expiry_date', $expiry_date);
        $stmt->execute();
        
        $sub_id = $stmt->fetch(PDO::FETCH_ASSOC)['id'];
        
        // Record payment
        $payStmt = $db->prepare("
            INSERT INTO subscription_payments (subscription_id, doctor_id, transaction_id, amount)
            VALUES (:sub_id, :doctor_id, :tx_id, :amount)
        ");
        $tx_id = "SUB" . strtoupper(uniqid());
        $payStmt->bindParam(':sub_id', $sub_id, PDO::PARAM_INT);
        $payStmt->bindParam(':doctor_id', $doctor_id, PDO::PARAM_INT);
        $payStmt->bindParam(':tx_id', $tx_id);
        $payStmt->bindParam(':amount', $price);
        $payStmt->execute();
        
        echo json_encode(["success" => true, "message" => "Subscription activated!", "expiry" => $expiry_date]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
    }
}
?>
