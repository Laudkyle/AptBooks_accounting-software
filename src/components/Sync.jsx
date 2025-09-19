import { useEffect, useState, useCallback, useRef } from "react";

export default function AdminDashboard() {
  const showUploader = import.meta.env.VITE_ENABLE_UPLOAD === "true"; // env check
  const [activeTab, setActiveTab] = useState("database"); // tabs: database, build, pm2
  const [status, setStatus] = useState({ loading: false, message: "" });

  // PM2 Monitor states
  const [processes, setProcesses] = useState([]);
  const [filteredProcesses, setFilteredProcesses] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [systemStats, setSystemStats] = useState(null);
  const [statsError, setStatsError] = useState(null);
  const [logConnectionStatus, setLogConnectionStatus] =
    useState("disconnected");

  // Refs for managing logs
  const logsEndRef = useRef(null);
  const eventSourceRef = useRef(null);
  const logCountRef = useRef(0);

  // Available status filters
  const statusOptions = [
    { value: "all", label: "All Processes" },
    { value: "online", label: "Online" },
    { value: "stopped", label: "Stopped" },
    { value: "stopping", label: "Stopping" },
    { value: "launching", label: "Launching" },
    { value: "errored", label: "Errored" },
    { value: "one-launch-status", label: "One Launch Status" },
  ];

  // Auto-scroll to bottom when new logs arrive
  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  // Fetch PM2 processes with error handling
  const fetchProcesses = useCallback(async () => {
    if (activeTab !== "pm2") return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(
        "https://app.aptbooks.com/monitor/processes",
        {
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setProcesses(data);
      setConnectionError(null);
    } catch (error) {
      console.error("Failed to fetch processes:", error);
      if (error.name === "AbortError") {
        setConnectionError("Request timeout - server may be down");
      } else {
        setConnectionError(error.message || "Failed to fetch processes");
      }
      // Don't clear processes on error, keep showing last known state
    }
  }, [activeTab]);

  // Fetch system statistics
  const fetchSystemStats = useCallback(async () => {
    if (activeTab !== "pm2") return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch("https://app.aptbooks.com/monitor/system", {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setSystemStats(data);
      setStatsError(null);
    } catch (error) {
      console.error("Failed to fetch system stats:", error);
      if (error.name === "AbortError") {
        setStatsError("Request timeout");
      } else {
        setStatsError(error.message || "Failed to fetch system stats");
      }
    }
  }, [activeTab]);

  // Filter processes based on status and search term
  useEffect(() => {
    let filtered = processes;

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (p) => p.status?.toLowerCase() === statusFilter
      );
    }

    // Filter by search term (name or id)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name?.toLowerCase().includes(term) ||
          p.id?.toString().includes(term)
      );
    }

    setFilteredProcesses(filtered);
  }, [processes, statusFilter, searchTerm]);

  // Initial fetch and auto-refresh setup
  useEffect(() => {
    if (activeTab === "pm2") {
      fetchProcesses();
      fetchSystemStats();

      if (autoRefresh) {
        const interval = setInterval(() => {
          fetchProcesses();
          fetchSystemStats();
        }, 5000); // Refresh every 5 seconds
        setRefreshInterval(interval);
      }
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    };
  }, [activeTab, autoRefresh, fetchProcesses, fetchSystemStats]);

  // Handle auto-refresh toggle
  const toggleAutoRefresh = () => {
    setAutoRefresh((prev) => !prev);
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  };

  // Stream logs when a process is selected - FIXED VERSION
  useEffect(() => {
    // Clean up previous connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (!selectedId) {
      setLogs([]);
      setLogConnectionStatus("disconnected");
      logCountRef.current = 0;
      return;
    }

    setLogs([]);
    setLogConnectionStatus("connecting");
    logCountRef.current = 0;

    console.log("Connecting to logs for process:", selectedId);
    const evtSource = new EventSource(
      `https://app.aptbooks.com/monitor/logs/${selectedId}`
    );
    eventSourceRef.current = evtSource;

    evtSource.onopen = () => {
      console.log("EventSource connection opened for process", selectedId);
      setLogConnectionStatus("connected");
    };

    evtSource.onmessage = (e) => {
      // Skip keep-alive messages
      console.log("Raw message received:", e);
      console.log("Message data:", e.data);
      console.log("Message type:", e.type);
      if (e.data.trim() === ":keep alive" || e.data.trim() === ": keep-alive") {
        return;
      }

      console.log("Received log message:", e.data);
      const timestamp = new Date().toLocaleTimeString();
      const logLine = `[${timestamp}] ${e.data}`;

      setLogs((prev) => {
        logCountRef.current++;
        const newLogs = [...prev, logLine];
        // Keep only last 500 lines to prevent performance issues
        if (newLogs.length > 500) {
          return newLogs.slice(-500);
        }
        return newLogs;
      });
    };

    evtSource.onerror = (error) => {
      console.error("EventSource error for process", selectedId, ":", error);
      console.log("EventSource readyState:", evtSource.readyState);
      setLogConnectionStatus("error");
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] [ERROR] Connection to logs failed or interrupted`,
      ]);

      // Don't immediately close on error - let it try to reconnect
      setTimeout(() => {
        if (evtSource.readyState === EventSource.CONNECTING) {
          console.log("EventSource attempting to reconnect...");
          setLogConnectionStatus("reconnecting");
        }
      }, 1000);
    };

    return () => {
      if (evtSource) {
        evtSource.close();
      }
    };
  }, [selectedId]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Database upload with better error handling
  const handleDatabaseUpload = async () => {
    setStatus({ loading: true, message: "Preparing database upload..." });
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const localResponse = await fetch("http://localhost:5100/api/local-db", {
        signal: controller.signal,
      });

      if (!localResponse.ok) {
        throw new Error(
          `Failed to fetch local database: ${localResponse.statusText}`
        );
      }

      const blob = await localResponse.blob();
      clearTimeout(timeoutId);

      const formData = new FormData();
      formData.append("database", blob, "shopdb.sqlite");

      setStatus({ loading: true, message: "Uploading database to server..." });

      const uploadTimeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout for upload
      const uploadResponse = await fetch(
        "https://app.ryamex.com/upp/api/upload-db",
        {
          method: "POST",
          body: formData,
          signal: controller.signal,
        }
      );

      clearTimeout(uploadTimeoutId);

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Upload failed: ${uploadResponse.statusText}`
        );
      }

      const result = await uploadResponse.json();
      setStatus({
        loading: false,
        message: result.message || "Database uploaded successfully!",
      });
    } catch (error) {
      if (error.name === "AbortError") {
        setStatus({
          loading: false,
          message: "Database upload timeout - please try again",
        });
      } else {
        setStatus({
          loading: false,
          message: error.message || "Database upload failed",
        });
      }
    }
  };

  // Build upload with better error handling
  const handleBuildUpload = async () => {
    setStatus({ loading: true, message: "Preparing build upload..." });
    try {
      const localResponse = await fetch("../../dist.zip");
      if (!localResponse.ok) {
        throw new Error(
          `Failed to fetch build file: ${localResponse.statusText}`
        );
      }

      const blob = await localResponse.blob();
      const formData = new FormData();
      formData.append("dist", blob, "dist.zip");

      setStatus({ loading: true, message: "Uploading build to VPS..." });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout for build upload

      const uploadResponse = await fetch("https://app.aptbooks.com/upload", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Upload failed: ${uploadResponse.statusText}`
        );
      }

      const result = await uploadResponse.json();
      setStatus({
        loading: false,
        message: result.message || "Build uploaded successfully!",
      });
    } catch (error) {
      if (error.name === "AbortError") {
        setStatus({
          loading: false,
          message: "Build upload timeout - please try again",
        });
      } else {
        setStatus({
          loading: false,
          message: error.message || "Build upload failed",
        });
      }
    }
  };

  // Clear logs function
  const clearLogs = () => {
    setLogs([]);
    logCountRef.current = 0;
  };

  // Get status color for process status
  const getStatusColor = (processStatus) => {
    switch (processStatus?.toLowerCase()) {
      case "online":
        return "text-green-600";
      case "stopped":
        return "text-red-600";
      case "stopping":
        return "text-yellow-600";
      case "launching":
        return "text-blue-600";
      case "errored":
        return "text-red-800";
      default:
        return "text-gray-600";
    }
  };

  // Get count for each status
  const getStatusCounts = () => {
    const counts = {};
    processes.forEach((p) => {
      const status = p.status?.toLowerCase() || "unknown";
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  };

  // Calculate total resource usage
  const getTotalResources = () => {
    const totals = processes.reduce(
      (acc, p) => {
        acc.cpu += p.cpu || 0;
        acc.memory += p.memory || 0;
        acc.restarts += p.restarts || 0;
        return acc;
      },
      { cpu: 0, memory: 0, restarts: 0 }
    );

    return {
      ...totals,
      memoryMB: (totals.memory / 1024 / 1024).toFixed(2),
      memoryGB: (totals.memory / 1024 / 1024 / 1024).toFixed(2),
    };
  };

  // Format bytes to human readable
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Format uptime
  const formatUptime = (seconds) => {
    if (!seconds) return "N/A";
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Get connection status indicator color
  const getConnectionStatusColor = () => {
    switch (logConnectionStatus) {
      case "connected":
        return "text-green-600";
      case "connecting":
      case "reconnecting":
        return "text-yellow-600";
      case "error":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const statusCounts = getStatusCounts();
  const totalResources = getTotalResources();

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>

      {/* Tabs */}
      <div className="flex border-b mb-4">
        {showUploader && (
          <>
            <button
              onClick={() => setActiveTab("database")}
              className={`py-2 px-4 -mb-px border-b-2 font-medium ${
                activeTab === "database"
                  ? "border-blue-500 text-blue-500"
                  : "border-transparent text-gray-600 hover:text-gray-800"
              }`}
            >
              Database
            </button>
            <button
              onClick={() => setActiveTab("build")}
              className={`py-2 px-4 -mb-px border-b-2 font-medium ${
                activeTab === "build"
                  ? "border-green-500 text-green-500"
                  : "border-transparent text-gray-600 hover:text-gray-800"
              }`}
            >
              Build
            </button>
          </>
        )}
        <button
          onClick={() => setActiveTab("pm2")}
          className={`py-2 px-4 -mb-px border-b-2 font-medium ${
            activeTab === "pm2"
              ? "border-purple-500 text-purple-500"
              : "border-transparent text-gray-600 hover:text-gray-800"
          }`}
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
        {activeTab === "database" && showUploader && (
          <div className="bg-white p-6 rounded shadow-md">
            <h2 className="text-xl font-bold mb-4">Database Sync</h2>
            <p className="text-gray-600 mb-4">
              Sync your local database with the remote server.
            </p>
            <button
              onClick={handleDatabaseUpload}
              disabled={status.loading}
              className={`w-full py-2 px-4 rounded-md text-white font-medium
                ${
                  status.loading
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                transition-colors duration-200`}
            >
              {status.loading ? "Syncing Database..." : "Sync Database Now"}
            </button>
          </div>
        )}

        {activeTab === "build" && showUploader && (
          <div className="bg-white p-6 rounded shadow-md">
            <h2 className="text-xl font-bold mb-4">Build Upload</h2>
            <p className="text-gray-600 mb-4">
              Upload your latest build to the VPS server.
            </p>
            <button
              onClick={handleBuildUpload}
              disabled={status.loading}
              className={`w-full py-2 px-4 rounded-md text-white font-medium
                ${
                  status.loading
                    ? "bg-green-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                }
                focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
                transition-colors duration-200`}
            >
              {status.loading ? "Uploading Build..." : "Upload Build to VPS"}
            </button>
          </div>
        )}

        {activeTab === "pm2" && (
          <div className="space-y-4">
            {/* PM2 Controls */}
            <div className="bg-white p-4 rounded shadow-md">
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">
                    Filter by status:
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                        {option.value !== "all" && statusCounts[option.value]
                          ? ` (${statusCounts[option.value]})`
                          : ""}
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
                  onClick={() => {
                    fetchProcesses();
                    fetchSystemStats();
                  }}
                  disabled={status.loading}
                  className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:bg-purple-400"
                >
                  Refresh
                </button>

                <button
                  onClick={toggleAutoRefresh}
                  className={`px-3 py-1 rounded text-sm ${
                    autoRefresh
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Auto-refresh {autoRefresh ? "ON" : "OFF"}
                </button>
              </div>

              {connectionError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  <strong>Connection Error:</strong> {connectionError}
                </div>
              )}

              {statsError && (
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
                  <strong>System Stats Error:</strong> {statsError}
                </div>
              )}
            </div>

            {/* System Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Total Processes */}
              <div className="bg-white p-4 rounded shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Processes</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {processes.length}
                    </p>
                  </div>
                  <div className="text-blue-500">
                    <svg
                      className="w-8 h-8"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                    </svg>
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  Online: {statusCounts.online || 0} | Stopped:{" "}
                  {statusCounts.stopped || 0}
                </div>
              </div>

              {/* Total CPU Usage */}
              <div className="bg-white p-4 rounded shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total CPU Usage</p>
                    <p className="text-2xl font-bold text-green-600">
                      {totalResources.cpu.toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-green-500">
                    <svg
                      className="w-8 h-8"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
                {systemStats?.cpu && (
                  <div className="mt-2 text-sm text-gray-500">
                    System: {systemStats.cpu.toFixed(1)}%
                  </div>
                )}
              </div>

              {/* Total Memory Usage */}
              <div className="bg-white p-4 rounded shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Memory Usage</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {totalResources.memoryGB} GB
                    </p>
                  </div>
                  <div className="text-orange-500">
                    <svg
                      className="w-8 h-8"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                    </svg>
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  {totalResources.memoryMB} MB
                  {systemStats?.memory && (
                    <span>
                      {" "}
                      | System:{" "}
                      {(
                        (systemStats.memory.used / systemStats.memory.total) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  )}
                </div>
              </div>

              {/* System Info */}
              <div className="bg-white p-4 rounded shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Restarts</p>
                    <p className="text-2xl font-bold text-red-600">
                      {totalResources.restarts}
                    </p>
                  </div>
                  <div className="text-red-500">
                    <svg
                      className="w-8 h-8"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
                {systemStats?.uptime && (
                  <div className="mt-2 text-sm text-gray-500">
                    Uptime: {formatUptime(systemStats.uptime)}
                  </div>
                )}
              </div>
            </div>

            {/* System Details (if available) */}
            {systemStats && (
              <div className="bg-white p-4 rounded shadow-md mb-4">
                <h3 className="font-bold mb-3">System Details</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {systemStats.memory && (
                    <div>
                      <span className="text-gray-600">Memory:</span>
                      <div className="font-medium">
                        {formatBytes(systemStats.memory.used)} /{" "}
                        {formatBytes(systemStats.memory.total)}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className="bg-orange-500 h-2 rounded-full"
                          style={{
                            width: `${
                              (systemStats.memory.used /
                                systemStats.memory.total) *
                              100
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                  {systemStats.loadavg && (
                    <div>
                      <span className="text-gray-600">Load Average:</span>
                      <div className="font-medium">
                        {systemStats.loadavg
                          .map((load) => load.toFixed(2))
                          .join(", ")}
                      </div>
                    </div>
                  )}
                  {systemStats.platform && (
                    <div>
                      <span className="text-gray-600">Platform:</span>
                      <div className="font-medium capitalize">
                        {systemStats.platform}
                      </div>
                    </div>
                  )}
                  {systemStats.arch && (
                    <div>
                      <span className="text-gray-600">Architecture:</span>
                      <div className="font-medium">{systemStats.arch}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Process List and Logs */}
            <div className="flex gap-4">
              <div className="w-1/3 bg-gray-100 p-2 rounded max-h-[500px] overflow-auto">
                <h2 className="font-bold mb-2">
                  Processes ({filteredProcesses.length}/{processes.length})
                </h2>
                {filteredProcesses.length === 0 ? (
                  <div className="text-gray-500 text-sm p-4 text-center">
                    {processes.length === 0
                      ? "No processes found"
                      : "No processes match your filters"}
                  </div>
                ) : (
                  filteredProcesses.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedId(p.id)}
                      className={`p-2 rounded cursor-pointer transition-colors ${
                        selectedId === p.id
                          ? "bg-purple-200"
                          : "hover:bg-gray-200"
                      }`}
                    >
                      <div className="font-medium">{p.name}</div>
                      <div className="text-sm">
                        <span
                          className={`font-medium ${getStatusColor(p.status)}`}
                        >
                          {p.status || "unknown"}
                        </span>
                        {" | "}
                        <span>CPU: {p.cpu || 0}%</span>
                        {" | "}
                        <span>
                          MEM:{" "}
                          {p.memory ? (p.memory / 1024 / 1024).toFixed(2) : "0"}{" "}
                          MB
                        </span>
                      </div>
                      {p.restarts > 0 && (
                        <div className="text-xs text-orange-600">
                          Restarts: {p.restarts}
                        </div>
                      )}
                      {p.uptime && (
                        <div className="text-xs text-blue-600">
                          Uptime: {formatUptime(p.uptime)}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="flex-1 bg-black text-green-400 rounded h-[500px] flex flex-col">
                {/* Log Header */}
                <div className="bg-gray-800 text-white p-2 rounded-t flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {selectedId
                        ? `Process ${selectedId} Logs`
                        : "Select a process to view logs"}
                    </span>
                    {selectedId && (
                      <span
                        className={`text-xs px-2 py-1 rounded ${getConnectionStatusColor()}`}
                      >
                        ● {logConnectionStatus}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedId && (
                      <>
                        <span className="text-xs text-gray-400">
                          {logCountRef.current} lines
                        </span>
                        <button
                          onClick={clearLogs}
                          className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Clear
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Log Content */}
                <div className="flex-1 p-3 overflow-auto font-mono text-sm">
                  {console.log(
                    "Rendering logs, count:",
                    logs.length,
                    "selectedId:",
                    selectedId
                  )}{" "}
                  {/* DEBUG */}
                  {selectedId ? (
                    logs.length === 0 ? (
                      <div className="text-gray-400">
                        {logConnectionStatus === "connecting"
                          ? "Connecting to logs..."
                          : logConnectionStatus === "reconnecting"
                          ? "Reconnecting to logs..."
                          : logConnectionStatus === "error"
                          ? "Connection failed. Retrying..."
                          : "Waiting for logs..."}
                      </div>
                    ) : (
                      <>
                        {logs.map((line, i) => (
                          <div
                            key={i}
                            className="whitespace-pre-wrap leading-tight mb-1"
                          >
                            {line}
                          </div>
                        ))}
                        <div ref={logsEndRef} />
                      </>
                    )
                  ) : (
                    <div className="text-gray-400">
                      Select a process to view its logs
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status message */}
        {status.message && (
          <div
            className={`mt-4 p-3 rounded-md ${
              status.message.toLowerCase().includes("failed") ||
              status.message.toLowerCase().includes("error")
                ? "bg-red-100 text-red-800 border border-red-200"
                : "bg-green-100 text-green-800 border border-green-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span>{status.message}</span>
              <button
                onClick={() => setStatus({ ...status, message: "" })}
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
