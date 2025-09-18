import React, { useState, useEffect } from "react";
import { FaSave, FaPlus, FaTrash, FaPrint, FaFileExcel } from "react-icons/fa";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import API from "../api.js";
import { jsPDF } from "jspdf";

const SalesJournal = ({ companyName, companyAddress, email, phone }) => {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [description, setDescription] = useState("");
  const [journalEntries, setJournalEntries] = useState([
    {
      productName: "",
      quantity: 1,
      sellingPrice: 0,
      costPrice: 0,
      taxes: [1],
      discountType: "percentage",
      discountAmount: 0,
      lineDescription: "",
    },
  ]);
  // Utility function to generate a unique reference number
  const generateReferenceNumber = () => {
    const uniqueNumber = Date.now() + Math.floor(Math.random() * 999);
    return `REF ${uniqueNumber}`;
  };

  const [referenceNumber, setReferenceNumber] = useState(
    generateReferenceNumber()
  );

  // Calculate totals
  const calculateTotals = () => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let grandTotal = 0;
    const taxBreakdown = {};

    journalEntries.forEach((entry) => {
      // Changed from entry.product to entry.productName
      if (!entry.productName) return;

      const lineTotal = entry.sellingPrice * entry.quantity;
      const discount =
        entry.discountType === "percentage"
          ? (lineTotal * entry.discountAmount) / 100
          : entry.discountAmount;

      const discountedTotal = lineTotal - discount;
      let lineTax = 0;

      // Calculate taxes for this line
      entry.taxes.forEach((taxId) => {
        const tax = taxes.find((t) => t.id === taxId);
        if (!tax) return;

        let taxAmount = 0;
        if (tax.tax_type === "exclusive") {
          taxAmount = (discountedTotal * tax.tax_rate) / 100;
        } else if (tax.tax_type === "inclusive") {
          taxAmount =
            discountedTotal - discountedTotal / (1 + tax.tax_rate / 100);
        }

        lineTax += taxAmount;

        // Add to tax breakdown
        if (taxBreakdown[tax.tax_name]) {
          taxBreakdown[tax.tax_name] += taxAmount;
        } else {
          taxBreakdown[tax.tax_name] = taxAmount;
        }
      });

      subtotal += lineTotal;
      totalDiscount += discount;
      totalTax += lineTax;
      grandTotal += discountedTotal + lineTax;
    });

    return {
      subtotal,
      totalDiscount,
      totalTax,
      grandTotal,
      taxBreakdown,
    };
  };
  const { subtotal, totalDiscount, totalTax, grandTotal, taxBreakdown } =
    calculateTotals();

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }

    if (journalEntries.some((entry) => !entry.productName)) {
      toast.error("Please select a product for all entries");
      return;
    }
    const totalAmount = journalEntries.reduce(
      (sum, item) => sum + item.sellingPrice * item.quantity,
      0
    );
    setLoading(true);
    try {
      const salesData = journalEntries.map((entry) => ({
        product_name: entry.productName,
        quantity: entry.quantity,
        selling_price: entry.sellingPrice,
        cost_price: entry.costPrice,
        taxes: entry.taxes,
        discount_type: entry.discountType,
        discount_amount: entry.discountAmount,
        description: entry.lineDescription,
        customer_id: selectedCustomer.id,
        reference_number: referenceNumber,
        payment_method: "credit",
      }));

      const response = await API.post("/sales-journal", salesData);

      if (response.status === 201) {
        const paymentResponse = await API.post("/payments", {
          customerId: selectedCustomer.id,
          reference_number: referenceNumber,
          payment_date: new Date().toISOString(),
          amount_paid: totalAmount,
          payment_method: "cash",
          payment_reference: referenceNumber,
        });

        if (paymentResponse.status !== 201) {
          throw new Error(
            `Failed to process payment: ${paymentResponse.statusText}`
          );
        }
        toast.success("Sales journal saved successfully!");

        // Generate and save PDF receipt
        generatePDFReceipt();

        // Reset form
        setJournalEntries([
          {
            productName: "",
            quantity: 1,
            sellingPrice: 0,
            costPrice: 0,
            taxes: [],
            discountType: "percentage",
            discountAmount: 0,
            lineDescription: "",
          },
        ]);
        setDescription("");
        setReferenceNumber(generateReferenceNumber());
      }
    } catch (error) {
      console.error("Error saving sales journal:", error);
      toast.error("Failed to save sales journal");
    } finally {
      setLoading(false);
    }
  };

  const generatePDFReceipt = () => {
    const doc = new jsPDF();

    // Set document properties
    doc.setProperties({
      title: `Sales Receipt ${referenceNumber}`,
      subject: "Sales Transaction",
      author: companyName || "Company Name",
      keywords: "receipt, sales, invoice",
      creator: "Sales Journal System",
    });

    // Add a font that supports the cedi symbol - using Helvetica which should work
    doc.setFont("helvetica");

    // ============= HEADER SECTION =============
    // Company Info
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(companyName || "COMPANY NAME", 105, 20, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(companyAddress || "123 Business Street, City, Country", 105, 26, {
      align: "center",
    });
    doc.text(
      `Tel: ${phone || "123-456-7890"} | Email: ${email || "info@company.com"}`,
      105,
      32,
      { align: "center" }
    );

    // Add horizontal line
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 38, 195, 38);

    // ============= RECEIPT TITLE =============
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("SALES RECEIPT", 105, 48, { align: "center" });

    // ============= RECEIPT DETAILS =============
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    // Left column
    doc.text(`Receipt No: ${referenceNumber}`, 15, 58);
    doc.text(
      `Date: ${new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })}`,
      15,
      64
    );

    // Right column
    doc.text(
      `Customer: ${selectedCustomer?.name || "Walk-in Customer"}`,
      105,
      58
    );
    doc.text(`Customer ID: ${selectedCustomer?.id || "N/A"}`, 105, 64);

    // Add horizontal line
    doc.line(15, 70, 195, 70);

    // ============= ITEMS TABLE =============
    // Table Header
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("No.", 15, 80);
    doc.text("Description", 30, 80);
    doc.text("Qty", 120, 80);
    doc.text("Unit Price", 140, 80);
    doc.text("Amount", 170, 80);

    // Add horizontal line under header
    doc.line(15, 83, 195, 83);

    // Table Rows
    doc.setFont("helvetica", "normal");
    let y = 90;
    journalEntries.forEach((entry, index) => {
      if (!entry.productName) return;

      // Row number
      doc.text(`${index + 1}.`, 15, y);

      // Product description (with line wrapping)
      const productLines = doc.splitTextToSize(entry.productName, 70);
      doc.text(productLines, 30, y);

      // If description is multi-line, adjust y position
      const lineHeight = 7;
      const linesHeight = (productLines.length - 1) * lineHeight;

      // Quantity
      doc.text(entry.quantity.toString(), 120, y + linesHeight);

      // Unit price - using 'GHS' instead of cedi symbol if symbol doesn't work
      doc.text(`GHS ${entry.sellingPrice.toFixed(2)}`, 140, y + linesHeight);

      // Line total
      doc.text(
        `GHS ${(entry.quantity * entry.sellingPrice).toFixed(2)}`,
        170,
        y + linesHeight
      );

      // Add horizontal line between items
      doc.line(15, y + linesHeight + 4, 195, y + linesHeight + 4);

      // Update y position for next item
      y += Math.max(lineHeight, linesHeight + 8);
    });

    // ============= TOTALS SECTION =============
    const totalsY = Math.max(y + 10, 150); // Ensure totals are at least at 160

    // Subtotal
    doc.text("Subtotal:", 140, totalsY);
    doc.text(`GHS ${subtotal.toFixed(2)}`, 170, totalsY);

    // Discount
    doc.text("Discount:", 140, totalsY + 6);
    doc.text(`GHS ${totalDiscount.toFixed(2)}`, 170, totalsY + 6);

    // Tax
    doc.text("Tax:", 140, totalsY + 12);
    doc.text(`GHS ${totalTax.toFixed(2)}`, 170, totalsY + 12);

    // Grand Total
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL:", 140, totalsY + 20);
    doc.text(`GHS ${grandTotal.toFixed(2)}`, 170, totalsY + 20);

    // Add horizontal line above total
    doc.line(135, totalsY + 16, 195, totalsY + 16);

    // ============= FOOTER SECTION =============
    const footerY = totalsY + 30;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Thank you for your business!", 105, footerY, { align: "center" });
    doc.text("Terms & Conditions Apply", 105, footerY + 6, { align: "center" });
    doc.text("Returns accepted within 7 days with receipt", 105, footerY + 12, {
      align: "center",
    });

    // Add border around entire document
    doc.setDrawColor(100, 100, 100);
    doc.rect(5, 5, 200, footerY + 20);

    // Save the PDF
    doc.save(`Receipt_${referenceNumber}.pdf`);
  };

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, customersRes, taxesRes] = await Promise.all([
          API.get("/products"),
          API.get("/customers"),
          API.get("/taxes"),
        ]);

        setProducts(productsRes.data);
        setCustomers(customersRes.data);
        setTaxes(taxesRes.data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load required data");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 overflow-y-scroll h-[85vh] bg-gray-100 rounded-lg shadow-lg">
      <h2 className="text-3xl font-semibold text-gray-800 mb-6">
        Sales Journal Entry
      </h2>

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg shadow-md"
      >
        {/* Header Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference Number
            </label>
            <input
              type="text"
              value={referenceNumber}
              readOnly
              className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer
            </label>
            <select
              value={selectedCustomer?.id || ""}
              onChange={(e) => {
                const customer = customers.find(
                  (c) => c.id === parseInt(e.target.value)
                );
                setSelectedCustomer(customer);
              }}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            >
              <option value="">Select Customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name || customer.business_name} ({customer.customer_type})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Journal Entry Lines */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">
            Journal Entries
          </h3>

          {journalEntries.map((entry, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg p-4 mb-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name
                  </label>
                  <input
                    type="text"
                    value={entry.productName}
                    onChange={(e) => {
                      setJournalEntries((prev) => {
                        const newEntries = [...prev];
                        newEntries[index] = {
                          ...newEntries[index],
                          productName: e.target.value,
                        };
                        return newEntries;
                      });
                    }}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Enter product name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={entry.quantity}
                    onChange={(e) => {
                      setJournalEntries((prev) => {
                        const newEntries = [...prev];
                        newEntries[index] = {
                          ...newEntries[index],
                          quantity: parseFloat(e.target.value) || 0,
                        };
                        return newEntries;
                      });
                    }}
                    step="0.01"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  />
                  {entry.product && (
                    <p className="text-xs text-gray-500 mt-1">
                      Available: {entry.product.quantity_in_stock}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Selling Price
                  </label>
                  <input
                    type="number"
                    value={entry.sellingPrice}
                    onChange={(e) => {
                      setJournalEntries((prev) => {
                        const newEntries = [...prev];
                        newEntries[index] = {
                          ...newEntries[index],
                          sellingPrice: parseFloat(e.target.value) || 0,
                        };
                        return newEntries;
                      });
                    }}
                    min="0"
                    step="0.01"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost Price
                  </label>
                  <input
                    type="number"
                    required
                    value={entry.costPrice}
                    onChange={(e) => {
                      setJournalEntries((prev) => {
                        const newEntries = [...prev];
                        newEntries[index] = {
                          ...newEntries[index],
                          costPrice: parseFloat(e.target.value) || 0,
                        };
                        return newEntries;
                      });
                    }}
                    className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount
                  </label>
                  <div className="flex">
                    <select
                      value={entry.discountType}
                      onChange={(e) => {
                        setJournalEntries((prev) => {
                          const newEntries = [...prev];
                          newEntries[index] = {
                            ...newEntries[index],
                            discountType: e.target.value,
                          };
                          return newEntries;
                        });
                      }}
                      className="w-1/3 p-2 border border-gray-300 rounded-l-md"
                    >
                      <option value="percentage">%</option>
                      <option value="fixed">Fixed</option>
                    </select>
                    <input
                      type="number"
                      value={entry.discountAmount}
                      onChange={(e) => {
                        setJournalEntries((prev) => {
                          const newEntries = [...prev];
                          newEntries[index] = {
                            ...newEntries[index],
                            discountAmount: parseFloat(e.target.value) || 0,
                          };
                          return newEntries;
                        });
                      }}
                      min="0"
                      className="w-2/3 p-2 border border-gray-300 rounded-r-md border-l-0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Taxes
                  </label>
                  <select
                    multiple
                    value={entry.taxes[1]}
                    onChange={(e) => {
                      const options = Array.from(
                        e.target.selectedOptions,
                        (option) => parseInt(option.value)
                      );
                      setJournalEntries((prev) => {
                        const newEntries = [...prev];
                        newEntries[index] = {
                          ...newEntries[index],
                          taxes: options,
                        };
                        return newEntries;
                      });
                    }}
                    className="w-full p-2 border border-gray-300 rounded-md h-[42px]"
                  >
                    {taxes.map((tax) => (
                      <option key={tax.id} value={tax.id}>
                        {tax.tax_name} ({tax.tax_rate}%)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Line Description
                </label>
                <input
                  type="text"
                  value={entry.lineDescription}
                  onChange={(e) => {
                    setJournalEntries((prev) => {
                      const newEntries = [...prev];
                      newEntries[index] = {
                        ...newEntries[index],
                        lineDescription: e.target.value,
                      };
                      return newEntries;
                    });
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="Optional description for this line"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Totals Section */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Totals</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="font-medium">Subtotal:</span>
                <span>₵{subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between mb-2">
                <span className="font-medium">Total Discount:</span>
                <span>₵{totalDiscount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between mb-2">
                <span className="font-medium">Total Tax:</span>
                <span>₵{totalTax.toFixed(2)}</span>
              </div>

              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="font-bold text-lg">Grand Total:</span>
                <span className="font-bold text-lg">
                  ₵{grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Tax Breakdown:</h4>
              {Object.entries(taxBreakdown).length > 0 ? (
                <ul className="space-y-1">
                  {Object.entries(taxBreakdown).map(([taxName, amount]) => (
                    <li key={taxName} className="flex justify-between">
                      <span>{taxName}:</span>
                      <span>₵{amount.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No taxes applied</p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end">
          <button
            disabled={loading}
            type="submit"
            className="flex items-center bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700"
          >
            <FaSave className="mr-2" /> Save Journal
          </button>
        </div>
      </form>
    </div>
  );
};

export default SalesJournal;
