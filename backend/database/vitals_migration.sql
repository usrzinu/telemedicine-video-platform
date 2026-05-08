-- 1. Add Clinical Vitals to consultation_records
ALTER TABLE consultation_records 
ADD COLUMN weight VARCHAR(50),
ADD COLUMN blood_pressure VARCHAR(50),
ADD COLUMN temperature VARCHAR(50),
ADD COLUMN oxygen_level VARCHAR(50);

-- 2. Add Permanent Patient Information to users table (if not already present)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS age INT,
ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10);
