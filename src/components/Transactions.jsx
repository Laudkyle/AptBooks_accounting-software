import { useState, useEffect } from "react";
import API from "../api.js";
import DataTable from "react-data-table-component";
import { FaEdit, FaTrash, FaPlus } from "react-icons/fa";
import { toast } from "react-toastify";

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [formData, setFormData] = useState({
    transaction_date: "",
    amount: "",
    credit_account_id: "",
    debit_account_id: "",
    description: "",
  });
  const [editId, setEditId] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTransactions();
    fetchAccounts();
  }, []);

  // Fetch Transactions
  const fetchTransactions = async () => {
    try {
      const response = await API.get("/transactions");
      setTransactions(response.data);
      console.log(response)
    } catch (error) {
      toast.error("Error fetching transactions");
    }
  };

  // Fetch Accounts (Chart of Accounts)
  const fetchAccounts = async () => {
    try {
      const response = await API.get("/accounts");
      setAccounts(response.data);
    } catch (error) {
      toast.error("Error fetching accounts");
    }
  };

  // Handle Form Input Change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true)
    try {
      if (editId) {
        await API.put(`/transactions/${editId}`, formData);
        toast.success("Transaction updated successfully");
      } else {
        await API.post("/transactions", formData);
        toast.success("Transaction added successfully");
      }
      setIsModalOpen(false);
      setFormData({ transaction_date: "", amount: "", credit_account_id: "", debit_account_id: "", description: "" });
      setEditId(null);
      fetchTransactions();
    } catch (error) {
      toast.error("Error saving transaction");
    }finally{setLoading(false)}
  };

  // Handle Edit
  const handleEdit = (transaction) => {
    setEditId(transaction.id);
    setFormData({
      transaction_date: transaction.transaction_date,
      amount: transaction.amount,
      credit_account_id: transaction.credit_account_id,
      debit_account_id: transaction.debit_account_id,
      description: transaction.description,
    });
    setIsModalOpen(true);
  };

  // Handle Delete
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this transaction?")) {
      try {
        await API.delete(`/transactions/${id}`);
        toast.success("Transaction deleted");
        fetchTransactions();
      } catch (error) {
        toast.error("Error deleting transaction");
      }
    }
  };

  // Table Columns
  const columns = [
    { name: "Date", selector: (row) => row.transaction_date, sortable: true },
    { name: "Amount", selector: (row) => row.amount, sortable: true },
    { name: "Credit Account", selector: (row) => row.credit_account_name, sortable: true },
    { name: "Debit Account", selector: (row) => row.debit_account_name, sortable: true },
    { name: "Description", selector: (row) => row.description, sortable: true },
    {
      name: "Actions",
      cell: (row) => (
        <div className="flex space-x-2">
          <button className="text-blue-500" onClick={() => handleEdit(row)}>
            <FaEdit />
          </button>
          <button className="text-red-500" onClick={() => handleDelete(row.id)}>
            <FaTrash />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 bg-gray-100 max-h-[calc(100vh-100px)] overflow-y-scroll">
      <h2 className="text-2xl font-bold mb-4">Transactions</h2>

      {/* Add Transaction Button */}
      <button
        className="mb-4 bg-blue-600 text-white py-2 px-4 rounded flex items-center"
        onClick={() => setIsModalOpen(true)}
      >
        <FaPlus className="mr-2" /> Add Transaction
      </button>

      {/* Transactions Table */}
      <div className="bg-white p-4 shadow-md rounded-lg">
        <DataTable columns={columns} data={transactions} pagination highlightOnHover />
      </div>

      {/* Modal for Adding/Editing Transaction */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-1/2">
            <h3 className="text-xl font-bold mb-4">{editId ? "Edit Transaction" : "Add Transaction"}</h3>
            
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700">Date</label>
                <input
                  type="date"
                  name="transaction_date"
                  value={formData.transaction_date}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700">Amount</label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700">Credit Account</label>
                <select
                  name="credit_account_id"
                  value={formData.credit_account_id}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="">Select Account</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-700">Debit Account</label>
                <select
                  name="debit_account_id"
                  value={formData.debit_account_id}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="">Select Account</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-gray-700">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="col-span-2 flex justify-end space-x-2">
                <button type="button" className="bg-gray-500 text-white py-2 px-4 rounded" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="bg-blue-600 text-white py-2 px-4 rounded">
                  {editId ? "Update" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
