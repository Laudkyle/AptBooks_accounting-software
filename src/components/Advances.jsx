import React, { useState, useEffect } from "react";
import API from "../api.js";
import { toast } from "react-toastify";

const SupplierAdvancePayment = () => {
  const [formData, setFormData] = useState({
    supplierId: "",
    amount: "",
    payment_linked_account: "",
     payment_method_id: "",
    paymentDate: new Date().toISOString().split('T')[0],
    reference: "",
    notes: ""
  });

  
  const [suppliers, setSuppliers] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentAdvance, setCurrentAdvance] = useState(0);

  // Fetch suppliers and payment methods
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [suppliersRes, methodsRes] = await Promise.all([
          API.get("/suppliers"),
          API.get("/payment-methods")
        ]);
        setSuppliers(suppliersRes.data);
        setPaymentMethods(methodsRes.data);
        console.log(paymentMethods)
      } catch (error) {
        toast.error("Error loading initial data");
        console.error(error);
      }
    };
    fetchData();
  }, []);

  // Fetch current advance balance when supplier changes
  useEffect(() => {
    if (formData.supplierId) {
      API.get(`/suppliers/${formData.supplierId}`)
        .then(res => {
          setCurrentAdvance(res.data.advance_balance || 0);
        })
        .catch(err => {
          console.error("Error fetching supplier details:", err);
        });
    }
  }, [formData.supplierId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.supplierId || !formData.amount || !formData.payment_method_id) {
      toast.error("Please fill all required fields");
      setLoading(false);
      return;
    }

    try {
      const response = await API.post(
        `/suppliers/${formData.supplierId}/advance-payments`,
        formData
      );

      toast.success(`Advance payment recorded! New advance balance: ${response.data.newAdvanceBalance}`);
      
      // Reset form
      setFormData({
        supplierId: "",
        amount: "",
        payment_method_id: "",
        paymentDate: new Date().toISOString().split('T')[0],
        reference: "",
        notes: ""
      });
      setCurrentAdvance(0);

    } catch (error) {
      console.error("Payment error:", error);
      const errorMsg = error.response?.data?.error || "Failed to process advance payment";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Supplier Advance Payment</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Supplier Selection */}
          <div className="flex flex-col">
            <label className="text-gray-600 mb-1">Supplier *</label>
            <select
              name="supplierId"
              value={formData.supplierId}
              onChange={handleChange}
              required
              className="p-3 border border-gray-300 rounded-md"
            >
              <option value="">Select Supplier</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.business_name || supplier.name}
                </option>
              ))}
            </select>
            {formData.supplierId && (
              <p className="mt-2 text-sm text-gray-500">
                Current Advance: {currentAdvance}
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div className="flex flex-col">
            <label className="text-gray-600 mb-1">Payment Method *</label>
            <select
              name="payment_method_id"
              value={formData.payment_method_id}
              onChange={handleChange}
              required
              className="p-3 border border-gray-300 rounded-md"
            >
              <option value="">Select Method</option>
              {paymentMethods.map(method => (
                <option key={method.id} value={method.id}>
                  {method.name}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div className="flex flex-col">
            <label className="text-gray-600 mb-1">Amount *</label>
            <input
              type="number"
              name="amount"
              min="0.01"
              step="0.01"
              value={formData.amount}
              onChange={handleChange}
              required
              className="p-3 border border-gray-300 rounded-md"
              placeholder="0.00"
            />
          </div>

          {/* Payment Date */}
          <div className="flex flex-col">
            <label className="text-gray-600 mb-1">Payment Date</label>
            <input
              type="date"
              name="paymentDate"
              value={formData.paymentDate}
              onChange={handleChange}
              className="p-3 border border-gray-300 rounded-md"
            />
          </div>

          {/* Reference */}
          <div className="flex flex-col">
            <label className="text-gray-600 mb-1">Reference</label>
            <input
              type="text"
              name="reference"
              value={formData.reference}
              onChange={handleChange}
              className="p-3 border border-gray-300 rounded-md"
              placeholder="Optional reference"
            />
          </div>

          {/* Notes */}
          <div className="flex flex-col">
            <label className="text-gray-600 mb-1">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="p-3 border border-gray-300 rounded-md"
              rows="2"
              placeholder="Additional notes"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "Processing..." : "Record Advance Payment"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SupplierAdvancePayment;