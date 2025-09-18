import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  EditIcon,
  FileTextIcon,
  TrendingUpIcon,
  DiamondPercentIcon,
  RepeatIcon,
} from "lucide-react";
import API from "../api";
import DepreciationChart from "./DepreciationChart";
import AssetModal from "./AssetModal";

const AssetDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAsset, setCurrentAsset] = useState(null);

  // Fetch asset data from API
  const fetchAssetData = async () => {
    try {
      setLoading(true);
      const response = await API.get(`/assets/${id}`);
      setAsset(response.data);
    } catch (error) {
      console.error("Error fetching asset data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle create/update asset
  const handleSubmit = async (assetData) => {
    setLoading(true);
    try {
      if (currentAsset) {
        // Update existing asset
        await API.put(`/assets/${currentAsset.id}`, assetData);
      }
      fetchAssetData();

      setIsModalOpen(false);
      setCurrentAsset(null);
      setLoading(false);
    } catch (error) {
      console.error("Error saving asset:", error);
    }finally{
      setLoading(false)
    }
  };

  useEffect(() => {
    fetchAssetData();
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">Asset not found</p>
        <button
          onClick={() => navigate("/fixed-assets")}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Back to Assets
        </button>
      </div>
    );
  }

  // Calculate current value
  const totalDepreciation = asset.depreciation_entries.reduce(
    (sum, entry) => sum + parseFloat(entry.amount),
    0
  );
  const currentValue = asset.purchase_price - totalDepreciation;

  return (
    <div className="p-6 bg-white rounded-lg shadow overflow-y-scroll h-[85vh]">
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate("/fixed-assets")}
          className="flex items-center mr-4 text-blue-600 hover:text-blue-800"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-1" />
          Back
        </button>
        <h2 className="text-2xl font-semibold text-gray-800">{asset.name}</h2>
        <button
          disabled={loading}
          onClick={() => {
            setIsModalOpen(true);
            setCurrentAsset(asset);
          }}
          className="ml-auto flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <EditIcon className="w-4 h-4 mr-2" />
          Edit Asset
        </button>
      </div>

      {/* Asset Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <h3 className="text-sm font-medium text-blue-800">Purchase Value</h3>
          <p className="text-2xl font-bold">
            ${asset.purchase_price.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600">
            {new Date(asset.purchase_date).toLocaleDateString()}
          </p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
          <h3 className="text-sm font-medium text-purple-800">Current Value</h3>
          <p className="text-2xl font-bold">
            $
            {currentValue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <p className="text-sm text-gray-600">
            {asset.depreciation_method.replace(/_/g, " ")} method
          </p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-100">
          <h3 className="text-sm font-medium text-green-800">Category</h3>
          <p className="text-xl font-semibold">{asset.category_name}</p>
          <p className="text-sm text-gray-600">{asset.category_description}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("details")}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === "details"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <FileTextIcon className="w-4 h-4 mr-2" />
            Details
          </button>
          <button
            onClick={() => setActiveTab("depreciation")}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === "depreciation"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <DiamondPercentIcon className="w-4 h-4 mr-2" />
            Depreciation
          </button>
          <button
            onClick={() => setActiveTab("transactions")}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === "transactions"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <RepeatIcon className="w-4 h-4 mr-2" />
            Transactions
          </button>
          <button
            onClick={() => setActiveTab("revaluations")}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === "revaluations"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <TrendingUpIcon className="w-4 h-4 mr-2" />
            Revaluations
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mb-6">
        {activeTab === "details" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Asset Information
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Asset Name</p>
                  <p className="font-medium">{asset.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="font-medium">{asset.category_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Purchase Date</p>
                  <p className="font-medium">
                    {new Date(asset.purchase_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Useful Life</p>
                  <p className="font-medium">{asset.useful_life} years</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Financial Details
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Purchase Price</p>
                  <p className="font-medium">
                    ${asset.purchase_price.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Residual Value</p>
                  <p className="font-medium">
                    ${asset.residual_value.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Depreciation Method</p>
                  <p className="font-medium">
                    {asset.depreciation_method
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Depreciation</p>
                  <p className="font-medium">
                    $
                    {totalDepreciation.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "depreciation" && (
          <div>
            <div className="mb-6 h-64">
              <DepreciationChart
                purchasePrice={asset.purchase_price}
                depreciationEntries={asset.depreciation_entries}
                usefulLife={asset.useful_life}
              />
            </div>

            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Depreciation History
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {asset.depreciation_entries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(entry.period).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        $
                        {parseFloat(entry.amount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.method
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "transactions" && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Transaction History
            </h3>
            {asset.transactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {asset.transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              transaction.transaction_type === "addition"
                                ? "bg-green-100 text-green-800"
                                : transaction.transaction_type === "disposal"
                                ? "bg-red-100 text-red-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {transaction.transaction_type
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(
                            transaction.transaction_date
                          ).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {transaction.notes || "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">
                No transactions recorded for this asset.
              </p>
            )}
          </div>
        )}

        {activeTab === "revaluations" && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Revaluation History
            </h3>
            {asset.revaluations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Old Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        New Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Change
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reason
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {asset.revaluations.map((reval) => {
                      const change =
                        ((reval.new_value - reval.old_value) /
                          reval.old_value) *
                        100;
                      return (
                        <tr key={reval.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(
                              reval.revaluation_date
                            ).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            $
                            {parseFloat(reval.old_value).toLocaleString(
                              undefined,
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            $
                            {parseFloat(reval.new_value).toLocaleString(
                              undefined,
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </td>
                          <td
                            className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                              change >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {change.toFixed(2)}%
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {reval.reason || "N/A"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">
                No revaluations recorded for this asset.
              </p>
            )}
          </div>
        )}
      </div>
      <AssetModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setCurrentAsset(null);
        }}
        onSubmit={handleSubmit}
        asset={currentAsset}
      />
    </div>
  );
};

export default AssetDetails;
