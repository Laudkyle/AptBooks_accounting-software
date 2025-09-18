import React, { useState, useEffect } from "react";
import API from "../api.js";
import DataTable from "react-data-table-component";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const SaleReturnList = () => {
  const [returns, setReturns] = useState([]);
  const [filteredReturns, setFilteredReturns] = useState([]);
  const [filterText, setFilterText] = useState("");

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      const response = await API.get("/sales/returns");
      setReturns(response.data);
      setFilteredReturns(response.data);
    } catch (error) {
      console.error("Error fetching returns:", error);
      toast.error("Error fetching returns. Please try again.");
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value.toLowerCase();
    setFilterText(value);

    const filtered = returns.filter(
      (returnItem) =>
        returnItem.reference_number.toString().includes(value) ||
        returnItem.action.toLowerCase().includes(value)
    );
    setFilteredReturns(filtered);
  };

  const columns = [
    {
      name: "Reference Number",
      selector: (row) => row.reference_number,
      sortable: true,
    },
    {
      name: "Return Quantity",
      selector: (row) => row.return_quantity,
      sortable: true,
    },
    {
      name: "Action",
      selector: (row) => row.action,
      sortable: true,
    },
    {
      name: "Return Date",
      selector: (row) => new Date(row.return_date).toLocaleDateString(),
      sortable: true,
    },
  ];

  return (
    <div className="p-6 overflow-y-scroll h-[85vh]">
      <h2 className="text-2xl px-6 font-semibold text-gray-800 mb-4">
        Sale Return List
      </h2>
      
      <div className="bg-white mx-6 shadow-sm rounded-md p-6">
        <DataTable
          className="z-0"
          columns={columns}
          data={filteredReturns}
          pagination
          highlightOnHover
          responsive
          striped
          subHeader
          subHeaderComponent={
            <input
              type="text"
              placeholder="Search returns"
              className="p-2 border border-gray-300 rounded-md"
              onChange={handleSearch}
            />
          }
        />
      </div>
    </div>
  );
};

export default SaleReturnList;
