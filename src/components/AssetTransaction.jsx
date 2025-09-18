import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from 'react-data-table-component';
import { 
  PlusIcon, EditIcon, Trash2Icon, EyeIcon,
  ChevronDownIcon, ChevronUpIcon 
} from 'lucide-react';
import API from '../api';
import TransactionModal from './TransactionModal';

const AssetTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState(null);
  const navigate = useNavigate();

  // Fetch data from API
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch transactions with asset info
      const transactionsResponse = await API.get('/transactions/');
      setTransactions(transactionsResponse.data);
      
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

  // Handle create/update transaction
  const handleSubmit = async (transactionData) => {
    try {
      if (currentTransaction) {
        // Update existing transaction
        await API.put(`/transactions/${currentTransaction.id}`, transactionData);
      } else {
        // Create new transaction
        await API.post('/transactions/', transactionData);
      }
      fetchData();
      setIsModalOpen(false);
      setCurrentTransaction(null);
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  };

  // Handle delete transaction
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await API.delete(`/transactions/${id}`);
        fetchData();
      } catch (error) {
        console.error('Error deleting transaction:', error);
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
      name: 'Transaction Type',
      selector: row => row.transaction_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      sortable: true,
    },
    {
      name: 'Date',
      selector: row => new Date(row.transaction_date).toLocaleDateString(),
      sortable: true,
    },
    {
      name: 'Notes',
      selector: row => row.notes || 'N/A',
      sortable: true,
      wrap: true,
    },
    {
      name: 'Actions',
      cell: (row) => (
        <div className="flex space-x-2">
          <button 
            onClick={() => {
              setCurrentTransaction(row);
              setIsModalOpen(true);
            }}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
            title="Edit"
          >
            <EditIcon className="w-4 h-4" />
          </button>
          <button 
            onClick={() => navigate(`/asset-details/${row.asset_id}`)}
            className="p-1 text-green-600 hover:bg-green-50 rounded"
            title="View Asset"
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
        <h2 className="text-2xl font-semibold text-gray-800">Additions & Disposals</h2>
        <button
          onClick={() => {
            setCurrentTransaction(null);
            setIsModalOpen(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Transaction
        </button>
      </div>

      <DataTable
        columns={columns}
        data={transactions}
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

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setCurrentTransaction(null);
        }}
        onSubmit={handleSubmit}
        transaction={currentTransaction}
        assets={assets}
      />
    </div>
  );
};

export default AssetTransactions;