/**
 * DOCTOR MODULE JS
 * Handles doctor application submission and profile management.
 */

document.addEventListener('DOMContentLoaded', () => {
    const doctorApplyForm = document.getElementById('doctorApplyForm');

    // API prefix
    const API_BASE = '/api';

    // Handle Form Submission
    if (doctorApplyForm) {
        doctorApplyForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // 1. Get userId from localStorage
            const userId = localStorage.getItem('userId');
            const userRole = localStorage.getItem('userRole');

            if (!userId) {
                showNotification('error', "User session not found. Please log in first.", '../login.html');
                return;
            }

            if (userRole !== 'doctor') {
                showNotification('error', "Only users with a Doctor account can apply for verification.");
                return;
            }

            // 2. Prepare FormData (required for file uploads)
            const formData = new FormData(doctorApplyForm);
            formData.append('user_id', userId);

            // 3. Show loading state on button
            const submitBtn = doctorApplyForm.querySelector('.btn-submit');
            const originalText = submitBtn.innerText;
            submitBtn.innerText = "Submitting...";
            submitBtn.disabled = true;

            try {
                // 4. Send POST request
                const response = await fetch(`${API_BASE}/doctor/apply`, {
                    method: 'POST',
                    body: formData // No Content-Type header; fetch sets it automatically for FormData
                });

                const result = await response.json();

                if (result.status === 'success') {
                    showNotification('success', result.message, '../doctor.html');
                } else {
                    showNotification('error', result.message);
                }
            } catch (error) {
                console.error("Application error:", error);
                showNotification('error', "An error occurred while submitting your application. Please check your connection.");
            } finally {
                // 5. Restore button state
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});
