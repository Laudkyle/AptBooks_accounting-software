import { useState, useEffect } from "react";
import { useUser } from "./AuthContext";
import API from "../api";
import DataTable from "react-data-table-component";
import { FaPlus, FaTrash, FaSave, FaTimes, FaEdit } from "react-icons/fa";
import { toast } from "react-toastify";
import { FiPrinter } from "react-icons/fi";

const JournalEntry = () => {
  const { user } = useUser();
  const [journalEntries, setJournalEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedLines, setSelectedLines] = useState([]);
  
  const generateReferenceNumber = () => {
    const uniqueNumber = Date.now() + Math.floor(Math.random() * 1000000);
    return `REF ${uniqueNumber}`;
  };

  const [formData, setFormData] = useState({
    reference_number: generateReferenceNumber(),
    date: "",
    description: "",
    adjustment_type: "NON ADJUSTMENT",
    status: "pending",
    journal_lines: [{ account_id: "", debit: 0, credit: 0 }],
  });

  useEffect(() => {
    fetchJournalEntries();
    fetchAccounts();
  }, []);

  const fetchJournalEntries = async () => {
    try {
      const response = await API.get("/journal_entry");
      setJournalEntries(response.data);
    } catch (error) {
      toast.error("Error fetching journal entries");
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await API.get("/accounts");
      setAccounts(response.data);
    } catch (error) {
      toast.error("Error fetching accounts");
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLineChange = (index, e) => {
    const updatedLines = [...formData.journal_lines];
    updatedLines[index][e.target.name] = e.target.value;
    setFormData({ ...formData, journal_lines: updatedLines });
  };

  const addJournalLine = () => {
    setFormData({
      ...formData,
      journal_lines: [
        ...formData.journal_lines,
        { account_id: "", debit: 0, credit: 0 },
      ],
    });
  };

  const removeJournalLine = (index) => {
    const updatedLines = [...formData.journal_lines];
    updatedLines.splice(index, 1);
    setFormData({ ...formData, journal_lines: updatedLines });
  };

  const isBalanced = () => {
    const totalDebit = formData.journal_lines.reduce(
      (sum, line) => sum + parseFloat(line.debit || 0),
      0
    );
    const totalCredit = formData.journal_lines.reduce(
      (sum, line) => sum + parseFloat(line.credit || 0),
      0
    );
    return totalDebit.toFixed(2) === totalCredit.toFixed(2);
  };

  const handleSubmit = async (e) => {
    setLoading(true);
    e.preventDefault();
    
    if (!isBalanced()) {
      toast.error(`Total Debits must equal Total Credits!`);
      setLoading(false);
      return;
    }

    try {
      if (isEditMode) {
        await API.put(`/journal_entry/${selectedEntry.id}`, formData);
        toast.success("Journal Entry updated successfully");
      } else {
        await API.post("/journal_entry", formData);
        toast.success("Journal Entry added successfully");
      }
      
      setIsModalOpen(false);
      resetForm();
      fetchJournalEntries();
    } catch (error) {
      toast.error(`Error ${isEditMode ? 'updating' : 'saving'} journal entry`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      reference_number: generateReferenceNumber(),
      date: "",
      description: "",
      adjustment_type: "NON ADJUSTMENT",
      status: "pending",
      journal_lines: [{ account_id: "", debit: 0, credit: 0 }],
    });
    setIsEditMode(false);
    setSelectedEntry(null);
  };

  const handleEdit = (entry) => {
    API.get(`/journal_entry/${entry.id}`)
      .then(response => {
        setSelectedEntry(response.data.entry);
        setFormData({
          ...response.data.entry,
          journal_lines: response.data.lines
        });
        setIsEditMode(true);
        setIsModalOpen(true);
      })
      .catch(error => {
        toast.error("Error fetching journal entry details");
      });
  };

  const handleRowClick = async (row) => {
    try {
      const response = await API.get(`/journal_entry/${row.id}`);
      setSelectedEntry(response.data.entry);
      setSelectedLines(response.data.lines);
      setIsDetailsModalOpen(true);
    } catch (error) {
      toast.error("Error fetching journal entry details");
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById("printable-table").innerHTML;
    const originalContent = document.body.innerHTML;
    const originalTitle = document.title;

    document.title = "Journal Entries Report";
    document.body.innerHTML = printContent;
    window.print();
    
    document.title = originalTitle;
    document.body.innerHTML = originalContent;
  };

  const columns = [
    {
      name: "Reference",
      selector: (row) => row.reference_number,
      sortable: true,
    },
    { name: "Date", selector: (row) => row.date, sortable: true },
    { name: "Description", selector: (row) => row.description, sortable: true },
    { name: "Status", selector: (row) => row.status, sortable: true },
    ...(user?.role.toLowerCase() === "admin" ? [{
      name: "Actions",
      cell: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleEdit(row);
          }}
          className="text-blue-500 hover:text-blue-700"
        >
          <FaEdit />
        </button>
      ),
      ignoreRowClick: true,
    }] : []),
  ];

  const totalDebit = formData.journal_lines.reduce(
    (sum, line) => sum + parseFloat(line.debit || 0),
    0
  );
  const totalCredit = formData.journal_lines.reduce(
    (sum, line) => sum + parseFloat(line.credit || 0),
    0
  );

  return (
    <div className="p-6 bg-gray-100 max-h-[calc(100vh-100px)] overflow-y-scroll">
      <h2 className="text-2xl font-bold mb-4">Journal Entries</h2>

      {user?.role.toLowerCase() === "admin" && (
        <button
          className="mb-4 bg-blue-600 text-white py-2 px-4 rounded flex items-center"
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
        >
          <FaPlus className="mr-2" /> Add Journal Entry
        </button>
      )}

      <div id="printable-table" className="bg-white p-4 z-1 shadow-md rounded-lg">
        <DataTable
          columns={columns}
          onRowClicked={handleRowClick}
          data={journalEntries}
          pagination
          highlightOnHover
          paginationRowsPerPageOptions={[10, 20, 50, 100, journalEntries.length]}
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
          subHeader
          subHeaderComponent={(
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-blue-600 text-white py-1 px-3 text-sm rounded-md hover:bg-blue-700 transition"
            >
              <FiPrinter className="text-lg" /> Print
            </button>
          )}
        />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg max-h-[calc(80vh-100px)] overflow-y-scroll shadow-lg w-3/4">
            <h3 className="text-xl font-bold mb-4">
              {isEditMode ? "Edit Journal Entry" : "Add Journal Entry"}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700">Reference Number</label>
                  <input
                    type="text"
                    name="reference_number"
                    value={formData.reference_number}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                    required
                    readOnly={isEditMode}
                  />
                </div>
                <div>
                  <label className="block text-gray-700">Date</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-gray-700">Description</label>
                  <input
                    type="text"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>

              <h4 className="text-lg font-bold mt-4">Journal Lines</h4>
              {formData.journal_lines.map((line, index) => (
                <div key={index} className="grid grid-cols-4 gap-4 mt-2">
                  <div>
                    <label className="block text-gray-700">Account</label>
                    <select
                      name="account_id"
                      value={line.account_id}
                      onChange={(e) => handleLineChange(index, e)}
                      className="p-2 border rounded w-full"
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
                    <label className="block text-gray-700">Debit</label>
                    <input
                      type="number"
                      name="debit"
                      value={line.debit}
                      onChange={(e) => handleLineChange(index, e)}
                      className="p-2 border rounded w-full"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700">Credit</label>
                    <input
                      type="number"
                      name="credit"
                      value={line.credit}
                      onChange={(e) => handleLineChange(index, e)}
                      className="p-2 border rounded w-full"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="flex items-center">
                    {formData.journal_lines.length > 1 && (
                      <button
                        type="button"
                        className="mt-6 text-red-500"
                        onClick={() => removeJournalLine(index)}
                      >
                        <FaTrash />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="mt-2 text-blue-500"
                onClick={addJournalLine}
              >
                <div className="bg-blue-600 flex items-center gap-x-1 text-white py-2 px-4 rounded">
                  <FaPlus /> Add Line
                </div>
              </button>

              <div className="mt-4 p-2 border-t">
                <div className="flex justify-between font-bold text-lg">
                  <span>
                    Total Debit:{" "}
                    <span className="text-green-600">
                      {totalDebit.toFixed(2)}
                    </span>
                  </span>
                  <span>
                    Total Credit:{" "}
                    <span className="text-red-600">
                      {totalCredit.toFixed(2)}
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-4">
                <button
                  type="button"
                  className="bg-gray-500 text-white py-2 px-4 rounded"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 flex items-center gap-x-1 text-white py-2 px-4 rounded"
                  disabled={loading}
                >
                  {loading ? "Processing..." : (
                    <>
                      <FaSave /> {isEditMode ? "Update" : "Save"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDetailsModalOpen && selectedEntry && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-3/4">
            <h3 className="text-xl font-bold mb-4">Journal Entry Details</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <p><strong>Reference:</strong> {selectedEntry.reference_number}</p>
              <p><strong>Date:</strong> {selectedEntry.date}</p>
              <p className="col-span-2"><strong>Description:</strong> {selectedEntry.description}</p>
              <p><strong>Status:</strong> {selectedEntry.status}</p>
              <p><strong>Adjustment Type:</strong> {selectedEntry.adjustment_type}</p>
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
                {selectedLines.map((line) => (
                  <tr key={line.id}>
                    <td className="border p-2">
                      {accounts.find(acc => acc.id === line.account_id)?.account_name || "Unknown"}
                    </td>
                    <td className="border p-2 text-green-600">{line.debit.toFixed(2)}</td>
                    <td className="border p-2 text-red-600">{line.credit.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td className="border p-2 text-right">Totals:</td>
                  <td className="border p-2 text-green-600">
                    {selectedLines.reduce((sum, line) => sum + parseFloat(line.debit || 0), 0).toFixed(2)}
                  </td>
                  <td className="border p-2 text-red-600">
                    {selectedLines.reduce((sum, line) => sum + parseFloat(line.credit || 0), 0).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>

            <div className="flex justify-end space-x-2 mt-4">
              {user?.role.toLowerCase() === "admin" && (
                <button
                  className="bg-blue-600 text-white py-2 px-4 rounded flex items-center"
                  onClick={() => {
                    handleEdit(selectedEntry);
                    setIsDetailsModalOpen(false);
                  }}
                >
                  <FaEdit className="mr-2" /> Edit
                </button>
              )}
              <button
                className="bg-gray-500 text-white py-2 px-4 rounded flex items-center"
                onClick={() => setIsDetailsModalOpen(false)}
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

export default JournalEntry;