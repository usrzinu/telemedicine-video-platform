<?php
require_once __DIR__ . '/../backend/config/database.php';
require_once __DIR__ . '/../backend/models/DoctorModel.php';

$doctor_id = isset($_GET['doctor_id']) ? (int)$_GET['doctor_id'] : null;
$period = isset($_GET['period']) ? $_GET['period'] : 'today';
$start_date = isset($_GET['start_date']) ? $_GET['start_date'] : null;
$end_date = isset($_GET['end_date']) ? $_GET['end_date'] : null;

if (!$doctor_id) {
    die("Access Denied: Doctor ID required.");
}

$database = new Database();
$db = $database->getConnection();
$doctorModel = new DoctorModel($db);

// Fetch Doctor Details
$stmt = $db->prepare("SELECT u.name, d.specialization, d.qualification FROM users u JOIN doctors d ON u.id = d.user_id WHERE u.id = :id");
$stmt->bindParam(':id', $doctor_id);
$stmt->execute();
$doctor = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$doctor) {
    die("Doctor profile not found.");
}

// Fetch Report Data
$reportData = $doctorModel->getPatientConsultationReport($doctor_id, $period, $start_date, $end_date);
$summary = $reportData['summary'];
$patients = $reportData['patients'];

$reportTitle = "Patient Consultation Report";
$reportPeriodLabel = ucfirst($period);
if ($period === 'custom') {
    $reportPeriodLabel = "Range: $start_date to $end_date";
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>AuraMed - <?php echo $reportTitle; ?></title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #0ea5e9;
            --secondary: #6366f1;
            --text-main: #1e293b;
            --text-muted: #64748b;
            --border: #e2e8f0;
            --bg-light: #f8fafc;
        }
        body {
            font-family: 'Inter', sans-serif;
            color: var(--text-main);
            margin: 0;
            padding: 40px;
            background: #fff;
            line-height: 1.5;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid var(--primary);
            padding-bottom: 25px;
            margin-bottom: 40px;
        }
        .logo-box h1 {
            margin: 0;
            font-size: 2rem;
            font-weight: 800;
            color: var(--primary);
            letter-spacing: -1px;
        }
        .logo-box p {
            margin: 0;
            font-size: 0.9rem;
            color: var(--text-muted);
            font-weight: 500;
        }
        .doctor-box {
            text-align: right;
        }
        .doctor-box h2 {
            margin: 0;
            font-size: 1.25rem;
            color: var(--text-main);
        }
        .doctor-box p {
            margin: 2px 0;
            font-size: 0.85rem;
            color: var(--text-muted);
        }

        .report-meta {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            background: var(--bg-light);
            padding: 15px 20px;
            border-radius: 10px;
            font-size: 0.9rem;
        }
        .meta-item strong {
            display: block;
            font-size: 0.7rem;
            text-transform: uppercase;
            color: var(--text-muted);
            letter-spacing: 0.05em;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-bottom: 40px;
        }
        .stat-card {
            border: 1px solid var(--border);
            padding: 20px;
            border-radius: 12px;
            text-align: center;
        }
        .stat-card .value {
            font-size: 1.75rem;
            font-weight: 700;
            color: var(--primary);
            display: block;
        }
        .stat-card .label {
            font-size: 0.75rem;
            color: var(--text-muted);
            text-transform: uppercase;
            font-weight: 600;
            margin-top: 5px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 40px;
        }
        th {
            background: var(--bg-light);
            text-align: left;
            padding: 12px 15px;
            font-size: 0.75rem;
            text-transform: uppercase;
            color: var(--text-muted);
            border-bottom: 2px solid var(--border);
        }
        td {
            padding: 12px 15px;
            font-size: 0.85rem;
            border-bottom: 1px solid var(--border);
        }
        .status-pill {
            padding: 4px 8px;
            border-radius: 99px;
            font-size: 0.7rem;
            font-weight: 700;
            text-transform: uppercase;
        }
        .status-completed { background: #dcfce7; color: #166534; }
        .status-ongoing { background: #e0f2fe; color: #0369a1; }
        .status-waiting { background: #fef3c7; color: #92400e; }

        .footer {
            margin-top: 50px;
            border-top: 1px solid var(--border);
            padding-top: 20px;
            font-size: 0.75rem;
            color: var(--text-muted);
            display: flex;
            justify-content: space-between;
        }

        .print-btn {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: #1e293b;
            color: white;
            padding: 12px 24px;
            border-radius: 50px;
            border: none;
            font-family: inherit;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            gap: 10px;
        }

        @media print {
            .print-btn { display: none; }
            body { padding: 0; }
        }
    </style>
</head>
<body>

    <button class="print-btn" onclick="window.print()">
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
        Print Report / Save as PDF
    </button>

    <div class="header">
        <div class="logo-box">
            <h1>AuraMed</h1>
            <p>Telemedicine Network</p>
        </div>
        <div class="doctor-box">
            <h2>Dr. <?php echo htmlspecialchars($doctor['name']); ?></h2>
            <p><?php echo htmlspecialchars($doctor['specialization']); ?></p>
            <p><?php echo htmlspecialchars($doctor['qualification']); ?></p>
        </div>
    </div>

    <h2 style="margin-top: 0; font-size: 1.5rem; letter-spacing: -0.02em;"><?php echo $reportTitle; ?></h2>
    
    <div class="report-meta">
        <div class="meta-item">
            <strong>Report Period</strong>
            <?php echo $reportPeriodLabel; ?>
        </div>
        <div class="meta-item">
            <strong>Generated On</strong>
            <?php echo date('d M Y, h:i A'); ?>
        </div>
        <div class="meta-item">
            <strong>Report ID</strong>
            #<?php echo strtoupper(substr(md5($doctor_id . time()), 0, 8)); ?>
        </div>
    </div>

    <div class="stats-grid">
        <div class="stat-card">
            <span class="value"><?php echo $summary['total_patients']; ?></span>
            <span class="label">Total Patients</span>
        </div>
        <div class="stat-card">
            <span class="value"><?php echo $summary['total_consultations']; ?></span>
            <span class="label">Consultations</span>
        </div>
        <div class="stat-card">
            <span class="value"><?php echo $summary['new_patients']; ?></span>
            <span class="label">New Patients</span>
        </div>
        <div class="stat-card">
            <span class="value"><?php echo $summary['returning_patients']; ?></span>
            <span class="label">Returning</span>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Patient Name</th>
                <th>Age / Gender</th>
                <th>Blood</th>
                <th>Visits</th>
                <th>Last Visit</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            <?php if (empty($patients)): ?>
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">No consultation records found for this period.</td>
                </tr>
            <?php else: ?>
                <?php foreach ($patients as $p): ?>
                <tr>
                    <td style="font-weight: 600;"><?php echo htmlspecialchars($p['name']); ?></td>
                    <td><?php echo $p['age'] ?: '—'; ?> / <?php echo $p['gender'] ?: '—'; ?></td>
                    <td><?php echo $p['blood_group'] ?: '—'; ?></td>
                    <td><?php echo $p['visit_count']; ?></td>
                    <td><?php echo date('d M Y', strtotime($p['last_visit'])); ?></td>
                    <td>
                        <span class="status-pill status-<?php echo $p['consultation_status']; ?>">
                            <?php echo $p['consultation_status']; ?>
                        </span>
                    </td>
                </tr>
                <?php endforeach; ?>
            <?php endif; ?>
        </tbody>
    </table>

    <div class="footer">
        <div>
            &copy; <?php echo date('Y'); ?> AuraMed Telemedicine Platform. Confidential medical report.
        </div>
        <div style="text-align: right;">
            Page 1 of 1
        </div>
    </div>

    <script>
        // Auto-open print dialog
        window.onload = function() {
            // Uncomment if you want automatic prompt
            // window.print();
        }
    </script>
</body>
</html>
