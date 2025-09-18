import React, { useState, useEffect } from 'react';
import API from "../api.js";
import { useNavigate } from 'react-router-dom';
import { FiEdit, FiLock, FiUser, FiPhone, FiMail, FiCalendar, FiCheckCircle, FiXCircle } from 'react-icons/fi';

const ProfilePage = () => {
  const [user, setUser] = useState({
    email: '',
    username: '',
    phone: '',
    role: '',
    created_at: ''
  });
  const [editMode, setEditMode] = useState(false);
  const [passwordMode, setPasswordMode] = useState(false);
  const [formData, setFormData] = useState({
    email: user.email,
    username: user.username,
    phone: user.phone,
    role: user.role||'user',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const response = await API.get('/profile');
      setUser(response.data);
      setFormData({
        username: response.data.username,
        phone: response.data.phone,
        role: response.data.role
      });
      setError('');
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError('Failed to fetch profile data. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await API.put('/profile', formData);
      console.log(formData)
      setMessage('Profile updated successfully!');
      setEditMode(false);
      fetchProfile();
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed. Please check your information and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("New passwords don't match");
      return;
    }

    setIsLoading(true);
    try {
      const response = await API.put('/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setMessage('Password changed successfully!');
      setPasswordMode(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Password change failed. Please ensure your current password is correct.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="p-6 bg-white rounded shadow-md h-[calc(100vh-80px)] overflow-y-scroll">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">Account Settings</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your profile information and security settings
          </p>
        </div>

        {/* Alert Messages */}
        {message && (
          <div className="mb-6 rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <FiCheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">{message}</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <FiXCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Profile View */}
        {!editMode && !passwordMode && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Personal Information
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Your account details and preferences
              </p>
            </div>
            <div className="px-4 py-5 sm:p-6">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center">
                    <FiMail className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Email address</p>
                      <p className="mt-1 text-sm text-gray-900">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <FiUser className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Username</p>
                      <p className="mt-1 text-sm text-gray-900">{user.username}</p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <FiPhone className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Phone number</p>
                      <p className="mt-1 text-sm text-gray-900">
                        {user.phone || 'Not provided'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <FiUser className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Account type</p>
                      <p className="mt-1 text-sm text-gray-900 capitalize">
                        {user.role}
                      </p>
                    </div>
                  </div>

                  
                </div>
              )}
            </div>
            <div className="px-4 py-4 bg-gray-50 sm:px-6 flex justify-end space-x-3">
              <button
                onClick={() => setEditMode(true)}
                type="button"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <FiEdit className="mr-2 h-4 w-4" />
                Edit Profile
              </button>
              <button
                onClick={() => setPasswordMode(true)}
                type="button"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <FiLock className="mr-2 h-4 w-4" />
                Change Password
              </button>
            </div>
          </div>
        )}
{/* Edit Profile Form */}
{editMode && (
  <div className="bg-white shadow overflow-hidden sm:rounded-lg">
    <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
      <h3 className="text-lg leading-6 font-medium text-gray-900">
        Edit Profile
      </h3>
      <p className="mt-1 max-w-2xl text-sm text-gray-500">
        Update your personal information
      </p>
    </div>
    <form onSubmit={handleProfileUpdate}>
      <div className="px-4 py-5 sm:p-6 space-y-6">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email Address
          </label>
          <div className="mt-1">
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
              required
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="username"
            className="block text-sm font-medium text-gray-700"
          >
            Username
          </label>
          <div className="mt-1">
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
              required
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-700"
          >
            Phone Number
          </label>
          <div className="mt-1">
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </div>

        {/* Role Field (Admin Only) */}
        {user.role === 'admin' && (
          <div>
            <label
              htmlFor="role"
              className="block text-sm font-medium text-gray-700"
            >
              Role
            </label>
            <div className="mt-1">
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
              >
                <option value="user">User</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          </div>
        )}
      </div>
      <div className="px-4 py-4 bg-gray-50 sm:px-6 flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => {
            setEditMode(false);
            setError('');
           
          }}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </form>
  </div>
)}
        {/* Change Password Form */}
        {passwordMode && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Change Password
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Ensure your account is secure with a strong password
              </p>
            </div>
            <form onSubmit={handlePasswordUpdate}>
              <div className="px-4 py-5 sm:p-6 space-y-6">
                <div>
                  <label
                    htmlFor="currentPassword"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Current Password
                  </label>
                  <div className="mt-1">
                    <input
                      type="password"
                      id="currentPassword"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                      required
                      minLength="6"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="newPassword"
                    className="block text-sm font-medium text-gray-700"
                  >
                    New Password
                  </label>
                  <div className="mt-1">
                    <input
                      type="password"
                      id="newPassword"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                      required
                      minLength="6"
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Must be at least 6 characters long
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Confirm New Password
                  </label>
                  <div className="mt-1">
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                      required
                      minLength="6"
                    />
                  </div>
                </div>
              </div>
              <div className="px-4 py-4 bg-gray-50 sm:px-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setPasswordMode(false);
                    setError('');
                    setPasswordData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: ''
                    });
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;