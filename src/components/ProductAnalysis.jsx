import React, { useEffect, useMemo, useState } from "react";
import { BarChart2 } from "lucide-react";
import {
  FiPackage,
  FiDollarSign,
  FiTrendingUp,
  FiPieChart,
  FiTruck,
  FiShoppingBag,
  FiCalendar,
  FiUser,
  FiBox,
  FiLoader,
  FiTarget,
  FiAlertTriangle,
  FiStar,
  FiArrowUp,
  FiArrowDown,
  FiSearch,
} from "react-icons/fi";
import API from "../api";

const safeNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Helper function to filter sales by time range
const filterSalesByTimeRange = (sales, timeRange) => {
  if (!Array.isArray(sales)) return [];

  const now = new Date();
  let startDate;

  switch (timeRange) {
    case "week":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      startDate = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        now.getDate()
      );
      break;
    case "quarter":
      startDate = new Date(
        now.getFullYear(),
        now.getMonth() - 3,
        now.getDate()
      );
      break;
    case "year":
      startDate = new Date(
        now.getFullYear() - 1,
        now.getMonth(),
        now.getDate()
      );
      break;
    default:
      return sales;
  }

  return sales.filter((sale) => {
    const saleDate = new Date(sale.date || sale.created_at || sale.timestamp);
    return saleDate >= startDate && saleDate <= now;
  });
};

