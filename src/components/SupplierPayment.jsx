import React, { useState, useEffect } from "react";
import API from "../api.js";
import { toast} from "react-toastify"; // Ensure react-toastify is installed

const SupplierPayment = () => {
  const [paymentData, setPaymentData] = useState({
    supplierId: "",
    purchaseOrderId: "",
    amountPaid: "",
    paymentMethod: "",
    paymentReference: "",
    paymentDate: new Date().toISOString(),
    documents: [],
    errorMessage: "",
  });

  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null); // Track selected purchase order
  const [paymentMethods, setPaymentMethods] = useState([]); // State for payment methods
  const [loading, setLoading] = useState(false);

  // Fetch suppliers
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const response = await API.get("/suppliers");
        setSuppliers(response.data);
      } catch (error) {
        console.error("Error fetching suppliers:", error);
        toast.error("Error fetching suppliers data.");
      }
    };
    fetchSuppliers();
  }, []);

  // Fetch payment methods
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const response = await API.get("/payment-methods");
        setPaymentMethods(response.data);
      } catch (error) {
        console.error("Error fetching payment methods:", error);
        toast.error("Error fetching payment methods.");
      }
    };
    fetchPaymentMethods();
  }, []);

  const generateReferenceNumber = () => {
    const uniqueNumber = parseInt(Date.now()) + Math.floor(Math.random() * 1000000);
    return `SUP- ${uniqueNumber}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // If changing amount paid, validate it doesn't exceed the balance due
    if (name === "amountPaid" && selectedOrder) {
      const amount = parseFloat(value);
      const balanceDue = parseFloat(selectedOrder.balance_due);
      
      if (amount > balanceDue) {
        setPaymentData((prevData) => ({
          ...prevData,
          [name]: balanceDue,
          errorMessage: `Amount cannot exceed balance due of ${balanceDue}`
        }));
        toast.error(`Amount cannot exceed balance due of ${balanceDue}`);
        return;
      } else {
        setPaymentData((prevData) => ({
          ...prevData,
          [name]: value,
          errorMessage: ""
        }));
        return;
      }
    }
    
    setPaymentData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSupplierChange = async (e) => {
    const supplierId = e.target.value;

    setPaymentData((prevData) => ({
      ...prevData,
      supplierId,
      purchaseOrderId: "",
      amountPaid: "",
    }));
    
    setSelectedOrder(null);

    if (supplierId) {
      try {
        const response = await API.get(
          `/suppliers/purchase_orders/${supplierId}`
        );
        
        const filteredOrders = response.data.filter(
          (order) => order.status === "unpaid" || order.status === "partial"
        );
        setPurchaseOrders(filteredOrders);
        
        // Warning if no orders found
        if (filteredOrders.length === 0) {
          toast.warning("No unpaid/partial purchase orders for this supplier.");
        }

      } catch (error) {
        if (error.response?.status === 404) {
          toast.warning("No purchase orders found for this supplier.");
          setPurchaseOrders([]);
        } else {
          console.error("Error fetching purchase orders:", error);
          toast.error("Error fetching purchase orders.");
        }
      }
    } else {
      setPurchaseOrders([]);
    }
  };

  const handlePurchaseOrderChange = (e) => {
    const orderId = e.target.value;
    setPaymentData((prevData) => ({
      ...prevData,
      purchaseOrderId: orderId,
      amountPaid: "",
    }));
    
    if (orderId) {
      const selected = purchaseOrders.find(order => order.purchase_order_id == orderId);
      setSelectedOrder(selected);
      // Auto-fill the amount with the balance due
      if (selected) {
        setPaymentData((prevData) => ({
          ...prevData,
          amountPaid: selected.balance_due
        }));
      }
    } else {
      setSelectedOrder(null);
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = e.target.files;
    const maxFileSize = 4 * 1024 * 1024;

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

      setPaymentData((prevData) => ({
        ...prevData,
        documents: [...prevData.documents, ...validFiles],
      }));

      if (rejectedFiles.length > 0) {
        toast.error(
          `The following files exceed the 4MB limit: ${rejectedFiles.join(", ")}`
        );
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
  
    const referenceNumber = generateReferenceNumber();
  
    if (!paymentData.amountPaid || paymentData.amountPaid <= 0) {
      setLoading(false);
      toast.error("Please enter a valid payment amount.");
      return;
    }
    
    // Final validation to ensure amount doesn't exceed balance due
    if (selectedOrder && parseFloat(paymentData.amountPaid) > parseFloat(selectedOrder.balance_due)) {
      setLoading(false);
      toast.error(`Amount cannot exceed balance due of ${selectedOrder.balance_due}`);
      return;
    }
  
    const paymentPayload = {
      supplier_id: paymentData.supplierId,
      purchase_order_id: paymentData.purchaseOrderId,
      payment_reference: referenceNumber,
      payment_date: paymentData.paymentDate,
      amount_paid: paymentData.amountPaid,
      payment_method: paymentData.paymentMethod,
    };
  
    try {
      // Send payment data to the backend
      const paymentResponse = await API.post(
        "/supplier_payments",
        paymentPayload
      );
  
      // If there are documents to upload, handle file uploads
      if (paymentData.documents.length > 0) {
        const formData = new FormData();
        formData.append("transaction_type", "payment");
        formData.append("reference_number", referenceNumber);
  
        paymentData.documents.forEach((file) => {
          formData.append("files", file);
        });
  
        await API.post("/documents", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      }
  
      // Check if the payment was successful
      if (paymentResponse.status === 201) {
        toast.success("Supplier payment processed successfully.");
        setPaymentData({
          supplierId: "",
          purchaseOrderId: "",
          amountPaid: "",
          paymentMethod: "",
          paymentReference: "",
          paymentDate: new Date().toISOString(),
          documents: [],
          errorMessage: "",
        });
        setPurchaseOrders([]);
        setSelectedOrder(null);
      }
    } catch (error) {
      if (error.response || error.response.data) {
        // Display backend error message, such as insufficient balance
        toast.error(error.response.data);
      } else {
        console.error("Error processing payment:", error);
        toast.error("Error processing payment. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">Supplier Payment</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col">
            <label htmlFor="supplierId" className="text-gray-600">Supplier</label>
            <select
              name="supplierId"
              id="supplierId"
              value={paymentData.supplierId}
              onChange={handleSupplierChange}
              required
              className="mt-2 p-3 border border-gray-300 rounded-md"
            >
              <option value="">Select Supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name|| supplier.business_name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label htmlFor="purchaseOrderId" className="text-gray-600">Purchase Order</label>
            <select
              name="purchaseOrderId"
              id="purchaseOrderId"
              value={paymentData.purchaseOrderId}
              onChange={handlePurchaseOrderChange}
              required
              disabled={!purchaseOrders.length}
              className="mt-2 p-3 border border-gray-300 rounded-md"
            >
              <option value="">Select Purchase Order</option>
              {purchaseOrders.map((order) => (
                <option key={order.id} value={order.purchase_order_id}>
                  {`Order #${order.id} - Amount Due: ${order.balance_due}`}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label htmlFor="amountPaid" className="text-gray-600">Amount Paid</label>
            <input
              type="number"
              name="amountPaid"
              id="amountPaid"
              value={paymentData.amountPaid}
              onChange={handleInputChange}
              required
              min="0"
              step="0.01"
              max={selectedOrder ? selectedOrder.balance_due : undefined}
              className="mt-2 p-3 border border-gray-300 rounded-md"
            />
            {paymentData.errorMessage && (
              <p className="text-red-500 text-sm mt-1">{paymentData.errorMessage}</p>
            )}
          </div>
          <div className="flex flex-col">
            <label htmlFor="paymentMethod" className="text-gray-600">Payment Method</label>
            <select
              name="paymentMethod"
              id="paymentMethod"
              value={paymentData.paymentMethod}
              onChange={handleInputChange}
              className="mt-2 p-3 border border-gray-300 rounded-md"
            >
              <option value="">Select Payment Method</option>
              {paymentMethods.map((method) => (
                <option key={method.id} value={method.name}>
                  {method.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label htmlFor="document" className="text-gray-600">Attach Documents</label>
            <input
              type="file"
              onChange={handleFileChange}
              accept="application/pdf, image/*"
              multiple
              className="mt-2 p-3 border border-gray-300 rounded-md"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
          >
            {loading ? "Processing..." : "Submit Payment"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SupplierPayment;