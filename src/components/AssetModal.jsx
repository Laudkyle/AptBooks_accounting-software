import { useEffect, useState } from "react";
import { XIcon } from "lucide-react";
import API from "../api";

const AssetModal = ({ isOpen, onClose, onSubmit, asset,loading,setLoading }) => {
  const [categories, setCategories] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    category_id: "",
    purchase_date: "",
    purchase_price: "",
    useful_life: "",
    residual_value: "",
    depreciation_method: "straight_line",
  });

  // Fetch categories when modal opens
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await API.get("/categories/");
        setCategories(response.data);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    if (isOpen) {
      fetchCategories();
      if (asset) {
        setFormData({
          name: asset.name,
          category_id: asset.category_id,
          purchase_date: asset.purchase_date.split("T")[0],
          purchase_price: asset.purchase_price,
          useful_life: asset.useful_life,
          residual_value: asset.residual_value,
          depreciation_method: asset.depreciation_method,
        });
      } else {
        setFormData({
          name: "",
          category_id: "",
          purchase_date: "",
          purchase_price: "",
          useful_life: "",
          residual_value: "",
          depreciation_method: "straight_line",
        });
      }
    }
  }, [isOpen, asset]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="flex justify-between items-center border-b p-4">
          <h3 className="text-lg font-semibold">
            {asset ? "Edit Asset" : "Add New Asset"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Asset Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purchase Date
              </label>
              <input
                type="date"
                name="purchase_date"
                value={formData.purchase_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purchase Price ($)
              </label>
              <input
                type="number"
                name="purchase_price"
                value={formData.purchase_price}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Useful Life (years)
              </label>
              <input
                type="number"
                name="useful_life"
                value={formData.useful_life}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Residual Value ($)
              </label>
              <input
                type="number"
                name="residual_value"
                value={formData.residual_value}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Depreciation Method
              </label>
              <select
                name="depreciation_method"
                value={formData.depreciation_method}
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
              disabled={loading}
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {asset ? "Update Asset" : "Add Asset"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssetModal;
