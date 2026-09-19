# MedScan-NCD: Role & Access Control Target System Design
**Document ID:** MEDSCAN-SEC-DES-001  
**Status:** TARGET TECHNICAL SPECIFICATION & IMPLEMENTATION BLUEPRINT  
**Date:** September 2026  

---

## 1. Architectural Model: Hybrid RBAC + ABAC

To eliminate the vulnerabilities identified in the forensic audit, MedScan-NCD must transition from static role checks (`authorizeRoles`) to a **Hybrid RBAC + ABAC (Role-Based and Attribute-Based Access Control) Engine**.

### Core Tenet
1. **RBAC (Role):** Establishes the broad operational domain (e.g. Can this user write clinical notes? Can this user manage database backups?).
2. **ABAC (Relationship & Attributes):** Establishes tenancy and context (e.g. Does Doctor A have an `ACTIVE` relationship with Patient B? Is Patient B within CHO C's assigned village?).

```text
  INCOMING REQUEST: [Requester, Method, Resource, TargetID]
                           │
                           ▼
                 [1. VERIFY JWT TOKEN] ──► Valid User & Role?
                           │
                           ▼
               [2. RBAC PERMISSION CHECK] ──► Role allowed to execute action?
                           │
                           ▼
              [3. ABAC RELATIONSHIP CHECK] ──► Active relationship with TargetID?
                           │                   - Patient: isOwner(targetId)
                           │                   - Doctor: hasActiveDoctorRelationship
                           │                   - Nurse: hasActiveNurseAssignment
                           │                   - CHO: patient.village === user.assignedVillage
                           │                   - Family: hasActiveConsentedFamilyGrant
                           ▼
                 [4. AUDIT LOGGING RECORD]
                           │
                           ▼
                  [EXECUTE CONTROLLER]
```

---

## 2. Target Data Models

To enforce auditable relationships, three new data models must be introduced.

### 2.1 `PatientRelationship` Schema (Multi-Role Relationship Hub)
Replaces unverified single pointers with an explicit, versioned, multi-tenant state machine.

```javascript
import mongoose from 'mongoose';

const patientRelationshipSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    grantee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    granteeRole: {
      type: String,
      enum: ['Doctor', 'Nurse', 'Family'],
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACTIVE', 'REJECTED', 'REVOKED', 'EXPIRED'],
      default: 'PENDING',
      index: true,
    },
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvedAt: {
      type: Date,
    },
    revokedAt: {
      type: Date,
    },
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Granular permissions for Family / Caregivers
    permissions: [
      {
        type: String,
        enum: [
          'VIEW_DEMOGRAPHICS',
          'VIEW_MEDICINES',
          'VIEW_REPORTS',
          'VIEW_PREDICTIONS',
          'RECEIVE_ALERTS',
        ],
      },
    ],
    metadata: {
      relationDescription: { type: String }, // e.g. "Primary Care Physician", "Spouse"
      facilityName: { type: String },
    },
  },
  { timestamps: true }
);

patientRelationshipSchema.index({ patient: 1, grantee: 1 }, { unique: true });
export const PatientRelationship = mongoose.model('PatientRelationship', patientRelationshipSchema);
```

---

### 2.2 `AuditLog` Schema (HIPAA / GDPR Access Provenance)
Records all accesses to sensitive medical reports, predictions, and health records.

```javascript
import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actorRole: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: [
        'PATIENT_RECORD_VIEW',
        'PATIENT_RECORD_UPDATE',
        'REPORT_UPLOAD',
        'REPORT_VIEW',
        'REPORT_DOWNLOAD',
        'REPORT_EDIT_EXTRACTION',
        'REPORT_CONFIRM',
        'REPORT_DELETE',
        'PREDICTION_TRIGGER',
        'PREDICTION_VIEW',
        'RELATIONSHIP_REQUEST',
        'RELATIONSHIP_APPROVE',
        'RELATIONSHIP_REVOKE',
        'USER_ROLE_CHANGE',
      ],
      required: true,
      index: true,
    },
    targetPatient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      index: true,
    },
    targetResource: {
      resourceType: { type: String }, // e.g. "Report", "Prediction"
      resourceId: { type: mongoose.Schema.Types.ObjectId },
    },
    ipAddress: { type: String },
    userAgent: { type: String },
    outcome: {
      type: String,
      enum: ['SUCCESS', 'DENIED'],
      default: 'SUCCESS',
      index: true,
    },
    denialReason: { type: String },
  },
  { timestamps: true }
);

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
```

---

## 3. Server-Side Authorization Middleware Design

A centralized authorization middleware eliminates scattered, incomplete `if-else` checks.

### Target Middleware: `verifyPatientAccess(requiredLevel)`

```javascript
import { Patient } from '../models/Patient.js';
import { PatientRelationship } from '../models/PatientRelationship.js';
import { ApiError } from '../utils/apiError.js';
import { logAuditEvent } from '../services/auditLogService.js';

export const verifyPatientAccess = (requiredLevel = 'READ') => {
  return async (req, res, next) => {
    const requester = req.user;
    let targetPatientId = req.params.patientId || req.params.id || req.body.patientId || req.query.patientId;

    if (!targetPatientId) {
      return next(new ApiError(400, 'Target Patient ID is required.'));
    }

    const patient = await Patient.findById(targetPatientId);
    if (!patient) {
      return next(new ApiError(404, 'Patient record not found.'));
    }

    // 1. Patient Access (Self)
    if (requester.role === 'Patient') {
      if (String(patient.user) === String(requester._id)) {
        req.patient = patient;
        return next();
      }
      await logAuditEvent({ actor: requester._id, action: 'PATIENT_RECORD_VIEW', outcome: 'DENIED', targetPatient: patient._id });
      return next(new ApiError(403, 'Access denied. You cannot view another patient’s medical data.'));
    }

    // 2. Doctor Access (Requires ACTIVE relationship)
    if (requester.role === 'Doctor') {
      const rel = await PatientRelationship.findOne({
        patient: patient._id,
        grantee: requester._id,
        granteeRole: 'Doctor',
        status: 'ACTIVE',
      });

      if (rel) {
        req.patient = patient;
        req.relationship = rel;
        return next();
      }

      await logAuditEvent({ actor: requester._id, action: 'PATIENT_RECORD_VIEW', outcome: 'DENIED', targetPatient: patient._id });
      return next(new ApiError(403, 'Access denied. You do not have an active clinical relationship with this patient.'));
    }

    // 3. Nurse Access (Requires ACTIVE assignment)
    if (requester.role === 'Nurse') {
      const rel = await PatientRelationship.findOne({
        patient: patient._id,
        grantee: requester._id,
        granteeRole: 'Nurse',
        status: 'ACTIVE',
      });

      if (rel) {
        if (requiredLevel === 'WRITE' && req.method === 'PUT') {
          // Nurses cannot overwrite demographic baselines; can only log observations
          return next(new ApiError(403, 'Nurses are restricted to observation logging. Demographics are read-only.'));
        }
        req.patient = patient;
        req.relationship = rel;
        return next();
      }

      return next(new ApiError(403, 'Access denied. You are not assigned to this patient.'));
    }

    // 4. CHO Access (Geographic Scope)
    if (requester.role === 'CHO') {
      if (patient.village && patient.village === requester.village) {
        req.patient = patient;
        return next();
      }

      return next(new ApiError(403, `Access denied. Patient belongs to village '${patient.village}', outside your assigned catchment area.`));
    }

    // 5. Family Access (Consented Read-Only)
    if (requester.role === 'Family') {
      if (requiredLevel === 'WRITE') {
        return next(new ApiError(403, 'Family members possess strictly read-only access.'));
      }

      const rel = await PatientRelationship.findOne({
        patient: patient._id,
        grantee: requester._id,
        granteeRole: 'Family',
        status: 'ACTIVE',
      });

      if (rel) {
        req.patient = patient;
        req.relationship = rel;
        return next();
      }

      return next(new ApiError(403, 'Access denied. You have not been granted caregiver access by this patient.'));
    }

    // 6. Admin Access (Blocked from direct clinical records)
    if (requester.role === 'Admin') {
      return next(new ApiError(403, 'System Administrators are strictly prohibited from viewing patient medical records.'));
    }

    return next(new ApiError(403, 'Access denied.'));
  };
};
```

---

## 4. Implementation Phases & Prioritized Roadmap

### Phase P0: Urgent Security Hardening (Zero Regressions)
- **Duration:** Immediate
- **Scope:**
  1. **Fix Registration Exploit:** Restrict `POST /api/auth/register` to `role: 'Patient'`. Remove `Doctor`, `Admin`, `CHO`, `Nurse`, `Family` from public registration dropdown.
  2. **Eliminate Global Report Dump:** In `reportController.js`, reject `GET /api/reports` without a `patientId` query for non-patients with `400 Bad Request`.
  3. **Remove Family Data Leak:** In `patientController.js`, delete `Patient.find({}).limit(2)` demo fallback. Return `[]` for unlinked family accounts.
  4. **Remove Unassigned Patient Leakage:** Remove `{ assignedDoctor: { $exists: false } }` and `{ assignedNurse: { $exists: false } }` fallback clauses.
  5. **Implement IDOR Guard on Patient View:** Ensure `GET /api/patients/:id` rejects requests where `req.user.role === 'Patient'` and `patient.user !== req.user._id`.
  6. **Fix Admin User Creation Route:** Register `POST /api/users` in `userRoutes.js`.

### Phase P1: Relationship Subsystem Implementation
- **Duration:** Next Development Sprint
- **Scope:**
  1. Implement `PatientRelationship` collection.
  2. Implement Doctor ↔ Patient Connection Request & Approval UI.
  3. Implement CHO Catchment Area binding (`assignedVillages`).
  4. Implement Family Invitation Code Generator (`POST /api/patients/me/invite-family`).
  5. Deploy `verifyPatientAccess` middleware across `patientRoutes`, `reportRoutes`, and `predictionRoutes`.

### Phase P2: Audit Logging & Production Compliance
- **Duration:** Production Hardening
- **Scope:**
  1. Implement `AuditLog` collection and automated logging hooks.
  2. Create Admin Security & Audit Log Explorer Dashboard.
  3. Implement session expiration, rate limiting on sensitive endpoints, and provider credential verification workflows.
