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
    document.getElementById('statPendingCard')?.addEventListener('click', () => {
        activateNav(null, 'sidebarPatients');
        renderPatientsView();
    });
}

function setupAdminNav() {
    const routes = {
        overviewBtn:     () => { activateNav('overviewBtn', 'sidebarPending');  renderPendingView();          },
        totalDoctorsBtn: () => { activateNav('totalDoctorsBtn', null);           renderApprovedDoctorsView();  },
        sidebarPending:  () => { activateNav('overviewBtn', 'sidebarPending');  renderPendingView();          },
        sidebarPatients: () => { activateNav(null, 'sidebarPatients');           renderPatientsView();         },
        sidebarMessages: () => { activateNav(null, 'sidebarMessages');           renderComingSoon('Messages', 'fa-envelope'); },
        sidebarSettings: () => { activateNav(null, 'sidebarSettings');           renderComingSoon('Settings',  'fa-gear');    },
    };
    Object.entries(routes).forEach(([id, fn]) => document.getElementById(id)?.addEventListener('click', fn));
}

function activateNav(topId, sideId) {
    document.querySelectorAll('.top-nav-btn, .nav-item').forEach(el => el.classList.remove('active'));
    if (topId)  document.getElementById(topId)?.classList.add('active');
    if (sideId) document.getElementById(sideId)?.classList.add('active');
}

