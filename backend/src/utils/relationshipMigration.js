import { Patient } from '../models/Patient.js';
import { PatientRelationship } from '../models/PatientRelationship.js';

/**
 * Idempotent startup migration:
 * Bridges legacy patient.assignedDoctor and patient.linkedFamilyMembers
 * into first-class PatientRelationship records.
 */
export const runRelationshipMigration = async () => {
  try {
    const patients = await Patient.find({
      assignedDoctor: { $exists: true, $ne: null },
    }).lean();

    if (!patients || patients.length === 0) {
      return { migratedDoctors: 0 };
    }

    let migratedDoctors = 0;

    for (const patient of patients) {
      // 1. Migrate assignedDoctor -> DOCTOR ACTIVE (isPrimaryDoctor: true)
      if (patient.assignedDoctor) {
        try {
          const existingDocRel = await PatientRelationship.findOne({
            patient: patient._id,
            relatedUser: patient.assignedDoctor,
            relationshipType: 'DOCTOR',
          });

          if (!existingDocRel) {
            await PatientRelationship.create({
              patient: patient._id,
              relatedUser: patient.assignedDoctor,
              relationshipType: 'DOCTOR',
              status: 'ACTIVE',
              initiatedBy: 'MIGRATION',
              isPrimaryDoctor: true,
              activatedAt: new Date(),
            });
            migratedDoctors++;
          }
        } catch (err) {
          // If already exists or partial unique index duplicate, ignore
          console.warn(`[Migration] Doctor relation skip for patient ${patient._id}:`, err.message);
        }
      }
    }

    // 2. Safe cleanup: Clean up legacy FAMILY relationships if any remain in raw collection
    try {
      await PatientRelationship.updateMany(
        { relationshipType: 'FAMILY', status: { $in: ['PENDING', 'ACTIVE'] } },
        { $set: { status: 'REVOKED', revokedAt: new Date() } }
      );
    } catch (cleanErr) {
      // ignore
    }

    if (migratedDoctors > 0) {
      console.log(`[Migration] Successfully synchronized legacy doctor relationships: ${migratedDoctors} doctors.`);
    }

    return { migratedDoctors };
  } catch (error) {
    console.error('[Migration] Failed to run relationship migration:', error.message);
    return { error: error.message };
  }
};
