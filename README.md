# AuraMed - Telemedicine Video Consultation Platform

AuraMed is a modern, secure, and professional telemedicine platform designed to connect patients with expert healthcare providers through high-quality video consultations. Built with a focus on privacy, usability, and role-based access control.

## 🚀 Features

- **Role-Based Authentication**: Secure login and registration for Patients, Doctors, and System Admins.
- **Secure Backend**: PHP MVC architecture (No frameworks) with regular updates and secure password hashing using Bcrypt.
- **Database Integration**: Robust PostgreSQL storage for user profiles and medical data.
- **Modern Frontend**: Premium, glassmorphism-inspired UI with responsive design.
- **Session Management**: Persistent user sessions with automatic role-based dashboard redirects.
- **Provider Verification**: Built-in notices for doctor account approval workflows.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript (ES6+).
- **Backend**: PHP 7.4+ (Vanilla MVC).
- **Database**: PostgreSQL.
- **Server**: PHP Built-in Server with custom routing.

---

## 💻 Local Setup Instructions

Follow these steps to get the project running on your local machine:

### 1. Prerequisites
- **PHP**: Installed and added to your system PATH (Version 7.4 or higher recommended).
- **PostgreSQL**: Installed and running.
- **PHP Extensions**: Ensure `pdo_pgsql` is enabled in your `php.ini` file.

### 2. Database Configuration
1. Open your PostgreSQL client (like pgAdmin or psql).
2. Create a new database named `auramed_db`.
3. execute the SQL commands found in `backend/database/schema.sql` to create the `users` table.
4. **Credential Verification**: If your PostgreSQL username or password differs from the defaults (`postgres` / `usrzinu`), update the configuration in `backend/config/database.php`.

### 3. Running the Application
AuraMed uses a unified directory structure. To serve both the Frontend and the Backend API simultaneously, use the provided `router.php`:

1. Open a terminal/command prompt in the root directory of the project.
2. Run the following command:
   ```bash
   php -S localhost:8000 router.php
   ```

### 4. Access the Platform
Open your web browser and navigate to:
[http://localhost:8000](http://localhost:8000)

---

## 🔍 Database Inspection

To view the registered users and their roles directly from your terminal, run this command:

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d auramed_db -c "SELECT * FROM users;"
```

**Password is:** `usrzinu`

---

## 📂 Project Structure

```text
auramed/
├── backend/                # Server-side logic
│   ├── config/             # DB Connection settings
│   ├── controllers/        # Auth logic & Business rules
│   ├── models/             # Database Queries
│   ├── routes/             # API Endpoints
│   └── database/           # SQL Schema scripts
├── Frontend/               # Client-side assets
│   ├── css/                # Stylesheets
│   ├── js/                 # Authentication & UI logic
│   └── *.html              # Page templates (Dashboards, Login, etc.)
├── router.php              # Local development server router
├── requirements.txt        # Environment requirements
└── README.md               # Project documentation
---

## ⚖️ License

Copyright © 2026 AuraMed Telemedicine. All Rights Reserved. 

This project is proprietary software. Unauthorized copying, modification, or distribution is strictly prohibited. Refer to the [LICENSE](file:///e:/telemedicine-video-platform/LICENSE) file for full terms and conditions.


