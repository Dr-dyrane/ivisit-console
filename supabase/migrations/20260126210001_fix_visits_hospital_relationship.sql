-- Fix foreign key relationship between visits and hospitals
-- The relationship was missing in the schema cache

-- First, ensure the foreign key constraint exists
DO $$
BEGIN
    -- Check if constraint exists, if not create it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'visits_hospital_id_fkey' 
        AND table_name = 'visits'
    ) THEN
        ALTER TABLE visits 
        ADD CONSTRAINT visits_hospital_id_fkey 
        FOREIGN KEY (hospital_id) REFERENCES hospitals(id);
    END IF;
END $$;

-- Refresh schema cache for PostgREST
NOTIFY pgrst, 'reload schema';

-- Add comment for documentation
COMMENT ON COLUMN visits.hospital_id IS 'Foreign key to hospitals table - enables proper relationship queries';
