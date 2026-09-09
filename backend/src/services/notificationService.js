import { Notification } from '../models/Notification.js';
import { Patient } from '../models/Patient.js';

export const createNotification = async ({ recipientId, type, title, message, data = {}, priority = 'Medium' }) => {
  try {
    const notification = await Notification.create({
      recipient: recipientId,
      type,
      title,
      message,
      data,
      priority,
    });
    return notification;
  } catch (err) {
    console.error('[Notification Service] Creation failed:', err);
    return null;
  }
};

/**
 * Route Missed Medicine Alerts to Patient, Linked Family, and Assigned Doctor
 */
export const routeMissedMedicineAlert = async ({ patientId, medicineName, scheduledTime }) => {
  try {
    const patientDoc = await Patient.findById(patientId).populate('user assignedDoctor linkedFamilyMembers');
    if (!patientDoc) return;

    const timeStr = new Date(scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const title = `Missed Medicine Alert: ${medicineName}`;
    const message = `Dose of ${medicineName} scheduled for ${timeStr} was marked as missed.`;

    // 1. Notify Patient
    if (patientDoc.user) {
      await createNotification({
        recipientId: patientDoc.user._id,
        type: 'MissedMedicineAlert',
        title,
        message,
        priority: 'High',
      });
    }

    // 2. Notify Assigned Doctor
    if (patientDoc.assignedDoctor) {
      await createNotification({
        recipientId: patientDoc.assignedDoctor._id,
        type: 'MissedMedicineAlert',
        title: `Patient Missed Dose: ${patientDoc.user?.name || 'Patient'}`,
        message: `${patientDoc.user?.name || 'Patient'} missed scheduled dose of ${medicineName} at ${timeStr}.`,
        priority: 'High',
      });
    }

    // 3. Notify Linked Family Members
    if (patientDoc.linkedFamilyMembers && patientDoc.linkedFamilyMembers.length > 0) {
      for (const familyUser of patientDoc.linkedFamilyMembers) {
        await createNotification({
          recipientId: familyUser._id,
          type: 'MissedMedicineAlert',
          title: `Family Member Missed Dose`,
          message: `${patientDoc.user?.name || 'Your relative'} missed their ${medicineName} at ${timeStr}.`,
          priority: 'High',
        });
      }
    }
  } catch (error) {
    console.error('[Notification Routing] Error handling missed medicine alert:', error);
  }
};

/**
 * Route High Disease Risk Alerts to Patient and Assigned Doctor
 */
export const routeHighRiskAlert = async ({ patientId, riskPercent, riskLevel, diseaseBreakdown }) => {
  try {
    const patientDoc = await Patient.findById(patientId).populate('user assignedDoctor');
    if (!patientDoc) return;

    const title = `High Disease Risk Alert (${riskPercent}%)`;
    const message = `AI Risk Assessment calculated a ${riskLevel} risk level (${riskPercent}%). Please review your health recommendations.`;

    if (patientDoc.user) {
      await createNotification({
        recipientId: patientDoc.user._id,
        type: 'HighRiskAlert',
        title,
        message,
        priority: 'Urgent',
      });
    }

    if (patientDoc.assignedDoctor) {
      await createNotification({
        recipientId: patientDoc.assignedDoctor._id,
        type: 'HighRiskAlert',
        title: `Patient Elevated Risk Flag: ${patientDoc.user?.name || 'Patient'}`,
        message: `${patientDoc.user?.name} scored a ${riskLevel} risk rating (${riskPercent}% overall). Immediate consultation suggested.`,
        priority: 'Urgent',
      });
    }
  } catch (error) {
    console.error('[Notification Routing] Error handling high risk alert:', error);
  }
};
