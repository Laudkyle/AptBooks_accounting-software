import React, { useEffect, useState } from "react";
import API from "../api.js";
import { formatCurrency } from "../utils/helpers"; // Utility to format currency

const CashFlowStatement = () => {
  const [cashFlowData, setCashFlowData] = useState({
    operatingActivities: [],
    investingActivities: [],
    financingActivities: [],
    netCashFlow: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCashFlowStatement = async () => {
      try {
        setLoading(true);
        const response = await API.get("/reports/cash-flow");
        setCashFlowData(response.data);
      } catch (err) {
        setError("Failed to load cash flow data.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCashFlowStatement();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  const { operatingActivities, investingActivities, financingActivities, netCashFlow } = cashFlowData;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow rounded-md max-h-[calc(100vh-100px)] overflow-y-scroll">
      <h2 className="text-2xl font-bold mb-6">Cash Flow Statement</h2>

      {/* Operating Activities Section */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Operating Activities</h3>
        <div className="bg-gray-100 p-4 rounded">
          {operatingActivities.length > 0 ? (
            operatingActivities.map((item) => (
              <div
                key={item.account_name}
                className="flex justify-between items-center py-2 border-b last:border-b-0"
              >
                <span>{item.account_name}</span>
                <span>{formatCurrency(item.amount)}</span>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No operating activities recorded.</p>
          )}
        </div>
      </div>

      {/* Investing Activities Section */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Investing Activities</h3>
        <div className="bg-gray-100 p-4 rounded">
          {investingActivities.length > 0 ? (
            investingActivities.map((item) => (
              <div
                key={item.account_name}
                className="flex justify-between items-center py-2 border-b last:border-b-0"
              >
                <span>{item.account_name}</span>
                <span>{formatCurrency(item.amount)}</span>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No investing activities recorded.</p>
          )}
        </div>
      </div>

      {/* Financing Activities Section */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Financing Activities</h3>
        <div className="bg-gray-100 p-4 rounded">
          {financingActivities.length > 0 ? (
            financingActivities.map((item) => (
              <div
                key={item.account_name}
                className="flex justify-between items-center py-2 border-b last:border-b-0"
              >
                <span>{item.account_name}</span>
                <span>{formatCurrency(item.amount)}</span>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No financing activities recorded.</p>
          )}
        </div>
      </div>

      {/* Net Cash Flow */}
      <div className={`p-4 rounded font-bold ${netCashFlow >= 0 ? "bg-green-100" : "bg-red-100"}`}>
        <div className="flex justify-between items-center">
          <span>Net Cash Flow:</span>
          <span>{formatCurrency(netCashFlow)}</span>
        </div>
      </div>
    </div>
  );
};

export default CashFlowStatement;
