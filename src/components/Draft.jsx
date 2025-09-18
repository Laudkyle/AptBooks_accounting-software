import React, { useState, useEffect } from "react";
import API from "../api.js";
import { FaEye, FaEdit, FaTrashAlt, FaMoneyBillWave } from "react-icons/fa";
import { useCart } from "../CartContext.jsx";
import { toast } from "react-toastify";
import Invoice from "./Invoice";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import ProcessSaleModal from "./ProcessSaleModal";
import DataTable from "react-data-table-component";

const Draft = ({ companyName, companyAddress, email, phone }) => {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [drafts, setDrafts] = useState([]);
  const [refNum, setRefNum] = useState("");
  const [editDraftId, setEditDraftId] = useState(null);
  const [showInvoice, setShowInvoice] = useState(null);
  const [showProcessSaleModal, setShowProcessSaleModal] = useState(null);
  const [showDraft, setShowDraft] = useState(true);
  const [showCompleteSale, setShowCompleteSale] = useState(true);
  const [saleComplete, setSaleComplete] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [documents, setDocuments] = useState([]); // State to handle documents
  const [newDocument, setNewDocument] = useState(""); // State for new document input
  const [showInvoicePrint, setShowInvoicePrint] = useState(false);
  const [taxRates, setTaxRates] = useState([]);
    const [loading, setLoading] = useState(false);

  const { cart, setCart, clearCart, processSale } = useCart();

  // Fetch drafts from the backend
  const fetchDrafts = async () => {
    try {
      const response = await API.get("/drafts");
      setDrafts(response.data);
    } catch (error) {
      console.error("Error fetching drafts:", error);
    }
  };


  const handleSaveDraft = async () => {
    setLoading(true)
    try {
      // Map the cart items to include all necessary attributes
      const draftDetails = cart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        sellingPrice: item.sellingPrice,
        tax: item.tax,
        discountType: item.discountType,
        discountAmount: item.discountAmount,
        description: item.description,
      }));

      // Prepare draftPayload with reference number and status
      const draftPayload = {
        reference_number: refNum,
        details: draftDetails, // Includes full item attributes
        date: new Date().toISOString(),
        status: "pending",
      };

      // Validate stock availability for each item in the cart
      const stockCheckPromises = draftDetails.map(async (item) => {
        const productResponse = await API.get(`/products/${item.product_id}`);
        const product = productResponse.data;

        if (item.quantity > product.stock) {
          throw new Error(
            `Insufficient stock for product "${product.name}". Required: ${item.quantity}, Available: ${product.stock}`
          );
        }
      });

      // Wait for all stock checks to complete
      await Promise.all(stockCheckPromises);

      // Separate new documents from existing ones
      const newDocuments = documents.filter((doc) => !doc.id); // New documents don't have an `id`
      const uploadedDocuments = [];

      // Upload new documents if they exist
      if (newDocuments.length > 0) {
        const formData = new FormData();
        newDocuments.forEach((document) => {
          formData.append("files", document);
        });
        formData.append("transaction_type", "sale");
        formData.append("reference_number", refNum);

        const response = await API.post("/documents", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 120000,
        });

        if (!response || !response.data || response.data.length === 0) {
          throw new Error(
            "Document upload failed or returned an empty response."
          );
        }

        response.data.forEach((doc) => {
          uploadedDocuments.push({
            document_name: doc.document_name,
            file_path: doc.file_path,
            transaction_type: "sale",
            reference_number: refNum,
          });
        });
      }

      // Include uploaded documents and existing documents in the draftPayload
      draftPayload.documents = [
        ...documents.filter((doc) => doc.id), // Existing documents
        ...uploadedDocuments, // Newly uploaded documents
      ];

      // Save or update the draft
      if (editDraftId) {
        const response = await API.put(`/drafts/${editDraftId}`, draftPayload);
        setDrafts(
          drafts.map((draft) =>
            draft.id === editDraftId ? response.data : draft
          )
        );
        toast.success("Draft updated successfully!");
      } else {
        const response = await API.post("/drafts", draftPayload);
        setDrafts([...drafts, response.data]);
        toast.success("Draft saved successfully!");
      }

      // Clear cart and documents after saving the draft
      clearCart();
      setDocuments([]);
      setShowInvoice(false);
    } catch (error) {
      toast.error(error.message || "An error occurred while saving the draft.");
      console.error("Error saving draft:", error);
    }finally{setLoading(false)}
  };

  const handleSaleDraft = async () => {
    setLoading(true)
    try {
      // Prepare draftDetails with new attributes
      const draftDetails = cart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        sellingPrice: item.sellingPrice,
        tax: item.tax,
        discountType: item.discountType,
        discountAmount: item.discountAmount,
        description: item.description,
        date:selectedDate
      }));

      // Prepare draftPayload
      const draftPayload = {
        reference_number: refNum,
        details: draftDetails,
        date: selectedDate,
        status: "pending",
      };

      // Validate stock availability for each item
      const stockCheckPromises = draftDetails.map(async (item) => {
        const productResponse = await API.get(`/products/${item.product_id}`);
        const product = productResponse.data;

        if (item.quantity > product.stock) {
          throw new Error(
            `Insufficient stock for product "${product.name}". Required: ${item.quantity}, Available: ${product.stock}`
          );
        }
      });

      // Wait for all stock checks to complete
      await Promise.all(stockCheckPromises);

      // Save or update the draft
      if (editDraftId) {
        // Update an existing draft
        const response = await API.put(`/drafts/${editDraftId}`, draftPayload);
        setDrafts(
          drafts.map((draft) =>
            draft.id === editDraftId ? response.data : draft
          )
        );
        toast.success("Draft updated successfully!");
      } else {
        // Save a new draft
        const response = await API.post("/drafts", draftPayload);
        setDrafts([...drafts, response.data]);
        toast.success("Draft saved successfully!");
      }

      // Close modals and open process sale modal
      setShowInvoice(false);
      setShowProcessSaleModal(true);
    } catch (error) {
      console.error("Error in handleSaleDraft:", error.message);
      toast.error(error.message || "An error occurred while saving the draft.");
    }finally{setLoading(false)}
  };

  const handleRemoveFromCart = async (itemToRemove) => {
    // Update the cart locally
    setCart((prevCart) =>
      prevCart.filter((item) => item.product.id !== itemToRemove.product.id)
    );

    toast.info(`${itemToRemove.product.name} removed from cart`);

    try {
      // Prepare updated cart details
      const updatedCartDetails = cart
        .filter((item) => item.product.id !== itemToRemove.product.id) // Exclude the removed item
        .map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
        }));

      // Prepare the payload for updating the draft
      const updatedDraftPayload = {
        reference_number: refNum,
        details: updatedCartDetails,
      };

      // Sync the updated cart with the backend draft
      if (editDraftId) {
        const response = await API.put(
          `/drafts/${editDraftId}`,
          updatedDraftPayload
        );

        // Update drafts state with the modified draft
        setDrafts(
          drafts.map((draft) =>
            draft.id === editDraftId ? response.data : draft
          )
        );

        console.log("Draft cart updated successfully!");
      } else {
        console.error("No draft selected to update.");
      }
    } catch (error) {
      toast.error("Error updating draft cart. Please try again.");
      console.error("Error syncing cart with draft:", error);
    }
  };

  const filteredDrafts = drafts.filter((draft) => {
    const referenceNumber = draft.reference_number || ""; // Handle undefined reference_number
    const status = draft.status || ""; // Handle undefined status
    const date = draft.date ? new Date(draft.date).toLocaleDateString() : ""; // Handle undefined date

    return (
      referenceNumber.toLowerCase().includes(filterText.toLowerCase()) ||
      status.toLowerCase().includes(filterText.toLowerCase()) ||
      date.includes(filterText)
    );
  });

  // Delete a draft
  const handleDeleteDraft = async (draftId) => {
    try {
      await API.delete(`/drafts/${draftId}`);
      setDrafts(drafts.filter((draft) => draft.id !== draftId));
    } catch (error) {
      console.error("Error deleting draft:", error);
    }
  };

  // Mark a draft as completed
  const handleCompleteSalePut = async (draftId) => {
    try {
      await API.put(`/drafts/${draftId}`, {
        status: "completed",
      });
      setDrafts(drafts.filter((draft) => draft.id !== draftId));
    } catch (error) {
      console.error("Error completing sale:", error);
    }
  };

  // Updated handleCompleteSale function
  const handleCompleteSaleDraft = async (customer, paymentMethod,date=selectedDate) => {
    setLoading(true)
    try {
      // Fetch draft details
      const response = await API.get(`/drafts/${editDraftId}`);
      const draft = response.data;
      const referenceNumber = draft.reference_number; // Extract reference number
      const customer_id = customer;
      const payment_method = paymentMethod;
      // Parse draft items
      const draftItems = JSON.parse(draft.details);
      // Validate stock availability for each item
      const stockCheckPromises = draftItems.map(async (item) => {
        const productResponse = await API.get(`/products/${item.product_id}`);
        const product = productResponse.data;

        if (item.quantity > product.stock) {
          throw new Error(
            `Insufficient stock for product "${product.name}". Required: ${item.quantity}, Available: ${product.stock}`
          );
        }
      });

      // Wait for all stock checks to complete
      await Promise.all(stockCheckPromises);

      // Process the sale if all items pass the stock check
      const saleResponse = await processSale(
        referenceNumber,
        customer_id,
        payment_method,
        date
      );
      if (saleResponse.status !== 200 && saleResponse.status !== 201) {
        throw new Error(
         `${saleResponse.error}`
        );
      }
      
      // Update draft to mark as completed
      await handleCompleteSalePut(editDraftId);

      // If everything went well
      setSaleComplete(!saleComplete); 
      setShowProcessSaleModal(false); 
      clearCart();
      toast.success("Sale completed successfully!");
    } catch (error) {
      console.error("Error completing sale:", error);
      toast.error(
        error.message || "An error occurred while processing the sale."
      );
    }finally{setLoading(false)}
  };

  const handleEditDraft = async (draftId) => {
    setShowDraft(true);
    setShowCompleteSale(true);
    setEditDraftId(draftId);

    try {
      // Fetch draft details
      const response = await API.get(`/drafts/${draftId}`);
      const draft = response.data;

      // Populate draft details
      setShowInvoice(true);
      setRefNum(draft.reference_number);

      // Fetch product details and populate the cart with multiple taxes
      const draftItems = await Promise.all(
        JSON.parse(draft.details).map(async (item) => {
          const productResponse = await API.get(`/products/${item.product_id}`);
          const product = productResponse.data;

          return {
            product,
            quantity: item.quantity,
            sellingPrice: item.sellingPrice,
            taxes: Array.isArray(item.taxes) ? item.taxes : [], 
            discountType: item.discountType,
            discountAmount: item.discountAmount,
            description: item.description,
          };
        })
      );
      setCart(draftItems);

      // Fetch documents
      const documentsResponse = await API.get(
        `/documents/by-reference/${draft.reference_number}`
      );
      setDocuments(documentsResponse.data);
    } catch (error) {
      console.error("Error fetching draft details:", error);
    }

    console.log("this is cart after:", cart);
  };
  const handleViewDraft = async (draftId) => {
    setEditDraftId(draftId);

    try {
      // Fetch draft details
      const response = await API.get(`/drafts/${draftId}`);
      const draft = response.data;

      // Populate draft details
      setShowInvoice(true);
      setRefNum(draft.reference_number);
      setShowDraft(false);

      // Fetch product details and populate the cart with multiple taxes
      const draftItems = await Promise.all(
        JSON.parse(draft.details).map(async (item) => {
          const productResponse = await API.get(`/products/${item.product_id}`);
          const product = productResponse.data;

          return {
            product,
            quantity: item.quantity,
            sellingPrice: item.sellingPrice,
            taxes: Array.isArray(item.taxes) ? item.taxes : [], // Ensure tax is an array
            discountType: item.discountType,
            discountAmount: item.discountAmount,
            description: item.description,
          };
        })
      );

      setCart(draftItems);

      // Fetch documents
      const documentsResponse = await API.get(
        `/documents/by-reference/${draft.reference_number}`
      );
      setDocuments(documentsResponse.data);
      console.log("documents:", documentsResponse.data);
    } catch (error) {
      console.error("Error fetching draft details:", error);
    }
  };

  const handleDraft = async (draftId) => {
    setEditDraftId(draftId);

    try {
      // Fetch draft details
      const response = await API.get(`/drafts/${draftId}`);
      const draft = response.data;

      // Populate draft details
      setShowProcessSaleModal(true);
      setRefNum(draft.reference_number);
      setShowDraft(false);

      // Fetch product details and populate the cart with additional attributes
      const draftItems = await Promise.all(
        JSON.parse(draft.details).map(async (item) => {
          const productResponse = await API.get(`/products/${item.product_id}`);
          const product = productResponse.data;
          return {
            product,
            quantity: item.quantity,
            sellingPrice: item.sellingPrice,
            taxes: Array.isArray(item.taxes) ? item.taxes : [], 
            discountType: item.discountType,
            discountAmount: item.discountAmount,
            description: item.description,
          };
        })
      );
      setCart(draftItems);

      // Fetch documents
      const documentsResponse = await API.get(
        `/documents/by-reference/${draft.reference_number}`
      );
      setDocuments(documentsResponse.data);
      console.log("documents:", documentsResponse.data);
    } catch (error) {
      console.error("Error fetching draft details:", error);
    }
  };
  const handleAddNewItem = (
    product,
    quantity,
    sellingPrice,
    selectedTaxes,
    discountType,
    discountAmount,
    description
  ) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find(
        (item) => item.product.id === product.id
      );

      if (existingItem) {
        // Update quantity and other attributes if product already exists
        return prevCart.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + quantity,
                sellingPrice: sellingPrice || item.sellingPrice,
                taxes: selectedTaxes || item.taxes,
                discountType: discountType || item.discountType,
                discountAmount: discountAmount || item.discountAmount,
                description: description || item.description,
              }
            : item
        );
      }

      // Add new item to the cart with all attributes
      return [
        ...prevCart,
        {
          product,
          quantity,
          sellingPrice,
          taxes: selectedTaxes,
          discountType,
          discountAmount,
          description,
        },
      ];
    });

    toast.success(`${product.name} added to cart`);
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
        taxes: item.taxes,
        discountType: item.discountType,
        discountAmount: item.discountAmount,
        description: item.description,
      };
      return updatedCart;
    });
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

  const columns = [
    {
      name: "Reference",
      selector: (row) => row.reference_number,
      sortable: true,
    },
    {
      name: "Status",
      selector: (row) => row.status,
      sortable: true,
    },
    {
      name: "Date",
      selector: (row) => new Date(row.date).toLocaleDateString(),
      sortable: true,
    },
    {
      name: "Actions",
      cell: (row) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleViewDraft(row.id)}
            className="text-blue-600 hover:bg-blue-100 p-2 rounded"
            title="View Draft"
          >
            <FaEye />
          </button>
          {row.status !== "completed" && (
            <>
              <button
                onClick={() => handleEditDraft(row.id)}
                className="text-blue-600 hover:bg-blue-100 p-2 rounded"
                title="Edit Draft"
              >
                <FaEdit />
              </button>
              <button
                onClick={() => handleDeleteDraft(row.id)}
                className="text-red-600 hover:bg-red-100 p-2 rounded"
                title="Delete Draft"
              >
                <FaTrashAlt />
              </button>
              <button
                onClick={() => handleDraft(row.id)}
                className="text-green-600 hover:bg-green-100 p-2 rounded"
                title="Process Draft"
              >
                <FaMoneyBillWave />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];
  useEffect(() => {
    fetchDrafts();
  }, [handleSaveDraft]);

  return (
    <div className="p-6">
      {/* Invoice Modal */}
      <Invoice
        id="invoice"
        refNum={refNum}
        showInvoice={showInvoice}
        setShowInvoice={setShowInvoice}
        showDraft={showDraft}
        showCompleteSale={showCompleteSale}
        editDraftId={editDraftId}
        handleCompleteSale={handleCompleteSaleDraft}
        handleQuantityChangeNew={handleQuantityChangeNew}
        handleRemoveFromCart={handleRemoveFromCart}
        handleSaveDraft={handleSaveDraft}
        handleAddNewItem={handleAddNewItem}
        documents={documents}
        handleInvoice={handleInvoice}
        setDocuments={setDocuments}
        newDocument={newDocument}
        setNewDocument={setDocuments}
        setShowProcessSaleModal={setShowProcessSaleModal}
        handleSaleDraft={handleSaleDraft}
        companyAddress={companyAddress}
        companyName={companyName}
        phone={phone}
        email={email}
        date={selectedDate}
        setSelectedDate={setSelectedDate}
        loading={loading}
        setLoading={setLoading}
      />
      <ProcessSaleModal
        refNum={refNum}
        showProcessSaleModal={showProcessSaleModal}
        setShowProcessSaleModal={setShowProcessSaleModal}
        showDraft={showDraft}
        showCompleteSale={showCompleteSale}
        editDraftId={editDraftId}
        handleCompleteSale={handleCompleteSaleDraft}
        handleQuantityChangeNew={handleQuantityChangeNew}
        handleRemoveFromCart={handleRemoveFromCart}
        handleSaveDraft={handleSaveDraft}
        handleAddNewItem={handleAddNewItem}
        documents={documents}
        date={selectedDate}
        setDocuments={setDocuments}
        newDocument={newDocument}
        setNewDocument={setDocuments}
      />

      <div className="bg-white mx-6 shadow-sm rounded-md h-[75vh] overflow-scroll p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Draft List
        </h2>
        <DataTable
          className="z-0"
          columns={columns}
          data={filteredDrafts}
          pagination
          highlightOnHover
          responsive
          striped
          subHeader
          subHeaderComponent={
            <input
              type="text"
              placeholder="Search drafts"
              className="p-2 border border-gray-300 rounded-md"
              onChange={(e) => setFilterText(e.target.value)}
            />
          }
        />
      </div>
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
                  {" "}
                  {selectedDate
                    ? new Date(selectedDate).toLocaleDateString("en-US")
                    : new Date().toLocaleDateString("en-US")}{" "}
                </span>
              </p>
            </div>

            {/* Right Section - Company Logo */}
            <div>
              <img
                src={"images/logo.png"}
                alt="AptBooks Logo"
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
};

export default Draft;
