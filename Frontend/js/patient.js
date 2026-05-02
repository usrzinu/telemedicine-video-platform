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
        // Auto update UI every 10 seconds
        consultationInterval = setInterval(loadConsultationSection, 10000);
    }
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
                            actionHtml = `<button onclick="joinMeeting(${app.appointment_id})" class="btn btn-primary" style="width: 100%; background: #10b981; padding: 0.75rem; font-weight: bold; border-radius: 8px;">
                                <i class="fa-solid fa-video"></i> Join Now
                            </button>`;
                        } else if (apiMessage.includes("next")) {
                            // NEXT status
                            statusLabel = '<span style="color: #3b82f6; font-weight: 600;"><i class="fa-solid fa-bell"></i> You\'re next. Please be ready</span>';
                            cardBorder = '#3b82f6';
                            actionHtml = `<button disabled class="btn btn-outline" style="width: 100%; opacity: 0.8; cursor: not-allowed; padding: 0.75rem; border-radius: 8px;">
                                Get Ready
                            </button>`;
                        } else if (apiMessage.includes("wait")) {
                            // WAITING status
                            statusLabel = '<span style="color: #f59e0b; font-weight: 600;"><i class="fa-solid fa-clock"></i> Waiting for your turn</span>';
                            actionHtml = `<button disabled class="btn btn-outline" style="width: 100%; opacity: 0.6; cursor: not-allowed; padding: 0.75rem; border-radius: 8px;">
                                Please Wait
                            </button>`;
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
