import React from 'react';
import { FaExclamationCircle, FaCheckCircle } from 'react-icons/fa'; // Stock status icons

const ProductCard = ({ product }) => {
  return (
    <div className="max-w-sm rounded-lg overflow-hidden border border-gray-300 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
      <div className="p-4">
        {/* Product Image */}
        {product.image ? (
          <img 
            src={product.image} 
            alt={product.name} 
            className="w-full h-32 object-cover rounded-md mb-4"
          />
        ) : (
          <div 
            className="w-full bg-gray-200 h-32 flex items-center justify-center rounded-md mb-4 text-gray-500 text-xs font-medium"
          >
            Add Product Image
          </div>
        )}

        {/* Product Name and Price */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-800">{product.name}</span>
          {<span className="text-sm font-semibold text-gray-700">₵{product.cp?`${parseFloat(product.cp).toFixed(2)}`:"Not set"}</span>}
        </div>

        {/* Stock Status */}
        <div className="flex items-center text-xs">
          {product.quantity_in_stock > 0 ? (
            <>
              <FaCheckCircle className="text-green-500 mr-2" />
              <p className="text-gray-600">{product.quantity_in_stock} in stock</p>
            </>
          ) : (
            <>
              <FaExclamationCircle className="text-red-500 mr-2" />
              <p className="text-gray-600">Out of stock</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
