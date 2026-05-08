<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../backend/config/database.php';

/* -------------------------------------------------------
   Helper: unified JSON response
------------------------------------------------------- */
function respond(bool $success, string $message, $data = null): void {
    echo json_encode([
        "success" => $success,
        "message" => $message,
        "data"    => $data !== null ? $data : new stdClass()
    ]);
    exit;
}

/* -------------------------------------------------------
   1. Input
------------------------------------------------------- */
$booking_id = isset($_GET['booking_id']) ? trim($_GET['booking_id']) : null;

if (!$booking_id || !is_numeric($booking_id)) {
    respond(false, "A valid numeric booking_id is required.");
}

/* -------------------------------------------------------
   2. Optional caller context (doctor or patient) — used
      only to allow/deny future fine-grained access; both
      roles can currently read reports for a booking.
------------------------------------------------------- */
$caller_id   = isset($_GET['caller_id'])   ? (int)$_GET['caller_id']   : null;
$caller_role = isset($_GET['caller_role']) ? trim($_GET['caller_role']) : null;

/* -------------------------------------------------------
   3. Fetch reports
------------------------------------------------------- */
$database = new Database();
$db       = $database->getConnection();

try {
    // Verify booking exists
    $chkStmt = $db->prepare("SELECT id FROM appointments WHERE id = :booking_id LIMIT 1");
    $chkStmt->bindParam(':booking_id', $booking_id, PDO::PARAM_INT);
    $chkStmt->execute();
    if ($chkStmt->rowCount() === 0) {
        respond(false, "Booking not found.");
    }

    // Fetch all reports for this booking, newest first
    $stmt = $db->prepare("
        SELECT
            mr.id,
            mr.booking_id,
            mr.patient_id,
            mr.doctor_id,
            mr.original_name,
            mr.stored_name,
            mr.file_path,
            mr.uploaded_at,
            u.name AS patient_name
        FROM medical_reports mr
        JOIN users u ON mr.patient_id = u.id
        WHERE mr.booking_id = :booking_id
        ORDER BY mr.uploaded_at DESC
    ");
    $stmt->bindParam(':booking_id', $booking_id, PDO::PARAM_INT);
    $stmt->execute();

    $reports = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        // Build a web-accessible URL for each report
        $row['view_url']     = '/' . ltrim($row['file_path'], '/');
        $row['download_url'] = '/' . ltrim($row['file_path'], '/');
        $reports[]           = $row;
    }

    respond(true, "Reports retrieved successfully.", [
        "booking_id"   => (int)$booking_id,
        "total"        => count($reports),
        "reports"      => $reports
    ]);

} catch (PDOException $e) {
    respond(false, "Database error: " . $e->getMessage());
}
?>
