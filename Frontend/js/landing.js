// Use relative path to root since index.html is in /Frontend/
const REL_BASE = '../';

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
        const response = await fetch(`${REL_BASE}api/doctors`);
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
        // Fix duplicate Dr. prefix
        let displayName = doc.doctor_name;
        if (displayName.toLowerCase().startsWith('dr.')) {
            displayName = displayName.substring(3).trim();
        }

        // Ensure image path is correctly resolved relative to the root
        let photoPath = (doc.profile_photo && doc.profile_photo.length > 0) ? doc.profile_photo : '';
        
        if (photoPath) {
            // Remove leading slashes or ../ if they exist in the DB (for cleanup)
            photoPath = photoPath.replace(/^\/+/, '').replace(/^\.\.\/+/, '');
            photoPath = `${REL_BASE}${photoPath}`;
        } else {
            photoPath = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0ea5e9&color=fff&size=128`;
        }
        
        const card = document.createElement('div');
        card.className = 'doctor-card';
        card.style.margin = '10px'; // Add some breathing room in the grid
        
        const qualification = doc.qualification && doc.qualification.trim() !== "" ? doc.qualification : "Clinical Professional";
        const fee = (doc.consultation_fee && parseFloat(doc.consultation_fee) > 0) ? `৳${doc.consultation_fee}` : "Consultation Fee TBD";
        const phone = doc.phone || "Contact Not Set";

        card.innerHTML = `
            <div class="doctor-card-img-container" style="margin: 0 auto;">
                <img src="${photoPath}" alt="${displayName}" class="doctor-card-img" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0ea5e9&color=fff'">
            </div>
            
            <div class="doctor-card-info" style="text-align: center;">
                <h3 style="margin-bottom: 0.25rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                    Dr. ${displayName}
                    <i class="fa-solid fa-circle-check" style="color: #0ea5e9; font-size: 1rem;" title="Verified Professional"></i>
                </h3>
                <div class="specialty" style="color: var(--primary); font-weight: 700; font-size: 0.8rem; letter-spacing: 1px; text-transform: uppercase; background: rgba(14, 165, 233, 0.1); padding: 0.2rem 0.75rem; border-radius: 999px; display: inline-block;">${doc.specialization}</div>
            </div>

            <div class="doctor-card-stats" style="text-align: left; margin-top: 0.5rem;">
                <div class="stat-item" style="padding: 0.75rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.75rem; transition: all 0.2s;">
                    <i class="fa-solid fa-graduation-cap" style="color: var(--primary); font-size: 1.1rem;"></i>
                    <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 500;">${qualification}</span>
                </div>
                <div class="stat-item" style="padding: 0.75rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; display: flex; align-items: center; gap: 0.75rem; transition: all 0.2s;">
                    <i class="fa-solid fa-clock-rotate-left" style="color: var(--primary); font-size: 1.1rem;"></i>
                    <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 500;">${doc.experience} Years Experience</span>
                </div>
                <div class="stat-item" style="padding: 0.75rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; display: flex; align-items: center; gap: 0.75rem; transition: all 0.2s;">
                    <i class="fa-solid fa-phone" style="color: var(--primary); font-size: 1.1rem;"></i>
                    <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 500;">${phone}</span>
                </div>
            </div>

            <div class="doctor-card-footer" style="padding-top: 1.25rem; margin-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <div class="price-tag">
                    <span style="font-size: 0.7rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 0.2rem;">Consultation Fee</span>
                    <span style="font-weight: 800; color: #10b981; font-size: 1.4rem;">${fee}</span>
                </div>
                <a href="signup.html?role=patient" class="btn btn-primary" style="padding: 0.7rem 1.5rem; font-weight: 700; border-radius: 12px; font-size: 0.9rem; box-shadow: 0 4px 12px rgba(14, 165, 233, 0.2);">
                    Book Now
                </a>
            </div>
        `;
        
        doctorsList.appendChild(card);
    });
}
