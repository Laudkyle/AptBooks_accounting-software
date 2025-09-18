import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import {
  Calendar,
  TrendingUp,
  DollarSign,
  Package,
  Users,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Filter,
} from "lucide-react";
import API from "../api.js";
import { toast } from "react-toastify";

const PurchaseAnalysis = () => {
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [selectedSupplier, setSelectedSupplier] = useState("all");
  const [loading, setLoading] = useState(false);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);

  // Filter orders based on selected period and supplier
  useEffect(() => {
    const now = new Date();
    let filtered = purchaseOrders;

    // Apply time filter
    switch (selectedPeriod) {
      case "last30":
        const thirtyDaysAgo = new Date(
          now.getTime() - 30 * 24 * 60 * 60 * 1000
        );
        filtered = purchaseOrders.filter(
          (order) => new Date(order.date) >= thirtyDaysAgo
        );
        break;
      case "last90":
        const ninetyDaysAgo = new Date(
          now.getTime() - 90 * 24 * 60 * 60 * 1000
        );
        filtered = purchaseOrders.filter(
          (order) => new Date(order.date) >= ninetyDaysAgo
        );
        break;
      case "thisYear":
        const currentYear = now.getFullYear();
        filtered = purchaseOrders.filter(
          (order) => new Date(order.date).getFullYear() === currentYear
        );
        break;
      default:
        filtered = purchaseOrders;
    }

    // Apply supplier filter
    if (selectedSupplier !== "all") {
      filtered = filtered.filter(
        (order) => order.supplier_id.toString() === selectedSupplier
      );
    }

    setFilteredOrders(filtered);
  }, [selectedPeriod, selectedSupplier, purchaseOrders]);

  useEffect(() => {
    const fetchSuppliersAndOrders = async () => {
      setLoading(true);
      try {
        // Fetch suppliers
        const suppliersResponse = await API.get("/suppliers");
        const suppliersData = suppliersResponse.data;

        // Fetch purchase orders
        const purchaseOrdersResponse = await API.get("/purchase_orders");
        const purchaseOrdersData = purchaseOrdersResponse.data;

        // Map supplier names to purchase orders
        const enhancedPurchaseOrders = purchaseOrdersData.map((order) => {
          const supplier = suppliersData.find(
            (sup) => sup.id === order.supplier_id
          );
          return {
            ...order,
            supplier_name: supplier ? supplier.name || supplier.business_name : "Unknown Supplier",
          };
        });

        setSuppliers(suppliersData);
        setPurchaseOrders(enhancedPurchaseOrders);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to fetch data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchSuppliersAndOrders();
  }, []);

  // Calculate key metrics
  const totalPurchaseValue = filteredOrders.reduce(
    (sum, order) => sum + parseFloat(order.total_amount),
    0
  );
  const totalOrders = filteredOrders.length;
  const averageOrderValue =
    totalOrders > 0 ? totalPurchaseValue / totalOrders : 0;
  const uniqueSuppliers = new Set(
    filteredOrders.map((order) => order.supplier_id)
  ).size;

  // Status distribution
  const statusCounts = filteredOrders.reduce((acc, order) => {
    acc[order.order_status] = (acc[order.order_status] || 0) + 1;
    return acc;
  }, {});

  const statusData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
    percentage: ((count / totalOrders) * 100).toFixed(1),
  }));

  // Payment status distribution
  const paymentCounts = filteredOrders.reduce((acc, order) => {
    acc[order.payment_status] = (acc[order.payment_status] || 0) + 1;
    return acc;
  }, {});

  const paymentData = Object.entries(paymentCounts).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
    amount: filteredOrders
      .filter((order) => order.payment_status === status)
      .reduce((sum, order) => sum + parseFloat(order.total_amount), 0),
  }));

  // Supplier analysis
  const supplierAnalysis = suppliers
    .map((supplier) => {
      const supplierOrders = filteredOrders.filter(
        (order) => order.supplier_id === supplier.id
      );
      const totalValue = supplierOrders.reduce(
        (sum, order) => sum + parseFloat(order.total_amount),
        0
      );
      const orderCount = supplierOrders.length;

      return {
        id: supplier.id,
        name: supplier.name || supplier.business_name,
        totalValue,
        orderCount,
        averageOrderValue: orderCount > 0 ? totalValue / orderCount : 0,
        receivedOrders: supplierOrders.filter(
          (order) => order.order_status === "received"
        ).length,
        pendingOrders: supplierOrders.filter(
          (order) => order.order_status === "pending"
        ).length,
      };
    })
    .filter((supplier) => supplier.orderCount > 0)
    .sort((a, b) => b.totalValue - a.totalValue);

  // Monthly trend analysis
  const monthlyData = filteredOrders.reduce((acc, order) => {
    const date = new Date(order.date);
    const monthKey = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;

    if (!acc[monthKey]) {
      acc[monthKey] = {
        month: date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
        }),
        totalValue: 0,
        orderCount: 0,
      };
    }

    acc[monthKey].totalValue += parseFloat(order.total_amount);
    acc[monthKey].orderCount += 1;

    return acc;
  }, {});

  const monthlyTrend = Object.values(monthlyData).sort(
    (a, b) => new Date(a.month + " 1") - new Date(b.month + " 1")
  );

  // Color schemes for charts
  const statusColors = {
    Pending: "#fbbf24",
    Received: "#10b981",
    Cancelled: "#ef4444",
    Returned: "#8b5cf6",
  };

  const paymentColors = {
    Paid: "#10b981",
    Unpaid: "#ef4444",
    Partial: "#f59e0b",
  };

  const getStatusIcon = (status) => {
    switch (status.toLowerCase()) {
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "received":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "cancelled":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "returned":
        return <AlertCircle className="w-4 h-4 text-purple-500" />;
      default:
        return <Package className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-4 text-lg text-gray-600">
          Loading purchase analysis...
        </span>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 h-[80vh] overflow-y-scroll">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between">
          <div className="">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Purchase Analysis Dashboard
            </h1>
            <p className="text-gray-600">
              Comprehensive insights into your purchasing patterns and supplier
              performance
            </p>
          </div>
          
          {/* Filters */}
          <div className="flex flex-col space-y-2">
            <div className="flex items-center">
              <Filter className="w-4 h-4 text-gray-500 mr-2" />
              <label className="text-sm font-medium text-gray-700 mr-2">
                Supplier:
              </label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Suppliers</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name || supplier.business_name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center">
              <Calendar className="w-4 h-4 text-gray-500 mr-2" />
              <label className="text-sm font-medium text-gray-700 mr-2">
                Period:
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="last30">Last 30 Days</option>
                <option value="last90">Last 90 Days</option>
                <option value="thisYear">This Year</option>
              </select>
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Purchase Value
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  ₵
                  {totalPurchaseValue.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Orders
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalOrders.toLocaleString()}
                </p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Average Order Value
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  ₵
                  {averageOrderValue.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Active Suppliers
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {uniqueSuppliers}
                </p>
              </div>
              <Users className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Order Status Distribution */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Order Status Distribution
            </h3>
            <div className="flex flex-wrap gap-4 mb-4">
              {statusData.map((item, index) => (
                <div key={index} className="flex items-center space-x-2">
                  {getStatusIcon(item.name)}
                  <span className="text-sm text-gray-600">
                    {item.name}: {item.value} ({item.percentage}%)
                  </span>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                >
                  {statusData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={statusColors[entry.name] || "#8884d8"}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Payment Status Analysis */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Payment Status Analysis
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={paymentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value, name) => [
                    name === "value"
                      ? `${value} orders`
                      : `₵${value.toLocaleString()}`,
                    name === "value" ? "Order Count" : "Total Amount",
                  ]}
                />
                <Legend />
                <Bar dataKey="value" name="Order Count" fill="#3b82f6" />
                <Bar dataKey="amount" name="Total Amount" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Trend Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Monthly Purchase Trends
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip
                formatter={(value, name) => [
                  name === "totalValue" ? `₵${value.toLocaleString()}` : value,
                  name === "totalValue" ? "Total Value" : "Order Count",
                ]}
              />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="totalValue"
                stackId="1"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.6}
                name="Total Value"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="orderCount"
                stroke="#ef4444"
                strokeWidth={3}
                name="Order Count"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Supplier Performance Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedSupplier === "all" 
                ? "Top Suppliers by Purchase Value" 
                : "Supplier Performance"}
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Supplier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order Count
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Order Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Received
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pending
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Performance
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {supplierAnalysis.slice(0, 10).map((supplier, index) => {
                    const completionRate =
                      supplier.orderCount > 0
                        ? (supplier.receivedOrders / supplier.orderCount) * 100
                        : 0;
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {supplier.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₵
                          {supplier.totalValue.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {supplier.orderCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₵
                          {supplier.averageOrderValue.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                          {supplier.receivedOrders}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">
                          {supplier.pendingOrders}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className={`h-2 rounded-full ${
                                  completionRate >= 80
                                    ? "bg-green-500"
                                    : completionRate >= 60
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                                }`}
                                style={{ width: `${Math.min(completionRate, 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600">
                              {completionRate.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Summary Insights */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            Key Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <strong>Most Active Supplier:</strong>{" "}
              {supplierAnalysis[0]?.name ||supplierAnalysis[0]?.business_name || "N/A"}(
              {supplierAnalysis[0]?.orderCount || 0} orders)
            </div>
            <div>
              <strong>Highest Value Supplier:</strong>{" "}
              {supplierAnalysis[0]?.name || "N/A"}
              (₵{supplierAnalysis[0]?.totalValue?.toLocaleString() || "0"})
            </div>
            <div>
              <strong>Order Completion Rate:</strong>{" "}
              {totalOrders > 0
                ? (
                    ((statusCounts["received"] || 0) / totalOrders) *
                    100
                  ).toFixed(1)
                : "0"}
              %
            </div>
            <div>
              <strong>Payment Completion Rate:</strong>{" "}
              {totalOrders > 0
                ? (((paymentCounts["paid"] || 0) / totalOrders) * 100).toFixed(
                    1
                  )
                : "0"}
              %
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseAnalysis;