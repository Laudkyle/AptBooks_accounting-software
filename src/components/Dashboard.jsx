import React, { useState, useEffect } from "react";
import { Bar, Line, Pie } from "react-chartjs-2";
import API from "../api.js";

import {
  FiDollarSign,
  FiShoppingCart,
  FiCalendar,
  FiTrendingDown,
  FiCreditCard,
  FiBarChart2,
} from "react-icons/fi";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement
);
const Dashboard = ({ companyName }) => {
  // State for time ranges
  const [salesChartRange, setSalesChartRange] = useState("this-month");
  const [trendChartRange, setTrendChartRange] = useState("this-month");
  const [customRange, setCustomRange] = useState({
    start: "",
    end: "",
  });

  // Filter out-of-stock products
  const [salesData, setSalesData] = useState([]);
  const [productData, setProductData] = useState([]);
  const [fromDate, setFromDate] = useState("2020-01-01");
  const [toDate, setToDate] = useState(Date.now);
  // Fetch the sales data
  const [netProfit, setNetProfit] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [salesReturns, setSalesReturns] = useState([]);
  const [purchaseReturns, setPurchaseReturns] = useState([]);
  const [expenses, setExpenses] = useState([]); // Add expenses if available
  const [error, setError] = useState(null);
  // Date range calculation functions
  const getDateRange = (range) => {
    const today = new Date();
    let startDate, endDate;

    switch (range) {
      case "today":
        startDate = new Date(today);
        endDate = new Date(today);
        break;
      case "this-week":
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay());
        endDate = new Date(today);
        endDate.setDate(today.getDate() + (6 - today.getDay()));
        break;
      case "this-month":
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case "this-year":
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
        break;
      case "custom":
        if (customRange.start && customRange.end) {
          startDate = new Date(customRange.start);
          endDate = new Date(customRange.end);
        } else {
          // Default to this month if custom range not set
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        }
        break;
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }

    return {
      start: startDate.toISOString().split("T")[0],
      end: endDate.toISOString().split("T")[0],
    };
  };

  // Filter data by date range
  const filterDataByRange = (data, rangeType) => {
    const range = rangeType === "sales" ? salesChartRange : trendChartRange;
    const { start, end } = getDateRange(range);

    return data.filter((item) => {
      const itemDate = new Date(item.date).toISOString().split("T")[0];
      return itemDate >= start && itemDate <= end;
    });
  };
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all required data in parallel for efficiency
        const [
          salesRes,
          purchaseOrdersRes,
          salesReturnsRes,
          purchaseReturnsRes,
        ] = await Promise.all([
          API.get("/sales"),
          API.get("/purchase_orders"),
          API.get("/sales/returns"),
          API.get("/purchase/returns"),
        ]);

        setSalesData(salesRes.data);
        setPurchaseOrders(purchaseOrdersRes.data);
        setSalesReturns(salesReturnsRes.data);
        setPurchaseReturns(purchaseReturnsRes.data);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to fetch data.");
      }
    };

    fetchData();
  }, []);

  // Prepare chart data with filtered data
  const filteredSalesData = filterDataByRange(salesData, "sales");
  const filteredTrendData = filterDataByRange(salesData, "trend");

  // Sales Over Time (Line Chart)
  const salesByDate = filteredTrendData.reduce((acc, sale) => {
    const saleDate = new Date(sale.date).toISOString().split("T")[0];
    if (acc[saleDate]) {
      acc[saleDate] += sale.total_price;
    } else {
      acc[saleDate] = sale.total_price;
    }
    return acc;
  }, {});

  const sortedDates = Object.keys(salesByDate).sort(
    (a, b) => new Date(a) - new Date(b)
  );

  // Update the bar chart data preparation to use filtered data
  const totalSalesByProduct = filteredSalesData.reduce((acc, sale) => {
    if (acc[sale.product_name]) {
      acc[sale.product_name] += sale.total_price;
    } else {
      acc[sale.product_name] = sale.total_price;
    }
    return acc;
  }, {});

  const barChartData = {
    labels: Object.keys(totalSalesByProduct),
    datasets: [
      {
        label: "Total Sales",
        data: Object.values(totalSalesByProduct),
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
    ],
  };
  // Set default dates to current month
  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(2020, 1, 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    setFromDate(firstDay.toISOString().split("T")[0]);
    setToDate(lastDay.toISOString().split("T")[0]);
  }, []);

  // Calculate totals with filtered data
  const totalSales = filteredSalesData.reduce(
    (acc, sale) => acc + sale.total_price,
    0
  );
  const totalPurchases = purchaseOrders.reduce(
    (acc, order) => acc + order.total_amount,
    0
  );
  const totalSalesReturns = salesReturns.reduce(
    (acc, returnItem) =>
      acc + returnItem.return_quantity * returnItem.selling_price,
    0
  );
  const totalPurchaseReturns = purchaseReturns.reduce(
    (acc, supplier) => acc + (supplier.total_purchase_return_due || 0),
    0
  );

  useEffect(() => {
    const fetchIncomeStatement = async () => {
      if (!fromDate || !toDate) return; // Ensure both dates are selected

      try {
        console.log("Fetching income statement from:", fromDate, "to:", toDate);

        const response = await API.get("/reports/income-statement", {
          params: { from_date: fromDate, to_date: toDate },
        });

        console.log("Received response:", response.data);
        setNetProfit(response.data.netIncome);
        setExpenses(response.data.totalExpenses);
      } catch (err) {
        setError("Failed to load income statement data.");
        console.error(err);
      } finally {
      }
    };

    fetchIncomeStatement();
  }, [fromDate, toDate]); // Fetch when dates change
  // Prepare data for the line chart (sales over time)

  // Prepare sorted data for the line chart
  const lineChartData = {
    labels: sortedDates,
    datasets: [
      {
        label: "Sales Over Time",
        data: sortedDates.map((date) => salesByDate[date]),
        fill: false,
        borderColor: "rgba(153, 102, 255, 1)",
        tension: 0.1,
      },
    ],
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await API.get("/products");
        setProductData(response.data);
      } catch (err) {
        console.error("Error fetching product data:", err);
        setError("Failed to fetch product data. Please try again.");
      }
    };

    fetchProducts();
  }, []); // Runs once on mount

  const outOfStockProducts = productData.filter(
    (product) => product.quantity_in_stock === 0
  );

  // Date range selector component
  const DateRangeSelector = ({ value, onChange, chartType }) => (
    <div className="flex items-center space-x-2 mb-4">
      <FiCalendar className="text-gray-500" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border rounded px-2 py-1 text-sm"
      >
        <option value="today">Today</option>
        <option value="this-week">This Week</option>
        <option value="this-month">This Month</option>
        <option value="this-year">This Year</option>
        <option value="custom">Custom Range</option>
      </select>

      {value === "custom" && (
        <div className="flex space-x-2">
          <input
            type="date"
            value={customRange.start}
            onChange={(e) =>
              setCustomRange({ ...customRange, start: e.target.value })
            }
            className="border rounded px-2 py-1 text-sm"
          />
          <span>to</span>
          <input
            type="date"
            value={customRange.end}
            onChange={(e) =>
              setCustomRange({ ...customRange, end: e.target.value })
            }
            className="border rounded px-2 py-1 text-sm"
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="h-[85vh] overflow-scroll bg-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
        {companyName}
      </h1>
      <div className="grid grid-cols-3 grid-rows-2 gap-6 mb-12">
        {/* Total Sales */}
        <div className="bg-white shadow-lg rounded-lg p-4 text-center justify-center space-x-4 flex flex-row items-center transition-transform transform hover:-translate-y-1">
          <FiDollarSign className="text-4xl text-blue-500 mb-2" />
          <div>
            <h2 className="text-sm font-light text-gray-700">Total Sales</h2>
            <p className="text-2xl font-bold text-gray-800">
              ₵{totalSales.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Total Purchases */}
        <div className="bg-white shadow-lg rounded-lg p-4 text-center justify-center space-x-4 flex flex-row items-center transition-transform transform hover:-translate-y-1">
          <FiShoppingCart className="text-4xl text-green-500 mb-2" />
          <div>
            <h2 className="text-sm font-light text-gray-700">
              Total Purchases
            </h2>
            <p className="text-2xl font-bold text-gray-800">
              ₵{totalPurchases.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Total Purchase Returns */}
        <div className="bg-white shadow-lg rounded-lg p-4 text-center justify-center space-x-4 flex flex-row items-center transition-transform transform hover:-translate-y-1">
          <FiTrendingDown className="text-4xl text-red-500 mb-2" />
          <div>
            <h2 className="text-sm font-light text-gray-700">
              Purchase Returns
            </h2>
            <p className="text-2xl font-bold text-gray-800">
              ₵{totalPurchaseReturns.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Expenses */}
        <div className="bg-white shadow-lg rounded-lg p-4 text-center justify-center space-x-4 flex flex-row items-center transition-transform transform hover:-translate-y-1">
          <FiCreditCard className="text-4xl text-yellow-500 mb-2" />
          <div>
            <h2 className="text-sm font-light text-gray-700">Expenses</h2>
            <p className="text-2xl font-bold text-gray-800">₵{expenses}</p>
          </div>
        </div>

        {/* Total Sales Returns */}
        <div className="bg-white shadow-lg rounded-lg p-4 text-center justify-center space-x-4 flex flex-row items-center transition-transform transform hover:-translate-y-1">
          <FiTrendingDown className="text-4xl text-orange-500 mb-2" />
          <div>
            <h2 className="text-sm font-light text-gray-700">Sales Returns</h2>
            <p className="text-2xl font-bold text-gray-800">
              ₵{totalSalesReturns.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-white shadow-lg rounded-lg p-4 text-center justify-center space-x-4 flex flex-row items-center transition-transform transform hover:-translate-y-1">
          <FiBarChart2 className="text-4xl text-purple-500 mb-2" />
          <div>
            <h2 className="text-sm font-light text-gray-700">Net Profit</h2>
            <p
              className={`${
                netProfit > 0
                  ? "text-2xl font-bold text-green-600"
                  : "text-2xl font-bold text-red-600"
              }`}
            >
              ₵{netProfit ? parseFloat(netProfit).toFixed(2) : 0}
            </p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-16 mb-16">
        {/* Bar Chart */}

        <div className="h-[calc(70vh-2rem)] bg-white shadow-lg rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl text-centsm font-light text-gray-700">
              Total Sales by Product
            </h2>
            <DateRangeSelector
              value={salesChartRange}
              onChange={setSalesChartRange}
              chartType="sales"
            />
          </div>
          <Bar
            data={barChartData}
            options={{ responsive: true, maintainAspectRatio: false }}
          />
        </div>
        {/* Line Chart */}
        {/* Line Chart with Date Selector */}
        <div className="h-[calc(70vh-2rem)] bg-white shadow-lg rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl text-centsm font-light text-gray-700">
              Sales Over Time
            </h2>
            <DateRangeSelector
              value={trendChartRange}
              onChange={setTrendChartRange}
              chartType="trend"
            />
          </div>
          <Line
            data={lineChartData}
            options={{ responsive: true, maintainAspectRatio: false }}
          />
        </div>
      </div>
      {/* Out of Stock Products Section - Red Theme */}
      {outOfStockProducts.length > 0 && (
        <div className="bg-white shadow-lg rounded-lg p-6 mt-8 mb-6 border-l-4 border-red-500">
          <h2 className="text-xl font-semibold text-center text-red-700">
            ⚠️ Products out of stock
          </h2>
          <div className="bg-red-50 rounded-lg p-6 mt-2 max-h-[300px] overflow-scroll">
            {outOfStockProducts.length > 0 ? (
              <table className="min-w-full bg-white text-gray-700">
                <thead>
                  <tr className="bg-red-100">
                    <th className="px-6 py-3 text-left border-b text-sm font-medium text-red-800">
                      Product Name
                    </th>
                    <th className="px-6 py-3 text-left border-b text-sm font-medium text-red-800">
                      Cost Price
                    </th>
                    <th className="px-6 py-3 text-left border-b text-sm font-medium text-red-800">
                      Selling Price
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {outOfStockProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-red-50">
                      <td className="px-6 py-4 border-b text-sm font-medium text-red-900">
                        {product.name}
                      </td>
                      <td className="px-6 py-4 border-b text-sm text-red-800">
                        ₵{product.cp}
                      </td>
                      <td className="px-6 py-4 border-b text-sm text-red-800">
                        ₵{product.sp}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-red-600">
                No out-of-stock products currently.
              </p>
            )}
          </div>
        </div>
      )}
      {/* Recent Transactions Table */}
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-2sm font-light text-center mb-4 text-gray-700">
          Most Recent Transactions
        </h2>
        <table className="min-w-full bg-white text-gray-700">
          <thead>
            <tr className="bg-gray-200">
              <th className="px-6 py-3 text-left border-b text-sm font-medium">
                Product Name
              </th>
              <th className="px-6 py-3 text-left border-b text-sm font-medium">
                Quantity Sold
              </th>
              <th className="px-6 py-3 text-left border-b text-sm font-medium">
                Total Price
              </th>
              <th className="px-6 py-3 text-left border-b text-sm font-medium">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {salesData.slice(0, 5).map((sale) => (
              <tr key={sale.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 border-b text-sm">
                  {sale.product_name}
                </td>
                <td className="px-6 py-4 border-b text-sm">{sale.quantity}</td>
                <td className="px-6 py-4 border-b text-sm">
                  {sale.total_price}
                </td>
                <td className="px-6 py-4 border-b text-sm">
                  {new Date(sale.date).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
