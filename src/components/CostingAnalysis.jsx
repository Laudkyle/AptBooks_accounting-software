import { useState, useEffect } from 'react';
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
  FiLoader
} from 'react-icons/fi';
import API from '../api';

const ProductCostingPage = () => {
  // State management
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [purchaseDetails, setPurchaseDetails] = useState({});
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [timeRange, setTimeRange] = useState('month');
  const [loading, setLoading] = useState(true);
  const [productLoading, setProductLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper function to check if date is within time range
  const isWithinTimeRange = (dateString, range) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    switch (range) {
      case 'week':
        return diffDays <= 7;
      case 'month':
        return diffDays <= 30;
      case 'quarter':
        return diffDays <= 90;
      case 'year':
        return diffDays <= 365;
      default:
        return true;
    }
  };

  // Filter purchase orders based on time range
  const getFilteredPurchaseOrders = () => {
    return purchaseOrders.filter(order => isWithinTimeRange(order.date, timeRange));
  };

  // Filter purchase details for selected product based on time range
  const getFilteredPurchaseDetails = (productId) => {
    if (!purchaseDetails[productId]) return [];
    return purchaseDetails[productId].filter(order => 
      isWithinTimeRange(order.date, timeRange)
    );
  };

  // Fetch all initial data
  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [productsRes, suppliersRes, ordersRes] = await Promise.all([
        API.get("/products"),
        API.get("/suppliers"),
        API.get("/purchase_orders")
      ]);

      setProducts(productsRes.data);
      setSuppliers(suppliersRes.data);
      
      // Enhance purchase orders with supplier names
      const enhancedOrders = ordersRes.data.map(order => {
        const supplier = suppliersRes.data.find(s => s.id === order.supplier_id);
        return {
          ...order,
          supplier_name: supplier ? supplier.business_name || supplier.name : "Unknown Supplier",
          date: new Date(order.date).toISOString().split('T')[0] // Format date
        };
      });
      setPurchaseOrders(enhancedOrders);
      
    } catch (err) {
      console.error("Error fetching initial data:", err);
      setError("Failed to load initial data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch purchase details for a specific product
  const fetchProductPurchaseHistory = async (productId) => {
    if (purchaseDetails[productId]) return; // Already loaded
    
    setProductLoading(true);
    setError(null);
    try {
      // Get details for all purchase orders in parallel
      const ordersWithDetails = await Promise.all(
        purchaseOrders.map(async (order) => {
          try {
            const res = await API.get(`/purchase_orders/${order.id}/details`);
            const detail = res.data.find(item => item.product_id === productId);
            return detail ? { ...order, detail } : null;
          } catch (err) {
            console.error(`Error fetching details for order ${order.id}:`, err);
            return null;
          }
        })
      );
      
      // Filter out null results and store in state
      const validOrders = ordersWithDetails.filter(order => order !== null);
      setPurchaseDetails(prev => ({
        ...prev,
        [productId]: validOrders
      }));
      
    } catch (err) {
      console.error("Error fetching purchase details:", err);
      setError("Failed to load purchase history. Please try again.");
    } finally {
      setProductLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Load purchase history when product is selected
  useEffect(() => {
    if (selectedProduct) {
      fetchProductPurchaseHistory(selectedProduct.id);
    }
  }, [selectedProduct]);

  // Calculate summary metrics based on filtered data
  const getFilteredMetrics = () => {
    const filteredOrders = getFilteredPurchaseOrders();
    
    // Calculate total purchases in time range
    const totalPurchases = filteredOrders.length;
    
    // Calculate total purchase value (approximation)
    const totalPurchaseValue = filteredOrders.reduce((sum, order) => {
      return sum + (order.total_amount || 0);
    }, 0);

    // Calculate active suppliers in time range
    const activeSuppliersInRange = new Set(
      filteredOrders.map(order => order.supplier_id)
    ).size;

    return {
      totalPurchases,
      totalPurchaseValue,
      activeSuppliersInRange
    };
  };

  // Calculate summary metrics
  const totalInventoryValue = products.reduce(
    (sum, product) => sum + (product.cp * (product.quantity_in_stock || 0)), 
    0
  );

  const avgProfitMargin = products.length > 0 
    ? products.reduce((sum, product) => {
        const margin = product.sp && product.cp 
          ? ((product.sp - product.cp) / product.cp) * 100 
          : 0;
        return sum + margin;
      }, 0) / products.length
    : 0;

  // Get supplier name by ID
  const getSupplierName = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.business_name || supplier.name : "Unknown Supplier";
  };

  // Calculate average purchase price for selected product (filtered by time)
  const getAveragePurchasePrice = () => {
    if (!selectedProduct) return null;
    
    const filteredPurchases = getFilteredPurchaseDetails(selectedProduct.id);
    if (filteredPurchases.length === 0) return null;
    
    const totalSpent = filteredPurchases.reduce(
      (sum, purchase) => sum + (purchase.detail.unit_price * purchase.detail.quantity), 
      0
    );
    const totalQuantity = filteredPurchases.reduce(
      (sum, purchase) => sum + purchase.detail.quantity, 
      0
    );
    
    return totalQuantity > 0 ? (totalSpent / totalQuantity) : 0;
  };

  // Calculate total quantity purchased (filtered by time)
  const getTotalPurchasedQuantity = () => {
    if (!selectedProduct) return 0;
    
    const filteredPurchases = getFilteredPurchaseDetails(selectedProduct.id);
    return filteredPurchases.reduce(
      (sum, purchase) => sum + purchase.detail.quantity, 
      0
    );
  };

  // Get time range label
  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'quarter': return 'This Quarter';
      case 'year': return 'This Year';
      default: return 'All Time';
    }
  };

  // Get filtered metrics
  const filteredMetrics = getFilteredMetrics();

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center">
            <FiLoader className="animate-spin text-2xl text-blue-500 mb-2" />
            <p>Loading product data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
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
        <h1 className="text-2xl font-bold text-gray-800">Product Costing Analysis</h1>
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

      {/* Summary Cards - Updated to show filtered data */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <FiPackage className="text-blue-500 text-xl mr-3" />
            <div>
              <p className="text-sm text-gray-500">Total Products</p>
              <p className="text-xl font-semibold">{products.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <FiDollarSign className="text-green-500 text-xl mr-3" />
            <div>
              <p className="text-sm text-gray-500">Purchase Value ({getTimeRangeLabel()})</p>
              <p className="text-xl font-semibold">₵{filteredMetrics.totalPurchaseValue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <FiTrendingUp className="text-purple-500 text-xl mr-3" />
            <div>
              <p className="text-sm text-gray-500">Avg. Profit Margin</p>
              <p className="text-xl font-semibold">{avgProfitMargin.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <FiTruck className="text-orange-500 text-xl mr-3" />
            <div>
              <p className="text-sm text-gray-500">Purchase Orders ({getTimeRangeLabel()})</p>
              <p className="text-xl font-semibold">{filteredMetrics.totalPurchases}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product List */}
        <div className="bg-white rounded-lg shadow-sm border lg:col-span-1">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-700">Products</h2>
          </div>
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {products.map(product => (
              <div 
                key={product.id}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition ${
                  selectedProduct?.id === product.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
                onClick={() => setSelectedProduct(product)}
              >
                <div className="flex justify-between">
                  <p className="font-medium text-gray-800">{product.name}</p>
                  <span className="text-sm text-gray-500">
                    {product.quantity_in_stock || 0} in stock
                  </span>
                </div>
                <div className="flex justify-between mt-1 text-sm">
                  <span className="text-gray-600">Cost: ₵{product.cp?.toFixed(2) || 'N/A'}</span>
                  <span className="text-gray-600">Sell: ₵{product.sp?.toFixed(2) || 'N/A'}</span>
                </div>
                {product.suppliers_id && (
                  <div className="flex items-center mt-1 text-xs text-gray-500">
                    <FiUser className="mr-1" />
                    <span className="truncate">{getSupplierName(product.suppliers_id)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Costing Details */}
        <div className="bg-white rounded-lg shadow-sm border lg:col-span-2">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-700">
              {selectedProduct ? `${selectedProduct.name} Cost Analysis - ${getTimeRangeLabel()}` : 'Select a product'}
            </h2>
          </div>
          
          {selectedProduct ? (
            <div className="p-4 space-y-6">
              {/* Basic Info Section - Updated with filtered data */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Product Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current Stock:</span>
                      <span className="font-medium">
                        {selectedProduct.quantity_in_stock || 0} units
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Inventory Value:</span>
                      <span className="font-medium">
                        ₵{((selectedProduct.cp || 0) * (selectedProduct.quantity_in_stock || 0)).toLocaleString()}
                      </span>
                    </div>
                    {selectedProduct.suppliers_id && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Primary Supplier:</span>
                        <span className="font-medium">
                          {getSupplierName(selectedProduct.suppliers_id)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Purchased ({getTimeRangeLabel()}):</span>
                      <span className="font-medium">
                        {getTotalPurchasedQuantity()} units
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Pricing Analysis ({getTimeRangeLabel()})</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current Cost Price:</span>
                      <span className="font-medium">
                        ₵{selectedProduct.cp?.toFixed(2) || 'N/A'}
                      </span>
                    </div>
                    {getAveragePurchasePrice() !== null && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Avg. Purchase Price:</span>
                          <span className="font-medium">
                            ₵{getAveragePurchasePrice().toFixed(2)}
                          </span>
                        </div>
                        {selectedProduct.cp && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Price Variance:</span>
                            <span className={`font-medium ${
                              selectedProduct.cp > getAveragePurchasePrice() 
                                ? 'text-red-500' 
                                : 'text-green-500'
                            }`}>
                              {(
                                ((selectedProduct.cp - getAveragePurchasePrice()) / 
                                getAveragePurchasePrice()) * 100
                              ).toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Selling Price:</span>
                      <span className="font-medium">
                        ₵{selectedProduct.sp?.toFixed(2) || 'N/A'}
                      </span>
                    </div>
                    {selectedProduct.cp && selectedProduct.sp && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Profit Margin:</span>
                        <span className={`font-medium ${
                          ((selectedProduct.sp - selectedProduct.cp) / selectedProduct.cp * 100) > 0 
                            ? 'text-green-500' 
                            : 'text-red-500'
                        }`}>
                          {((selectedProduct.sp - selectedProduct.cp) / selectedProduct.cp * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Purchase History Section - Now filtered by time range */}
              <div className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-medium text-gray-500">
                    Purchase History - {getTimeRangeLabel()}
                  </h3>
                  {productLoading && (
                    <div className="flex items-center text-xs text-gray-500">
                      <FiLoader className="animate-spin mr-1" />
                      <span>Loading...</span>
                    </div>
                  )}
                </div>
                
                {(() => {
                  const filteredPurchases = getFilteredPurchaseDetails(selectedProduct.id);
                  
                  if (filteredPurchases.length > 0) {
                    return (
                      <div className="space-y-3">
                        {filteredPurchases.map((order) => (
                          <div key={order.id} className="border rounded-lg p-3 hover:bg-gray-50 transition">
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center">
                                <FiShoppingBag className="text-blue-500 mr-2" />
                                <span className="font-medium text-gray-800">{order.reference_number}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 text-xs rounded ${
                                  order.payment_status === 'paid' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {order.payment_status}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {order.date}
                                </span>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm mb-2">
                              <div className="flex items-center">
                                <FiUser className="mr-1 text-gray-500" />
                                <span className="truncate">{order.supplier_name}</span>
                              </div>
                              <div className="flex items-center">
                                <FiBox className="mr-1 text-gray-500" />
                                <span>Quantity: {order.detail.quantity}</span>
                              </div>
                              <div className="flex items-center justify-end">
                                <FiDollarSign className="mr-1 text-gray-500" />
                                <span className="font-medium">
                                  ₵{(order.detail.unit_price * order.detail.quantity).toFixed(2)}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex justify-between mt-2 pt-2 border-t text-xs text-gray-500">
                              <span>Unit Price: ₵{order.detail.unit_price.toFixed(2)}</span>
                              <span>Item Total: ₵{(order.detail.unit_price * order.detail.quantity).toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  } else if (productLoading) {
                    return (
                      <div className="flex justify-center items-center py-8">
                        <div className="flex flex-col items-center">
                          <FiLoader className="animate-spin text-xl text-blue-500 mb-2" />
                          <p className="text-gray-500">Loading purchase history...</p>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="text-center py-8">
                        <FiPackage className="mx-auto text-2xl text-gray-400 mb-2" />
                        <p className="text-gray-500">
                          No purchase history found for this product in {getTimeRangeLabel().toLowerCase()}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Try selecting a different time range
                        </p>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="max-w-md mx-auto">
                <FiPackage className="mx-auto text-3xl text-gray-400 mb-3" />
                <h3 className="text-lg font-medium text-gray-600 mb-1">
                  No Product Selected
                </h3>
                <p className="text-gray-500">
                  Select a product from the list to view detailed costing information
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCostingPage;