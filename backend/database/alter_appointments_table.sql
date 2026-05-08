-- Add consultation_status to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS consultation_status VARCHAR(20) 
CHECK (consultation_status IN ('waiting', 'ongoing', 'completed')) 
DEFAULT 'waiting';
