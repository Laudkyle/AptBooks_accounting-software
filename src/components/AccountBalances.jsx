import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import DataTable from "react-data-table-component";
import "react-toastify/dist/ReactToastify.css";
import API from "../api";

const AccountBalances = () => {
  const [accounts, setAccounts] = useState([]);
  const [filteredAccounts, setFilteredAccounts] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [closingDate, setClosingDate] = useState(""); // Store selected date

  // Fetch accounts from the backend
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await API.get("/chart-of-accounts");
        const data = response.data.map((account) => ({
          ...account,
          balance: account.balance || 0, // Ensure balance has a default value
        }));
        setAccounts(data);
        setFilteredAccounts(data); // Initialize filtered accounts
      } catch (error) {
        console.error("Error fetching accounts:", error);
        toast.error("Failed to fetch accounts.");
      }
    };

    fetchAccounts();
  }, []);

  // Handle search
  const handleSearch = (e) => {
    const text = e.target.value.toLowerCase();
    setSearchText(text);

    // Filter accounts based on search text
    const filtered = accounts.filter(
      (account) =>
        account.account_name.toLowerCase().includes(text) ||
        account.account_type.toLowerCase().includes(text)
    );
    setFilteredAccounts(filtered);
  };

  // Function to close accounts (triggered by button)
  const handleCloseAccounts = async () => {
    if (!closingDate) {
      toast.error("Please select a closing date.");
      return;
    }

    const confirmClose = window.confirm(
      `Are you sure you want to close accounts for ${closingDate}? This action cannot be undone.`
    );
    if (!confirmClose) return;

    try {
      const response = await API.post("/close_accounts", { date: closingDate, forceOverwrite: true });
      toast.success(response.data.message);

      // Optionally, refresh accounts after closing
      const refreshed = await API.get("/chart-of-accounts");
      const updatedData = refreshed.data.map((account) => ({
        ...account,
        balance: account.balance || 0,
      }));
      setAccounts(updatedData);
      setFilteredAccounts(updatedData);
    } catch (error) {
      console.error("Error closing accounts:", error);
      toast.error(
        error.response?.data?.error || "Failed to close accounts."
      );
    }
  };

  // Columns for React Data Table
  const columns = [
    {
      name: "Account Name",
      selector: (row) => row.account_name,
      sortable: true,
    },
    {
      name: "Account Type",
      selector: (row) => row.account_type,
      sortable: true,
    },
    {
      name: "Balance",
      selector: (row) => parseFloat(row.balance).toFixed(2),
      sortable: true,
      right: true,
    },
  ];

  return (
    <div className="p-6 bg-white rounded shadow-md h-[calc(100vh-80px)] overflow-y-scroll">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Current Account Balances</h2>

        <div className="flex items-center gap-4">
          {/* Date Picker Input */}
          <input
            type="date"
            value={closingDate}
            onChange={(e) => setClosingDate(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
          />

          {/* Close Accounts Button */}
          <button
            onClick={handleCloseAccounts}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
          >
            Close Accounts
          </button>
        </div>
      </div>

      {/* Data Table with Search */}
      <DataTable
        columns={columns}
        data={filteredAccounts}
        pagination
        highlightOnHover
        responsive
        subHeader
        subHeaderComponent={
          <input
            type="text"
            value={searchText}
            onChange={handleSearch}
            placeholder="Search by account name or type..."
            className="border border-gray-300 rounded px-3 py-2 w-full max-w-md"
          />
        }
      />
    </div>
  );
};

export default AccountBalances;
