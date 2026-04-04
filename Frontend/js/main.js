// Theme Toggle Functionality
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;
const icon = themeToggle ? themeToggle.querySelector('i') : null;

// Check for saved theme preference or use OS preference
const savedTheme = localStorage.getItem('theme');
const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

if (savedTheme) {
    body.setAttribute('data-theme', savedTheme);
    updateIcon(savedTheme);
} else if (systemPrefersDark) {
    body.setAttribute('data-theme', 'dark');
    updateIcon('dark');
}

if(themeToggle) {
    themeToggle.addEventListener('click', () => {
        let currentTheme = body.getAttribute('data-theme');
        let newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateIcon(newTheme);
    });
}

function updateIcon(theme) {
    if(!icon) return;
    if (theme === 'dark') {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
}

// Navbar Scroll Effect
const navbar = document.getElementById('navbar');

if (navbar) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// Extract URL role parameter globally and apply to the dropdown
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const role = urlParams.get('role');
    const roleSelect = document.getElementById('roleSelect');
    if(role && roleSelect) {
        roleSelect.value = role;
    }

    // Role Selection Logic for Doctor Notice
    const doctorNotice = document.getElementById('doctorApprovalNotice');
    if (roleSelect && doctorNotice) {
        const toggleNotice = () => {
            if (roleSelect.value === 'doctor') {
                doctorNotice.style.display = 'block';
            } else {
                doctorNotice.style.display = 'none';
            }
        };
        toggleNotice(); // init
        roleSelect.addEventListener('change', toggleNotice);
    }

    // --- Authentication UI Logic ---
    const userRole = localStorage.getItem('userRole');
    const userName = localStorage.getItem('userName');
    const navLinks = document.querySelectorAll('.nav-links');

    if (userRole && userName && navLinks.length >= 2) {
        // The second .nav-links container usually holds the Sign In/Sign Up buttons
        const authButtonsContainer = navLinks[1];
        
        // Define dashboard link based on role
        const dashboardUrl = {
            'admin': 'admin.html',
            'doctor': 'doctor.html',
            'patient': 'patient.html'
        }[userRole] || 'index.html';

        authButtonsContainer.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem;">
                <span style="font-size: 0.9rem; font-weight: 500;">Welcome, <a href="${dashboardUrl}" style="color: var(--primary); text-decoration: none;">${userName}</a></span>
                <button id="logoutBtn" class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">Sign Out</button>
            </div>
        `;

        document.getElementById('logoutBtn').addEventListener('click', () => {
            localStorage.clear();
            window.location.href = 'index.html';
        });
    }
});

// Form handling is now managed by js/auth.js for real backend integration

