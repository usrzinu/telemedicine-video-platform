-- Consultation Records Table
CREATE TABLE IF NOT EXISTS consultation_records (
    id SERIAL PRIMARY KEY,
    booking_id INT NOT NULL,
    doctor_id INT NOT NULL,
    patient_id INT NOT NULL,
    symptoms TEXT,
    diagnosis TEXT,
    advice TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Medical Reports Table
CREATE TABLE IF NOT EXISTS medical_reports (
    id SERIAL PRIMARY KEY,
    consultation_id INT,
    booking_id INT NOT NULL,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (consultation_id) REFERENCES consultation_records(id) ON DELETE SET NULL,
    FOREIGN KEY (booking_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Prescriptions Table
CREATE TABLE IF NOT EXISTS prescriptions (
    id SERIAL PRIMARY KEY,
    consultation_id INT UNIQUE NOT NULL,
    booking_id INT NOT NULL,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    symptoms TEXT,
    diagnosis TEXT,
    advice TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (consultation_id) REFERENCES consultation_records(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Prescription Medicines Table
CREATE TABLE IF NOT EXISTS prescription_medicines (
    id SERIAL PRIMARY KEY,
    prescription_id INT NOT NULL,
    medicine_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    duration VARCHAR(100),
    instructions TEXT,
    FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
);

-- Doctor Subscriptions Table
CREATE TABLE IF NOT EXISTS doctor_subscriptions (
    id SERIAL PRIMARY KEY,
    doctor_id INT NOT NULL,
    plan_name VARCHAR(50) NOT NULL, -- 'Basic', 'Premium'
    price NUMERIC(10, 2) NOT NULL,
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiry_date TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Subscription Payments Table
CREATE TABLE IF NOT EXISTS subscription_payments (
    id SERIAL PRIMARY KEY,
    subscription_id INT NOT NULL,
    doctor_id INT NOT NULL,
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'success',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subscription_id) REFERENCES doctor_subscriptions(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE
);
