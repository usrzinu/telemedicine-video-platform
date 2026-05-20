<?php
require_once __DIR__ . '/../backend/config/database.php';

$prescription_id = isset($_GET['prescription_id']) ? (int)$_GET['prescription_id'] : null;

if (!$prescription_id) {
    die("Invalid Prescription ID.");
}

$database = new Database();
$db = $database->getConnection();

try {
    // 1. Fetch Prescription Metadata
    $stmt = $db->prepare("
        SELECT p.*, 
               u_doc.name AS doctor_name, 
               d.specialization, d.qualification, d.license_number, d.signature_path,
               u_pat.name AS patient_name, u_pat.age as patient_age, u_pat.gender, u_pat.blood_group,
               cr.weight, cr.blood_pressure, cr.temperature, cr.oxygen_level
        FROM prescriptions p
        JOIN users u_doc ON p.doctor_id = u_doc.id
        JOIN doctors d ON u_doc.id = d.user_id
        JOIN users u_pat ON p.patient_id = u_pat.id
        JOIN consultation_records cr ON p.consultation_id = cr.id
        WHERE p.id = :id
        LIMIT 1
    ");
    $stmt->bindParam(':id', $prescription_id, PDO::PARAM_INT);
    $stmt->execute();
    
    if ($stmt->rowCount() === 0) {
        die("Prescription not found.");
    }
    
    $prescription = $stmt->fetch(PDO::FETCH_ASSOC);

    // 2. Fetch Medicines
    $medStmt = $db->prepare("SELECT * FROM prescription_medicines WHERE prescription_id = :id");
    $medStmt->bindParam(':id', $prescription_id, PDO::PARAM_INT);
    $medStmt->execute();
    $medicines = $medStmt->fetchAll(PDO::FETCH_ASSOC);

} catch (PDOException $e) {
    die("Database error: " . $e->getMessage());
}

// Check for PDF export request (Phase 2 extension)
$export = isset($_GET['export']) && $_GET['export'] === 'pdf';

// If export is requested and dompdf exists, we use it. 
// Otherwise, we render a professional HTML view with a Print button.

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Prescription - AuraMed</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --primary: #0ea5e9;
            --text-main: #1e293b;
            --text-muted: #64748b;
            --border: #e2e8f0;
        }
        body {
            font-family: 'Inter', sans-serif;
            background: #f1f5f9;
            margin: 0;
            padding: 2rem;
            color: var(--text-main);
        }
        .prescription-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 3rem;
            box-shadow: 0 10px 25px rgba(0,0,0,0.05);
            border-radius: 8px;
            position: relative;
            min-height: 1000px;
        }
        .header {
            display: flex;
            justify-content: space-between;
            border-bottom: 2px solid var(--primary);
            padding-bottom: 1.5rem;
            margin-bottom: 2rem;
        }
        .doctor-info h1 {
            margin: 0;
            font-size: 1.5rem;
            color: var(--primary);
        }
        .doctor-info p {
            margin: 0.25rem 0;
            font-size: 0.9rem;
            color: var(--text-muted);
        }
        .hospital-logo {
            text-align: right;
        }
        .hospital-logo h2 {
            margin: 0;
            font-size: 1.8rem;
            font-weight: 800;
            letter-spacing: -1px;
        }
        .patient-bar {
            background: #f8fafc;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            display: grid;
            grid-template-columns: 2fr 1fr 1fr 1fr;
            gap: 1rem;
            margin-bottom: 2rem;
            font-size: 0.9rem;
        }
        .patient-bar div span {
            display: block;
            color: var(--text-muted);
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }
        .patient-bar div strong {
            color: var(--text-main);
        }
        .content-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 2rem;
        }
        .rx-section {
            display: flex;
            gap: 2rem;
        }
        .rx-symbol {
            font-size: 3rem;
            font-weight: 700;
            color: var(--primary);
            font-style: italic;
        }
        .medicine-list {
            flex-grow: 1;
        }
        .medicine-item {
            margin-bottom: 1.5rem;
            border-bottom: 1px solid var(--border);
            padding-bottom: 0.75rem;
        }
        .medicine-name {
            font-weight: 700;
            font-size: 1.1rem;
            margin-bottom: 0.25rem;
        }
        .medicine-details {
            font-size: 0.9rem;
            color: var(--text-muted);
        }
        .notes-section {
            margin-top: 2rem;
            padding: 1.5rem;
            background: #fff;
            border-left: 4px solid var(--primary);
        }
        .notes-section h3 {
            margin-top: 0;
            font-size: 1rem;
            color: var(--primary);
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .footer {
            position: absolute;
            bottom: 3rem;
            left: 3rem;
            right: 3rem;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }
        .signature-box {
            text-align: center;
            width: 240px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .signature-line {
            border-top: 1.5px solid #1e293b;
            width: 100%;
            margin-top: 0;
            padding-top: 0.5rem;
            font-weight: 700;
            color: #1e293b;
            font-size: 0.85rem;
            letter-spacing: 0.5px;
        }
        .btn-print {
            position: fixed;
            top: 2rem;
            right: 2rem;
            background: var(--primary);
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 99px;
            border: none;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
            display: flex;
            align-items: center;
            gap: 0.5rem;
            z-index: 1000;
        }
        @media print {
            body { background: white; padding: 0; }
            .prescription-container { box-shadow: none; width: 100%; max-width: 100%; margin: 0; border: none; }
            .btn-print { display: none; }
        }
        
        /* Signature Styles */
        @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');
        .signature-placeholder {
            font-family: 'Great Vibes', cursive;
            font-size: 2.6rem;
            color: #1e3a8a;
            margin-bottom: -18px;
            line-height: 1;
            transform: rotate(-2deg);
            display: inline-block;
            text-shadow: 1px 1px 2px rgba(30, 58, 138, 0.1);
        }
        .signature-image {
            max-height: 75px;
            margin-bottom: -15px;
            transform: rotate(-1deg);
        }
    </style>
</head>
<body>

    <button class="btn-print" onclick="window.print()">
        <i class="fa-solid fa-print"></i> Print Prescription
    </button>

    <div class="prescription-container">
        <div class="header">
            <div class="doctor-info">
                <h1>Dr. <?php echo htmlspecialchars($prescription['doctor_name']); ?></h1>
                <p><?php echo htmlspecialchars($prescription['qualification']); ?></p>
                <p><?php echo htmlspecialchars($prescription['specialization']); ?></p>
                <p>Reg No: <?php echo htmlspecialchars($prescription['license_number']); ?></p>
            </div>
            <div class="hospital-logo">
                <h2 style="color: var(--primary);"><i class="fa-solid fa-heart-pulse"></i> AuraMed</h2>
                <p style="font-size: 0.8rem; color: var(--text-muted);">Telemedicine Network</p>
            </div>
        </div>

        <div class="patient-bar">
            <div>
                <span>Patient Name</span>
                <strong><?php echo htmlspecialchars($prescription['patient_name']); ?></strong>
            </div>
            <div>
                <span>Age / Gender</span>
                <strong><?php echo $prescription['patient_age'] ?? 'N/A'; ?> / <?php echo $prescription['gender'] ?? 'N/A'; ?></strong>
            </div>
            <div>
                <span>Date</span>
                <strong><?php echo date('d M Y', strtotime($prescription['created_at'])); ?></strong>
            </div>
            <div>
                <span>Booking ID</span>
                <strong>#<?php echo $prescription['booking_id']; ?></strong>
            </div>
            <div>
                <span>Blood Group</span>
                <strong><?php echo $prescription['blood_group'] ?? 'N/A'; ?></strong>
            </div>
        </div>

        <div class="patient-bar" style="background: #fff; border: 1px dashed var(--primary); margin-top: -1rem;">
            <div>
                <span>Weight</span>
                <strong><?php echo $prescription['weight'] ? $prescription['weight'].' kg' : 'N/A'; ?></strong>
            </div>
            <div>
                <span>Blood Pressure</span>
                <strong><?php echo $prescription['blood_pressure'] ?: 'N/A'; ?></strong>
            </div>
            <div>
                <span>Temperature</span>
                <strong><?php echo $prescription['temperature'] ? $prescription['temperature'].' °F' : 'N/A'; ?></strong>
            </div>
            <div>
                <span>Oxygen Level</span>
                <strong><?php echo $prescription['oxygen_level'] ? $prescription['oxygen_level'].' %' : 'N/A'; ?></strong>
            </div>
        </div>

        <div class="content-grid">
            <div style="margin-bottom: 2rem;">
                <div style="margin-bottom: 1rem;">
                    <strong style="color: var(--primary); font-size: 0.85rem; text-transform: uppercase;">Symptoms:</strong>
                    <p style="margin: 0.25rem 0; font-size: 0.95rem;"><?php echo nl2br(htmlspecialchars($prescription['symptoms'])); ?></p>
                </div>
                <div>
                    <strong style="color: var(--primary); font-size: 0.85rem; text-transform: uppercase;">Diagnosis:</strong>
                    <p style="margin: 0.25rem 0; font-size: 1rem; font-weight: 600;"><?php echo nl2br(htmlspecialchars($prescription['diagnosis'])); ?></p>
                </div>
            </div>

            <div class="rx-section">
                <div class="rx-symbol">Rx</div>
                <div class="medicine-list">
                    <?php if (empty($medicines)): ?>
                        <p class="text-muted">No medications prescribed.</p>
                    <?php else: ?>
                        <?php foreach ($medicines as $med): ?>
                            <div class="medicine-item">
                                <div class="medicine-name"><?php echo htmlspecialchars($med['medicine_name']); ?></div>
                                <div class="medicine-details">
                                    <?php echo htmlspecialchars($med['dosage']); ?> — 
                                    <?php echo htmlspecialchars($med['frequency']); ?> — 
                                    <?php echo htmlspecialchars($med['duration']); ?>
                                </div>
                                <?php if ($med['instructions']): ?>
                                    <div style="font-size: 0.8rem; margin-top: 0.25rem; font-style: italic;">
                                        Note: <?php echo htmlspecialchars($med['instructions']); ?>
                                    </div>
                                <?php endif; ?>
                            </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>
            </div>

            <?php if ($prescription['advice']): ?>
            <div class="notes-section">
                <h3>Advice / Instructions</h3>
                <p style="margin-bottom: 0;"><?php echo nl2br(htmlspecialchars($prescription['advice'])); ?></p>
            </div>
            <?php endif; ?>
        </div>

        <div class="footer">
            <div style="font-size: 0.75rem; color: var(--text-muted);">
                Digitally generated by AuraMed Telemedicine Platform.<br>
                Verification code: <?php echo strtoupper(substr(md5($prescription['id']), 0, 10)); ?>
            </div>
            <div class="signature-box">
                <?php 
                $sigPath = $prescription['signature_path'];
                $fullSigPath = __DIR__ . '/../' . $sigPath;
                if (!empty($sigPath) && file_exists($fullSigPath)): ?>
                    <img src="../<?php echo htmlspecialchars($sigPath); ?>" class="signature-image">
                <?php else: ?>
                    <div class="signature-placeholder"><?php echo htmlspecialchars($prescription['doctor_name']); ?></div>
                <?php endif; ?>
                <div class="signature-line">Doctor's Signature</div>
            </div>
        </div>
    </div>

</body>
</html>
