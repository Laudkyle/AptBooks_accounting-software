import React, { useState, useEffect } from "react";
import API from "../api.js";
import DataTable from "react-data-table-component";
import { FaEdit, FaTrash, FaMoneyCheckAlt } from "react-icons/fa";
import { toast } from "react-toastify";

const ExpenseComponent = () => {
  const [expenses, setExpenses] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [amount, setAmount] = useState(0);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState("");
  const [newExpense, setNewExpense] = useState({
    expense_date: "",
    amount: "",
    expense_account_id: "",
    description: "",
    payment_method_id: "",
    payment_method: "",
  });
  const [selectedExpense, setSelectedExpense] = useState(null);
  useEffect(() => {
    fetchExpenses();
    fetchAccounts();
    fetchPaymentMethods();
  }, []);

  const fetchExpenses = async () => {
    try {
      const response = await API.get("/expenses");
      setExpenses(response.data);
    } catch (error) {
      console.error("Error fetching expenses:", error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await API.get("/accounts");
      setAccounts(response.data);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const response = await API.get("/payment-methods");
      setPaymentMethods(response.data);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
    }
  };

  const [loading, setLoading] = useState(false);

  const handleAddOrUpdateExpense = async () => {
    if (loading) return; // Prevent multiple clicks

    setLoading(true); // Start loading
    try {
      const dataToSend = { ...newExpense };

      // Handle credit-specific logic
      if (newExpense.payment_method === "credit") {
        dataToSend.payment_method_id = null; // No direct payment method for credit
        dataToSend.account_credit_id = accounts.find(
          (account) => account.account_name === "Accounts Payable"
        )?.id;
      } else {
        dataToSend.payment_method_id = newExpense.payment_method;
      }

      if (selectedExpense) {
        await API.put(
          `/expenses/${selectedExpense.id}`,
          dataToSend
        );
      } else {
        await API.post("/expenses", dataToSend);
      }
      toast.success("Expense added successfully!!!");
      setShowAddModal(false);
      setNewExpense({
        expense_date: "",
        amount: "",
        expense_account_id: "",
        description: "",
        payment_method_id: "",
        payment_method: "",
      });
      setSelectedExpense(null);
      fetchExpenses();
    } catch (error) {
      toast.error("Error adding Expense. Please try again later!!!");
      console.error("Error saving expense:", error.message);
    } finally {
      setLoading(false); // Stop loading
    }
  };

  const handleConfirmPayment = async (expenseId, selectedMethod, amount) => {
    setLoading(true); // Start loading
    try {
       await API.put(
        `/expenses/pay/${expenseId}`,
        { payment_method_id: selectedMethod, payAmount: amount }
      );

      toast.success("Expense payment updated successfully!", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });

      fetchExpenses(); // Refresh the expenses list
    } catch (error) {
      console.error("Error updating expense status:", error);

      toast.error("Failed to mark expense as paid!", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setLoading(false);
      setShowModal(false);
      setSelectedExpense(null);
    }
  };

  // Handle "Pay" click -> Open modal
  const handlePayClick = async (expense) => {
    setSelectedExpense(expense);
    await fetchPaymentMethods();
    setShowModal(true);
  };

  const handleDeleteExpense = async (id) => {
    try {
      await API.delete(`/expenses/${id}`);
      fetchExpenses();
    } catch (error) {
      console.error("Error deleting expense:", error);
    }
  };

  const handleEditExpense = (expense) => {
    setSelectedExpense(expense);

    setNewExpense({
      expense_date: expense.expense_date,
      amount: expense.amount,
      expense_account_id: expense.expense_account_id,
      description: expense.description,
      payment_method: expense.account_credit_id
        ? "credit"
        : expense.payment_method_id,
      payment_method_id: expense.payment_method,
    });
    setShowAddModal(true);
  };

  const columns = [
    {
      name: "Date",
      selector: (row) => row.expense_date,
      sortable: true,
    },
    {
      name: "Amount",
      selector: (row) => row.amount,
      sortable: true,
    },
    {
      name: "Description",
      selector: (row) => row.description,
    },
    {
      name: "Balance due",
      selector: (row) => row.balance_due,
    },
    {
      name: "Status",
      selector: (row) => row.status, // Display expense status (paid/unpaid)
      sortable: true,
      cell: (row) => (
        <span
          className={row.status == "paid" ? "text-green-500" : "text-red-500"}
        >
          {row.status}
        </span>
      ),
    },
    {
      name: "Actions",
      cell: (row) => (
        <div className="flex space-x-4">
          {row.status === "unpaid" && (
            <FaEdit
              onClick={() => {
                handleEditExpense(row);
              }}
              className="cursor-pointer text-yellow-500 hover:text-yellow-700"
              title="Edit"
            />
          )}
          <FaTrash
            onClick={() => handleDeleteExpense(row.id)}
            className="cursor-pointer text-red-500 hover:text-red-700"
            title="Delete"
          />
          {(row.status === "unpaid" || row.status === "partial") && ( // Show Pay button only if unpaid
            <FaMoneyCheckAlt
              onClick={() => handlePayClick(row)}
              className="cursor-pointer text-green-500 hover:text-green-700"
              title="Mark as Paid"
            />
          )}
        </div>
      ),
    },
  ];
  return (
    <div className="container mx-auto p-6 max-h-[calc(100vh-100px)] overflow-y-scroll">
      <div className="flex justify-end mb-6">
        <button
          className="bg-blue-600 text-white py-2 px-6 rounded-lg shadow-md hover:bg-blue-700 transition duration-300"
          onClick={() => setShowAddModal(true)}
        >
          Add Expense
        </button>
      </div>

      <DataTable
        title="Expenses"
        columns={columns}
        data={expenses}
        pagination
        paginationRowsPerPageOptions={[
          10,
          20,
          50,
          100,
          expenses.length,
        ]}
        highlightOnHover
        striped
      />

      {/* Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Pay Expense
            </h2>

            {/* Amount Input */}
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">
                Amount to Pay: {selectedExpense?.amount}
                {console.log(selectedExpense)}
              </label>

              <input
                type="number"
                value={selectedExpense?.amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                max={selectedExpense?.amount} 
              />
            </div>

            {/* Payment Method Selection */}
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">
                Payment Method:
              </label>
              <select
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Payment Method</option>
                {paymentMethods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 border rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleConfirmPayment(selectedExpense.id, selectedMethod, selectedExpense.amount)
                  
                }
                className={`px-4 py-2 text-white rounded-md ${
                  loading
                    ? "bg-gray-500 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
                disabled={loading || !selectedMethod} // Prevent empty submission
              >
                {loading ? "Processing..." : "Confirm Payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add or Edit Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-800">
                {selectedExpense ? "Edit Expense" : "Add Expense"}
              </h2>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => {
                  setShowAddModal(false);
                  setNewExpense({
                    expense_date: "",
                    amount: "",
                    expense_account_id: "",
                    description: "",
                    payment_method_id: "",
                    payment_method: "",
                  });
                  setSelectedExpense(null);
                }}
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Date
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={newExpense.expense_date}
                  onChange={(e) =>
                    setNewExpense({
                      ...newExpense,
                      expense_date: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Amount
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={newExpense.amount}
                  onChange={(e) =>
                    setNewExpense({ ...newExpense, amount: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={newExpense.description}
                  onChange={(e) =>
                    setNewExpense({
                      ...newExpense,
                      description: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Expense Account
                </label>
                <select
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={newExpense.expense_account_id}
                  onChange={(e) =>
                    setNewExpense({
                      ...newExpense,
                      expense_account_id: e.target.value,
                    })
                  }
                >
                  <option value="">Select Account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Payment Method
                </label>
                <select
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={newExpense.payment_method}
                  onChange={(e) =>
                    setNewExpense({
                      ...newExpense,
                      payment_method: e.target.value,
                    })
                  }
                >
                  <option value="">Select Payment Method</option>
                  {paymentMethods.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.name}
                    </option>
                  ))}
                  <option value="credit">Credit</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-4">
              <button
                className="bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition duration-300"
                onClick={() => {
                  setShowAddModal(false);
                  setNewExpense({
                    expense_date: "",
                    amount: "",
                    expense_account_id: "",
                    description: "",
                    payment_method_id: "",
                    payment_method: "",
                  });
                  setSelectedExpense(null);
                }}
              >
                Close
              </button>
              <button
                className={`${
                  selectedExpense
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-blue-600 hover:bg-blue-700"
                } text-white py-2 px-4 rounded-lg transition duration-300`}
                onClick={handleAddOrUpdateExpense}
                disabled={
                  loading ||
                  !newExpense.expense_date ||
                  !newExpense.amount ||
                  !newExpense.expense_account_id ||
                  (!newExpense.payment_method &&
                    newExpense.payment_method !== "credit")
                }
              >
                {loading
                  ? "Processing..."
                  : selectedExpense
                  ? "Update Expense"
                  : "Add Expense"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseComponent;
