import React, { createContext, useContext, useState, useEffect } from "react";
import API from "./api";

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  // Load cart from localStorage on initial render
  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (
    product,
    quantity,
    sellingPrice,
    taxes, // Now an array of selected taxes
    discountType,
    discountAmount,
    description
  ) => {
    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex(
        (item) => item.product.id === product.id
      );

      if (existingItemIndex !== -1) {
        // Update the quantity and other details of the existing item
        const updatedCart = [...prevCart];
        updatedCart[existingItemIndex] = {
          ...updatedCart[existingItemIndex],
          quantity: updatedCart[existingItemIndex].quantity + quantity,
          description,
        };
        return updatedCart;
      }

      // If the product is not in the cart, add it with the specified details
      return [
        ...prevCart,
        {
          product,
          quantity,
          sellingPrice,
          taxes, // Store multiple taxes
          discountType,
          discountAmount,
          description,
        },
      ];
    });
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem("cart");
  };

  const processSale = async (
    referenceNumber,
    customerId,
    paymentMethod,
    date
  ) => {
    try {
      const salesData = cart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        reference_number: referenceNumber,
        customer_id: customerId,
        payment_method: paymentMethod,
        selling_price: item.sellingPrice,
        taxes: item.taxes,
        discount_type: item.discountType,
        discount_amount: item.discountAmount,
        description: item.description,
        date: date,
      }));

      const totalAmount = cart.reduce(
        (sum, item) => sum + item.sellingPrice * item.quantity,
        0
      );

      // Process sale
      const saleResponse = await API.post("/sales", salesData);

      if (saleResponse.status !== 201) {
        throw new Error(`Failed to process sale: ${saleResponse.statusText}`);
      }

      // Process payment
      const paymentResponse = await API.post("/payments", {
        customerId,
        reference_number: referenceNumber,
        payment_date: date,
        amount_paid: totalAmount,
        payment_method: "cash",
        payment_reference: referenceNumber,
      });

      if (paymentResponse.status !== 201) {
        throw new Error(
          `Failed to process payment: ${paymentResponse.statusText}`
        );
      }

      // Return a standardized response object
      return {
        status: 201, 
        data: {
          sale: saleResponse.data,
          payment: paymentResponse.data,
        },
        message: "Sale and payment processed successfully",
      };
    } catch (error) {
      console.error("Error in sale/payment processing:", error.response.data.errors[0]);

      return {
        status: error.response?.status || 500,
        error: error.response.data.errors[0] , 
        message:
           error.response.data.errors[0]
      };
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, setCart, addToCart, processSale, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
};
