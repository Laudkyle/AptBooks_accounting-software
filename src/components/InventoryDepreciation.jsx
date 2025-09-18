// components/InventoryDepreciation.jsx
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import API from '../api';

export default function InventoryDepreciation({ inventoryId }) {
  const [inventory, setInventory] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [asOfDate, setAsOfDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    is_depreciable: false,
    acquisition_date: '',
    original_value: '',
    salvage_value: '',
    useful_life_years: 5,
    depreciation_method: 'straight_line'
  });

  useEffect(() => {
    if (inventoryId) {
      fetchInventory();
      fetchDepreciationHistory();
    }
  }, [inventoryId]);

  const fetchInventory = async () => {
    try {
      const response = API.get(`/inventory/${inventoryId}`);
      if (!response.ok) throw new Error('Failed to fetch inventory');
      const data = await response.json();
      setInventory(data);
      
      if (data.is_depreciable) {
        setFormData({
          is_depreciable: data.is_depreciable,
          acquisition_date: data.acquisition_date || '',
          original_value: data.original_value || '',
          salvage_value: data.salvage_value || '',
          useful_life_years: data.useful_life_years || 5,
          depreciation_method: data.depreciation_method || 'straight_line'
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepreciationHistory = async () => {
    try {
      const response = await API.get(`/inventory/${inventoryId}/depreciation-history`);
      if (!response.ok) throw new Error('Failed to fetch depreciation history');
      const data = await response.json();
      setHistory(data);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const handleCalculateDepreciation = async () => {
    try {
      const response = await API.post(`/inventory/${inventoryId}/calculate-depreciation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ as_of_date: asOfDate }),
      });
      
      if (!response.ok) throw new Error('Failed to calculate depreciation');
      
      // Refresh data
      await fetchInventory();
      await fetchDepreciationHistory();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = API.patch(`/inventory/${inventoryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) throw new Error('Failed to update depreciation settings');
      
      await fetchInventory();
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="text-center py-4">Loading...</div>;
  if (error) return <div className="text-red-500 py-4">Error: {error}</div>;
  if (!inventory) return null;

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Depreciation</h3>
          {!showForm && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
            >
              {inventory.is_depreciable ? 'Edit Settings' : 'Enable Depreciation'}
            </button>
          )}
        </div>

        {showForm ? (
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_depreciable"
                name="is_depreciable"
                checked={formData.is_depreciable}
                onChange={handleFormChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="is_depreciable" className="ml-2 block text-sm text-gray-900">
                This inventory item depreciates over time
              </label>
            </div>

            {formData.is_depreciable && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="acquisition_date" className="block text-sm font-medium text-gray-700">
                    Acquisition Date
                  </label>
                  <input
                    type="date"
                    id="acquisition_date"
                    name="acquisition_date"
                    value={formData.acquisition_date}
                    onChange={handleFormChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="original_value" className="block text-sm font-medium text-gray-700">
                    Original Value
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    id="original_value"
                    name="original_value"
                    value={formData.original_value}
                    onChange={handleFormChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="salvage_value" className="block text-sm font-medium text-gray-700">
                    Salvage Value
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    id="salvage_value"
                    name="salvage_value"
                    value={formData.salvage_value}
                    onChange={handleFormChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="useful_life_years" className="block text-sm font-medium text-gray-700">
                    Useful Life (years)
                  </label>
                  <input
                    type="number"
                    id="useful_life_years"
                    name="useful_life_years"
                    value={formData.useful_life_years}
                    onChange={handleFormChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Depreciation Method</label>
                  <div className="mt-1 space-y-2">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="straight_line"
                        name="depreciation_method"
                        value="straight_line"
                        checked={formData.depreciation_method === 'straight_line'}
                        onChange={handleFormChange}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <label htmlFor="straight_line" className="ml-2 block text-sm text-gray-900">
                        Straight Line
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="double_declining"
                        name="depreciation_method"
                        value="double_declining"
                        checked={formData.depreciation_method === 'double_declining'}
                        onChange={handleFormChange}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <label htmlFor="double_declining" className="ml-2 block text-sm text-gray-900">
                        Double Declining Balance
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="submit"
                className="bg-indigo-600 text-white py-2 px-4 rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Save Settings
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : inventory.is_depreciable ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="text-sm font-medium text-gray-500">Original Value</h4>
                <p className="text-xl font-semibold text-gray-900">
                  ${inventory.original_value?.toFixed(2)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="text-sm font-medium text-gray-500">Current Value</h4>
                <p className="text-xl font-semibold text-gray-900">
                  ${inventory.current_value?.toFixed(2)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="text-sm font-medium text-gray-500">Accumulated Depreciation</h4>
                <p className="text-xl font-semibold text-gray-900">
                  ${inventory.accumulated_depreciation?.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <label htmlFor="asOfDate" className="block text-sm font-medium text-gray-700">
                  Calculate Depreciation As Of
                </label>
                <input
                  type="date"
                  id="asOfDate"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <button
                onClick={handleCalculateDepreciation}
                className="mt-6 bg-indigo-600 text-white py-2 px-4 rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Calculate
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">Depreciation tracking is not enabled for this inventory item.</p>
        )}
      </div>

      {inventory.is_depreciable && history.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Depreciation History</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Depreciation Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Remaining Value
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.map((record) => (
                  <tr key={record.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(record.period_date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${record.depreciation_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${record.remaining_value.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}