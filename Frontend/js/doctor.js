/**
 * DOCTOR MODULE JS — Production Video Consultation Controller (v1.0.3)
 *
 * Handles:
 *   1. Loading today's confirmed/paid appointments grouped by slot
 *   2. Starting a consultation session (POST /api/start_session.php)
 *   3. Opening the video meeting (GET /api/doctor_get_meeting.php)
 *   4. Displaying the patient queue per slot (GET /api/get_queue_status.php)
 *   5. Advancing to the next patient (POST /api/next_patient.php)
 *   6. Ending a session (POST /api/end_session.php)
 *
 * All data is fetched dynamically. No hardcoded IDs or test UI.
 */

const DOC_BASE = window.location.origin;
let docSessionPollInterval = null;
let wsReportsPollInterval = null; // Auto-refresh reports while workspace is open
window.patientCache = {}; // Global registry for all patients across all slots



document.addEventListener('DOMContentLoaded', () => {
    const userRole = localStorage.getItem('userRole');
    if (!userRole || userRole !== 'doctor') {
        window.location.href = 'login.html';
        return;
    }
    
    loadDoctorConsultationView();
    checkDoctorSubscription();
    docSessionPollInterval = setInterval(loadDoctorConsultationView, 10000);
});

async function checkDoctorSubscription() {
    const doctorId = localStorage.getItem('userId');
    const badge = document.getElementById('subscriptionBadge');
    const planText = document.getElementById('subPlanText');
    
    if (!doctorId || !badge) return;
    
    try {
        const response = await fetch(`${DOC_BASE}/api/doctor/manage_subscription.php?doctor_id=${doctorId}`);
        const result = await response.json();
        
        if (result.success && result.data) {
            const sub = result.data;
            badge.style.display = 'flex';
            planText.innerText = sub.plan_name;
            
            if (sub.is_expired) {
                badge.style.background = 'rgba(239, 68, 68, 0.1)';
                badge.style.borderColor = '#ef4444';
                planText.style.color = '#ef4444';
                planText.innerText += ' (Expired)';
            } else {
                badge.style.background = 'rgba(16, 185, 129, 0.1)';
                badge.style.borderColor = '#10b981';
                planText.style.color = '#10b981';
            }
        }
    } catch (e) {
        console.error("Error checking subscription:", e);
    }
}

/* =========================================================
   MAIN: Build the Consultations View
   ========================================================= */
async function loadDoctorConsultationView() {
    const doctorId = localStorage.getItem('userId');
    const container = document.getElementById('activeDoctorSessionsList');

    if (!doctorId || !container) return;

    try {
        // 1. Fetch all doctor appointments
        const response = await fetch(`${DOC_BASE}/api/doctor/appointments?doctor_id=${doctorId}`);
        const result = await response.json();

        if (result.status !== 'success' || !result.data || result.data.length === 0) {
            container.innerHTML = renderEmptyState();
            return;
        }

        // 2. Filter to confirmed/paid/ongoing only
        const activeApps = result.data.filter(app =>
            ['confirmed', 'paid', 'ongoing'].includes(app.status)
        );

        if (activeApps.length === 0) {
            container.innerHTML = renderEmptyState();
            return;
        }

        // 3. Group appointments by slot_id
        const slotGroups = {};
        for (const app of activeApps) {
            if (!slotGroups[app.slot_id]) {
                slotGroups[app.slot_id] = {
                    slot_id: app.slot_id,
                    start_time: app.start_time,
                    end_time: app.end_time,
                    date: app.date || '',
                    patients: []
                };
            }
            slotGroups[app.slot_id].patients.push(app);
        }

        // 4. Check active session for this doctor
        let activeSession = null;
        try {
            const sessionRes = await fetch(`${DOC_BASE}/api/doctor_get_meeting.php?doctor_id=${doctorId}`);
            const sessionData = await sessionRes.json();
            if (sessionData.success && sessionData.data && sessionData.data.meeting_link) {
                activeSession = sessionData.data;
            }
        } catch (e) {
            console.error('Error checking active session:', e);
        }

        // 5. Build HTML
        let html = `
        <h2 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem;">
            <i class="fa-solid fa-video" style="color: var(--primary);"></i>
            Consultation Control Panel
        </h2>`;

        const slotIds = Object.keys(slotGroups);
        for (const slotId of slotIds) {
            const slot = slotGroups[slotId];
            const isLiveSlot = activeSession && String(activeSession.slot_id) === String(slotId);

            html += await renderSlotCard(doctorId, slot, isLiveSlot, activeSession);
        }

        container.innerHTML = html;

    } catch (error) {
        console.error('Error loading doctor consultation view:', error);
        container.innerHTML = `
        <div class="glass" style="padding: 2rem; border-radius: 16px; text-align: center; color: #ef4444;">
            <i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; margin-bottom: 0.75rem;"></i>
            <p>Failed to load consultation data. Please check your connection.</p>
        </div>`;
    }
}

/* =========================================================
   RENDER: Single Slot Card with Session Controls + Queue
   ========================================================= */
