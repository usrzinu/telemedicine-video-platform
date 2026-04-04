// AuraMed Authentication Integration
document.addEventListener('DOMContentLoaded', () => {
    
    // Select the forms
    const signupForm = document.getElementById('signupForm');
    const loginForm = document.getElementById('loginForm');

    // API prefix - you might need to adjust this depending on how you serve the site.
    // If your backend is in a folder /backend relative to the root, but exposed via /api...
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
            const role = document.getElementById('roleSelect').value;

            // Combine names for backend requirement
            const name = `${firstName} ${lastName}`;

            try {
                const response = await fetch(`${API_BASE}/register`, {  
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

                const result = await response.json();

                if (result.status === 'success') {
                    alert('Registration successful! You can now login.');
                    window.location.href = 'login.html';
                } else {
                    alert(`Error: ${result.message}`);
                }
            } catch (error) {
                console.error("Signup error:", error);
                alert("An error occurred during registration. Please check your backend connection.");
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
            // Note: roleSelect is used here for matching role if needed, though backend is the authority
            const selectedRole = document.getElementById('roleSelect').value;

            try {
                const response = await fetch(`${API_BASE}/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: email,
                        password: password
                    })
                });

                const result = await response.json();

                if (result.status === 'success') {
                    // Store user data in localStorage
                    localStorage.setItem('userId', result.id);
                    localStorage.setItem('userName', result.name);
                    localStorage.setItem('userRole', result.role);

                    // Optional: check if the selected role matches the backend role
                    if (selectedRole !== result.role) {
                        console.warn("Role mismatch: Frontend selected '" + selectedRole + "' but backend logged in as '" + result.role + "'.");
                    }

                    // Redirect based on backend-provided role
                    const redirectMap = {
                        'admin': 'admin.html',
                        'doctor': 'doctor.html',
                        'patient': 'patient.html'
                    };

                    window.location.href = redirectMap[result.role] || 'index.html';
                } else {
                    alert(`Login Failed: ${result.message}`);
                }
            } catch (error) {
                console.error("Login error:", error);
                alert("An error occurred during login. Please check your backend connection.");
            }
        });
    }
});
