import React, { useState, useEffect } from "react";
import API from "../api.js";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const AddProducts = ({ onProductsAdded }) => {
  const [products, setProducts] = useState([
    { name: "", cp: "", sp: "" },
  ]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Fetch suppliers from the API
    const fetchSuppliers = async () => {
      try {
        const response = await API.get("/suppliers");
        setSuppliers(response.data);
      } catch (error) {
        console.error("Error fetching suppliers:", error);
        toast.error("Failed to fetch suppliers. Please try again.");
      }
    };

    fetchSuppliers();
  }, []);

  const handleChange = (index, e) => {
    const { name, value } = e.target;
    const updatedProducts = [...products];
    updatedProducts[index][name] = value;
    setProducts(updatedProducts);
  };

  const addProduct = () => {
    setProducts([...products, { name: "", cp: "", sp: "" }]);
  };

  const removeProduct = (index) => {
    if (products.length > 1) {
      const updatedProducts = products.filter((_, i) => i !== index);
      setProducts(updatedProducts);
    } else {
      toast.error("You must add at least one product.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    
    const invalidProduct = products.find(
      (product) =>
        !product.name ||
        isNaN(product.cp) ||
        isNaN(product.sp) ||
        product.cp < 0 ||
        product.sp < 0
    );
  
    if (invalidProduct) {
      toast.error(
        "All fields are required, and prices must be non-negative numbers."
      );
      return;
    }
  
    setIsSubmitting(true);
  
    try {
      // Prepare JSON payload
      const payload = {
        suppliers_id: selectedSupplier,
        products: products.map(({ name, cp, sp }) => ({
          name,
          cp: parseFloat(cp),
          sp: parseFloat(sp),
        })),
      };
  
      // Send JSON payload
      const response = await API.post(
        "/products/bulk",
        payload,
        {
          headers: { "Content-Type": "application/json" },
        }
      );
  
      toast.success("Products added successfully!");
  
      setProducts([{ name: "", cp: "", sp: "" }]);
      setIsSubmitting(false);
  
      if (onProductsAdded) onProductsAdded(response.data);
    } catch (error) {
      console.error("Error adding products:", error);
      toast.error("Failed to add products. Please try again.");
      setIsSubmitting(false);
    }
  };
  

  return (
    <div className="max-w-4xl max-h-[calc(100vh-100px)] overflow-y-scroll mx-auto mt-8 p-6 bg-white shadow-md rounded-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Add Products</h2>
      <form onSubmit={handleSubmit}>
        {/* Supplier Selection */}
        <div className="mb-6 flex justify-end w-full">
          <div className="w-1/2">
            <label
              htmlFor="supplier"
              className="block text-sm font-medium text-gray-700"
            >
              Supplier
            </label>
            <select
              id="supplier"
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              
            >
              <option value="">Select a supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.type === "business"
                    ? supplier.business_name
                    : supplier.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {products.map((product, index) => (
          <div key={index} className="mb-6 border-b pb-4">
            <div className="grid grid-cols-3 gap-4 items-center">
              {/* Name */}
              <div>
                <label
                  htmlFor={`name-${index}`}
                  className="block text-sm font-medium text-gray-700"
                >
                  Product Name
                </label>
                <input
                  type="text"
                  id={`name-${index}`}
                  name="name"
                  value={product.name}
                  onChange={(e) => handleChange(index, e)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>

              {/* Cost Price */}
              <div>
                <label
                  htmlFor={`cp-${index}`}
                  className="block text-sm font-medium text-gray-700"
                >
                  Cost Price
                </label>
                <input
                  type="number"
                  id={`cp-${index}`}
                  name="cp"
                  value={product.cp}
                  onChange={(e) => handleChange(index, e)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  
                />
              </div>

              {/* Selling Price */}
              <div>
                <label
                  htmlFor={`sp-${index}`}
                  className="block text-sm font-medium text-gray-700"
                >
                  Selling Price
                </label>
                <input
                  type="number"
                  id={`sp-${index}`}
                  name="sp"
                  value={product.sp}
                  onChange={(e) => handleChange(index, e)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  
                />
              </div>

              {/* Remove Button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => removeProduct(index)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addProduct}
          className="w-full py-2 px-4 mb-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          Add Another Product
        </button>

        <button
          type="submit"
          className={`w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white shadow-sm ${
            isSubmitting
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Adding Products..." : "Add Products"}
        </button>
      </form>
    </div>
  );
};

export default AddProducts;
