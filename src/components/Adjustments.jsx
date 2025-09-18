import { useState, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "react-toastify";
import { FaEdit, FaTrash } from "react-icons/fa";
import DataTable from "react-data-table-component";
import API from "../api.js"
const AdjustmentsComponent = () => {
  const [adjustments, setAdjustments] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAdjustment, setCurrentAdjustment] = useState(null);
  const [filters, setFilters] = useState({
    startDate: format(new Date().setDate(1), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    type: "",
    account: "",
    status: "posted",
  });

  const adjustmentTypes = [
    { value: "correction", label: "Error Correction" },
    { value: "reconciliation", label: "Bank Reconciliation" },
    { value: "depreciation", label: "Depreciation Adjustment" },
    { value: "accrual", label: "Accrual Entry" },
    { value: "prepaid", label: "Prepaid Expense" },
    { value: "deferral", label: "Revenue Deferral" },
    { value: "write-off", label: "Bad Debt Write-off" },
    { value: "tax", label: "Tax Adjustment" },
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const [adjustmentsRes, accountsRes] = await Promise.all([
        API.get(`adjustments?${queryParams}`),
        API.get("accounts"),
      ]);

     const adjustmentsData = adjustmentsRes.ok
        ? await adjustmentsRes.json()
        : [];
      const accountsData =  accountsRes.data || []

      setAdjustments(adjustmentsData);
      setAccounts(accountsData);
    } catch (error) {
      console.error("Error fetching data:", error);
      setAdjustments([]);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const handleSave = async () => {
    if (!validateAdjustment()) return;
setLoading(true)
    try {
      const endpoint = currentAdjustment.id
        ? `adjustments/${currentAdjustment.id}`
        : "adjustments";

      const method = currentAdjustment.id ? "PUT" : "POST";

      const enrichedAdjustment = {
        ...currentAdjustment,
        created_by: "current_user", // Should come from auth context
        created_at: new Date().toISOString(),
        status: "posted",
        reference_number: generateReferenceNumber(),
        affected_periods: calculateAffectedPeriods(currentAdjustment.date),
      };

      const response = await API(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enrichedAdjustment),
      });

      if (!response.ok) {
        throw new Error("Failed to save adjustment.");
      }

      toast.success(
        currentAdjustment.id
          ? "Adjustment updated successfully!"
          : "Adjustment created successfully!"
      );

      fetchData();
      setLoading(false)
      setIsModalOpen(false);

    } catch (error) {
      toast.error("Error saving adjustment. Please try again.");
      console.error("Error saving adjustment:", error);
      setLoading(false)
    }
  };

  const validateAdjustment = () => {
    const required = [
      "account_id",
      "adjustment_type",
      "amount",
      "reason",
      "date",
    ];
    const missing = required.filter((field) => !currentAdjustment[field]);

    if (missing.length > 0) {
      alert(`Please fill in all required fields: ${missing.join(", ")}`);
      return false;
    }

    if (parseFloat(currentAdjustment.amount) <= 0) {
      alert("Amount must be greater than zero");
      return false;
    }

    return true;
  };

  const generateReferenceNumber = () => {
    return `ADJ-${new Date().getFullYear()}-${Math.random()
      .toString(36)
      .substr(2, 9)
      .toUpperCase()}`;
  };

  const calculateAffectedPeriods = (date) => {
    const adjustmentDate = new Date(date);
    return {
      fiscal_year: adjustmentDate.getFullYear(),
      fiscal_quarter: Math.floor(adjustmentDate.getMonth() / 3) + 1,
      fiscal_month: adjustmentDate.getMonth() + 1,
    };
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this adjustment?"))
      return;

    try {
      await API.delete(`adjustments/${id}`, {
        method: "DELETE",
      });
      toast.success("Adjustment deleted!");
      fetchData();
    } catch (error) {
      toast.error("Error deleting adjustment.");
    }
  };
  const columns = [
    {
      name: "Date",
      selector: (row) => format(new Date(row.date), "yyyy-MM-dd"),
      sortable: true,
    },
    { name: "Account", selector: (row) => row.account_name, sortable: true },
    { name: "Type", selector: (row) => row.adjustment_type, sortable: true },
    { name: "Amount", selector: (row) => `GHS ${row.amount}`, sortable: true },
    { name: "Reason", selector: (row) => row.reason },
    {
      name: "Actions",
      cell: (row) => (
        <div className="flex space-x-3">
          <button
            onClick={() => {
              setCurrentAdjustment(row);
              setIsModalOpen(true);
            }}
            className="text-blue-600 hover:text-blue-800"
          >
            <FaEdit />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="text-red-600 hover:text-red-800"
          >
            <FaTrash />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <div className="flex justify-between mb-4">
        <h2 className="text-2xl font-bold">Journal Adjustments</h2>
        <button
          onClick={() => {
            setCurrentAdjustment({
              adjustment_type: "",
              account_id: "",
              entry_type: "debit",
              amount: "",
              date: format(new Date(), "yyyy-MM-dd"),
              reason: "",
            });
            setIsModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          New Adjustment
        </button>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={adjustments}
        progressPending={loading}
        pagination
        highlightOnHover
        striped
        responsive
      />

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4">
              {currentAdjustment?.id ? "Edit Adjustment" : "New Adjustment"}
            </h3>

            <div className="grid gap-4">
              <select
                value={currentAdjustment.adjustment_type}
                onChange={(e) =>
                  setCurrentAdjustment({
                    ...currentAdjustment,
                    adjustment_type: e.target.value,
                  })
                }
                className="w-full border p-2 rounded"
              >
                <option value="">Select Type</option>
                {adjustmentTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>

              <select
                value={currentAdjustment.account_id}
                onChange={(e) =>
                  setCurrentAdjustment({
                    ...currentAdjustment,
                    account_id: e.target.value,
                  })
                }
                className="w-full border p-2 rounded"
              >
                <option value="">Select Account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.account_name}
                  </option>
                ))}
              </select>
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Date
                </label>
                <input
                  type="date"
                  value={
                    currentAdjustment?.date || format(new Date(), "yyyy-MM-dd")
                  }
                  onChange={(e) =>
                    setCurrentAdjustment({
                      ...currentAdjustment,
                      date: e.target.value,
                    })
                  }
                  className="w-full mt-1 p-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <input
                type="number"
                placeholder="Amount"
                value={currentAdjustment.amount}
                onChange={(e) =>
                  setCurrentAdjustment({
                    ...currentAdjustment,
                    amount: e.target.value,
                  })
                }
                className="w-full border p-2 rounded"
              />

              <textarea
                placeholder="Reason"
                value={currentAdjustment.reason}
                onChange={(e) =>
                  setCurrentAdjustment({
                    ...currentAdjustment,
                    reason: e.target.value,
                  })
                }
                className="w-full border p-2 rounded"
              ></textarea>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded"
                >
                  Cancel
                </button>
                <button
                            disabled={loading}

                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdjustmentsComponent;
