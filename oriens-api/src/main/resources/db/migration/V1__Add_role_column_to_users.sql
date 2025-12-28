-- Add role column with default value to avoid NOT NULL constraint issues
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(255) DEFAULT 'USER';

-- Update all existing null values to 'USER'
UPDATE users SET role = 'USER' WHERE role IS NULL;

-- Add NOT NULL constraint and check constraint
ALTER TABLE users ALTER COLUMN role SET NOT NULL;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('USER', 'ADMIN'));
