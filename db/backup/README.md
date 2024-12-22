# Database Backup Structure

This directory contains the database and configuration backups for the Peruvian Bitcoin Maximalists Community Platform.

## Structure

- `schema/`: Contains database schema definitions (versioned by date)
- `data/`: Contains database data dumps (versioned by date)
- `config/`: Contains configuration file backups
- `full_backup.sql`: Complete database backup including schema and data

## Backup Information

Last backup: 2024-12-22 02:21:10
Database version: PostgreSQL 16

## Tables
- users
- posts
- comments
- resources
- events
- businesses
- carousel_items

## Configuration Files
The following configuration files are backed up:
- package.json
- tsconfig.json
- vite.config.ts
- tailwind.config.ts
- drizzle.config.ts
- theme.json

## Restoration
For database restoration, use the full_backup.sql file which contains both schema and data.
For specific version restoration, use the dated files in schema/ and data/ directories.

Recent changes included:
- Added Instagram social media link to footer
- Added new Bitcoin maximalist resources:
  - Bitcoin Standard
  - Mastering Bitcoin
  - The Bullish Case for Bitcoin
  - Layered Money
  - Check Your Financial Privilege

## Backup Schedule
Backups are performed manually and committed to the repository after significant changes.
Last backup: 2024-12-22 02:21:10