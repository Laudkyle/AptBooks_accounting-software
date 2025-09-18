import React, { useState, useEffect } from "react";
import API from "../api.js";
import DataTable from "react-data-table-component";
import { toast, ToastContainer } from "react-toastify";

const SalesHistory = () => {
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [filterText, setFilterText] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  useEffect(() => {
    fetchSales();
    fetchCustomers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [sales, timeFilter, customStartDate, customEndDate, filterText]);

  const fetchSales = async () => {
    try {
      const response = await API.get("/sales");
      setSales(response.data);
    } catch (error) {
      console.error("Error fetching sales:", error);
      toast.error("Error fetching sales data.");
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await API.get("/customers");
      setCustomers(response.data);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Error fetching customer data.");
    }
  };

  const getCustomerName = (customerId) => {
    if (!customerId) return "N/A";
    const customer = customers.find((c) => c.id === customerId);
    return customer ? customer.name || customer.business_name : "Unknown Customer";
  };

  const handleSearch = (e) => {
    setFilterText(e.target.value);
  };

  const applyFilters = () => {
    let filtered = [...sales];

    // Apply time filter
    const now = new Date();
    switch (timeFilter) {
      case "today":
        filtered = filtered.filter((sale) => {
          const saleDate = new Date(sale.date);
          return saleDate.toDateString() === now.toDateString();
        });
        break;
      case "week":
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        filtered = filtered.filter((sale) => new Date(sale.date) >= weekStart);
        break;
      case "month":
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        filtered = filtered.filter((sale) => new Date(sale.date) >= monthStart);
        break;
      case "year":
        const yearStart = new Date(now.getFullYear(), 0, 1);
        filtered = filtered.filter((sale) => new Date(sale.date) >= yearStart);
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999); // End of the day
          filtered = filtered.filter(
            (sale) =>
              new Date(sale.date) >= start && new Date(sale.date) <= end
          );
        }
        break;
      default:
        // "all" - no time filter
        break;
    }

    // Apply search filter
    if (filterText) {
      const value = filterText.toLowerCase();
      filtered = filtered.filter(
        (sale) =>
          sale.product_name.toLowerCase().includes(value) ||
          sale.reference_number?.toLowerCase().includes(value) ||
          getCustomerName(sale.customer_id).toLowerCase().includes(value)
      );
    }

    setFilteredSales(filtered);
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
      name: "Customer",
      selector: (row) => getCustomerName(row.customer_id),
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
  ];

  return (
    <div className="p-6 overflow-y-scroll h-[85vh]">
      <ToastContainer />
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-800">Sales History</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label htmlFor="timeFilter" className="text-sm font-medium text-gray-700">
              Time Period:
            </label>
            <select
              id="timeFilter"
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {timeFilter === "custom" && (
            <div className="flex items-center space-x-2">
              <input
                type="date"
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </div>
          )}

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
      </div>

      <DataTable
        columns={columns}
        data={filteredSales}
        pagination
        highlightOnHover
        noDataComponent={
          <div className="py-4 text-center text-gray-500">
            {filterText || timeFilter !== "all"
              ? "No matching sales found"
              : "No sales data available"}
          </div>
        }
      />
    </div>
  );
};

export default SalesHistory;