import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { toast } from "react-toastify";
import DataTable from "react-data-table-component";
import API from "../api.js";
import { FiPrinter } from "react-icons/fi";
import { FaFileExcel } from "react-icons/fa";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { FaTimes } from "react-icons/fa";

const GeneralLedgerComponent = ({
  companyAddress,
  companyName,
  email,
  phone,
}) => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [journalEntries, setJournalEntries] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(true);

  const glRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    startDate: "2024-01-01",
    endDate: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchTransactions(selectedAccount.id);
    }
  }, [selectedAccount, filters]);

  const fetchAccounts = async () => {
    setAccountsLoading(true);
    try {
      const res = await API.get("/accounts");
      const data = await res.data;
      setAccounts(data);

      const journalRes = await API.get("/oldest-entry-date");
      const oldestDate = journalRes.data?.oldest_date;
      if (oldestDate) {
        setFilters((prev) => ({ ...prev, startDate: oldestDate }));
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    } finally {
      setAccountsLoading(false);
    }
  };

  const handleRowClick = async (row) => {
    try {
      const res = await API.get(`/journal_entry/${row.id}`);
      setSelectedTransaction(res.data.entry);
      setJournalEntries(res.data.lines);
      setDetailsModalOpen(true);
    } catch (error) {
      toast.error("Error fetching transaction details.");
      console.error("Error fetching transaction details:", error);
    }
  };

  const fetchTransactions = async (accountId) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        accountId,
        startDate: filters.startDate,
        endDate: filters.endDate,
      }).toString();

      const res = await API.get(`/ledger?${queryParams}`);
      const data = await res.data;
      console.log("transaction :", data);
      setTransactions(data);
    } catch (error) {
      toast.error("Error fetching transactions.");
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAccounts = accounts.filter((account) =>
    account.account_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      name: "Date",
      selector: (row) => format(new Date(row.date), "dd MM yyyy"),
      sortable: true,
    },
    {
      name: "Description",
      selector: (row) => row.description || "N/A",
      grow: 2,
      style: {
        whiteSpace: "normal",
        wordBreak: "break-word",
      },
    },
    {
      name: "Debit",
      selector: (row) => (row.debit > 0 ? row.debit.toFixed(2) : ""),
      right: true,
    },
    {
      name: "Credit",
      selector: (row) => (row.credit > 0 ? row.credit.toFixed(2) : ""),
      right: true,
    },
    { name: "Balance", selector: (row) => row.balance.toFixed(2), right: true },
  ];

  const exportToExcel = async () => {
    try {
      const workbook = XLSX.utils.book_new();

      for (const account of accounts) {
        const queryParams = new URLSearchParams({
          accountId: account.id,
          startDate: filters.startDate,
          endDate: filters.endDate,
        }).toString();

        const res = await API.get(`/ledger?${queryParams}`);
        const transactions = res.data;

        if (transactions.length > 0) {
          const dataWithHeader = [
            [`Account: ${account.account_name}`],
            ...transactions.map((t) => Object.values(t)),
          ];
          let sheetName = account.account_name.replace(/[:\\/\?\*\[\]]/g, "");
          sheetName =
            sheetName.length > 30
              ? sheetName.substring(0, 20) + "..."
              : sheetName;

          const worksheet = XLSX.utils.aoa_to_sheet(dataWithHeader);
          XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        }
      }

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
      const data = new Blob([excelBuffer], {
        type: "application/octet-stream",
      });
      saveAs(data, `General_Ledger.xlsx`);
    } catch (error) {
      toast.error("Error exporting transactions to Excel.");
      console.error("Error exporting transactions:", error);
    }
  };

  const handlePrint = async () => {
    const headerDiv = document.createElement("div");
    headerDiv.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-left:1rem;margin-top:1rem;margin-right:1rem; padding-bottom: 1rem; border-bottom: 1px solid #e2e8f0;">
        <div>
          <h1 style="font-size: 3rem; font-weight: bold; color: #2563eb; margin-bottom: 0.25rem;">
            ${companyName || "Company Name"}
          </h1>
          <p style="font-size: 1.2rem; color: #4b5563;">
            ${companyAddress || "123 Business St, City, Country"}
          </p>
          <p style="font-size: 1rem; color: #4b5563;">
            Email: ${email || "support@company.com"} | Phone: ${
      phone || "(123) 456-7890"
    }
          </p>
          <p style="font-size: 1rem; color: #4b5563;">
            Date: <span style="font-weight: 500;">${new Date().toLocaleDateString()}</span>
          </p>
        </div>
        <div>
          <img src="images/logo.png" alt="Company Logo" style="height: 10rem; width: auto;">
        </div>
      </div>
      <div style="margin-bottom: 8rem;">
        <h2 style="font-size: 2rem; text-align:center;color: #4b5563;">${
          selectedAccount.account_name
        } General Ledger</h2>
        <h2 style="font-size: 1.5rem; font-style: bold; text-align:center;color: #4b5563;">From: ${
          filters.startDate
        } --- To: ${filters.endDate}</h2>
      </div>
    `;
    document.body.appendChild(headerDiv);

    const originalContent = document.body.innerHTML;
    const printContent = document.getElementById("printable-table").innerHTML;
    document.body.innerHTML = headerDiv.outerHTML + printContent;

    window.print();
    document.body.innerHTML = originalContent;
  };

  return (
    <div className="flex max-h-[calc(100vh-100px)] overflow-y-scroll bg-gray-100">
      {/* Sidebar - Accounts List */}
      <aside className="w-1/4 bg-white border-r shadow-md p-4 flex flex-col">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Accounts</h3>
        <input
          type="text"
          placeholder="Search accounts..."
          className="border rounded-md p-2 mb-3 w-full focus:ring focus:ring-blue-200"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <ul className="overflow-y-auto flex-grow">
          {filteredAccounts.length > 0 ? (
            filteredAccounts.map((account) => (
              <li
                key={account.id}
                className={`p-2 cursor-pointer rounded-md transition ${
                  selectedAccount?.id === account.id
                    ? "bg-blue-600 text-white"
                    : "hover:bg-gray-200"
                }`}
                onClick={() => setSelectedAccount(account)}
              >
                {account.account_name}
              </li>
            ))
          ) : (
            <p className="text-gray-500 text-sm">No accounts found.</p>
          )}
        </ul>
      </aside>

      {/* Main Content */}
      <div ref={glRef} className="w-3/4 p-6 bg-white shadow-lg rounded-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">General Ledger</h2>
          <div className="flex space-x-4 items-center">
            <label className="text-gray-700 font-medium">From:</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) =>
                setFilters({ ...filters, startDate: e.target.value })
              }
              className="border rounded-md p-2 focus:ring focus:ring-blue-200"
            />

            <label className="text-gray-700 font-medium">To:</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) =>
                setFilters({ ...filters, endDate: e.target.value })
              }
              className="border rounded-md p-2 focus:ring focus:ring-blue-200"
            />
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 bg-green-600 text-white py-1 px-3 text-sm rounded-md hover:bg-green-700 transition"
            >
              <FaFileExcel className="text-lg" /> Export
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-blue-600 text-white py-1 px-3 text-sm rounded-md hover:bg-blue-700 transition"
            >
              <FiPrinter className="text-lg" /> Print
            </button>
          </div>
        </div>

        {/* Transactions Table */}
        <div
          id="printable-table"
          className="border rounded-lg shadow-sm max-h-[calc(100vh-200px)] overflow-y-scroll"
        >
          <DataTable
            columns={columns}
            data={transactions}
            onRowClicked={handleRowClick}
            progressPending={loading}
            pagination
            highlightOnHover
            paginationRowsPerPageOptions={[
              10,
              20,
              50,
              100,
              transactions.length,
            ]}
            striped
            pointerOnHover
            customStyles={{
              rows: {
                style: {
                  cursor: "pointer",
                  minHeight: "50px",
                  fontSize: "14px",
                  zIndex: 1,
                },
              },
              headCells: {
                style: {
                  backgroundColor: "#f3f4f6",
                  fontWeight: "bold",
                  fontSize: "15px",
                },
              },
              pagination: { style: { fontSize: "14px" } },
            }}
          />
        </div>
      </div>

      {/* Transaction Details Modal */}
      {detailsModalOpen && selectedTransaction && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-3/4">
            <h3 className="text-xl font-bold mb-4">Journal Entry Details</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <p>
                <strong>Reference:</strong>{" "}
                {selectedTransaction.reference_number}
              </p>
              <p>
                <strong>Date:</strong> {selectedTransaction.date}
              </p>
              <p className="col-span-2">
                <strong>Description:</strong> {selectedTransaction.description}
              </p>
              <p>
                <strong>Status:</strong> {selectedTransaction.status}
              </p>
              <p>
                <strong>Adjustment Type:</strong>{" "}
                {selectedTransaction.adjustment_type}
              </p>
            </div>

            <h4 className="text-lg font-bold mt-4">Journal Lines</h4>
            <table className="w-full border-collapse border mt-2">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-2">Account</th>
                  <th className="border p-2">Debit</th>
                  <th className="border p-2">Credit</th>
                </tr>
              </thead>
              <tbody>
                {journalEntries.map((line) => (
                  <tr key={line.id}>
                    <td className="border p-2">
                      {accounts.find((acc) => acc.id === line.account_id)
                        ?.account_name || "Unknown"}
                    </td>
                    <td className="border p-2 text-green-600">
                      {line.debit.toFixed(2)}
                    </td>
                    <td className="border p-2 text-red-600">
                      {line.credit.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td className="border p-2 text-right">Totals:</td>
                  <td className="border p-2 text-green-600">
                    {journalEntries
                      .reduce(
                        (sum, line) => sum + parseFloat(line.debit || 0),
                        0
                      )
                      .toFixed(2)}
                  </td>
                  <td className="border p-2 text-red-600">
                    {journalEntries
                      .reduce(
                        (sum, line) => sum + parseFloat(line.credit || 0),
                        0
                      )
                      .toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
            <div className="flex justify-end space-x-2 mt-4">
              <button
                className="bg-gray-500 text-white py-2 px-4 rounded flex items-center"
                onClick={() => setDetailsModalOpen(false)}
              >
                <FaTimes className="mr-2" /> Close
              </button>
            </div>
          </div>
        </div>
      )}

      
    </div>
  );
};

export default GeneralLedgerComponent;
