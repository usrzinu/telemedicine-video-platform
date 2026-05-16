<?php
require_once __DIR__ . '/../backend/config/Database.php';
$db = (new Database())->getConnection();

function checkTable($db, $tableName) {
    echo "--- Table: $tableName ---\n";
    try {
        $stmt = $db->query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '$tableName'");
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            echo "{$row['column_name']} ({$row['data_type']})\n";
        }
    } catch (Exception $e) {
        echo "Error: " . $e->getMessage() . "\n";
    }
    echo "\n";
}

checkTable($db, 'doctors');
checkTable($db, 'doctor_subscriptions');
?>
