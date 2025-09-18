import React, { useState, useEffect } from "react";
import DataTable from "react-data-table-component";
import API from "../api.js";
import {
  FaCalendarAlt,
  FaPrint,
  FaFileExcel,
  FaBoxOpen,
  FaExclamationTriangle,
  FaCheckCircle,
  FaList,
  FaSearch,
  FaFilter,
} from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const StockPosition = () => {
  const [stockData, setStockData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [asAtDate, setAsAtDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("cards");
  const [searchTerm, setSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [customCondition, setCustomCondition] = useState("greater-than");
  const [customValue, setCustomValue] = useState("");

  const fetchStock = async (date) => {
    try {
      setIsLoading(true);
      const formattedDate = date.toISOString().split("T")[0];
      const res = await API.get(`/stock/as-at-date?date=${formattedDate}`);
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setStockData(data);
      setFilteredData(data);

      if (data.length === 0) {
        toast.info("No inventory data found for the selected date");
      }
    } catch (err) {
      console.error("Error fetching stock data", err);
      const errorMessage =
        err.response?.data?.message || "Failed to load stock data";
      toast.error(errorMessage);
      setStockData([]);
      setFilteredData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStock(asAtDate);
  }, [asAtDate]);

  useEffect(() => {
    let filtered = stockData.filter((item) =>
      item.product_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    switch (stockFilter) {
      case "in-stock":
        filtered = filtered.filter((item) => item.stock_as_at > 5);
        break;
      case "low-stock":
        filtered = filtered.filter(
          (item) => item.stock_as_at > 0 && item.stock_as_at <= 5
        );
        break;
      case "out-of-stock":
        filtered = filtered.filter((item) => item.stock_as_at <= 0);
        break;
      case "custom":
        if (customValue !== "" && !isNaN(customValue)) {
          const value = parseFloat(customValue);
          switch (customCondition) {
            case "greater-than":
              filtered = filtered.filter((item) => item.stock_as_at > value);
              break;
            case "less-than":
              filtered = filtered.filter((item) => item.stock_as_at < value);
              break;
            case "equal-to":
              filtered = filtered.filter((item) => item.stock_as_at === value);
              break;
            case "greater-equal":
              filtered = filtered.filter((item) => item.stock_as_at >= value);
              break;
            case "less-equal":
              filtered = filtered.filter((item) => item.stock_as_at <= value);
              break;
            case "not-equal":
              filtered = filtered.filter((item) => item.stock_as_at !== value);
              break;
            default:
              break;
          }
        }
        break;
      default:
        break;
    }

    setFilteredData(filtered);
  }, [searchTerm, stockFilter, stockData, customCondition, customValue]);
  const getStockStatus = (stock) => {
    if (stock <= 0)
      return {
        status: "Out of Stock",
        color: "bg-red-500",
        textColor: "text-red-600",
        icon: FaExclamationTriangle,
      };
    if (stock <= 5)
      return {
        status: "Low Stock",
        color: "bg-yellow-500",
        textColor: "text-yellow-600",
        icon: FaExclamationTriangle,
      };
    return {
      status: "In Stock",
      color: "bg-green-500",
      textColor: "text-green-600",
      icon: FaCheckCircle,
    };
  };

  const columns = [
    {
      name: "Product",
      selector: (row) => row.product_name,
      sortable: true,
      minWidth: "250px",
      cell: (row) => (
        <div className="py-2">
          <div className="font-medium text-gray-900">{row.product_name}</div>
          <div className="text-sm text-gray-500">ID: {row.product_id}</div>
        </div>
      ),
    },
    {
      name: "Stock Level",
      selector: (row) => row.stock_as_at,
      sortable: true,
      right: true,
      cell: (row) => {
        const {
          status,
          textColor,
          icon: Icon,
        } = getStockStatus(row.stock_as_at);
        return (
          <div className="text-right">
            <div className={`font-bold text-lg ${textColor}`}>
              {row.stock_as_at} units
            </div>
            <div
              className={`flex items-center justify-end text-xs ${textColor}`}
            >
              <Icon className="mr-1" />
              {status}
            </div>
          </div>
        );
      },
    },
    {
      name: "Current vs Historical",
      selector: (row) => row.current_stock,
      sortable: true,
      cell: (row) => {
        const difference = (row.current_stock || 0) - row.stock_as_at;
        return (
          <div className="text-center">
            <div className="text-sm text-gray-600">
              Current:{" "}
              <span className="font-medium">{row.current_stock || 0}</span>
            </div>
            <div
              className={`text-xs ${
                difference > 0
                  ? "text-green-600"
                  : difference < 0
                  ? "text-red-600"
                  : "text-gray-500"
              }`}
            >
              {difference > 0 ? "+" : ""}
              {difference} change
            </div>
          </div>
        );
      },
    },
  ];

  const pieData = [
    {
      name: "In Stock",
      value: filteredData.filter((item) => item.stock_as_at > 5).length,
      color: "#10B981",
    },
    {
      name: "Low Stock",
      value: filteredData.filter(
        (item) => item.stock_as_at > 0 && item.stock_as_at <= 5
      ).length,
      color: "#F59E0B",
    },
    {
      name: "Out of Stock",
      value: filteredData.filter((item) => item.stock_as_at <= 0).length,
      color: "#EF4444",
    },
  ];

  const stats = {
    total: filteredData.length,
    totalStock: filteredData.reduce(
      (sum, item) => sum + Math.max(0, item.stock_as_at),
      0
    ),
    inStock: filteredData.filter((item) => item.stock_as_at > 5).length,
    lowStock: filteredData.filter(
      (item) => item.stock_as_at > 0 && item.stock_as_at <= 5
    ).length,
    outOfStock: filteredData.filter((item) => item.stock_as_at <= 0).length,
    averageStock:
      filteredData.length > 0
        ? (
            filteredData.reduce((sum, item) => sum + item.stock_as_at, 0) /
            filteredData.length
          ).toFixed(1)
        : 0,
  };

  const exportToExcel = () => {
    if (filteredData.length === 0) {
      toast.warning("No data to export");
      return;
    }

    const exportData = filteredData.map((item) => ({
      Product: item.product_name,
      "Product ID": item.product_id,
      "Stock as at": item.stock_as_at,
      Status: getStockStatus(item.stock_as_at).status,
      "Current Stock": item.current_stock || 0,
      "Sales After Date": item.sales_after_date || 0,
      "Purchases After Date": item.purchases_after_date || 0,
      "Reference Date": item.reference_date,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock Position");
    XLSX.writeFile(
      wb,
      `stock_position_${asAtDate.toISOString().split("T")[0]}.xlsx`
    );
    toast.success("Stock report exported successfully");
  };

  const printReport = () => {
    if (filteredData.length === 0) {
      toast.warning("No data to print");
      return;
    }

    const win = window.open();
    win.document.write(`
      <html>
        <head>
          <title>Stock Position Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .stats { display: flex; justify-content: space-around; margin: 20px 0; }
            .stat-item { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .in-stock { color: #10B981; font-weight: bold; }
            .low-stock { color: #F59E0B; font-weight: bold; }
            .out-stock { color: #EF4444; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Stock Position Report</h1>
            <p>As at: ${asAtDate.toLocaleDateString()}</p>
            <p>Generated: ${new Date().toLocaleString()}</p>
          </div>
          <div class="stats">
            <div class="stat-item"><strong>Total Products:</strong> ${
              stats.total
            }</div>
            <div class="stat-item"><strong>Total Stock:</strong> ${
              stats.totalStock
            } units</div>
            <div class="stat-item"><strong>In Stock:</strong> ${
              stats.inStock
            }</div>
            <div class="stat-item"><strong>Low Stock:</strong> ${
              stats.lowStock
            }</div>
            <div class="stat-item"><strong>Out of Stock:</strong> ${
              stats.outOfStock
            }</div>
          </div>
          <table>
            <thead><tr><th>Product</th><th>Stock Level</th><th>Status</th></tr></thead>
            <tbody>
              ${filteredData
                .map((item) => {
                  const { status } = getStockStatus(item.stock_as_at);
                  const statusClass =
                    status === "In Stock"
                      ? "in-stock"
                      : status === "Low Stock"
                      ? "low-stock"
                      : "out-stock";
                  return `<tr><td>${item.product_name}</td><td>${item.stock_as_at}</td><td class="${statusClass}">${status}</td></tr>`;
                })
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  const ProductCard = ({ item }) => {
    const {
      status,
      color,
      textColor,
      icon: Icon,
    } = getStockStatus(item.stock_as_at);

    return (
      <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 border-l-4 border-blue-500">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="font-bold text-lg text-gray-900 mb-1">
              {item.product_name}
            </h3>
            <p className="text-sm text-gray-500">ID: {item.product_id}</p>
          </div>
          <div
            className={`p-2 rounded-full ${color.replace(
              "bg-",
              "bg-opacity-20 bg-"
            )}`}
          >
            <Icon className={`${textColor} text-lg`} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-2xl font-bold text-gray-900">
              {item.stock_as_at}
            </span>
            <span className="text-sm text-gray-500">units</span>
          </div>

          <div
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${color.replace(
              "bg-",
              "bg-opacity-20 bg-"
            )} ${textColor}`}
          >
            <Icon className="mr-1" />
            {status}
          </div>

          {(item.current_stock !== undefined ||
            item.sales_after_date !== undefined ||
            item.purchases_after_date !== undefined) && (
            <div className="border-t pt-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Current:</span>
                <span className="font-medium">{item.current_stock || 0}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-red-500">Sales after:</span>
                <span className="text-red-600 font-medium">
                  {item.sales_after_date || 0}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-green-500">Purchases after:</span>
                <span className="text-green-600 font-medium">
                  {item.purchases_after_date || 0}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 h-[85vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading stock data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 bg-gradient-to-br from-blue-50 to-indigo-100 overflow-y-scroll h-[85vh]">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Stock Position Dashboard
        </h1>
        <p className="text-gray-600">
          Real-time inventory overview and analytics
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Date Picker */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              As at Date
            </label>
            <div className="relative">
              <DatePicker
                selected={asAtDate}
                onChange={(date) => setAsAtDate(date)}
                maxDate={new Date()}
                dateFormat="yyyy-MM-dd"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <FaCalendarAlt className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Search */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Search Products
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by product name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <FaSearch className="absolute left-3 top-3 text-gray-400" />
            </div>
          </div>

          {/* Filter */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Stock Filter
            </label>
            <div className="relative">
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
              >
                <option value="all">All Products</option>
                <option value="in-stock">In Stock (>5)</option>
                <option value="low-stock">Low Stock (1-5)</option>
                <option value="out-of-stock">Out of Stock (0)</option>
                <option value="custom">Custom Condition</option>
              </select>
              <FaFilter className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Custom Filter Controls */}
        {stockFilter === "custom" && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Custom Stock Condition
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-600">
                  Show products where stock is:
                </label>
                <select
                  value={customCondition}
                  onChange={(e) => setCustomCondition(e.target.value)}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="greater-than">Greater than (&gt;)</option>
                  <option value="greater-equal">
                    Greater than or equal (≥)
                  </option>
                  <option value="less-than">Less than (&lt;)</option>
                  <option value="less-equal">Less than or equal (≤)</option>
                  <option value="equal-to">Equal to (=)</option>
                  <option value="not-equal">Not equal to (≠)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-600">
                  Value:
                </label>
                <input
                  type="number"
                  placeholder="Enter value"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  step="0.1"
                />
              </div>

              <div className="flex items-end">
                <div className="text-sm text-gray-600 p-2 bg-white rounded-md border border-gray-200 min-h-[36px] flex items-center">
                  {customValue !== "" && !isNaN(customValue) ? (
                    <span>
                      Stock{" "}
                      <span className="font-medium text-blue-600">
                        {customCondition === "greater-than"
                          ? ">"
                          : customCondition === "greater-equal"
                          ? "≥"
                          : customCondition === "less-than"
                          ? "<"
                          : customCondition === "less-equal"
                          ? "≤"
                          : customCondition === "equal-to"
                          ? "="
                          : "≠"}{" "}
                        {customValue}
                      </span>
                    </span>
                  ) : (
                    <span className="text-gray-400">Preview condition</span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick preset buttons */}
            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-600 mb-2">
                Quick Presets:
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setCustomCondition("equal-to");
                    setCustomValue("0");
                  }}
                  className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors"
                >
                  Zero Stock
                </button>
                <button
                  onClick={() => {
                    setCustomCondition("less-than");
                    setCustomValue("10");
                  }}
                  className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full hover:bg-yellow-200 transition-colors"
                >
                  &lt; 10 units
                </button>
                <button
                  onClick={() => {
                    setCustomCondition("greater-than");
                    setCustomValue("50");
                  }}
                  className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
                >
                  &gt; 50 units
                </button>
                <button
                  onClick={() => {
                    setCustomCondition("greater-equal");
                    setCustomValue("100");
                  }}
                  className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                >
                  ≥ 100 units
                </button>
                <button
                  onClick={() => {
                    setCustomValue("");
                  }}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Results indicator */}
            {stockFilter === "custom" &&
              customValue !== "" &&
              !isNaN(customValue) && (
                <div className="mt-4 p-3 bg-blue-50 rounded-md">
                  <div className="flex items-center">
                    <FaFilter className="text-blue-500 mr-2" />
                    <span className="text-sm text-blue-700">
                      Showing <strong>{filteredData.length}</strong> product(s)
                      where stock{" "}
                      <strong>
                        {customCondition === "greater-than"
                          ? ">"
                          : customCondition === "greater-equal"
                          ? "≥"
                          : customCondition === "less-than"
                          ? "<"
                          : customCondition === "less-equal"
                          ? "≤"
                          : customCondition === "equal-to"
                          ? "="
                          : "≠"}{" "}
                        {customValue}
                      </strong>
                    </span>
                  </div>
                </div>
              )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("cards")}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                viewMode === "cards"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              <FaBoxOpen className="mr-2" /> Cards
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                viewMode === "table"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              <FaList className="mr-2" /> Table
            </button>
          </div>

          <div className="flex gap-2 ml-auto">
            <button
              onClick={exportToExcel}
              className="flex items-center bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
              disabled={filteredData.length === 0}
            >
              <FaFileExcel className="mr-2" /> Export
            </button>
            <button
              onClick={printReport}
              className="flex items-center bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              disabled={filteredData.length === 0}
            >
              <FaPrint className="mr-2" /> Print
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <FaBoxOpen className="text-3xl text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Stock</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalStock}
              </p>
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold text-sm">Σ</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Stock</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.inStock}
              </p>
            </div>
            <FaCheckCircle className="text-3xl text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-yellow-600">
                {stats.lowStock}
              </p>
            </div>
            <FaExclamationTriangle className="text-3xl text-yellow-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600">
                {stats.outOfStock}
              </p>
            </div>
            <FaExclamationTriangle className="text-3xl text-red-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Stock</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.averageStock}
              </p>
            </div>
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-gray-600 font-bold text-sm">μ</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {filteredData.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <FaBoxOpen className="text-6xl text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            No products found
          </h3>
          <p className="text-gray-500">
            Try adjusting your search or filter criteria
          </p>
        </div>
      ) : (
        <>
          {viewMode === "cards" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredData.map((item) => (
                <ProductCard key={item.product_id} item={item} />
              ))}
            </div>
          )}

          {viewMode === "table" && (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <DataTable
                columns={columns}
                data={filteredData}
                pagination
                paginationPerPage={20}
                paginationRowsPerPageOptions={[10, 20, 50, 100]}
                highlightOnHover
                striped
                responsive
                customStyles={{
                  headRow: {
                    style: {
                      backgroundColor: "#f8fafc",
                      borderBottom: "1px solid #e2e8f0",
                    },
                  },
                  rows: {
                    style: {
                      minHeight: "60px",
                    },
                  },
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StockPosition;
