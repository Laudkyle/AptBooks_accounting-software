import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Trash2, Calculator, Save, AlertCircle, Package, DollarSign, X, Edit, ArrowLeft, Clock } from 'lucide-react';
import API from '../api';
import { toast } from 'react-toastify';

const EditProductCosting = () => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [overheadCosts, setOverheadCosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCosting, setLoadingCosting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('materials');
  const [showModal, setShowModal] = useState(false);
  const [originalCostingData, setOriginalCostingData] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Initialize component data
  useEffect(() => {
    fetchCostedProducts();
  }, []);

  const fetchCostedProducts = async () => {
    try {
      setLoading(true);
      const response = await API.get("/costed");
      // Ensure we always have an array, even if response.data is undefined
      setProducts(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Error loading products. Please try again.');
      // Set to empty array to prevent undefined errors
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingCosting = async (productId) => {
    try {
      setLoadingCosting(true);
      const response = await API.get(`/costed/${productId}/costing`);
      const costingData = response.data;
      
      if (costingData) {
        // Ensure materials and overheadCosts are always arrays
        setMaterials(Array.isArray(costingData.materials) ? costingData.materials : []);
        setOverheadCosts(Array.isArray(costingData.overheadCosts) ? costingData.overheadCosts : []);
        setOriginalCostingData(costingData);
        setHasUnsavedChanges(false);
      } else {
        // Initialize with empty arrays if no data
        setMaterials([]);
        setOverheadCosts([]);
        setOriginalCostingData(null);
      }
    } catch (error) {
      console.error('Error fetching existing costing:', error);
      toast.error('Error loading existing costing data. Please try again.');
      // Initialize with empty arrays on error
      setMaterials([]);
      setOverheadCosts([]);
    } finally {
      setLoadingCosting(false);
    }
  };

  // Safely filter products with proper fallbacks
  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    
    return products.filter(product => {
      // Add null checks for product properties
      const name = product?.name || '';
      const sku = product?.sku || '';
      const searchTermLower = searchTerm.toLowerCase();
      
      return name.toLowerCase().includes(searchTermLower) || 
             sku.toLowerCase().includes(searchTermLower);
    });
  }, [products, searchTerm]);

  const handleProductSelect = async (product) => {
    if (hasUnsavedChanges) {
      const confirm = window.confirm('You have unsaved changes. Are you sure you want to switch products? Your changes will be lost.');
      if (!confirm) return;
    }
    
    setSelectedProduct(product);
    setShowModal(true);
    setActiveTab('materials');
    await fetchExistingCosting(product.id);
  };

  const closeModal = () => {
    if (hasUnsavedChanges) {
      const confirm = window.confirm('You have unsaved changes. Are you sure you want to close? Your changes will be lost.');
      if (!confirm) return;
    }
    
    setShowModal(false);
    setSelectedProduct(null);
    setMaterials([]);
    setOverheadCosts([]);
    setOriginalCostingData(null);
    setActiveTab('materials');
    setHasUnsavedChanges(false);
  };

  const markAsChanged = () => {
    setHasUnsavedChanges(true);
  };

  const addMaterial = () => {
    setMaterials([...materials, {
      id: Date.now(),
      name: '',
      quantity: 1,
      unitCost: 0,
      unit: 'pcs',
      totalCost: 0
    }]);
    markAsChanged();
  };

  const updateMaterial = (id, field, value) => {
    setMaterials(materials.map(material => {
      if (material.id === id) {
        const updated = { ...material, [field]: value };
        if (field === 'quantity' || field === 'unitCost') {
          updated.totalCost = updated.quantity * updated.unitCost;
        }
        return updated;
      }
      return material;
    }));
    markAsChanged();
  };

  const removeMaterial = (id) => {
    setMaterials(materials.filter(material => material.id !== id));
    markAsChanged();
  };

  const addOverheadCost = () => {
    setOverheadCosts([...overheadCosts, {
      id: Date.now(),
      name: '',
      type: 'fixed',
      value: 0,
      totalCost: 0
    }]);
    markAsChanged();
  };

  const updateOverheadCost = (id, field, value) => {
    setOverheadCosts(prevOverheadCosts => {
      return prevOverheadCosts.map(overhead => {
        if (overhead.id === id) {
          const updated = { ...overhead, [field]: value };
          if (field === 'value' || field === 'type') {
            calculateOverheadTotalCost(updated);
          }
          return updated;
        }
        return overhead;
      });
    });
    markAsChanged();
  };

  const removeOverheadCost = (id) => {
    setOverheadCosts(overheadCosts.filter(overhead => overhead.id !== id));
    markAsChanged();
  };

  const totalMaterialsCost = useMemo(() => {
    return materials.reduce((sum, material) => sum + (material.totalCost || 0), 0);
  }, [materials]);

  const totalUnitsProduced = useMemo(() => {
    const totalPieces = materials
      .filter(material => material.unit === 'pcs')
      .reduce((sum, material) => sum + (material.quantity || 0), 0);
    
    return totalPieces > 0 ? totalPieces : 1;
  }, [materials]);

  const calculateOverheadTotalCost = (overhead) => {
    switch (overhead.type) {
      case 'fixed':
        overhead.totalCost = parseFloat(overhead.value) || 0;
        break;
      case 'percentage':
        overhead.totalCost = (totalMaterialsCost * (parseFloat(overhead.value) || 0)) / 100;
        break;
      case 'per_unit':
        overhead.totalCost = (parseFloat(overhead.value) || 0) * totalUnitsProduced;
        break;
      default:
        overhead.totalCost = 0;
    }
  };

  const totalOverheadCost = useMemo(() => {
    const updatedOverheadCosts = overheadCosts.map(overhead => {
      const updated = { ...overhead };
      switch (overhead.type) {
        case 'fixed':
          updated.totalCost = parseFloat(overhead.value) || 0;
          break;
        case 'percentage':
          updated.totalCost = (totalMaterialsCost * (parseFloat(overhead.value) || 0)) / 100;
          break;
        case 'per_unit':
          updated.totalCost = (parseFloat(overhead.value) || 0) * totalUnitsProduced;
          break;
        default:
          updated.totalCost = 0;
      }
      return updated;
    });
    
    setOverheadCosts(prevOverheadCosts => {
      const hasChanged = prevOverheadCosts.some((prev, index) => 
        prev.totalCost !== updatedOverheadCosts[index]?.totalCost
      );
      return hasChanged ? updatedOverheadCosts : prevOverheadCosts;
    });
    
    return updatedOverheadCosts.reduce((sum, overhead) => sum + (overhead.totalCost || 0), 0);
  }, [overheadCosts, totalMaterialsCost, totalUnitsProduced]);

  const totalProductCost = useMemo(() => {
    return totalMaterialsCost + totalOverheadCost;
  }, [totalMaterialsCost, totalOverheadCost]);

  const profitMargin = useMemo(() => {
    if (!selectedProduct?.sellingPrice || totalProductCost === 0) return 0;
    return ((selectedProduct.sellingPrice - totalProductCost) / selectedProduct.sellingPrice * 100);
  }, [selectedProduct?.sellingPrice, totalProductCost]);

  const handleSaveCosting = async () => {
    if (!selectedProduct) return;
    
    try {
      setSaving(true);
      
      const costingData = {
        productId: selectedProduct.id,
        materials,
        overheadCosts,
        totalMaterialsCost,
        totalOverheadCost,
        totalProductCost,
        profitMargin,
        lastUpdated: new Date().toISOString()
      };

      await API.put(`/costed/${selectedProduct.id}/costing/${selectedProduct.costingId}`, costingData);
      
      await API.put(`/costed/${selectedProduct.id}`, {
        ...selectedProduct,
        cost: totalProductCost,
        lastCosted: new Date().toISOString()
      });

      setHasUnsavedChanges(false);
      setOriginalCostingData(costingData);
      
      // Update the product in the list
      setProducts(products.map(p => 
        p.id === selectedProduct.id 
          ? { ...p, cost: totalProductCost, lastCosted: new Date().toISOString(), profitMargin }
          : p
      ));

      toast.success('Costing updated successfully!');
    } catch (error) {
      console.error('Error saving costing:', error);
      toast.error('Error saving costing. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetToOriginal = () => {
    if (originalCostingData) {
      setMaterials(Array.isArray(originalCostingData.materials) ? originalCostingData.materials : []);
      setOverheadCosts(Array.isArray(originalCostingData.overheadCosts) ? originalCostingData.overheadCosts : []);
      setHasUnsavedChanges(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Edit className="h-6 w-6 text-blue-600" />
          Edit Product Costing
        </h1>
        
        {/* Product Selection */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search products with existing costing..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => handleProductSelect(product)}
                className="p-4 border rounded-lg cursor-pointer transition-all hover:shadow-lg hover:border-blue-300 border-gray-200 bg-white"
              >
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-900">{product.name || 'Unnamed Product'}</p>
                    <p className="text-xs text-gray-500">SKU: {product.sku || 'N/A'}</p>
                    <div className="flex justify-between items-center mt-2">
                      <div>
                        {product.sellingPrice && (
                          <p className="text-xs text-green-600 font-medium">Price: ₵{product.sellingPrice}</p>
                        )}
                        {product.cost && (
                          <p className="text-xs text-blue-600">Cost: ₵{product.cost.toFixed(2)}</p>
                        )}
                      </div>
                      <div className="text-right">
                        {product.profitMargin !== undefined && (
                          <p className={`text-xs font-medium ${product.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {product.profitMargin.toFixed(1)}%
                          </p>
                        )}
                        {product.lastCosted && (
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="h-3 w-3" />
                            <span>{formatDate(product.lastCosted)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">No costed products found</p>
              <p>Products need to have existing costing data to appear here.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gray-50">
              <div className="flex items-center gap-3">
                <Package className="h-6 w-6 text-blue-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedProduct.name || 'Unnamed Product'}</h2>
                  <p className="text-sm text-gray-500">SKU: {selectedProduct.sku || 'N/A'}</p>
                  {originalCostingData?.lastUpdated && (
                    <p className="text-xs text-gray-400">Last updated: {formatDate(originalCostingData.lastUpdated)}</p>
                  )}
                </div>
                {hasUnsavedChanges && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 rounded-full">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-xs text-yellow-700 font-medium">Unsaved changes</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {hasUnsavedChanges && (
                  <button
                    onClick={resetToOriginal}
                    className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
                  >
                    Reset Changes
                  </button>
                )}
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>

            {loadingCosting ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading existing costing data...</span>
              </div>
            ) : (
              <div className="flex h-full overflow-hidden">
                {/* Main Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Tabs */}
                  <div className="border-b bg-white">
                    <nav className="flex space-x-8 px-6">
                      {['materials', 'overhead'].map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                            activeTab === tab
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {tab} Costs
                        </button>
                      ))}
                    </nav>
                  </div>

                  {/* Tab Content */}
                  <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'materials' && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium text-lg">Materials & Ingredients</h3>
                          <button
                            onClick={addMaterial}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                            Add Material
                          </button>
                        </div>

                        {materials.length === 0 ? (
                          <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
                            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-lg font-medium mb-2">No materials found</p>
                            <p>Add materials to update the product costing.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {materials.map((material) => (
                              <div key={material.id} className="grid grid-cols-12 gap-3 items-center p-4 bg-gray-50 rounded-lg border">
                                <div className="col-span-4">
                                  <input
                                    type="text"
                                    placeholder="Material Name"
                                    value={material.name}
                                    onChange={(e) => updateMaterial(material.id, 'name', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <input
                                    type="number"
                                    placeholder="Qty"
                                    value={material.quantity}
                                    onChange={(e) => updateMaterial(material.id, 'quantity', parseFloat(e.target.value) || 0)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <select
                                    value={material.unit}
                                    onChange={(e) => updateMaterial(material.id, 'unit', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="pcs">Pieces</option>
                                    <option value="kg">Kilograms</option>
                                    <option value="g">Grams</option>
                                    <option value="l">Liters</option>
                                    <option value="ml">Milliliters</option>
                                    <option value="m">Meters</option>
                                  </select>
                                </div>
                                <div className="col-span-2">
                                  <input
                                    type="number"
                                    step="0.01"
                                    placeholder="Unit Cost"
                                    value={material.unitCost}
                                    onChange={(e) => updateMaterial(material.id, 'unitCost', parseFloat(e.target.value) || 0)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                                <div className="col-span-1 text-right font-medium text-green-600">
                                  ₵{material.totalCost.toFixed(2)}
                                </div>
                                <div className="col-span-1 text-right">
                                  <button
                                    onClick={() => removeMaterial(material.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'overhead' && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium text-lg">Overhead Costs</h3>
                          <button
                            onClick={addOverheadCost}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                            Add Overhead
                          </button>
                        </div>

                        {overheadCosts.length === 0 ? (
                          <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
                            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-lg font-medium mb-2">No overhead costs found</p>
                            <p>Add overhead costs to update the product costing.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {overheadCosts.map((overhead) => (
                              <div key={overhead.id} className="grid grid-cols-12 gap-3 items-center p-4 bg-gray-50 rounded-lg border">
                                <div className="col-span-4">
                                  <input
                                    type="text"
                                    placeholder="Cost Name"
                                    value={overhead.name}
                                    onChange={(e) => updateOverheadCost(overhead.id, 'name', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                                <div className="col-span-3">
                                  <select
                                    value={overhead.type}
                                    onChange={(e) => updateOverheadCost(overhead.id, 'type', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="fixed">Fixed Amount</option>
                                    <option value="percentage">% of Materials</option>
                                    <option value="per_unit">Per Unit</option>
                                  </select>
                                </div>
                                <div className="col-span-2">
                                  <input
                                    type="number"
                                    step="0.01"
                                    placeholder="Value"
                                    value={overhead.value}
                                    onChange={(e) => updateOverheadCost(overhead.id, 'value', parseFloat(e.target.value) || 0)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                                <div className="col-span-2 text-right font-medium text-green-600">
                                  ₵{overhead.totalCost.toFixed(2)}
                                </div>
                                <div className="col-span-1 text-right">
                                  <button
                                    onClick={() => removeOverheadCost(overhead.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Cost Summary Sidebar */}
                <div className="w-80 bg-gray-50 border-l overflow-y-auto">
                  <div className="p-6 space-y-6">
                    {/* Cost Summary */}
                    <div className="bg-white rounded-lg shadow-sm border p-6">
                      <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        Updated Cost Summary
                      </h3>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Materials Cost:</span>
                          <span className="font-medium">₵{totalMaterialsCost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Overhead Cost:</span>
                          <span className="font-medium">₵{totalOverheadCost.toFixed(2)}</span>
                        </div>
                        {totalUnitsProduced > 1 && (
                          <div className="flex justify-between text-sm text-gray-500">
                            <span>Units Produced:</span>
                            <span>{totalUnitsProduced} units</span>
                          </div>
                        )}
                        <hr className="border-gray-200" />
                        <div className="flex justify-between text-lg font-semibold">
                          <span>Total Product Cost:</span>
                          <span className="text-blue-600">₵{totalProductCost.toFixed(2)}</span>
                        </div>
                        
                        {selectedProduct.sellingPrice && (
                          <>
                            <hr className="border-gray-200" />
                            <div className="flex justify-between">
                              <span className="text-gray-600">Selling Price:</span>
                              <span className="font-medium">₵{selectedProduct.sellingPrice}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Profit Margin:</span>
                              <span className={`font-medium ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {profitMargin.toFixed(1)}%
                              </span>
                            </div>
                            {profitMargin < 0 && (
                              <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                                <AlertCircle className="h-4 w-4 text-red-600" />
                                <span className="text-sm text-red-600">Negative margin detected</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      <button
                        onClick={handleSaveCosting}
                        disabled={saving || !hasUnsavedChanges}
                        className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        {saving ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        {saving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'No Changes'}
                      </button>
                    </div>

                    {/* Original vs Updated Comparison */}
                    {originalCostingData && (
                      <div className="bg-white rounded-lg shadow-sm border p-6">
                        <h3 className="font-semibold mb-4">Cost Comparison</h3>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Original Total:</span>
                            <span className="font-medium">₵{originalCostingData.totalProductCost?.toFixed(2) || '0.00'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Updated Total:</span>
                            <span className="font-medium">₵{totalProductCost.toFixed(2)}</span>
                          </div>
                          <hr className="border-gray-200" />
                          <div className="flex justify-between">
                            <span className="text-gray-600">Difference:</span>
                            <span className={`font-medium ${
                              totalProductCost - (originalCostingData.totalProductCost || 0) >= 0 
                                ? 'text-red-600' 
                                : 'text-green-600'
                            }`}>
                              {totalProductCost - (originalCostingData.totalProductCost || 0) >= 0 ? '+' : ''}
                              ₵{(totalProductCost - (originalCostingData.totalProductCost || 0)).toFixed(2)}
                            </span>
                          </div>
                          {originalCostingData.profitMargin !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Margin Change:</span>
                              <span className={`font-medium ${
                                profitMargin - originalCostingData.profitMargin >= 0 
                                  ? 'text-green-600' 
                                  : 'text-red-600'
                              }`}>
                                {profitMargin - originalCostingData.profitMargin >= 0 ? '+' : ''}
                                {(profitMargin - originalCostingData.profitMargin).toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Quick Actions */}
                    <div className="bg-white rounded-lg shadow-sm border p-6">
                      <h3 className="font-semibold mb-4">Quick Actions</h3>
                      <div className="space-y-2">
                        <button className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
                          Export Updated Breakdown
                        </button>
                        <button className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
                          View Cost History
                        </button>
                        <button className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
                          Duplicate to New Product
                        </button>
                        {hasUnsavedChanges && (
                          <button 
                            onClick={resetToOriginal}
                            className="w-full text-left px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 rounded-lg"
                          >
                            Discard All Changes
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Change Log */}
                    {hasUnsavedChanges && (
                      <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-800">Unsaved Changes</span>
                        </div>
                        <p className="text-xs text-yellow-700">
                          You have modified the costing data. Remember to save your changes before closing or switching products.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EditProductCosting;