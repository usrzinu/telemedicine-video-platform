/**
 * PATIENT SIDE LOGIC - VIDEO CONSULTATION INTEGRATION
 * Manages queue-based access for video consultation.
 */

const BASE_URL = window.location.origin;
let consultationInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'patient') {
        loadConsultationSection();
        loadMedicalHistory(); // Initial load
        loadUserProfileData(); // Load profile data
        // Auto update UI every 10 seconds
        consultationInterval = setInterval(loadConsultationSection, 10000);
    }

    // Tab Navigation Logic
    const navItems = document.querySelectorAll('.nav-item');
    const views = ['viewFindDoctors', 'viewAppointments', 'viewConsultations', 'viewHistory', 'viewSupport', 'viewProfile'];
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Update active state
            navItems.forEach(ni => ni.classList.remove('active'));
            item.classList.add('active');
            
            // Hide all views
            views.forEach(v => {
                const el = document.getElementById(v);
                if (el) el.style.display = 'none';
            });
            
            // Show target view
            const viewId = 'view' + item.id.replace('nav', '');
            const target = document.getElementById(viewId);
            if (target) target.style.display = 'block';
        });
    });
});

async function loadConsultationSection() {
    const patientId = localStorage.getItem('userId');
    const container = document.getElementById('activeConsultationsList');
    
    if (!patientId || !container) return;

    try {
        // Fetch all bookings for patient
        const response = await fetch(`${BASE_URL}/api/appointment/patient?patient_id=${patientId}`);
        const result = await response.json();
        
        if (result.status === 'success' && result.data && result.data.length > 0) {
            // Only show confirmed/paid appointments
            const activeApps = result.data.filter(app => 
                (app.appointment_status === 'confirmed' || app.appointment_status === 'paid')
            );

            if (activeApps.length === 0) {
                container.innerHTML = '';
                return;
            }

            let htmlContent = '<h2 style="margin-bottom: 1.5rem;"><i class="fa-solid fa-video" style="color: var(--primary); margin-right: 0.5rem;"></i> Active Consultations</h2>';
            htmlContent += '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem;">';

            for (const app of activeApps) {
                try {
                    // Fetch real-time status for each booking
                    const statusRes = await fetch(`${BASE_URL}/api/can_join.php?booking_id=${app.appointment_id}`);
                    const statusData = await statusRes.json();
                    
                    let actionHtml = '';
                    let statusLabel = '';
                    let cardBorder = 'var(--glass-border)';
                    
                    // Logic based on API response
                    if (statusData.success && statusData.data) {
                        const apiMessage = statusData.data.message.toLowerCase();
                        
                        if (statusData.data.can_join || apiMessage.includes("join now")) {
                            // ONGOING status -> Join Now
                            statusLabel = '<span style="color: #10b981; font-weight: 700;"><i class="fa-solid fa-satellite-dish fa-fade"></i> Ongoing</span>';
                            cardBorder = '#10b981';
                            actionHtml = `<div style="display: flex; gap: 0.5rem; flex-direction: column;">
                                <button onclick="joinMeeting(${app.appointment_id})" class="btn btn-primary" style="width: 100%; background: #10b981; padding: 0.75rem; font-weight: bold; border-radius: 8px;">
                                    <i class="fa-solid fa-video"></i> Join Now
                                </button>
                                <button onclick="openUploadModal(${app.appointment_id})" class="btn btn-outline" style="width: 100%; padding: 0.75rem; border-radius: 8px; border-color: var(--primary); color: var(--primary); background: rgba(var(--primary-rgb), 0.05);">
                                    <i class="fa-solid fa-file-arrow-up"></i> Upload Reports
                                </button>
                            </div>`;
                        } else if (apiMessage.includes("next")) {
                            // NEXT status
                            statusLabel = '<span style="color: #3b82f6; font-weight: 600;"><i class="fa-solid fa-bell"></i> You\'re next. Please be ready</span>';
                            cardBorder = '#3b82f6';
                            actionHtml = `<div style="display: flex; gap: 0.5rem; flex-direction: column;">
                                <button disabled class="btn btn-outline" style="width: 100%; opacity: 0.8; cursor: not-allowed; padding: 0.75rem; border-radius: 8px;">
                                    Get Ready
                                </button>
                                <button onclick="openUploadModal(${app.appointment_id})" class="btn btn-outline" style="width: 100%; padding: 0.75rem; border-radius: 8px; border-color: var(--primary); color: var(--primary); background: rgba(var(--primary-rgb), 0.05);">
                                    <i class="fa-solid fa-file-arrow-up"></i> Upload Reports
                                </button>
                            </div>`;
                        } else if (apiMessage.includes("wait")) {
                            // WAITING status
                            statusLabel = '<span style="color: #f59e0b; font-weight: 600;"><i class="fa-solid fa-clock"></i> Waiting for your turn</span>';
                            actionHtml = `<div style="display: flex; gap: 0.5rem; flex-direction: column;">
                                <button disabled class="btn btn-outline" style="width: 100%; opacity: 0.6; cursor: not-allowed; padding: 0.75rem; border-radius: 8px;">
                                    Please Wait
                                </button>
                                <button onclick="openUploadModal(${app.appointment_id})" class="btn btn-outline" style="width: 100%; padding: 0.75rem; border-radius: 8px; border-color: var(--primary); color: var(--primary); background: rgba(var(--primary-rgb), 0.05);">
                                    <i class="fa-solid fa-file-arrow-up"></i> Upload Reports
                                </button>
                            </div>`;
                        } else if (apiMessage.includes("completed")) {
                            // COMPLETED status
                            statusLabel = '<span style="color: #10b981; font-weight: 600;"><i class="fa-solid fa-circle-check"></i> Consultation Completed</span>';
                            cardBorder = '#10b981';
                            actionHtml = `<button disabled class="btn btn-outline" style="width: 100%; opacity: 0.8; cursor: not-allowed; padding: 0.75rem; border-radius: 8px; color: #10b981; border-color: #10b98120; background: #10b98110;">
                                <i class="fa-solid fa-file-prescription" style="margin-right: 0.4rem;"></i> Completed
                            </button>`;
                        } else {
                            // Session not started
                            statusLabel = `<span style="color: var(--text-muted);"><i class="fa-solid fa-info-circle"></i> Session not started yet</span>`;
                            actionHtml = `<button disabled class="btn btn-outline" style="width: 100%; opacity: 0.5; cursor: not-allowed; padding: 0.75rem; border-radius: 8px;">
                                Unavailable
                            </button>`;
                        }
                    } else {
                        statusLabel = `<span style="color: #ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> Unable to fetch consultation status</span>`;
                    }

                    const doctorPhoto = app.profile_photo ? (app.profile_photo.startsWith('/') ? app.profile_photo : '/' + app.profile_photo) : 'https://ui-avatars.com/api/?name=Doctor&background=0ea5e9&color=fff';

                    // Consultation Card HTML
                    htmlContent += `
                    <div class="glass" style="padding: 1.5rem; border-radius: 12px; border: 1px solid ${cardBorder}; border-left: 4px solid ${cardBorder}; display: flex; flex-direction: column; gap: 1.25rem; transition: transform 0.2s;">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <img src="${doctorPhoto}" style="width: 55px; height: 55px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary);" onerror="this.src='https://ui-avatars.com/api/?name=Dr&background=0ea5e9&color=fff'">
                            <div>
                                <h3 style="margin: 0; font-size: 1.15rem; color: var(--text-main);">Dr. ${app.doctor_name}</h3>
                                <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem;">
                                    <i class="fa-regular fa-calendar" style="margin-right: 0.3rem; color: var(--primary);"></i><strong>${formatDate(app.date)}</strong>
                                    <span style="margin: 0 0.5rem;">•</span>
                                    <i class="fa-regular fa-clock" style="margin-right: 0.3rem; color: var(--primary);"></i>${app.start_time.substring(0, 5)} - ${app.end_time.substring(0, 5)}
                                </div>
                            </div>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding: 0.75rem; border-radius: 8px;">
                            <div style="font-size: 0.85rem; color: var(--text-muted);">Queue Serial:</div>
                            <div style="font-weight: 700; font-size: 1.1rem; color: var(--text-main);">#${app.queue_position !== null ? app.queue_position : '-'}</div>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="font-size: 0.85rem; color: var(--text-muted);">Status:</div>
                            <div style="font-size: 0.9rem;">${statusLabel}</div>
                        </div>

                        <div style="margin-top: auto;">
                            ${actionHtml}
                        </div>
                    </div>`;
                    
                } catch (e) {
                    console.error("Error checking can_join for booking:", app.appointment_id, e);
                }
            }
            htmlContent += '</div>';
            container.innerHTML = htmlContent;

        } else {
            container.innerHTML = '';
        }
    } catch (error) {
        console.error("Error loading active consultations:", error);
    }
}

