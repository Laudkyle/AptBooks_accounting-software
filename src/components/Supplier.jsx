import React, { useState, useEffect, useMemo } from "react";
import API from "../api.js";
import DataTable from "react-data-table-component";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaTrash,
  FaEdit,
  FaMoneyBillWave,
  FaToggleOn,
  FaToggleOff,
  FaEye,
} from "react-icons/fa";

import { Tooltip } from "react-tooltip";
import SupplierPaymentModal from "./SupplierPaymentModal"; // Import the modal
const Supplier = () => {
  const [Suppliers, setSuppliers] = useState([]);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isEditFormVisible, setIsEditFormVisible] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    type: "individual", // Default to "individual"
    contact_id: "", // Unique identifier for the contact
    business_name: "", // Business name (null for individuals)
    name: "", // Supplier's name
    email: "", // Email address (optional)
    tax_number: "", // Tax number (optional)
    pay_term: "", // Payment terms
    opening_balance: 0, // Default opening balance
    advance_balance: 0, // Default advance balance
    added_on: new Date().toISOString().split("T")[0], // Default to today's date
    address: "", // Address of the supplier
    mobile: "", // Mobile number (unique)
    total_purchase_due: 0, // Total purchase due (default to 0)
    total_purchase_return_due: 0, // Total purchase return due (default to 0)
    active_status: true, // Active by default
  });

  const API_URL = "/suppliers"; // Update with your backend URL
  // Filter suppliers based on the search text
  const filteredSuppliersd = useMemo(() => {
    return Suppliers.filter((supplier) =>
      Object.keys(formData).some((key) =>
        (supplier[key] || "")
          .toString()
          .toLowerCase()
          .includes(filterText.toLowerCase())
      )
    );
  }, [filterText, Suppliers, formData]);
  const generateContact_id = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `SUPP-${timestamp}-${random}`;
  };

  const fetchSuppliers = async () => {
    try {
      const response = await API.get(API_URL);
      setSuppliers(response.data);
    } catch (error) {
      toast.error("Error fetching Suppliers.");
      console.error("Error fetching Suppliers:", error);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);
  const [filteredSuppliers, setFilteredSuppliers] = useState(Suppliers);

  useEffect(() => {
    setFilteredSuppliers(Suppliers);
  }, [Suppliers]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = () => {
    const { business_name, name, email, mobile, type } = formData;

    if (type === "business" && !business_name) {
      toast.error("Business Name is required.");
      return false;
    }
    if (type === "individual" && !name) {
      toast.error("Full Name is required.");
      return false;
    }
    if (!email) {
      toast.error("Email is required.");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address.");
      return false;
    }
    if (!mobile) {
      toast.error("Mobile number is required.");
      return false;
    }
    return true;
  };
  const handleEditClick = (supplier) => {
    setFormData({
      type: supplier.type || "business",
      contact_id: supplier.contact_id || "",
      business_name: supplier.business_name || "",
      name: supplier.name || "",
      email: supplier.email || "",
      tax_number: supplier.tax_number || "",
      pay_term: supplier.pay_term || "0",
      opening_balance: supplier.opening_balance || "0",
      advance_balance: supplier.advance_balance || "0",
      added_on: supplier.added_on || "",
      supplier_group: supplier.supplier_group || "",
      address: supplier.address || "",
      mobile: supplier.mobile || "",
      active_status: supplier.active_status ?? true,
    });
    setIsEditFormVisible(true);
  };

  const toggleActiveStatus = async (supplier) => {
    try {
      const newStatus = supplier.active_status ? 0 : 1; // SQL typically uses 0 and 1 for boolean values.

      if (supplier.active_status) {
        await API.patch(`${API_URL}/${supplier.contact_id}`, {
          active_status: 0, // Setting to inactive.
        });
      } else {
        await API.patch(`${API_URL}/${supplier.contact_id}`, {
          active_status: 1, // Setting to active.
        });
      }

      setSuppliers(
        Suppliers.map((c) =>
          c.contact_id === supplier.contact_id
            ? { ...c, active_status: !supplier.active_status }
            : c
        )
      );
      toast.success("Supplier Toggled Successfully");
    } catch (error) {
      toast.error("Error Toggling Supplier, Please Try Again!!!");
      console.error("Error toggling supplier status:", error);
    }
  };

  const handleAddsupplier = async () => {
    setLoading(true);
    try {
      // Prepare the supplier data with generated fields
      const supplierData = {
        ...formData,
        contact_id: generateContact_id(),
        added_on: new Date().toISOString().split("T")[0],
        active_status: true,
      };

      if (!validateForm()) return;

      const response = await API.post(API_URL, supplierData);

      if (response.data) {
        setSuppliers([...Suppliers, response.data]);
        toast.success("supplier added successfully!");

        // Reset form data
        setFormData({
          type: "business",
          contact_id: "",
          business_name: "",
          name: "",
          email: "",
          tax_number: "",
          pay_term: "0",
          opening_balance: "0",
          advance_balance: "0",
          added_on: "",
          address: "",
          mobile: "",
          active_status: true,
        });

        setIsFormVisible(false);
      }
    } catch (error) {
      console.log(formData.type);

      console.error("Error adding supplier:", error);
      toast.error(error.response?.data?.message || "Error adding supplier.");
    } finally {
      setLoading(false);
    }
  };
  const handleEditsupplier = async () => {
    setLoading(true);
    try {
      if (!validateForm()) return;

      // Prepare the supplier data
      const supplierData = {
        ...formData,
        added_on: formData.added_on || new Date().toISOString().split("T")[0],
      };

      // Make a PUT request to update the supplier
      const response = await API.put(
        `${API_URL}/${formData.contact_id}`,
        supplierData
      );

      if (response.data) {
        // Update the supplier list in state
        setSuppliers(
          Suppliers.map((supplier) =>
            supplier.contact_id === formData.contact_id
              ? response.data
              : supplier
          )
        );
        toast.success("supplier updated successfully!");

        // Reset form data and close the form
        setFormData({
          type: "business",
          contact_id: "",
          business_name: "",
          name: "",
          email: "",
          tax_number: "",
          pay_term: "0",
          opening_balance: "0",
          advance_balance: "0",
          added_on: "",
          address: "",
          mobile: "",
          active_status: true,
        });

        setIsEditFormVisible(false); // Hide the edit form
      }
    } catch (error) {
      console.error("Error updating supplier:", error);
      toast.error(error.response?.data?.message || "Error updating supplier.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletesupplier = async (contact_id) => {
    try {
      await API.delete(`${API_URL}/${contact_id}`);
      setSuppliers(
        Suppliers.filter((supplier) => supplier.contact_id !== contact_id)
      );
      toast.success("supplier deleted successfully!");
    } catch (error) {
      console.log(contact_id);
      toast.error("Error deleting supplier.");
      console.error("Error deleting supplier:", error);
    }
  };

  const ActionButton = ({ id, icon, tooltip, onClick, color }) => (
    <>
      <button
        data-tooltip-id={`tooltip-${id}`}
        data-tooltip-content={tooltip}
        onClick={onClick}
        className={`text-${color} hover:text-${color}-700 transition-colors duration-200`}
      >
        {icon}
      </button>
      <Tooltip id={`tooltip-${id}`} place="top" />
    </>
  );
  // Define columns for the data table
  const columns = [
    {
      name: "Action",
      cell: (row) => (
        <div className="flex items-center space-x-2">
          <ActionButton
            id={`payment-${row.contact_id}`}
            icon={<FaMoneyBillWave />}
            tooltip="Pay"
            onClick={() => {
              setSelectedSupplierId(row.id); // Set the supplier ID
              setShowModal(true); // Open modal
            }}
            color="green-500"
          />
          <ActionButton
            id={`status-${row.contact_id}`}
            icon={row.active_status ? <FaToggleOn /> : <FaToggleOff />}
            tooltip={`${
              row.active_status ? "Deactivate" : "Activate"
            } supplier`}
            onClick={() => toggleActiveStatus(row)}
            color="blue-500"
          />
          <ActionButton
            id={`edit-${row.contact_id}`}
            icon={<FaEdit />}
            tooltip="Edit"
            onClick={() => handleEditClick(row)}
            color="yellow-500"
          />
          <ActionButton
            id={`delete-${row.contact_id}`}
            icon={<FaTrash />}
            tooltip="Delete"
            onClick={() => handleDeletesupplier(row.contact_id)}
            color="red-500"
          />
          <ActionButton
            id={`cart-${row.contact_id}`}
            icon={<FaEye />}
            tooltip="View"
            onClick={() => {}}
            color="purple-500"
          />
        </div>
      ),
    },
    ...Object.keys(formData).map((field) => ({
      name: field
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase()),
      selector: (row) =>
        field === "active_status"
          ? row[field]
            ? "Active"
            : "Not Active"
          : row[field],
      sortable: true,
    })),
  ];

  return (
    <div className=" bg-gray-100  max-w-[80vw] h-[85vh] overflow-scroll">
      <div className="px-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">
          Manage Suppliers
        </h1>

        <button
          onClick={() => setIsFormVisible(true)}
          className="mb-6 bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700"
        >
          Add supplier
        </button>
      </div>

      {isFormVisible && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Add New Supplier
            </h2>
            <form
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
              onSubmit={(e) => e.preventDefault()}
            >
              {/* supplier Type */}
              <div className="col-span-3">
                <label className="block text-gray-700 font-semibold mb-2">
                  Supplier Type
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="border border-gray-300 p-2 rounded w-full"
                >
                  <option value="business">Business</option>
                  <option value="individual">Individual</option>
                </select>
              </div>

              {/* Conditional fields for Business */}
              {formData.type === "business" && (
                <>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      name="business_name"
                      value={formData.business_name}
                      onChange={handleInputChange}
                      placeholder="Business Name"
                      className="border border-gray-300 p-2 rounded w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">
                      Tax Number
                    </label>
                    <input
                      type="text"
                      name="tax_number"
                      value={formData.tax_number}
                      onChange={handleInputChange}
                      placeholder="Tax Number"
                      className="border border-gray-300 p-2 rounded w-full"
                    />
                  </div>
                </>
              )}

              {/* Conditional fields for Individual */}
              {formData.type === "individual" && (
                <>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Fullname Name"
                      className="border border-gray-300 p-2 rounded w-full"
                    />
                  </div>
                </>
              )}

              {/* Common Fields */}
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Email"
                  className="border border-gray-300 p-2 rounded w-full"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Mobile *
                </label>
                <input
                  type="text"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  placeholder="Mobile"
                  className="border border-gray-300 p-2 rounded w-full"
                />
              </div>

              {/* Optional Fields */}

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Pay Term
                </label>
                <input
                  type="text"
                  name="pay_term"
                  value={formData.pay_term}
                  onChange={handleInputChange}
                  placeholder="Pay Term"
                  className="border border-gray-300 p-2 rounded w-full"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Opening Balance
                </label>
                <input
                  type="number"
                  name="opening_balance"
                  value={formData.opening_balance}
                  onChange={handleInputChange}
                  placeholder="Opening Balance"
                  className="border border-gray-300 p-2 rounded w-full"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Advance Balance
                </label>
                <input
                  type="number"
                  name="advance_balance"
                  value={formData.advance_balance}
                  onChange={handleInputChange}
                  placeholder="Advance Balance"
                  className="border border-gray-300 p-2 rounded w-full"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Address"
                  className="border border-gray-300 p-2 rounded w-full"
                />
              </div>
            </form>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setIsFormVisible(false)}
                className="mr-4 bg-gray-400 text-white px-6 py-2 rounded shadow hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleAddsupplier}
                className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700"
              >
                Add supplier
              </button>
            </div>
          </div>
        </div>
      )}
      {isEditFormVisible && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Update Supplier
            </h2>
            <form
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
              onSubmit={(e) => e.preventDefault()}
            >
              {/* supplier Type */}
              <div className="col-span-3">
                <label className="block text-gray-700 font-semibold mb-2">
                  Supplier Type
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="border border-gray-300 p-2 rounded w-full"
                >
                  <option value="business">Business</option>
                  <option value="individual">Individual</option>
                </select>
              </div>

              {/* Conditional fields for Business */}
              {formData.type === "business" && (
                <>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      name="business_name"
                      value={formData.business_name}
                      onChange={handleInputChange}
                      placeholder="Business Name"
                      className="border border-gray-300 p-2 rounded w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">
                      Tax Number
                    </label>
                    <input
                      type="text"
                      name="tax_number"
                      value={formData.tax_number}
                      onChange={handleInputChange}
                      placeholder="Tax Number"
                      className="border border-gray-300 p-2 rounded w-full"
                    />
                  </div>
                </>
              )}

              {/* Conditional fields for Individual */}
              {formData.type === "individual" && (
                <>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Fullname Name"
                      className="border border-gray-300 p-2 rounded w-full"
                    />
                  </div>
                </>
              )}

              {/* Common Fields */}
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Email"
                  className="border border-gray-300 p-2 rounded w-full"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Mobile *
                </label>
                <input
                  type="text"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  placeholder="Mobile"
                  className="border border-gray-300 p-2 rounded w-full"
                />
              </div>

              {/* Optional Fields */}

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Pay Term
                </label>
                <input
                  type="text"
                  name="pay_term"
                  value={formData.pay_term}
                  onChange={handleInputChange}
                  placeholder="Pay Term"
                  className="border border-gray-300 p-2 rounded w-full"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Opening Balance
                </label>
                <input
                  type="number"
                  name="opening_balance"
                  disabled
                  value={formData.opening_balance}
                  onChange={handleInputChange}
                  placeholder="Opening Balance"
                  className="border border-gray-300 p-2 rounded w-full"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Advance Balance
                </label>
                <input
                  type="number"
                  name="advance_balance"
                  value={formData.advance_balance}
                  disabled
                  onChange={handleInputChange}
                  placeholder="Advance Balance"
                  className="border border-gray-300 p-2 rounded w-full"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Address"
                  className="border border-gray-300 p-2 rounded w-full"
                />
              </div>
            </form>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setIsEditFormVisible(false)}
                className="mr-4 bg-gray-400 text-white px-6 py-2 rounded shadow hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleEditsupplier}
                className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700"
              >
                Update Supplier
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white mx-6 shadow-sm rounded-md p-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Supplier List
        </h2>
        <div className="mb-4 flex justify-end">
          <input
            type="text"
            placeholder="Search suppliers"
            className="p-2 border border-gray-300 rounded-md"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
        </div>
        <DataTable
          columns={columns}
          data={filteredSuppliersd}
          pagination
          highlightOnHover
          responsive
          striped
        />
      </div>
      {/* Render the modal */}
      <SupplierPaymentModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        supplierId={selectedSupplierId}
      />
      <Tooltip />
    </div>
  );
};

export default Supplier;
