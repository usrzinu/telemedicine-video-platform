# AuraMed — Telemedicine Video Consultation Platform

AuraMed is a modern, secure telemedicine platform connecting patients with healthcare providers through role-based dashboards and video consultation support. Built with a PHP MVC backend, PostgreSQL database, and a glassmorphism-inspired frontend.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, Vanilla CSS3, JavaScript (ES6+) |
| Backend | PHP 7.4+ — Front Controller (no framework) |
| Database | PostgreSQL via PDO |
| Auth | Session + localStorage with Bcrypt password hashing |
| Server | PHP Built-in Server (`php -S localhost:8000 router.php`) |

--- 

## Features Implemented

- [x] Role-based registration and login
- [x] Doctor credential application flow (post-signup)
- [x] Admin: view pending doctor applications
- [x] Admin: approve / reject doctor applications
- [x] Admin: view all approved doctors
- [x] Admin: view all registered patients
- [x] Admin: live stats (patient count, approved doctors, pending count)
- [x] Doctor dashboard (pending status gating)
- [x] Patient dashboard with specialist directory
- [x] Custom toast notifications + confirm modals

