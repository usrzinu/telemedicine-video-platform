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
});

// Simple Form Handling (Prevent actual submission for frontend demo)
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const role = document.getElementById('roleSelect') ? document.getElementById('roleSelect').value : 'Patient';
        
        if (role === 'doctor') {
            alert(`Authentication failed for ${email}.\n\nYour Doctor account is pending Admin approval. Please wait until your credentials are verified.`);
        } else {
            alert(`Authentication mock: Logging into ${role} portal with ${email}... \n(Dashboard UI coming next!)`);
        }
    });
}

const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const role = document.getElementById('roleSelect').value;
        const fname = document.getElementById('firstName').value;
        
        if (role === 'doctor') {
            alert(`Registration submitted for Dr. ${fname}!\n\nYour Doctor account is now pending Admin approval. You will receive an email once your account has been verified and activated.`);
        } else {
            alert(`Account mock: Creating ${role} account for ${fname}...`);
        }
    });
}