async function renderSlotCard(doctorId, slot, isLive, activeSession) {
    const timeLabel = `${slot.start_time.substring(0, 5)} – ${slot.end_time.substring(0, 5)}`;
    const sessionId = isLive && activeSession ? activeSession.session_id : null;
    const meetingLink = isLive && activeSession ? activeSession.meeting_link : null;

    // Session status indicator
    let statusHtml, controlsHtml;
    const borderColor = isLive ? '#10b981' : 'var(--glass-border)';

    if (isLive) {
        statusHtml = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span style="width: 10px; height: 10px; border-radius: 50%; background: #10b981; display: inline-block; animation: pulse-dot 1.5s infinite;"></span>
                <span style="color: #10b981; font-weight: 700; font-size: 0.95rem;">Session LIVE</span>
            </div>`;
        controlsHtml = `
            <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                <button onclick="window.open('${meetingLink}', '_blank')" class="btn btn-primary"
                    style="background: #10b981; padding: 0.6rem 1.25rem; font-weight: 700; border-radius: 10px; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fa-solid fa-video"></i> Open Video
                </button>
                <button onclick="callNextPatient(${sessionId}, ${doctorId})" class="btn btn-primary"
                    style="background: #3b82f6; padding: 0.6rem 1.25rem; font-weight: 700; border-radius: 10px; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fa-solid fa-forward-step"></i> Next Patient
                </button>
                <button onclick="endSession(${sessionId}, ${doctorId})" class="btn btn-outline"
                    style="border-color: #ef4444; color: #ef4444; padding: 0.6rem 1.25rem; font-weight: 700; border-radius: 10px; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fa-solid fa-stop"></i> End Session
                </button>
            </div>`;
    } else {
        statusHtml = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span style="width: 10px; height: 10px; border-radius: 50%; background: #6b7280; display: inline-block;"></span>
                <span style="color: var(--text-muted); font-weight: 600; font-size: 0.95rem;">Not Started</span>
            </div>`;
        controlsHtml = `
            <button onclick="startSession(${doctorId}, ${slot.slot_id})" class="btn btn-primary"
                style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 0.7rem 1.5rem; font-weight: 700; border-radius: 10px; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fa-solid fa-play"></i> Start Consultation
            </button>`;
    }

    // Queue panel
    let queueHtml = '';
    try {
        const queueRes = await fetch(`${DOC_BASE}/api/get_queue_status.php?slot_id=${slot.slot_id}`);
        const queueData = await queueRes.json();

        if (queueData.success && queueData.data && queueData.data.queue && queueData.data.queue.length > 0) {
            const queue = queueData.data.queue;
            // Register patients in global cache
            queue.forEach(p => window.patientCache[p.booking_id] = p);
            
            queueHtml = `
            <div style="margin-top: 1.25rem; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 1rem;">
                <h4 style="margin: 0 0 0.75rem 0; font-size: 0.95rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fa-solid fa-list-ol" style="color: var(--primary);"></i>
                    Patient Queue (${queue.length})
                </h4>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    ${queue.map(p => renderQueueRow(p)).join('')}
                </div>
            </div>`;
        }
    } catch (e) {
        console.error('Error fetching queue for slot', slot.slot_id, e);
    }

    return `
    <div class="glass" style="padding: 1.75rem; border-radius: 16px; margin-bottom: 1.25rem; border: 1px solid ${borderColor}; border-left: 4px solid ${borderColor};">
        <!-- Slot Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem;">
            <div>
                <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                    <div style="width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, var(--primary), var(--secondary)); display: flex; align-items: center; justify-content: center;">
                        <i class="fa-regular fa-clock" style="color: white; font-size: 1.1rem;"></i>
                    </div>
                    <div>
                        <div style="font-weight: 700; font-size: 1.15rem; color: var(--text-main);">${timeLabel}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">${slot.date ? formatSlotDate(slot.date) : 'Today'} · ${slot.patients.length} patient${slot.patients.length > 1 ? 's' : ''}</div>
                    </div>
                </div>
                ${statusHtml}
            </div>
            <div style="display: flex; align-items: flex-start;">
                ${controlsHtml}
            </div>
        </div>
        ${queueHtml}
    </div>`;
}

/* =========================================================
   RENDER: Single Queue Row
   ========================================================= */
function renderQueueRow(patient) {
    let statusColor, statusIcon, statusText;

    switch (patient.consultation_status) {
        case 'ongoing':
            statusColor = '#10b981';
            statusIcon = 'fa-satellite-dish';
            statusText = 'In Consultation';
            break;
        case 'completed':
            statusColor = '#6b7280';
            statusIcon = 'fa-circle-check';
            statusText = 'Completed';
            break;
        case 'waiting':
        default:
            statusColor = '#f59e0b';
            statusIcon = 'fa-clock';
            statusText = 'Waiting';
            break;
    }

    const isActive = patient.consultation_status === 'ongoing';
    const rowBg = isActive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.02)';
    const rowBorder = isActive ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(255,255,255,0.04)';

    return `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; border-radius: 10px; background: ${rowBg}; border: ${rowBorder}; transition: background 0.2s;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: ${statusColor}20; color: ${statusColor}; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem;">
                #${patient.queue_serial || '—'}
            </div>
            <div>
                <div style="font-weight: 600; font-size: 0.9rem; color: var(--text-main);">${patient.patient_name || 'Patient'}</div>
            </div>
        </div>
        <div style="display: flex; align-items: center; gap: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fa-solid ${statusIcon}" style="color: ${statusColor}; font-size: 0.8rem;${isActive ? ' animation: pulse-dot 1.5s infinite;' : ''}"></i>
                <span style="font-size: 0.8rem; font-weight: 600; color: ${statusColor};">${statusText}</span>
            </div>
            <button onclick="openWorkspace(${patient.booking_id})" class="btn btn-outline" style="padding: 0.4rem 0.75rem; font-size: 0.75rem; border-radius: 6px; border-color: var(--primary); color: var(--primary);">
                <i class="fa-solid fa-briefcase-medical"></i> Workspace
            </button>
        </div>
    </div>`;
}

/* =========================================================
   RENDER: Empty State
   ========================================================= */
