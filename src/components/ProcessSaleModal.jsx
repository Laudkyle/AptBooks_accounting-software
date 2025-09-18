import React, { useState, useEffect } from "react";
import API from "../api.js";
import { useCart } from "../CartContext";
import { FaEye, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";

function ProcessSaleModal({
  showProcessSaleModal,
  showDraft,
  setShowProcessSaleModal,
  handleQuantityChangeNew,
  companyAddress,
  companyName,
  refNum,
  email,
  phone,
  documents,
  date,
  setDocuments,
  handleCompleteSale,
}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("credit");
 const [taxRates, setTaxRates] = useState([]);
  const { cart, setCart, clearCart } = useCart();
  const [selectedCustomer, setSelectedCustomer] = useState(1);
  // Fetch customers from the database
  const fetchCustomers = async () => {
    try {
      const response = await API.get("/customers", {
        timeout: 5000,
      });
      setCustomers(response.data);
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
      setTaxRates(response.data); // Assume response.data is an array of taxes
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
              product: updatedProduct, // Update product details in cart
            };
          }

          // If the product is no longer available, retain the current cart item
          return cartItem;
        })
      );

      setLoading(false);
    } catch (error) {
      setLoading(false);
      toast.error(error.response.data.error|| "Failed to fetch products. Please try again.");
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

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
        item.discountType === "percentage"
          ? (itemActualTotal * item.discountAmount) / 100
          : item.discountAmount;
      totalDiscount += discount;
  
      let itemTotal = itemActualTotal - discount; // Default to exclusive tax scenario
      let itemTotalTax = 0;
  
      // Process each tax in the taxes array
      item.taxes.forEach((taxId) => {
        const tax = taxRates.find((t) => t.id == taxId);
        if (!tax) {
          console.log("not found")
          return}; // Skip if tax is not found
  
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
      grandTotal: subtotal + totalTax, // For inclusive taxes, `subtotal` already includes tax
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
  


  const removeDocument = async (index, documentId) => {
    // Remove the document from the UI first
    const updatedDocuments = documents.filter((_, i) => i !== index);
    setDocuments(updatedDocuments);

    // If the document has an ID, attempt to remove it from the database
    if (documentId) {
      try {
        const response = await API.delete(
          `/documents/${documentId}`
        );
        toast.success(response.data.message);
      } catch (error) {
        console.error("Error deleting document:", error);
        toast.error("Failed to delete document. Please try again.");
      }
    }
  };

  return (
    <div>
      {showProcessSaleModal && (
        <div className="fixed inset-0 z-50 flex justify-center items-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-[95%] lg:w-[70%] shadow-2xl">
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
                  <h2 className="text-lg font-semibold mt-4">Process Sale</h2>
                  <p className="text-sm text-gray-600">
                    Reference Number:{" "}
                    <span className="font-medium">{refNum}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Date:{" "}
                    <span className="font-medium">
                      {new Date(date).toLocaleDateString()}
                    </span>
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block font-medium text-gray-700 mb-2">
                    Select Customer:
                  </label>
                  <select
                    value={selectedCustomer?.id || "1"}
                    onChange={(e) =>
                      setSelectedCustomer(
                        customers.find((c) => c.id === parseInt(e.target.value))
                      )
                    }
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Select Customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name || customer.business_name} (
                        {customer.customer_type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* ProcessSaleModal Items */}
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
                      Sub Total
                    </span>
                    <span>₵{subtotal.toFixed(2)}</span>
                  </div>

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

                  <div className="flex justify-between mt-2">
                    <span className="font-semibold text-gray-700">
                      Total Tax:
                    </span>
                    <span>₵{totalTax.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between mt-1 border-t pt-2">
                    <span className="font-semibold text-lg">Grand Total:</span>
                    <span className="text-xl font-bold">
                      ₵{grandTotal.toFixed(2)}
                    </span>
                  </div>
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
                                )}`,
                                {
                                  position: "top-right",
                                  autoClose: 5000,
                                  hideProgressBar: false,
                                  closeOnClick: true,
                                  pauseOnHover: true,
                                  draggable: true,
                                }
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
                            onClick={() => removeDocument(index, doc.id)} // Pass the document's ID to the function
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
                  clearCart()

                  setShowProcessSaleModal(false)}}
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
              >
                Close
              </button>

              <button
                onClick={() =>
                  handleCompleteSale(selectedCustomer.id || 1, paymentMethod)
                }
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Complete Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProcessSaleModal;
