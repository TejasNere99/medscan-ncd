import { MedicineLog } from '../models/MedicineLog.js';
import { Medicine } from '../models/Medicine.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncWrapper.js';
import { routeMissedMedicineAlert } from '../services/notificationService.js';

export const handleIotMedicineStatus = asyncHandler(async (req, res) => {
  const { deviceId, patientId, medicineId, status = 'Taken', timestamp } = req.body;

  console.log(`[IoT Telemetry Endpoint] Received data from ${deviceId || 'ESP32_DEV'}:`, req.body);

  let targetMedicineId = medicineId;
  let targetPatientId = patientId;

  if (!targetMedicineId && targetPatientId) {
    const med = await Medicine.findOne({ patient: targetPatientId, status: 'Active' });
    if (med) targetMedicineId = med._id;
  }

  const scheduledTime = timestamp ? new Date(timestamp) : new Date();

  let log = null;
  if (targetMedicineId) {
    log = await MedicineLog.create({
      patient: targetPatientId,
      medicine: targetMedicineId,
      scheduledTime,
      takenTime: status === 'Taken' ? new Date() : undefined,
      status: status || 'Taken',
      source: 'IoT_Device',
      notes: `Telemetry event from ESP32 Smart Box (${deviceId || 'ESP32_01'})`,
    });

    if (status === 'Missed' && targetPatientId) {
      const medDoc = await Medicine.findById(targetMedicineId);
      await routeMissedMedicineAlert({
        patientId: targetPatientId,
        medicineName: medDoc?.name || 'Smart Box Pill',
        scheduledTime,
      });
    }
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        received: true,
        deviceId: deviceId || 'ESP32_DEV_001',
        log,
      },
      'IoT medicine telemetry event recorded successfully.'
    )
  );
});
