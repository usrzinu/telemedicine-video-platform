<?php
require_once 'backend/config/database.php';
$database = new Database();
$db = $database->getConnection();
$stmt = $db->query("SELECT * FROM users LIMIT 0");
$columns = [];
for ($i = 0; $i < $stmt->columnCount(); $i++) {
    $columns[] = $stmt->getColumnMeta($i)['name'];
}
echo json_encode($columns);