/* ---- Stats ---- */
async function loadAdminStats() {
    try {
        const { status, data } = await fetchApi('/api/admin/stats', 'GET');
        if (status === 'success') {
            animateCount('patientCount',    data.patients);
            animateCount('doctorCount',     data.doctors);
            animateCount('pendingApprovals', data.pending);
        }
    } catch {
        ['patientCount','doctorCount','pendingApprovals'].forEach(id => {
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

/* ---- Patients View ---- */
async function renderPatientsView() {
    const card = document.getElementById('mainDataCard');
    if (!card) return;

    card.innerHTML = `
        <h2 style="margin-bottom:1.5rem;display:flex;align-items:center;gap:0.75rem;">
            <i class="fa-solid fa-users" style="color:var(--primary);"></i>
            Registered Patients
        </h2>
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;min-width:520px;">
                <thead>
                    <tr style="border-bottom:1px solid var(--glass-border);text-align:left;">
                        <th style="padding:1rem;color:var(--text-muted);font-weight:600;">Patient</th>
                        <th style="padding:1rem;color:var(--text-muted);font-weight:600;">Email</th>
                        <th style="padding:1rem;color:var(--text-muted);font-weight:600;">Joined</th>
                        <th style="padding:1rem;color:var(--text-muted);font-weight:600;">Status</th>
                    </tr>
                </thead>
                <tbody id="adminTableBody">
                    <tr><td colspan="4" style="padding:3.5rem;text-align:center;color:var(--text-muted);">
                        <i class="fa-solid fa-circle-notch fa-spin" style="font-size:2rem;margin-bottom:0.75rem;display:block;"></i>
                        Loading patients...
                    </td></tr>
                </tbody>
            </table>
        </div>`;

    try {
        const { status, data } = await fetchApi('/api/admin/patients', 'GET');
        const tbody = document.getElementById('adminTableBody');
        if (!tbody) return;

        if (status === 'success' && data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="padding:3.5rem;text-align:center;color:var(--text-muted);">
                <i class="fa-solid fa-users" style="font-size:2.5rem;margin-bottom:0.75rem;display:block;opacity:0.3;"></i>
                No patients registered yet.
            </td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(p => `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);transition:background 0.2s;"
                onmouseover="this.style.background='rgba(14,165,233,0.05)'"
                onmouseout="this.style.background='transparent'">
                <td style="padding:1rem;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div style="width:42px;height:42px;border-radius:50%;flex-shrink:0;
                                    background:linear-gradient(135deg,var(--primary),var(--secondary));
                                    display:flex;align-items:center;justify-content:center;
                                    font-weight:700;font-size:0.85rem;color:white;">
                            ${initials(p.name)}
                        </div>
                        <div style="font-weight:600;">${p.name}</div>
                    </div>
                </td>
                <td style="padding:1rem;color:var(--text-muted);font-size:0.9rem;">${p.email}</td>
                <td style="padding:1rem;color:var(--text-muted);font-size:0.9rem;">${formatDate(p.created_at)}</td>
                <td style="padding:1rem;">
                    <span style="padding:0.3rem 0.75rem;border-radius:999px;font-size:0.78rem;font-weight:600;
                                 color:#10b981;border:1px solid rgba(16,185,129,0.3);background:rgba(16,185,129,0.08);">
                        <i class="fa-solid fa-circle-check" style="font-size:0.7rem;margin-right:3px;"></i>Active
                    </span>
                </td>
            </tr>`).join('');
    } catch {
        const tbody = document.getElementById('adminTableBody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="4" style="padding:2.5rem;text-align:center;color:#ef4444;">
            <i class="fa-solid fa-triangle-exclamation" style="margin-right:0.5rem;"></i>
            Error loading patients. Check server connection.
        </td></tr>`;
    }
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
    document.getElementById('overviewBtn')?.addEventListener('click', () => location.reload());
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
                        <button onclick="openBookingModal(${doc.user_id}, '${doc.doctor_name.replace(/'/g, "\\'")}')" class="btn btn-primary" style="padding:0.6rem 1.25rem;font-weight:700;border-radius:999px;">Book Now</button>
                    </div>
                </div>`;
            }).join('');
        }
    } catch (err) {
        console.error('Error loading doctors:', err);
        listContainer.innerHTML = '<p style="color:#ef4444;">Could not load specialist directory. Please try again later.</p>';
    }
}

async function openBookingModal(doctorId, doctorName) {
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
                    <button onclick="bookAppointment(${doctorId}, ${slot.id})" class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.85rem;">Book This Slot</button>
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

async function bookAppointment(doctorId, slotId) {
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
        
        const { status, message, queue_position } = await fetchApi('/api/appointment/book', 'POST', payload);
        
        if (status === 'success') {
            alert(`Appointment booked successfully!\nYour Queue Position is: ${queue_position}`);
            showToast('Appointment booked successfully!', 'success');
            closeBookingModal();
        } else {
            showToast(message || 'Failed to book slot.', 'error');
        }
    } catch(err) {
        showToast('Error booking slot. Please try again.', 'error');
    }
}

/* =========================================================
   DOCTOR DASHBOARD — Slot Management
   ========================================================= */
function initDoctorDashboard() {
    document.getElementById('overviewBtn')?.addEventListener('click', () => location.reload());

    // Navigation logic
    const navSchedule = document.getElementById('nav-schedule');
    const navPatients = document.getElementById('nav-patients');
    
    if (navSchedule && navPatients) {
        navSchedule.addEventListener('click', () => switchDoctorView('schedule'));
        navPatients.addEventListener('click', () => switchDoctorView('patients'));
    }

    // Load existing slots on init
    loadSlots();
    // Load appointments
    loadDoctorAppointments();

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
    const navSchedule = document.getElementById('nav-schedule');
    const navPatients = document.getElementById('nav-patients');
    const viewSchedule = document.getElementById('scheduleViewContainer');
    const viewPatients = document.getElementById('patientsViewContainer');

    if (viewName === 'schedule') {
        navSchedule.classList.add('active');
        navPatients.classList.remove('active');
        viewSchedule.style.display = 'block';
        viewPatients.style.display = 'none';
        
        loadDoctorAppointments(); // Refresh on tab switch
    } else if (viewName === 'patients') {
        navPatients.classList.add('active');
        navSchedule.classList.remove('active');
        viewPatients.style.display = 'block';
        viewSchedule.style.display = 'none';
        
        loadMyPatients();
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
