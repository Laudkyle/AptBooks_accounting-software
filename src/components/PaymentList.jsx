import React, { useState, useEffect } from "react";
import API from "../api.js";
import DataTable from "react-data-table-component";
import { FaTrash, FaEye } from "react-icons/fa";
import ReactModal from "react-modal";
import { ToastContainer, toast } from "react-toastify";

const PaymentList = () => {
  const [payments, setPayments] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState(null);
  const [searchText, setSearchText] = useState("");

  // Fetch both supplier payments and customer payments
  const fetchPayments = async () => {
    try {
      const [customerPayments, supplierPayments] = await Promise.all([
        API.get("/payments"),
        API.get("/supplier_payments"),
      ]);

      const combinedPayments = [
        ...customerPayments.data.map((payment) => ({
          ...payment,
          type: "Customer Payment",
        })),
        ...supplierPayments.data.map((payment) => ({
          ...payment,
          type: "Supplier Payment",
        })),
      ];

      setPayments(combinedPayments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast.error("Failed to load payments.");
    }
  };

  // Fetch documents related to a payment
  const fetchDocuments = async (referenceNumber) => {
    try {
      const response = await API.get(`/documents/by-reference/${referenceNumber}`);
      setDocuments(response.data);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to load documents.");
    }
  };

  // Handle delete confirmation
  const handleDelete = (payment) => {
    setShowDeleteConfirmation(true);
    setPaymentToDelete(payment);
  };

  const confirmDelete = async () => {
    try {
      const endpoint =
        paymentToDelete.type === "Supplier Payment"
          ? `/supplier_payments/${paymentToDelete.id}`
          : `/payments/${paymentToDelete.id}`;

      await API.delete(endpoint);
      toast.success("Payment deleted successfully.");
      setShowDeleteConfirmation(false);
      fetchPayments(); // Refresh payments list
    } catch (error) {
      console.error("Error deleting payment:", error);
      toast.error("Failed to delete payment.");
    }
  };

  // Handle view payment
  const handleView = (payment) => {
    setSelectedPayment(payment);
    fetchDocuments(payment.reference_number); // Fetch related documents
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const filteredPayments = payments.filter((payment) => {
    const searchLower = searchText.toLowerCase();
    return (
      (payment.reference_number ||payment.payment_reference).toLowerCase().includes(searchLower) ||
      payment.payment_date.toLowerCase().includes(searchLower) ||
      payment.amount_paid.toString().toLowerCase().includes(searchLower) ||
      (payment.payment_method && payment.payment_method.toLowerCase().includes(searchLower)) ||
      payment.type.toLowerCase().includes(searchLower)
    );
  });

  // DataTable columns definition
  const columns = [
    {
      name: "Type",
      selector: (row) => row.type,
      sortable: true,
    },
    {
      name: "Reference Number",
      selector: (row) => row.reference_number||row.payment_reference,
      sortable: true,
    },
    {
      name: "Payment Date",
      selector: (row) => row.payment_date,
      sortable: true,
    },
    {
      name: "Amount Paid",
      selector: (row) => row.amount_paid,
      sortable: true,
      right: true,
    },
    {
      name: "Payment Method",
      selector: (row) => row.payment_method || "N/A",
      sortable: true,
    },
    {
      name: "Actions",
      cell: (row) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleView(row)}
            className="text-green-500 hover:text-green-700"
          >
            <FaEye />
          </button>
          <button
            onClick={() => handleDelete(row)}
            className="text-red-500 hover:text-red-700"
          >
            <FaTrash />
          </button>
        </div>
      ),
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
    },
  ];

  // Custom subheader with search
  const customSubHeader = (
    <div className="w-full flex justify-end items-center">
      <input
        type="text"
        placeholder="Search by any attribute"
        className="p-2 border border-gray-300 rounded-md w-1/3"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
      />
    </div>
  );

  return (
    <div className="container mx-auto p-6 bg-gray-100 shadow-lg overflow-y-scroll h-[85vh] rounded-lg">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Payment List</h2>

      <DataTable
        title="Payments"
        columns={columns}
        data={filteredPayments}
        pagination
        highlightOnHover
        defaultSortField="payment_date"
        subHeader
        subHeaderComponent={customSubHeader}
        className="bg-white rounded-lg shadow-lg"
      />

      {/* Delete Confirmation Modal */}
      <ReactModal
        isOpen={showDeleteConfirmation}
        onRequestClose={() => setShowDeleteConfirmation(false)}
        contentLabel="Confirm Delete"
        className="bg-white p-4 rounded-lg shadow-lg z-50 w-1/3 h-1/4 absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center"
      >
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Confirm Delete</h2>
        <p className="text-gray-600">Are you sure you want to delete this payment?</p>
        <div className="flex justify-end space-x-4 mt-4">
          <button onClick={() => setShowDeleteConfirmation(false)} className="bg-gray-300 text-gray-700 py-2 px-4 rounded-lg">
            Cancel
          </button>
          <button onClick={confirmDelete} className="bg-red-500 text-white py-2 px-4 rounded-lg">
            Confirm
          </button>
        </div>
      </ReactModal>

      {/* Payment View Modal */}
      {selectedPayment && (
        <ReactModal
          isOpen={!!selectedPayment}
          onRequestClose={() => setSelectedPayment(null)}
          contentLabel="Payment Details"
          className="bg-white w-[60vw] max-w-[800px] p-8 shadow-xl rounded-lg z-50"
          overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center"
        >
          <h3 className="text-3xl font-bold text-gray-800 mb-6">Payment Details</h3>

          <div className="space-y-4">
            <div><strong>Reference Number:</strong> {selectedPayment.reference_number || selectedPayment.payment_reference}</div>
            <div><strong>Payment Date:</strong> {selectedPayment.payment_date}</div>
            <div><strong>Amount Paid:</strong> {selectedPayment.amount_paid}</div>
            <div><strong>Payment Method:</strong> {selectedPayment.payment_method || "N/A"}</div>
          </div>

          {/* Documents Table */}
          <h4 className="text-xl font-semibold text-gray-800 mb-4 mt-6">Related Documents</h4>
          <DataTable
            columns={[
              { name: "Document Name", selector: (row) => row.document_name, sortable: true },
              { name: "Uploaded On", selector: (row) => row.uploaded_on, sortable: true },
              { name: "File", selector: (row) => <a href={row.file_path} target="_blank" className="text-blue-500">View</a> },
            ]}
            data={documents}
            pagination
          />

          <button onClick={() => setSelectedPayment(null)} className="bg-gray-300 py-2 px-6 rounded-lg mt-6">Close</button>
        </ReactModal>
      )}

      
    </div>
  );
};

export default PaymentList;