function renderEmptyState() {
    return `
    <div style="padding: 3.5rem; text-align: center; color: var(--text-muted);">
        <i class="fa-solid fa-video-slash" style="font-size: 3rem; margin-bottom: 1rem; display: block; opacity: 0.25;"></i>
        <h3 style="margin-bottom: 0.5rem; color: var(--text-main);">No Active Consultations</h3>
        <p style="margin: 0; font-size: 0.9rem;">Confirmed appointments will appear here when patients have paid.</p>
    </div>`;
}

/* =========================================================
   ACTION: Start Consultation Session
   ========================================================= */
async function startSession(doctorId, slotId) {
    try {
        const response = await fetch(`${DOC_BASE}/api/start_session.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ doctor_id: doctorId, slot_id: slotId })
        });
        const result = await response.json();

        if (result.success) {
            if (typeof showToast === 'function') showToast('Session started successfully!', 'success');
            if (result.data && result.data.meeting_link) {
                window.open(result.data.meeting_link, '_blank');
            }
            loadDoctorConsultationView();
        } else {
            if (typeof showToast === 'function') showToast(result.message || 'Failed to start session.', 'error');
            else alert(result.message || 'Failed to start session.');
        }
    } catch (error) {
        console.error('Error starting session:', error);
        if (typeof showToast === 'function') showToast('Network error. Please try again.', 'error');
    }
}

/* =========================================================
   ACTION: Next Patient
   ========================================================= */
async function callNextPatient(sessionId, doctorId) {
    if (!sessionId) {
        if (typeof showToast === 'function') showToast('No active session to advance.', 'warning');
        return;
    }
    try {
        const response = await fetch(`${DOC_BASE}/api/next_patient.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId, doctor_id: doctorId })
        });
        const result = await response.json();

        if (result.success) {
            if (result.data && result.data.ongoing_appointment_id) {
                if (typeof showToast === 'function') showToast('Next patient called in.', 'success');
            } else {
                if (typeof showToast === 'function') showToast('All patients completed for this slot.', 'info');
            }
            loadDoctorConsultationView();
        } else {
            if (typeof showToast === 'function') showToast(result.message || 'Failed to advance queue.', 'error');
        }
    } catch (error) {
        console.error('Error calling next patient:', error);
        if (typeof showToast === 'function') showToast('Network error.', 'error');
    }
}

/* =========================================================
   ACTION: End Session
   ========================================================= */
