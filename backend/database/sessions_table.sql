-- Create the sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    doctor_id INT NOT NULL,
    slot_id INT NOT NULL,
    status VARCHAR(20) CHECK (status IN ('active','ended')) DEFAULT 'active',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP
);

-- Constraint: Only one active session per doctor per slot
CREATE UNIQUE INDEX idx_one_active_session 
ON sessions (doctor_id, slot_id) 
WHERE status = 'active';
