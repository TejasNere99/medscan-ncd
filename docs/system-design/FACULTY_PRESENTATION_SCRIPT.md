# MedScan-NCD Faculty Presentation & Defense Script: Security & Resilience Lab

## Presentation Overview

- **Audience**: College Faculty Reviewers, System Design Examiners, Security Evaluators.
- **Presenter**: MedScan-NCD Engineering Team.
- **Application URL**: `http://localhost:5173/admin/security-lab` (or deployed Admin route).
- **Required Role**: Authenticated `Admin` user.
- **Estimated Duration**: 7 - 10 minutes.

---

## 1. Opening & Context Setting (1 Minute)

> **"Good morning/afternoon, esteemed faculty members.**
>
> Today we are presenting two enterprise system design implementations in our healthcare platform, **MedScan-NCD**:
> 1. **Disaster Recovery & Resilience under Data Loss**: Point-in-Time Snapshot Creation, Blackout Simulation, Data Loss Injection, and Cryptographic SHA-256 Integrity Verification.
> 2. **Confidentiality & Integrity under Data Exfiltration**: Medical Data Breach Simulation with Application-Level AES-256-GCM Encryption and GHASH Tampering Detection.
>
> Before we begin the live demonstration, I want to emphasize our **core architectural isolation boundary**:
> All demonstrations execute against **isolated in-memory synthetic adapters** using fabricated records labeled `DEMO-PATIENT-001` through `003`.
> Notice the telemetry badges at the top of our console:
> - **Live MongoDB Atlas:** Online and untouched (`readyState: 1`). Real patient records, reports, ML pipelines, and active sessions continue normal operations without interruption."

---

## 2. Concept 1: Database Blackout, Snapshot & Recovery (4 Minutes)

> **"Let us begin with Tab 1: Database Blackout, Snapshot & Recovery Simulation.**

### [Step A: Initial Healthy State]
> "In normal operation, our database serves patient vitals and clinical data.
> Notice our active dataset inspector: we have **3 synthetic records** (`DEMO-PATIENT-001`, `002`, `003`).
> When I click **'Test Read (200)'**, our application queries the database adapter:
> - Status: `HTTP 200 OK`
> - Latency: `~18ms`
> - Record Count: 3 records returned."

### [Step B: Capture Independent Snapshot]
> "Now, before any maintenance or potential disaster, we must capture an immutable snapshot.
> Why not rely solely on MongoDB replica sets? Because if data is corrupted or dropped, replication faithfully replicates the deletion!
> I click **'Create Snapshot'**.
> Notice what happened:
> 1. Our engine deep-cloned the 3 records into an independent snapshot object (`SNAP-173...`).
> 2. It computed a deterministic canonical **SHA-256 integrity hash**.
> 3. It recorded the snapshot in our Snapshot Catalog table.
> Even if the active database changes now, this snapshot remains immutable."

### [Step C: Inject Catastrophic Data Loss & Blackout]
> "Now, we simulate a major infrastructure outage and accidental table drop.
> I click **'Simulate Loss'**.
> A confirmation modal appears, ensuring the Admin understands the simulation boundary.
> I confirm: **'Inject Data Loss'**.
> Look at the dashboard:
> 1. The database status transitions to **UNAVAILABLE** (amber badge).
> 2. The active synthetic dataset has been **wiped completely: 3 records dropped to 0!**
> 3. However, look at the top status badge: our production MongoDB Atlas cluster remains 100% online and healthy."

### [Step D: Fail-Fast During Outage]
> "If a client or microservice attempts to query the database during this outage, what happens?
> I click **'Query Outage (503)'**.
> The system fails fast: it returns an **HTTP 503 Service Unavailable** response within ~35ms with a sanitized error message, avoiding connection hangs and dirty write corruption."

### [Step E: Restore from Snapshot & Verify Integrity]
> "Now, the site reliability engineer initiates disaster recovery.
> In the Snapshot Catalog table, I select our snapshot and click **'Restore Snapshot'**.
> In just 15 milliseconds:
> 1. The engine deep-copies the snapshot records back into the active database.
> 2. The database status returns to **HEALTHY**.
> 3. Active record count returns from **0 to 3**.
> 4. Most importantly, it executes an automated integrity verification: it recomputes the SHA-256 checksum of the restored data and compares it against the snapshot's recorded hash.
> 5. Notice the badge: **'INTEGRITY VERIFIED'** (`HTTP 200 OK`)!"

