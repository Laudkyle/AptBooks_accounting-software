import { useEffect, useState } from 'react';
import { XIcon } from 'lucide-react';

const RevaluationModal = ({ isOpen, onClose, onSubmit, revaluation, assets }) => {
  const [formData, setFormData] = useState({
    asset_id: '',
    revaluation_date: '',
    old_value: '',
    new_value: '',
    reason: '',
  });

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (revaluation) {
        setFormData({
          asset_id: revaluation.asset_id,
          revaluation_date: revaluation.revaluation_date.split('T')[0],
          old_value: revaluation.old_value,
          new_value: revaluation.new_value,
          reason: revaluation.reason || '',
        });
      } else {
        setFormData({
          asset_id: '',
          revaluation_date: new Date().toISOString().split('T')[0],
          old_value: '',
          new_value: '',
          reason: '',
        });
      }
    }
  }, [isOpen, revaluation]);

  // Update old value when asset is selected
  useEffect(() => {
    if (formData.asset_id) {
      const selectedAsset = assets.find(a => a.id === parseInt(formData.asset_id));
      if (selectedAsset) {
        // Calculate current value based on purchase price and depreciation
        const totalDepreciation = selectedAsset.depreciation_entries?.reduce(
          (sum, entry) => sum + parseFloat(entry.amount), 0
        ) || 0;
        const currentValue = selectedAsset.purchase_price - totalDepreciation;
        
        setFormData(prev => ({
          ...prev,
          old_value: currentValue.toFixed(2),
        }));
      }
    }
  }, [formData.asset_id, assets]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      old_value: parseFloat(formData.old_value),
      new_value: parseFloat(formData.new_value),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center border-b p-4">
          <h3 className="text-lg font-semibold">
            {revaluation ? 'Edit Revaluation' : 'Add New Revaluation'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Asset</label>
              <select
                name="asset_id"
                value={formData.asset_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={!!revaluation} 
              >
                <option value="">Select Asset</option>
                {assets.map(asset => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name} (Current: ₵{(
                      asset.purchase_price - 
                      (asset.depreciation_entries?.reduce((sum, entry) => sum + parseFloat(entry.amount), 0) || 0
                    ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                name="revaluation_date"
                value={formData.revaluation_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Value (₵)</label>
              <input
                type="number"
                name="old_value"
                value={formData.old_value}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                step="0.01"
                required
                readOnly
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Value (₵)</label>
              <input
                type="number"
                name="new_value"
                value={formData.new_value}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Market conditions, damage, improvements, etc."
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {revaluation ? 'Update Revaluation' : 'Add Revaluation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RevaluationModal;