import { useState, useEffect } from 'react';
import DataTable from 'react-data-table-component';
import { 
  PlusIcon, EditIcon, Trash2Icon, 
  ChevronDownIcon
} from 'lucide-react';
import API from '../api';
import DepreciationModal from './DepreciationModal';
import { toast } from 'react-toastify';
const Depreciation = () => {
  const [depreciations, setDepreciations] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEntry, setCurrentEntry] = useState(null);

  // Fetch data from API
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch depreciation entries with asset info
      const depResponse = await API.get('/depreciation/');
      setDepreciations(depResponse.data);
      
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

  // Handle create/update depreciation entry
  const handleSubmit = async (entryData) => {
    try {
      if (currentEntry) {
        // Update existing entry
        await API.put(`/depreciation/${currentEntry.id}`, entryData);
      } else {
        // Create new entry
        await API.post('/depreciation/', entryData);
      }
      fetchData();
      setIsModalOpen(false);
      setCurrentEntry(null);
      toast.success("Depreciation add successfully")
    } catch (error) {
      console.error('Error saving depreciation entry:', error);
            toast.error("Error saving depreciation")

    }
  };

  // Handle delete entry
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this depreciation entry?')) {
      try {
        await API.delete(`/depreciation/${id}`);
        fetchData();
      } catch (error) {
        console.error('Error deleting entry:', error);
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
      name: 'Period',
      selector: row => new Date(row.period).toLocaleDateString(),
      sortable: true,
    },
    {
      name: 'Amount',
      selector: row => `₵${parseFloat(row.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sortable: true,
      right: true,
    },
    {
      name: 'Method',
      selector: row => row.method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      sortable: true,
    },
    {
      name: 'Actions',
      cell: (row) => (
        <div className="flex space-x-2">
          <button 
            onClick={() => {
              setCurrentEntry(row);
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
        <h2 className="text-2xl font-semibold text-gray-800">Depreciation</h2>
        <button
          onClick={() => {
            setCurrentEntry(null);
            setIsModalOpen(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Entry
        </button>
      </div>

      <DataTable
        columns={columns}
        data={depreciations}
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

      <DepreciationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setCurrentEntry(null);
        }}
        onSubmit={handleSubmit}
        entry={currentEntry}
        assets={assets}
      />
    </div>
  );
};

export default Depreciation;