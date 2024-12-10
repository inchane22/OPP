ALTER TABLE businesses
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8);

-- Convert existing addresses to coordinates (will be populated later through the application)
UPDATE businesses 
SET 
  latitude = -12.0464,
  longitude = -77.0428
WHERE latitude IS NULL AND longitude IS NULL;
