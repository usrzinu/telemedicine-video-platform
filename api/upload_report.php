<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../backend/config/database.php';

/* -------------------------------------------------------
   Helper: unified JSON response
------------------------------------------------------- */
function respond(bool $success, string $message, array $data = []): void {
    echo json_encode([
        "success" => $success,
        "message" => $message,
        "data"    => empty($data) ? new stdClass() : $data
    ]);
    exit;
}

/* -------------------------------------------------------
   1. Input validation
------------------------------------------------------- */
$booking_id = isset($_POST['booking_id']) ? trim($_POST['booking_id']) : null;
$patient_id = isset($_POST['patient_id']) ? trim($_POST['patient_id']) : null;

if (!$booking_id || !is_numeric($booking_id)) {
    respond(false, "A valid booking_id is required.");
}

if (!$patient_id || !is_numeric($patient_id)) {
    respond(false, "A valid patient_id is required.");
}

if (!isset($_FILES['report']) || $_FILES['report']['error'] !== UPLOAD_ERR_OK) {
    $uploadErrors = [
        UPLOAD_ERR_INI_SIZE   => "File exceeds server upload limit.",
        UPLOAD_ERR_FORM_SIZE  => "File exceeds form upload limit.",
        UPLOAD_ERR_PARTIAL    => "File was only partially uploaded.",
        UPLOAD_ERR_NO_FILE    => "No file was uploaded.",
        UPLOAD_ERR_NO_TMP_DIR => "Missing temporary folder.",
        UPLOAD_ERR_CANT_WRITE => "Failed to write file to disk.",
        UPLOAD_ERR_EXTENSION  => "A PHP extension stopped the file upload.",
    ];
    $errCode = $_FILES['report']['error'] ?? UPLOAD_ERR_NO_FILE;
    respond(false, $uploadErrors[$errCode] ?? "Unknown upload error.");
}

/* -------------------------------------------------------
   2. File validation
------------------------------------------------------- */
$file        = $_FILES['report'];
$maxSize     = 10 * 1024 * 1024; // 10 MB
$allowedMime = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
$allowedExt  = ['pdf', 'jpg', 'jpeg', 'png'];

// Size check
if ($file['size'] > $maxSize) {
    respond(false, "File size exceeds the 10MB limit.");
}

// Extension check (via original filename)
$originalName = basename($file['name']);
$ext          = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
if (!in_array($ext, $allowedExt, true)) {
    respond(false, "Invalid file type. Only PDF, JPG, JPEG, and PNG are allowed.");
}

// MIME check via finfo (server-side validation, not user-supplied)
$finfo    = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);
if (!in_array($mimeType, $allowedMime, true)) {
    respond(false, "File content does not match allowed types (PDF, JPG, PNG).");
}

/* -------------------------------------------------------
   3. Database — verify patient owns this booking
------------------------------------------------------- */
$database = new Database();
$db       = $database->getConnection();

try {
    $stmt = $db->prepare("
        SELECT a.id AS booking_id, a.patient_id, a.doctor_id, a.status AS appointment_status
        FROM appointments a
        WHERE a.id = :booking_id
        LIMIT 1
    ");
    $stmt->bindParam(':booking_id', $booking_id, PDO::PARAM_INT);
    $stmt->execute();

    if ($stmt->rowCount() === 0) {
        respond(false, "Booking not found.");
    }

    $booking = $stmt->fetch(PDO::FETCH_ASSOC);

    // Ownership check: must be the patient on the booking
    if ((int)$booking['patient_id'] !== (int)$patient_id) {
        respond(false, "Access denied. You do not own this booking.");
    }

    // Only allow upload when booking is active (confirmed/paid/ongoing)
    $allowedStatuses = ['confirmed', 'paid', 'ongoing'];
    if (!in_array($booking['appointment_status'], $allowedStatuses, true)) {
        respond(false, "Reports can only be uploaded for active consultations.");
    }

} catch (PDOException $e) {
    respond(false, "Database error: " . $e->getMessage());
}

/* -------------------------------------------------------
   4. Prepare upload directory
------------------------------------------------------- */
$uploadBase = __DIR__ . '/../backend/uploads/reports/';

if (!is_dir($uploadBase)) {
    if (!mkdir($uploadBase, 0755, true)) {
        respond(false, "Could not create upload directory. Contact administrator.");
    }
}

/* -------------------------------------------------------
   5. Generate unique filename & move file
------------------------------------------------------- */
$storedName = uniqid('rpt_', true) . '_' . time() . '.' . $ext;
$destPath   = $uploadBase . $storedName;

if (!move_uploaded_file($file['tmp_name'], $destPath)) {
    respond(false, "Failed to store the uploaded file. Please try again.");
}

// Relative path saved in DB (web-accessible path from project root)
$dbFilePath = 'backend/uploads/reports/' . $storedName;

/* -------------------------------------------------------
   6. Save record to medical_reports
------------------------------------------------------- */
try {
    // Resolve consultation_id if one exists for this booking
    $conStmt = $db->prepare("
        SELECT id FROM consultation_records
        WHERE booking_id = :booking_id
        LIMIT 1
    ");
    $conStmt->bindParam(':booking_id', $booking_id, PDO::PARAM_INT);
    $conStmt->execute();
    $consRow        = $conStmt->fetch(PDO::FETCH_ASSOC);
    $consultation_id = $consRow ? $consRow['id'] : null;
    $doctor_id       = $booking['doctor_id'];

    $insStmt = $db->prepare("
        INSERT INTO medical_reports
            (consultation_id, booking_id, patient_id, doctor_id, original_name, stored_name, file_path, uploaded_at)
        VALUES
            (:consultation_id, :booking_id, :patient_id, :doctor_id, :original_name, :stored_name, :file_path, NOW())
        RETURNING id
    ");
    $insStmt->bindValue(':consultation_id', $consultation_id, $consultation_id === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
    $insStmt->bindParam(':booking_id',    $booking_id,    PDO::PARAM_INT);
    $insStmt->bindParam(':patient_id',    $patient_id,    PDO::PARAM_INT);
    $insStmt->bindParam(':doctor_id',     $doctor_id,     PDO::PARAM_INT);
    $insStmt->bindParam(':original_name', $originalName,  PDO::PARAM_STR);
    $insStmt->bindParam(':stored_name',   $storedName,    PDO::PARAM_STR);
    $insStmt->bindParam(':file_path',     $dbFilePath,    PDO::PARAM_STR);
    $insStmt->execute();

    $reportRow = $insStmt->fetch(PDO::FETCH_ASSOC);

    respond(true, "Report uploaded successfully.", [
        "report_id"     => $reportRow['id'],
        "original_name" => $originalName,
        "file_path"     => $dbFilePath
    ]);

} catch (PDOException $e) {
    // Roll back file if DB insert fails
    if (file_exists($destPath)) {
        unlink($destPath);
    }
    respond(false, "Database error while saving report: " . $e->getMessage());
}
?>
