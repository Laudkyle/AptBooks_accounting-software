import React, { useState, useEffect } from "react";
import API from "../api.js";
import DataTable from "react-data-table-component";
import { toast, ToastContainer } from "react-toastify";
import { FaArrowLeft } from "react-icons/fa";

const SaleReturn = () => {
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [filterText, setFilterText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [returnQuantity, setReturnQuantity] = useState(0);
  const [restockOption, setRestockOption] = useState("restock");
  const [reason, setReason] = useState("");
  const [returnType, setReturnType] = useState("partial");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const response = await API.get("/sales");

      const filtered = response.data.filter(
        (sale) =>
          sale.return_status == "partial_return" ||
          sale.return_status == "not_returned"
      );
      setSales(filtered);
      setFilteredSales(filtered);
    } catch (error) {
      console.error("Error fetching sales:", error);
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value.toLowerCase();
    setFilterText(value);

    const filtered = sales.filter(
      (sale) =>
        sale.product_name.toLowerCase().includes(value) ||
        sale.reference_number?.toLowerCase().includes(value)
    );
    setFilteredSales(filtered);
  };
  const handleReturn = async () => {
    if (!selectedSale) return;

    if (returnQuantity <= 0 || returnQuantity > selectedSale.quantity) {
      toast.error("Invalid return quantity!");
      return;
    }
    setLoading(true);
    // Extract and format taxes correctly
    let taxesArray = [];
    if (typeof selectedSale.applied_taxes === "string") {
      taxesArray = selectedSale.applied_taxes
        .split("|")
        .map((tax) => tax.trim());
    }

    const returnData = {
      sale_id: selectedSale.id,
      reference_number: selectedSale.reference_number,
      product_id: selectedSale.product_id, // Ensure this is defined
      customer_id: selectedSale.customer_id,
      return_quantity: returnQuantity,
      payment_method: selectedSale.payment_method,
      selling_price: selectedSale.selling_price,
      taxes: taxesArray,
      discount_type: selectedSale.discount_type,
      discount_amount: selectedSale.discount_amount,
      action: restockOption,
      return_type: returnQuantity == selectedSale.quantity ? "full" : "partial",
      status: "approved",
      reason: "please", // Allow user to enter a reason later
    };
    try {
      const response = await API.post("/sales-return", returnData);

      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`Unexpected response status: ${response.status}`);
      }

      toast.success("Return processed successfully!");
      setModalVisible(false);

      fetchSales(); // Refresh sales data
    } catch (error) {
      console.error("Error processing return:", error);
      toast.error("Error processing return. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      name: "Reference Number",
      selector: (row) => row.reference_number,
      sortable: true,
    },
    {
      name: "Product Name",
      selector: (row) => row.product_name,
      sortable: true,
    },
    {
      name: "Quantity",
      selector: (row) => row.quantity,
      sortable: true,
    },
    {
      name: "Total Price",
      selector: (row) => row.total_price.toFixed(2),
      sortable: true,
    },
    {
      name: "Payment Method",
      selector: (row) => row.payment_method,
      sortable: true,
    },
    {
      name: "Date",
      selector: (row) => new Date(row.date).toLocaleDateString(),
      sortable: true,
    },
    {
      name: "Actions",
      cell: (row) => (
        <button
          onClick={() => {
            setSelectedSale(row);
            setModalVisible(true);
            setReturnQuantity(0);
            setReason("");
          }}
          className="text-blue-600 hover:bg-blue-100 p-2 rounded"
        >
          <FaArrowLeft title="Return" />
        </button>
      ),
    },
  ];

  return (
    <div className="p-6 overflow-y-scroll h-[85vh]">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-800">
          Make Sales Return
        </h2>
        <div className="relative w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Search sales..."
            value={filterText}
            onChange={handleSearch}
          />
        </div>
      </div>
      {modalVisible && selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gray-50 px-6 py-2 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">
                  Process Product Return
                </h2>
                <button
                  onClick={() => setModalVisible(false)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-2">
              {/* Product Info */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Product:</span>
                  <span className="font-medium">
                    {selectedSale.product_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Quantity Sold:</span>
                  <span className="font-medium">{selectedSale.quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Unit Price:</span>
                  <span className="font-medium">
                    ₵{selectedSale.selling_price.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Return Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Return Quantity *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max={selectedSale.quantity}
                    value={returnQuantity}
                    onChange={(e) =>
                      setReturnQuantity(
                        Math.min(Number(e.target.value), selectedSale.quantity)
                      )
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={`Max: ${selectedSale.quantity}`}
                  />
                  <span className="absolute right-12 top-2 text-gray-500 text-sm">
                    of {selectedSale.quantity}
                  </span>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Return *
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Please specify the reason for return..."
                />
              </div>

              {/* Action */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Return Action *
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label
                    className={`flex items-center justify-center p-4 border rounded-lg cursor-pointer transition-all ${
                      restockOption === "restock"
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                        : "border-gray-300 hover:border-blue-300"
                    }`}
                  >
                    <input
                      type="radio"
                      value="restock"
                      checked={restockOption === "restock"}
                      onChange={(e) => setRestockOption(e.target.value)}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 mx-auto mb-1 text-blue-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      <span className="font-medium">Restock</span>
                      <p className="text-xs text-gray-500 mt-1">
                        Return to inventory
                      </p>
                    </div>
                  </label>
                  <label
                    className={`flex items-center justify-center p-2 border rounded-lg cursor-pointer transition-all ${
                      restockOption === "dispose"
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                        : "border-gray-300 hover:border-blue-300"
                    }`}
                  >
                    <input
                      type="radio"
                      value="dispose"
                      checked={restockOption === "dispose"}
                      onChange={(e) => setRestockOption(e.target.value)}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 mx-auto mb-1 text-red-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      <span className="font-medium">Dispose</span>
                      <p className="text-xs text-gray-500 mt-1">
                        Remove from inventory
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t flex justify-end space-x-3">
              <button
                onClick={() => setModalVisible(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReturn}
                disabled={!returnQuantity || !reason || loading }
                className={`px-4 py-2 rounded-lg text-white transition-colors ${
                  !returnQuantity || !reason
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                Process Return
              </button>
            </div>
          </div>
        </div>
      )}
      <DataTable
        columns={columns}
        data={filteredSales}
        pagination
        highlightOnHover
        noDataComponent={
          <div className="py-4 text-center text-gray-500">
            {filterText ? "No matching sales found" : "No sales data available"}
          </div>
        }
      />
    </div>
  );
};

export default SaleReturn;
