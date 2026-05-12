<?php
require_once __DIR__ . '/backend/config/database.php';

$database = new Database();
$db = $database->getConnection();

try {
    $patient_id = 1; // Sample ID
    $exclude_id = 0;

    $stmt = $db->prepare("
        SELECT cr.id, cr.booking_id, cr.diagnosis, cr.advice, cr.created_at, 
               s.date,
               u.name AS doctor_name
        FROM consultation_records cr
        JOIN appointments a  ON cr.booking_id = a.id
        JOIN doctor_slots s  ON a.slot_id = s.id
        JOIN users u         ON cr.doctor_id = u.id
        ORDER BY s.date DESC, cr.created_at DESC
    ");
    $stmt->execute();
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Count: " . count($records) . "\n";
    print_r($records);
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
