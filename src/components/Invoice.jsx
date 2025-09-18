import React, { useState, useEffect } from "react";
import API from "../api.js";
import { useCart } from "../CartContext.js";
import { FaEye, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";
import { AiOutlinePlus, AiOutlineMinus } from "react-icons/ai";
import { useAuth } from "./AuthContext";

function Invoice({
  showInvoice,
  showDraft,
  setShowInvoice,
  handleQuantityChangeNew,
  handleInvoice,
  handleRemoveFromCart,
  handleSaveDraft,
  companyAddress,
  handleAddNewItem,
  companyName,
  date,
  setSelectedDate,
  refNum,
  email,
  phone,
  documents,
  setDocuments,
  handleSaleDraft,
  isSubmitting,
  showClearCart,
  loading: load,
  setShowClearCart,
  setCustomerLocked,
  selectedCustomer
}) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("credit");
  const [taxRates, setTaxRates] = useState([]);
  const { cart, setCart, clearCart } = useCart();
  const [customers, setCustomers] = useState([]);
  // const [selectedCustomer, setSelectedCustomer] = useState(1);
  const [sellingPrice, setSellingPrice] = useState(0); // Selling price
  const [selectedTaxes, setSelectedTaxes] = useState([""]); // Tax
  const [discountType, setDiscountType] = useState("percentage"); // Discount type
  const [discountAmount, setDiscountAmount] = useState(0); // Discount amount
  const [description, setDescription] = useState(""); // Description
  const [error, setError] = useState(""); // Error handling
  const [showModal, setShowModal] = useState(false);

  const [taxes, setTaxes] = useState([]);
  const { user } = useAuth();
  // Fetch customers from the database
  const fetchCustomers = async () => {
    try {
      const response = await API.get("/customers", {
        timeout: 5000,
      });
      setCustomers(response.data);
      console.log("customer's data : ", response.data)
    } catch (error) {
      toast.error("Failed to fetch customers. Please try again.");
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Fetch taxes
  const fetchTaxes = async () => {
    try {
      const response = await API.get("/taxes", {
        timeout: 5000,
      });
      setTaxes(response.data);
      setTaxRates(response.data);
    } catch (error) {
      console.error("Failed to fetch taxes:", error);
      toast.error("Failed to fetch tax rates. Please try again.");
    }
  };

  // Call fetchTaxes in a useEffect
  useEffect(() => {
    fetchTaxes();
  }, []);
  const fetchProducts = async () => {
    try {
      const response = await API.get("/products", {
        timeout: 5000,
      });
      const fetchedProducts = response.data;

      // Update products state
      setProducts(fetchedProducts);

      // Sync fetched products with cart
      setCart((prevCart) =>
        prevCart.map((cartItem) => {
          const updatedProduct = fetchedProducts.find(
            (product) => product.id === cartItem.product.id
          );

          if (updatedProduct) {
            return {
              ...cartItem,
              product: updatedProduct,
            };
          }
          return cartItem;
        })
      );

      setLoading(false);
    } catch (error) {
      setLoading(false);
      toast.error("Failed to fetch products. Please try again.");
    }
  };
  const filteredProducts = products.filter(
    (product) => product.quantity_in_stock > 0
  );

  useEffect(() => {
    fetchProducts();
  }, []);
  const handleTaxChange = (index, value) => {
    const newTaxes = [...selectedTaxes];
    newTaxes[index] = value;
    setSelectedTaxes(newTaxes);
  };

  const addTax = () => {
    if (selectedTaxes.length < taxes.length) {
      setSelectedTaxes([...selectedTaxes, ""]);
    }
  };

  const removeTax = (index) => {
    setSelectedTaxes(selectedTaxes.filter((_, i) => i !== index));
  };

  const removeDocument = async (index, documentId) => {
    // Remove the document from the UI first
    const updatedDocuments = documents.filter((_, i) => i !== index);
    setDocuments(updatedDocuments);

    // If the document has an ID, attempt to remove it from the database
    if (documentId) {
      try {
        const response = await API.delete(`/documents/${documentId}`);
        toast.success(response.data.message);
      } catch (error) {
        console.error("Error deleting document:", error);
        toast.error("Failed to delete document. Please try again.");
      }
    }
  };
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

      let itemTotal = itemActualTotal - discount;
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

  return (
    <div>
      {showInvoice && (
        <div className="fixed inset-0 z-50 flex justify-center items-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-[95%] lg:w-[70%] shadow-2xl  max-h-[calc(100vh-50px)] overflow-y-scroll">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left Column - Sales */}
              <div className="w-full lg:w-1/2">
                {/* Header */}
                <div className="border-b pb-4 mb-4">
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
                    Reference Number:{" "}
                    <span className="font-medium">{refNum}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Date:{" "}
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="border rounded p-1"
                      max={new Date().toISOString().split("T")[0]} // Prevent future dates
                    />
                  </p>
                </div>

                {/* Product Selection for Draft */}
                {showDraft && !showClearCart && (
                  <div className="flex space-x-2 mb-4">
                    <select
                      value={selectedProduct?.id || ""}
                      onChange={(e) => {
                        const productId = e.target.value;
                        const product = products.find((p) => p.id == productId);
                        if (product) {
                          setSelectedProduct(product);
                          setSellingPrice(product.price || 0); // Set initial selling price
                          setNewItemQuantity(1); // Set initial quantity
                          setSelectedTaxes([""]); // Reset tax selection
                          setDiscountType("percentage"); // Default discount type
                          setDiscountAmount(0); // Default discount amount
                          setDescription(""); // Default description
                          setShowModal(true); // Show modal
                        }
                      }}
                      className="p-2 border rounded flex-1"
                    >
                      <option value="">Select Product</option>
                      {filteredProducts.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Modal for Additional Attributes */}
                {showModal && selectedProduct && (
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
                            onChange={(e) =>
                              setSellingPrice(parseFloat(e.target.value))
                            }
                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            min="0"
                            step="0.01"
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
                            value={newItemQuantity}
                            onChange={(e) => {
                              const enteredQuantity = Number(e.target.value);
                              const validQuantity = Math.min(
                                enteredQuantity,
                                selectedProduct.quantity_in_stock
                              );
                              setNewItemQuantity(validQuantity);
                            }}
                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            min="1"
                            max={selectedProduct.quantity_in_stock}
                            step="1"
                          />
                          <p className="text-sm text-gray-600 mt-1">
                            Available stock: {selectedProduct.quantity_in_stock}
                          </p>
                        </div>
                      </div>

                      {/* Tax Selection (Multiple Taxes) */}
                      <div className="mb-4">
                        <label className="block font-medium text-gray-700">
                          Select Taxes:
                        </label>

                        {selectedTaxes.map((taxId, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-2 mb-2"
                          >
                            <select
                              value={taxId}
                              onChange={(e) =>
                                handleTaxChange(index, e.target.value)
                              }
                              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            >
                              <option value="">-- Select Tax --</option>
                              {taxes
                                .filter(
                                  (tax) =>
                                    !selectedTaxes.includes(tax.id) ||
                                    tax.id === taxId
                                ) // Prevent duplicate selection
                                .map((tax) => (
                                  <option key={tax.id} value={tax.id}>
                                    {tax.tax_name} ({tax.tax_rate}%)
                                  </option>
                                ))}
                            </select>

                            {/* Remove Button (Only if more than one tax) */}
                            {selectedTaxes.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeTax(index)}
                                className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:outline-none"
                              >
                                <AiOutlineMinus size={20} />
                              </button>
                            )}
                          </div>
                        ))}

                        {/* Add New Tax Button */}
                        {selectedTaxes.length < taxes.length && ( // Prevent adding more than available taxes
                          <button
                            type="button"
                            onClick={addTax}
                            className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none flex items-center"
                          >
                            <AiOutlinePlus size={20} className="mr-2" /> Add Tax
                          </button>
                        )}
                      </div>
                      {/* Discount Type and Amount */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        {/* Discount Type */}
                        <div>
                          <label
                            htmlFor="discountType"
                            className="block font-medium text-gray-700"
                          >
                            Discount Type:
                          </label>
                          <select
                            id="discountType"
                            value={discountType}
                            onChange={(e) => setDiscountType(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          >
                            <option value="percentage">Percentage</option>
                            <option value="fixed">Fixed Amount</option>
                          </select>
                        </div>

                        {/* Discount Amount */}
                        <div>
                          <label
                            htmlFor="discountAmount"
                            className="block font-medium text-gray-700"
                          >
                            Discount Amount (₵):
                          </label>
                          <input
                            id="discountAmount"
                            type="number"
                            value={discountAmount}
                            onChange={(e) =>
                              setDiscountAmount(parseFloat(e.target.value))
                            }
                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>

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

                      {/* Action Buttons */}
                      <div className="flex justify-between items-center space-x-4 mt-8">
                        <button
                          onClick={() => {
                            setSelectedProduct(null);
                            setShowModal(false);
                          }}
                          className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-600"
                        >
                          Close
                        </button>
                        <button
                          onClick={() => {
                            if (selectedProduct) {
                              handleAddNewItem(
                                selectedProduct,
                                newItemQuantity,
                                sellingPrice,
                                selectedTaxes,
                                discountType,
                                discountAmount,
                                description
                              );
                              setShowModal(false);
                              setSelectedProduct(null);
                            }
                          }}
                          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                          Add Item
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Invoice Items */}
                <div className="max-h-[30vh] overflow-auto">
                  <table className="w-full table-auto border-collapse border border-gray-200 text-sm">
                    <thead>
                      <tr className="bg-gray-100 border-b">
                        <th className="p-2 text-left font-medium text-gray-700 border-r">
                          Item
                        </th>
                        <th className="p-2 text-center font-medium text-gray-700 border-r">
                          Qty
                        </th>
                        <th className="p-2 text-center font-medium text-gray-700 border-r">
                          Price (₵)
                        </th>
                        <th className="p-2 text-center font-medium text-gray-700 border-r">
                          Total (₵)
                        </th>
                        {showDraft && (
                          <th className="p-2 text-center font-medium text-gray-700">
                            Action
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2 text-gray-600 border-r">
                            {item.product.name}
                          </td>
                          <td className="p-2 text-center text-gray-600 border-r">
                            <input
                              type={showDraft ? "number" : "text"}
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                handleQuantityChangeNew(e, item, index)
                              }
                              className="w-16 p-1 text-center border rounded"
                              disabled={showDraft ? false : true}
                            />
                          </td>
                          <td className="p-2 text-center text-gray-600 border-r">
                            {parseFloat(item.sellingPrice).toFixed(2)}
                          </td>
                          <td className="p-2 text-center text-gray-600 border-r">
                            {parseFloat(
                              item.quantity * item.sellingPrice
                            ).toFixed(2)}
                          </td>
                          {showDraft && (
                            <td className="p-2 text-center">
                              <button
                                onClick={() => handleRemoveFromCart(item)}
                                className="text-red-500 hover:underline"
                              >
                                <FaTrash />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column - Documents */}
              <div className="w-full lg:w-1/2">
                {/* Summary */}

                <div className="mt-6">
                  {/* Actual Subtotal */}
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-700">
                      Item Total:
                    </span>
                    <span>₵{actualSubtotal.toFixed(2)}</span>
                  </div>

                  {/* Discount */}
                  <div className="flex justify-between mt-2">
                    <span className="font-semibold text-gray-700">
                      Discount:
                    </span>
                    <span>₵{totalDiscount.toFixed(2)}</span>
                  </div>

                  {/* Subtotal After Discount */}
                  <div className="flex justify-between mt-2">
                    <span className="font-semibold text-gray-700">
                      Sub Total:
                    </span>
                    <span>₵{subtotal.toFixed(2)}</span>
                  </div>

                  {/* Taxes Breakdown */}
                  <div className="mt-2">
                    <h3 className="font-semibold text-gray-700">Taxes:</h3>
                    <ul className="mt-1 space-y-1">
                      {Object.entries(taxBreakdown).map(
                        ([taxName, amount], index) => (
                          <li
                            key={index}
                            className="flex justify-between text-xs"
                          >
                            <span>{taxName}:</span>
                            <span>₵{amount.toFixed(2)}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>

                  {/* Total Tax */}
                  <div className="flex justify-between mt-2">
                    <span className="font-semibold text-gray-700">
                      Total Tax:
                    </span>
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
                          {Object.values(taxBreakdown).some(
                            (amount) => amount > 0
                          )
                            ? "calculated based on the tax type (inclusive or exclusive) applied to the items."
                            : "inclusive of the item prices where applicable."}
                        </em>
                      </p>
                    </div>
                  )}
                </div>

                {showDraft && (
                  <div className="mt-6">
                    <h2 className="text-lg font-semibold text-blue-600 mb-4">
                      Documents
                    </h2>
                    <div>
                      <input
                        type="file"
                        onChange={(e) => {
                          const selectedFiles = e.target.files;
                          const maxFileSize = 4 * 1024 * 1024; // 4MB in bytes

                          if (selectedFiles) {
                            const validFiles = [];
                            const rejectedFiles = [];

                            Array.from(selectedFiles).forEach((file) => {
                              if (file.size <= maxFileSize) {
                                validFiles.push(file);
                              } else {
                                rejectedFiles.push(file.name);
                              }
                            });

                            // Update state with valid files
                            setDocuments([...documents, ...validFiles]);

                            // Toast notification for rejected files
                            if (rejectedFiles.length > 0) {
                              toast.error(
                                `The following files exceed the 4MB limit and were not added: ${rejectedFiles.join(
                                  ", "
                                )}`
                              );
                            }
                          }
                        }}
                        className="p-2 border rounded w-full mb-2"
                        multiple // Allow selecting multiple files at once
                      />
                    </div>

                    <ul className="mt-4 space-y-2">
                      {documents.map((doc, index) => (
                        <li
                          key={index}
                          className="flex justify-between items-center border p-2 rounded"
                        >
                          <span>{doc.name || doc.document_name}</span>{" "}
                          <button
                            onClick={() => removeDocument(index, doc.id)} 
                            className="text-red-500 hover:underline"
                          >
                            <FaTrash />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {!showDraft && (
                  <div className="mt-6">
                    <h2 className="text-lg font-semibold text-blue-600 mb-4">
                      Documents
                    </h2>
                    {documents.length > 0 ? (
                      <ul className="mt-4 space-y-2">
                        {documents.map((doc) => (
                          <li
                            key={doc.id}
                            className="flex justify-between items-center border p-2 rounded"
                          >
                            <span>{doc.document_name}</span>
                            <a
                              href={doc.file_path}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline"
                            >
                              <FaEye />
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500">No documents attached.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="mt-6 flex justify-between">
              <button
                onClick={() => {
                  if (!showClearCart) {
                    clearCart();
                  }
                  setShowInvoice(false);
                }}
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleInvoice();
                }}
                className="px-4 py-2 bg-green-400 text-white rounded hover:bg-green-500"
              >
                Invoice
              </button>

              {showClearCart && (
                <button
                  onClick={() => {
                    clearCart();
                    setCustomerLocked(false); // Reset customer lock
                    setShowInvoice(false);
                    setShowClearCart(false);
                    toast.success("Cart Cleared");
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Clear Cart
                </button>
              )}
              {showDraft && (
                <button
                  onClick={handleSaveDraft}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Save Draft
                </button>
              )}
              {showDraft && (
                <button
                  disabled={isSubmitting}
                  onClick={() => {
                    handleSaleDraft(
                      selectedCustomer.id,
                      paymentMethod,
                      date
                    );

                    console.log("selected customer ", selectedCustomer.id)
                  }}
                  className="px-4 py-2  bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  {showClearCart ? "Complete Sale" : "Process Draft"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Invoice;
