#!/bin/bash
# Database backup script
# Updated: December 22, 2024

# Environment variables are already set by Replit

# Create backup directory structure if it doesn't exist
mkdir -p db/backup/schema
mkdir -p db/backup/data
mkdir -p db/backup/config
mkdir -p db/backup/code/server
mkdir -p db/backup/code/db

# Backup database schema
echo "Creating schema backup..."
pg_dump --schema-only $DATABASE_URL > db/backup/schema/schema_$(date +%Y%m%d).sql

# Backup database data
echo "Creating data backup..."
pg_dump --data-only $DATABASE_URL > db/backup/data/data_$(date +%Y%m%d).sql

# Create full database backup
echo "Creating full backup..."
pg_dump $DATABASE_URL > db/backup/full_backup.sql

# Copy seed data
echo "Copying seed data..."
cp db/backup/data/seed.sql db/backup/data/seed_$(date +%Y%m%d).sql

# Backup configuration files
echo "Backing up configuration files..."
mkdir -p db/backup/config
cp package.json db/backup/config/
cp tsconfig.json db/backup/config/
cp vite.config.ts db/backup/config/
cp tailwind.config.ts db/backup/config/
cp drizzle.config.ts db/backup/config/
cp theme.json db/backup/config/
cp .env db/backup/config/ 2>/dev/null || :
cp .env.example db/backup/config/ 2>/dev/null || :

# Backup server code
echo "Backing up server code..."
cp -r server/* db/backup/code/server/
cp -r db/* db/backup/code/db/

# Backup type definitions and schema
cp migrations/*.sql db/backup/migrations/ 2>/dev/null || :

# Update README with latest backup information
CURRENT_DATE=$(date '+%Y-%m-%d %H:%M:%S')
sed -i "s/Last backup: .*/Last backup: $CURRENT_DATE/" db/backup/README.md

echo "Backup completed successfully on $CURRENT_DATE"
echo "Files created:"
echo "- db/backup/schema/schema_$(date +%Y%m%d).sql"
echo "- db/backup/data/data_$(date +%Y%m%d).sql"
echo "- db/backup/data/seed_$(date +%Y%m%d).sql"
echo "- db/backup/full_backup.sql"
echo "Configuration files backed up to db/backup/config/"
echo "Server code backed up to db/backup/code/"
echo "Migration files backed up to db/backup/migrations/"