### [Step F: Demonstrate Repeat Recovery]
> "To prove that the snapshot was not consumed or corrupted during the restore, I click **'Repeat Restore'**.
> The exact same snapshot restores successfully again, verifying true snapshot immutability."

---

## 3. Concept 2: Medical Data Breach & AES-256-GCM (4 Minutes)

> **"Now, let us switch to Tab 2: Medical Data Breach & Application-Level Encryption.**

### [The Healthcare Threat Model]
> "In healthcare, cloud database providers offer transparent disk encryption. But if an attacker compromises database credentials or steals a MongoDB backup dump file, transparent disk encryption is completely useless because the database engine decrypts the data before exporting it.
> To solve this, we implemented **Application-Level Encryption (ALE)** using **AES-256-GCM**."

### [Stage A & B: Encryption in Flight]
> "In Stage A, we see our synthetic baseline record (`DEMO-PATIENT-001`) with clear text diagnosis and vitals.
> In Stage B, I click **'Encrypt Synthetic Record'**.
> Our Node.js crypto backend executes AES-256-GCM authenticated encryption:
> - It generates a unique 96-bit cryptographically random IV.
> - It computes a 128-bit GHASH authentication tag.
> - Notice the timing: ~1.2ms.
> - Notice what is missing: the 256-bit server key is strictly isolated in server memory and is **never** sent over the wire or exposed in the UI."

### [Stage C: The Stolen Database Dump]
> "Now, I click **'Simulate Database-Only Breach'**.
> This view simulates what an attacker exfiltrating the MongoDB database would actually see.
> On the left: the original plaintext medical information.
> On the right: the raw stored document in the database dump.
> As you can see, the diagnosis and vitals are completely replaced by AES-256-GCM ciphertext.
> Without our server-side master key, the attacker cannot decrypt or read the sensitive patient data."

### [Stage D: Authorized Decryption & Tampering Resistance]
> "Now, an authorized doctor or system service requests the record.
> I click **'Decrypt with Server Key'**.
> The backend verifies the GHASH tag, decrypts the ciphertext, and validates field-by-field that the data matches the original.
>
> But there is an even more critical attack: **data poisoning and ciphertext tampering**.
> What if an attacker with database access alters the ciphertext in the database to forge medical vitals?
> I click **'Test Ciphertext Tampering'**.
> Our backend inverts bits in a copy of the ciphertext and attempts decryption.
> **Result**: AES-256-GCM's GHASH authentication tag immediately detects the modification and aborts decryption with an authentication error!
> Crucially: **plaintext is NEVER returned**. The application fails safely, preventing corrupted clinical data from ever reaching a doctor or ML model."

---

## 4. Closing & Questions (1 Minute)

> **"To conclude:**
> 1. We proved resilience: point-in-time snapshots, data loss injection (3 → 0), fail-fast HTTP 503, full snapshot restoration, and SHA-256 integrity verification.
> 2. We proved cryptographic confidentiality & integrity: AES-256-GCM application-level protection with GHASH tampering rejection.
> 3. We proved strict isolation: 22 automated tests pass with 100% success rate without touching production MongoDB Atlas.
>
> Thank you, and we now welcome your questions."

---

## 5. Potential Faculty Questions & Recommended Answers

### Q1: "Why did you use SHA-256 for snapshot verification?"
> **Answer**: "SHA-256 provides a collision-resistant, 256-bit cryptographic digest. By sorting the synthetic records deterministically by primary key before serializing and hashing, we create a canonical integrity signature. When the snapshot is restored, recomputing the hash guarantees that not a single bit of patient data was dropped, corrupted, or altered during the recovery process."

### Q2: "Why isn't a replica set sufficient for disaster recovery?"
> **Answer**: "Replica sets provide high availability against hardware failure, but they provide zero protection against logical data loss. If an attacker or bug deletes records, that deletion is immediately replicated to all secondary nodes. Only an independent point-in-time snapshot allows restoring data to a pre-incident state."

### Q3: "How do you know production MongoDB was never touched?"
> **Answer**: "All snapshot and blackout services operate on an isolated in-memory singleton. On every request, we query `mongoose.connection.readyState`, which remains `1` (connected). Furthermore, our RBAC middleware enforces that only authenticated Admins can call simulation APIs, and the controller rejects any request with arbitrary collection or path parameters."
