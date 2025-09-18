import React, { useState, useEffect } from "react";
import API from "../api.js";
import ProductCard from "./ProductCard";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaTrashAlt, FaSearch } from "react-icons/fa";

const AddPurchaseOrder = ({ onPurchaseOrderAdded }) => {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [date, setDate] = useState(() => {
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
      now.getDate()
    )}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  });
  const [selectedSupplierId, setSelectedSupplierId] = useState(null); // Track the selected supplier for the order

  // Fetch products and suppliers
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsResponse, suppliersResponse] = await Promise.all([
          API.get("/products"),
          API.get("/suppliers"),
        ]);

        setProducts(productsResponse.data);
        setSuppliers(suppliersResponse.data);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to fetch data. Please try again.");
      }
    };

    fetchData();
  }, []);

  const formatDateTime = (input) => {
    const date = new Date(input);
    const pad = (n) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
      date.getSeconds()
    )}`;
  };

  const addProduct = (product) => {
    if (selectedProducts.some((p) => p.id === product.id)) {
      toast.error("Product already added.");
      return;
    }

    // If this is the first product being added and no supplier is selected yet,
    // use the first supplier as default
    if (
      selectedProducts.length === 0 &&
      !selectedSupplierId &&
      suppliers.length > 0
    ) {
      setSelectedSupplierId(suppliers[0].id);
    }

    // Add product with the currently selected supplier
    setSelectedProducts([
      ...selectedProducts,
      {
        ...product,
        quantity: 1,
        supplier_id:
          selectedSupplierId || (suppliers.length > 0 ? suppliers[0].id : null),
        supplierName: getSupplierName(
          selectedSupplierId || (suppliers.length > 0 ? suppliers[0].id : null)
        ),
      },
    ]);
  };

  const getSupplierName = (supplierId) => {
    if (!supplierId) return "No Supplier";
    const supplier = suppliers.find((s) => s.id === supplierId);
    return supplier
      ? supplier.business_name || supplier.name
      : "Unknown Supplier";
  };

  const removeProduct = (productId) => {
    setSelectedProducts(
      selectedProducts.filter((product) => product.id !== productId)
    );

    // If we removed the last product, reset the selected supplier
    if (selectedProducts.length === 1) {
      setSelectedSupplierId(null);
    }
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity < 0) {
      toast.error("Quantity must be at least 1.");
      return;
    }
    setSelectedProducts((prev) =>
      prev.map((product) =>
        product.id === productId
          ? { ...product, quantity: parseFloat(quantity) }
          : product
      )
    );
  };

  const updateSupplierForAll = (supplierId) => {
    setSelectedSupplierId(supplierId);

    // Update all products with the new supplier
    setSelectedProducts((prev) =>
      prev.map((product) => ({
        ...product,
        supplier_id: supplierId,
        supplierName: getSupplierName(supplierId),
      }))
    );
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e, status = "pending") => {
    e.preventDefault();

    if (selectedProducts.length === 0) {
      toast.error("Please select at least one product.");
      return;
    }

    // Validate all products have a supplier
    if (!selectedSupplierId) {
      toast.error("Please select a supplier for this order.");
      return;
    }

    setIsSubmitting(true);

    try {
      const totalAmount = selectedProducts.reduce(
        (total, product) => total + product.cp * product.quantity,
        0
      );

      const refNum = referenceNumber || `PUR-${Date.now()}`;

      // Create purchase order
      const response = await API.post("/purchase_orders", {
        reference_number: refNum,
        date: formatDateTime(date),
        supplier_id: selectedSupplierId,
        total_amount: totalAmount,
        items: selectedProducts.map((product) => ({
          product_id: product.id,
          quantity: product.quantity,
          unit_price: product.cp,
        })),
      });

      // Update status if marked as received
      if (status === "received") {
        await API.patch(`/purchase_orders/${response.data.id}/order_status`, {
          order_status: "received",
          reference_number: refNum,
        });
        toast.success("Purchase Order added and marked as received!");
      } else {
        toast.success("Purchase Order added successfully!");
      }

      // Reset form
      setReferenceNumber("");
      setSelectedProducts([]);
      setSelectedSupplierId(null);
      if (onPurchaseOrderAdded) onPurchaseOrderAdded(response.data);
    } catch (error) {
      console.error("Error adding purchase order:", error);
      toast.error("Failed to add purchase order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 bg-white shadow-md rounded-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Add Purchase Order
      </h2>
      <ToastContainer />

      <div className="grid grid-cols-8 gap-8">
        {/* Products List */}
        <div className="col-span-5 max-h-[calc(100vh-200px)] overflow-y-auto pr-4">
          <div className="flex items-center mb-4 gap-4 justify-between">
            <div className=" border border-gray-300 rounded-lg shadow-sm flex flex-grow items-center px-2">
              <FaSearch className="text-gray-400 items-center" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 ml-2 sm:text-sm focus:outline-none focus:ring-0 focus:border-transparent"
              />
            </div>

            <div className="border p-2 rounded-lg">
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="focus:outline-none focus:ring-0 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <div key={product.id} onClick={() => addProduct(product)}>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>

        {/* Selected Products */}
        <div className="col-span-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Selected Products</h2>
            <input
              type="text"
              placeholder="Reference Number"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {/* Supplier selection for the entire order */}
          {selectedProducts.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order Supplier
              </label>
              <select
                value={selectedSupplierId || ""}
                onChange={(e) => updateSupplierForAll(parseInt(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Select Supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.business_name || supplier.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedProducts.length === 0 ? (
            <p className="text-gray-600">No products selected.</p>
          ) : (
            <div className="space-y-4">
              {selectedProducts.map((product) => (
                <div key={product.id} className="border-b py-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-medium">{product.name}</h3>
                      <p className="text-sm text-gray-600">₵{product.cp}</p>
                      <p className="text-xs text-gray-500">
                        {product.supplierName}
                      </p>
                    </div>
                    <button
                      onClick={() => removeProduct(product.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      <FaTrashAlt />
                    </button>
                  </div>

                  <div className="mt-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      value={product.quantity}
                      onChange={(e) =>
                        updateQuantity(product.id, e.target.value)
                      }
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-4 mt-6">
        <button
          onClick={(e) => handleSubmit(e, "received")}
          disabled={isSubmitting}
          className={`w-full py-2 px-4 text-sm font-medium rounded-md text-white ${
            isSubmitting ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isSubmitting ? "Processing..." : "Submit & Receive"}
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`w-full py-2 px-4 text-sm font-medium rounded-md text-white ${
            isSubmitting ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {isSubmitting ? "Processing..." : "Submit Order"}
        </button>
      </div>
    </div>
  );
};

export default AddPurchaseOrder;
