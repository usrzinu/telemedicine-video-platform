/**
 * LANDING PAGE JS
 * Handles dynamic content loading for the landing page.
 */

document.addEventListener('DOMContentLoaded', () => {
    fetchDoctors();
});

/**
 * Fetch and render approved doctors
 */
async function fetchDoctors() {
    const doctorsList = document.getElementById('doctors-list');
    if (!doctorsList) return;

    try {
        const response = await fetch('/api/doctors');
        const result = await response.json();

        if (result.status === 'success' && result.data.length > 0) {
            renderDoctors(result.data);
        } else {
            doctorsList.innerHTML = `
                <div class="glass-card glass" style="text-align: center; padding: 2rem; grid-column: 1 / -1;">
                    <p style="color: var(--text-muted);">No verified doctors are currently listed. Check back soon!</p>
                </div>
            `;
        }
    } catch (error) {
        console.error("Error fetching doctors:", error);
        doctorsList.innerHTML = `
            <div class="glass-card glass" style="text-align: center; padding: 2rem; grid-column: 1 / -1; border-color: rgba(239, 68, 68, 0.2);">
                <p style="color: #f87171;">Failed to load doctors. Please refresh the page.</p>
            </div>
        `;
    }
}

/**
 * Render doctor cards with the premium redesign
 */
function renderDoctors(doctors) {
    const doctorsList = document.getElementById('doctors-list');
    doctorsList.innerHTML = ''; // Clear loading message

    doctors.forEach(doc => {
        // Ensure image path is root-relative (e.g., /backend/uploads/...)
        const photoPath = (doc.profile_photo && doc.profile_photo.length > 0) 
            ? (doc.profile_photo.startsWith('/') ? doc.profile_photo : '/' + doc.profile_photo)
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.doctor_name)}&background=0ea5e9&color=fff&size=128`;
        
        const card = document.createElement('div');
        card.className = 'doctor-card';
        card.style.margin = '10px'; // Add some breathing room in the grid
        
        card.innerHTML = `
            <div class="doctor-card-img-container" style="margin: 0 auto;">
                <img src="${photoPath}" alt="${doc.doctor_name}" class="doctor-card-img" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(doc.doctor_name)}&background=0ea5e9&color=fff'">
            </div>
            
            <div class="doctor-card-info" style="text-align: center;">
                <h3 style="margin-bottom: 0.25rem;">Dr. ${doc.doctor_name}</h3>
                <div class="specialty" style="color: var(--primary); font-weight: 600; font-size: 0.85rem; text-transform: uppercase;">${doc.specialization}</div>
            </div>

            <div class="doctor-card-stats" style="text-align: left;">
                <div class="stat-item" style="padding: 0.6rem; background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.75rem;">
                    <i class="fa-solid fa-graduation-cap" style="color: var(--primary);"></i>
                    <span style="font-size: 0.85rem; color: var(--text-muted);">${doc.qualification}</span>
                </div>
                <div class="stat-item" style="padding: 0.6rem; background: rgba(255,255,255,0.03); border-radius: 8px; display: flex; align-items: center; gap: 0.75rem;">
                    <i class="fa-solid fa-briefcase-medical" style="color: var(--primary);"></i>
                    <span style="font-size: 0.85rem; color: var(--text-muted);">${doc.experience} Years Experience</span>
                </div>
            </div>

            <div class="doctor-card-footer" style="padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <div class="price-tag">
                    <span style="font-size: 0.7rem; color: var(--text-muted); display: block;">Consultation Fee</span>
                    <span style="font-weight: 800; color: #10b981; font-size: 1.25rem;">৳${doc.consultation_fee}</span>
                </div>
                <a href="signup.html?role=patient" class="btn btn-primary" style="padding: 0.6rem 1.25rem; font-weight: 700; border-radius: 999px; font-size: 0.85rem;">
                    Book Now
                </a>
            </div>
        `;
        
        doctorsList.appendChild(card);
    });
}
