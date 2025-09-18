import React, { useState, useEffect } from "react";
import API from "../api.js";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const EditStock = ({ onStockUpdated }) => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState({
    additionalStock: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await API.get("/products");
        setProducts(response.data);
      } catch (error) {
        console.error("Error fetching products:", error);
      toast.error(error.response.data.error|| "Failed to fetch products. Please try again.");
      }
    };

    fetchProducts();
  }, [setIsSubmitting, isSubmitting]);

  const handleSelectProduct = (e) => {
    const productId = e.target.value;
    const product = products.find((prod) => prod.id === parseInt(productId));
    setSelectedProduct(product);

    if (product) {
      setFormData({
        additionalStock: "",
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    const { additionalStock } = formData;

    if (!additionalStock) {
      toast.error("Stock quantity is required!");
      return;
    }

    if (isNaN(additionalStock) || parseInt(additionalStock, 10) <= 0) {
      toast.error("Stock quantity must be a positive number!");
      return;
    }

    setIsSubmitting(true);

    try {
      const newStock = selectedProduct.stock + parseInt(additionalStock, 10);
      await API.put(`/products/${selectedProduct.id}`, {
        stock: newStock,
      });

      toast.success("Stock updated successfully!");

      // Clear form, reset selection, and optionally refetch products
      setFormData({ additionalStock: "" });
      setSelectedProduct(null); // Reset the selected product
      setIsSubmitting(false);

      // If you have a parent handler for stock update, call it
      if (onStockUpdated) onStockUpdated();

      // Reset the dropdown to the default value (placeholder)
      document.getElementById("productSelect").value = "";
    } catch (error) {
      console.error("Error updating stock:", error);
      toast.error("Failed to update stock. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white shadow-md rounded-lg">
      

      <h2 className="text-2xl font-bold mb-4 text-gray-800">Edit Stock</h2>

      <div className="mb-4">
        <label
          htmlFor="productSelect"
          className="block text-sm font-medium text-gray-700"
        >
          Select Product
        </label>
        <select
          id="productSelect"
          onChange={handleSelectProduct}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
          <option value="">-- Select a Product --</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
      </div>

      {selectedProduct && (
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="currentStock"
              className="block text-sm font-medium text-gray-700"
            >
              Current Stock
            </label>
            <input
              type="text"
              id="currentStock"
              value={selectedProduct.stock}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              disabled
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="additionalStock"
              className="block text-sm font-medium text-gray-700"
            >
              Additional Stock
            </label>
            <input
              type="text"
              id="additionalStock"
              name="additionalStock"
              value={formData.additionalStock}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            />
          </div>

          <button
            type="submit"
            className={`w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white shadow-sm ${
              isSubmitting
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Updating Stock..." : "Update Stock"}
          </button>
        </form>
      )}
    </div>
  );
};

export default EditStock;
