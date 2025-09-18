import React, { useState, useEffect } from "react";
import DataTable from "react-data-table-component"; // Install with `npm install react-data-table-component`
import API from "../api.js";
import { toast, ToastContainer } from "react-toastify"; // Toast imports
import "react-toastify/dist/ReactToastify.css"; // Toast styles

const Taxes = () => {
  const [taxes, setTaxes] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Tax form state
  const [taxName, setTaxName] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [taxType, setTaxType] = useState("inclusive");
  const [accountCode, setAccountCode] = useState("");

  const [error, setError] = useState("");

  // Fetch Taxes
  const fetchTaxes = async () => {
    try {
      const response = await API.get("/taxes");
      setTaxes(response.data);
    } catch (err) {
      toast.error("Error fetching taxes.");
    }
  };

  // Fetch Accounts
  const fetchAccounts = async () => {
    try {
      const response = await API.get("/accounts"); // Adjust endpoint if necessary
      setAccounts(response.data);
    } catch (err) {
      toast.error("Error fetching accounts.");
    }
  };

  useEffect(() => {
    fetchTaxes();
    fetchAccounts();
  }, []);

  // Handle Add Tax
  const handleAddTax = async () => {
    if (!taxName || !taxRate || !taxType || !accountCode) {
      setError("All fields are required.");
      return;
    }

    if (taxRate < 0) {
      setError("Tax rate cannot be negative.");
      return;
    }
setLoading(true)
    try {
      await API.post("/taxes", {
        tax_name: taxName,
        tax_rate: parseFloat(taxRate),
        tax_type: taxType,
        account_code: accountCode,
      });
      toast.success("Tax added successfully!");
      setShowModal(false);
      setError("");
      fetchTaxes();
      setTaxName("");
      setTaxRate("");
      setTaxType("inclusive");
      setAccountCode("");
    } catch (err) {
      console.error("Error adding tax:", err);
      toast.error("Failed to add tax. Please check your input.");
    }finally{setLoading(false)}
  };

  // DataTable Columns
  const columns = [
    { name: "Tax Name", selector: (row) => row.tax_name, sortable: true },
    { name: "Tax Rate (%)", selector: (row) => row.tax_rate, sortable: true },
    { name: "Tax Type", selector: (row) => row.tax_type, sortable: true },
    { name: "Account Code", selector: (row) => row.account_code },
    { name: "Account Name", selector: (row) => row.account_name },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Taxes</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none"
        >
          Add Tax
        </button>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={taxes}
        pagination
        highlightOnHover
        striped
      />

      {/* Add Tax Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-8">
            <h2 className="text-xl font-bold mb-4">Add New Tax</h2>
            {error && <p className="text-red-600 mb-4">{error}</p>}

            {/* Tax Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Tax Name:
              </label>
              <input
                type="text"
                value={taxName}
                onChange={(e) => setTaxName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Enter tax name"
              />
            </div>

            {/* Tax Rate */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Tax Rate (%):
              </label>
              <input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Enter tax rate"
                min="0"
              />
            </div>

            {/* Tax Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Tax Type:
              </label>
              <select
                value={taxType}
                onChange={(e) => setTaxType(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="inclusive">Inclusive</option>
                <option value="exclusive">Exclusive</option>
              </select>
            </div>

            {/* Account Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Account:
              </label>
              <select
                value={accountCode}
                onChange={(e) => setAccountCode(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">-- Select Account --</option>
                {accounts.map((account) => (
                  <option
                    key={account.account_code}
                    value={account.account_code}
                  >
                    {account.account_code} - {account.account_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none"
              >
                Cancel
              </button>
              <button
              disabled={loading}
                onClick={handleAddTax}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none"
              >
                Add Tax
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Taxes;
