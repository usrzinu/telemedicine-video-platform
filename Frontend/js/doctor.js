/**
 * DOCTOR MODULE JS — Production Video Consultation Controller
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

document.addEventListener('DOMContentLoaded', () => {
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'doctor') {
        loadDoctorConsultationView();
        docSessionPollInterval = setInterval(loadDoctorConsultationView, 10000);
    }
});

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
                #${patient.queue_serial}
            </div>
            <div>
                <div style="font-weight: 600; font-size: 0.9rem; color: var(--text-main);">${patient.patient_name || 'Patient'}</div>
            </div>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="fa-solid ${statusIcon}" style="color: ${statusColor}; font-size: 0.8rem;${isActive ? ' animation: pulse-dot 1.5s infinite;' : ''}"></i>
            <span style="font-size: 0.8rem; font-weight: 600; color: ${statusColor};">${statusText}</span>
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
