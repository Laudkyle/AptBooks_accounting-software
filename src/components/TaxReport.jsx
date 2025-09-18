import React, { useEffect, useState, useMemo } from 'react';
import { FiDownload, FiSearch, FiFilter, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
import DataTable from 'react-data-table-component';
import API from "../api.js";

const TaxReport = () => {
  // State Management
  const [taxes, setTaxes] = useState([]);
  const [filteredTaxes, setFilteredTaxes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    searchTerm: '',
    startDate: '',
    endDate: '',
    taxType: 'all'
  });

  // Custom DataTable styles
  const customStyles = {
    header: {
      style: {
        minHeight: '56px',
        padding: '16px'
      },
    },
    headRow: {
      style: {
        backgroundColor: '#F9FAFB',
        borderBottom: '1px solid #E5E7EB',
      },
    },
    headCells: {
      style: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#374151',
        paddingLeft: '16px',
        paddingRight: '16px',
      },
    },
    cells: {
      style: {
        paddingLeft: '16px',
        paddingRight: '16px',
      },
    },
  };

  // Fetch tax data
  const fetchTaxes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await API.get('/taxes');
      setTaxes(response.data);
      setFilteredTaxes(response.data);
    } catch (error) {
      setError('Failed to fetch tax data. Please try again later.');
      console.error('Error fetching tax data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxes();
  }, []);

  // Filter handlers
  useEffect(() => {
    handleFiltering();
  }, [filters, taxes]);

  const handleFiltering = () => {
    let filtered = [...taxes];

    if (filters.searchTerm) {
      filtered = filtered.filter(tax =>
        tax.tax_name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        tax.tax_type.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        tax.account_name.toLowerCase().includes(filters.searchTerm)
      );
    }

    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59); // Include the entire end date

      filtered = filtered.filter(tax => {
        const taxDate = new Date(tax.created_on);
        return taxDate >= start && taxDate <= end;
      });
    }

    if (filters.taxType !== 'all') {
      filtered = filtered.filter(tax => tax.tax_type === filters.taxType);
    }

    setFilteredTaxes(filtered);
  };

  // Download handler
  const handleDownload = () => {
    try {
      const reportData = {
        generatedAt: new Date().toISOString(),
        filters: filters,
        data: filteredTaxes
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tax_report_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  // Memoized columns definition
  const columns = useMemo(() => [
    {
      name: 'Tax Name',
      selector: row => row.tax_name,
      sortable: true,
      cell: row => (
        <div className="py-2">
          <div className="font-medium text-gray-900">{row.tax_name}</div>
          <div className="text-sm text-gray-500">ID: {row.id}</div>
        </div>
      ),
    },
    {
      name: 'Tax Rate',
      selector: row => row.tax_rate,
      sortable: true,
      cell: row => (
        <div className="font-medium text-gray-900">
          {row.tax_rate.toFixed(2)}%
        </div>
      ),
    },
    {
      name: 'Tax Type',
      selector: row => row.tax_type,
      sortable: true,
      cell: row => (
        <span className="px-2 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
          {row.tax_type}
        </span>
      ),
    },
    {
      name: 'Account',
      selector: row => row.id,
      sortable: true,
      cell: row => (
        <div className="text-gray-900">
          {row.account_name}
        </div>
      ),
    },
    {
      name: 'Created On',
      selector: row => row.created_on,
      sortable: true,
      cell: row => (
        <div className="text-gray-900">
          {new Date(row.created_on).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </div>
      ),
    },
  ], []);

  return (
    <div className=" bg-gray-50 py-8 max-h-[calc(100vh-100px)] overflow-y-scroll">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Tax Report</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage and analyze your tax records
          </p>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Search..."
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              />
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>

            {/* Date Range */}
            <div>
              <input
                type="date"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div>
              <input
                type="date"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => fetchTaxes()}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <FiRefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={handleDownload}
                disabled={filteredTaxes.length === 0}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
              >
                <FiDownload className="w-5 h-5 mr-2" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <FiAlertCircle className="w-5 h-5 text-red-400 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow">
          <DataTable
            columns={columns}
            data={filteredTaxes}
            progressPending={loading}
            progressComponent={
              <div className="flex items-center justify-center h-64">
                <FiRefreshCw className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            }
            pagination
            paginationPerPage={10}
            paginationRowsPerPageOptions={[10, 25, 50, 100]}
            customStyles={customStyles}
            highlightOnHover
            responsive
            striped
          />
        </div>
      </div>
    </div>
  );
};

export default TaxReport;