<?php
require_once __DIR__ . '/../backend/config/Database.php';
require_once __DIR__ . '/../backend/models/DoctorModel.php';

$db = (new Database())->getConnection();
$model = new DoctorModel($db);
$doctors = $model->getApprovedDoctors();

header('Content-Type: application/json');
echo json_encode($doctors, JSON_PRETTY_PRINT);
