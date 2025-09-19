import { useEffect, useState, useCallback } from "react";

export default function AdminDashboard() {
  const showUploader = import.meta.env.VITE_ENABLE_UPLOAD === 'true'; // env check
  const [activeTab, setActiveTab] = useState('database'); // tabs: database, build, pm2
  const [status, setStatus] = useState({ loading: false, message: '' });

  // PM2 Monitor states
  const [processes, setProcesses] = useState([]);
  const [filteredProcesses, setFilteredProcesses] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  // Available status filters
  const statusOptions = [
    { value: 'all', label: 'All Processes' },
    { value: 'online', label: 'Online' },
    { value: 'stopped', label: 'Stopped' },
    { value: 'stopping', label: 'Stopping' },
    { value: 'launching', label: 'Launching' },
    { value: 'errored', label: 'Errored' },
    { value: 'one-launch-status', label: 'One Launch Status' }
  ];

  // Fetch PM2 processes with error handling
  const fetchProcesses = useCallback(async () => {
    if (activeTab !== 'pm2') return;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch("https://app.aptbooks.com/monitor/processes", {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setProcesses(data);
      setConnectionError(null);
    } catch (error) {
      console.error('Failed to fetch processes:', error);
      if (error.name === 'AbortError') {
        setConnectionError('Request timeout - server may be down');
      } else {
        setConnectionError(error.message || 'Failed to fetch processes');
      }
      // Don't clear processes on error, keep showing last known state
    }
  }, [activeTab]);

  // Filter processes based on status and search term
  useEffect(() => {
    let filtered = processes;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status?.toLowerCase() === statusFilter);
    }

    // Filter by search term (name or id)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(term) || 
        p.id?.toString().includes(term)
      );
    }

    setFilteredProcesses(filtered);
  }, [processes, statusFilter, searchTerm]);

  // Initial fetch and auto-refresh setup
  useEffect(() => {
    if (activeTab === 'pm2') {
      fetchProcesses();
      
      if (autoRefresh) {
        const interval = setInterval(fetchProcesses, 5000); // Refresh every 5 seconds
        setRefreshInterval(interval);
      }
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    };
  }, [activeTab, autoRefresh, fetchProcesses]);

  // Handle auto-refresh toggle
  const toggleAutoRefresh = () => {
    setAutoRefresh(prev => !prev);
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  };

  // Stream logs when a process is selected
  useEffect(() => {
    if (!selectedId) {
      setLogs([]);
      return;
    }
    
    setLogs([]);
    const evtSource = new EventSource(`https://app.aptbooks.com/monitor/logs/${selectedId}`);
    
    evtSource.onmessage = (e) => {
      setLogs(prev => {
        const newLogs = [...prev, e.data];
        // Keep only last 1000 lines to prevent memory issues
        return newLogs.slice(-1000);
      });
    };

    evtSource.onerror = (error) => {
      console.error('EventSource error:', error);
      setLogs(prev => [...prev, `[ERROR] Connection to logs failed`]);
    };
    
    return () => {
      evtSource.close();
    };
  }, [selectedId]);

  // Database upload with better error handling
  const handleDatabaseUpload = async () => {
    setStatus({ loading: true, message: 'Preparing database upload...' });
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const localResponse = await fetch('http://localhost:5100/api/local-db', { 
        signal: controller.signal
      });
      
      if (!localResponse.ok) {
        throw new Error(`Failed to fetch local database: ${localResponse.statusText}`);
      }
      
      const blob = await localResponse.blob();
      clearTimeout(timeoutId);
      
      const formData = new FormData();
      formData.append('database', blob, 'shopdb.sqlite');
      
      setStatus({ loading: true, message: 'Uploading database to server...' });
      
      const uploadTimeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout for upload
      const uploadResponse = await fetch('https://app.ryamex.com/upp/api/upload-db', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      
      clearTimeout(uploadTimeoutId);
      
      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed: ${uploadResponse.statusText}`);
      }
      
      const result = await uploadResponse.json();
      setStatus({ loading: false, message: result.message || 'Database uploaded successfully!' });
    } catch (error) {
      if (error.name === 'AbortError') {
        setStatus({ loading: false, message: 'Database upload timeout - please try again' });
      } else {
        setStatus({ loading: false, message: error.message || 'Database upload failed' });
      }
    }
  };

  // Build upload with better error handling
  const handleBuildUpload = async () => {
    setStatus({ loading: true, message: 'Preparing build upload...' });
    try {
      const localResponse = await fetch('../../dist.zip');
      if (!localResponse.ok) {
        throw new Error(`Failed to fetch build file: ${localResponse.statusText}`);
      }
      
      const blob = await localResponse.blob();
      const formData = new FormData();
      formData.append('dist', blob, 'dist.zip');
      
      setStatus({ loading: true, message: 'Uploading build to VPS...' });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout for build upload
      
      const uploadResponse = await fetch('https://app.aptbooks.com/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed: ${uploadResponse.statusText}`);
      }
      
      const result = await uploadResponse.json();
      setStatus({ loading: false, message: result.message || 'Build uploaded successfully!' });
    } catch (error) {
      if (error.name === 'AbortError') {
        setStatus({ loading: false, message: 'Build upload timeout - please try again' });
      } else {
        setStatus({ loading: false, message: error.message || 'Build upload failed' });
      }
    }
  };

  // Get status color for process status
  const getStatusColor = (processStatus) => {
    switch (processStatus?.toLowerCase()) {
      case 'online': return 'text-green-600';
      case 'stopped': return 'text-red-600';
      case 'stopping': return 'text-yellow-600';
      case 'launching': return 'text-blue-600';
      case 'errored': return 'text-red-800';
      default: return 'text-gray-600';
    }
  };

  // Get count for each status
  const getStatusCounts = () => {
    const counts = {};
    processes.forEach(p => {
      const status = p.status?.toLowerCase() || 'unknown';
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>

      {/* Tabs */}
      <div className="flex border-b mb-4">
        {showUploader && (
          <>
            <button
              onClick={() => setActiveTab('database')}
              className={`py-2 px-4 -mb-px border-b-2 font-medium ${activeTab === 'database' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
            >
              Database
            </button>
            <button
              onClick={() => setActiveTab('build')}
              className={`py-2 px-4 -mb-px border-b-2 font-medium ${activeTab === 'build' ? 'border-green-500 text-green-500' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
            >
              Build
            </button>
          </>
        )}
        <button
          onClick={() => setActiveTab('pm2')}
          className={`py-2 px-4 -mb-px border-b-2 font-medium ${activeTab === 'pm2' ? 'border-purple-500 text-purple-500' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
        >
          PM2 Monitor
          {processes.length > 0 && (
            <span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
              {processes.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'database' && showUploader && (
          <div className="bg-white p-6 rounded shadow-md">
            <h2 className="text-xl font-bold mb-4">Database Sync</h2>
            <p className="text-gray-600 mb-4">Sync your local database with the remote server.</p>
            <button
              onClick={handleDatabaseUpload}
              disabled={status.loading}
              className={`w-full py-2 px-4 rounded-md text-white font-medium
                ${status.loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                transition-colors duration-200`}
            >
              {status.loading ? 'Syncing Database...' : 'Sync Database Now'}
            </button>
          </div>
        )}

        {activeTab === 'build' && showUploader && (
          <div className="bg-white p-6 rounded shadow-md">
            <h2 className="text-xl font-bold mb-4">Build Upload</h2>
            <p className="text-gray-600 mb-4">Upload your latest build to the VPS server.</p>
            <button
              onClick={handleBuildUpload}
              disabled={status.loading}
              className={`w-full py-2 px-4 rounded-md text-white font-medium
                ${status.loading ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}
                focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
                transition-colors duration-200`}
            >
              {status.loading ? 'Uploading Build...' : 'Upload Build to VPS'}
            </button>
          </div>
        )}

        {activeTab === 'pm2' && (
          <div className="space-y-4">
            {/* PM2 Controls */}
            <div className="bg-white p-4 rounded shadow-md">
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Filter by status:</label>
                  <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                        {option.value !== 'all' && statusCounts[option.value] ? ` (${statusCounts[option.value]})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Search:</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Process name or ID"
                    className="border rounded px-3 py-1 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <button
                  onClick={fetchProcesses}
                  disabled={status.loading}
                  className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:bg-purple-400"
                >
                  Refresh
                </button>
                
                <button
                  onClick={toggleAutoRefresh}
                  className={`px-3 py-1 rounded text-sm ${
                    autoRefresh 
                      ? 'bg-green-600 text-white hover:bg-green-700' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
                </button>
              </div>
              
              {connectionError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  <strong>Connection Error:</strong> {connectionError}
                </div>
              )}
            </div>

            {/* Process List and Logs */}
            <div className="flex gap-4">
              <div className="w-1/3 bg-gray-100 p-2 rounded max-h-[500px] overflow-auto">
                <h2 className="font-bold mb-2">
                  Processes ({filteredProcesses.length}/{processes.length})
                </h2>
                {filteredProcesses.length === 0 ? (
                  <div className="text-gray-500 text-sm p-4 text-center">
                    {processes.length === 0 ? 'No processes found' : 'No processes match your filters'}
                  </div>
                ) : (
                  filteredProcesses.map(p => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedId(p.id)}
                      className={`p-2 rounded cursor-pointer transition-colors ${
                        selectedId === p.id ? 'bg-purple-200' : 'hover:bg-gray-200'
                      }`}
                    >
                      <div className="font-medium">{p.name}</div>
                      <div className="text-sm">
                        <span className={`font-medium ${getStatusColor(p.status)}`}>
                          {p.status || 'unknown'}
                        </span>
                        {' | '}
                        <span>CPU: {p.cpu || 0}%</span>
                        {' | '}
                        <span>MEM: {p.memory ? (p.memory/1024/1024).toFixed(2) : '0'} MB</span>
                      </div>
                      {p.restarts > 0 && (
                        <div className="text-xs text-orange-600">
                          Restarts: {p.restarts}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
              
              <div className="flex-1 bg-black text-green-400 p-3 rounded h-[500px] overflow-auto font-mono text-sm">
                {selectedId ? (
                  logs.length === 0 ? (
                    <div className="text-gray-400">Connecting to logs for process {selectedId}...</div>
                  ) : (
                    logs.map((line, i) => (
                      <div key={i} className="whitespace-pre-wrap">{line}</div>
                    ))
                  )
                ) : (
                  <div className="text-gray-400">Select a process to view its logs</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Status message */}
        {status.message && (
          <div className={`mt-4 p-3 rounded-md ${
            status.message.toLowerCase().includes('failed') || status.message.toLowerCase().includes('error') 
              ? 'bg-red-100 text-red-800 border border-red-200' 
              : 'bg-green-100 text-green-800 border border-green-200'
          }`}>
            <div className="flex items-center justify-between">
              <span>{status.message}</span>
              <button
                onClick={() => setStatus({ ...status, message: '' })}
                className="text-sm underline hover:no-underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}