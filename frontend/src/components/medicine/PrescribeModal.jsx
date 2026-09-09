import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { medicineService } from '../../services/medicineService';
import { useToast } from '../../hooks/useToast';

export const PrescribeModal = ({ isOpen, onClose, patientId, onMedicineAdded }) => {
  const { addToast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    dosage: '500 mg',
    frequency: 'Twice daily',
    timing: ['morning', 'night'],
    instructions: 'Take after food with warm water.',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      addToast('Please enter medicine name.', 'warning');
      return;
    }

    setLoading(true);
    try {
      await medicineService.addMedicine({
        patientId,
        ...formData,
      });
      addToast('Medicine prescribed and scheduled successfully!', 'success');
      if (onMedicineAdded) onMedicineAdded();
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to prescribe medicine.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTimingToggle = (time) => {
    setFormData((prev) => {
      const exists = prev.timing.includes(time);
      const nextTiming = exists ? prev.timing.filter((t) => t !== time) : [...prev.timing, time];
      return { ...prev, timing: nextTiming };
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Prescribe New Medicine">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5">Medicine Name</label>
          <input
            type="text"
            required
            placeholder="e.g. Metformin, Amlodipine"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Dosage</label>
            <input
              type="text"
              required
              placeholder="e.g. 500 mg, 1 tablet"
              value={formData.dosage}
              onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Frequency</label>
            <select
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-brand-500 focus:outline-none"
            >
              <option value="Once daily">Once daily</option>
              <option value="Twice daily">Twice daily</option>
              <option value="Thrice daily">Thrice daily</option>
              <option value="Every 8 hours">Every 8 hours</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5">Dose Timing</label>
          <div className="flex space-x-2">
            {['morning', 'afternoon', 'night'].map((t) => {
              const active = formData.timing.includes(t);
              return (
                <button
                  type="button"
                  key={t}
                  onClick={() => handleTimingToggle(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize border transition-all ${
                    active
                      ? 'bg-brand-500/20 text-brand-300 border-brand-500/50'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5">Patient Instructions</label>
          <textarea
            rows="2"
            value={formData.instructions}
            onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/20"
          >
            {loading ? 'Saving...' : 'Prescribe & Schedule'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
