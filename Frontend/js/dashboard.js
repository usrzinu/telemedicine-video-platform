/**
 * AuraMed Dashboard Controller
 * Handles dynamic data loading for Admin, Doctor, and Patient dashboards.
 */

document.addEventListener('DOMContentLoaded', () => {
    const userRole = localStorage.getItem('userRole');
    const userId = localStorage.getItem('userId');
    const userName = localStorage.getItem('userName');

    // Update Welcome Message
    const welcomeMsg = document.getElementById('welcomeMsg');
    if (welcomeMsg) {
        welcomeMsg.innerText = userRole === 'doctor' ? `Welcome, Dr. ${userName}` : `Welcome, ${userName}`;
    }

    // Global Logout Listener for Top Nav
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = 'index.html';
        });
    }

    // Initialize based on role
    if (userRole === 'admin') {
        initAdminDashboard();
    } else if (userRole === 'doctor') {
        initDoctorDashboard();
    } else if (userRole === 'patient') {
        initPatientDashboard();
    }
});

/**
 * ADMIN DASHBOARD LOGIC
 */
async function initAdminDashboard() {
    loadAdminStats();
    loadPendingDoctors();

    // Handle Overview button
    const overviewBtn = document.getElementById('overviewBtn');
    if (overviewBtn) {
        overviewBtn.addEventListener('click', () => {
            loadPendingDoctors();
            
            // Restore header if it was changed
            const tableHeader = document.querySelector('.data-card h2');
            if (tableHeader) {
                tableHeader.innerHTML = '<i class="fa-solid fa-clipboard-check" style="color: var(--primary);"></i> Doctor Approval Queue';
            }

            // Toggle active state
            document.querySelectorAll('.top-nav-btn').forEach(b => b.classList.remove('active'));
            overviewBtn.classList.add('active');
        });
    }

    // Handle Total Doctors button
    const totalDocsBtn = document.getElementById('totalDoctorsBtn');
    if (totalDocsBtn) {
        totalDocsBtn.addEventListener('click', () => {
            showApprovedDoctorsList();
            
            // Toggle active state
            document.querySelectorAll('.top-nav-btn').forEach(b => b.classList.remove('active'));
            totalDocsBtn.classList.add('active');
        });
    }
}

async function loadAdminStats() {
    try {
        const data = await fetchApi('/api/admin/stats', 'GET');
        
        if (data.status === 'success') {
            document.getElementById('patientCount').innerText = data.data.patients;
            document.getElementById('doctorCount').innerText = data.data.doctors;
            document.getElementById('pendingApprovals').innerText = data.data.pending;
        }
    } catch (err) {
        console.error('Error loading stats:', err);
        document.getElementById('patientCount').innerText = 'err';
        document.getElementById('doctorCount').innerText = 'err';
        document.getElementById('pendingApprovals').innerText = 'err';
    }
}

