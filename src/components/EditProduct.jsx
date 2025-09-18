import React, { useState, useEffect } from "react";
import API from "../api.js";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const EditProduct = ({ onProductUpdated }) => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    cp: "",
    sp: "",
    stock: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    // Fetch all products
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
  }, []);

  const handleSelectProduct = (e) => {
    const productId = e.target.value;
    const product = products.find((prod) => prod.id === parseInt(productId));
    setSelectedProduct(product);

    if (product) {
      setFormData({
        name: product.name,
        cp: product.cp,
        sp: product.sp,
        stock: product.stock,
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
    const { name, cp, sp, stock } = formData;

    if (!name || !cp || !sp || !stock) {
      toast.error("All fields are required!");
      return;
    }

    if (isNaN(cp) || isNaN(sp) || isNaN(stock)) {
      toast.error("Cost price, selling price, and stock must be numbers!");
      return;
    }

    setIsSubmitting(true);

    try {
      await API.put(`/products/${selectedProduct.id}`, {
        name,
        cp: parseFloat(cp),
        sp: parseFloat(sp),
        stock: parseInt(stock, 10),
      });

      toast.success("Product updated successfully!");

      // Clear form and reset selection
      setFormData({ name: "", cp: "", sp: "", stock: "" });
      setSelectedProduct(null);
      setIsSubmitting(false);

      if (onProductUpdated) onProductUpdated();
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error("Failed to update product. Please try again.");
      setIsSubmitting(false);
    }
  };
  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white shadow-md rounded-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Edit Product</h2>

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
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Product Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="cp"
              className="block text-sm font-medium text-gray-700"
            >
              Cost Price (CP)
            </label>
            <input
              type="text"
              id="cp"
              name="cp"
              value={formData.cp}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="sp"
              className="block text-sm font-medium text-gray-700"
            >
              Selling Price (SP)
            </label>
            <input
              type="text"
              id="sp"
              name="sp"
              value={formData.sp}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="stock"
              className="block text-sm font-medium text-gray-700"
            >
              Stock Quantity
            </label>
            <input
              type="text"
              id="stock"
              name="stock"
              value={formData.stock}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              readOnly
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
            {isSubmitting ? "Updating Product..." : "Update Product"}
          </button>
        </form>
      )}
    </div>
  );
};

export default EditProduct;