async function joinMeeting(bookingId) {
    try {
        const response = await fetch(`${BASE_URL}/api/get_join_link.php?booking_id=${bookingId}`);
        const result = await response.json();

        if (result.success && result.data && result.data.meeting_link) {
            window.open(result.data.meeting_link, '_blank');
        } else {
            alert(result.message || "Session not started yet or access denied.");
            loadConsultationSection(); // Force UI refresh
        }
    } catch (error) {
        console.error("Error getting join link:", error);
        alert("Unable to fetch meeting link. Please try again.");
    }
}

/* -------------------------------------------------------
   REPORT UPLOAD LOGIC
------------------------------------------------------- */

function openUploadModal(bookingId) {
    document.getElementById('uploadBookingId').value = bookingId;
    document.getElementById('uploadReportModal').style.display = 'flex';
    document.getElementById('reportFile').value = '';
    document.getElementById('fileNameDisplay').innerText = 'Choose a file or drag it here';
    document.getElementById('uploadedReportsSection').style.display = 'none';
    loadUploadedReports(bookingId);
}

function closeUploadModal() {
    document.getElementById('uploadReportModal').style.display = 'none';
}

function updateFileName(input) {
    const display = document.getElementById('fileNameDisplay');
    if (input.files && input.files[0]) {
        display.innerText = input.files[0].name;
        display.style.color = 'var(--primary)';
    } else {
        display.innerText = 'Choose a file or drag it here';
        display.style.color = 'var(--text-main)';
    }
}

