import React, { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import { FiSearch } from "react-icons/fi";
import { FaShoppingCart, FaTrash } from "react-icons/fa";
import { useCart } from "../CartContext";
import API from "../api.js";
import { toast } from "react-toastify";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import Invoice from "./Invoice";
import "react-toastify/dist/ReactToastify.css";
import { useUser } from "./AuthContext";
function Shop({ companyName, companyAddress, email, phone }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDraft, setShowDraft] = useState(true);
  const [showProcessSaleModal, setShowProcessSaleModal] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [showCompleteSale, setShowCompleteSale] = useState(true);
  const [showInvoicePrint, setShowInvoicePrint] = useState(false);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [taxes, setTaxes] = useState([]);
  const [taxRates, setTaxRates] = useState([]);
  const [selectedTaxes, setSelectedTaxes] = useState([]);
  const [discountType, setDiscountType] = useState("percentage");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [customerGroups, setCustomerGroups] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [error, setError] = useState("");
  const [showInvoice, setShowInvoice] = useState(false);
  const [saleComplete, setSaleComplete] = useState(false);
  const [refNum, setRefNum] = useState("");
  const [documents, setDocuments] = useState([]); // State to handle documents
  const [newDocument, setNewDocument] = useState(""); // State for new document input
  const [showClearCart, setShowClearCart] = useState(false);
  const { user } = useUser();
  const { cart, addToCart, setCart, clearCart, processSale } = useCart();
  const [customerLocked, setCustomerLocked] = useState(false);

  const fetchProducts = async () => {
    try {
      const response = await API.get("/products", {
        timeout: 5000,
      });
      setProducts(response.data);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      toast.error(error.response.data.error|| "Failed to fetch products. Please try again.");
    }
  };

  const handleTaxChange = (index, value) => {
    const newTaxes = [...selectedTaxes];
    newTaxes[index] = value;
    setSelectedTaxes(newTaxes);
  };

  const addTax = () => {
    if (selectedTaxes.length < taxes.length) {
      setSelectedTaxes([...selectedTaxes, ""]); // Add an empty tax selection
    }
  };

  const removeTax = (index) => {
    setSelectedTaxes(selectedTaxes.filter((_, i) => i !== index));
  };

  useEffect(() => {
    fetchProducts();
  }, [saleComplete]);

  useEffect(() => {
    const fetchTaxes = async () => {
      try {
        const response = await API.get("/taxes");
        setTaxes(response.data);
        setTaxRates(response.data);
      } catch (err) {
        console.error("Error fetching taxes:", err);
        setError("Failed to fetch tax data. Please try again.");
      }
    };

    fetchTaxes();
  }, []); // Runs only once when the component mounts

  const filteredProducts = products.filter(
    (product) =>
      product &&
      product.name &&
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const handleRemoveFromCart = (itemToRemove) => {
    setCart((prevCart) =>
      prevCart.filter((item) => item.product.id !== itemToRemove.product.id)
    );
    toast.info(`${itemToRemove.product.name} removed from cart`);
  };

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setError("");
  };

const handleAddToCart = () => {
    // Add validation for customer selection
    if (!selectedCustomer) {
      setError("Please select a customer before adding to cart");
      return;
    }

    if (!selectedProduct) {
      setError("No product selected");
      return;
    }

    if (!quantity || quantity < 0) {
      setError("Please enter a valid quantity");
      return;
    }

    if (quantity > selectedProduct.stock) {
      setError("Quantity exceeds available stock");
      return;
    }

    if (!sellingPrice || sellingPrice <= 0) {
      setError("Please enter a valid selling price");
      return;
    }

    if (!selectedTaxes || selectedTaxes.length === 0) {
      setError("Please select at least one tax option");
      return;
    }

    // Set customer lock only if this is the first item being added to cart
    if (cart.length === 0 && selectedCustomer) {
      setCustomerLocked(true);
    }

    addToCart(
      selectedProduct,
      quantity,
      sellingPrice,
      selectedTaxes,
      discountType,
      discountAmount,
      description
    );

    // Clear form state and close modal
    setSelectedProduct(null);
    setQuantity(1);
    setSellingPrice("");
    setSelectedTaxes([""]);
    setDiscountType("percentage");
    setDiscountAmount(0);
    setDescription("");
    setError("");

    // Toast notification
    toast.success(`${selectedProduct.name} added to cart`);
  };

  const handleAddNewItem = (product, quantity) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find(
        (item) => item.product.id === product.id
      );
      if (existingItem) {
        // Update quantity if product already exists
        return prevCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      // Add new item to the cart
      return [...prevCart, { product, quantity }];
    });
    toast.success(`${product.name} added to cart`);
  };
  const [editDraftId, setEditDraftId] = useState(null);
  const calculateTotal = () => {
    let actualSubtotal = 0; // Total before any discounts
    let subtotal = 0; // Total after discounts
    let totalTax = 0;
    let totalDiscount = 0;
    const taxBreakdown = {};

    cart.forEach((item) => {
      // Calculate item total before discount
      const itemActualTotal = item.sellingPrice * item.quantity;
      actualSubtotal += itemActualTotal;

      // Calculate discount
      const discount =
        item.discountType == "percentage"
          ? (itemActualTotal * item.discountAmount) / 100
          : item.discountAmount;
      totalDiscount += discount;

      let itemTotal = itemActualTotal - discount; // Default to exclusive tax scenario
      let itemTotalTax = 0;

      // Process each tax in the taxes array
      item.taxes.forEach((taxId) => {
        const tax = taxRates.find((t) => t.id == taxId);
        if (!tax) {
          console.log("not found");
          return;
        } // Skip if tax is not found

        const { tax_name: taxName, tax_rate: taxRate, tax_type: taxType } = tax;

        let itemTax = 0;
        if (taxType === "exclusive") {
          // Tax is added to the item total after discount
          itemTax = (itemTotal * taxRate) / 100;
        } else if (taxType === "inclusive") {
          // Tax is included in the selling price, extract it
          itemTax = itemTotal - itemTotal / (1 + taxRate / 100);
          itemTotal -= itemTax; // Adjust item total to exclude tax
        }

        itemTotalTax += itemTax;

        // Add tax breakdown for each tax type
        if (taxBreakdown[taxName]) {
          taxBreakdown[taxName] += itemTax;
        } else {
          taxBreakdown[taxName] = itemTax;
        }
      });

      totalTax += itemTotalTax;
      subtotal += itemTotal;
    });

    return {
      actualSubtotal,
      subtotal,
      totalDiscount,
      totalTax,
      grandTotal: subtotal + totalTax,
      taxBreakdown,
    };
  };

  // Use the updated function to calculate totals
  const {
    subtotal,
    actualSubtotal,
    totalTax,
    grandTotal,
    totalDiscount,
    taxBreakdown,
  } = calculateTotal();

  // Utility function to generate a unique reference number
  const generateReferenceNumber = () => {
    const uniqueNumber = Date.now() + Math.floor(Math.random() * 1000000);
    return `REF ${uniqueNumber}`;
  };

  const handleQuantityChangeNew = (e, item, index) => {
    const updatedQuantity = Math.min(
      Number(e.target.value),
      item.product.quantity_in_stock
    );

    setCart((prevCart) => {
      const updatedCart = [...prevCart];
      updatedCart[index] = {
        ...updatedCart[index],
        quantity: updatedQuantity,
        // Preserve additional attributes
        sellingPrice: item.sellingPrice,
        tax: item.tax,
        discountType: item.discountType,
        discountAmount: item.discountAmount,
        description: item.description,
      };
      return updatedCart;
    });
  };
  const generateInvoicePDF = () => {
    const invoiceElement = document.getElementById("invoice");
    html2canvas(invoiceElement, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const imgWidth = 210; // A4 size width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width; // Maintain aspect ratio

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`Invoice_${refNum}.pdf`); // Save the invoice as a PDF file
    });
  };

  useEffect(() => {
    if (selectedProduct) {
      setSellingPrice(selectedProduct.sp);
    }
  }, [selectedProduct]);

  const handleCompleteSale = async (customer_id, paymentMethod, date) => {
    setIsSubmitting(true);
    setShowInvoicePrint(true);
    try {
      const referenceNumber = refNum;
      const response = await processSale(
        referenceNumber,
        customer_id,
        paymentMethod,
        date
      );
console.log("customer_id:",customer_id)
      // Check response status (now properly formatted)
      if (response.status === 200 || response.status === 201) {
        setSaleComplete(!saleComplete);
        generateInvoicePDF();
        setCustomerLocked(false); // Reset customer lock
        setShowInvoicePrint(false);
        setShowInvoice(false);
        clearCart();
        toast.success(response.message || "Sale completed successfully!");
      } else {
        // Handle error response from processSale
        toast.error(
          response.message || "An error occurred while processing the sale."
        );
      }
    } catch (error) {
      console.error("Error completing sale:", error);
      toast.error(error.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInvoice = async () => {
    // First show the invoice print view
    setShowInvoicePrint(true);

    // Use a small timeout to ensure the DOM has updated
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Now generate the PDF
    generateInvoicePDF();

    // Reset the states
    setShowInvoicePrint(false);
    setShowInvoice(false);
    toast.success("Invoice Generated successfully!");
  };

  const handleSaveDraft = async () => {
    const draft = {
      referenceNumber: refNum, // Unique reference number for the draft
      details: cart.map((item) => ({
        product_id: item.product.id, // Use product ID
        quantity: item.quantity,
        sellingPrice: item.sellingPrice, // Selling price of the product
        taxes: Array.isArray(item.taxes) ? item.taxes : [], // Ensure taxes is an array
        discountType: item.discountType, // Type of discount (e.g., fixed, percentage)
        discountAmount: item.discountAmount, // Amount of discount
        description: item.description, // Optional description for the item
      })),
      date: new Date().toISOString(), // Use ISO 8601 format for date
      status: "pending", // Default status for the draft
    };
    setLoading(true);
    try {
      const response = await API.post("/drafts", draft); // Using Axios

      if (response.status === 201) {
        // Successfully saved draft
        setShowInvoice(false); // Close the invoice modal
        clearCart(); // Clear the cart after saving the draft
        setCustomerLocked(false); // Reset customer lock
        toast.success("Draft saved successfully!");
      } else {
        // Handle any issues with the response
        toast.error("Failed to save draft. Please try again.");
      }
    } catch (error) {
      // Handle errors (e.g., network or server errors)
      console.error("Error saving draft:", error);
      toast.error("An error occurred while saving the draft.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setRefNum(generateReferenceNumber());
  }, []);
  useEffect(() => {
    setRefNum(generateReferenceNumber());
  }, [showInvoice]);

  // Fetch customer groups from the backend
  const fetchCustomers = async () => {
    try {
      const response = await API.get("/customers");
      setCustomers(response.data);
    } catch (error) {
      toast.error("Error fetching customers.");
      console.error("Error fetching customers:", error);
    }
  };

  const fetchCustomerGroups = async () => {
    try {
      const response = await API.get("/customer_groups");
      setCustomerGroups(response.data);
    } catch (error) {
      console.error("Error fetching customer groups:", error);
    }
  };
  const [discountManuallySet, setDiscountManuallySet] = useState(false);
  useEffect(() => {
    fetchCustomerGroups();
    fetchCustomers();
  }, []);

  // Add this useEffect to your component
  useEffect(() => {
    if (selectedProduct && selectedCustomer) {
      // Only proceed if we have both a product and a customer
      if (selectedCustomer.customer_group) {
        const customerGroup = customerGroups.find(
          (g) => g.group_name === selectedCustomer.customer_group
        );

        if (customerGroup) {
          // Apply the group's taxes
          setSelectedTaxes(customerGroup.taxes.map((t) => t.id));

          // Apply the group's discount (only if not manually overridden)
          if (!discountManuallySet) {
            // Add this state if you want to track manual changes
            setDiscountAmount(customerGroup.discount);
            setDiscountType(customerGroup.discount_type);
          }
        }
      }
    }
  }, [selectedProduct]); // Run whenever selectedProduct changes

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-8rem)]">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="relative max-h-[calc(100vh-100px)] overflow-y-scroll">
      {/* Search and Cart UI */}
      <div className="sticky top-0 z-50 p-4 bg-gray-900 shadow-md">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          {/* Left side - Date Picker */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate || new Date().toISOString().split("T")[0]}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-gray-800 text-gray-300 border border-gray-700 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="hidden md:inline text-gray-400">
              {selectedDate
                ? new Date(selectedDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
            </span>
          </div>

          {/* Center - Search */}
          <div className="relative w-full sm:w-[70%] md:w-[50%] lg:w-[40%]">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <FiSearch className="h-5 w-5" />
            </span>
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full py-2 pl-10 pr-4 outline-none text-gray-800 rounded-full focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Right side - Cart */}
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-300 md:hidden">
              {selectedDate
                ? new Date(selectedDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : new Date().toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
            </div>
            <div className="relative">
              <FaShoppingCart
                className="text-2xl text-gray-300 hover:text-white cursor-pointer transition-colors"
                onClick={() => {
                  if (cart.length === 0)
                    return toast.info("Your cart is empty");
                  setShowInvoice(true);
                  setShowClearCart(true);
                }}
              />
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                  {cart.length}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-y-auto p-4 pl-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => {
                  handleProductClick(product);
                }}
              >
                <ProductCard product={product} />
              </div>
            ))
          ) : (
            <div>No products found</div>
          )}
        </div>
      </div>
      {/* Product Details Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 w-[90%] sm:w-[60%] md:w-[50%] lg:w-[40%]">
            {/* Modal Header */}
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              {selectedProduct.name}
            </h2>
            {/* Selling Price and Quantity */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Selling Price */}
              <div>
                <label
                  htmlFor="sellingPrice"
                  className="block font-medium text-gray-700"
                >
                  Selling Price (₵):
                </label>
                <input
                  id="sellingPrice"
                  type="number"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(parseFloat(e.target.value))}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  min="0"
                  step="0.01"
                  disabled={user?.role !== "admin"}
                />
              </div>

              {/* Quantity */}
              <div>
                <label
                  htmlFor="quantity"
                  className="block font-medium text-gray-700"
                >
                  Quantity:
                </label>
                <input
                  id="quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => {
                    const enteredQuantity = parseFloat(e.target.value);
                    const validQuantity = Math.min(
                      enteredQuantity,
                      selectedProduct.quantity_in_stock
                    );
                    setQuantity(validQuantity);
                  }}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  min="1"
                  max={selectedProduct.quantity_in_stock}
                  step="0.1"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Available stock: {selectedProduct.quantity_in_stock}
                </p>
              </div>
            </div>
            {user && (
              <>
                {/* Customer Selection */}
                <div className="mb-4">
                  <label className="block font-medium text-gray-700 mb-2">
                    Select Customer:
                  </label>
                  <select
                    value={selectedCustomer?.id || ""}
                    onChange={(e) => {
                      if (customerLocked) {
                        toast.info(
                          "Customer cannot be changed after adding items to cart. Please start a new sale for a different customer."
                        );
                        return;
                      }

                      const customerId = parseInt(e.target.value);
                      const customer = customers.find(
                        (c) => c.id === customerId
                      );
                      setSelectedCustomer(customer);

                      // Reset discount and taxes when changing customer
                      setDiscountAmount(0);
                      setDiscountType("percentage");
                      setSelectedTaxes([]);

                      if (customer && customer.customer_group) {
                        const customerGroup = customerGroups.find(
                          (g) => g.group_name === customer.customer_group
                        );

                        if (customerGroup) {
                          // Set the taxes from the group
                          const newTaxes = customerGroup.taxes.map((t) => t.id);
                          setSelectedTaxes(newTaxes);

                          // Set the discount from the group
                          setDiscountAmount(customerGroup.discount);
                          setDiscountType(customerGroup.discount_type);
                        }
                      }
                    }}
                    className={`w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                      customerLocked ? "bg-gray-100 cursor-not-allowed" : ""
                    }`}
                    disabled={customerLocked}
                  >
                    <option value="">Select Customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name || customer.business_name} (
                        {customer.customer_type})
                      </option>
                    ))}
                  </select>
                  {customerLocked && (
                    <p className="text-sm text-blue-600 mt-1">
                      Customer locked for this order. Start a new sale to change
                      customer.
                    </p>
                  )}
                </div>
              </>
            )}{" "}
            {/* Description */}
            <div className="mb-6">
              <label
                htmlFor="description"
                className="block font-medium text-gray-700"
              >
                Description:
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                rows="3"
                placeholder="Enter additional details..."
              />
            </div>
            {/* Error Message */}
            {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
            {/* Action Buttons */}
            <div className="flex justify-between items-center space-x-4 mt-8">
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-600"
              >
                Close
              </button>
              <button
                onClick={handleAddToCart}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      <Invoice
        refNum={refNum}
        handleInvoice={handleInvoice}
        showInvoice={showInvoice}
        setShowInvoice={setShowInvoice}
        showDraft={showDraft}
        showCompleteSale={showCompleteSale}
        editDraftId={editDraftId}
        handleSaleDraft={handleCompleteSale}
        handleQuantityChangeNew={handleQuantityChangeNew}
        handleRemoveFromCart={handleRemoveFromCart}
        handleSaveDraft={handleSaveDraft}
        handleAddNewItem={handleAddNewItem}
        documents={documents}
        setDocuments={setDocuments}
        newDocument={newDocument}
        setNewDocument={setDocuments}
        showClearCart={showClearCart}
        setShowClearCart={setShowClearCart}
        companyName={companyName}
        setCustomerLocked={setCustomerLocked}
        selectedCustomer={selectedCustomer}
        email={email}
        phone={phone}
        companyAddress={companyAddress}
        handleTaxChange={handleTaxChange}
        addTax={addTax}
        removeTax={removeTax}
        loading={loading}
        setLoading={setLoading}
        date={selectedDate}
        setSelectedDate={setSelectedDate}
        isSubmitting={isSubmitting}
      />
      {showInvoicePrint && (
        <div id="invoice" className="p-6 bg-white rounded-lg shadow-md">
          <div className="border-b pb-4 mb-4 flex justify-between items-start">
            {/* Left Section - Company Details */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-blue-600 mb-1">
                {companyName || "Company Name"}
              </h1>
              <p className="text-sm text-gray-600">
                {companyAddress || "123 Business St, City, Country"}
              </p>
              <p className="text-sm text-gray-600">
                Email: {email || "support@company.com"} | Phone:{" "}
                {phone || "(123) 456-7890"}
              </p>
              <h2 className="text-lg font-semibold mt-4">Invoice</h2>
              <p className="text-sm text-gray-600">
                Reference Number: <span className="font-medium">{refNum}</span>
              </p>
              <p className="text-sm text-gray-600">
                Date:{" "}
                <span className="font-medium">
                  {selectedDate
                    ? new Date(selectedDate).toLocaleDateString("en-US")
                    : new Date().toLocaleDateString("en-US")}
                </span>
              </p>
            </div>

            {/* Right Section - Company Logo */}
            <div>
              <img
                src={"images/logo.png"}
                alt="Company Logo"
                className="h-16 w-auto"
              />
            </div>
          </div>

          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">Product</th>
                <th className="border p-2">Quantity</th>
                <th className="border p-2">Price</th>
                <th className="border p-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item, index) => (
                <tr key={index} className="text-center">
                  <td className="border p-2">{item.product.name}</td>
                  <td className="border p-2">{item.quantity}</td>
                  <td className="border p-2">
                    ₵{item.sellingPrice.toFixed(2)}
                  </td>
                  <td className="border p-2">
                    ₵{(item.quantity * item.sellingPrice).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="w-full] ">
            <div className="mt-12">
              {/* Actual Subtotal */}
              <div className="flex justify-between">
                <span className="font-semibold text-gray-700">Item Total:</span>
                <span>₵{actualSubtotal.toFixed(2)}</span>
              </div>

              {/* Discount */}
              <div className="flex justify-between mt-2">
                <span className="font-semibold text-gray-700">Discount:</span>
                <span>₵{totalDiscount.toFixed(2)}</span>
              </div>

              {/* Subtotal After Discount */}
              <div className="flex justify-between mt-2">
                <span className="font-semibold text-gray-700">Sub Total:</span>
                <span>₵{subtotal.toFixed(2)}</span>
              </div>

              {/* Taxes Breakdown */}
              <div className="mt-2">
                <h3 className="font-semibold text-gray-700">Taxes:</h3>
                <ul className="mt-1 space-y-1">
                  {Object.entries(taxBreakdown).map(
                    ([taxName, amount], index) => (
                      <li key={index} className="flex justify-between text-xs">
                        <span>{taxName}:</span>
                        <span>₵{amount.toFixed(2)}</span>
                      </li>
                    )
                  )}
                </ul>
              </div>

              {/* Total Tax */}
              <div className="flex justify-between mt-2">
                <span className="font-semibold text-gray-700">Total Tax:</span>
                <span>₵{totalTax.toFixed(2)}</span>
              </div>

              {/* Grand Total */}
              <div className="flex justify-between mt-1 border-t pt-2">
                <span className="font-semibold text-lg">Grand Total:</span>
                <span className="text-xl font-bold">
                  ₵{grandTotal.toFixed(2)}
                </span>
              </div>

              {/* Note for Inclusive Tax */}
              {totalTax > 0 && (
                <div className="mt-2 text-sm text-gray-600">
                  <p>
                    <em>
                      Note: Taxes shown above are{" "}
                      {Object.values(taxBreakdown).some((amount) => amount > 0)
                        ? "calculated based on the tax type (inclusive or exclusive) applied to the items."
                        : "inclusive of the item prices where applicable."}
                    </em>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>
        {`
          @media print {
            .print-only {
              display: none;
            }
          }
        `}
      </style>
    </div>
  );
}

export default Shop;
