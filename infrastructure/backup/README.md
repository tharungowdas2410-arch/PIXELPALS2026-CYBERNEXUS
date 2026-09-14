# CyberNexus Backup, Restoration & Disaster Recovery Runbook

## 1. Overview & RPO / RTO Targets

CyberNexus maintains mission-critical cyber risk calculations, financial impact models, attack path graphs, and immutable audit logs.
- **Recovery Point Objective (RPO)**: < 15 minutes (SEBI / RBI compliant).
- **Recovery Time Objective (RTO)**: < 1 hour.

---

## 2. Automated Backup Execution

### 2.1 PostgreSQL Database
Backs up relational tables (users, organizations, assets, risks, compliance records, audit logs, and telemetry):
```bash
chmod +x infrastructure/backup/backup_postgres.sh
./infrastructure/backup/backup_postgres.sh /var/backups/cybernexus/postgres
```
- Produces gzip-compressed, custom-format dumps (`cybernexus_pg_YYYYMMDD_HHMMSSZ.sql.gz`).
- Automatically computes SHA-256 integrity checksum (`.sha256`).
- Cleans archives exceeding the 30-day retention window.

### 2.2 Neo4j Graph Database
Backs up nodes, edges, attack traversal chains, and blast radius mappings:
```bash
chmod +x infrastructure/backup/backup_neo4j.sh
./infrastructure/backup/backup_neo4j.sh /var/backups/cybernexus/neo4j
```

---

## 3. Database Restoration Procedure

### 3.1 Verify Checksum
Before restoration, always verify the SHA-256 integrity of the archive:
```bash
sha256sum -c cybernexus_pg_20260913_220000Z.sql.gz.sha256
```

### 3.2 Restore PostgreSQL
```bash
# Drop active connections and recreate target schema if clean restore
pg_restore \
  -h localhost \
  -p 5432 \
  -U cybernexus \
  -d cybernexus \
  --clean \
  --if-exists \
  cybernexus_pg_20260913_220000Z.sql.gz
```

### 3.3 Restore Neo4j
```bash
neo4j-admin database load neo4j --from-path=/var/backups/cybernexus/neo4j --overwrite-destination=true
```

---

## 4. Disaster Recovery & Replication Strategy

1. **Active-Active Hot Standby**: In production, PostgreSQL Streaming Replication with synchronous commit to a secondary availability zone ensures zero data loss.
2. **Cold Offsite Storage**: Daily backups are mirrored to AWS S3 (or Azure Blob) with Object Lock (WORM - Write Once, Read Many) to prevent ransomware tampering.
3. **Periodic Tabletop & Drills**: Restore drills must be executed quarterly and recorded in the compliance audit trail.
