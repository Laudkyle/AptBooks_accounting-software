import React, { useState, useEffect, useMemo } from "react";
import DataTable from "react-data-table-component";
import API from "../api.js";
import {
  FaFileExcel,
  FaFilePdf,
  FaPrint,
  FaChartBar,
  FaChartLine,
  FaCalendarAlt,
  FaUser,
  FaUsers,
  FaMoneyBillWave,
  FaShoppingCart,
  FaStar,
  FaCrown,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const SalesAnalysis = () => {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filterText, setFilterText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState("all");
  const [customStartDate, setCustomStartDate] = useState(new Date());
  const [customEndDate, setCustomEndDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState("products");
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const [showProfit, setShowProfit] = useState(false);

  // Fetch sales, products, and customers data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [salesRes, productsRes, customersRes] = await Promise.all([
          API.get("/sales"),
          API.get("/products"),
          API.get("/customers"),
        ]);
        setSales(salesRes.data || []);
        setProducts(productsRes.data || []);
        setCustomers(customersRes.data || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
        setSales([]);
        setProducts([]);
        setCustomers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter sales based on selected time period
  const filteredSales = useMemo(() => {
    if (!sales || sales.length === 0) return [];
    
    const now = new Date();
    let startDate, endDate;

    switch (timePeriod) {
      case "daily":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case "weekly":
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        startDate = new Date(now.setDate(diff));
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "monthly":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "custom":
        startDate = new Date(customStartDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(customEndDate);
        endDate.setHours(23, 59, 59, 999);
        break;
      default: // 'all'
        return sales;
    }

    return sales.filter((sale) => {
      if (!sale.date) return false;
      const saleDate = new Date(sale.date);
      return saleDate >= startDate && saleDate <= endDate;
    });
  }, [sales, timePeriod, customStartDate, customEndDate]);

  // Create a product map for quick lookup
  const productMap = useMemo(() => {
    const map = {};
    products.forEach(product => {
      map[product.id] = product;
    });
    return map;
  }, [products]);

  // Calculate sales analysis data by product
  const salesAnalysisData = useMemo(() => {
    if (!products || products.length === 0 || !filteredSales) return [];
    
    return products.map((product) => {
      const productSales = filteredSales.filter(
        (sale) =>
          sale.product_id === product.id && sale.return_status === "not_returned"
      );

      const quantitySold = productSales.reduce(
        (sum, sale) => sum + (sale.quantity || 0),
        0
      );

      const totalRevenue = productSales.reduce(
        (sum, sale) => sum + (sale.total_price || 0),
        0
      );

      const totalCost = productSales.reduce(
        (sum, sale) => sum + ((product.cp || 0) * (sale.quantity || 0)),
        0
      );

      const totalProfit = totalRevenue - totalCost;

      const remainingValue = (product.quantity_in_stock || 0) * (product.sp || 0);

      return {
        id: product.id,
        name: product.name || "Unknown Product",
        image: product.image,
        cost_price: product.cp || 0,
        quantity_in_stock: product.quantity_in_stock || 0,
        quantity_sold: quantitySold,
        quantity_remaining: product.quantity_in_stock || 0,
        selling_price: product.sp || 0,
        total_revenue: totalRevenue,
        total_cost: totalCost,
        total_profit: totalProfit,
        remaining_value: remainingValue,
        stock_ratio: (product.quantity_in_stock || 0) > 0 
          ? (quantitySold / ((product.quantity_in_stock || 0) + quantitySold)) * 100 
          : 0,
      };
    });
  }, [filteredSales, products]);

  // Calculate sales analysis data by customer with per-product details
  const customerAnalysisData = useMemo(() => {
    if (!customers || customers.length === 0 || !filteredSales || !products) return [];
    
    const customerMap = {};
    
    // Initialize customer data
    customers.forEach(customer => {
      customerMap[customer.id] = {
        id: customer.id,
        name: customer.name || customer.business_name || "Unknown Customer",
        email: customer.email || "",
        phone: customer.phone || "",
        total_spent: 0,
        total_profit: 0,
        orders_count: 0,
        average_order_value: 0,
        last_purchase: null,
        products: {}, // Object to store product-level details
        products_purchased: new Set()
      };
    });
    
    
    // Process sales data
    filteredSales.forEach(sale => {
      if (sale.return_status === "not_returned" && sale.customer_id && customerMap[sale.customer_id]) {
        const customer = customerMap[sale.customer_id];
        const product = productMap[sale.product_id];
        const quantity = sale.quantity || 0;
        const revenue = sale.total_price || 0;
        const cost = product ? (product.cp || 0) * quantity : 0;
        const profit = revenue - cost;
        
        customer.total_spent += revenue;
        customer.total_profit += profit;
        customer.orders_count += 1;
        
        // Track products purchased
        if (sale.product_id) {
          customer.products_purchased.add(sale.product_id);
          
          // Initialize product entry if it doesn't exist
          if (!customer.products[sale.product_id]) {
            customer.products[sale.product_id] = {
              name: product ? product.name : "Unknown Product",
              quantity: 0,
              revenue: 0,
              cost: 0,
              profit: 0
            };
          }
          
          // Update product details
          customer.products[sale.product_id].quantity += quantity;
          customer.products[sale.product_id].revenue += revenue;
          customer.products[sale.product_id].cost += cost;
          customer.products[sale.product_id].profit += profit;
        }
        
        // Update last purchase date
        if (sale.date) {
          const saleDate = new Date(sale.date);
          if (!customer.last_purchase || saleDate > customer.last_purchase) {
            customer.last_purchase = saleDate;
          }
        }
      }
    });
    
    // Calculate averages and format data
    return Object.values(customerMap)
      .map(customer => ({
        ...customer,
        average_order_value: customer.orders_count > 0 ? customer.total_spent / customer.orders_count : 0,
        products_count: customer.products_purchased.size,
        last_purchase: customer.last_purchase ? customer.last_purchase.toLocaleDateString() : "Never",
        // Convert products object to array for easier rendering
        products_array: Object.entries(customer.products).map(([productId, details]) => ({
          product_id: productId,
          ...details
        })).sort((a, b) => b.revenue - a.revenue) // Sort by revenue descending
      }))
      .sort((a, b) => b.total_spent - a.total_spent); // Sort by total spent descending
  }, [filteredSales, customers, productMap]);

  // Generate valuable insights
  const insights = useMemo(() => {
    if (!salesAnalysisData || salesAnalysisData.length === 0) {
      return {
        totalRevenue: 0,
        totalProfit: 0,
        totalUnitsSold: 0,
        topSellingProducts: [],
        mostValuableProducts: [],
        mostProfitableProducts: [],
        lowStockProducts: [],
        topCustomers: [],
        customerSegments: { vip: 0, regular: 0, new: 0 },
        totalCustomers: 0,
        averageOrderValue: 0
      };
    }

    const totalRevenue = salesAnalysisData.reduce((sum, item) => sum + (item.total_revenue || 0), 0);
    const totalProfit = salesAnalysisData.reduce((sum, item) => sum + (item.total_profit || 0), 0);
    const totalUnitsSold = salesAnalysisData.reduce((sum, item) => sum + (item.quantity_sold || 0), 0);
    
    // Top selling products
    const topSellingProducts = [...salesAnalysisData]
      .sort((a, b) => (b.quantity_sold || 0) - (a.quantity_sold || 0))
      .slice(0, 5);
    
    // Most valuable products by revenue
    const mostValuableProducts = [...salesAnalysisData]
      .sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0))
      .slice(0, 5);
    
    // Most profitable products
    const mostProfitableProducts = [...salesAnalysisData]
      .sort((a, b) => (b.total_profit || 0) - (a.total_profit || 0))
      .slice(0, 5);
    
    // Low stock products
    const lowStockProducts = (products || [])
      .filter(product => (product.quantity_in_stock || 0) <= 10)
      .slice(0, 5);
    
    // Top customers
    const topCustomers = (customerAnalysisData || []).slice(0, 5);
    
    // Customer segmentation
    const customerSegments = {
      vip: (customerAnalysisData || []).filter(c => (c.total_spent || 0) > 1000).length,
      regular: (customerAnalysisData || []).filter(c => (c.total_spent || 0) > 100 && (c.total_spent || 0) <= 1000).length,
      new: (customerAnalysisData || []).filter(c => (c.total_spent || 0) <= 100).length
    };
    
    const avgOrderValue = customerAnalysisData && customerAnalysisData.length > 0 
      ? customerAnalysisData.reduce((sum, c) => sum + (c.average_order_value || 0), 0) / customerAnalysisData.length 
      : 0;
    
    return {
      totalRevenue,
      totalProfit,
      totalUnitsSold,
      topSellingProducts,
      mostValuableProducts,
      mostProfitableProducts,
      lowStockProducts,
      topCustomers,
      customerSegments,
      totalCustomers: customerAnalysisData ? customerAnalysisData.length : 0,
      averageOrderValue: avgOrderValue
    };
  }, [salesAnalysisData, customerAnalysisData, products]);

  // Filter products based on search text
  const filteredProductData = useMemo(() => {
    if (!salesAnalysisData || salesAnalysisData.length === 0) return [];
    
    return salesAnalysisData.filter((item) =>
      ["name", "quantity_sold", "quantity_remaining"]
        .some((key) =>
          (item[key] || "")
            .toString()
            .toLowerCase()
            .includes(filterText.toLowerCase())
        )
    );
  }, [filterText, salesAnalysisData]);

  // Filter customers based on search text
  const filteredCustomerData = useMemo(() => {
    if (!customerAnalysisData || customerAnalysisData.length === 0) return [];
    
    return customerAnalysisData.filter((item) =>
      ["name", "email", "phone"]
        .some((key) =>
          (item[key] || "")
            .toString()
            .toLowerCase()
            .includes(filterText.toLowerCase())
        )
    );
  }, [filterText, customerAnalysisData]);

  // Define columns for the product data table
  const productColumns = [
    {
      name: "Product",
      cell: (row) => (
        <div className="flex items-center">
          {row.image ? (
            <img
              src={row.image}
              alt={row.name}
              className="w-10 h-10 object-cover rounded-full mr-3"
            />
          ) : (
            <div className="w-10 h-10 bg-gray-200 rounded-full mr-3 flex items-center justify-center">
              <span className="text-gray-500 text-xs">No Image</span>
            </div>
          )}
          <span>{row.name}</span>
        </div>
      ),
      sortable: true,
      selector: (row) => row.name,
    },
    {
      name: "Sold",
      selector: (row) => row.quantity_sold,
      sortable: true,
      cell: (row) => (
        <div>
          <div className="font-medium">{row.quantity_sold} units</div>
          <div className="text-sm text-gray-500">
            ₵{(row.total_revenue || 0).toFixed(2)}
          </div>
        </div>
      ),
    },
    {
      name: "Profit",
      selector: (row) => row.total_profit,
      sortable: true,
      cell: (row) => (
        <div>
          <div className={`font-medium ${row.total_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ₵{(row.total_profit || 0).toFixed(2)}
          </div>
          <div className="text-sm text-gray-500">
            {row.cost_price > 0 ? `${((row.total_profit / row.total_revenue) * 100).toFixed(1)}% margin` : 'N/A'}
          </div>
        </div>
      ),
    },
    {
      name: "Remaining",
      selector: (row) => row.quantity_remaining,
      sortable: true,
      cell: (row) => (
        <div>
          <div className="font-medium">{row.quantity_remaining} units</div>
          <div className="text-sm text-gray-500">
            ₵{(row.remaining_value || 0).toFixed(2)}
          </div>
        </div>
      ),
    },
    {
      name: "Stock Ratio",
      selector: (row) => row.stock_ratio,
      sortable: true,
      cell: (row) => (
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full"
            style={{ width: `${Math.min(100, row.stock_ratio || 0)}%` }}
          ></div>
        </div>
      ),
    },
    {
      name: "Selling Price",
      selector: (row) => row.selling_price,
      sortable: true,
      cell: (row) => `₵${(row.selling_price || 0).toFixed(2)}`,
    },
  ];

  // Define columns for the customer data table
  const customerColumns = [
    {
      name: "Customer",
      selector: (row) => row.name,
      sortable: true,
      cell: (row) => (
        <div>
          <div className="font-medium">{row.name}</div>
          {row.email && <div className="text-sm text-gray-500">{row.email}</div>}
        </div>
      ),
    },
    {
      name: "Total Spent",
      selector: (row) => row.total_spent,
      sortable: true,
      cell: (row) => `₵${(row.total_spent || 0).toFixed(2)}`,
    },
    {
      name: "Total Profit",
      selector: (row) => row.total_profit,
      sortable: true,
      cell: (row) => (
        <div className={`font-medium ${row.total_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          ₵{(row.total_profit || 0).toFixed(2)}
        </div>
      ),
    },
    {
      name: "Orders",
      selector: (row) => row.orders_count,
      sortable: true,
    },
    {
      name: "Avg. Order Value",
      selector: (row) => row.average_order_value,
      sortable: true,
      cell: (row) => `₵${(row.average_order_value || 0).toFixed(2)}`,
    },
    {
      name: "Products Purchased",
      selector: (row) => row.products_count,
      sortable: true,
    },
    {
      name: "Last Purchase",
      selector: (row) => row.last_purchase,
      sortable: true,
    },
    {
      name: "Actions",
      cell: (row) => (
        <button
          onClick={() => setExpandedCustomer(expandedCustomer === row.id ? null : row.id)}
          className="text-blue-600 hover:text-blue-800"
        >
          {expandedCustomer === row.id ? <FaEyeSlash /> : <FaEye />}
        </button>
      ),
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
    },
  ];

  // Expanded row component for customer details
  const ExpandedCustomerComponent = ({ data }) => {
    if (!data.products_array || data.products_array.length === 0) {
      return (
        <div className="p-4 bg-gray-50">
          <p className="text-gray-500">No product details available for this customer.</p>
        </div>
      );
    }

    return (
      <div className="p-4 bg-gray-50">
        <h4 className="font-medium mb-3">Products Purchased</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                {showProfit && (
                  <>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cost
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Profit
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Margin
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
             {[...data.products_array]
  .sort((a, b) => b.quantity - a.quantity)
  .map((product) => (
    <tr key={product.product_id}>
      <td className="px-4 py-2 whitespace-nowrap">{product.name}</td>
      <td className="px-4 py-2 whitespace-nowrap">{product.quantity}</td>
      <td className="px-4 py-2 whitespace-nowrap">₵{product.revenue.toFixed(2)}</td>
      {showProfit && (
        <>
          <td className="px-4 py-2 whitespace-nowrap">₵{product.cost.toFixed(2)}</td>
          <td
            className={`px-4 py-2 whitespace-nowrap ${
              product.profit >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            ₵{product.profit.toFixed(2)}
          </td>
          <td className="px-4 py-2 whitespace-nowrap">
            {product.revenue > 0
              ? `${((product.profit / product.revenue) * 100).toFixed(1)}%`
              : "N/A"}
          </td>
        </>
      )}
    </tr>
))}

           
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Export to Excel
  const exportToExcel = () => {
    if (activeTab === "products" && (!salesAnalysisData || salesAnalysisData.length === 0)) {
      toast.warning("No product data to export");
      return;
    }
    
    if (activeTab === "customers" && (!customerAnalysisData || customerAnalysisData.length === 0)) {
      toast.warning("No customer data to export");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(
      activeTab === "products" 
        ? salesAnalysisData.map((item) => ({
            "Product Name": item.name,
            "Quantity Sold": item.quantity_sold,
            "Total Revenue": item.total_revenue,
            "Total Cost": item.total_cost,
            "Total Profit": item.total_profit,
            "Profit Margin": item.total_revenue > 0 ? `${((item.total_profit / item.total_revenue) * 100).toFixed(1)}%` : 'N/A',
            "Quantity Remaining": item.quantity_remaining,
            "Remaining Value": item.remaining_value,
            "Selling Price": item.selling_price,
          }))
        : customerAnalysisData.map((item) => ({
            "Customer Name": item.name,
            "Email": item.email,
            "Total Spent": item.total_spent,
            "Total Profit": item.total_profit,
            "Orders Count": item.orders_count,
            "Average Order Value": item.average_order_value,
            "Products Purchased": item.products_count,
            "Last Purchase": item.last_purchase,
          }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${activeTab === "products" ? "Product" : "Customer"} Analysis`);
    XLSX.writeFile(wb, `sales_analysis_${activeTab}_${timePeriod}.xlsx`);
  };

  // Print the report
  const printReport = () => {
    if (activeTab === "products" && (!salesAnalysisData || salesAnalysisData.length === 0)) {
      toast.warning("No product data to print");
      return;
    }
    
    if (activeTab === "customers" && (!customerAnalysisData || customerAnalysisData.length === 0)) {
      toast.warning("No customer data to print");
      return;
    }

    const printWindow = window.open();
    printWindow.document.write(
      "<html><head><title>Sales Analysis Report</title><style>body { font-family: Arial, sans-serif; } table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background-color: #f2f2f2; }</style></head><body>"
    );
    printWindow.document.write(`<h1>Sales Analysis Report (${timePeriod})</h1>`);
    
    if (activeTab === "products") {
      printWindow.document.write(
        "<table><thead><tr><th>Product</th><th>Sold</th><th>Revenue</th><th>Cost</th><th>Profit</th><th>Margin</th><th>Remaining</th><th>Remaining Value</th></tr></thead><tbody>"
      );
      
      salesAnalysisData.forEach((item) => {
        printWindow.document.write(
          `<tr>
            <td>${item.name}</td>
            <td>${item.quantity_sold} units</td>
            <td>₵${(item.total_revenue || 0).toFixed(2)}</td>
            <td>₵${(item.total_cost || 0).toFixed(2)}</td>
            <td>₵${(item.total_profit || 0).toFixed(2)}</td>
            <td>${item.total_revenue > 0 ? `${((item.total_profit / item.total_revenue) * 100).toFixed(1)}%` : 'N/A'}</td>
            <td>${item.quantity_remaining} units</td>
            <td>₵${(item.remaining_value || 0).toFixed(2)}</td>
          </tr>`
        );
      });
    } else {
      printWindow.document.write(
        "<table><thead><tr><th>Customer</th><th>Total Spent</th><th>Total Profit</th><th>Orders</th><th>Avg. Order Value</th><th>Products Purchased</th><th>Last Purchase</th></tr></thead><tbody>"
      );
      
      customerAnalysisData.forEach((item) => {
        printWindow.document.write(
          `<tr>
            <td>${item.name}</td>
            <td>₵${(item.total_spent || 0).toFixed(2)}</td>
            <td>₵${(item.total_profit || 0).toFixed(2)}</td>
            <td>${item.orders_count}</td>
            <td>₵${(item.average_order_value || 0).toFixed(2)}</td>
            <td>${item.products_count}</td>
            <td>${item.last_purchase}</td>
          </tr>`
        );
      });
    }
    
    printWindow.document.write("</tbody></table>");
    printWindow.document.write("</body></html>");
    printWindow.document.close();
    printWindow.print();
  };

  // Show loading spinner if data is still loading
  if (isLoading) {
    return (
      <div className="container mx-auto p-6 bg-gray-100 shadow-lg rounded-lg overflow-y-scroll h-[85vh]">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 bg-gray-100 shadow-lg rounded-lg overflow-y-scroll h-[85vh]">
      <h2 className="text-3xl font-semibold text-gray-800 mb-6">
        Sales Analysis
      </h2>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`py-2 px-4 font-medium ${activeTab === "products" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}
          onClick={() => setActiveTab("products")}
        >
          <FaShoppingCart className="inline mr-2" />
          Product Analysis
        </button>
        <button
          className={`py-2 px-4 font-medium ${activeTab === "customers" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}
          onClick={() => setActiveTab("customers")}
        >
          <FaUsers className="inline mr-2" />
          Customer Analysis
        </button>
        <button
          className={`py-2 px-4 font-medium ${activeTab === "insights" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}
          onClick={() => setActiveTab("insights")}
        >
          <FaChartBar className="inline mr-2" />
          Insights
        </button>
      </div>

      {activeTab !== "insights" && (
        <div className="mt-8 overflow-x-auto bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-medium text-gray-800">
              {activeTab === "products" ? "Product Sales Summary" : "Customer Sales Summary"}
            </h2>
            <div className="flex space-x-4">
              {activeTab === "customers" && (
                <button
                  onClick={() => setShowProfit(!showProfit)}
                  className={`flex items-center ${showProfit ? 'bg-green-500' : 'bg-gray-500'} text-white py-2 px-4 rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500`}
                >
                  {showProfit ? <FaEye className="mr-2" /> : <FaEyeSlash className="mr-2" />}
                  {showProfit ? 'Hide Profit' : 'Show Profit'}
                </button>
              )}
              <button
                onClick={exportToExcel}
                className="flex items-center bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <FaFileExcel size={16} className="mr-2" />
                Excel
              </button>
          
              <button
                onClick={printReport}
                className="flex items-center bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <FaPrint size={16} className="mr-2" />
                Print
              </button>
            </div>
          </div>

          {/* Time period selector */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="col-span-1 md:col-span-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time Period
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setTimePeriod("all")}
                  className={`px-3 py-1 rounded-md ${timePeriod === "all" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
                >
                  All Time
                </button>
                <button
                  onClick={() => setTimePeriod("daily")}
                  className={`px-3 py-1 rounded-md ${timePeriod === "daily" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
                >
                  Today
                </button>
                <button
                  onClick={() => setTimePeriod("weekly")}
                  className={`px-3 py-1 rounded-md ${timePeriod === "weekly" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
                >
                  This Week
                </button>
                <button
                  onClick={() => setTimePeriod("monthly")}
                  className={`px-3 py-1 rounded-md ${timePeriod === "monthly" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
                >
                  This Month
                </button>
                <button
                  onClick={() => setTimePeriod("custom")}
                  className={`px-3 py-1 rounded-md ${timePeriod === "custom" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
                >
                  Custom Range
                </button>
              </div>
            </div>

            {timePeriod === "custom" && (
              <>
                <div className="col-span-1 md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <div className="relative">
                    <DatePicker
                      selected={customStartDate}
                      onChange={(date) => setCustomStartDate(date)}
                      selectsStart
                      startDate={customStartDate}
                      endDate={customEndDate}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                    <FaCalendarAlt className="absolute right-3 top-3 text-gray-400" />
                  </div>
                </div>
                <div className="col-span-1 md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <div className="relative">
                    <DatePicker
                      selected={customEndDate}
                      onChange={(date) => setCustomEndDate(date)}
                      selectsEnd
                      startDate={customStartDate}
                      endDate={customEndDate}
                      minDate={customStartDate}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                    <FaCalendarAlt className="absolute right-3 top-3 text-gray-400" />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="mb-4">
            <input
              type="text"
              placeholder={activeTab === "products" ? "Search products..." : "Search customers..."}
              className="p-2 border border-gray-300 rounded-md w-full max-w-md"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          </div>

          <DataTable
            columns={activeTab === "products" ? productColumns : customerColumns}
            data={activeTab === "products" ? filteredProductData : filteredCustomerData}
            progressPending={false}
            pagination
            highlightOnHover
            responsive
            striped
            expandableRows={activeTab === "customers"}
            expandableRowsComponent={ExpandedCustomerComponent}
            expandableRowExpanded={row => row.id === expandedCustomer}
            onRowExpandToggled={(toggled, row) => setExpandedCustomer(toggled ? row.id : null)}
            noDataComponent={<div className="p-4 text-center text-gray-500">No data available</div>}
            customStyles={{
              headCells: {
                style: {
                  backgroundColor: "#f8fafc",
                  fontWeight: "600",
                },
              },
            }}
          />

          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
            {activeTab === "products" ? (
              <>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-blue-800 mb-2">
                    Total Products
                  </h3>
                  <p className="text-3xl font-bold text-blue-600">
                    {products ? products.length : 0}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-green-800 mb-2">
                    Total Units Sold
                  </h3>
                  <p className="text-3xl font-bold text-green-600">
                    {insights.totalUnitsSold}
                  </p>
                </div>
               
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-purple-800 mb-2">
                    Total Profit
                  </h3>
                  <p className="text-3xl font-bold text-purple-600">
                    ₵{insights.totalProfit.toFixed(2)}
                  </p>
                </div>
                 <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-yellow-800 mb-2">
                    Total Sales
                  </h3>
                  <p className="text-3xl font-bold text-yellow-600">
                    ₵{insights.totalRevenue.toFixed(2)}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-blue-800 mb-2">
                    Total Customers
                  </h3>
                  <p className="text-3xl font-bold text-blue-600">
                    {insights.totalCustomers}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-green-800 mb-2">
                    Average Order Value
                  </h3>
                  <p className="text-3xl font-bold text-green-600">
                    ₵{insights.averageOrderValue.toFixed(2)}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-purple-800 mb-2">
                    Total Profit
                  </h3>
                  <p className="text-3xl font-bold text-purple-600">
                    ₵{customerAnalysisData.reduce((sum, c) => sum + (c.total_profit || 0), 0).toFixed(2)}
                  </p>
                </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-yellow-800 mb-2">
                    Total Sales
                  </h3>
                  <p className="text-3xl font-bold text-yellow-600">
                    ₵{insights.totalRevenue.toFixed(2)}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === "insights" && (
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-medium text-gray-800 mb-6">Sales Insights</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Top Selling Products */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                <FaStar className="text-yellow-500 mr-2" />
                Top Selling Products
              </h3>
              <div className="space-y-3">
                {insights.topSellingProducts && insights.topSellingProducts.length > 0 ? (
                  insights.topSellingProducts.map((product, index) => (
                    <div key={product.id} className="flex justify-between items-center">
                      <div className="flex items-center">
                        <span className="font-medium text-gray-700 mr-2">{index + 1}.</span>
                        <span>{product.name}</span>
                      </div>
                      <span className="font-semibold text-blue-600">{product.quantity_sold} units</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No sales data available</p>
                )}
              </div>
            </div>

            {/* Most Profitable Products */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                <FaMoneyBillWave className="text-green-500 mr-2" />
                Most Profitable Products
              </h3>
              <div className="space-y-3">
                {insights.mostProfitableProducts && insights.mostProfitableProducts.length > 0 ? (
                  insights.mostProfitableProducts.map((product, index) => (
                    <div key={product.id} className="flex justify-between items-center">
                      <div className="flex items-center">
                        <span className="font-medium text-gray-700 mr-2">{index + 1}.</span>
                        <span>{product.name}</span>
                      </div>
                      <span className="font-semibold text-green-600">₵{(product.total_profit || 0).toFixed(2)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No sales data available</p>
                )}
              </div>
            </div>

            {/* Top Customers */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                <FaCrown className="text-purple-500 mr-2" />
                Top Customers
              </h3>
              <div className="space-y-3">
                {insights.topCustomers && insights.topCustomers.length > 0 ? (
                  insights.topCustomers.map((customer, index) => (
                    <div key={customer.id} className="flex justify-between items-center">
                      <div className="flex items-center">
                        <span className="font-medium text-gray-700 mr-2">{index + 1}.</span>
                        <span>{customer.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-purple-600">₵{(customer.total_spent || 0).toFixed(2)}</div>
                        <div className="text-sm text-green-600">₵{(customer.total_profit || 0).toFixed(2)} profit</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No customer data available</p>
                )}
              </div>
            </div>

            {/* Customer Segmentation */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                <FaUsers className="text-blue-500 mr-2" />
                Customer Segmentation
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">VIP Customers (₵1000+)</span>
                    <span className="text-sm font-semibold text-purple-600">{insights.customerSegments.vip}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full" 
                      style={{ width: `${insights.totalCustomers > 0 ? (insights.customerSegments.vip / insights.totalCustomers) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">Regular Customers (₵100-₵1000)</span>
                    <span className="text-sm font-semibold text-blue-600">{insights.customerSegments.regular}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${insights.totalCustomers > 0 ? (insights.customerSegments.regular / insights.totalCustomers) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">New Customers (Under ₵100)</span>
                    <span className="text-sm font-semibold text-green-600">{insights.customerSegments.new}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${insights.totalCustomers > 0 ? (insights.customerSegments.new / insights.totalCustomers) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Low Stock Alert */}
          {insights.lowStockProducts && insights.lowStockProducts.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-medium text-yellow-800 mb-3 flex items-center">
                <FaChartLine className="text-yellow-600 mr-2" />
                Low Stock Alert
              </h3>
              <p className="text-sm text-yellow-700 mb-3">
                The following products are running low on stock and may need restocking:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {insights.lowStockProducts.map(product => (
                  <div key={product.id} className="flex justify-between items-center text-sm">
                    <span className="font-medium">{product.name || "Unknown Product"}</span>
                    <span className="text-red-600">Only {product.quantity_in_stock || 0} left</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">₵{insights.totalRevenue.toFixed(2)}</div>
              <div className="text-sm text-blue-800">Total Sales</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{insights.totalUnitsSold}</div>
              <div className="text-sm text-green-800">Units Sold</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600">₵{insights.totalProfit.toFixed(2)}</div>
              <div className="text-sm text-purple-800">Total Profit</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-600">₵{insights.averageOrderValue.toFixed(2)}</div>
              <div className="text-sm text-yellow-800">Avg. Order Value</div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
};

export default SalesAnalysis;