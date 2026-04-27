-- Doctor Slots Table
-- Stores availability slots created by doctors

CREATE TABLE IF NOT EXISTS doctor_slots (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_doctor_slots_user FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE
);
