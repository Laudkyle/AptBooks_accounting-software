import React, { useEffect, useState } from "react";
import API from "../api.js";
import DataTable from "react-data-table-component";
import { toast } from "react-toastify";
import { FaEdit, FaTrashAlt } from "react-icons/fa";

const TaxSettings = () => {
  const [taxes, setTaxes] = useState([]);
  const [accounts, setAccounts] = useState([]); // State for storing accounts
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editTax, setEditTax] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [taxToDelete, setTaxToDelete] = useState(null);
  const [formData, setFormData] = useState({
    tax_name: "",
    tax_rate: "",
    tax_type: "inclusive",
    account_code: "", // Changed to account_code to match backend
  });
  const [searchTerm, setSearchTerm] = useState(""); // State for search term

  const initialFormState = {
    tax_name: "",
    tax_rate: "",
    tax_type: "inclusive",
    account_code: "", // Changed to account_code
  };

  const fetchTaxes = async () => {
    try {
      const response = await API.get("/taxes");
      setTaxes(response.data);
    } catch (error) {
      console.error("Error fetching taxes:", error);
      toast.error("Failed to fetch tax settings.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await API.get("/accounts"); // Fetch accounts
      setAccounts(response.data);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      toast.error("Failed to fetch accounts.");
    }
  };

  useEffect(() => {
    fetchTaxes();
    fetchAccounts(); // Fetch accounts when the component is mounted
  }, []);

  const handleDelete = async (id) => {
    try {
      await API.delete(`/taxes/${id}`);
      toast.success("Tax deleted successfully");
      setShowDeleteConfirm(false);
      setTaxToDelete(null);
      fetchTaxes();
    } catch (error) {
      console.error("Error deleting tax:", error);
      toast.error("Failed to delete tax.");
    }
  };

  const handleEdit = (tax) => {
    setEditTax(tax);
    setFormData({
      tax_name: tax.tax_name,
      tax_rate: tax.tax_rate,
      tax_type: tax.tax_type,
      account_code: tax.account_code, // Set the account_code for editing
    });
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData(initialFormState);
    setEditTax(null);
  };

  const validateForm = () => {
    const taxRate = parseFloat(formData.tax_rate);
    if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
      toast.error("Tax rate must be between 0 and 100");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);

    try {
      if (editTax) {
        // Update tax using account_code
        await API.put(`/taxes/${editTax.id}`, {
          ...formData,
        });
        toast.success("Tax updated successfully");
      } else {
        await API.post("/taxes", formData); // Send account_code directly
        toast.success("Tax created successfully");
      }
      fetchTaxes();
      handleCloseModal();
    } catch (error) {
      console.error("Error saving tax:", error);
      toast.error("Failed to save tax.");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      name: "Tax Name",
      selector: (row) => row.tax_name,
      sortable: true,
    },
    {
      name: "Tax Rate",
      selector: (row) => row.tax_rate,
      sortable: true,
    },
    {
      name: "Tax Type",
      selector: (row) => row.tax_type,
      sortable: true,
    },
    {
      name: "Account Name", // Display account name here
      selector: (row) => row.account_name, // Show the account name
      sortable: true,
    },
    {
      name: "Actions",
      cell: (row) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleEdit(row)}
            className="text-blue-500 hover:text-blue-700"
          >
            <FaEdit />
          </button>
          <button
            onClick={() => {
              setTaxToDelete(row);
              setShowDeleteConfirm(true);
            }}
            className="text-red-500 hover:text-red-700"
          >
            <FaTrashAlt />
          </button>
        </div>
      ),
    },
  ];

  // Filter taxes based on the search term
  const filteredTaxes = taxes.filter((tax) =>
    tax.tax_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Tax Settings</h2>
      <div className="flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 mb-4 text-white bg-green-500 rounded hover:bg-green-600"
        >
          Add New Tax
        </button>
      </div>
      {/* Search Bar */}
      <div className="mb-4 flex justify-end">
        <input
          type="text"
          placeholder="Search Tax Name..."
          className="w-1/3 justify-end p-2 border rounded"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

     

      <DataTable
        columns={columns}
        data={filteredTaxes} // Use filtered data
        progressPending={loading}
        pagination
        highlightOnHover
        pointerOnHover
      />

      {/* Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                {editTax ? "Edit Tax" : "Add New Tax"}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block mb-2">Tax Name</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded"
                  name="tax_name"
                  value={formData.tax_name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block mb-2">Tax Rate (%)</label>
                <input
                  type="number"
                  className="w-full p-2 border rounded"
                  name="tax_rate"
                  value={formData.tax_rate}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.01"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block mb-2">Tax Type</label>
                <select
                  className="w-full p-2 border rounded"
                  name="tax_type"
                  value={formData.tax_type}
                  onChange={handleChange}
                  required
                >
                  <option value="inclusive">Inclusive</option>
                  <option value="exclusive">Exclusive</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block mb-2">Account</label>
                <select
                  className="w-full p-2 border rounded"
                  name="account_code"
                  value={formData.account_code}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.account_code}>
                      {account.account_name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className={`w-full p-2 text-white rounded ${
                  submitting ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-600"
                }`}
              >
                {submitting ? "Saving..." : editTax ? "Update Tax" : "Add Tax"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Confirm Delete</h3>
            <p className="mb-4">
              Are you sure you want to delete the tax "{taxToDelete?.tax_name}"?
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setTaxToDelete(null);
                }}
                className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(taxToDelete.id)}
                className="px-4 py-2 text-white bg-red-500 rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxSettings;
