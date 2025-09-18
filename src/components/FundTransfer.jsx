import { useState, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "react-toastify";
import DataTable from "react-data-table-component";
import { Undo2 } from "lucide-react";
import API from "../api.js";
const FundsTransferComponent = () => {
  const [transfers, setTransfers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    fromAccount: "",
    toAccount: "",
    amount: "",
    description: "",
    date: format(new Date(), "yyyy-MM-dd"),
  });

  useEffect(() => {
    fetchTransfers();
    fetchAccounts();
  }, []);

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const res = await API.get("/funds-transfer");
      const data = await res.data;
      setTransfers(data);
    } catch (error) {
      console.error("Error fetching transfers:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await API.get("/accounts");
      const data = await res.data;
      setAccounts(data);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  const handleTransfer = async (e) => {
    setLoading(true)
    e.preventDefault();
    try {
      const res = await API.post("/funds-transfer",formData);
      const data = await res.data;
      if (res.status==201) {
        toast.success("Funds transferred successfully!");
        fetchTransfers();
        setShowModal(false);
        setFormData({
          fromAccount: "",
          toAccount: "",
          amount: "",
          description: "",
          date: format(new Date(), "yyyy-MM-dd"),
        });
        setLoading(false)
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error("Error making transfer:", error);
    }finally{setLoading(false)}
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to reverse this transfer?"))
      return;

    try {
      const res = await API.post(
        `/funds-transfer/reverse/${id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: 1 }), 
        }
      );

      const data = await res.data;

      if (res.ok) {
        toast.success("Transfer reversed successfully!");
        fetchTransfers(); // Refresh the transfers list
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error("Error reversing transfer:", error);
      toast.error("An error occurred while reversing the transfer.");
    }
  };

  const columns = [
    {
      name: "Date",
      selector: (row) => format(new Date(row.date), "dd MMM yyyy"),
      sortable: true,
    },
    { name: "From", selector: (row) => row.from_account },
    { name: "To", selector: (row) => row.to_account },
    { name: "Amount", selector: (row) => row.amount.toFixed(2), right: true },
    { name: "Description", selector: (row) => row.description || "N/A" },
    { name: "Status", selector: (row) => row.status || "N/A" },
    {
      name: "Actions",
      cell: (row) => (
        <button
          className="text-red-600 hover:text-red-800"
          onClick={() => handleDelete(row.id)}
        >
          <Undo2  size={24} />{" "}
        </button>
      ),
      right: true,
    },
  ];

  return (
    <div className="p-6 bg-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Funds Transfers</h2>
        <button
        title="Reversal"
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={() => setShowModal(true)}
        >
          Transfer Funds
        </button>
      </div>

      <DataTable
        columns={columns}
        data={transfers}
        progressPending={loading}
        pagination
        highlightOnHover
        striped
      />

      {/* Transfer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-md w-96">
            <h3 className="text-xl font-semibold mb-4">Transfer Funds</h3>
            <form onSubmit={handleTransfer}>
              <label className="block">From Account</label>
              <select
                className="border p-2 w-full mb-2"
                required
                value={formData.fromAccount}
                onChange={(e) =>
                  setFormData({ ...formData, fromAccount: e.target.value })
                }
              >
                <option value="">Select Account</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.account_name}
                  </option>
                ))}
              </select>

              <label className="block">To Account</label>
              <select
                className="border p-2 w-full mb-2"
                required
                value={formData.toAccount}
                onChange={(e) =>
                  setFormData({ ...formData, toAccount: e.target.value })
                }
              >
                <option value="">Select Account</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.account_name}
                  </option>
                ))}
              </select>

              <label className="block">Amount</label>
              <input
                type="number"
                className="border p-2 w-full mb-2"
                required
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
              />

              <label className="block">Description</label>
              <input
                type="text"
                className="border p-2 w-full mb-2"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />

              <label className="block">Date</label>
              <input
                type="date"
                className="border p-2 w-full mb-2"
                required
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
              />

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  className="bg-gray-400 text-white px-4 py-2 rounded"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                >
                  Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FundsTransferComponent;