async function loadPendingDoctors() {
    const tableBody = document.getElementById('pendingDoctorsTable');
    if (!tableBody) return;

    try {
        const data = await fetchApi('/api/admin/pending', 'GET');
        
        if (data.status === 'success') {
            const pending = data.data;
            if (pending.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5" style="padding: 2rem; text-align: center; color: var(--text-muted);">No pending applications found.</td></tr>';
                return;
            }

            tableBody.innerHTML = pending.map(doc => `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="padding: 1rem;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <img src="${doc.profile_photo}" alt="Profile" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary);">
                            <div>
                                <div style="font-weight: 600;">${doc.doctor_name}</div>
                                <div style="font-size: 0.8rem; color: var(--text-muted);">${doc.email}</div>
                            </div>
                        </div>
                    </td>
                    <td style="padding: 1rem;">${doc.specialization}</td>
                    <td style="padding: 1rem;">${doc.experience} Years</td>
                    <td style="padding: 1rem;">
                        <a href="${doc.license_file}" target="_blank" style="color: var(--secondary); font-size: 0.9rem;">
                            <i class="fa-solid fa-file-pdf"></i> View License
                        </a>
                    </td>
                    <td style="padding: 1rem;">
                        <div style="display: flex; gap: 10px;">
                            <button onclick="updateDoctorStatus(${doc.id}, 'approved')" class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; background: #10b981;">Approve</button>
                            <button onclick="updateDoctorStatus(${doc.id}, 'rejected')" class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; border-color: #ef4444; color: #ef4444;">Reject</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error('Error loading applications:', err);
        tableBody.innerHTML = '<tr><td colspan="5" style="padding: 2rem; text-align: center; color: #ef4444;">Error: Internal Server Failure or API Mismatch.</td></tr>';
    }
}

async function updateDoctorStatus(id, status) {
    if (!confirm(`Are you sure you want to ${status} this doctor?`)) return;

    try {
        const data = await fetchApi('/api/admin/update-status', 'POST', { id, status });
        
        if (data.status === 'success') {
            alert(data.message);
            initAdminDashboard(); // Refresh
        } else {
            alert('Error: ' + data.message);
        }
    } catch (err) {
        alert('Failed to update status.');
    }
}

/**
 * Show list of approved doctors for admin
 */
async function showApprovedDoctorsList() {
    const tableBody = document.getElementById('pendingDoctorsTable');
    const tableHeader = document.querySelector('.data-card h2');
    if (!tableBody) return;

    if(tableHeader) {
        tableHeader.innerHTML = '<i class="fa-solid fa-user-doctor" style="color: var(--secondary);"></i> Approved Medical Providers';
    }

    try {
        const data = await fetchApi('/api/doctors', 'GET');
        if (data.status === 'success') {
            const doctors = data.data;
            if (doctors.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5" style="padding: 2rem; text-align: center; color: var(--text-muted);">No approved doctors in the system.</td></tr>';
                return;
            }

            tableBody.innerHTML = doctors.map(doc => `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="padding: 1rem;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <img src="${doc.profile_photo}" alt="Profile" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--secondary);">
                            <div>
                                <div style="font-weight: 600;">${doc.doctor_name || doc.name}</div>
                                <div style="font-size: 0.8rem; color: var(--text-muted);">${doc.email}</div>
                            </div>
                        </div>
                    </td>
                    <td style="padding: 1rem;">${doc.specialization}</td>
                    <td style="padding: 1rem;">${doc.experience} Years</td>
                    <td style="padding: 1rem;">
                        <span class="glass" style="padding: 0.3rem 0.6rem; border-radius: 5px; font-size: 0.75rem; color: #10b981; border: 1px solid #10b981;">
                            <i class="fa-solid fa-check-double"></i> Approved
                        </span>
                    </td>
                    <td style="padding: 1rem;">
                        <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">View Profile</button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (err) {
        tableBody.innerHTML = '<tr><td colspan="5" style="padding: 2rem; text-align: center; color: #ef4444;">Error loading approved doctors.</td></tr>';
    }
}

/**
 * PATIENT DASHBOARD LOGIC
 */
async function initPatientDashboard() {
    // For now, patient dashboard just shows approved doctors
    loadApprovedDoctors();
}

async function loadApprovedDoctors() {
    const listContainer = document.getElementById('doctorList');
    if (!listContainer) return;

    try {
        const data = await fetchApi('/api/doctors', 'GET');
        if (data.status === 'success') {
            const doctors = data.data;
            if (doctors.length === 0) {
                listContainer.innerHTML = '<p class="text-muted">No specialists are currently available.</p>';
                return;
            }

            listContainer.innerHTML = doctors.map(doc => {
                // Ensure image path is root-relative (e.g., /backend/uploads/...)
                const photoPath = doc.profile_photo.startsWith('/') ? doc.profile_photo : '/' + doc.profile_photo;
                
                return `
                <div class="doctor-card">
                    <div class="doctor-card-img-container">
                        <img src="${photoPath}" alt="${doc.doctor_name}" class="doctor-card-img" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(doc.doctor_name)}&background=0ea5e9&color=fff'">
                    </div>
                    
                    <div class="doctor-card-info">
                        <h3>Dr. ${doc.doctor_name}</h3>
                        <div class="specialty">${doc.specialization}</div>
                    </div>

                    <div class="doctor-card-stats">
                        <div class="stat-item">
                            <i class="fa-solid fa-graduation-cap"></i>
                            <div>
                                <span style="display: block; font-weight: 600; color: var(--text-main);">${doc.qualification}</span>
                            </div>
                        </div>
                        <div class="stat-item">
                            <i class="fa-solid fa-briefcase-medical"></i>
                            <div>
                                <span style="display: block; font-weight: 600; color: var(--text-main);">${doc.experience} Years Experience</span>
                            </div>
                        </div>
                    </div>

                    <div class="doctor-card-footer">
                        <div class="price-tag">
                            <span class="label">Consultation Fee</span>
                            <span class="amount">৳${doc.consultation_fee}</span>
                        </div>
                        <button class="btn btn-primary" style="padding: 0.6rem 1.25rem; font-weight: 700; border-radius: 999px;">
                            Book Now
                        </button>
                    </div>
                </div>
            `}).join('');
        }
    } catch (err) {
        console.error('Error loading doctors:', err);
        listContainer.innerHTML = '<p class="text-muted" style="color: #ef4444;">Could not load specialist directory. Please try again later.</p>';
    }
}
    // Handle Overview button for Patients
    const overviewBtn = document.getElementById('overviewBtn');
    if (overviewBtn) {
        overviewBtn.addEventListener('click', () => location.reload());
    }

/**
 * DOCTOR DASHBOARD LOGIC
 */
function initDoctorDashboard() {
    // Handle Overview button for Doctors
    const overviewBtn = document.getElementById('overviewBtn');
    if (overviewBtn) {
        overviewBtn.addEventListener('click', () => location.reload());
    }

    console.log("Doctor dashboard initialized.");
}

/**
 * Generic API Fetch Helper
 */
async function fetchApi(endpoint, method, body = null) {
    const options = {
        method: method,
        headers: { 'Accept': 'application/json' }
    };

    if (body) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    }

    // Use empty base because endpoints like '/api/admin/stats' already contain the full URI
    const baseUrl = ''; 
    const response = await fetch(baseUrl + endpoint, options);
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
}
