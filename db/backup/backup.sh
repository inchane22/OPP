#!/bin/bash
# Database backup script
# Updated: December 22, 2024

# Environment variables are already set by Replit

# Create backup directory structure if it doesn't exist
mkdir -p db/backup/schema
mkdir -p db/backup/data
mkdir -p db/backup/config

# Backup database schema
echo "Creating schema backup..."
pg_dump --schema-only $DATABASE_URL > db/backup/schema/schema_$(date +%Y%m%d).sql

# Backup database data
echo "Creating data backup..."
pg_dump --data-only $DATABASE_URL > db/backup/data/data_$(date +%Y%m%d).sql

# Create full database backup
echo "Creating full backup..."
pg_dump $DATABASE_URL > db/backup/full_backup.sql

# Backup configuration files
echo "Backing up configuration files..."
cp package.json db/backup/config/
cp tsconfig.json db/backup/config/
cp vite.config.ts db/backup/config/
cp tailwind.config.ts db/backup/config/
cp drizzle.config.ts db/backup/config/
cp theme.json db/backup/config/

# Update README with latest backup information
CURRENT_DATE=$(date '+%Y-%m-%d %H:%M:%S')
sed -i "s/Last backup: .*/Last backup: $CURRENT_DATE/" db/backup/README.md

echo "Backup completed successfully on $CURRENT_DATE"
echo "Files created:"
echo "- db/backup/schema/schema_$(date +%Y%m%d).sql"
echo "- db/backup/data/data_$(date +%Y%m%d).sql"
echo "- db/backup/full_backup.sql"
echo "Configuration files backed up to db/backup/config/"