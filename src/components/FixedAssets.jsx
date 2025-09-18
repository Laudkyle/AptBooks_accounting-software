import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from 'react-data-table-component';
import { 
  PlusIcon, EditIcon, Trash2Icon, EyeIcon, 
  ChevronDownIcon, ChevronUpIcon 
} from 'lucide-react';
import API from '../api';
import AssetModal from './AssetModal';

const FixedAssets = () => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAsset, setCurrentAsset] = useState(null);
  const navigate = useNavigate();

  // Fetch assets from API
  const fetchAssets = async () => {
    try {
      setLoading(true);
      const response = await API.get('/assets/');
      setAssets(response.data);
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  // Handle create/update asset
  const handleSubmit = async (assetData) => {
    setLoading(true)
    try {
      if (currentAsset) {
        // Update existing asset
        await API.put(`/assets/${currentAsset.id}`, assetData);
      } else {
        // Create new asset
        await API.post('/assets/', assetData);
      }
      fetchAssets();
      setIsModalOpen(false);
      setCurrentAsset(null);
      setLoading(false)
    } catch (error) {
      console.error('Error saving asset:', error);
    }finally{
      setLoading(false)
    }
  };

  // Handle delete asset
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this asset?')) {
      try {
        await API.delete(`/assets/${id}`);
        fetchAssets();
      } catch (error) {
        console.error('Error deleting asset:', error);
      }
    }
  };

  // Table columns configuration
  const columns = [
    {
      name: 'Name',
      selector: row => row.name,
      sortable: true,
    },
    {
      name: 'Category',
      selector: row => row.category_name,
      sortable: true,
    },
    {
      name: 'Purchase Date',
      selector: row => new Date(row.purchase_date).toLocaleDateString(),
      sortable: true,
    },
    {
      name: 'Purchase Price',
      selector: row => `₵${row.purchase_price.toLocaleString()}`,
      sortable: true,
    },
    {
      name: 'Depreciation Method',
      selector: row => row.depreciation_method,
      sortable: true,
    },
    {
      name: 'Actions',
      cell: (row) => (
        <div className="flex space-x-2">
          <button 
            onClick={() => {
              setCurrentAsset(row);
              setIsModalOpen(true);
            }}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
            title="Edit"
          >
            <EditIcon className="w-4 h-4" />
          </button>
          <button 
            onClick={() => navigate(`/asset-details/${row.id}`)}
            className="p-1 text-green-600 hover:bg-green-50 rounded"
            title="View Details"
          >
            <EyeIcon className="w-4 h-4" />
          </button>
          <button 
            onClick={() => handleDelete(row.id)}
            className="p-1 text-red-600 hover:bg-red-50 rounded"
            title="Delete"
          >
            <Trash2Icon className="w-4 h-4" />
          </button>
        </div>
      ),
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
    },
  ];

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Fixed Assets</h2>
        <button
          onClick={() => {
            setCurrentAsset(null);
            setIsModalOpen(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Asset
        </button>
      </div>

      <DataTable
        columns={columns}
        data={assets}
        progressPending={loading}
        pagination
        paginationPerPage={10}
        paginationRowsPerPageOptions={[10, 25, 50]}
        sortIcon={<ChevronDownIcon />}
        highlightOnHover
        pointerOnHover
        customStyles={{
          headCells: {
            style: {
              fontWeight: '600',
              backgroundColor: '#f9fafb',
            },
          },
        }}
      />

      <AssetModal
        isOpen={isModalOpen}
        loading={loading}
        setLoading={setLoading}
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

export default FixedAssets;