import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "./AuthContext";

const Login = () => {
  const [form, setForm] = useState({
    email: "",
    password: ""
  });
  const { login, setUser } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prevForm => ({
      ...prevForm,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission
    
    try {
      // Call the login function with the form object
       await login({ form });
      
      // Show success message
      toast.success("Login successful!");
      
      // Redirect to home or dashboard
      navigate("/");
    } catch (error) {
      toast.error(error.message|| "Login failed");
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <div className="bg-white p-6 rounded shadow-md w-96">
        <h2 className="text-xl font-semibold mb-4">Login</h2>
        <form onSubmit={handleSubmit}>
          <div>
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              className="w-full p-2 mb-2 border rounded"
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              className="w-full p-2 mb-2 border rounded"
              required
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors"
            >
              Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;