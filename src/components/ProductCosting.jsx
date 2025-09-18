import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  Trash2,
  Calculator,
  Save,
  AlertCircle,
  Package,
  DollarSign,
  X,
} from "lucide-react";
import API from "../api";
import { toast } from "react-toastify";

const ProductCosting = () => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [overheadCosts, setOverheadCosts] = useState([]);
  const [totalQuantity, setTotalQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("materials");
  const [showModal, setShowModal] = useState(false);

  // Initialize component data
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await API.get("/products");
      setProducts(response.data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(
      (product) =>
        product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setShowModal(true);
    // Reset costing data when selecting a new product
    setMaterials([]);
    setOverheadCosts([]);
    setActiveTab("materials");
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedProduct(null);
    setMaterials([]);
    setOverheadCosts([]);
    setActiveTab("materials");
  };

  const addMaterial = () => {
    setMaterials([
      ...materials,
      {
        id: Date.now(),
        name: "",
        quantity: 1,
        unitCost: 0,
        unit: "pcs",
        totalCost: 0,
      },
    ]);
  };

  const updateMaterial = (id, field, value) => {
    setMaterials(
      materials.map((material) => {
        if (material.id === id) {
          const updated = { ...material, [field]: value };
          if (field === "quantity" || field === "unitCost") {
            updated.totalCost = updated.quantity * updated.unitCost;
          }
          return updated;
        }
        return material;
      })
    );
  };

  const removeMaterial = (id) => {
    setMaterials(materials.filter((material) => material.id !== id));
  };

  const addOverheadCost = () => {
    setOverheadCosts([
      ...overheadCosts,
      {
        id: Date.now(),
        name: "",
        type: "fixed", // fixed, percentage, per_unit
        value: 0,
        totalCost: 0,
      },
    ]);
  };

  const updateOverheadCost = (id, field, value) => {
    setOverheadCosts((prevOverheadCosts) => {
      return prevOverheadCosts.map((overhead) => {
        if (overhead.id === id) {
          const updated = { ...overhead, [field]: value };
          if (field === "value" || field === "type") {
            calculateOverheadTotalCost(updated);
          }
          return updated;
        }
        return overhead;
      });
    });
  };

  const removeOverheadCost = (id) => {
    setOverheadCosts(overheadCosts.filter((overhead) => overhead.id !== id));
  };

  const totalMaterialsCost = useMemo(() => {
    return materials.reduce(
      (sum, material) => sum + (material.totalCost || 0),
      0
    );
  }, [materials]);

  // Calculate total units produced (use the totalQuantity input)
  const totalUnitsProduced = useMemo(() => {
    return Math.max(1, totalQuantity);
  }, [totalQuantity]);

  // Helper function to calculate overhead total cost
  const calculateOverheadTotalCost = (overhead) => {
    switch (overhead.type) {
      case "fixed":
        overhead.totalCost = parseFloat(overhead.value) || 0;
        break;
      case "percentage":
        overhead.totalCost =
          (totalMaterialsCost * (parseFloat(overhead.value) || 0)) / 100;
        break;
      case "per_unit":
        overhead.totalCost =
          (parseFloat(overhead.value) || 0) * totalUnitsProduced;
        break;
      default:
        overhead.totalCost = 0;
    }
  };

  const totalOverheadCost = useMemo(() => {
    // Recalculate overhead costs when materials cost changes
    const updatedOverheadCosts = overheadCosts.map((overhead) => {
      const updated = { ...overhead };
      switch (overhead.type) {
        case "fixed":
          updated.totalCost = parseFloat(overhead.value) || 0;
          break;
        case "percentage":
          updated.totalCost =
            (totalMaterialsCost * (parseFloat(overhead.value) || 0)) / 100;
          break;
        case "per_unit":
          updated.totalCost =
            (parseFloat(overhead.value) || 0) * totalUnitsProduced;
          break;
        default:
          updated.totalCost = 0;
      }
      return updated;
    });

    // Update the overhead costs state with recalculated values
    setOverheadCosts((prevOverheadCosts) => {
      const hasChanged = prevOverheadCosts.some(
        (prev, index) =>
          prev.totalCost !== updatedOverheadCosts[index]?.totalCost
      );
      return hasChanged ? updatedOverheadCosts : prevOverheadCosts;
    });

    return updatedOverheadCosts.reduce(
      (sum, overhead) => sum + (overhead.totalCost || 0),
      0
    );
  }, [overheadCosts, totalMaterialsCost, totalUnitsProduced]);

  // Calculate unit cost properly based on overhead types
  const unitCost = useMemo(() => {
    // Materials cost is already per unit (sum of all material costs for one unit)
    const baseMaterialsCostPerUnit = totalMaterialsCost;
    
    // Calculate overhead cost per unit based on type
    let overheadCostPerUnit = 0;
    
    overheadCosts.forEach((overhead) => {
      switch (overhead.type) {
        case "fixed":
          // Fixed costs are spread across production volume (use totalUnitsProduced)
          overheadCostPerUnit += (parseFloat(overhead.value) || 0) / totalUnitsProduced;
          break;
        case "percentage":
          // Percentage costs are based on materials cost per unit
          overheadCostPerUnit += (baseMaterialsCostPerUnit * (parseFloat(overhead.value) || 0)) / 100;
          break;
        case "per_unit":
          // Per-unit costs are already per unit
          overheadCostPerUnit += parseFloat(overhead.value) || 0;
          break;
        default:
          break;
      }
    });
    
    return baseMaterialsCostPerUnit + overheadCostPerUnit;
  }, [totalMaterialsCost, overheadCosts, totalUnitsProduced]);

  const totalProductCost = useMemo(() => {
    return unitCost * totalQuantity;
  }, [unitCost, totalQuantity]);

  const profitMargin = useMemo(() => {
    if (!selectedProduct?.sellingPrice || unitCost === 0) return 0;
    return (
      ((selectedProduct.sellingPrice - unitCost) /
        selectedProduct.sellingPrice) *
      100
    );
  }, [selectedProduct?.sellingPrice, unitCost]);

const handleSaveCosting = async () => {
  if (!selectedProduct) return;

  try {
    setSaving(true);

    // Prepare costing data
    const costingData = {
      productId: selectedProduct.id,
      materials,
      overheadCosts,
      totalMaterialsCost,
      totalOverheadCost,
      totalProductCost,
      unitCost,
      profitMargin,
      totalQuantity,
      lastUpdated: new Date().toISOString(),
    };

    console.log("Sending costing data:", costingData);

    // Save costing → this will trigger updates to products & inventory in the DB
    await API.post(`/costed/${selectedProduct.id}/costing`, costingData);

    // ✅ Refresh product from backend after trigger has updated it
    const updatedProduct = await API.get(`/products/${selectedProduct.id}`);

    // Update local state
    setSelectedProduct(updatedProduct.data);

    toast.success("Costing saved successfully!");
  } catch (error) {
    console.error("Error saving costing:", error);
    toast.error("Error saving costing. Please try again.");
  } finally {
    setSaving(false);
  }
};

  const resetCosting = () => {
    setMaterials([]);
    setOverheadCosts([]);
    setTotalQuantity(1);
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
          <Calculator className="h-6 w-6 text-blue-600" />
          Product Costing
        </h1>

        {/* Product Selection */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search products by name or SKU..."
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
                    <p className="font-medium text-sm text-gray-900">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                    {product.sellingPrice && (
                      <p className="text-xs text-green-600 font-medium">
                        Price: ₵{product.sellingPrice}
                      </p>
                    )}
                    {product.cost && (
                      <p className="text-xs text-blue-600 font-medium">
                        Unit Cost: ₵{product.cost.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gray-50">
              {/* Product Info */}
              <div className="flex items-center gap-4">
                <Package className="h-8 w-8 text-blue-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedProduct.name}
                  </h2>
                  <p className="text-sm text-gray-500">
                    SKU: {selectedProduct.sku}
                  </p>
                  {unitCost > 0 && (
                    <p className="text-sm text-blue-600 font-medium">
                      Current Unit Cost: ₵{unitCost.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>

              {/* Quantity Input + Actions */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="quantity"
                    className="text-sm font-medium text-gray-700"
                  >
                    Production Quantity
                  </label>
                  <input
                    id="quantity"
                    type="number"
                    min="1"
                    value={totalQuantity}
                    onChange={(e) => setTotalQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-24 px-3 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <button
                  onClick={resetCosting}
                  className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                >
                  Reset Costing
                </button>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex h-full overflow-hidden">
              {/* Main Content Area */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Tabs */}
                <div className="border-b bg-white">
                  <nav className="flex space-x-8 px-6">
                    {["materials", "overhead"].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                          activeTab === tab
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        {tab} Costs
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {activeTab === "materials" && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium text-lg">
                          Materials & Ingredients
                        </h3>
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
                          <p className="text-lg font-medium mb-2">
                            No materials added yet
                          </p>
                          <p>
                            Click "Add Material" to get started with your
                            product costing.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {materials.map((material) => (
                            <div
                              key={material.id}
                              className="grid grid-cols-12 gap-3 items-center p-4 bg-gray-50 rounded-lg border"
                            >
                              <div className="col-span-4">
                                <input
                                  type="text"
                                  placeholder="Material Name (e.g., Flour, Steel, Fabric)"
                                  value={material.name}
                                  onChange={(e) =>
                                    updateMaterial(
                                      material.id,
                                      "name",
                                      e.target.value
                                    )
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div className="col-span-2">
                                <input
                                  type="number"
                                  placeholder="Qty"
                                  value={material.quantity}
                                  onChange={(e) =>
                                    updateMaterial(
                                      material.id,
                                      "quantity",
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div className="col-span-2">
                                <select
                                  value={material.unit}
                                  onChange={(e) =>
                                    updateMaterial(
                                      material.id,
                                      "unit",
                                      e.target.value
                                    )
                                  }
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
                                  onChange={(e) =>
                                    updateMaterial(
                                      material.id,
                                      "unitCost",
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
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

                  {activeTab === "overhead" && (
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
                          <p className="text-lg font-medium mb-2">
                            No overhead costs added yet
                          </p>
                          <p>
                            Add labor, utilities, and other indirect costs to
                            your product.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {overheadCosts.map((overhead) => (
                            <div
                              key={overhead.id}
                              className="grid grid-cols-12 gap-3 items-center p-4 bg-gray-50 rounded-lg border"
                            >
                              <div className="col-span-4">
                                <input
                                  type="text"
                                  placeholder="Cost Name (e.g., Labor, Utilities)"
                                  value={overhead.name}
                                  onChange={(e) =>
                                    updateOverheadCost(
                                      overhead.id,
                                      "name",
                                      e.target.value
                                    )
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div className="col-span-3">
                                <select
                                  value={overhead.type}
                                  onChange={(e) =>
                                    updateOverheadCost(
                                      overhead.id,
                                      "type",
                                      e.target.value
                                    )
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="fixed">Fixed Amount</option>
                                  <option value="percentage">
                                    % of Materials
                                  </option>
                                  <option value="per_unit">Per Unit</option>
                                </select>
                              </div>
                              <div className="col-span-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="Value"
                                  value={overhead.value}
                                  onChange={(e) =>
                                    updateOverheadCost(
                                      overhead.id,
                                      "value",
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div className="col-span-2 text-right font-medium text-green-600">
                                ₵{overhead.totalCost.toFixed(2)}
                              </div>
                              <div className="col-span-1 text-right">
                                <button
                                  onClick={() =>
                                    removeOverheadCost(overhead.id)
                                  }
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
                      Cost Summary
                    </h3>

                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Materials Cost:</span>
                        <span className="font-medium">
                          ₵{totalMaterialsCost.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Overhead Cost:</span>
                        <span className="font-medium">
                          ₵{totalOverheadCost.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Production Quantity:</span>
                        <span>{totalQuantity} units</span>
                      </div>
                      <hr className="border-gray-200" />
                      <div className="flex justify-between text-lg font-semibold">
                        <span>Unit Cost:</span>
                        <span className="text-blue-600">
                          ₵{unitCost.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Total Cost ({totalQuantity} units):</span>
                        <span>₵{totalProductCost.toFixed(2)}</span>
                      </div>

                      {selectedProduct.sellingPrice && (
                        <>
                          <hr className="border-gray-200" />
                          <div className="flex justify-between">
                            <span className="text-gray-600">
                              Selling Price:
                            </span>
                            <span className="font-medium">
                              ₵{selectedProduct.sellingPrice}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">
                              Profit per Unit:
                            </span>
                            <span
                              className={`font-medium ${
                                selectedProduct.sellingPrice - unitCost >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              ₵{(selectedProduct.sellingPrice - unitCost).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">
                              Profit Margin:
                            </span>
                            <span
                              className={`font-medium ${
                                profitMargin >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {profitMargin.toFixed(1)}%
                            </span>
                          </div>
                          {profitMargin < 0 && (
                            <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                              <AlertCircle className="h-4 w-4 text-red-600" />
                              <span className="text-sm text-red-600">
                                Negative margin detected
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <button
                      onClick={handleSaveCosting}
                      disabled={saving || unitCost === 0}
                      className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      {saving ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {saving ? "Saving..." : "Save Costing"}
                    </button>
                  </div>

                  {/* Quick Actions */}
                  <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h3 className="font-semibold mb-4">Quick Actions</h3>
                    <div className="space-y-2">
                      <button className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
                        Export Cost Breakdown
                      </button>
                      <button className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
                        Copy from Similar Product
                      </button>
                      <button className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
                        View Cost History
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCosting;