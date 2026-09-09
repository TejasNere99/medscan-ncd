import { Setting } from '../models/Setting.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncWrapper.js';

export const getSettings = asyncHandler(async (req, res) => {
  let setting = await Setting.findOne();

  if (!setting) {
    setting = await Setting.create({
      systemName: 'Smart Medicine Reminder & AI Disease Prediction System',
      iotSyncIntervalSeconds: 15,
      emailNotificationsEnabled: true,
      ocrAutoTrigger: true,
      aiModelVersion: 'v1.2.4-rule-weighted',
    });
  }

  return res.status(200).json(new ApiResponse(200, setting, 'System settings retrieved.'));
});

export const updateSettings = asyncHandler(async (req, res) => {
  const { systemName, iotSyncIntervalSeconds, emailNotificationsEnabled, ocrAutoTrigger, aiModelVersion } = req.body;

  let setting = await Setting.findOne();

  if (!setting) {
    setting = await Setting.create(req.body);
  } else {
    setting.systemName = systemName ?? setting.systemName;
    setting.iotSyncIntervalSeconds = iotSyncIntervalSeconds ?? setting.iotSyncIntervalSeconds;
    setting.emailNotificationsEnabled = emailNotificationsEnabled ?? setting.emailNotificationsEnabled;
    setting.ocrAutoTrigger = ocrAutoTrigger ?? setting.ocrAutoTrigger;
    setting.aiModelVersion = aiModelVersion ?? setting.aiModelVersion;
    await setting.save();
  }

  return res.status(200).json(new ApiResponse(200, setting, 'System settings updated successfully.'));
});
