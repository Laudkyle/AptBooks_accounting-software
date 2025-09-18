import React, { useState, useEffect } from "react";
import API from "../api.js";
import { toast, ToastContainer } from "react-toastify";

const SupplierPaymentModal = ({ isOpen, onClose, supplierId }) => {
  const [paymentData, setPaymentData] = useState({
    purchaseOrderId: "",
    amountPaid: "",
    paymentMethod: "",
    paymentDate: new Date().toISOString(),
  });
  
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (supplierId) {
      API.get(`/suppliers/purchase_orders/${supplierId}`)
        .then(response => {
          setPurchaseOrders(response.data.filter((order) => order.status === "unpaid" || order.status === "partial"));
        })
        .catch(error => toast.info("This supplier doesn't have an outstanding purchase orders."));
    }
  }, [supplierId]);

  useEffect(() => {
    API.get("/payment-methods")
      .then(response => setPaymentMethods(response.data))
      .catch(error => toast.error("Error fetching payment methods."));
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const referenceNumber = `SUP-${Date.now()}`;
    
    if (!paymentData.amountPaid || paymentData.amountPaid <= 0) {
      setLoading(false);
      toast.error("Please enter a valid payment amount.");
      return;
    }

    const paymentPayload = {
      supplier_id: supplierId,
      purchase_order_id: paymentData.purchaseOrderId,
      payment_reference: referenceNumber,
      payment_date: paymentData.paymentDate,
      amount_paid: paymentData.amountPaid,
      payment_method: paymentData.paymentMethod,
    };

    try {
      await API.post("/supplier_payments", paymentPayload);
      toast.success("Supplier payment processed successfully.");
      onClose();
    } catch (error) {
      toast.error(error.response?.data || "Error processing payment.");
    } finally {
      setLoading(false);
      setPaymentData({ 
  purchaseOrderId: "",
    amountPaid: "",
    paymentMethod: "",
    paymentDate: new Date().toISOString(),})
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-lg font-semibold mb-4">Supplier Payment</h2>
        <form onSubmit={handleSubmit}>
          
          <div className="mb-4">
            <label className="block text-gray-700">Purchase Order</label>
            <select
              name="purchaseOrderId"
              value={paymentData.purchaseOrderId}
              onChange={handleInputChange}
              required
              className="w-full p-2 border rounded"
            >
              <option value="">Select Purchase Order</option>
              {purchaseOrders.map(order => (
                <option key={order.id} value={order.purchase_order_id}>
                  {`Order #${order.id} - Due: ${order.total_amount}`}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700">Amount Paid</label>
            <input
              type="number"
              name="amountPaid"
              value={paymentData.amountPaid}
              onChange={handleInputChange}
              required
              className="w-full p-2 border rounded"
              min="1"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700">Payment Method</label>
            <select
              name="paymentMethod"
              value={paymentData.paymentMethod}
              onChange={handleInputChange}
              required
              className="w-full p-2 border rounded"
            >
              <option value="">Select Payment Method</option>
              {paymentMethods.map(method => (
                <option key={method.id} value={method.name}>{method.name}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-500 text-white rounded">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">
              {loading ? "Processing..." : "Submit Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupplierPaymentModal;
