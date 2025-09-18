import { useState, useEffect } from 'react';
import DataTable from 'react-data-table-component';
import { 
  PlusIcon, EditIcon, Trash2Icon, 
  ChevronDownIcon, ChevronUpIcon 
} from 'lucide-react';
import API from '../api';
import CategoryModal from './CategoryModal';

const AssetCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null);

  // Fetch categories from API
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await API.get('/categories/');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Handle create/update category
  const handleSubmit = async (categoryData) => {
    try {
      if (currentCategory) {
        // Update existing category
        await API.put(`/categories/${currentCategory.id}`, categoryData);
      } else {
        // Create new category
        await API.post('/categories/', categoryData);
      }
      fetchCategories();
      setIsModalOpen(false);
      setCurrentCategory(null);
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  // Handle delete category
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      try {
        await API.delete(`/categories/${id}`);
        fetchCategories();
      } catch (error) {
        console.error('Error deleting category:', error);
        alert('Cannot delete category because it has associated assets. Please remove assets from this category first.');
      }
    }
  };

  // Table columns configuration
  const columns = [
    {
      name: 'Name',
      selector: row => row.name,
      sortable: true,
      grow: 2,
    },
    {
      name: 'Description',
      selector: row => row.description,
      sortable: true,
      grow: 3,
    },
    {
      name: 'Assets',
      selector: row => row.asset_count,
      sortable: true,
      center: true,
    },
    {
      name: 'Actions',
      cell: (row) => (
        <div className="flex space-x-2">
          <button 
            onClick={() => {
              setCurrentCategory(row);
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
        <h2 className="text-2xl font-semibold text-gray-800">Asset Categories</h2>
        <button
          onClick={() => {
            setCurrentCategory(null);
            setIsModalOpen(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Category
        </button>
      </div>

      <DataTable
        columns={columns}
        data={categories}
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

      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setCurrentCategory(null);
        }}
        onSubmit={handleSubmit}
        category={currentCategory}
      />
    </div>
  );
};

export default AssetCategories;