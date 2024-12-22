#!/bin/bash
# Simple backup script for OPP platform
# Created: December 22, 2024

# Create backup directory if it doesn't exist
mkdir -p db/backup

# Create full database backup
echo "Creating database backup..."
pg_dump $DATABASE_URL > db/backup/backup.sql

# Backup essential configuration files
echo "Backing up configuration files..."
mkdir -p db/backup/config
cp package.json db/backup/config/
cp tsconfig.json db/backup/config/
cp db/schema.ts db/backup/config/

# Update backup info
echo "Backup completed on $(date '+%Y-%m-%d %H:%M:%S')"
