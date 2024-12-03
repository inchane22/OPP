#!/bin/bash
# Database backup script
# Created: December 03, 2024

# Environment variables are already set by Replit

# Create backup directory if it doesn't exist
mkdir -p db/backup

# Backup schema
pg_dump --schema-only $DATABASE_URL > db/backup/schema.sql

# Backup data
pg_dump --data-only $DATABASE_URL > db/backup/data.sql

# Create full backup
pg_dump $DATABASE_URL > db/backup/full_backup.sql

echo "Database backup completed successfully"
echo "Backup files created:"
echo "- db/backup/schema.sql (schema only)"
echo "- db/backup/data.sql (data only)"
echo "- db/backup/full_backup.sql (complete backup)"

# Update README
echo "Last backup: $(date '+%Y-%m-%d %H:%M:%S')" >> db/backup/README.md
