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
- **Backend**: PHP 7.4+ (Front Controller Architecture).
- **Environment**: Secure `.env` configuration for sensitive credentials.
- **Database**: PostgreSQL integration with PDO.
- **Server**: PHP Built-in Server with centralized routing via `index.php`.

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
3. Execute the SQL commands found in `backend/database/schema.sql`.
4. **Credential Setup**: Instead of editing `database.php`, simply modify the values in the new `.env` file in the `backend/` folder:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=auramed_db
   DB_USER=postgres
   DB_PASS=your_password
   ```

### 3. Running the Application
AuraMed now includes a quick-run script to make starting the platform easier:

1. Open a terminal in the root directory.
2. Run the platform with a single command:
   ```powershell
   .\run
   ```
   *(This starts the server at [http://localhost:8000](http://localhost:8000) using your local PHP installation).*

### 4. Access the Platformp
Open your web browser and navigate to:
[http://localhost:8000](http://localhost:8000)

---

## 🔍 Database Inspection

To view the registered users and their roles directly from your terminal, run this command:

```powershell
psql -U postgres -d auramed_db -c "SELECT * FROM users;"
```
 SELECT * FROM users;

**Password is:** `usrzinu`

---

## 📂 Project Structure

```text
auramed/
├── backend/                # Server-side logic
│   ├── index.php           # Front Controller & Entry Point [NEW]
│   ├── .env                # Secure Environment Variables [NEW]
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
├── run.bat                 # One-click startup script [NEW]
├── requirements.txt        # Environment requirements
└── README.md               # Project documentation
---

## ⚖️ License

Copyright © 2026 AuraMed Telemedicine. All Rights Reserved. 

This project is proprietary software. Unauthorized copying, modification, or distribution is strictly prohibited. Refer to the [LICENSE](file:///e:/telemedicine-video-platform/LICENSE) file for full terms and conditions.


