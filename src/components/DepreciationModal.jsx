import { useEffect, useState } from 'react';
import { XIcon } from 'lucide-react';

const DepreciationModal = ({ isOpen, onClose, onSubmit, entry, assets }) => {
  const [formData, setFormData] = useState({
    asset_id: '',
    period: '',
    amount: '',
    method: 'straight_line',
  });

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (entry) {
        setFormData({
          asset_id: entry.asset_id,
          period: entry.period.split('T')[0],
          amount: entry.amount,
          method: entry.method,
        });
      } else {
        setFormData({
          asset_id: '',
          period: '',
          amount: '',
          method: 'straight_line',
        });
      }
    }
  }, [isOpen, entry]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center border-b p-4">
          <h3 className="text-lg font-semibold">
            {entry ? 'Edit Depreciation Entry' : 'Add New Depreciation Entry'}
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
              >
                <option value="">Select Asset</option>
                {assets.map(asset => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name} (₵{asset.purchase_price})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
              <input
                type="date"
                name="period"
                value={formData.period}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₵)</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
              <select
                name="method"
                value={formData.method}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="straight_line">Straight Line</option>
                <option value="declining_balance">Declining Balance</option>
                <option value="double_declining">Double Declining</option>
                <option value="sum_of_years">Sum of Years' Digits</option>
              </select>
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
              {entry ? 'Update Entry' : 'Add Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DepreciationModal;