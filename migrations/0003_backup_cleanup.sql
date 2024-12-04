-- Migration to safely handle carousel_items_backup table
BEGIN;

-- First, ensure any remaining useful data is preserved
INSERT INTO carousel_items (id, title, description, image_url, created_at, updated_at)
SELECT id, title, description, image_url, created_at, updated_at
FROM carousel_items_backup
ON CONFLICT (id) DO NOTHING;

-- Now rename the backup table instead of dropping it
ALTER TABLE carousel_items_backup 
    RENAME TO carousel_items_backup_deprecated;

COMMIT;
