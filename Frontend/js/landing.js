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
 * Render doctor cards
 */
function renderDoctors(doctors) {
    const doctorsList = document.getElementById('doctors-list');
    doctorsList.innerHTML = ''; // Clear loading message

    doctors.forEach(doc => {
        const photo = doc.profile_photo || 'https://via.placeholder.com/150?text=Dr.+' + encodeURIComponent(doc.doctor_name);
        
        const card = document.createElement('div');
        card.className = 'feature-card glass-card glass';
        card.style.textAlign = 'center';
        card.style.padding = '2rem';
        
        card.innerHTML = `
            <div style="width: 100px; height: 100px; border-radius: 50%; overflow: hidden; margin: 0 auto 1.5rem; border: 3px solid var(--primary);">
                <img src="${photo}" alt="${doc.doctor_name}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            <h3 style="margin-bottom: 0.5rem;">${doc.doctor_name}</h3>
            <p style="color: var(--primary); font-weight: 600; margin-bottom: 0.5rem;">${doc.specialization}</p>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
                <i class="fa-solid fa-graduation-cap"></i> ${doc.qualification}<br>
                <i class="fa-solid fa-briefcase"></i> ${doc.experience} Years Experience
            </p>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem;">
                <span style="font-weight: 700; color: #10b981;">৳${doc.consultation_fee} <span style="font-size: 0.7rem; color: var(--text-muted);">/ visit</span></span>
                <a href="signup.html" class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.8rem;">Book Now</a>
            </div>
        `;
        
        doctorsList.appendChild(card);
    });
}
