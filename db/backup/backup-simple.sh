#!/bin/bash
# Simple backup script for OPP platform
# Created: December 22, 2024

# Create backup directory if it doesn't exist
mkdir -p db/backup
mkdir -p db/backup/code
mkdir -p db/backup/config

# Create full database backup
echo "Creating database backup..."
pg_dump $DATABASE_URL > db/backup/backup.sql

# Backup essential configuration files
echo "Backing up configuration files..."
cp package.json db/backup/config/
cp tsconfig.json db/backup/config/
cp db/schema.ts db/backup/config/
cp server/production.ts db/backup/config/
cp server/auth.ts db/backup/config/
cp server/routes.ts db/backup/config/
cp server/types.ts db/backup/config/

# Backup latest code
echo "Backing up latest code..."
mkdir -p db/backup/code/server
cp -r server/* db/backup/code/server/
cp -r db/schema.ts db/backup/code/

# Update backup info
echo "Backup completed on $(date '+%Y-%m-%d %H:%M:%S')"
echo "Files backed up:"
ls -lR db/backup/config/
echo -e "\nCode backup:"
ls -lR db/backup/code/