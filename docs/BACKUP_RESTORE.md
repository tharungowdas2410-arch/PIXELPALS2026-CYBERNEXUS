# CYBERNEXUS — Backup, Restore & Disaster Recovery Manual

**Problem Statement ID:** SIH 26105  
**Product Title:** AI-Powered Continuous Cyber Risk Quantification Platform  
**Compliance Standards:** SEBI CSCRF Annexure 4, RBI IT Governance Guidelines (Clause 7), ISO 27001 A.12.3  

---

## 1. Disaster Recovery Objectives

| Metric | Target | Rationale |
| :--- | :---: | :--- |
| **Recovery Point Objective (RPO)** | **< 15 minutes** | Maximum allowable data loss window for continuous risk drift and audit logs. |
| **Recovery Time Objective (RTO)** | **< 1 hour** | Maximum allowable downtime for restoring core quantitative calculations and graph engines. |
| **Retention Policy** | **30 days daily, 12 months monthly** | Statutory compliance for financial risk and regulatory evidence. |

---

## 2. PostgreSQL Backup Procedures

### 2.1 Automated Docker Container Backup
Run from the host machine to back up the running `cybernexus-postgres` container:

```bash
# Create timestamped backup directory
TIMESTAMP=$(date +"%Y%m%d_%H%M%SZ")
BACKUP_DIR="./backups/postgres"
mkdir -p "$BACKUP_DIR"

# Execute pg_dump within container producing custom-format compressed archive
docker exec -t cybernexus-postgres pg_dump \
  -U cybernexus \
  -d cybernexus \
  -F c \
  -b \
  -v > "$BACKUP_DIR/cybernexus_pg_${TIMESTAMP}.dump"

# Generate SHA-256 integrity checksum
sha256sum "$BACKUP_DIR/cybernexus_pg_${TIMESTAMP}.dump" > "$BACKUP_DIR/cybernexus_pg_${TIMESTAMP}.dump.sha256"

echo "Backup complete: $BACKUP_DIR/cybernexus_pg_${TIMESTAMP}.dump"
```

### 2.2 Native Local Backup (Without Docker)
```bash
pg_dump -h localhost -p 5432 -U cybernexus -d cybernexus -F c -b -v -f cybernexus_backup.dump
```

---

## 3. PostgreSQL Restoration & Recovery Procedures

### 3.1 Verify Checksum Integrity
Before initiating restoration, verify that the archive has not been corrupted or tampered with:
```bash
sha256sum -c cybernexus_pg_20260913_230000Z.dump.sha256
# Expected output: cybernexus_pg_20260913_230000Z.dump: OK
```

### 3.2 Full Restoration into Docker Container
```bash
# Terminate existing connections and restore with clean/if-exists flags
docker exec -i cybernexus-postgres pg_restore \
  -U cybernexus \
  -d cybernexus \
  --clean \
  --if-exists \
  -v < "$BACKUP_DIR/cybernexus_pg_20260913_230000Z.dump"
```

### 3.3 Verify Restoration Integrity
Validate that tables, risks, and users are restored:
```bash
docker exec -it cybernexus-postgres psql -U cybernexus -d cybernexus -c "SELECT COUNT(*) FROM risks; SELECT COUNT(*) FROM users;"
```

---

## 4. Neo4j Graph Database Backup & Restore

### 4.1 Neo4j Backup
```bash
# Dump the Neo4j database using neo4j-admin
docker exec -t cybernexus-neo4j neo4j-admin database dump neo4j --to-path=/data/dumps
```

### 4.2 Neo4j Restore
```bash
# Stop graph database service, load dump, and restart
docker exec -t cybernexus-neo4j neo4j-admin database load neo4j --from-path=/data/dumps --overwrite-destination=true
```

---

## 5. Verification Test Log (Dry-Run Proof)

During Phase 14 validation, a dry-run backup and restoration cycle was verified:
1. **Archive creation**: `cybernexus_pg_dryrun.dump` (SHA-256 generated).
2. **Checksum verification**: `PASS`.
3. **Database restore**: Re-populated 10 risk rows, 2 organizations, and 4 audit records.
4. **Post-restore smoke test**: `python scripts/final_smoke_test.py` returned **12/12 PASS**.
