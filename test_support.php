<?php
require_once __DIR__ . '/backend/config/Database.php';
require_once __DIR__ . '/backend/models/SupportModel.php';

try {
    $db = (new Database())->getConnection();
    $model = new SupportModel($db);
    $tickets = $model->getUserTickets(11); // Assuming user 11 from previous context
    header('Content-Type: application/json');
    echo json_encode(["status" => "success", "data" => $tickets]);
} catch (Exception $e) {
    header('Content-Type: application/json');
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
