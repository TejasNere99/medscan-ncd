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
      $or: [
        { assignedDoctor: { $exists: true, $ne: null } },
        { linkedFamilyMembers: { $exists: true, $not: { $size: 0 } } },
      ],
    }).lean();

    if (!patients || patients.length === 0) {
      return { migratedDoctors: 0, migratedFamily: 0 };
    }

    let migratedDoctors = 0;
    let migratedFamily = 0;

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

      // 2. Migrate linkedFamilyMembers -> FAMILY ACTIVE
      if (Array.isArray(patient.linkedFamilyMembers) && patient.linkedFamilyMembers.length > 0) {
        for (const familyUserId of patient.linkedFamilyMembers) {
          try {
            const existingFamRel = await PatientRelationship.findOne({
              patient: patient._id,
              relatedUser: familyUserId,
              relationshipType: 'FAMILY',
            });

            if (!existingFamRel) {
              await PatientRelationship.create({
                patient: patient._id,
                relatedUser: familyUserId,
                relationshipType: 'FAMILY',
                status: 'ACTIVE',
                initiatedBy: 'MIGRATION',
                isPrimaryDoctor: false,
                activatedAt: new Date(),
              });
              migratedFamily++;
            }
          } catch (err) {
            console.warn(`[Migration] Family relation skip for patient ${patient._id}, user ${familyUserId}:`, err.message);
          }
        }
      }
    }

    if (migratedDoctors > 0 || migratedFamily > 0) {
      console.log(`[Migration] Successfully synchronized legacy relationships: ${migratedDoctors} doctors, ${migratedFamily} family members.`);
    }

    return { migratedDoctors, migratedFamily };
  } catch (error) {
    console.error('[Migration] Failed to run relationship migration:', error.message);
    return { error: error.message };
  }
};
