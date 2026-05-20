<?php
// GENERATE DRAFT PRESCRIPTION PDF
require_once __DIR__ . '/../backend/config/database.php';

// Get Data from POST (JSON)
$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (!$data) {
    // If not POST, check if we have data in session or URL (for preview)
    // For this implementation, we expect a POST to generate a temp view or a GET with base64 data
    $data = isset($_GET['d']) ? json_decode(base64_decode($_GET['d']), true) : null;
}

if (!$data) {
    die("No draft data provided.");
}

$doctor_name = $data['doctor_name'] ?? 'Doctor';
$patient_name = $data['patient_name'] ?? 'Patient';
$medicines = $data['medicines'] ?? [];
$vitals = $data['vitals'] ?? [];
$clinical = $data['clinical'] ?? [];

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>DRAFT Prescription - AuraMed</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root { --primary: #0ea5e9; --text-main: #1e293b; --text-muted: #64748b; --border: #e2e8f0; }
        body { font-family: 'Inter', sans-serif; background: #f1f5f9; margin: 0; padding: 2rem; color: var(--text-main); }
        .prescription-container {
            max-width: 800px; margin: 0 auto; background: white; padding: 3rem; 
            box-shadow: 0 10px 25px rgba(0,0,0,0.05); border-radius: 8px; position: relative; min-height: 1000px;
            overflow: hidden;
        }
        .draft-watermark {
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 8rem; color: rgba(0,0,0,0.03); font-weight: 900; z-index: 0; pointer-events: none;
            text-transform: uppercase; white-space: nowrap;
        }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid var(--primary); padding-bottom: 1.5rem; margin-bottom: 2rem; position: relative; z-index: 1; }
        .doctor-info h1 { margin: 0; font-size: 1.5rem; color: var(--primary); }
        .doctor-info p { margin: 0.25rem 0; font-size: 0.9rem; color: var(--text-muted); }
        .patient-bar { background: #f8fafc; padding: 1rem 1.5rem; border-radius: 8px; display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 1rem; margin-bottom: 2rem; font-size: 0.9rem; position: relative; z-index: 1; }
        .patient-bar div span { display: block; color: var(--text-muted); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
        .rx-section { display: flex; gap: 2rem; margin-top: 2rem; position: relative; z-index: 1; }
        .rx-symbol { font-size: 3rem; font-weight: 700; color: var(--primary); font-style: italic; }
        .medicine-item { margin-bottom: 1.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.75rem; }
        .medicine-name { font-weight: 700; font-size: 1.1rem; }
        .notes-section { margin-top: 2rem; padding: 1.5rem; background: #fff; border-left: 4px solid var(--primary); border: 1px solid var(--border); border-left-width: 4px; }
        .notes-section h3 { margin-top: 0; font-size: 0.9rem; color: var(--primary); text-transform: uppercase; }
        .btn-print { position: fixed; top: 2rem; right: 2rem; background: var(--primary); color: white; padding: 0.75rem 1.5rem; border-radius: 99px; border: none; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3); z-index: 100; }
        @media print { .btn-print { display: none; } body { padding: 0; background: white; } .prescription-container { box-shadow: none; border: none; } }

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
        .signature-box {
            text-align: center;
            width: 240px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .signature-line {
            border-top: 1.5px solid #000;
            width: 100%;
            padding-top: 0.5rem;
            font-size: 0.8rem;
            font-weight: 700;
            color: #000;
        }
    </style>
</head>
<body>
    <button class="btn-print" onclick="window.print()">
        <i class="fa-solid fa-print"></i> Print Draft
    </button>

    <div class="prescription-container">
        <div class="draft-watermark">DRAFT COPY</div>
        
        <div class="header">
            <div class="doctor-info">
                <h1>Dr. <?php echo htmlspecialchars($doctor_name); ?></h1>
                <p>Digital Prescription Preview</p>
                <p>Status: Unfinalized Draft</p>
            </div>
            <div class="hospital-logo" style="text-align: right;">
                <h2 style="color: var(--primary); margin: 0;"><i class="fa-solid fa-heart-pulse"></i> AuraMed</h2>
                <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0;">PREVIEW MODE</p>
            </div>
        </div>

        <div class="patient-bar">
            <div><span>Patient Name</span><strong><?php echo htmlspecialchars($patient_name); ?></strong></div>
            <div><span>Date</span><strong><?php echo date('d M Y'); ?></strong></div>
            <div><span>Status</span><strong style="color: #f59e0b;">DRAFT</strong></div>
        </div>

        <div class="patient-bar" style="background: #fff; border: 1px dashed var(--primary); margin-top: -1rem;">
            <div><span>Weight</span><strong><?php echo htmlspecialchars($vitals['weight'] ?: '—'); ?> kg</strong></div>
            <div><span>BP</span><strong><?php echo htmlspecialchars($vitals['bp'] ?: '—'); ?></strong></div>
            <div><span>Temp</span><strong><?php echo htmlspecialchars($vitals['temp'] ?: '—'); ?> °F</strong></div>
            <div><span>O2</span><strong><?php echo htmlspecialchars($vitals['oxygen'] ?: '—'); ?> %</strong></div>
        </div>

        <div style="margin-bottom: 2rem; position: relative; z-index: 1;">
            <div style="margin-bottom: 1rem;">
                <strong style="color: var(--primary); font-size: 0.8rem; text-transform: uppercase;">Symptoms:</strong>
                <p style="margin: 0.25rem 0;"><?php echo nl2br(htmlspecialchars($clinical['symptoms'] ?: 'None recorded')); ?></p>
            </div>
            <div>
                <strong style="color: var(--primary); font-size: 0.8rem; text-transform: uppercase;">Diagnosis:</strong>
                <p style="margin: 0.25rem 0; font-weight: 600;"><?php echo nl2br(htmlspecialchars($clinical['diagnosis'] ?: 'Not yet diagnosed')); ?></p>
            </div>
        </div>

        <div class="rx-section">
            <div class="rx-symbol">Rx</div>
            <div style="flex-grow: 1;">
                <?php if (empty($medicines)): ?>
                    <p style="color: var(--text-muted); font-style: italic;">No medications added to draft yet.</p>
                <?php else: ?>
                    <?php foreach ($medicines as $med): ?>
                        <div class="medicine-item">
                            <div class="medicine-name"><?php echo htmlspecialchars($med['name']); ?></div>
                            <div style="font-size: 0.9rem; color: var(--text-muted);">
                                <?php echo htmlspecialchars($med['dosage']); ?> — <?php echo htmlspecialchars($med['frequency']); ?> — <?php echo htmlspecialchars($med['duration']); ?>
                            </div>
                            <?php if ($med['instructions']): ?>
                                <div style="font-size: 0.8rem; margin-top: 0.2rem; font-style: italic;">Note: <?php echo htmlspecialchars($med['instructions']); ?></div>
                            <?php endif; ?>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
        </div>

        <?php if ($clinical['advice']): ?>
        <div class="notes-section" style="position: relative; z-index: 1;">
            <h3>Advice</h3>
            <p style="margin: 0; font-size: 0.95rem;"><?php echo nl2br(htmlspecialchars($clinical['advice'])); ?></p>
        </div>
        <?php endif; ?>

        <div style="position: absolute; bottom: 3rem; left: 3rem; right: 3rem; display: flex; justify-content: space-between; align-items: flex-end; opacity: 0.5;">
            <div style="font-size: 0.7rem; color: var(--text-muted);">This is a preview draft and cannot be used for medication purchase.</div>
            <div class="signature-box" style="text-align: center; width: 200px;">
                <?php 
                $sigPath = $data['signature_path'] ?? '';
                $fullSigPath = __DIR__ . '/../' . $sigPath;
                if (!empty($sigPath) && file_exists($fullSigPath)): ?>
                    <img src="../<?php echo htmlspecialchars($sigPath); ?>" class="signature-image">
                <?php else: ?>
                    <div class="signature-placeholder"><?php echo htmlspecialchars($doctor_name); ?></div>
                <?php endif; ?>
                <div class="signature-line">Doctor's Signature</div>
            </div>
        </div>
    </div>
</body>
</html>
