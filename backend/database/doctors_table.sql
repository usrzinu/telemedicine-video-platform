-- AuraMed Doctor Verification Module
-- Table to store doctor application and profile data

CREATE TABLE IF NOT EXISTS doctors (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    specialization VARCHAR(100) NOT NULL,
    experience INTEGER NOT NULL,
    qualification VARCHAR(150) NOT NULL,
    consultation_fee NUMERIC(10, 2) NOT NULL,
    license_number VARCHAR(100) UNIQUE NOT NULL,
    license_file TEXT NOT NULL,
    profile_photo TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure only one doctor profile per user
CREATE UNIQUE INDEX idx_doctor_user_id ON doctors(user_id);
