#!/usr/bin/env bash
# ==============================================================================
# CyberNexus Enterprise PostgreSQL Backup Script
# Usage: ./backup_postgres.sh [backup_destination_dir]
# Supports full gzip-compressed pg_dump with SHA-256 verification checksums
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${1:-./backups/postgres}"
TIMESTAMP=$(date -u +"%Y%m%d_%H%M%SZ")
BACKUP_FILE="${BACKUP_DIR}/cybernexus_pg_${TIMESTAMP}.sql.gz"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"

# Environment defaults
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-cybernexus}"
PGDATABASE="${PGDATABASE:-cybernexus}"

mkdir -p "${BACKUP_DIR}"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting PostgreSQL backup for database '${PGDATABASE}' on ${PGHOST}:${PGPORT}..."

# Execute pg_dump with compression
PGPASSWORD="${PGPASSWORD:-}" pg_dump \
  -h "${PGHOST}" \
  -p "${PGPORT}" \
  -U "${PGUSER}" \
  -d "${PGDATABASE}" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  -f "${BACKUP_FILE}"

# Generate SHA-256 integrity checksum
sha256sum "${BACKUP_FILE}" > "${CHECKSUM_FILE}"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Backup completed successfully: ${BACKUP_FILE}"
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Checksum generated: $(cat "${CHECKSUM_FILE}")"

# Retention policy: remove backups older than 30 days
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Enforcing 30-day retention policy..."
find "${BACKUP_DIR}" -type f -name "cybernexus_pg_*.sql.gz*" -mtime +30 -exec rm -f {} \;

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] PostgreSQL backup procedure finished."