const ProductAnalyticsDashboard = () => {
  // State management
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [timeRange, setTimeRange] = useState("month");
  const [sortBy, setSortBy] = useState("profit_margin");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all initial data
  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [productsRes, suppliersRes, salesRes] = await Promise.all([
        API.get("/products"),
        API.get("/suppliers"),
        API.get("/sales"),
      ]);

      setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
      setSuppliers(Array.isArray(suppliersRes.data) ? suppliersRes.data : []);
      setSalesData(Array.isArray(salesRes.data) ? salesRes.data : []);

      // if selected product disappeared after reload, clear selection
      setSelectedProduct((prev) => {
        if (!prev) return null;
        const exists = (productsRes.data || []).some((p) => p.id === prev.id);
        return exists ? prev : null;
      });

      console.log("Products Results", productsRes.data);
      console.log("Suppliers Results", suppliersRes.data);
      console.log("Sales Results", salesRes.data);
    } catch (err) {
      console.error("Error fetching initial data:", err);
      setError("Failed to load initial data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter sales data by time range
  const filteredSalesData = useMemo(() => {
    return filterSalesByTimeRange(salesData, timeRange);
  }, [salesData, timeRange]);

  // Aggregate sales by product (memoized) - now using filteredSalesData
  const productSalesData = useMemo(() => {
    const map = {};
    if (!Array.isArray(filteredSalesData)) return map;

    filteredSalesData.forEach((sale) => {
      // tolerate different field names that might come from an API
      const productId =
        sale.product_id ??
        sale.productId ??
        (sale.product && sale.product.id) ??
        null;
      if (productId == null) return;

      const quantity = safeNum(sale.quantity);
      const totalPrice = safeNum(
        sale.total_price ?? sale.totalPrice ?? sale.amount ?? 0
      );
      const date = sale.date ?? sale.created_at ?? sale.timestamp ?? null;

      if (!map[productId]) {
        map[productId] = {
          totalSold: 0,
          totalRevenue: 0,
          lastSaleDate: date,
          salesCount: 0,
        };
      }

      map[productId].totalSold += quantity;
      map[productId].totalRevenue += totalPrice;
      map[productId].salesCount += 1;

      if (date && new Date(date) > new Date(map[productId].lastSaleDate || 0)) {
        map[productId].lastSaleDate = date;
      }
    });

    return map;
  }, [filteredSalesData]);

  // Enhanced stock status function that considers sales velocity
  const getStockStatus = (product, productSalesData, timeRange) => {
    const qty = safeNum(product?.quantity_in_stock);
    const productSales = productSalesData[product?.id];

    // Calculate time range in days
    let timeRangeDays = 30;
    switch (timeRange) {
      case "week":
        timeRangeDays = 7;
        break;
      case "month":
        timeRangeDays = 30;
        break;
      case "quarter":
        timeRangeDays = 90;
        break;
      case "year":
        timeRangeDays = 365;
        break;
      default:
        timeRangeDays = 30;
    }

    const totalSold = productSales?.totalSold || 0;
    const velocity = totalSold / timeRangeDays; // units per day
    const coverageDays = velocity > 0 ? qty / velocity : Infinity;

    // Out of stock
    if (qty === 0) {
      return {
        status: "out",
        bgClass: "bg-red-100",
        textClass: "text-red-800",
        text: "Out of Stock",
        priority: "critical",
      };
    }

    // Low stock based on velocity (less than 7 days coverage)
    if (coverageDays < 7 && velocity > 0) {
      return {
        status: "critical_low",
        bgClass: "bg-red-100",
        textClass: "text-red-800",
        text: `Critical (${coverageDays.toFixed(1)}d left)`,
        priority: "critical",
      };
    }

    // Low stock based on velocity (7-14 days coverage) or static threshold
    if (
      (coverageDays >= 7 && coverageDays <= 14 && velocity > 0) ||
      (qty <= 20 && velocity === 0)
    ) {
      return {
        status: "low",
        bgClass: "bg-yellow-100",
        textClass: "text-yellow-800",
        text:
          velocity > 0
            ? `Low Stock (${coverageDays.toFixed(1)}d)`
            : "Low Stock",
        priority: "high",
      };
    }

    // Overstock based on velocity (more than 90 days coverage)
    if (coverageDays > 90 && velocity > 0) {
      return {
        status: "overstock",
        bgClass: "bg-blue-100",
        textClass: "text-blue-800",
        text: `Overstocked (${Math.floor(coverageDays)}d)`,
        priority: "medium",
      };
    }

    // High stock but not overstocked (30-90 days coverage)
    if (coverageDays >= 30 && coverageDays <= 90 && velocity > 0) {
      return {
        status: "high",
        bgClass: "bg-blue-100",
        textClass: "text-blue-800",
        text: `High Stock (${Math.floor(coverageDays)}d)`,
        priority: "low",
      };
    }

    // Static overstock check for products with no sales data
    if (qty > 200 && velocity === 0) {
      return {
        status: "high",
        bgClass: "bg-blue-100",
        textClass: "text-blue-800",
        text: "High Stock",
        priority: "medium",
      };
    }

    // Normal stock
    return {
      status: "normal",
      bgClass: "bg-green-100",
      textClass: "text-green-800",
      text:
        velocity > 0
          ? `Good Stock (${Math.floor(coverageDays)}d)`
          : "Good Stock",
      priority: "low",
    };
  };

  // Enhanced metrics (memoized) - now using enhanced stock classification
  const metrics = useMemo(() => {
    const totalProducts = Array.isArray(products) ? products.length : 0;

    const totalInventoryValue = (products || []).reduce((sum, p) => {
      const cp = safeNum(p.cp);
      const qty = safeNum(p.quantity_in_stock);
      return sum + cp * qty;
    }, 0);

    const totalRevenuePotential = (products || []).reduce((sum, p) => {
      const sp = safeNum(p.sp);
      const qty = safeNum(p.quantity_in_stock);
      return sum + sp * qty;
    }, 0);

    // Calculate actual revenue from filtered sales
    const actualRevenue = filteredSalesData.reduce((sum, sale) => {
      return (
        sum + safeNum(sale.total_price ?? sale.totalPrice ?? sale.amount ?? 0)
      );
    }, 0);

    // Average profit margin: skip products with cp === 0 to avoid division by zero
    const margins = (products || [])
      .map((p) => {
        const cp = safeNum(p.cp);
        const sp = safeNum(p.sp);
        return cp > 0 ? ((sp - cp) / cp) * 100 : null;
      })
      .filter((m) => m !== null);

    const averageProfitMargin =
      margins.length > 0
        ? margins.reduce((s, m) => s + m, 0) / margins.length
        : 0;

    // Calculate stock alerts based on velocity
    const stockAlerts = (products || []).map((product) => {
      const stockStatus = getStockStatus(product, productSalesData, timeRange);
      return {
        product,
        stockStatus,
        needsAttention: ["critical", "high"].includes(stockStatus.priority),
      };
    });

    const criticalStockProducts = stockAlerts.filter(
      (alert) => alert.stockStatus.priority === "critical"
    ).length;

    const highPriorityStockProducts = stockAlerts.filter(
      (alert) => alert.stockStatus.priority === "high"
    ).length;

    const lowStockProducts = criticalStockProducts + highPriorityStockProducts;
    const outOfStockProducts = stockAlerts.filter(
      (alert) => alert.stockStatus.status === "out"
    ).length;

    const topPerformers = [...(products || [])]
      .filter((p) => safeNum(p.cp) > 0)
      .sort((a, b) => {
        const ma = (safeNum(a.sp) - safeNum(a.cp)) / safeNum(a.cp);
        const mb = (safeNum(b.sp) - safeNum(b.cp)) / safeNum(b.cp);
        return mb - ma;
      })
      .slice(0, 5);

    const productsWithSales = (products || []).map((p) => ({
      ...p,
      totalSold: productSalesData[p.id]?.totalSold || 0,
    }));

    const lowPerformers = productsWithSales
      .sort((a, b) => a.totalSold - b.totalSold)
      .slice(0, 5);

    const potentialProfit = totalRevenuePotential - totalInventoryValue;

    return {
      totalProducts,
      totalInventoryValue,
      totalRevenuePotential,
      actualRevenue,
      averageProfitMargin,
      lowStockProducts,
      outOfStockProducts,
      criticalStockProducts,
      highPriorityStockProducts,
      stockAlerts,
      topPerformers,
      lowPerformers,
      potentialProfit,
      productSalesData,
      filteredSalesCount: filteredSalesData.length,
    };
  }, [products, productSalesData, filteredSalesData, timeRange]);


  
  // Helper: get supplier name
  const getSupplierName = (supplierId) => {
    const s = (suppliers || []).find((x) => x.id === supplierId);
    return s
      ? s.business_name || s.name || "Unknown Supplier"
      : "Unknown Supplier";
  };

  // Calculate performance score for a product using real sales data
  const getPerformanceScore = (product) => {
    if (!product) return 0;
    const sales = metrics.productSalesData[product.id];
    const profitMargin =
      safeNum(product.cp) > 0
        ? ((safeNum(product.sp) - safeNum(product.cp)) / safeNum(product.cp)) *
          100
        : 0;
    const stockLevel = safeNum(product.quantity_in_stock);
    const totalSold = sales?.totalSold || 0;

    // Calculate sales velocity based on time range
    let daysInRange = 30; // Default to month
    if (timeRange === "week") daysInRange = 7;
    else if (timeRange === "quarter") daysInRange = 90;
    else if (timeRange === "year") daysInRange = 365;

    const salesVelocity = totalSold / daysInRange;

    let score = 0;
    if (profitMargin > 50) score += 3;
    else if (profitMargin > 30) score += 2;
    else if (profitMargin > 15) score += 1;

    if (stockLevel > 100) score += 2;
    else if (stockLevel > 50) score += 1;

    if (salesVelocity > 5) score += 3;
    else if (salesVelocity > 2) score += 2;
    else if (salesVelocity > 0.5) score += 1;

    return Math.min(score, 8);
  };

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;

    const query = searchQuery.toLowerCase();
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.id.toString().includes(query)
    );
  }, [products, searchQuery]);

  // Sorted products (memoized) - now using filteredProducts
  const sortedProducts = useMemo(() => {
    const productSales = metrics.productSalesData || {};
    const copy = [...(filteredProducts || [])];

    copy.sort((a, b) => {
      switch (sortBy) {
        case "profit_margin": {
          const ma =
            safeNum(a.cp) > 0
              ? (safeNum(a.sp) - safeNum(a.cp)) / safeNum(a.cp)
              : -Infinity;
          const mb =
            safeNum(b.cp) > 0
              ? (safeNum(b.sp) - safeNum(b.cp)) / safeNum(b.cp)
              : -Infinity;
          return mb - ma;
        }
        case "revenue_potential": {
          return (
            safeNum(b.sp) * safeNum(b.quantity_in_stock) -
            safeNum(a.sp) * safeNum(a.quantity_in_stock)
          );
        }
        case "total_sold": {
          const aSold = productSales[a.id]?.totalSold || 0;
          const bSold = productSales[b.id]?.totalSold || 0;
          return bSold - aSold;
        }
        case "stock_level":
          return safeNum(b.quantity_in_stock) - safeNum(a.quantity_in_stock);
        case "performance_score":
          return getPerformanceScore(b) - getPerformanceScore(a);
        default:
          return 0;
      }
    });

    return copy;
  }, [filteredProducts, sortBy, metrics, timeRange]);

  const analyzeMarginTrends = useMemo(() => {
    if (!Array.isArray(products) || products.length === 0) {
      return {
        averageMargin: 0,
        marginRange: { min: 0, max: 0 },
        typicalRange: { lower: 0, upper: 0 },
        isLowMargin: () => false, // Default function
      };
    }

    // Calculate margins for all products
    const margins = products
      .map((product) => {
        const cp = safeNum(product.cp);
        const sp = safeNum(product.sp);
        return cp > 0 ? ((sp - cp) / cp) * 100 : null;
      })
      .filter((m) => m !== null);

    // Calculate average margin
    const averageMargin =
      margins.reduce((sum, m) => sum + m, 0) / margins.length;

    // Calculate min and max margins
    const minMargin = Math.min(...margins);
    const maxMargin = Math.max(...margins);

    // Calculate typical range (within 1 standard deviation)
    const squaredDiffs = margins.map((m) => Math.pow(m - averageMargin, 2));
    const variance =
      squaredDiffs.reduce((sum, sd) => sum + sd, 0) / margins.length;
    const stdDev = Math.sqrt(variance);

    const typicalLower = averageMargin - stdDev;
    const typicalUpper = averageMargin + stdDev;

    // Function to determine if a margin is low based on business trends
    const isLowMargin = (margin) => {
      // If margin is below the typical range, it's low
      if (margin < typicalLower) return true;

      // If margin is significantly below average (more than 25%)
      if (margin < averageMargin * 0.75) return true;

      return false;
    };

    return {
      averageMargin,
      marginRange: { min: minMargin, max: maxMargin },
      typicalRange: { lower: typicalLower, upper: typicalUpper },
      isLowMargin,
    };
  }, [products]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center">
            <FiLoader className="animate-spin text-2xl text-blue-500 mb-2" />
            <p>Loading analytics data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-center p-4 bg-red-50 rounded-lg max-w-md">
            <p className="text-red-600 font-medium">{error}</p>
            <button
              onClick={fetchInitialData}
              className="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 h-[80vh] overflow-y-scroll">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">
          Product Analytics Dashboard
        </h1>
        <div className="flex space-x-2">
          <select
            className="px-3 py-2 border rounded-md text-sm bg-white"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
            <option value="year">Last Year</option>
          </select>
        </div>
      </div>
      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FiPackage className="text-blue-500 text-xl mr-3" />
              <div>
                <p className="text-sm text-gray-500">Total Products</p>
                <p className="text-xl font-semibold">{metrics.totalProducts}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-red-500">
                {metrics.outOfStockProducts} out of stock
              </p>
              <p className="text-xs text-red-600">
                {metrics.criticalStockProducts} critical
              </p>
              <p className="text-xs text-yellow-600">
                {metrics.highPriorityStockProducts} low stock
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <FiDollarSign className="text-green-500 text-xl mr-3" />
            <div>
              <p className="text-sm text-gray-500">
                Actual Revenue ({timeRange})
              </p>
              <p className="text-xl font-semibold">
                ₵{safeNum(metrics.actualRevenue).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {metrics.filteredSalesCount} transactions
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <FiTrendingUp className="text-purple-500 text-xl mr-3" />
            <div>
              <p className="text-sm text-gray-500">Avg. Profit Margin</p>
              <p className="text-xl font-semibold">
                {metrics.averageProfitMargin.toFixed(1)}%
              </p>
              <div className="flex items-center mt-1">
                {metrics.averageProfitMargin > 30 ? (
                  <FiArrowUp className="text-green-500 text-xs mr-1" />
                ) : (
                  <FiArrowDown className="text-red-500 text-xs mr-1" />
                )}
                <p className="text-xs text-gray-500">
                  {metrics.averageProfitMargin > 30
                    ? "Excellent"
                    : "Needs improvement"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <FiTarget className="text-orange-500 text-xl mr-3" />
            <div>
              <p className="text-sm text-gray-500">Inventory Value</p>
              <p className="text-xl font-semibold">
                ₵{safeNum(metrics.totalInventoryValue).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {(suppliers || []).filter((s) => s.active_status === 1).length}{" "}
                active suppliers
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product List with Analytics */}
        <div className="bg-white rounded-lg shadow-sm border lg:col-span-1">
          <div className="p-4 border-b">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold text-gray-700">
                Product Performance
              </h2>
              <select
                className="text-xs px-2 py-1 border rounded"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="profit_margin">Profit Margin</option>
                <option value="revenue_potential">Revenue Potential</option>
                <option value="total_sold">Total Sold</option>
                <option value="stock_level">Stock Level</option>
                <option value="performance_score">Performance Score</option>
              </select>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search products by name or ID..."
                className="w-full pl-10 pr-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="divide-y max-h-[600px] overflow-y-auto">
            {sortedProducts.length > 0 ? (
              sortedProducts.map((product, index) => {
                const profitMargin =
                  safeNum(product.cp) > 0
                    ? ((safeNum(product.sp) - safeNum(product.cp)) /
                        safeNum(product.cp)) *
                      100
                    : 0;
                const stockStatus = getStockStatus(
                  product,
                  metrics.productSalesData,
                  timeRange
                );
                const performanceScore = getPerformanceScore(product);
                const productSales = metrics.productSalesData[product.id];

                const marginClass =
                  profitMargin > 50
                    ? "bg-green-100 text-green-800"
                    : profitMargin > 30
                    ? "bg-blue-100 text-blue-800"
                    : profitMargin > 15
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800";

                return (
                  <div
                    key={product.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition ${
                      selectedProduct?.id === product.id
                        ? "bg-blue-50 border-l-4 border-blue-500"
                        : ""
                    }`}
                    onClick={() => setSelectedProduct(product)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <p className="font-medium text-gray-800 text-sm">
                            {product.name}
                          </p>
                          {index < 3 && (
                            <FiStar className="text-yellow-500 ml-1 text-xs" />
                          )}
                          {stockStatus.priority === "critical" && (
                            <FiAlertTriangle className="text-red-500 ml-1 text-xs" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          ID: {product.id}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-1 h-1 rounded-full ${
                              i < Math.floor(performanceScore / 1.6)
                                ? "bg-green-500"
                                : "bg-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between text-xs mb-2">
                      <span
                        className={`px-2 py-1 rounded text-xs ${marginClass}`}
                      >
                        {profitMargin.toFixed(1)}% margin
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-xs ${stockStatus.bgClass} ${stockStatus.textClass}`}
                      >
                        {stockStatus.text}
                      </span>
                    </div>

                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Stock: {safeNum(product.quantity_in_stock)}</span>
                      <span>
                        Sold ({timeRange}): {productSales?.totalSold || 0}
                      </span>
                    </div>

                    <div className="mt-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">
                          Revenue Potential:
                        </span>
                        <span className="font-medium">
                          ₵
                          {(
                            safeNum(product.sp) *
                            safeNum(product.quantity_in_stock)
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-gray-500">
                {searchQuery
                  ? "No products match your search"
                  : "No products available"}
              </div>
            )}
          </div>
        </div>
        {/* Detailed Analytics */}
        <div className="bg-white rounded-lg shadow-sm border lg:col-span-2">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-700">
              {selectedProduct
                ? `${selectedProduct.name} - Detailed Analytics`
                : "Select a product for detailed analytics"}
              <span className="text-xs text-gray-500 ml-2">
                (Time range: {timeRange})
              </span>
            </h2>
          </div>

          {selectedProduct ? (
            <div className="p-4 space-y-6">
              {/* Performance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-blue-100">
                  <h3 className="text-sm font-medium text-blue-700 mb-2">
                    Profitability
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-sm">Cost Price:</span>
                      <span className="font-semibold text-blue-700">
                        ₵{safeNum(selectedProduct.cp).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-sm">
                        Selling Price:
                      </span>
                      <span className="font-semibold text-blue-700">
                        ₵{safeNum(selectedProduct.sp).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-sm">
                        Profit Margin:
                      </span>
                      <span className="font-semibold text-blue-700">
                        {(safeNum(selectedProduct.cp) > 0
                          ? ((safeNum(selectedProduct.sp) -
                              safeNum(selectedProduct.cp)) /
                              safeNum(selectedProduct.cp)) *
                            100
                          : 0
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-sm">
                        Profit per Unit:
                      </span>
                      <span className="font-semibold text-green-600">
                        ₵
                        {(
                          safeNum(selectedProduct.sp) -
                          safeNum(selectedProduct.cp)
                        ).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-sm">
                        Total Profit Potential:
                      </span>
                      <span className="font-semibold text-green-600">
                        ₵
                        {(
                          (safeNum(selectedProduct.sp) -
                            safeNum(selectedProduct.cp)) *
                          safeNum(selectedProduct.quantity_in_stock)
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4 bg-gradient-to-br from-green-50 to-green-100">
                  <h3 className="text-sm font-medium text-green-700 mb-2">
                    Sales Performance ({timeRange})
                  </h3>
                  <div className="space-y-2">
                    {(() => {
                      const productSales =
                        metrics.productSalesData[selectedProduct.id];
                      return (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600 text-sm">
                              Total Sold:
                            </span>
                            <span className="font-semibold text-green-700">
                              {productSales?.totalSold || 0} units
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 text-sm">
                              Total Revenue:
                            </span>
                            <span className="font-semibold text-green-700">
                              ₵
                              {safeNum(
                                productSales?.totalRevenue
                              ).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 text-sm">
                              Sales Count:
                            </span>
                            <span className="font-semibold text-green-700">
                              {productSales?.salesCount || 0} transactions
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 text-sm">
                              Last Sale:
                            </span>
                            <span className="font-semibold text-green-700 text-xs">
                              {productSales?.lastSaleDate
                                ? new Date(
                                    productSales.lastSaleDate
                                  ).toLocaleDateString()
                                : "No sales"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 text-sm">
                              Sales Velocity:
                            </span>
                            <span className="font-semibold text-green-700 text-xs">
                              {(() => {
                                let timeRangeDays = 30;
                                if (timeRange === "week") timeRangeDays = 7;
                                else if (timeRange === "quarter")
                                  timeRangeDays = 90;
                                else if (timeRange === "year")
                                  timeRangeDays = 365;
                                const velocity =
                                  (productSales?.totalSold || 0) /
                                  timeRangeDays;
                                return `${velocity.toFixed(2)} units/day`;
                              })()}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="border rounded-lg p-4 bg-gradient-to-br from-orange-50 to-orange-100">
                  <h3 className="text-sm font-medium text-orange-700 mb-2">
                    Inventory Status
                  </h3>
                  <div className="space-y-2">
                    {(() => {
                      const stockStatus = getStockStatus(
                        selectedProduct,
                        metrics.productSalesData,
                        timeRange
                      );
                      return (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600 text-sm">
                              Current Stock:
                            </span>
                            <span className="font-semibold text-orange-700">
                              {safeNum(selectedProduct.quantity_in_stock)} units
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 text-sm">
                              Stock Value:
                            </span>
                            <span className="font-semibold text-orange-700">
                              ₵
                              {(
                                safeNum(selectedProduct.cp) *
                                safeNum(selectedProduct.quantity_in_stock)
                              ).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 text-sm">
                              Stock Status:
                            </span>
                            <span
                              className={`font-semibold text-xs ${stockStatus.textClass}`}
                            >
                              {stockStatus.text}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 text-sm">
                              Priority:
                            </span>
                            <span
                              className={`font-semibold text-xs capitalize ${
                                stockStatus.priority === "critical"
                                  ? "text-red-700"
                                  : stockStatus.priority === "high"
                                  ? "text-yellow-700"
                                  : stockStatus.priority === "medium"
                                  ? "text-blue-700"
                                  : "text-green-700"
                              }`}
                            >
                              {stockStatus.priority}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 text-sm">
                              Supplier:
                            </span>
                            <span className="font-semibold text-orange-700 text-xs">
                              {getSupplierName(selectedProduct.suppliers_id)}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Enhanced Key Insights */}
              <div className="border rounded-lg p-4 max-h-[400px] overflow-y-auto">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Projections & Recommendations
                </h3>
                <div className="space-y-3">
                  {(() => {
                    const productSales =
                      metrics.productSalesData[selectedProduct.id];
                    const profitMargin =
                      safeNum(selectedProduct.cp) > 0
                        ? ((safeNum(selectedProduct.sp) -
                            safeNum(selectedProduct.cp)) /
                            safeNum(selectedProduct.cp)) *
                          100
                        : 0;
                    const stock = safeNum(selectedProduct.quantity_in_stock);

                    // Calculate time range in days
                    let timeRangeDays = 30;
                    switch (timeRange) {
                      case "week":
                        timeRangeDays = 7;
                        break;
                      case "month":
                        timeRangeDays = 30;
                        break;
                      case "quarter":
                        timeRangeDays = 90;
                        break;
                      case "year":
                        timeRangeDays = 365;
                        break;
                      default:
                        timeRangeDays = 30;
                    }

                    const totalSold = productSales?.totalSold || 0;
                    const velocity = totalSold / timeRangeDays; // units/day
                    const coverageDays =
                      velocity > 0 ? stock / velocity : Infinity;
                    const weeklyVelocity = velocity * 7;
                    const monthlyVelocity = velocity * 30;

                    // Calculate reorder point (1.5x lead time demand with safety stock)
                    const leadTimeDays = 7;
                    const safetyStockFactor = 1.5;
                    const reorderPoint = Math.ceil(
                      velocity * leadTimeDays * safetyStockFactor
                    );

                    // Calculate optimal order quantity using simple EOQ-like formula
                    const estimatedOrderCost = 50;
                    const holdingCostRate = 0.2;
                    const dailyHoldingCost =
                      (safeNum(selectedProduct.cp) * holdingCostRate) / 365;
                    const eoq =
                      velocity > 0
                        ? Math.sqrt(
                            (2 * estimatedOrderCost * velocity) /
                              dailyHoldingCost
                          )
                        : Math.min(stock * 0.5, 50);

                    const optimalOrderQty = Math.ceil(eoq);

                    // Check if margin is low based on business trends
                    const isMarginLow =
                      analyzeMarginTrends.isLowMargin(profitMargin);
                    const marginComparison =
                      profitMargin - analyzeMarginTrends.averageMargin;

                    const insights = [];

                    // --- Margin Analysis Card ---
                    insights.push(
                      <div
                        className="flex items-start p-3 bg-purple-50 rounded-lg"
                        key="margin-analysis"
                      >
                        <FiTrendingUp className="text-purple-500 mt-1 mr-2 flex-shrink-0" />
                        <div className="w-full">
                          <p className="text-sm font-medium text-purple-800 mb-2">
                            Profit Margin Analysis
                          </p>

                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <p className="text-xs text-gray-600">
                                Product Margin
                              </p>
                              <p className="text-sm font-semibold">
                                {profitMargin.toFixed(1)}%
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">
                                Store Average
                              </p>
                              <p className="text-sm font-semibold">
                                {analyzeMarginTrends.averageMargin.toFixed(1)}%
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">
                                Comparison
                              </p>
                              <p
                                className={`text-sm font-semibold ${
                                  marginComparison >= 0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {marginComparison >= 0 ? "+" : ""}
                                {marginComparison.toFixed(1)}%
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">
                                Typical Range
                              </p>
                              <p className="text-sm font-semibold">
                                {analyzeMarginTrends.typicalRange.lower.toFixed(
                                  1
                                )}
                                % -{" "}
                                {analyzeMarginTrends.typicalRange.upper.toFixed(
                                  1
                                )}
                                %
                              </p>
                            </div>
                          </div>

                          <div className="bg-white p-3 rounded border">
                            <p className="text-xs font-medium text-gray-700 mb-1">
                              Margin Assessment:
                            </p>
                            {profitMargin <= 0 ? (
                              <p className="text-xs text-red-600 font-semibold">
                                ⚠️ Selling at a loss. Immediate price review
                                needed.
                              </p>
                            ) : isMarginLow ? (
                              <p className="text-xs text-red-600 font-semibold">
                                ⚠️ Margin is below typical store range. Consider
                                reviewing pricing strategy.
                              </p>
                            ) : profitMargin >
                              analyzeMarginTrends.typicalRange.upper ? (
                              <p className="text-xs text-green-600 font-semibold">
                                ✓ Higher than typical margin. This product is a
                                profitability leader.
                              </p>
                            ) : (
                              <p className="text-xs text-gray-700">
                                ✓ Margin is within typical store range. Aligns
                                with business pricing strategy.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );

                    // --- Stock Projection Card ---
                    insights.push(
                      <div
                        className="flex items-start p-3 bg-blue-50 rounded-lg"
                        key="projection"
                      >
                        <FiCalendar className="text-blue-500 mt-1 mr-2 flex-shrink-0" />
                        <div className="w-full">
                          <p className="text-sm font-medium text-blue-800 mb-2">
                            Stock Projection Analysis
                          </p>

                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <p className="text-xs text-gray-600">
                                Current Stock
                              </p>
                              <p className="text-sm font-semibold">
                                {stock} units
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">
                                Daily Sales Rate
                              </p>
                              <p className="text-sm font-semibold">
                                {velocity.toFixed(2)} units/day
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">
                                Weekly Sales Rate
                              </p>
                              <p className="text-sm font-semibold">
                                {weeklyVelocity.toFixed(1)} units/week
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">
                                Monthly Sales Rate
                              </p>
                              <p className="text-sm font-semibold">
                                {monthlyVelocity.toFixed(1)} units/month
                              </p>
                            </div>
                          </div>

                          <div className="bg-white p-3 rounded border">
                            <p className="text-xs font-medium text-gray-700 mb-2">
                              Stock-Out Projection:
                            </p>
                            {velocity > 0 ? (
                              <p className="text-xs text-gray-700">
                                At current sales velocity, stock will last
                                approximately{" "}
                                <span className="font-semibold">
                                  {Math.floor(coverageDays)} days
                                </span>
                                (until{" "}
                                {new Date(
                                  Date.now() +
                                    coverageDays * 24 * 60 * 60 * 1000
                                ).toLocaleDateString()}
                                ).
                              </p>
                            ) : (
                              <p className="text-xs text-gray-700">
                                No recent sales. Current stock could last
                                indefinitely or may indicate obsolete inventory.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );

                    // --- Replenishment Recommendations ---
                    if (velocity > 0) {
                      insights.push(
                        <div
                          className="flex items-start p-3 bg-green-50 rounded-lg"
                          key="replenishment"
                        >
                          <FiTruck className="text-green-500 mt-1 mr-2 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-green-800 mb-2">
                              Replenishment Strategy
                            </p>
                            <div className="space-y-2">
                              <p className="text-xs text-green-700">
                                <span className="font-semibold">
                                  Reorder Point:
                                </span>{" "}
                                When stock falls below {reorderPoint} units
                              </p>
                              <p className="text-xs text-green-700">
                                <span className="font-semibold">
                                  Optimal Order Quantity:
                                </span>{" "}
                                {optimalOrderQty} units (covers ~
                                {Math.ceil(optimalOrderQty / velocity)} days of
                                sales)
                              </p>
                              <p className="text-xs text-green-700">
                                <span className="font-semibold">
                                  Expected Order Frequency:
                                </span>{" "}
                                Every {Math.ceil(optimalOrderQty / velocity)}{" "}
                                days
                              </p>
                              {coverageDays < 14 && (
                                <p className="text-xs text-red-600 font-semibold">
                                  ⚠️ Consider placing an order soon to avoid
                                  stockouts
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // --- Profit Margin Recommendations (only if significantly low) ---
                    if (isMarginLow && profitMargin > 0) {
                      insights.push(
                        <div
                          className="flex items-start p-3 bg-red-50 rounded-lg"
                          key="lowprofit"
                        >
                          <FiAlertTriangle className="text-red-500 mt-1 mr-2 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-red-800">
                              Margin Below Business Average (
                              {profitMargin.toFixed(1)}% vs{" "}
                              {analyzeMarginTrends.averageMargin.toFixed(1)}%)
                            </p>
                            <p className="text-xs text-red-700">
                              This product's profitability is below the store's
                              typical range. Consider:
                            </p>
                            <ul className="text-xs text-red-700 pl-4 mt-1 list-disc">
                              <li>
                                Negotiating with supplier for better pricing
                              </li>
                              <li>
                                Evaluating if a price increase aligns with your
                                strategy
                              </li>
                              <li>
                                Assessing whether this is a strategic loss
                                leader
                              </li>
                              <li>
                                Comparing with similar products in your
                                inventory
                              </li>
                            </ul>
                          </div>
                        </div>
                      );
                    } else if (
                      profitMargin > analyzeMarginTrends.typicalRange.upper
                    ) {
                      insights.push(
                        <div
                          className="flex items-start p-3 bg-green-50 rounded-lg"
                          key="highprofit"
                        >
                          <FiTrendingUp className="text-green-500 mt-1 mr-2 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-green-800">
                              Excellent Profitability ({profitMargin.toFixed(1)}
                              % Margin)
                            </p>
                            <p className="text-xs text-green-700">
                              This high-margin product generates ₵
                              {(
                                safeNum(selectedProduct.sp) -
                                safeNum(selectedProduct.cp)
                              ).toFixed(2)}
                              profit per unit. Consider:
                            </p>
                            <ul className="text-xs text-green-700 pl-4 mt-1 list-disc">
                              <li>Increasing promotional activities</li>
                              <li>Expanding display space</li>
                              <li>Testing a slight price increase</li>
                            </ul>
                          </div>
                        </div>
                      );
                    }

                    // --- Sales Performance Analysis ---
                    if (productSales && productSales.totalSold > 0) {
                      const salesTrend =
                        productSales.salesCount > 1 ? "consistent" : "single";

                      insights.push(
                        <div
                          className="flex items-start p-3 bg-blue-50 rounded-lg"
                          key="sales"
                        >
                          <BarChart2 className="text-blue-500 mt-1 mr-2 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-blue-800">
                              Sales Performance Analysis
                            </p>
                            <p className="text-xs text-blue-700">
                              Sold {productSales.totalSold} units across{" "}
                              {productSales.salesCount} transactions, generating
                              ₵
                              {safeNum(
                                productSales.totalRevenue
                              ).toLocaleString()}
                              .
                            </p>
                            {productSales.lastSaleDate && (
                              <p className="text-xs text-blue-700 mt-1">
                                Last sale:{" "}
                                {new Date(
                                  productSales.lastSaleDate
                                ).toLocaleDateString()}
                              </p>
                            )}
                            {salesTrend === "consistent" && velocity > 1 && (
                              <p className="text-xs text-green-700 mt-1">
                                ✓ Strong consistent sales pattern detected
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    } else {
                      insights.push(
                        <div
                          className="flex items-start p-3 bg-yellow-50 rounded-lg"
                          key="nosales"
                        >
                          <FiAlertTriangle className="text-yellow-500 mt-1 mr-2 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-yellow-800">
                              No Recent Sales
                            </p>
                            <p className="text-xs text-yellow-700">
                              This product hasn't sold in the selected time
                              period. Consider:
                            </p>
                            <ul className="text-xs text-yellow-700 pl-4 mt-1 list-disc">
                              <li>Promotional pricing or discounts</li>
                              <li>Improved product visibility or placement</li>
                              <li>Customer awareness campaigns</li>
                              <li>
                                Evaluating if product is still relevant to your
                                customers
                              </li>
                            </ul>
                          </div>
                        </div>
                      );
                    }

                    return insights;
                  })()}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              <p>
                Please select a product from the list to view detailed
                analytics.
              </p>
            </div>
          )}
        </div>{" "}
      </div>{" "}
    </div>
  );
};

export default ProductAnalyticsDashboard;
