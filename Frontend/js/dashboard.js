/**
 * AuraMed Dashboard Controller
 * Handles dynamic data loading for Admin, Doctor, and Patient dashboards.
 */

document.addEventListener('DOMContentLoaded', () => {
    const userRole = localStorage.getItem('userRole');
    const userName = localStorage.getItem('userName');

    // Update Welcome Message
    const welcomeMsg = document.getElementById('welcomeMsg');
    if (welcomeMsg && userName) {
        welcomeMsg.innerText = userRole === 'doctor' ? `Welcome, Dr. ${userName}` : `Welcome, ${userName}`;
    }

    // Global Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = 'index.html';
        });
    }

    if (userRole === 'admin')   initAdminDashboard();
    else if (userRole === 'doctor')  initDoctorDashboard();
    else if (userRole === 'patient') initPatientDashboard();
});

/* =========================================================
   TOAST NOTIFICATIONS
   ========================================================= */
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons  = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info', warning: 'fa-triangle-exclamation' };
    const colors = { success: '#10b981', error: '#ef4444', info: '#38bdf8', warning: '#f59e0b' };
    const color  = colors[type] || colors.info;
    const icon   = icons[type]  || icons.info;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.cssText = `
        display:flex;align-items:center;gap:0.75rem;
        padding:0.9rem 1.25rem;border-radius:12px;
        background:var(--surface);backdrop-filter:blur(20px);
        border:1px solid ${color}40;border-left:3px solid ${color};
        box-shadow:0 8px 30px rgba(0,0,0,0.35);
        color:var(--text-main);font-weight:500;font-size:0.9rem;
        min-width:280px;max-width:380px;pointer-events:all;
        animation:toastIn 0.35s cubic-bezier(0.34,1.56,0.64,1);
    `;
    toast.innerHTML = `
        <i class="fa-solid ${icon}" style="color:${color};font-size:1.2rem;flex-shrink:0;"></i>
        <span style="flex:1;">${message}</span>
        <i class="fa-solid fa-xmark" style="cursor:pointer;color:var(--text-muted);font-size:0.9rem;" onclick="this.closest('.toast').remove()"></i>
    `;
    container.appendChild(toast);
    setTimeout(() => { toast.style.animation = 'toastOut 0.3s ease forwards'; setTimeout(() => toast.remove(), 300); }, 4000);
}

/* =========================================================
   CONFIRM MODAL
   ========================================================= */
function showConfirm(title, message, onConfirm, type = 'warning') {
    const overlay = document.getElementById('confirmOverlay');
    if (!overlay) { if (confirm(message)) onConfirm(); return; }

    const cfg = {
        warning: { icon: 'fa-triangle-exclamation', color: '#f59e0b', label: 'Confirm' },
        danger:  { icon: 'fa-circle-xmark',         color: '#ef4444', label: 'Reject'  },
        success: { icon: 'fa-circle-check',          color: '#10b981', label: 'Approve' },
    }[type] || { icon: 'fa-triangle-exclamation', color: '#f59e0b', label: 'Confirm' };

    document.getElementById('confirmTitle').textContent   = title;
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmIcon').className      = `fa-solid ${cfg.icon}`;
    document.getElementById('confirmIcon').style.color    = cfg.color;
    document.getElementById('confirmOkBtn').textContent   = cfg.label;

    overlay.classList.add('open');
    const close = () => overlay.classList.remove('open');
    document.getElementById('confirmOkBtn').onclick     = () => { close(); onConfirm(); };
    document.getElementById('confirmCancelBtn').onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
}

/* =========================================================
   SHARED UTILITIES
   ========================================================= */
function animateCount(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    const start = performance.now();
    const update = (now) => {
        const p = Math.min((now - start) / 900, 1);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(e * target);
        if (p < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
}

function initials(name) {
    return (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(str) {
    if (!str) return '—';
    return new Date(str).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

async function fetchApi(endpoint, method, body = null) {
    const opts = { method, headers: { 'Accept': 'application/json' } };
    if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    const res = await fetch(endpoint, opts);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

/* =========================================================
   ADMIN DASHBOARD
   ========================================================= */
async function initAdminDashboard() {
    loadAdminStats();
    renderPendingView();
    setupAdminNav();

    // Stat card shortcuts
    document.getElementById('statApprovalCard')?.addEventListener('click', () => {
        activateNav('overviewBtn', 'sidebarPending');
        renderPendingView();
    });

}

function setupAdminNav() {
    const routes = {
        overviewBtn:      () => { activateNav('overviewBtn', 'sidebarPending');  renderPendingView();            },
        totalDoctorsBtn:  () => { activateNav('totalDoctorsBtn', null);           renderApprovedDoctorsView();    },
        sidebarPending:   () => { activateNav('overviewBtn', 'sidebarPending');  renderPendingView();            },
        sidebarDoctors:   () => { activateNav(null, 'sidebarDoctors');           renderDoctorsListView();        },
        sidebarMessages:  () => { activateNav(null, 'sidebarMessages');           renderAdminSupportView();       },
        sidebarSettings:  () => { activateNav(null, 'sidebarSettings');           renderComingSoon('Settings',  'fa-gear');    },
    };
    Object.entries(routes).forEach(([id, fn]) => document.getElementById(id)?.addEventListener('click', fn));
}

function activateNav(topId, sideId) {
    document.querySelectorAll('.top-nav-btn, .nav-item').forEach(el => el.classList.remove('active'));
    if (topId)  document.getElementById(topId)?.classList.add('active');
    if (sideId) document.getElementById(sideId)?.classList.add('active');

    // Admin specific view reset
    const mainCard = document.getElementById('mainDataCard');
    const supportView = document.getElementById('adminSupportView');
    if (mainCard && supportView) {
        mainCard.style.display = 'block';
        supportView.style.display = 'none';
    }
}

/* ---- Stats ---- */
async function loadAdminStats() {
    try {
        const { status, data } = await fetchApi('/api/admin/stats', 'GET');
        if (status === 'success') {
            animateCount('doctorCount',     data.doctors);
            animateCount('pendingApprovals', data.pending);
        }
    } catch {
        ['doctorCount','pendingApprovals'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '—';
        });
    }
}

/* ---- Pending Doctors View ---- */
async function renderPendingView() {
    const card = document.getElementById('mainDataCard');
    if (!card) return;

    card.innerHTML = `
        <h2 style="margin-bottom:1.5rem;display:flex;align-items:center;gap:0.75rem;">
            <i class="fa-solid fa-clipboard-check" style="color:var(--primary);"></i>
            Doctor Approval Queue
        </h2>
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;min-width:620px;">
                <thead>
                    <tr style="border-bottom:1px solid var(--glass-border);text-align:left;">
                        <th style="padding:1rem;color:var(--text-muted);font-weight:600;">Doctor</th>
                        <th style="padding:1rem;color:var(--text-muted);font-weight:600;">Specialization</th>
                        <th style="padding:1rem;color:var(--text-muted);font-weight:600;">Experience</th>
                        <th style="padding:1rem;color:var(--text-muted);font-weight:600;">Documents</th>
                        <th style="padding:1rem;color:var(--text-muted);font-weight:600;">Action</th>
                    </tr>
                </thead>
                <tbody id="adminTableBody">
                    <tr><td colspan="5" style="padding:3.5rem;text-align:center;color:var(--text-muted);">
                        <i class="fa-solid fa-circle-notch fa-spin" style="font-size:2rem;margin-bottom:0.75rem;display:block;"></i>
                        Fetching applications...
                    </td></tr>
                </tbody>
            </table>
        </div>`;

    try {
        const { status, data } = await fetchApi('/api/admin/pending', 'GET');
        const tbody = document.getElementById('adminTableBody');
        if (!tbody) return;

        if (status === 'success' && data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="padding:3.5rem;text-align:center;color:var(--text-muted);">
                <i class="fa-solid fa-inbox" style="font-size:2.5rem;margin-bottom:0.75rem;display:block;opacity:0.4;"></i>
                No pending applications — all caught up!
            </td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(doc => `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);transition:background 0.2s;"
                onmouseover="this.style.background='rgba(14,165,233,0.05)'"
                onmouseout="this.style.background='transparent'">
                <td style="padding:1rem;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <img src="/${doc.profile_photo}" alt=""
                            style="width:42px;height:42px;border-radius:50%;object-fit:cover;border:2px solid var(--primary);flex-shrink:0;"
                            onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(doc.doctor_name)}&background=0ea5e9&color=fff'">
                        <div>
                            <div style="font-weight:600;">${doc.doctor_name}</div>
                            <div style="font-size:0.8rem;color:var(--text-muted);">${doc.email}</div>
                        </div>
                    </div>
                </td>
                <td style="padding:1rem;">${doc.specialization}</td>
                <td style="padding:1rem;">${doc.experience} yrs</td>
                <td style="padding:1rem;">
                    <a href="/${doc.license_file}" target="_blank"
                       style="color:var(--secondary);font-size:0.88rem;display:inline-flex;align-items:center;gap:5px;">
                        <i class="fa-solid fa-file-pdf"></i> View License
                    </a>
                </td>
                <td style="padding:1rem;">
                    <div style="display:flex;gap:8px;">
                        <button onclick="updateDoctorStatus(${doc.id},'approved')"
                            class="btn btn-primary"
                            style="padding:0.4rem 0.9rem;font-size:0.8rem;background:#10b981;box-shadow:0 4px 12px rgba(16,185,129,0.3);">
                            <i class="fa-solid fa-check" style="margin-right:3px;"></i>Approve
                        </button>
                        <button onclick="updateDoctorStatus(${doc.id},'rejected')"
                            class="btn btn-outline"
                            style="padding:0.4rem 0.9rem;font-size:0.8rem;border-color:#ef4444;color:#ef4444;">
                            <i class="fa-solid fa-xmark" style="margin-right:3px;"></i>Reject
                        </button>
                    </div>
                </td>
            </tr>`).join('');
    } catch {
        const tbody = document.getElementById('adminTableBody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="padding:2.5rem;text-align:center;color:#ef4444;">
            <i class="fa-solid fa-triangle-exclamation" style="margin-right:0.5rem;"></i>
            Error loading applications. Check server connection.
        </td></tr>`;
    }
}

async function updateDoctorStatus(id, status) {
    const isApprove = status === 'approved';
    showConfirm(
        isApprove ? 'Approve Doctor' : 'Reject Application',
        isApprove
            ? 'This doctor will gain full platform access. Proceed?'
            : 'This application will be permanently rejected. Proceed?',
        async () => {
            try {
                const { status: s, message } = await fetchApi('/api/admin/update-status', 'POST', { id, status });
                if (s === 'success') {
                    showToast(message, 'success');
                    loadAdminStats();
                    renderPendingView();
                } else {
                    showToast('Error: ' + message, 'error');
                }
            } catch {
                showToast('Failed to update status. Try again.', 'error');
            }
        },
        isApprove ? 'success' : 'danger'
    );
}

/* ---- Approved Doctors View ---- */
async function renderApprovedDoctorsView() {
    const card = document.getElementById('mainDataCard');
    if (!card) return;

    card.innerHTML = `
        <h2 style="margin-bottom:1.5rem;display:flex;align-items:center;gap:0.75rem;">
            <i class="fa-solid fa-user-doctor" style="color:var(--secondary);"></i>
            Approved Medical Providers
        </h2>
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;min-width:600px;">
                <thead>
                    <tr style="border-bottom:1px solid var(--glass-border);text-align:left;">
                        <th style="padding:1rem;color:var(--text-muted);font-weight:600;">Doctor</th>
                        <th style="padding:1rem;color:var(--text-muted);font-weight:600;">Specialization</th>
                        <th style="padding:1rem;color:var(--text-muted);font-weight:600;">Experience</th>
                        <th style="padding:1rem;color:var(--text-muted);font-weight:600;">Fee</th>
                        <th style="padding:1rem;color:var(--text-muted);font-weight:600;">Status</th>
                    </tr>
                </thead>
                <tbody id="adminTableBody">
                    <tr><td colspan="5" style="padding:3.5rem;text-align:center;color:var(--text-muted);">
                        <i class="fa-solid fa-circle-notch fa-spin" style="font-size:2rem;margin-bottom:0.75rem;display:block;"></i>
                        Loading approved doctors...
                    </td></tr>
                </tbody>
            </table>
        </div>`;

    try {
        const { status, data } = await fetchApi('/api/doctors', 'GET');
        const tbody = document.getElementById('adminTableBody');
        if (!tbody) return;

        if (status === 'success' && data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="padding:3.5rem;text-align:center;color:var(--text-muted);">
                <i class="fa-solid fa-user-doctor" style="font-size:2.5rem;margin-bottom:0.75rem;display:block;opacity:0.3;"></i>
                No approved doctors yet.
            </td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(doc => `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);transition:background 0.2s;"
                onmouseover="this.style.background='rgba(139,92,246,0.05)'"
                onmouseout="this.style.background='transparent'">
                <td style="padding:1rem;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <img src="/${doc.profile_photo}" alt=""
                            style="width:42px;height:42px;border-radius:50%;object-fit:cover;border:2px solid var(--secondary);flex-shrink:0;"
                            onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(doc.doctor_name)}&background=8b5cf6&color=fff'">
                        <div>
                            <div style="font-weight:600;">Dr. ${doc.doctor_name}</div>
                            <div style="font-size:0.8rem;color:var(--text-muted);">${doc.email || ''}</div>
                        </div>
                    </div>
                </td>
                <td style="padding:1rem;">${doc.specialization}</td>
                <td style="padding:1rem;">${doc.experience} yrs</td>
                <td style="padding:1rem;font-weight:600;color:var(--text-main);">৳${doc.consultation_fee}</td>
                <td style="padding:1rem;">
                    <span style="padding:0.3rem 0.75rem;border-radius:999px;font-size:0.78rem;font-weight:600;
                                 color:#10b981;border:1px solid rgba(16,185,129,0.3);background:rgba(16,185,129,0.08);">
                        <i class="fa-solid fa-circle-check" style="font-size:0.7rem;margin-right:3px;"></i>Approved
                    </span>
                </td>
            </tr>`).join('');
    } catch {
        const tbody = document.getElementById('adminTableBody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="padding:2.5rem;text-align:center;color:#ef4444;">Error loading approved doctors.</td></tr>`;
    }
}

/* ---- Doctors Management View ---- */
async function renderDoctorsListView() {
    const card = document.getElementById('mainDataCard');
    if (!card) return;

    card.innerHTML = `
        <h2 style="margin-bottom:1.5rem;display:flex;align-items:center;gap:0.75rem;">
            <i class="fa-solid fa-user-doctor" style="color:var(--primary);"></i>
            Doctor Network Management
        </h2>
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;min-width:650px;">
                <thead>
                    <tr style="border-bottom:1px solid var(--glass-border);text-align:left;">
                        <th style="padding:1rem;color:var(--text-muted);font-weight:600;">Doctor</th>
                        <th style="padding:1rem;color:var(--text-muted);font-weight:600;">Specialization</th>
                        <th style="padding:1rem;color:var(--text-muted);font-weight:600;">Joined</th>
                        <th style="padding:1rem;color:var(--text-muted);font-weight:600;">Status</th>
                        <th style="padding:1rem;color:var(--text-muted);font-weight:600;">Action</th>
                    </tr>
                </thead>
                <tbody id="adminTableBody">
                    <tr><td colspan="5" style="padding:3.5rem;text-align:center;color:var(--text-muted);">
                        <i class="fa-solid fa-circle-notch fa-spin" style="font-size:2rem;margin-bottom:0.75rem;display:block;"></i>
                        Loading doctor registry...
                    </td></tr>
                </tbody>
            </table>
        </div>`;

    try {
        const { status, data } = await fetchApi('/api/admin/doctors', 'GET');
        const tbody = document.getElementById('adminTableBody');
        if (!tbody) return;

        if (status === 'success' && data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="padding:3.5rem;text-align:center;color:var(--text-muted);">
                <i class="fa-solid fa-user-doctor" style="font-size:2.5rem;margin-bottom:0.75rem;display:block;opacity:0.3;"></i>
                No approved doctors found.
            </td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(d => {
            const isBanned = d.status === 'banned';
            const statusLabel = isBanned ? 'Banned' : 'Active';
            const statusColor = isBanned ? '#ef4444' : '#10b981';
            
            return `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);transition:background 0.2s;"
                onmouseover="this.style.background='rgba(139,92,246,0.05)'"
                onmouseout="this.style.background='transparent'">
                <td style="padding:1rem;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div style="width:42px;height:42px;border-radius:50%;flex-shrink:0;
                                    background:linear-gradient(135deg,var(--primary),var(--secondary));
                                    display:flex;align-items:center;justify-content:center;
                                    font-weight:700;font-size:0.85rem;color:white;">
                            ${initials(d.name)}
                        </div>
                        <div>
                            <div style="font-weight:600;">${d.name}</div>
                            <div style="font-size:0.8rem;color:var(--text-muted);">${d.email}</div>
                        </div>
                    </div>
                </td>
                <td style="padding:1rem;font-size:0.9rem;">${d.specialization}</td>
                <td style="padding:1rem;color:var(--text-muted);font-size:0.9rem;">${formatDate(d.created_at)}</td>
                <td style="padding:1rem;">
                    <span style="padding:0.3rem 0.75rem;border-radius:999px;font-size:0.78rem;font-weight:600;
                                 color:${statusColor};border:1px solid ${statusColor}30;background:${statusColor}10;">
                        <i class="fa-solid ${isBanned ? 'fa-ban' : 'fa-circle-check'}" style="font-size:0.7rem;margin-right:3px;"></i>${statusLabel}
                    </span>
                </td>
                <td style="padding:1rem;">
                    <button class="btn ${isBanned ? 'btn-primary' : 'btn-outline'}" 
                            style="padding: 0.4rem 0.8rem; font-size: 0.8rem; border-radius: 8px; ${!isBanned ? 'border-color:#ef4444; color:#ef4444;' : ''}"
                            onclick="toggleDoctorStatus(${d.id}, '${d.status}')">
                        ${isBanned ? '<i class="fa-solid fa-unlock"></i> Activate' : '<i class="fa-solid fa-user-slash"></i> Ban'}
                    </button>
                </td>
            </tr>`;
        }).join('');
    } catch (err) {
        console.error('Error loading doctors:', err);
        const tbody = document.getElementById('adminTableBody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="padding:2.5rem;text-align:center;color:#ef4444;">
            <i class="fa-solid fa-triangle-exclamation" style="margin-right:0.5rem;"></i>
            Error loading doctor registry.
        </td></tr>`;
    }
}

/**
 * Toggle doctor status between 'approved' (Active) and 'banned'
 */
async function toggleDoctorStatus(doctorId, currentStatus) {
    const isBanning = currentStatus !== 'banned';
    const actionLabel = isBanning ? 'BAN' : 'ACTIVATE';
    
    showConfirm(
        `${actionLabel} Doctor`,
        `Are you sure you want to ${isBanning ? 'restrict access for' : 'restore access for'} this doctor?`,
        async () => {
            try {
                const result = await fetchApi('/api/admin/update-status', 'POST', {
                    id: doctorId,
                    status: isBanning ? 'banned' : 'approved'
                });
                
                if (result.status === 'success') {
                    showToast(`Doctor account ${isBanning ? 'banned' : 'activated'} successfully.`, isBanning ? 'warning' : 'success');
                    renderDoctorsListView();
                } else {
                    showToast(result.message, 'error');
                }
            } catch (err) {
                console.error('Error toggling doctor status:', err);
                showToast('Failed to update status.', 'error');
            }
        },
        isBanning ? 'danger' : 'success'
    );
}

/* ---- Coming Soon placeholder ---- */
function renderComingSoon(label, icon) {
    const card = document.getElementById('mainDataCard');
    if (!card) return;
    card.innerHTML = `
        <div style="padding:5rem;text-align:center;color:var(--text-muted);">
            <i class="fa-solid ${icon}" style="font-size:3rem;margin-bottom:1rem;display:block;opacity:0.3;"></i>
            <h3 style="margin-bottom:0.5rem;color:var(--text-main);">${label}</h3>
            <p style="margin-bottom:0;">This feature is coming soon.</p>
        </div>`;
}



/* =========================================================
   PATIENT DASHBOARD
   ========================================================= */
async function initPatientDashboard() {
    loadApprovedDoctors();
    loadPatientAppointments();
    document.getElementById('overviewBtn')?.addEventListener('click', () => {
        location.reload();
    });

    // Navigation logic
    const navFindDoctors = document.getElementById('navFindDoctors');
    const navAppointments = document.getElementById('navAppointments');
    const navHistory = document.getElementById('navHistory');
    const navSupport = document.getElementById('navSupport');
    
    if (navFindDoctors) navFindDoctors.addEventListener('click', () => switchPatientView('FindDoctors'));
    if (navAppointments) navAppointments.addEventListener('click', () => switchPatientView('Appointments'));
    if (navHistory) navHistory.addEventListener('click', () => switchPatientView('History'));
    if (navSupport) navSupport.addEventListener('click', () => switchPatientView('Support'));
}

function switchPatientView(viewName) {
    // Hide all views
    document.getElementById('viewFindDoctors').style.display = 'none';
    document.getElementById('viewAppointments').style.display = 'none';
    document.getElementById('viewHistory').style.display = 'none';
    document.getElementById('viewSupport').style.display = 'none';
    
    // Remove active class from all nav items
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => el.classList.remove('active'));
    
    // Show selected view and activate nav
    document.getElementById('view' + viewName).style.display = 'block';
    document.getElementById('nav' + viewName).classList.add('active');
    
    // Update header text
    const welcomeMsg = document.getElementById('welcomeMsg');
    if (welcomeMsg) {
        if (viewName === 'Support') welcomeMsg.innerText = 'Support Center';
        else if (viewName === 'Appointments') welcomeMsg.innerText = 'My Appointments';
        else if (viewName === 'History') welcomeMsg.innerText = 'Medical History';
        else welcomeMsg.innerText = 'Welcome';
    }

    if (viewName === 'Appointments') {
        loadPatientAppointments();
    }
    if (viewName === 'Support') {
        loadSupportTickets();
    }
}

async function loadPatientAppointments() {
    const listContainer = document.getElementById('patientAppointmentsList');
    const patientId = localStorage.getItem('userId');
    if (!listContainer || !patientId) return;

    try {
        const { status, data } = await fetchApi(`/api/appointment/patient?patient_id=${patientId}`, 'GET');
        
        if (status === 'success') {
            if (!data || data.length === 0) {
                listContainer.innerHTML = `
                    <div style="padding: 3rem; text-align: center; color: var(--text-muted);">
                        <i class="fa-solid fa-calendar-xmark" style="font-size: 2.5rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                        <h3>No Appointments Yet</h3>
                        <p>Book a consultation from the Find Doctors tab.</p>
                    </div>`;
                return;
            }

            listContainer.innerHTML = data.map(app => {
                const photoPath = app.profile_photo ? (app.profile_photo.startsWith('/') ? app.profile_photo : '/' + app.profile_photo) : '';
                
                let statusBadge = '';
                if (app.appointment_status === 'confirmed' || app.appointment_status === 'paid') {
                    statusBadge = `<span style="padding: 0.3rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; color: #10b981; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2);"><i class="fa-solid fa-check-double" style="margin-right:4px;"></i>Confirmed</span>`;
                } else if (app.appointment_status === 'payment_pending') {
                    statusBadge = `<span style="padding: 0.3rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; color: #f59e0b; background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.2);"><i class="fa-solid fa-hourglass-half" style="margin-right:4px;"></i>Waiting for Doctor Verification</span>`;
                } else if (app.appointment_status === 'pending_doctor') {
                    statusBadge = `<span style="padding: 0.3rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; color: #38bdf8; background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.2);"><i class="fa-solid fa-clock-rotate-left" style="margin-right:4px;"></i>Waiting for Doctor Approval</span>`;
                } else if (app.appointment_status === 'rejected' || app.appointment_status === 'cancelled') {
                    statusBadge = `<span style="padding: 0.3rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; color: #ef4444; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2);"><i class="fa-solid fa-circle-xmark" style="margin-right:4px;"></i>${app.appointment_status === 'cancelled' ? 'Rejected by Doctor' : 'Doctor Rejected Request'}</span>`;
                } else if (app.appointment_status === 'approved') {
                    statusBadge = `<span style="padding: 0.3rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; color: #a78bfa; background: rgba(167,139,250,0.1); border: 1px solid rgba(167,139,250,0.2); cursor: pointer;" onclick="openPaymentModal(${app.appointment_id}, ${app.consultation_fee || 0}, '${app.doctor_name}', '${app.date} ${app.start_time}')"><i class="fa-solid fa-credit-card" style="margin-right:4px;"></i>Pay Now</span>`;
                } else {
                    statusBadge = `<span style="padding: 0.3rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; color: var(--text-muted); background: rgba(255,255,255,0.05);">${app.appointment_status}</span>`;
                }

                return `
                <div style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; justify-content: space-between; padding: 1.25rem; background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: 12px; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='rgba(255,255,255,0.02)'">
                    <div style="display: flex; gap: 1rem; align-items: center; flex: 1; min-width: 250px;">
                        <img src="${photoPath}" alt="${app.doctor_name}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary);" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(app.doctor_name)}&background=0ea5e9&color=fff'">
                        <div>
                            <h4 style="margin: 0; font-size: 1.05rem;">Dr. ${app.doctor_name}</h4>
                            <div style="font-size: 0.85rem; color: var(--text-muted);">${app.specialization}</div>
                        </div>
                    </div>
                    <div style="flex: 1; min-width: 200px;">
                        <div style="font-weight: 600; margin-bottom: 0.2rem;"><i class="fa-regular fa-calendar" style="color: var(--primary); margin-right: 0.4rem;"></i>${formatDate(app.date)}</div>
                        <div style="font-size: 0.85rem; color: var(--text-muted);"><i class="fa-regular fa-clock" style="margin-right: 0.4rem;"></i>${app.start_time.substring(0, 5)} - ${app.end_time.substring(0, 5)}</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <div style="text-align: right; min-width: 80px;">
                            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.2rem;">Queue No.</div>
                            <div style="font-weight: 700; font-size: 1.1rem; color: var(--text-main);">${app.queue_position !== null ? '#' + app.queue_position : '-'}</div>
                        </div>
                        <div>
                            ${statusBadge}
                        </div>
                    </div>
                </div>`;
            }).join('');
        }
    } catch (err) {
        listContainer.innerHTML = '<p style="color: #ef4444; padding: 1rem;">Failed to load appointments. Please check your connection.</p>';
    }
}

async function loadApprovedDoctors() {
    const listContainer = document.getElementById('doctorList');
    if (!listContainer) return;

    try {
        const { status, data } = await fetchApi('/api/doctors', 'GET');
        if (status === 'success') {
            if (data.length === 0) {
                listContainer.innerHTML = '<p class="text-muted">No specialists are currently available.</p>';
                return;
            }
            listContainer.innerHTML = data.map(doc => {
                const photoPath = doc.profile_photo.startsWith('/') ? doc.profile_photo : '/' + doc.profile_photo;
                return `
                <div class="doctor-card">
                    <div class="doctor-card-img-container">
                        <img src="${photoPath}" alt="${doc.doctor_name}" class="doctor-card-img"
                            onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(doc.doctor_name)}&background=0ea5e9&color=fff'">
                    </div>
                    <div class="doctor-card-info">
                        <h3>Dr. ${doc.doctor_name}</h3>
                        <div class="specialty">${doc.specialization}</div>
                    </div>
                    <div class="doctor-card-stats">
                        <div class="stat-item">
                            <i class="fa-solid fa-graduation-cap"></i>
                            <div><span style="display:block;font-weight:600;color:var(--text-main);">${doc.qualification}</span></div>
                        </div>
                        <div class="stat-item">
                            <i class="fa-solid fa-briefcase-medical"></i>
                            <div><span style="display:block;font-weight:600;color:var(--text-main);">${doc.experience} Years Experience</span></div>
                        </div>
                    </div>
                    <div class="doctor-card-footer">
                        <div class="price-tag">
                            <span class="label">Consultation Fee</span>
                            <span class="amount">৳${doc.consultation_fee}</span>
                        </div>
                        <button onclick="openBookingModal(${doc.user_id}, '${doc.doctor_name.replace(/'/g, "\\'")}', ${doc.consultation_fee})" class="btn btn-primary" style="padding:0.6rem 1.25rem;font-weight:700;border-radius:999px;">Book Now</button>
                    </div>
                </div>`;
            }).join('');
        }
    } catch (err) {
        console.error('Error loading doctors:', err);
        listContainer.innerHTML = '<p style="color:#ef4444;">Could not load specialist directory. Please try again later.</p>';
    }
}

async function openBookingModal(doctorId, doctorName, fee) {
    const modal = document.getElementById('bookingModal');
    const nameEl = document.getElementById('bookingDoctorName');
    const slotsContainer = document.getElementById('availableSlotsContainer');
    
    if (!modal || !slotsContainer) return;
    
    nameEl.textContent = `Select an available slot for Dr. ${doctorName}`;
    slotsContainer.innerHTML = '<p class="text-muted text-center"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading slots...</p>';
    modal.style.display = 'flex';
    
    try {
        const { status, data } = await fetchApi(`/api/doctor/available-slots?doctor_id=${doctorId}`, 'GET');
        
        if (status === 'success') {
            if (data.length === 0) {
                slotsContainer.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-muted);"><i class="fa-solid fa-calendar-xmark" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i><p>No available slots at the moment.</p></div>';
                return;
            }
            
            slotsContainer.innerHTML = data.map(slot => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 1rem; border: 1px solid var(--glass-border); border-radius: 12px; background: rgba(255,255,255,0.03);">
                    <div>
                        <div style="font-weight: 600; margin-bottom: 0.25rem;"><i class="fa-regular fa-calendar" style="color: var(--primary); margin-right: 0.4rem;"></i>${formatDate(slot.date)}</div>
                        <div style="font-size: 0.85rem; color: var(--text-muted);"><i class="fa-regular fa-clock" style="margin-right: 0.4rem;"></i>${slot.start_time.substring(0, 5)} - ${slot.end_time.substring(0, 5)}</div>
                    </div>
                    <button onclick="bookAppointment(${doctorId}, ${slot.id}, ${fee})" class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.85rem;">Book This Slot</button>
                </div>
            `).join('');
        } else {
            slotsContainer.innerHTML = '<p class="text-center" style="color: #ef4444;">Failed to load slots.</p>';
        }
    } catch(err) {
        slotsContainer.innerHTML = '<p class="text-center" style="color: #ef4444;">Error fetching slots. Check connection.</p>';
    }
}

function closeBookingModal() {
    const modal = document.getElementById('bookingModal');
    if (modal) modal.style.display = 'none';
}

async function bookAppointment(doctorId, slotId, fee) {
    const patientId = localStorage.getItem('userId');
    if (!patientId) {
        showToast('Session expired. Please log in.', 'error');
        return;
    }
    
    try {
        const payload = {
            doctor_id: doctorId,
            patient_id: patientId,
            slot_id: slotId
        };
        
        const { status, message, appointment_id } = await fetchApi('/api/appointment/book', 'POST', payload);
        
        if (status === 'success') {
            closeBookingModal();
            showToast('Booking request sent! Awaiting doctor approval.', 'info');
            switchPatientView('Appointments');
        } else {
            showToast(message || 'Failed to book slot.', 'error');
        }
    } catch(err) {
        showToast('Error booking slot. Please try again.', 'error');
    }
}

let currentPaymentAppId = null;
let currentPaymentAmount = 0;

function openPaymentModal(appointmentId, amount, doctorName = '', slotTime = '') {
    currentPaymentAppId = appointmentId;
    currentPaymentAmount = amount;
    
    document.getElementById('paymentAmountDisplay').textContent = '৳' + amount;
    
    // Auto fill patient info
    const userName = localStorage.getItem('userName') || 'Patient';
    document.getElementById('payPatientName').value = userName;
    document.getElementById('payPatientEmail').value = localStorage.getItem('userEmail') || '';

    // Add extra info if provided (Doctor/Slot)
    // Note: If you don't have these IDs in HTML yet, they will just fail silently.
    const doctorEl = document.getElementById('payDoctorName');
    const slotEl = document.getElementById('paySlotTime');
    if (doctorEl) { doctorEl.value = doctorName; doctorEl.readOnly = true; }
    if (slotEl) { slotEl.value = slotTime; slotEl.readOnly = true; }
    
    togglePaymentFields();
    document.getElementById('paymentModal').style.display = 'flex';
}

function closePaymentModal() {
    document.getElementById('paymentModal').style.display = 'none';
    currentPaymentAppId = null;
    currentPaymentAmount = 0;
}

function togglePaymentFields() {
    const method = document.getElementById('paymentMethodSelect').value;
    const mobileFields = document.getElementById('mobileFields');
    const cardFields = document.getElementById('cardFields');
    
    if (method === 'bkash' || method === 'nagad') {
        mobileFields.style.display = 'block';
        cardFields.style.display = 'none';
    } else if (method === 'card') {
        mobileFields.style.display = 'none';
        cardFields.style.display = 'block';
    }
}

async function submitPayment() {
    const patientId = localStorage.getItem('userId');
    const method = document.getElementById('paymentMethodSelect').value;
    
    if (!currentPaymentAppId || !patientId) return;
    
    let phoneNumber = null;
    let transactionId = null;
    let cardNumber = null;
    
    if (method === 'bkash' || method === 'nagad') {
        phoneNumber = document.getElementById('payPhoneNumber').value;
        transactionId = document.getElementById('payTransactionId').value;
        
        if (!phoneNumber || !transactionId) {
            showToast("Phone Number and Transaction ID are required.", "warning");
            return;
        }
    } else if (method === 'card') {
        cardNumber = document.getElementById('payCardNumber').value;
        const cardHolder = document.getElementById('payCardHolder').value;
        const expiry = document.getElementById('payCardExpiry').value;
        
        if (!cardNumber || !cardHolder || !expiry) {
            showToast("All card fields are required.", "warning");
            return;
        }
    }
    
    const btn = document.getElementById('payNowBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Submitting...';
    btn.disabled = true;
    
    const paymentData = {
        appointment_id: parseInt(currentPaymentAppId),
        patient_id: parseInt(patientId),
        amount: currentPaymentAmount,
        payment_method: method,
        phone_number: phoneNumber,
        transaction_id: transactionId,
        card_number: cardNumber
    };
    
    try {
        const data = await fetchApi('/api/payment/pay', 'POST', paymentData);
        
        if (data.status === 'success') {
            showToast(data.message, 'success');
            closePaymentModal();
            setTimeout(() => location.reload(), 1500);
        } else {
            showToast("Payment failed: " + data.message, 'error');
        }
    } catch (error) {
        console.error("Payment error:", error);
        showToast("An error occurred during submission.", 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

/* =========================================================
   DOCTOR DASHBOARD — Slot Management
   ========================================================= */
function initDoctorDashboard() {
    document.getElementById('overviewBtn')?.addEventListener('click', () => location.reload());

    // Navigation logic
    const navRequests = document.getElementById('nav-requests');
    const navSchedule = document.getElementById('nav-schedule');
    const navPatients = document.getElementById('nav-patients');
    const navPayments = document.getElementById('nav-payments');
    
    if (navRequests) navRequests.addEventListener('click', () => switchDoctorView('requests'));
    if (navSchedule) navSchedule.addEventListener('click', () => switchDoctorView('schedule'));
    if (navPatients) navPatients.addEventListener('click', () => switchDoctorView('patients'));
    if (navPayments) navPayments.addEventListener('click', () => switchDoctorView('payments'));

    // Load existing slots on init
    loadSlots();
    // Load appointments
    loadDoctorAppointments();
    // Load incoming requests badge count
    loadIncomingRequests(true);
    // Load payment request badge count
    loadDoctorPaymentRequests(true);

    // Handle Add Slot form submission
    const addSlotForm = document.getElementById('addSlotForm');
    if (addSlotForm) {
        addSlotForm.addEventListener('submit', (e) => {
            e.preventDefault();
            addSlot();
        });
    }
}

/**
 * Load all slots for the current doctor
 */
async function loadSlots() {
    const doctorId = localStorage.getItem('userId');
    const tbody = document.getElementById('slotTableBody');
    if (!tbody || !doctorId) return;

    try {
        const { status, data } = await fetchApi(`/api/doctor/slots?doctor_id=${doctorId}`, 'GET');

        if (status === 'success' && data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="padding: 3rem; text-align: center; color: var(--text-muted);">
                <i class="fa-solid fa-calendar-xmark" style="font-size: 2rem; margin-bottom: 0.75rem; display: block; opacity: 0.35;"></i>
                No slots added yet. Use the form above to create your availability.
            </td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(slot => {
            const statusColor = slot.status === 'available' ? '#10b981' : '#f59e0b';
            const statusIcon  = slot.status === 'available' ? 'fa-circle-check' : 'fa-clock';
            const statusLabel = slot.status.charAt(0).toUpperCase() + slot.status.slice(1);

            return `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s;"
                onmouseover="this.style.background='rgba(14,165,233,0.05)'"
                onmouseout="this.style.background='transparent'">
                <td style="padding: 0.85rem 1rem; font-weight: 500;">${formatDate(slot.date)}</td>
                <td style="padding: 0.85rem 1rem;">${slot.start_time.substring(0, 5)}</td>
                <td style="padding: 0.85rem 1rem;">${slot.end_time.substring(0, 5)}</td>
                <td style="padding: 0.85rem 1rem;">
                    <span style="padding: 0.25rem 0.7rem; border-radius: 999px; font-size: 0.78rem; font-weight: 600;
                                 color: ${statusColor}; border: 1px solid ${statusColor}30; background: ${statusColor}12;">
                        <i class="fa-solid ${statusIcon}" style="font-size: 0.7rem; margin-right: 3px;"></i>${statusLabel}
                    </span>
                </td>
                <td style="padding: 0.85rem 1rem;">
                    <button onclick="deleteSlot(${slot.id})"
                        class="btn btn-outline"
                        style="padding: 0.35rem 0.8rem; font-size: 0.8rem; border-color: #ef4444; color: #ef4444; border-radius: 8px; cursor: pointer;">
                        <i class="fa-solid fa-trash-can" style="margin-right: 3px;"></i>Delete
                    </button>
                </td>
            </tr>`;
        }).join('');
    } catch (err) {
        console.error('Error loading slots:', err);
        tbody.innerHTML = `<tr><td colspan="5" style="padding: 2.5rem; text-align: center; color: #ef4444;">
            <i class="fa-solid fa-triangle-exclamation" style="margin-right: 0.5rem;"></i>
            Error loading slots. Check server connection.
        </td></tr>`;
    }
}

/**
 * Add a new availability slot
 */
async function addSlot() {
    const doctorId  = localStorage.getItem('userId');
    const date      = document.getElementById('slotDate').value;
    const startTime = document.getElementById('slotStart').value;
    const endTime   = document.getElementById('slotEnd').value;

    if (!doctorId) {
        showToast('Session expired. Please log in again.', 'error');
        return;
    }

    if (!date || !startTime || !endTime) {
        showToast('Please fill in all fields.', 'warning');
        return;
    }

    if (endTime <= startTime) {
        showToast('End time must be after start time.', 'warning');
        return;
    }

    const btn = document.getElementById('addSlotBtn');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="margin-right:0.4rem;"></i>Adding...';
    btn.disabled = true;

    try {
        const result = await fetchApi('/api/doctor/slot', 'POST', {
            doctor_id: doctorId,
            date: date,
            start_time: startTime,
            end_time: endTime
        });

        if (result.status === 'success') {
            showToast('Slot added successfully!', 'success');
            document.getElementById('addSlotForm').reset();
            loadSlots();
        } else {
            showToast(result.message || 'Failed to add slot.', 'error');
        }
    } catch (err) {
        console.error('Add slot error:', err);
        showToast('Failed to add slot. Check connection.', 'error');
    } finally {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }
}

/**
 * Delete a slot by ID
 */
async function deleteSlot(slotId) {
    const doctorId = localStorage.getItem('userId');
    if (!doctorId) {
        showToast('Session expired. Please log in again.', 'error');
        return;
    }

    // Use confirm modal if available, otherwise native confirm
    const doDelete = async () => {
        try {
            const result = await fetchApi('/api/doctor/slot', 'DELETE', {
                id: slotId,
                doctor_id: doctorId
            });

            if (result.status === 'success') {
                showToast('Slot deleted.', 'success');
                loadSlots();
            } else {
                showToast(result.message || 'Failed to delete slot.', 'error');
            }
        } catch (err) {
            console.error('Delete slot error:', err);
            showToast('Failed to delete slot. Check connection.', 'error');
        }
    };

    // Use the existing confirm modal if present
    if (typeof showConfirm === 'function') {
        showConfirm('Delete Slot', 'Are you sure you want to remove this availability slot?', doDelete, 'danger');
    } else {
        if (confirm('Are you sure you want to delete this slot?')) {
            doDelete();
        }
    }
}

/* =========================================================
   DOCTOR DASHBOARD — Appointments View
   ========================================================= */

async function loadDoctorAppointments() {
    const doctorId = localStorage.getItem('userId');
    if (!doctorId) return;

    try {
        const { status, data } = await fetchApi(`/api/doctor/appointments?doctor_id=${doctorId}`, 'GET');
        
        if (status === 'success') {
            const now = new Date();
            const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
            const currentTimeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
            
            const completed = data.filter(app => app.status === 'completed' || app.date < todayStr || (app.date === todayStr && app.end_time.substring(0, 5) < currentTimeStr));
            const active = data.filter(app => !(app.status === 'completed' || app.date < todayStr || (app.date === todayStr && app.end_time.substring(0, 5) < currentTimeStr)));
            
            const today = active.filter(app => app.date === todayStr);
            const upcoming = active.filter(app => app.date > todayStr);

            // Sort appointments logically by date and time
            today.sort((a, b) => a.start_time.localeCompare(b.start_time));
            upcoming.sort((a, b) => a.date === b.date ? a.start_time.localeCompare(b.start_time) : a.date.localeCompare(b.date));
            completed.sort((a, b) => a.date === b.date ? b.start_time.localeCompare(a.start_time) : b.date.localeCompare(a.date));
            
            renderAppointments('todayAppointmentsList', today, 'No appointments for today.');
            renderAppointments('upcomingAppointmentsList', upcoming, 'No upcoming appointments.');
            renderAppointments('completedAppointmentsList', completed, 'No completed appointments.');
        }
    } catch (err) {
        console.error('Error loading appointments:', err);
    }
}

function renderAppointments(containerId, appointments, emptyMessage) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (appointments.length === 0) {
        container.innerHTML = `<div style="padding: 1.5rem; text-align: center; color: var(--text-muted); opacity: 0.7; grid-column: 1 / -1;">
            <i class="fa-solid fa-clipboard-list" style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
            <p>${emptyMessage}</p>
        </div>`;
        return;
    }

    container.innerHTML = appointments.map(app => {
        let statusColor = '#3b82f6';
        if (app.status === 'booked' || app.status === 'approved') statusColor = '#10b981';
        if (app.status === 'pending') statusColor = '#f59e0b';
        if (app.status === 'completed') statusColor = '#64748b';
        
        return `
        <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: 12px; padding: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                <div>
                    <h3 style="margin-bottom: 0.2rem; font-size: 1.1rem; color: var(--text-main);">${app.patient_name}</h3>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">Patient</div>
                </div>
                <span style="padding: 0.25rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; text-transform: capitalize;
                             color: ${statusColor}; background: ${statusColor}15; border: 1px solid ${statusColor}40;">
                    ${app.status}
                </span>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; color: var(--text-muted);">
                    <i class="fa-regular fa-calendar" style="color: var(--primary);"></i>
                    <span>${formatDate(app.date)}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; color: var(--text-muted);">
                    <i class="fa-regular fa-clock" style="color: var(--primary);"></i>
                    <span>${app.start_time.substring(0, 5)} - ${app.end_time.substring(0, 5)}</span>
                </div>
            </div>
            
        </div>
        `;
    }).join('');
}

/* =========================================================
   DOCTOR DASHBOARD — My Patients View
   ========================================================= */

function switchDoctorView(viewName) {
    const navRequests = document.getElementById('nav-requests');
    const navSchedule = document.getElementById('nav-schedule');
    const navPatients = document.getElementById('nav-patients');
    const navPayments = document.getElementById('nav-payments');
    
    const viewRequests = document.getElementById('requestsViewContainer');
    const viewSchedule = document.getElementById('scheduleViewContainer');
    const viewPatients = document.getElementById('patientsViewContainer');
    const viewPayments = document.getElementById('paymentsViewContainer');

    // Hide all views and deactivate all nav items
    [viewRequests, viewSchedule, viewPatients, viewPayments].forEach(v => { if (v) v.style.display = 'none'; });
    [navRequests, navSchedule, navPatients, navPayments].forEach(n => n?.classList.remove('active'));

    if (viewName === 'requests') {
        navRequests?.classList.add('active');
        if (viewRequests) viewRequests.style.display = 'block';
        loadIncomingRequests();
    } else if (viewName === 'schedule') {
        navSchedule?.classList.add('active');
        if (viewSchedule) viewSchedule.style.display = 'block';
        loadDoctorAppointments();
    } else if (viewName === 'patients') {
        navPatients?.classList.add('active');
        if (viewPatients) viewPatients.style.display = 'block';
        loadMyPatients();
    } else if (viewName === 'payments') {
        navPayments?.classList.add('active');
        if (viewPayments) viewPayments.style.display = 'block';
        loadDoctorPaymentRequests();
    }
}

async function loadMyPatients() {
    const doctorId = localStorage.getItem('userId');
    if (!doctorId) return;

    const container = document.getElementById('patientsListContainer');
    container.innerHTML = '<p class="text-muted"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading patients...</p>';

    try {
        const { status, data } = await fetchApi(`/api/doctor/patients?doctor_id=${doctorId}`, 'GET');
        
        if (status === 'success') {
            renderPatientsList(data);
        } else {
            container.innerHTML = '<p class="text-muted text-center" style="grid-column: 1 / -1; color: #ef4444;">Failed to load patients.</p>';
        }
    } catch (err) {
        console.error('Error loading patients:', err);
        container.innerHTML = '<p class="text-muted text-center" style="grid-column: 1 / -1; color: #ef4444;">Error fetching data. Check connection.</p>';
    }
}

function renderPatientsList(patients) {
    const container = document.getElementById('patientsListContainer');
    
    if (!patients || patients.length === 0) {
        container.innerHTML = `
        <div style="padding: 3rem; text-align: center; color: var(--text-muted); opacity: 0.7; grid-column: 1 / -1;">
            <i class="fa-solid fa-users-slash" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
            <p>You do not have any patients yet.</p>
        </div>`;
        return;
    }

    container.innerHTML = patients.map(p => {
        
        // Generate appointment history HTML
        const historyHtml = p.appointments.map(app => {
            let statusColor = '#3b82f6';
            if (app.status === 'booked' || app.status === 'approved') statusColor = '#10b981';
            if (app.status === 'pending') statusColor = '#f59e0b';
            if (app.status === 'completed') statusColor = '#64748b';
            
            return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; border-top: 1px solid rgba(255,255,255,0.05);">
                <div>
                    <div style="font-size: 0.85rem; color: var(--text-main); font-weight: 500;">
                        <i class="fa-regular fa-calendar" style="color: var(--primary); margin-right: 0.3rem;"></i>${formatDate(app.date)}
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">
                        <i class="fa-regular fa-clock" style="margin-right: 0.3rem;"></i>${app.start_time.substring(0, 5)} - ${app.end_time.substring(0, 5)}
                    </div>
                </div>
                <span style="padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: 600; text-transform: capitalize;
                             color: ${statusColor}; background: ${statusColor}15; border: 1px solid ${statusColor}30;">
                    ${app.status}
                </span>
            </div>`;
        }).join('');

        return `
        <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: 16px; overflow: hidden; display: flex; flex-direction: column;">
            <div style="padding: 1.5rem; border-bottom: 1px solid var(--glass-border); display: flex; align-items: center; gap: 1rem; background: rgba(0,0,0,0.1);">
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=0ea5e9&color=fff" 
                     style="width: 50px; height: 50px; border-radius: 50%; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                <div>
                    <h3 style="margin-bottom: 0.2rem; font-size: 1.15rem;">${p.name}</h3>
                    <div style="font-size: 0.8rem; color: var(--text-muted);"><i class="fa-regular fa-envelope" style="margin-right: 0.4rem;"></i>${p.email}</div>
                </div>
            </div>
            
            <div style="padding: 1rem; flex-grow: 1;">
                <h4 style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin-bottom: 0.5rem; padding-left: 0.5rem;">
                    Appointment History (${p.appointments.length})
                </h4>
                <div style="max-height: 200px; overflow-y: auto; padding-right: 0.5rem;">
                    ${historyHtml}
                </div>
            </div>
            
            <div style="padding: 1rem; border-top: 1px solid var(--glass-border); background: rgba(255,255,255,0.01); display: flex; gap: 0.5rem;">
                <button class="btn btn-primary" style="flex: 1; padding: 0.6rem; font-size: 0.85rem;" onclick="alert('View full patient record coming soon!')">
                    <i class="fa-solid fa-file-medical"></i> View Details
                </button>
            </div>
        </div>
        `;
    }).join('');
}

/* =========================================================
   DOCTOR DASHBOARD — Incoming Booking Requests
   ========================================================= */

/**
 * Load pending booking requests for the logged-in doctor.
 * If countOnly=true, just update the nav badge without rendering the full list.
 */
async function loadIncomingRequests(countOnly = false) {
    const doctorId = localStorage.getItem('userId');
    if (!doctorId) return;

    try {
        const { status, data } = await fetchApi(`/api/appointment/requests?doctor_id=${doctorId}`, 'GET');

        // Update nav badge
        const navEl = document.getElementById('nav-requests');
        if (navEl) {
            const existing = navEl.querySelector('.req-badge');
            if (existing) existing.remove();
            if (status === 'success' && data.length > 0) {
                const badge = document.createElement('span');
                badge.className = 'req-badge';
                badge.style.cssText = `
                    display:inline-flex;align-items:center;justify-content:center;
                    min-width:18px;height:18px;padding:0 5px;
                    border-radius:999px;background:#f59e0b;
                    color:#000;font-size:0.7rem;font-weight:700;
                    margin-left:auto;
                `;
                badge.textContent = data.length;
                navEl.appendChild(badge);
            }
        }

        if (countOnly) return;

        const container = document.getElementById('incomingRequestsList');
        if (!container) return;

        if (status !== 'success' || data.length === 0) {
            container.innerHTML = `
                <div style="padding: 3rem; text-align: center; color: var(--text-muted);">
                    <i class="fa-solid fa-inbox" style="font-size: 2.5rem; margin-bottom: 1rem; display: block; opacity: 0.3;"></i>
                    <p>No pending booking requests at the moment.</p>
                </div>`;
            return;
        }

        container.innerHTML = data.map(req => `
            <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
                        gap: 1rem; padding: 1.25rem;
                        background: rgba(245,158,11,0.04); border: 1px solid rgba(245,158,11,0.2);
                        border-radius: 12px; margin-bottom: 0.75rem;
                        transition: background 0.2s;"
                 onmouseover="this.style.background='rgba(245,158,11,0.08)'"
                 onmouseout="this.style.background='rgba(245,158,11,0.04)'">

                <!-- Patient info -->
                <div style="display: flex; align-items: center; gap: 1rem; flex: 1; min-width: 220px;">
                    <div style="width: 46px; height: 46px; border-radius: 50%; flex-shrink: 0;
                                background: linear-gradient(135deg, #f59e0b, #ef4444);
                                display: flex; align-items: center; justify-content: center;
                                font-weight: 700; font-size: 1rem; color: #000;">
                        ${initials(req.patient_name)}
                    </div>
                    <div>
                        <div style="font-weight: 700; font-size: 1rem; color: var(--text-main);">${req.patient_name}</div>
                        <div style="font-size: 0.82rem; color: var(--text-muted);">
                            <i class="fa-regular fa-envelope" style="margin-right: 0.3rem;"></i>${req.patient_email}
                        </div>
                    </div>
                </div>

                <!-- Slot info -->
                <div style="flex: 1; min-width: 180px;">
                    <div style="font-weight: 600; margin-bottom: 0.2rem;">
                        <i class="fa-regular fa-calendar" style="color: #f59e0b; margin-right: 0.4rem;"></i>
                        ${formatDate(req.date)}
                    </div>
                    <div style="font-size: 0.85rem; color: var(--text-muted);">
                        <i class="fa-regular fa-clock" style="margin-right: 0.4rem;"></i>
                        ${req.start_time.substring(0,5)} – ${req.end_time.substring(0,5)}
                    </div>
                </div>

                <!-- Actions -->
                <div style="display: flex; gap: 0.6rem; flex-shrink: 0;">
                    <button onclick="respondToRequest(${req.appointment_id}, 'approved')"
                            class="btn btn-primary"
                            style="padding: 0.45rem 1rem; font-size: 0.82rem;
                                   background: #10b981; box-shadow: 0 4px 12px rgba(16,185,129,0.3);
                                   border-radius: 8px; font-weight: 700;">
                        <i class="fa-solid fa-check" style="margin-right: 4px;"></i>Approve
                    </button>
                    <button onclick="respondToRequest(${req.appointment_id}, 'rejected')"
                            class="btn btn-outline"
                            style="padding: 0.45rem 1rem; font-size: 0.82rem;
                                   border-color: #ef4444; color: #ef4444;
                                   border-radius: 8px; font-weight: 700;">
                        <i class="fa-solid fa-xmark" style="margin-right: 4px;"></i>Reject
                    </button>
                </div>
            </div>`).join('');

    } catch (err) {
        console.error('Error loading incoming requests:', err);
        const container = document.getElementById('incomingRequestsList');
        if (container) container.innerHTML = `<p style="color:#ef4444; padding:1rem;">
            <i class="fa-solid fa-triangle-exclamation" style="margin-right:0.5rem;"></i>
            Error loading requests. Check server connection.</p>`;
    }
}

/**
 * Approve or reject a booking request.
 */
async function respondToRequest(appointmentId, action) {
    const isApprove = action === 'approved';
    showConfirm(
        isApprove ? 'Approve Request' : 'Reject Request',
        isApprove
            ? 'Approve this booking? The patient will be notified and can proceed with payment.'
            : 'Reject this booking request? The patient will be informed.',
        async () => {
            try {
                const { status, message } = await fetchApi('/api/appointment/update-status', 'POST', {
                    appointment_id: appointmentId,
                    status: action
                });
                if (status === 'success') {
                    showToast(message, isApprove ? 'success' : 'warning');
                    loadIncomingRequests(); // refresh list + badge
                } else {
                    showToast('Error: ' + message, 'error');
                }
            } catch {
                showToast('Failed to update request. Try again.', 'error');
            }
        },
        isApprove ? 'success' : 'danger'
    );
}

/**
 * DOCTOR: Load pending payment requests
 */
async function loadDoctorPaymentRequests(countOnly = false) {
    const doctorId = localStorage.getItem('userId');
    if (!doctorId) return;

    try {
        const { status, data } = await fetchApi(`/api/payment/doctor-requests?doctor_id=${doctorId}`, 'GET');
        
        if (status === 'success') {
            // Update sidebar badge
            const badge = document.querySelector('#nav-payments .nav-badge');
            if (data.length > 0) {
                if (badge) {
                    badge.textContent = data.length;
                } else {
                    const newBadge = document.createElement('span');
                    newBadge.className = 'nav-badge';
                    newBadge.textContent = data.length;
                    document.getElementById('nav-payments')?.appendChild(newBadge);
                }
            } else if (badge) {
                badge.remove();
            }

            if (countOnly) return;

            const container = document.getElementById('pendingPaymentsList');
            if (!container) return;

            if (data.length === 0) {
                container.innerHTML = `<p class="text-muted" style="padding:1rem;">No pending payment verifications.</p>`;
                return;
            }

            container.innerHTML = data.map(p => `
                <div class="glass" style="padding: 1.25rem; border-radius: 12px; margin-bottom: 1rem; border: 1px solid rgba(255,255,255,0.05);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
                        <div>
                            <div style="font-weight: 700; font-size: 1.1rem; color: var(--primary); margin-bottom: 0.25rem;">${p.patient_name}</div>
                            <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem;">
                                <i class="fa-solid fa-calendar-day" style="margin-right:4px;"></i> ${p.slot_date} at ${p.start_time}
                            </div>
                            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                                <div class="glass" style="padding: 0.5rem 0.75rem; border-radius: 8px; font-size: 0.8rem;">
                                    <span style="color:var(--text-muted);">Method:</span> <span style="font-weight:600; text-transform:uppercase;">${p.payment_method}</span>
                                </div>
                                <div class="glass" style="padding: 0.5rem 0.75rem; border-radius: 8px; font-size: 0.8rem;">
                                    <span style="color:var(--text-muted);">TxID:</span> <span style="font-weight:600; color:#10b981;">${p.transaction_id || 'N/A'}</span>
                                </div>
                                <div class="glass" style="padding: 0.5rem 0.75rem; border-radius: 8px; font-size: 0.8rem;">
                                    <span style="color:var(--text-muted);">Phone:</span> <span style="font-weight:600;">${p.phone_number || 'N/A'}</span>
                                </div>
                                <div class="glass" style="padding: 0.5rem 0.75rem; border-radius: 8px; font-size: 0.8rem;">
                                    <span style="color:var(--text-muted);">Amount:</span> <span style="font-weight:600; color:var(--primary);">৳${p.amount}</span>
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 0.75rem;">
                            <button class="btn btn-outline" style="padding: 0.5rem 1rem; border-color: #ef4444; color: #ef4444; font-size: 0.85rem;" onclick="verifyPaymentByDoctor(${p.appointment_id}, 'rejected')">
                                <i class="fa-solid fa-xmark"></i> Reject
                            </button>
                            <button class="btn btn-primary" style="padding: 0.5rem 1.25rem; font-size: 0.85rem;" onclick="verifyPaymentByDoctor(${p.appointment_id}, 'confirmed')">
                                <i class="fa-solid fa-check"></i> Approve
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error('Error loading payment requests:', err);
    }
}

/**
 * DOCTOR: Verify a payment
 */
async function verifyPaymentByDoctor(appointmentId, status) {
    const isApprove = status === 'confirmed';
    if (!confirm(`Are you sure you want to ${isApprove ? 'APPROVE' : 'REJECT'} this payment?`)) return;

    try {
        const result = await fetchApi('/api/payment/verify-doctor', 'POST', { appointment_id: appointmentId, status });
        
        if (result.status === 'success') {
            showToast(isApprove ? 'Payment verified and appointment confirmed!' : 'Payment rejected.', isApprove ? 'success' : 'warning');
            loadDoctorPaymentRequests();
        }
    } catch (err) {
        console.error('Error verifying payment:', err);
        showToast('Verification failed.', 'error');
    }
}

/* =========================================================
   SUPPORT MESSAGING SYSTEM — Shared Logic
   ========================================================= */

let currentActiveTicketId = null;

/**
 * PATIENT: Submit a new support ticket
 */
async function submitSupportTicket() {
    const userId = localStorage.getItem('userId');
    const subject = document.getElementById('supportSubject').value;
    const message = document.getElementById('supportMessage').value;
    
    if (!subject || !message) {
        showToast("Subject and Message are required.", "warning");
        return;
    }
    
    try {
        const result = await fetchApi('/api/support/create', 'POST', {
            user_id: userId,
            subject: subject,
            message: message
        });
        
        if (result.status === 'success') {
            showToast("Support ticket created! Auto-reply sent.", "success");
            document.getElementById('supportModal').style.display = 'none';
            document.getElementById('supportSubject').value = '';
            document.getElementById('supportMessage').value = '';
            loadSupportTickets(); // Refresh list
        } else {
            showToast(result.message, "error");
        }
    } catch (err) {
        showToast("Failed to create ticket.", "error");
    }
}

/**
 * PATIENT: Load user's tickets
 */
async function loadSupportTickets() {
    const userId = localStorage.getItem('userId');
    const list = document.getElementById('ticketList');
    if (!list) return;
    
    list.innerHTML = '<p class="text-muted">Loading your tickets...</p>';
    
    try {
        const { status, data } = await fetchApi(`/api/support/my-tickets?user_id=${userId}`, 'GET');
        
        if (status === 'success') {
            if (data.length === 0) {
                list.innerHTML = '<p class="text-muted">You haven\'t created any support tickets yet.</p>';
                return;
            }
            
            list.innerHTML = data.map(t => `
                <div class="glass" style="padding: 1.25rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); cursor: pointer;" onclick="openConversation(${t.id}, '${t.subject.replace(/'/g, "\\'")}', '${t.status}')">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                        <h4 style="margin:0;">${t.subject}</h4>
                        <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; padding: 0.2rem 0.6rem; border-radius: 999px; 
                                     background: ${t.status === 'open' ? 'rgba(56,189,248,0.1)' : 'rgba(16,185,129,0.1)'};
                                     color: ${t.status === 'open' ? '#38bdf8' : '#10b981'};">
                            ${t.status}
                        </span>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);"><i class="fa-regular fa-clock" style="margin-right: 4px;"></i> ${formatDate(t.created_at)}</div>
                </div>
            `).join('');
        }
    } catch (err) {
        list.innerHTML = '<p style="color:#ef4444;">Failed to load tickets.</p>';
    }
}

/**
 * PATIENT: View conversation detail
 */
async function openConversation(ticketId, subject, status) {
    currentActiveTicketId = ticketId;
    const modal = document.getElementById('conversationModal');
    const subEl = document.getElementById('convSubject');
    const msgEl = document.getElementById('convMessages');
    const statusEl = document.getElementById('ticketStatusLabel');
    
    if (!modal) return;
    
    subEl.innerText = subject;
    statusEl.innerText = status;
    statusEl.style.color = status === 'open' ? '#38bdf8' : '#10b981';
    msgEl.innerHTML = '<p style="text-align:center;">Loading conversation...</p>';
    modal.style.display = 'flex';
    
    try {
        const result = await fetchApi(`/api/support/ticket/${ticketId}`, 'GET');
        if (result.status === 'success') {
            const messages = result.data.messages;
            msgEl.innerHTML = messages.map(m => {
                const isAdmin = m.sender_role === 'admin';
                return `
                    <div style="max-width: 80%; padding: 0.8rem 1rem; border-radius: 12px; font-size: 0.9rem;
                                 align-self: ${isAdmin ? 'flex-start' : 'flex-end'};
                                 background: ${isAdmin ? 'rgba(139,92,246,0.15)' : 'var(--primary)'};
                                 border: 1px solid ${isAdmin ? 'rgba(139,92,246,0.3)' : 'transparent'};
                                 color: ${isAdmin ? 'var(--text-main)' : 'white'};">
                        ${m.message}
                        ${m.is_auto ? '<div style="font-size: 0.7rem; opacity: 0.6; margin-top: 4px;">Auto-reply</div>' : ''}
                        <div style="font-size: 0.65rem; opacity: 0.5; margin-top: 4px; text-align: right;">${new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </div>
                `;
            }).join('');
            msgEl.scrollTop = msgEl.scrollHeight;
        }
    } catch (err) {
        msgEl.innerHTML = '<p style="color:#ef4444;">Failed to load messages.</p>';
    }
}

/**
 * PATIENT: Submit a reply to a ticket
 */
async function submitPatientReply() {
    if (!currentActiveTicketId) return;
    
    const message = document.getElementById('patientReplyText').value;
    if (!message) return;
    
    try {
        const result = await fetchApi('/api/support/reply', 'POST', {
            ticket_id: currentActiveTicketId,
            message: message
        });
        
        if (result.status === 'success') {
            document.getElementById('patientReplyText').value = '';
            // Refresh conversation
            const subject = document.getElementById('convSubject').innerText;
            const status = document.getElementById('ticketStatusLabel').innerText;
            openConversation(currentActiveTicketId, subject, status);
        } else {
            showToast(result.message, "error");
        }
    } catch (err) {
        showToast("Failed to send reply.", "error");
    }
}

/* =========================================================
   ADMIN: Support Management
   ========================================================= */

let activeTicketId = null;

async function renderAdminSupportView() {
    // Show support view, hide main data card
    document.getElementById('mainDataCard').style.display = 'none';
    document.getElementById('adminSupportView').style.display = 'block';
    
    loadAdminTickets();
}

async function loadAdminTickets() {
    const list = document.getElementById('adminTicketList');
    if (!list) return;
    
    try {
        const { status, data } = await fetchApi('/api/admin/support/tickets', 'GET');
        
        if (status === 'success') {
            if (data.length === 0) {
                list.innerHTML = '<p class="text-muted" style="text-align:center; padding: 2rem;">No support tickets found.</p>';
                return;
            }
            
            list.innerHTML = data.map(t => `
                <div class="glass" style="padding: 1rem; border-radius: 12px; border: 1px solid ${activeTicketId == t.id ? 'var(--primary)' : 'rgba(255,255,255,0.05)'}; cursor: pointer; transition: all 0.2s;" 
                     onclick="viewTicket(${t.id}, '${t.subject.replace(/'/g, "\\'")}', '${t.user_name.replace(/'/g, "\\'")}')">
                    <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 0.25rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${t.subject}</div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.8rem; color: var(--text-muted);">${t.user_name}</span>
                        <span style="font-size: 0.7rem; font-weight: 700; text-transform: uppercase; padding: 0.15rem 0.5rem; border-radius: 999px; 
                                     background: ${t.status === 'open' ? 'rgba(56,189,248,0.1)' : 'rgba(16,185,129,0.1)'};
                                     color: ${t.status === 'open' ? '#38bdf8' : '#10b981'};">
                            ${t.status}
                        </span>
                    </div>
                </div>
            `).join('');
        }
    } catch (err) {
        list.innerHTML = '<p style="color:#ef4444; text-align:center; padding: 1rem;">Failed to load tickets.</p>';
    }
}

async function viewTicket(ticketId, subject, patientName) {
    activeTicketId = ticketId;
    
    // UI states
    document.getElementById('chatPlaceholder').style.display = 'none';
    document.getElementById('chatHeader').style.display = 'block';
    document.getElementById('chatMessages').style.display = 'flex';
    document.getElementById('chatInputArea').style.display = 'flex';
    
    document.getElementById('chatSubject').innerText = subject;
    document.getElementById('chatPatientName').innerText = patientName;
    
    // Refresh list to show active selection
    loadAdminTickets();
    
    const msgEl = document.getElementById('chatMessages');
    msgEl.innerHTML = '<p style="text-align:center; padding: 2rem;">Loading conversation...</p>';
    
    try {
        const result = await fetchApi(`/api/support/ticket/${ticketId}`, 'GET');
        if (result.status === 'success') {
            const messages = result.data.messages;
            msgEl.innerHTML = messages.map(m => {
                const isAdmin = m.sender_role === 'admin';
                return `
                    <div style="max-width: 85%; padding: 0.8rem 1rem; border-radius: 12px; font-size: 0.9rem;
                                 align-self: ${isAdmin ? 'flex-end' : 'flex-start'};
                                 background: ${isAdmin ? 'var(--primary)' : 'rgba(255,255,255,0.05)'};
                                 border: 1px solid ${isAdmin ? 'transparent' : 'rgba(255,255,255,0.1)'};
                                 color: ${isAdmin ? 'white' : 'var(--text-main)'};">
                        ${m.message}
                        ${m.is_auto ? '<div style="font-size: 0.7rem; opacity: 0.6; margin-top: 4px;">Auto-reply</div>' : ''}
                        <div style="font-size: 0.65rem; opacity: 0.5; margin-top: 4px; text-align: right;">${new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </div>
                `;
            }).join('');
            msgEl.scrollTop = msgEl.scrollHeight;
        }
    } catch (err) {
        msgEl.innerHTML = '<p style="color:#ef4444; text-align:center; padding: 2rem;">Failed to load messages.</p>';
    }
}

async function submitAdminReply() {
    if (!activeTicketId) return;
    
    const message = document.getElementById('adminReplyText').value;
    if (!message) return;
    
    try {
        const result = await fetchApi('/api/admin/support/reply', 'POST', {
            ticket_id: activeTicketId,
            message: message
        });
        
        if (result.status === 'success') {
            showToast("Reply sent and ticket resolved.", "success");
            document.getElementById('adminReplyText').value = '';
            // Refresh conversation and list
            const currentTicket = activeTicketId;
            const subject = document.getElementById('chatSubject').innerText;
            const name = document.getElementById('chatPatientName').innerText;
            viewTicket(currentTicket, subject, name);
        } else {
            showToast(result.message, "error");
        }
    } catch (err) {
        showToast("Failed to send reply.", "error");
    }
}

