import { useState, useEffect } from 'react';
import DataTable from 'react-data-table-component';
import { 
  PlusIcon, EditIcon, Trash2Icon, 
  ChevronDownIcon, ChevronUpIcon,
  TrendingUpIcon, TrendingDownIcon
} from 'lucide-react';
import API from '../api';
import RevaluationModal from './RevaluationModal';

const RevaluationImpairment = () => {
  const [revaluations, setRevaluations] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRevaluation, setCurrentRevaluation] = useState(null);

  // Fetch data from API
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch revaluations with asset info
      const revaluationsResponse = await API.get('/revaluations/');
      setRevaluations(revaluationsResponse.data);
      
      // Fetch assets for the dropdown in modal
      const assetsResponse = await API.get('/assets/');
      setAssets(assetsResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle create/update revaluation
  const handleSubmit = async (revaluationData) => {
    try {
      if (currentRevaluation) {
        // Update existing revaluation
        await API.put(`/revaluations/${currentRevaluation.id}`, revaluationData);
      } else {
        // Create new revaluation
        await API.post('/revaluations/', revaluationData);
      }
      fetchData();
      setIsModalOpen(false);
      setCurrentRevaluation(null);
    } catch (error) {
      console.error('Error saving revaluation:', error);
    }
  };

  // Handle delete revaluation
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this revaluation record?')) {
      try {
        await API.delete(`/revaluations/${id}`);
        fetchData();
      } catch (error) {
        console.error('Error deleting revaluation:', error);
      }
    }
  };

  // Table columns configuration
  const columns = [
    {
      name: 'Asset',
      selector: row => row.asset_name,
      sortable: true,
    },
    {
      name: 'Date',
      selector: row => new Date(row.revaluation_date).toLocaleDateString(),
      sortable: true,
    },
    {
      name: 'Old Value',
      selector: row => `₵${parseFloat(row.old_value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sortable: true,
      right: true,
    },
    {
      name: 'New Value',
      selector: row => `₵${parseFloat(row.new_value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sortable: true,
      right: true,
    },
    {
      name: 'Change',
      cell: row => {
        const change = ((row.new_value - row.old_value) / row.old_value * 100);
        return (
          <div className={`flex items-center ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? (
              <TrendingUpIcon className="w-4 h-4 mr-1" />
            ) : (
              <TrendingDownIcon className="w-4 h-4 mr-1" />
            )}
            {Math.abs(change).toFixed(2)}%
          </div>
        );
      },
      sortable: true,
      sortFunction: (a, b) => {
        const changeA = ((a.new_value - a.old_value) / a.old_value * 100);
        const changeB = ((b.new_value - b.old_value) / b.old_value * 100);
        return changeA - changeB;
      },
      right: true,
    },
    {
      name: 'Actions',
      cell: (row) => (
        <div className="flex space-x-2">
          <button 
            onClick={() => {
              setCurrentRevaluation(row);
              setIsModalOpen(true);
            }}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
            title="Edit"
          >
            <EditIcon className="w-4 h-4" />
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
        <h2 className="text-2xl font-semibold text-gray-800">Revaluations & Impairments</h2>
        <button
          onClick={() => {
            setCurrentRevaluation(null);
            setIsModalOpen(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Record
        </button>
      </div>

      <DataTable
        columns={columns}
        data={revaluations}
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
          cells: {
            style: {
              paddingTop: '0.5rem',
              paddingBottom: '0.5rem',
            },
          },
        }}
      />

      <RevaluationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setCurrentRevaluation(null);
        }}
        onSubmit={handleSubmit}
        revaluation={currentRevaluation}
        assets={assets}
      />
    </div>
  );
};

export default RevaluationImpairment;