async function endSession(sessionId, doctorId) {
    if (!confirm('Are you sure you want to end this consultation session?')) return;

    try {
        const response = await fetch(`${DOC_BASE}/api/end_session.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId, doctor_id: doctorId })
        });
        const result = await response.json();

        if (result.success) {
            if (typeof showToast === 'function') showToast('Session ended successfully.', 'info');
            loadDoctorConsultationView();
        } else {
            if (typeof showToast === 'function') showToast(result.message || 'Failed to end session.', 'error');
        }
    } catch (error) {
        console.error('Error ending session:', error);
        if (typeof showToast === 'function') showToast('Network error.', 'error');
    }
}

/* =========================================================
   UTILITY: Format date string
   ========================================================= */
function formatSlotDate(dateStr) {
    if (!dateStr) return '';
    try {
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
        return dateStr;
    }
}

function formatDate(str) {
    if (!str) return '—';
    try {
        return new Date(str).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
        return str || '—';
    }
}

/* =========================================================
   WORKSPACE LOGIC
   ========================================================= */

let currentWsBookingId = null;
let currentConsultationId = null;
let currentPatientId = null;
let currentPrescriptionId = null;

function openWorkspace(bookingId, mode = 'active') {
    // Find patient data from global registry
    let patient = window.patientCache[bookingId];
    
    if (!patient) {
        // If not in cache (e.g. from history), we need to fetch basic info
        console.warn("Patient not in cache, fetching for booking:", bookingId);
        fetch(`${DOC_BASE}/api/get_consultation_details.php?booking_id=${bookingId}`)
            .then(res => res.json())
            .then(result => {
                if (result.success && result.data) {
                    // Try to reconstruct basic patient info from the record
                    const d = result.data;
                    // We might need a proper get_patient_info API here, 
                    // but for now let's try to reload the workspace with data we have
                    // Or better, handle the 'patient not found' case by showing the workspace with just the data we have
                    loadWorkspaceWithData(bookingId, result.data, mode);
                } else {
                    showToast("Could not retrieve patient info for this record.", "error");
                }
            });
        return;
    }

    loadWorkspaceWithData(bookingId, patient, mode);
}

function loadWorkspaceWithData(bookingId, patient, mode) {
    try {
        const { patient_name, date, patient_id, queue_serial, age, gender, blood_group } = patient;
        
        currentWsBookingId = bookingId;
        currentPatientId = patient_id;
        currentConsultationId = null; // Reset
        
        const isReadOnly = mode === 'readonly';
        window.isWsReadOnly = isReadOnly;

        // Header & Identity
        const titleText = isReadOnly ? `Medical Record: ${patient_name}` : `Consultation: ${patient_name}`;
        if (document.getElementById('wsPatientName')) document.getElementById('wsPatientName').innerText = titleText;
        if (document.getElementById('wsPatientNameSheet')) document.getElementById('wsPatientNameSheet').innerText = patient_name;
        
        // UI Controls based on mode
        if (document.getElementById('wsEndSessionBtn')) document.getElementById('wsEndSessionBtn').style.display = isReadOnly ? 'none' : 'block';
        if (document.getElementById('wsMinimizeBtnText')) document.getElementById('wsMinimizeBtnText').innerText = isReadOnly ? 'Close' : 'minimize';
        if (document.getElementById('wsSaveNotesBtn')) document.getElementById('wsSaveNotesBtn').style.display = isReadOnly ? 'none' : 'block';
        
        // Disable/Enable inputs
        const inputs = ['wsSymptoms', 'wsDiagnosis', 'wsAdvice', 'wsWeight', 'wsBP', 'wsTemp', 'wsOxygen'];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.readOnly = isReadOnly;
        });

        // Populating ReadOnly Patient Data
        if (document.getElementById('wsAge')) document.getElementById('wsAge').innerText = age ? `${age} Years` : 'N/A';
        if (document.getElementById('wsGender')) document.getElementById('wsGender').innerText = gender || 'N/A';
        if (document.getElementById('wsBloodGroup')) document.getElementById('wsBloodGroup').innerText = blood_group || 'N/A';
        
        // Prescription Sheet ReadOnly
        if (document.getElementById('wsAgeGenderSheet')) document.getElementById('wsAgeGenderSheet').innerText = `${age || 'N/A'} / ${gender || 'N/A'}`;
        if (document.getElementById('wsBloodGroupSheet')) document.getElementById('wsBloodGroupSheet').innerText = blood_group || 'N/A';
        
        const formattedDate = formatDate(date);
        if (document.getElementById('wsDate')) document.getElementById('wsDate').innerText = formattedDate;
        if (document.getElementById('wsDateSheet')) document.getElementById('wsDateSheet').innerText = formattedDate;
        
        // Header info bar
        const headerInfo = document.getElementById('wsConsultationHeaderInfo');
        if (headerInfo) {
            headerInfo.innerHTML = `
                <span><i class="fa-solid fa-hashtag"></i> ID: ${bookingId}</span>
                <span><i class="fa-solid fa-calendar-day"></i> ${formattedDate}</span>
                <span><i class="fa-solid fa-clock"></i> Scheduled (Queue #${queue_serial || '—'})</span>
            `;
        }

        // Populate Doctor Info on Sheet
        const welcomeEl = document.getElementById('welcomeMsg');
        const welcomeMsg = welcomeEl ? welcomeEl.innerText : 'Dr. AuraMed User';
        const docNameSheet = document.getElementById('wsDoctorNameSheet');
        if (docNameSheet) {
            docNameSheet.innerText = welcomeMsg.replace('Welcome, ', '');
        }
        
        const modal = document.getElementById('consultationWorkspaceModal');
        if (modal) modal.style.display = 'flex';
        
        // Reset forms & Vitals
        if (document.getElementById('wsSymptoms')) document.getElementById('wsSymptoms').value = '';
        if (document.getElementById('wsDiagnosis')) document.getElementById('wsDiagnosis').value = '';
        if (document.getElementById('wsAdvice')) document.getElementById('wsAdvice').value = '';
        if (document.getElementById('wsWeight')) document.getElementById('wsWeight').value = '';
        if (document.getElementById('wsBP')) document.getElementById('wsBP').value = '';
        if (document.getElementById('wsTemp')) document.getElementById('wsTemp').value = '';
        if (document.getElementById('wsOxygen')) document.getElementById('wsOxygen').value = '';
        if (document.getElementById('wsVitalsSheet')) document.getElementById('wsVitalsSheet').innerText = '—';
        
        // Default Tab
        switchWsTabNew('notes');
        
        // Load dynamic data
        loadPatientReports(bookingId);
        loadPatientHistory(patient_id, bookingId);

        // Fetch existing consultation data if available
        fetchConsultationData(bookingId, isReadOnly);

        if (!isReadOnly) {
            ['wsWeight', 'wsBP', 'wsTemp', 'wsOxygen'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.removeEventListener('input', updateVitalsSheet); 
                    el.addEventListener('input', updateVitalsSheet);
                }
            });
        }
        
        // Initial sync
        updateVitalsSheet();

        // Start auto-polling for reports every 12 seconds
        if (wsReportsPollInterval) clearInterval(wsReportsPollInterval);
        wsReportsPollInterval = setInterval(() => loadPatientReports(bookingId), 12000);

    } catch (error) {
        console.error("CRITICAL ERROR in loadWorkspaceWithData:", error);
        showToast("Error opening workspace. Check console for details.", "error");
    }
}

/**
 * Syncs vitals from input fields to the prescription sheet preview
 */
function updateVitalsSheet() {
    const w = document.getElementById('wsWeight').value.trim() || '—';
    const b = document.getElementById('wsBP').value.trim() || '—';
    const t = document.getElementById('wsTemp').value.trim() || '—';
    const o = document.getElementById('wsOxygen').value.trim() || '—';
    
    const display = document.getElementById('wsVitalsSheet');
    if (display) {
        display.innerText = `${w}kg / ${b} / ${t}°F / ${o}%`;
    }
}

function closeWorkspace() {
    document.getElementById('consultationWorkspaceModal').style.display = 'none';
    // Stop report polling when workspace closes
    if (wsReportsPollInterval) {
        clearInterval(wsReportsPollInterval);
        wsReportsPollInterval = null;
    }
}

function switchWsTabNew(tabName) {
    const isNotes = tabName === 'notes';
    
    // Update buttons
    const btnNotes = document.getElementById('tabNotes');
    const btnRx = document.getElementById('tabPrescription');
    
    if (btnNotes) btnNotes.classList.toggle('active', isNotes);
    if (btnRx) btnRx.classList.toggle('active', !isNotes);
    
    // Toggle Tab Content
    const notesCont = document.getElementById('wsNotesContainer');
    const rxCont = document.getElementById('wsPrescriptionContainer');
    
    if (notesCont) notesCont.style.display = isNotes ? 'block' : 'none';
    if (rxCont) rxCont.style.display = isNotes ? 'none' : 'block';
    
    if (!isNotes) {
        // Render Prescription Form (if not already rendered or if mode changes)
        const placeholder = document.getElementById('wsPrescriptionFormPlaceholder');
        if (placeholder) {
            placeholder.innerHTML = renderPrescriptionForm(window.isWsReadOnly);
        }
        // If we have medicines data (from fetchConsultationData), render them
        if (window.currentWsMedicines && window.isWsReadOnly) {
            renderReadOnlyMedicines(window.currentWsMedicines);
        }
    }
}

async function fetchConsultationData(bookingId, isReadOnly) {
    try {
        const response = await fetch(`${DOC_BASE}/api/get_consultation_details.php?booking_id=${bookingId}`);
        const result = await response.json();
        
        if (result.success && result.data) {
            const d = result.data;
            
            // Populate Clinical Notes
            document.getElementById('wsSymptoms').value = d.symptoms || '';
            document.getElementById('wsDiagnosis').value = d.diagnosis || '';
            document.getElementById('wsAdvice').value = d.advice || '';
            
            // Populate Vitals
            document.getElementById('wsWeight').value = d.weight || '';
            document.getElementById('wsBP').value = d.blood_pressure || '';
            document.getElementById('wsTemp').value = d.temperature || '';
            document.getElementById('wsOxygen').value = d.oxygen_level || '';
            
            // Sync to Prescription Sheet
            const w = d.weight || '—';
            const b = d.blood_pressure || '—';
            const t = d.temperature || '—';
            const o = d.oxygen_level || '—';
            document.getElementById('wsVitalsSheet').innerText = `${w}kg / ${b} / ${t}°F / ${o}%`;
            
            // Store medicines for the RX tab
            window.currentWsMedicines = d.medicines || [];
            currentConsultationId = d.id;
            
        } else if (isReadOnly) {
            // If readonly and no data, show a message
            showToast("No consultation record found for this booking.", "warning");
        }
    } catch (e) {
        console.error("Error fetching consultation data:", e);
    }
}

function renderReadOnlyMedicines(medicines) {
    const container = document.getElementById('medicineRowsContainer');
    if (!container) return;
    
    if (medicines.length === 0) {
        container.innerHTML = '<tr><td colspan="6" class="text-muted" style="text-align:center; padding: 2rem;">No medications prescribed.</td></tr>';
        return;
    }
    
    container.innerHTML = medicines.map(m => `
        <tr class="med-row">
            <td><div style="font-weight: 700;">${m.medicine_name}</div></td>
            <td>${m.dosage}</td>
            <td>${m.frequency}</td>
            <td>${m.duration}</td>
            <td>${m.instructions || '—'}</td>
            <td></td>
        </tr>
    `).join('');
}

async function loadPatientReports(bookingId) {
    const list = document.getElementById('wsReportsList');
    if (!list) return;

    list.innerHTML = '<p class="text-muted" style="font-size:0.85rem;"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading reports...</p>';
    
    try {
        const response = await fetch(`${DOC_BASE}/api/get_reports.php?booking_id=${bookingId}`);
        const result = await response.json();
        
        if (result.success && result.data && result.data.reports && result.data.reports.length > 0) {
            let html = '';
            result.data.reports.forEach(rpt => {
                const isImg = rpt.file_path.match(/\.(jpg|jpeg|png)$/i);
                html += `
                <div class="glass" style="padding: 1rem; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                        <div style="display: flex; align-items: center; gap: 0.6rem;">
                            <i class="fa-solid ${isImg ? 'fa-file-image' : 'fa-file-pdf'}" style="color: ${isImg ? '#3b82f6' : '#ef4444'}; font-size: 1rem;"></i>
                            <div style="font-weight: 600; font-size: 0.85rem; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">${rpt.original_name}</div>
                        </div>
                        <a href="${DOC_BASE}/${rpt.file_path}" target="_blank" class="btn btn-outline" style="padding: 0.25rem 0.6rem; font-size: 0.75rem; border-radius: 6px;">
                            <i class="fa-solid fa-eye"></i> View
                        </a>
                    </div>
                    ${isImg ? `<img src="${DOC_BASE}/${rpt.file_path}" style="width: 100%; border-radius: 8px; border: 1px solid var(--glass-border); cursor: pointer;" onclick="window.open(this.src, '_blank')">` : 
                    `<div style="padding: 0.75rem; text-align: center; background: rgba(0,0,0,0.2); border-radius: 8px; font-size: 0.8rem; color: var(--text-muted);">PDF Document</div>`}
                </div>`;
            });
            list.innerHTML = html;
        } else {
            list.innerHTML = `
            <div style="text-align: center; padding: 1.5rem; opacity: 0.5; background: rgba(255,255,255,0.02); border-radius: 12px;">
                <i class="fa-solid fa-folder-open" style="font-size: 1.5rem; margin-bottom: 0.5rem; display: block;"></i>
                <p style="margin: 0; font-size: 0.8rem;">No reports uploaded yet.</p>
            </div>`;
        }
    } catch (e) {
        console.error("Error loading reports:", e);
        list.innerHTML = '<p class="text-muted" style="font-size:0.8rem;">Error loading reports.</p>';
    }
}

/**
 * Loads previous consultation history for the patient
 */
async function loadPatientHistory(patientId, currentBookingId) {
    const list = document.getElementById('wsHistoryList');
    if (!list) return;

    list.innerHTML = '<p class="text-muted" style="font-size:0.85rem;"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading history...</p>';

    try {
        const url = `${DOC_BASE}/api/get_medical_history.php?patient_id=${patientId}&exclude_booking_id=${currentBookingId}`;
        const response = await fetch(url);
        const result = await response.json();

        if (result.success && result.data && result.data.length > 0) {
            let html = '';
            result.data.forEach(record => {
                const displayDate = record.date ? formatDate(record.date) : (record.created_at ? formatDate(record.created_at) : 'N/A');
                
                // Build reports HTML if available
                let reportsHtml = '';
                if (record.reports && record.reports.length > 0) {
                    reportsHtml = `
                    <div style="margin-top: 0.5rem; display: flex; flex-wrap: wrap; gap: 0.4rem;">
                        ${record.reports.map(r => `
                            <a href="${DOC_BASE}/${r.file_path}" target="_blank" title="${r.original_name}" style="font-size: 0.75rem; background: rgba(255,255,255,0.05); padding: 0.2rem 0.5rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); color: var(--text-main); display: flex; align-items: center; gap: 0.3rem;">
                                <i class="fa-solid ${r.file_path.toLowerCase().endsWith('.pdf') ? 'fa-file-pdf' : 'fa-file-image'}" style="color: ${r.file_path.toLowerCase().endsWith('.pdf') ? '#ef4444' : '#3b82f6'}; font-size: 0.8rem;"></i>
                                <span style="max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${r.original_name}</span>
                            </a>
                        `).join('')}
                    </div>`;
                }

                html += `
                <div class="glass" style="padding: 1.25rem; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); margin-bottom: 0.75rem;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                        <div style="font-weight: 700; font-size: 0.9rem; color: var(--primary);">${displayDate}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">Dr. ${record.doctor_name}</div>
                    </div>
                    
                    <div style="margin-bottom: 0.75rem;">
                        <div style="font-size: 0.85rem; color: var(--text-main); font-weight: 700; margin-bottom: 0.1rem;">${record.diagnosis || 'No diagnosis recorded'}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.4;">${record.advice || 'No advice recorded'}</div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; padding: 0.6rem; background: rgba(0,0,0,0.2); border-radius: 8px; font-size: 0.75rem; margin-bottom: 0.75rem;">
                        <div><span style="color: var(--text-muted);">WT:</span> ${record.weight || '—'}kg</div>
                        <div><span style="color: var(--text-muted);">BP:</span> ${record.blood_pressure || '—'}</div>
                        <div><span style="color: var(--text-muted);">T:</span> ${record.temperature || '—'}°F</div>
                        <div><span style="color: var(--text-muted);">O2:</span> ${record.oxygen_level || '—'}%</div>
                    </div>

                    ${reportsHtml}

                    <div style="margin-top: 1rem; display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">
                        ${record.prescription_id ? `
                        <a href="${DOC_BASE}/api/generate_prescription_pdf.php?prescription_id=${record.prescription_id}" target="_blank" class="btn btn-outline" style="padding: 0.35rem 0.75rem; font-size: 0.75rem; border-radius: 6px; border-color: var(--secondary); color: var(--secondary);">
                            <i class="fa-solid fa-file-prescription"></i> Rx PDF
                        </a>` : '<span></span>'}
                        
                        <button onclick="openWorkspace(${record.booking_id}, 'readonly')" class="btn btn-outline" style="padding: 0.35rem 0.75rem; font-size: 0.75rem; border-radius: 6px; border-color: var(--primary); color: var(--primary);">
                            <i class="fa-solid fa-eye"></i> Full View
                        </button>
                    </div>
                </div>`;
            });
            list.innerHTML = html;
        } else {
            list.innerHTML = `
            <div class="glass" style="padding: 1rem; border-radius: 12px; background: rgba(255,255,255,0.02); opacity: 0.6;">
                <p style="margin: 0; font-size: 0.85rem; text-align: center;">No previous consultations found.</p>
            </div>`;
        }
    } catch (e) {
        console.error("Error loading patient history:", e);
        list.innerHTML = '<p class="text-muted" style="font-size:0.8rem;">Error loading history.</p>';
    }
}

async function saveConsultationNotes() {
    const symptoms = document.getElementById('wsSymptoms').value.trim();
    const diagnosis = document.getElementById('wsDiagnosis').value.trim();
    const advice = document.getElementById('wsAdvice').value.trim();
    
    if (!diagnosis) {
        showToast("Please enter a diagnosis at least.", "error");
        return;
    }
    
    const weight = document.getElementById('wsWeight').value.trim();
    const bp = document.getElementById('wsBP').value.trim();
    const temp = document.getElementById('wsTemp').value.trim();
    const oxygen = document.getElementById('wsOxygen').value.trim();

    // Update Prescription Sheet Live
    document.getElementById('wsVitalsSheet').innerText = `${weight || '—'}kg / ${bp || '—'} / ${temp || '—'}°F / ${oxygen || '—'}%`;

    const btn = document.querySelector('button[onclick="saveConsultationNotes()"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...';
    
    try {
        const response = await fetch(`${DOC_BASE}/api/save_consultation_notes.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                booking_id: currentWsBookingId,
                doctor_id: localStorage.getItem('userId'),
                symptoms,
                diagnosis,
                advice,
                weight,
                blood_pressure: bp,
                temperature: temp,
                oxygen_level: oxygen
            })
        });
        
        const result = await response.json();
        if (result.success) {
            showToast("Consultation notes saved successfully!", "success");
            currentConsultationId = result.record_id;
            
            // Highlight Prescription tab to nudge doctor
            const tabRx = document.getElementById('tabPrescription');
            if (tabRx) {
                tabRx.style.animation = 'pulse-dot 1s infinite';
                setTimeout(() => tabRx.style.animation = '', 3000);
            }

            // Enable prescription tab and switch
            document.getElementById('wsPrescriptionFormPlaceholder').innerHTML = renderPrescriptionForm();
            switchWsTabNew('prescription');
        } else {
            showToast(result.message || "Failed to save notes.", "error");
        }
    } catch (e) {
        showToast("Network error while saving notes.", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

function renderPrescriptionForm(isReadOnly = false) {
    return `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin: 0; font-size: 1rem; font-weight: 700; color: #1e293b;">Medication Details</h3>
            ${!isReadOnly ? `
            <button class="btn btn-outline" onclick="addMedicineRow()" style="padding: 0.5rem 1rem; font-size: 0.85rem; border-color: #3b82f6; color: #3b82f6;">
                <i class="fa-solid fa-plus"></i> Add Medicine
            </button>` : ''}
        </div>
        
        <table class="med-table">
            <thead>
                <tr>
                    <th style="width: 30%;">Medicine Name</th>
                    <th>Dosage</th>
                    <th>Frequency</th>
                    <th>Duration</th>
                    <th>Instructions</th>
                    <th style="width: 50px;"></th>
                </tr>
            </thead>
            <tbody id="medicineRowsContainer">
                ${!isReadOnly ? addMedicineRow(true) : '<tr id="noMedData"><td colspan="6" class="text-muted" style="text-align:center; padding: 2rem;">Loading medications...</td></tr>'} 
            </tbody>
        </table>

        ${!isReadOnly ? `
        <div style="margin-top: 2rem; display: flex; gap: 1rem; justify-content: center; padding: 2rem; border-top: 1px dashed #e2e8f0;">
            <button id="wsFinalizeBtn" class="btn btn-primary" onclick="savePrescription()" style="padding: 1rem 3rem; border-radius: 12px; background: #10b981; border-color: #10b981; font-weight: 800; font-size: 1.1rem; box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3);">
                <i class="fa-solid fa-file-signature" style="margin-right: 0.5rem;"></i> Finalize & Generate Prescription
            </button>
        </div>` : ''}
    </div>`;
}

function addMedicineRow(returnHtml = false) {
    const rowHtml = `
    <tr class="med-row medicine-row">
        <td>
            <input type="text" class="med-input med-name" placeholder="e.g. Napa Extra 500mg">
        </td>
        <td>
            <input type="text" class="med-input med-dosage" placeholder="1 Tab">
        </td>
        <td>
            <input type="text" class="med-input med-frequency" placeholder="1+0+1">
        </td>
        <td>
            <input type="text" class="med-input med-duration" placeholder="5 days">
        </td>
        <td>
            <input type="text" class="med-input med-instructions" placeholder="After meal">
        </td>
        <td>
            <button class="med-remove-btn" onclick="this.closest('tr').remove()">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        </td>
    </tr>`;
    
    if (returnHtml) return rowHtml;
    
    const container = document.getElementById('medicineRowsContainer');
    const tr = document.createElement('tr');
    tr.className = 'med-row medicine-row';
    tr.innerHTML = rowHtml; // Note: rowHtml has the <tr> tags inside, so we need to adjust
    
    // Better way:
    const tempTable = document.createElement('table');
    tempTable.innerHTML = rowHtml;
    container.appendChild(tempTable.querySelector('tr'));
}

async function savePrescription() {
    if (!currentConsultationId) {
        showToast("Please save consultation notes first.", "warning");
        switchWsTabNew('notes');
        return;
    }

    const medicines = [];
    document.querySelectorAll('.medicine-row').forEach(row => {
        const name = row.querySelector('.med-name').value.trim();
        if (name) {
            medicines.push({
                name,
                dosage: row.querySelector('.med-dosage').value.trim(),
                frequency: row.querySelector('.med-frequency').value.trim(),
                duration: row.querySelector('.med-duration').value.trim(),
                instructions: row.querySelector('.med-instructions').value.trim()
            });
        }
    });

    if (medicines.length === 0) {
        showToast("Please add at least one medicine.", "error");
        return;
    }

    const btn = document.querySelector('button[onclick="savePrescription()"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Generating...';

    try {
        const response = await fetch(`${DOC_BASE}/api/create_prescription.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                consultation_id: currentConsultationId,
                booking_id: currentWsBookingId,
                doctor_id: localStorage.getItem('userId'),
                medicines
            })
        });

        const result = await response.json();
        if (result.success) {
            showToast("Prescription generated successfully!", "success");
            currentPrescriptionId = result.prescription_id;
            // Open PDF in new tab
            window.open(`${DOC_BASE}/api/generate_prescription_pdf.php?prescription_id=${result.prescription_id}`, '_blank');
        } else {
            showToast(result.message || "Failed to create prescription.", "error");
        }
    } catch (e) {
        showToast("Network error while creating prescription.", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-file-signature"></i> Finalize & Generate Prescription';
    }
}

function printPrescription() {
    if (!currentPrescriptionId) {
        showToast("Please generate a prescription first.", "warning");
        return;
    }
    window.open(`${DOC_BASE}/api/generate_prescription_pdf.php?prescription_id=${currentPrescriptionId}`, '_blank');
}


function confirmEndSession() {
    if (confirm("Are you sure you want to end this consultation? Make sure you have saved your notes and generated the prescription.")) {
        // Need session_id to end session via API
        // For now, close workspace and use the main End Session button
        closeWorkspace();
        showToast("Please use the 'End Session' button on the Control Panel to finalize.", "info");
    }
}

function showToast(message, type = "success") {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'glass toast-animation';
    toast.style.cssText = `
        padding: 1rem 1.5rem;
        border-radius: 10px;
        background: ${type === 'success' ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)'};
        color: white;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        pointer-events: auto;
    `;

    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/* =========================================================
   INJECT: Pulse animation CSS
   ========================================================= */
(function injectDoctorStyles() {
    if (document.getElementById('doctor-consultation-styles')) return;
    const style = document.createElement('style');
    style.id = 'doctor-consultation-styles';
    style.textContent = `
        @keyframes pulse-dot {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.3); }
        }
    `;
    document.head.appendChild(style);
})();

/* =========================================================
   RETAIN: Doctor Application Form (from signup page)
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
    const doctorApplyForm = document.getElementById('doctorApplyForm');
    if (doctorApplyForm) {
        doctorApplyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userId = localStorage.getItem('userId');
            const userRole = localStorage.getItem('userRole');

            if (!userId) {
                showToast("User session not found. Please log in first.", 'error');
                return;
            }

            if (userRole !== 'doctor') {
                showToast("Only users with a Doctor account can apply for verification.", 'error');
                return;
            }

            const formData = new FormData(doctorApplyForm);
            formData.append('user_id', userId);

            const submitBtn = doctorApplyForm.querySelector('.btn-submit');
            const originalText = submitBtn.innerText;
            submitBtn.innerText = "Submitting...";
            submitBtn.disabled = true;

            try {
                const response = await fetch(`${DOC_BASE}/api/doctor/apply`, {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();

                if (data.status === 'success') {
                    showToast("Application submitted! Await admin approval.", 'success');
                    doctorApplyForm.reset();
                } else {
                    showToast("Error: " + data.message, 'error');
                }
            } catch (err) {
                showToast("Network error. Please try again.", 'error');
            } finally {
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});

/* =========================================================
   PHASE 5: Patients Directory (Search, Filter, Export)
   ========================================================= */
let allPatientsData = [];

async function loadMyPatientsDirectory() {
    const doctorId = localStorage.getItem('userId');
    const container = document.getElementById('patientsListContainer');
    if (!container || !doctorId) return;

    container.innerHTML = '<p class="text-muted"><i class="fa-solid fa-circle-notch fa-spin"></i> Initializing directory...</p>';

    try {
        const response = await fetch(`${DOC_BASE}/api/doctor/patients?doctor_id=${doctorId}`);
        const result = await response.json();
        
        if (result.status === 'success') {
            allPatientsData = result.data;
            renderPatientsDirectory(allPatientsData);
        } else {
            container.innerHTML = '<p class="text-muted">No patient data available.</p>';
        }
    } catch (e) {
        container.innerHTML = '<p class="text-muted">Error loading directory.</p>';
    }
}

function renderPatientsDirectory(patients) {
    const container = document.getElementById('patientsListContainer');
    if (patients.length === 0) {
        container.innerHTML = '<p class="text-muted" style="grid-column: 1/-1; text-align: center; padding: 3rem;">No patients matching your criteria.</p>';
        return;
    }

    container.innerHTML = patients.map(p => {
        // Register the most recent appointment in the cache for the workspace
        if (p.appointments && p.appointments[0]) {
            const latestApp = p.appointments[0];
            window.patientCache[latestApp.appointment_id] = {
                booking_id: latestApp.appointment_id,
                patient_name: p.name,
                patient_id: p.patient_id,
                date: latestApp.date,
                age: p.age,
                gender: p.gender,
                blood_group: p.blood_group,
                queue_serial: null
            };
        }

        const latestBookingId = p.appointments[0]?.appointment_id || 0;

        return `
        <div class="glass patient-card" style="padding: 1.5rem; border-radius: 16px; background: rgba(255,255,255,0.02);">
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem;">
                <div style="width: 50px; height: 50px; border-radius: 12px; background: var(--primary); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700;">
                    ${p.name.charAt(0)}
                </div>
                <div>
                    <h3 style="margin: 0; font-size: 1.1rem;">${p.name}</h3>
                    <p style="margin: 0; font-size: 0.8rem; color: var(--text-muted);">${p.email}</p>
                </div>
            </div>
            <div style="font-size: 0.85rem; color: var(--text-main); margin-bottom: 1.25rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span style="color: var(--text-muted);">Total Visits:</span>
                    <span style="font-weight: 600;">${p.appointments.length}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: var(--text-muted);">Last Visit:</span>
                    <span style="font-weight: 600;">${p.appointments[0] ? new Date(p.appointments[0].date).toLocaleDateString() : 'N/A'}</span>
                </div>
            </div>
            <button onclick="openWorkspace(${latestBookingId}, 'readonly')" class="btn btn-outline" style="width: 100%; border-radius: 10px; font-size: 0.85rem;">
                <i class="fa-solid fa-folder-open" style="margin-right: 0.5rem;"></i> Patient Records
            </button>
        </div>`;
    }).join('');
}

function filterPatients() {
    const query = document.getElementById('patientSearchInput').value.toLowerCase();
    const filtered = allPatientsData.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.email.toLowerCase().includes(query)
    );
    renderPatientsDirectory(filtered);
}

/* -------------------------------------------------------
   REPORT EXPORT LOGIC
------------------------------------------------------- */

function openExportModal() {
    document.getElementById('exportReportModal').style.display = 'flex';
}

function closeExportModal() {
    document.getElementById('exportReportModal').style.display = 'none';
}

function toggleCustomDateRange() {
    const period = document.getElementById('reportPeriodSelect').value;
    const customFields = document.getElementById('customDateRangeFields');
    customFields.style.display = (period === 'custom') ? 'grid' : 'none';
}

function generatePatientReport() {
    const doctorId = localStorage.getItem('userId');
    const period = document.getElementById('reportPeriodSelect').value;
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;

    if (period === 'custom' && (!startDate || !endDate)) {
        showToast("Please select both start and end dates.", "error");
        return;
    }

    let url = `/api/export_patient_report_pdf.php?doctor_id=${doctorId}&period=${period}&t=${Date.now()}`;
    if (period === 'custom') {
        url += `&start_date=${startDate}&end_date=${endDate}`;
    }

    console.log("Generating report URL:", url);

    // Open report in new tab for viewing/printing
    window.open(url, '_blank');
    closeExportModal();
}
