// AuraMed Authentication Integration
/**
 * Modern Notification System
 * @param {string} type - 'success' or 'error'
 * @param {string} message - The message to display
 * @param {string} redirectUrl - Optional URL to redirect after clicking button or auto-dismiss
 */
function showNotification(type, message, redirectUrl = null) {
    // Create elements
    const overlay = document.createElement('div');
    overlay.className = 'notification-overlay';
    
    const card = document.createElement('div');
    card.className = 'notification-card';
    
    // Icon selection
    const iconClass = type === 'success' ? 'fa-circle-check icon-success' : 'fa-circle-xmark icon-error';
    const title = type === 'success' ? 'Success!' : 'Oops!';
    const btnText = type === 'success' ? 'Continue to Login' : 'Try Again';
    
    card.innerHTML = `
        <div class="notif-icon ${type === 'success' ? 'icon-success' : 'icon-error'}">
            <i class="fa-solid ${iconClass}"></i>
        </div>
        <h3 class="notif-title">${title}</h3>
        <p class="notif-message">${message}</p>
        <button class="notif-btn notif-btn-primary">
            ${redirectUrl ? btnText : 'Close'}
        </button>
        <div class="notif-progress"></div>
    `;
    
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    
    // Trigger animation
    setTimeout(() => overlay.classList.add('active'), 10);
    
    const dismiss = () => {
        overlay.classList.remove('active');
        setTimeout(() => {
            overlay.remove();
            if (redirectUrl) window.location.href = redirectUrl;
        }, 400);
    };
    
    // Button click
    card.querySelector('.notif-btn').addEventListener('click', dismiss);
    
    // Auto-dismiss (success only)
    if (type === 'success') {
        const progressBar = card.querySelector('.notif-progress');
        progressBar.style.animation = 'progressShrink 5s linear forwards';
        setTimeout(dismiss, 5000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Select the forms
    const signupForm = document.getElementById('signupForm');
    const loginForm = document.getElementById('loginForm');
    const roleSelect = document.getElementById('roleSelect');

    // Handle URL parameters for pre-selecting role
    const urlParams = new URLSearchParams(window.location.search);
    const preRole = urlParams.get('role');
    if (preRole && roleSelect) {
        // If they arrive via "Apply as a Doctor", remove other roles
        if (preRole === 'doctor') {
            Array.from(roleSelect.options).forEach(option => {
                if (option.value !== 'doctor') {
                    option.remove();
                }
            });
            
            // Show doctor-specific fields immediately
            const notice = document.getElementById('doctorApprovalNotice');
            const doctorFields = document.getElementById('doctor-specific-fields');
            if (notice) notice.style.display = 'block';
            if (doctorFields) doctorFields.style.display = 'block';
        }
        
        roleSelect.value = preRole;
    }

    // Role selection logic for notice and fields visibility
    if (roleSelect) {
        roleSelect.addEventListener('change', (e) => {
            const isDoctor = e.target.value === 'doctor';
            const notice = document.getElementById('doctorApprovalNotice');
            const doctorFields = document.getElementById('doctor-specific-fields');
            
            if (notice) notice.style.display = isDoctor ? 'block' : 'none';
            if (doctorFields) doctorFields.style.display = isDoctor ? 'block' : 'none';
        });
    }

    // API prefix
    const API_BASE = '/api'; 

    // Handle Signup
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Extract form data
            const firstName = document.getElementById('firstName').value;
            const lastName = document.getElementById('lastName').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const role = roleSelect ? roleSelect.value : 'patient';

            const name = `${firstName} ${lastName}`;

            try {
                let response;
                if (role === 'doctor') {
                    // Use FormData for doctor signup (includes files)
                    const formData = new FormData(signupForm);
                    formData.append('name', name);
                    formData.append('role', role);
                    
                    response = await fetch(`${API_BASE}/register`, {
                        method: 'POST',
                        body: formData
                    });
                } else {
                    // Use JSON for patient/admin signup
                    response = await fetch(`${API_BASE}/register`, {  
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            name: name,
                            email: email,
                            password: password,
                            role: role
                        })
                    });
                }

                const result = await response.json();

                if (result.status === 'success') {
                    if (result.require_approval) {
                        // Logic for Doctors (Pending Approval)
                        showNotification('success', 'Application submitted successfully! Your account is pending admin approval.');
                        setTimeout(() => {
                            window.location.href = 'index.html'; 
                        }, 5000);
                    } else if (result.id && result.role) {
                        // Auto-login for Patients/Admins
                        localStorage.setItem('userId', result.id);
                        localStorage.setItem('userName', result.name);
                        localStorage.setItem('userRole', result.role);

                        showNotification('success', 'Registration successful! Redirecting to your dashboard...');
                        
                        setTimeout(() => {
                            const redirectMap = {
                                'admin': 'admin.html',
                                'doctor': 'doctor.html',
                                'patient': 'patient.html'
                            };
                            window.location.href = redirectMap[result.role] || 'index.html';
                        }, 2000);
                    } else {
                        showNotification('success', 'Registration successful! You can now login.', 'login.html');
                    }
                } else {
                    showNotification('error', `Error: ${result.message}`);
                }
            } catch (error) {
                console.error("Signup error:", error);
                showNotification('error', "An error occurred during registration. Please check your backend connection.");
            }
        });
    }

    // Handle Login
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Extract login fields
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const selectedRole = document.getElementById('roleSelect').value;

            try {
                const response = await fetch(`${API_BASE}/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: email,
                        password: password,
                        role: selectedRole
                    })
                });

                const result = await response.json();

                if (result.status === 'success') {
                    localStorage.setItem('userId', result.id);
                    localStorage.setItem('userName', result.name);
                    localStorage.setItem('userRole', result.role);

                    const redirectMap = {
                        'admin': 'admin.html',
                        'doctor': 'doctor.html',
                        'patient': 'patient.html'
                    };

                    window.location.href = redirectMap[result.role] || 'index.html';
                } else {
                    showNotification('error', `Login Failed: ${result.message}`);
                }
            } catch (error) {
                console.error("Login error:", error);
                showNotification('error', "An error occurred during login. Please check your backend connection.");
            }
        });
    }
});

