import React, { useState, useEffect, useMemo } from "react";
import { FaEdit, FaCheck, FaTimes, FaTrash } from "react-icons/fa";
import { AiOutlinePlus, AiOutlineMinus } from "react-icons/ai";

import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import DataTable from "react-data-table-component";
import API from "../api.js";

const CustomerGroup = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    group_name: "",
    discount: 0,
    discount_type: "percentage",
    description: "",
    active_status: true,
    selectedTaxes: [],
  });
  const [selectedTaxes, setSelectedTaxes] = useState([null]);
  const [taxes, setTaxes] = useState([]);
  const [taxRates, setTaxRates] = useState([]);
  const [error, setError] = useState("");
  const [customerGroups, setCustomerGroups] = useState([]);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [filterText, setFilterText] = useState("");

  // Reset form on success or failure
  const resetForm = () => {
    setFormData({
      group_name: "",
      discount: 0,
      discount_type: "percentage",
      description: "",
      active_status: true,
      selectedTaxes: [],
    });
  };

  const API_URL = "/customer_groups"; // Correct URL
  const handleTaxChange = (index, value) => {
    const updated = [...formData.selectedTaxes];
    updated[index] = value;
    setFormData({ ...formData, selectedTaxes: updated });
  };

  const addTax = () => {
    setFormData({
      ...formData,
      selectedTaxes: [...formData.selectedTaxes, null],
    });
  };

  const removeTax = (index) => {
    const updated = [...formData.selectedTaxes];
    updated.splice(index, 1);
    setFormData({ ...formData, selectedTaxes: updated });
  };

  // Filter customer groups based on the search text
  const filteredGroups = useMemo(() => {
    return customerGroups.filter((group) =>
      ["group_name", "discount", "active_status"].some((key) =>
        (group[key] || "")
          .toString()
          .toLowerCase()
          .includes(filterText.toLowerCase())
      )
    );
  }, [filterText, customerGroups]);
  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const columns = [
    {
      name: "Group Name",
      selector: (row) => row.group_name,
      sortable: true,
    },
    {
      name: "Discount",
      selector: (row) =>
        `${row.discount}${row.discount_type === "percentage" ? "%" : ""}`,
      sortable: true,
    },
    {
      name: "Taxes",
      selector: (row) =>
        row.taxes
          ? row.taxes.map((tax) => tax.tax_name).join(", ")
          : "No taxes",
      sortable: true,
    },
    {
      name: "Active Status",
      selector: (row) => (row.active_status ? "Active" : "Not Active"),
      sortable: true,
    },
    {
      name: "Actions",
      cell: (row) => (
        <div className="flex items-center space-x-4">
          <button
            onClick={() => handleEditCustomerGroup(row)}
            className="text-indigo-600 hover:text-indigo-800"
          >
            <FaEdit />
          </button>
          <button
            onClick={() => handleDeleteGroup(row.id)}
            className="text-red-600 hover:text-red-800"
          >
            <FaTrash />
          </button>
        </div>
      ),
    },
  ];

  // Handle adding a new customer group
  const handleAddGroup = async () => {
    setLoading(true)
    try {

      const response = await API.post(API_URL, formData);

      const newGroup = response.data;
      setCustomerGroups([...customerGroups, newGroup]);

      resetForm();
      setIsFormVisible(false);

      toast.success("Customer group added successfully!");
      setLoading(false)
    } catch (error) {
      console.error("Error adding customer group:", error);
      toast.error("Failed to add customer group.");
      setLoading(false)
    }
  };

  // Handle editing an existing group
  const handleEditCustomerGroup = (group) => {
    console.log("group taxes", group);
    setFormData({
      group_name: group.group_name,
      discount: group.discount,
      discount_type: group.discount_type,
      description: group.description,
      active_status: group.active_status === 1,
      selectedTaxes: group.taxes.map((tax) => tax.id), // Extract only IDs
    });
    setEditingGroupId(group.id);
    setIsFormVisible(true);
  };

  // Handle updating a customer group
  const handleUpdateGroup = async () => {
    try {
      const response = await API.put(`${API_URL}/${editingGroupId}`, formData);

      const updatedGroup = await response.data;

      setCustomerGroups(
        customerGroups.map((group) =>
          group.id === editingGroupId ? updatedGroup : group
        )
      );

      // Reset form and hide it
      resetForm();
      setIsFormVisible(false);
      setEditingGroupId(null);

      toast.success("Customer group updated successfully!");
    } catch (error) {
      console.error("Error updating customer group:", error);
      toast.error("Failed to update customer group.");
    }
  };

  const handleDeleteGroup = async (groupId) => {
    try {
      await API.delete(`${API_URL}/${groupId}`);

      setCustomerGroups(customerGroups.filter((group) => group.id !== groupId));
      toast.success("Customer group deleted successfully!");
    } catch (error) {
      console.error("Error deleting customer group:", error);
      toast.error("Failed to delete customer group.");
    }
  };
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch both taxes and customer groups in parallel
        const [taxesResponse, groupsResponse] = await Promise.all([
          API.get("/taxes"),
          API.get("/customer_groups"),
        ]);

        setTaxes(taxesResponse.data);
        setTaxRates(taxesResponse.data);
        setCustomerGroups(groupsResponse.data);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to fetch data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [handleAddGroup, handleUpdateGroup]);
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <button
        onClick={() => setIsFormVisible(true)}
        className="bg-indigo-500 text-white px-6 py-2 rounded-full shadow-md hover:bg-indigo-600 mb-6 transition-all duration-300 text-sm"
      >
        Add New Customer Group
      </button>

      {isFormVisible && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex justify-center items-center">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl p-6">
            <h2 className="text-2xl font-medium text-gray-800 mb-4 text-center">
              {editingGroupId ? "Edit Customer Group" : "Create Customer Group"}
            </h2>
            <form
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
              onSubmit={(e) => e.preventDefault()}
            >
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    name="group_name"
                    value={formData.group_name}
                    onChange={handleInputChange}
                    placeholder="Enter group name"
                    className="border border-gray-300 p-3 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                  />
                </div>

                {/* Multiple Tax Selection */}
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Select Taxes:
                  </label>
                  {formData.selectedTaxes.map((taxId, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-2 mb-2"
                    >
                      <select
                        value={taxId}
                        onChange={(e) =>
                          handleTaxChange(index, parseInt(e.target.value))
                        }
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="">-- Select Tax --</option>
                        {taxes
                          .filter(
                            (tax) =>
                              !formData.selectedTaxes.includes(tax.id) ||
                              tax.id === taxId
                          )
                          .map((tax) => (
                            <option key={tax.id} value={tax.id}>
                              {tax.tax_name} ({tax.tax_rate}%)
                            </option>
                          ))}
                      </select>

                      {formData.selectedTaxes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTax(index)}
                          className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:outline-none"
                        >
                          <AiOutlineMinus size={20} />
                        </button>
                      )}
                    </div>
                  ))}

                  {formData.selectedTaxes.length < taxes.length && (
                    <button
                      type="button"
                      onClick={addTax}
                      className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none flex items-center"
                    >
                      <AiOutlinePlus size={20} className="mr-2" /> Add Tax
                    </button>
                  )}
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Discount Section */}
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Discount Type:
                  </label>
                  <select
                    id="discountType"
                    name="discount_type"
                    value={formData.discount_type}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Discount Amount:
                  </label>
                  <input
                    id="discount"
                    type="number"
                    name="discount"
                    value={formData.discount}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Group Description"
                    className="border border-gray-300 p-3 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                    rows="3"
                  />
                </div>

                {/* Active Status */}
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    name="active_status"
                    checked={formData.active_status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        active_status: e.target.checked,
                      })
                    }
                    className="h-5 w-5"
                  />
                  <label className="text-gray-700 text-sm">Active Status</label>
                </div>
              </div>
            </form>

            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => setIsFormVisible(false)}
                className="bg-gray-200 text-gray-700 px-5 py-2 rounded-xl hover:bg-gray-300 transition duration-200 text-sm"
              >
                Cancel
              </button>
              <button
                disabled={loading}
                onClick={editingGroupId ? handleUpdateGroup : handleAddGroup}
                className="bg-indigo-500 text-white px-5 py-2 rounded-xl hover:bg-indigo-600 transition duration-200 text-sm"
              >
                {editingGroupId ? "Update Group" : "Add Group"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 overflow-x-auto bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-medium text-gray-800 mb-4">
          Customer Groups
        </h2>
        <div className="mb-4 flex justify-end">
          <input
            type="text"
            placeholder="Search customer groups"
            className="p-2 border border-gray-300 rounded-md"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
        </div>
        <DataTable
          className="z-0"
          columns={columns}
          data={filteredGroups}
          pagination
          highlightOnHover
          responsive
          striped
        />
      </div>
    </div>
  );
};

export default CustomerGroup;
