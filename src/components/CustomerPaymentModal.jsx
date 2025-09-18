import React, { useState, useEffect } from "react";
import API from "../api.js";
import { toast, ToastContainer } from "react-toastify";

const CustomerPaymentModal = ({ isOpen, onClose, customerId }) => {
  const [paymentData, setPaymentData] = useState({
    customerId: "",
    invoiceId: "",
    amountPaid: "",
    paymentMethod: "cash",
    paymentReference: "",
    paymentDate: new Date().toISOString(),
    documents: [],
  });

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchInvoices = async () => {
      if (customerId) {
        try {
          const response = await API.get(
            `/invoices?customerId=${customerId}`
          );
          const filteredInvoices = response.data.filter(
            (invoice) =>
              invoice.status === "partial" || invoice.status === "unpaid"
          );
          setInvoices(filteredInvoices);
        } catch (error) {
          toast.error("Error fetching invoices.");
        }
      } else {
        setInvoices([]);
      }
    };
    fetchInvoices();
  }, [customerId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentData((prevData) => {
      const newData = { ...prevData, [name]: value };
      if (name === "invoiceId") {
        const selectedInvoice = invoices.find(
          (invoice) => invoice.id === parseInt(value)
        );
        newData.paymentReference = selectedInvoice
          ? selectedInvoice.reference_number
          : "";
      }
      return newData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!paymentData.amountPaid || paymentData.amountPaid <= 0) {
      toast.error("Enter a valid payment amount.");
      setLoading(false);
      return;
    }
    if (!paymentData.invoiceId) {
      toast.error("Select an invoice.");
      setLoading(false);
      return;
    }

    const selectedInvoice = invoices.find(
      (invoice) => invoice.id === parseInt(paymentData.invoiceId)
    );
    if (!selectedInvoice) {
      toast.error("Invoice not found.");
      setLoading(false);
      return;
    }

    const remainingBalance =
      selectedInvoice.total_amount - selectedInvoice.amount_paid;
    if (parseFloat(paymentData.amountPaid) > remainingBalance) {
      toast.error("Payment amount exceeds the remaining balance.");
      setLoading(false);
      return;
    }

    const paymentPayload = {
      customerId:selectedInvoice.customer_id,
      reference_number: selectedInvoice.reference_number,
      payment_date: paymentData.paymentDate,
      amount_paid: paymentData.amountPaid,
      payment_method: paymentData.paymentMethod,
      payment_reference: selectedInvoice.reference_number,
    };

    try {
      await API.post("/payments", paymentPayload);
      toast.success("Payment processed successfully.");
      onClose();
    } catch (error) {
      toast.error("Error processing payment.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-lg font-semibold mb-4">Customer Payment</h2>
        <form onSubmit={handleSubmit}>
          
          <div className="mb-4">
            <label className="block text-gray-700">Invoice</label>
            <select
              name="invoiceId"
              value={paymentData.invoiceId}
              onChange={handleInputChange}
              required
              className="w-full p-2 border rounded"
            >
              <option value="">Select Invoice</option>
              {invoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.reference_number} - ₵
                  {(invoice.total_amount - invoice.amount_paid).toFixed(2)}
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
              className="w-full p-2 border rounded"
            >
              <option value="cash">Cash</option>
            </select>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              {loading ? "Processing..." : "Receive Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerPaymentModal;
