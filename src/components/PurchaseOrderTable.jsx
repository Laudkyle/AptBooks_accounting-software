import React, { useState, useEffect, useRef } from "react";
import DataTable from "react-data-table-component";
import API from "../api.js";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaEdit, FaTrashAlt,FaExchangeAlt } from "react-icons/fa";
import EditPurchaseOrder from "./EditPurchaseOrder";
const PurchaseOrdersTable = () => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = useState(null);
  const [dropdownStatus, setDropdownStatus] = useState(null);

  const dropdownRef = useRef(null); // Ref for the dropdown container
  // Fetch suppliers and purchase orders
  useEffect(() => {
    
    const fetchSuppliersAndOrders = async () => {
      setLoading(true);
      try {
        // Fetch suppliers
        const suppliersResponse = await API.get(
          "/suppliers"
        );
        const suppliersData = suppliersResponse.data;

        // Fetch purchase orders
        const purchaseOrdersResponse = await API.get(
          "/purchase_orders"
        );
        const purchaseOrdersData = purchaseOrdersResponse.data;

        // Map supplier names to purchase orders
        const enhancedPurchaseOrders = purchaseOrdersData.map((order) => {
          const supplier = suppliersData.find(
            (sup) => sup.id === order.supplier_id
          );
          return {
            ...order,
            supplier_name: supplier ? supplier.name : "Unknown Supplier",
          };
        });
console.log(suppliersData)
console.log(purchaseOrdersData)
        setSuppliers(suppliersData);
        setPurchaseOrders(enhancedPurchaseOrders);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to fetch data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchSuppliersAndOrders();
  }, []);

  // Handle Delete
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this purchase order?"))
      return;

    try {
      await API.delete(`/purchase_orders/${id}`);
      setPurchaseOrders((prevOrders) =>
        prevOrders.filter((order) => order.id !== id)
      );
      toast.success("Purchase order deleted successfully!");
    } catch (error) {
      console.error("Error deleting purchase order:", error);
      toast.error("Failed to delete purchase order. Please try again.");
    }
  };

  // Open Edit Modal
  const handleEdit = (id) => {
    setSelectedPurchaseOrderId(id);
    setEditModalOpen(true);
  };

  // Close Edit Modal and Refresh Data
  const handlePurchaseOrderUpdated = () => {
    setEditModalOpen(false);
    setSelectedPurchaseOrderId(null);
    toast.success("Purchase order updated successfully!");

    // Refetch purchase orders and suppliers
    setLoading(true);
    API
      .get("/purchase_orders")
      .then((response) => {
        const purchaseOrdersData = response.data;
        const enhancedPurchaseOrders = purchaseOrdersData.map((order) => {
          const supplier = suppliers.find(
            (sup) => sup.id === order.supplier_id
          );
          return {
            ...order,
            supplier_name: supplier ? supplier.name : "Unknown Supplier",
          };
        });
        setPurchaseOrders(enhancedPurchaseOrders);
      })
      .catch((error) => {
        console.error("Error refreshing purchase orders:", error);
        toast.error("Failed to refresh purchase orders.");
      })
      .finally(() => setLoading(false));
  };

  const columns = [
    {
      name: "Reference Number",
      selector: (row) => row.reference_number,
      sortable: true,
    },
    {
      name: "Supplier",
      selector: (row) => row.supplier_name,
      sortable: true,
    },
    {
      name: "Total Amount",
      selector: (row) => `₵${row.total_amount.toFixed(2)}`,
      sortable: true,
    },
    {
      name: "Date",
      selector: (row) => new Date(row.date).toLocaleDateString(),
      sortable: true,
    },
    {
      name: "Order Status",
      cell: (row) => (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => handleStatusClick(row.id)}
            className="px-4 py-2 border rounded-md text-blue-500 capitalize"
          >
            {row.order_status}
          </button>
          {dropdownStatus === row.id && (
            <div className="absolute z-50 bg-white border rounded-md shadow-lg mt-1 w-full">
              <ul className="text-gray-700">
                {["pending", "received", "cancelled"].map((status) => (
                  <li
                    key={status}
                    onClick={() => handleStatusChange(row.id, status, row.reference_number)}
                    className="px-2 py-2 hover:bg-gray-200 cursor-pointer"
                  >
                    {status}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ),
      sortable: true,
    },
    {
      name: "Payment Status",
      selector: (row) => <div className="capitalize">{row.payment_status}</div>,
      sortable: true,
    },{
      name: "Return",
      cell: (row) => (
        row.order_status === "received" && (
          <button
            onClick={() => handleReturnPurchase(row.id, row.reference_number)}
            className="text-purple-500 hover:text-purple-700"
            title="Return Purchase"
          >
            <FaExchangeAlt />
          </button>
        )
      ),
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
    },
    {
      name: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(row.id)}
            className="text-green-500 hover:text-green-700"
            title="Edit"
          >
            <FaEdit />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="text-red-500 hover:text-red-700"
            title="Delete"
          >
            <FaTrashAlt />
          </button>
        </div>
      ),
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
    },
  ];
  const handleReturnPurchase = async (orderId, referenceNumber) => {
    if (!window.confirm("Are you sure you want to return this purchase?")) return;
  
    setLoading(true);
    try {
      // First create the return record
      const returnResponse = await API.post("/purchase/returns", {
        purchase_order_id: orderId,
        reference_number: `PRET-${referenceNumber}-${Date.now()}`,
        return_date: new Date().toISOString(),
      });
  
      // Then update the order status
      await API.patch(`/purchase_orders/${orderId}/order_status`, {
        order_status: "returned",
        reference_number: referenceNumber,
      });
  
      // Update local state
      setPurchaseOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? { ...order, order_status: "returned" } : order
        )
      );
  
      toast.success("Purchase returned successfully!");
    } catch (error) {
      console.error("Error returning purchase:", error);
      toast.error("Failed to return purchase. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  // Show the dropdown when a status button is clicked
  const handleStatusClick = (id) => {
    setDropdownStatus((prevId) => (prevId === id ? null : id)); // Toggle dropdown visibility
  };

  // Handle status change and update in the database
  const handleStatusChange = async (id, newStatus,reference_number) => {
setLoading(true)
    try {
      await API.patch(
        `/purchase_orders/${id}/order_status`,
        {
          order_status: newStatus,
          reference_number:reference_number,
        }
      );

      // Update the status in the local state
      setPurchaseOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === id ? { ...order, order_status: newStatus } : order
        )
      );

      toast.success(`Purchase order status updated to "${newStatus}"!`);
      setDropdownStatus(null); 

    } catch (error) {
      console.error("Error changing status:", error);
      toast.error("Failed to update purchase order status. Please try again.");
    }finally{setLoading(false)}
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-32">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  
  return (

    <div className="container mx-auto p-6 bg-gray-100 shadow-lg rounded-lg">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">
        Purchase Order List
      </h2>

      

      {/* Search Input */}
      <div className="flex justify-end mb-4">
        <input
          type="text"
          placeholder="Search by reference number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-1/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={purchaseOrders.filter((order) =>
          order.reference_number
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        )}
        progressPending={loading}
        pagination
        highlightOnHover
        striped
        responsive
        customStyles={{
          table: {
            style: {
              overflowY: 'auto',
              maxHeight: 'calc(100vh - 260px)',
            },
          },
          headCells: {
            style: {
              backgroundColor: '#f5f5f5',
              fontWeight: 'bold',
              position: 'relative', // Add this
            },
          },
          cells: {
            style: {
              padding: '8px',
              position: 'relative', // Add this
            },
          },
        }}
      />

      {/* Edit Purchase Order Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center">
          <div className="bg-white rounded-lg w-3/4 max-h-[90vh] overflow-y-auto">
            <EditPurchaseOrder
              purchaseOrderId={selectedPurchaseOrderId}
              onPurchaseOrderUpdated={handlePurchaseOrderUpdated}
              editModalOpen={editModalOpen}
              setEditModalOpen={setEditModalOpen}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrdersTable;
