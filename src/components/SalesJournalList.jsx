import React, { useState, useEffect } from "react";
import DataTable from "react-data-table-component";
import {
  Pencil as EditIcon,
  Trash2 as DeleteIcon,
  FileEdit as ViewIcon,
  X as CloseIcon,
} from "lucide-react";
import API from "../api";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const SalesJournalTable = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState("");
  const [resetPaginationToggle, setResetPaginationToggle] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [taxes, setTaxes] = useState([]);
  const [selectedTaxes, setSelectedTaxes] = useState([]);
  // Fetch sales journals and taxes
  const fetchData = async () => {
    try {
      setLoading(true);
      const [salesRes, taxesRes] = await Promise.all([
        API.get("/sales-journal"),
        API.get("/taxes"),
      ]);
      setSales(salesRes.data);
      setTaxes(taxesRes.data);
    } catch (error) {
      toast.error("Failed to fetch data");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle tax selection change
  const handleTaxChange = (e) => {
    const options = e.target.options;
    const selected = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selected.push(parseInt(options[i].value));
      }
    }
    setSelectedTaxes(selected);
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (
      window.confirm(
        "Are you sure you want to delete this sales journal entry?"
      )
    ) {
      try {
        await API.delete(`/sales-journal/${id}`);
        toast.success("Sales journal deleted successfully");
        fetchData(); // Refresh data
      } catch (error) {
        toast.error("Failed to delete sales journal");
        console.error("Error:", error);
      }
    }
  };

  // Filter sales based on search text
  const filteredItems = sales.filter(
    (item) =>
      (item.reference_number &&
        item.reference_number
          .toLowerCase()
          .includes(filterText.toLowerCase())) ||
      (item.product_name &&
        item.product_name.toLowerCase().includes(filterText.toLowerCase())) ||
      (item.customer_name &&
        item.customer_name.toLowerCase().includes(filterText.toLowerCase()))
  );

  // Action handlers
  const handleView = (row) => {
    setSelectedSale(row);
    setViewModalOpen(true);
  };

  const handleEdit = (row) => {
    setSelectedSale(row);
    setSelectedTaxes(row.taxes || []);
    setEditModalOpen(true);
  };

  const handleCloseModal = () => {
    setViewModalOpen(false);
    setEditModalOpen(false);
    setSelectedSale(null);
    setSelectedTaxes([]);
  };

  const handleUpdate = async (updatedData) => {
    try {
      const dataToUpdate = {
        ...updatedData,
        taxes: selectedTaxes,
      };
      await API.put(`/sales-journal/${selectedSale.id}`, dataToUpdate);
      toast.success("Sales journal updated successfully");
      fetchData();
      setEditModalOpen(false);
    } catch (error) {
      toast.error("Failed to update sales journal");
      console.error("Error:", error);
    }
  };

  // Columns configuration
  const columns = [
    {
      name: "Reference",
      selector: (row) => row.reference_number,
      sortable: true,
      width: "120px",
    },
    {
      name: "Date",
      selector: (row) => new Date(row.date).toLocaleDateString(),
      sortable: true,
      width: "100px",
    },
    {
      name: "Customer",
      selector: (row) => row.customer_name || "Walk-in",
      sortable: true,
    },
    {
      name: "Product",
      selector: (row) => row.product_name,
      sortable: true,
      wrap: true,
    },
    {
      name: "Qty",
      selector: (row) => row.quantity,
      sortable: true,
      width: "80px",
      center: true,
    },
    {
      name: "Price",
      selector: (row) => `₵${parseFloat(row.selling_price).toFixed(2)}`,
      sortable: true,
      width: "100px",
      right: true,
    },
    {
      name: "Total",
      selector: (row) => `₵${parseFloat(row.total_price).toFixed(2)}`,
      sortable: true,
      width: "120px",
      right: true,
    },
    {
      name: "Payment",
      selector: (row) =>
        row.payment_method.charAt(0).toUpperCase() +
        row.payment_method.slice(1),
      sortable: true,
      width: "100px",
    },
    {
      name: "Actions",
      cell: (row) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleView(row)}
            className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
            title="View"
          >
            <ViewIcon size={18} />
          </button>
          <button
            onClick={() => handleEdit(row)}
            className="p-1 text-green-600 hover:text-green-800 transition-colors"
            title="Edit"
          >
            <EditIcon size={18} />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="p-1 text-red-600 hover:text-red-800 transition-colors"
            title="Delete"
          >
            <DeleteIcon size={18} />
          </button>
        </div>
      ),
      width: "120px",
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
    },
  ];

  // Custom subheader component with search and actions
  const SubHeaderComponent = ({ onFilter, filterText }) => (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-2">
      <div className="w-full md:w-auto">
        <input
          type="text"
          placeholder="Search by reference, product or customer"
          className="p-2 border border-gray-300 rounded-md w-full"
          value={filterText}
          onChange={(e) => {
            onFilter(e);
            setFilterText(e.target.value);
          }}
        />
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-4 overflow-y-scroll h-[85vh]">
      <DataTable
        title="Sales Journals"
        columns={columns}
        data={filteredItems}
        progressPending={loading}
        pagination
        paginationResetDefaultPage={resetPaginationToggle}
        subHeader
        subHeaderComponent={
          <SubHeaderComponent
            onFilter={(e) => {
              setFilterText(e.target.value);
              setResetPaginationToggle(!resetPaginationToggle);
            }}
            filterText={filterText}
          />
        }
        persistTableHead
        highlightOnHover
        striped
        responsive
        customStyles={{
          headCells: {
            style: {
              backgroundColor: "#f8fafc",
              fontWeight: "600",
            },
          },
          cells: {
            style: {
              paddingTop: "0.5rem",
              paddingBottom: "0.5rem",
            },
          },
        }}
      />

      {/* View Modal */}
      {viewModalOpen && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b p-4">
              <h3 className="text-xl font-semibold">Sales Journal Details</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <CloseIcon size={24} />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">
                    Reference Number
                  </h4>
                  <p>{selectedSale.reference_number}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Date</h4>
                  <p>{new Date(selectedSale.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Customer</h4>
                  <p>{selectedSale.customer_name || "Walk-in"}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">
                    Payment Method
                  </h4>
                  <p>
                    {selectedSale.payment_method.charAt(0).toUpperCase() +
                      selectedSale.payment_method.slice(1)}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-medium text-gray-700 mb-2">Items</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                          Product
                        </th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">
                          Qty
                        </th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">
                          Price
                        </th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="px-4 py-2">
                          {selectedSale.product_name}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {selectedSale.quantity}
                        </td>
                        <td className="px-4 py-2 text-right">
                          ₵{parseFloat(selectedSale.selling_price).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          ₵{parseFloat(selectedSale.total_price).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">
                    Description
                  </h4>
                  <p>{selectedSale.description || "N/A"}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Taxes</h4>
                  <p>
                    {selectedSale.applied_taxes?.join(", ") ||
                      "No taxes applied"}
                  </p>
                </div>
              </div>
            </div>
            <div className="border-t p-4 flex justify-end">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {editModalOpen && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b p-4">
              <h3 className="text-xl font-semibold">
                Edit Sales Journal - {selectedSale.reference_number}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <CloseIcon size={24} />
              </button>
            </div>
            <div className="p-6">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);

                  const updatedData = {
                    product_name: formData.get("product_name"),
                    quantity: parseFloat(formData.get("quantity")),
                    cost_price: parseFloat(formData.get("cost_price")),
                    selling_price: parseFloat(formData.get("selling_price")),
                    discount_type: formData.get("discount_type"),
                    discount_amount: parseFloat(
                      formData.get("discount_amount") || 0
                    ),
                    description: formData.get("description"),
                    customer_id: selectedSale.customer_id, // Preserve original customer
                    payment_method: formData.get("payment_method"),
                    taxes: selectedTaxes,
                  };

                  try {
                    await handleUpdate(updatedData);
                  } catch (error) {
                    console.error("Update error:", error);
                  }
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block font-medium text-gray-700 mb-2">
                      Product Name
                    </label>
                    <input
                      type="text"
                      name="product_name"
                      defaultValue={selectedSale.product_name}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-gray-700 mb-2">
                      Quantity
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      defaultValue={selectedSale.quantity}
                      min="1"
                      step="1"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-gray-700 mb-2">
                      Cost Price (₵)
                    </label>
                    <input
                      type="number"
                      name="cost_price"
                      defaultValue={selectedSale.cost_price}
                      min="0"
                      step="0.01"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-gray-700 mb-2">
                      Selling Price (₵)
                    </label>
                    <input
                      type="number"
                      name="selling_price"
                      defaultValue={selectedSale.selling_price}
                      min="0"
                      step="0.01"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-gray-700 mb-2">
                      Discount Type
                    </label>
                    <select
                      name="discount_type"
                      defaultValue={selectedSale.discount_type || "percentage"}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-gray-700 mb-2">
                      Discount Amount
                    </label>
                    <input
                      type="number"
                      name="discount_amount"
                      defaultValue={selectedSale.discount_amount || 0}
                      min="0"
                      step="0.01"
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-gray-700 mb-2">
                      Payment Method
                    </label>
                    <select
                      name="payment_method"
                      defaultValue={selectedSale.payment_method}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="cash">Cash</option>
                      <option value="credit">Credit</option>
                    </select>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block font-medium text-gray-700 mb-2">
                    Taxes
                  </label>
                  <select
                    multiple
                    value={selectedTaxes}
                    onChange={(e) => {
                      const options = Array.from(
                        e.target.selectedOptions,
                        (option) => parseInt(option.value)
                      );
                      setSelectedTaxes(options);
                    }}
                    className="w-full p-2 border border-gray-300 rounded-md min-h-[100px]"
                  >
                    {taxes.map((tax) => (
                      <option
                        key={tax.id}
                        value={tax.id}
                        className="p-2 hover:bg-gray-100"
                      >
                        {tax.tax_name} ({tax.tax_rate}%)
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-500 mt-1">
                    Hold Ctrl/Cmd to select multiple taxes
                  </p>
                </div>

                <div className="mb-6">
                  <label className="block font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    defaultValue={selectedSale.description}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    rows="3"
                  />
                </div>

                <div className="border-t pt-4 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesJournalTable;
