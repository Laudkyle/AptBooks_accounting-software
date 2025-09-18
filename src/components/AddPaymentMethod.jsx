import React, { useState, useEffect } from "react";
import API from "../api.js";
import { toast } from "react-toastify";

const AddPaymentMethod = () => {
  const [paymentMethodData, setPaymentMethodData] = useState({
    accountId: "",
    name: "",
    description: "",
  });

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch available accounts to populate the select dropdown
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await API.get("/accounts");
        setAccounts(response.data);
      } catch (error) {
        console.error("Error fetching accounts:", error);
        toast.error("Error fetching accounts.");
      }
    };
    fetchAccounts();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentMethodData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    console.log("accounts : ", accounts)
    e.preventDefault();
    setLoading(true);

    // Check if all fields are filled
    if (!paymentMethodData.accountId || !paymentMethodData.name) {
      setLoading(false);
      toast.error("Account ID and Payment Method Name are required.");
      return;
    }

    try {
      const paymentMethodPayload = {
        account_id: paymentMethodData.accountId,
        name: paymentMethodData.name,
        description: paymentMethodData.description || null,
      };
console.log("payload : ",paymentMethodPayload)
      const response = await API.post("/payment-methods", paymentMethodPayload);

      if (response.status === 201) {
        toast.success("Payment method added successfully.");
        setPaymentMethodData({
          accountId: "",
          name: "",
          description: "",
        });
      }
    } catch (error) {
      console.error("Error adding payment method:", error);
      toast.error("Error adding payment method. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">Add Payment Method</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col">
            <label htmlFor="accountId" className="text-gray-600">Linked Account</label>
            <select
              name="accountId"
              id="accountId"
              value={paymentMethodData.accountId}
              onChange={handleInputChange}
              required
              className="mt-2 p-3 border border-gray-300 rounded-md"
            >
              <option value="">Select Account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.account_name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label htmlFor="name" className="text-gray-600">Payment Method Name</label>
            <input
              type="text"
              name="name"
              id="name"
              value={paymentMethodData.name}
              onChange={handleInputChange}
              required
              className="mt-2 p-3 border border-gray-300 rounded-md"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="description" className="text-gray-600">Description (Optional)</label>
            <textarea
              name="description"
              id="description"
              value={paymentMethodData.description}
              onChange={handleInputChange}
              rows="3"
              className="mt-2 p-3 border border-gray-300 rounded-md"
            ></textarea>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
          >
            {loading ? "Processing..." : "Add Payment Method"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddPaymentMethod;