async function handleReportUpload(event) {
    event.preventDefault();
    
    const bookingId = document.getElementById('uploadBookingId').value;
    const patientId = localStorage.getItem('userId');
    const fileInput = document.getElementById('reportFile');
    const submitBtn = document.getElementById('uploadSubmitBtn');
    const progressDiv = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('progressBar');

    if (!fileInput.files || fileInput.files.length === 0) {
        showToast("Please select a file to upload.", "error");
        return;
    }

    const formData = new FormData();
    formData.append('booking_id', bookingId);
    formData.append('patient_id', patientId);
    formData.append('report', fileInput.files[0]);

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Uploading...';
    progressDiv.style.display = 'block';
    progressBar.style.width = '0%';

    try {
        const response = await fetch(`${BASE_URL}/api/upload_report.php`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            progressBar.style.width = '100%';
            showToast("Report uploaded successfully!", "success");
            fileInput.value = '';
            document.getElementById('fileNameDisplay').innerText = 'Choose a file or drag it here';
            loadUploadedReports(bookingId);
        } else {
            showToast(result.message || "Upload failed.", "error");
        }
    } catch (error) {
        console.error("Upload error:", error);
        showToast("An error occurred during upload.", "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-upload"></i> Upload Report';
        setTimeout(() => {
            progressDiv.style.display = 'none';
            progressBar.style.width = '0%';
        }, 1000);
    }
}

async function loadMedicalHistory() {
    const patientId = localStorage.getItem('userId');
    const container = document.getElementById('historyListContainer');
    if (!patientId || !container) return;

    try {
        const response = await fetch(`${BASE_URL}/api/get_medical_history.php?patient_id=${patientId}`);
        const result = await response.json();

        if (result.success && result.data && result.data.length > 0) {
            let html = '';
            result.data.forEach(item => {
                const date = new Date(item.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
                
                html += `
                <div class="glass" style="padding: 1.5rem; border-radius: 12px; border-left: 4px solid var(--primary);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                        <div>
                            <h3 style="margin: 0; font-size: 1.1rem; color: var(--text-main);">Dr. ${item.doctor_name}</h3>
                            <p style="margin: 0; font-size: 0.85rem; color: var(--text-muted);">${item.doctor_specialization || 'Consultant'}</p>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: 600; font-size: 0.9rem; color: var(--text-main);">${date}</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">ID: #${item.booking_id}</div>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.25rem;">
                        <div>
                            <strong style="display: block; font-size: 0.8rem; color: var(--primary); margin-bottom: 0.4rem; text-transform: uppercase;">Diagnosis</strong>
                            <p style="margin: 0; font-size: 0.9rem; color: var(--text-main); font-weight: 500;">${item.diagnosis}</p>
                        </div>
                        <div style="display: flex; gap: 0.75rem; align-items: center; justify-content: flex-end;">
                            ${item.prescription_id ? `
                            <a href="${BASE_URL}/api/generate_prescription_pdf.php?prescription_id=${item.prescription_id}" target="_blank" class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.8rem;">
                                <i class="fa-solid fa-file-prescription"></i> Prescription
                            </a>` : ''}
                        </div>
                    </div>

                    ${item.reports && item.reports.length > 0 ? `
                    <div style="border-top: 1px solid var(--glass-border); padding-top: 1rem;">
                        <strong style="display: block; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem;">Medical Reports (${item.reports.length})</strong>
                        <div style="display: flex; flex-wrap: wrap; gap: 0.75rem;">
                            ${item.reports.map(rpt => `
                            <a href="${BASE_URL}/${rpt.file_path}" target="_blank" class="glass" style="padding: 0.5rem 0.75rem; border-radius: 8px; font-size: 0.8rem; text-decoration: none; color: var(--text-main); display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fa-solid ${rpt.file_path.endsWith('.pdf') ? 'fa-file-pdf' : 'fa-file-image'}" style="color: ${rpt.file_path.endsWith('.pdf') ? '#ef4444' : '#3b82f6'};"></i>
                                <span>${rpt.original_name}</span>
                            </a>`).join('')}
                        </div>
                    </div>` : ''}
                </div>`;
            });
            container.innerHTML = html;
        } else {
            container.innerHTML = `
            <div style="padding: 4rem; text-align: center; opacity: 0.5;">
                <i class="fa-solid fa-box-open" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <h3>No History Found</h3>
                <p>You haven't completed any consultations yet.</p>
            </div>`;
        }
    } catch (error) {
        console.error("Error loading history:", error);
        container.innerHTML = '<p class="text-center text-muted">Failed to load medical history.</p>';
    }
}

async function loadUploadedReports(bookingId) {
    const listContainer = document.getElementById('uploadedReportsList');
    const section = document.getElementById('uploadedReportsSection');
    
    try {
        const response = await fetch(`${BASE_URL}/api/get_reports.php?booking_id=${bookingId}`);
        const result = await response.json();

        if (result.success && result.data && result.data.reports && result.data.reports.length > 0) {
            section.style.display = 'block';
            let html = '';
            result.data.reports.forEach(rpt => {
                const icon = rpt.file_path.endsWith('.pdf') ? 'fa-file-pdf' : 'fa-file-image';
                const iconColor = rpt.file_path.endsWith('.pdf') ? '#ef4444' : '#3b82f6';
                
                html += `
                <div class="glass" style="padding: 0.75rem; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.03);">
                    <div style="display: flex; align-items: center; gap: 0.75rem; overflow: hidden;">
                        <i class="fa-solid ${icon}" style="color: ${iconColor}; font-size: 1.2rem; flex-shrink: 0;"></i>
                        <span style="font-size: 0.85rem; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${rpt.original_name}</span>
                    </div>
                    <a href="${BASE_URL}/${rpt.file_path}" target="_blank" class="btn btn-outline" style="padding: 0.4rem 0.6rem; font-size: 0.75rem; border-radius: 6px;">
                        <i class="fa-solid fa-eye"></i> View
                    </a>
                </div>`;
            });
            listContainer.innerHTML = html;
        } else {
            section.style.display = 'none';
        }
    } catch (error) {
        console.error("Error loading reports:", error);
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
/* -------------------------------------------------------
   MEDICAL PROFILE LOGIC
------------------------------------------------------- */

async function loadUserProfileData() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    try {
        const response = await fetch(`${BASE_URL}/api/get_profile.php?user_id=${userId}`); 
        const result = await response.json();
        
        if (result.success && result.data) {
            const p = result.data;
            if (document.getElementById('profileAge')) document.getElementById('profileAge').value = p.age || '';
            if (document.getElementById('profileGender')) document.getElementById('profileGender').value = p.gender || '';
            if (document.getElementById('profileBloodGroup')) document.getElementById('profileBloodGroup').value = p.blood_group || '';
        }
    } catch (e) {
        console.error("Error loading profile data:", e);
    }
}

async function updateMedicalProfile(event) {
    event.preventDefault();
    
    const userId = localStorage.getItem('userId');
    const age = document.getElementById('profileAge').value;
    const gender = document.getElementById('profileGender').value;
    const bloodGroup = document.getElementById('profileBloodGroup').value;
    const btn = document.getElementById('profileUpdateBtn');

    if (!age || !gender || !bloodGroup) {
        showToast("Please fill all fields.", "error");
        return;
    }

    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving Profile...';

    try {
        const response = await fetch(`${BASE_URL}/api/update_profile.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                age,
                gender,
                blood_group: bloodGroup
            })
        });

        const result = await response.json();
        if (result.success) {
            showToast("Medical profile updated successfully!", "success");
        } else {
            showToast(result.message || "Failed to update profile.", "error");
        }
    } catch (error) {
        showToast("Network error. Please try again.", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}
