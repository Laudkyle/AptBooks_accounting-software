import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaUserPlus, FaLock, FaUnlock } from 'react-icons/fa';
import API from '../api';
import { toast } from 'react-toastify';

const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    phone: '',
    password: '',
    role: 'user'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await API.get('/users');
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateOrUpdate = async () => {
    try {
      if (currentUser) {
        await API.put(`/users/${currentUser.id}`, formData);
        toast.success('User updated successfully!');
      } else {
        await API.post('/register', formData);
        toast.success('User created successfully!');
      }
      fetchUsers();
      setShowModal(false);
      setFormData({ email: '', username: '', phone: '', password: '', role: 'user' });
    } catch (error) {
      toast.error(error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await API.delete(`/users/${id}`);
        toast.success('User deleted');
        fetchUsers();
      } catch (error) {
        toast.error('Error deleting user');
      }
    }
  };

  const toggleStatus = async (id, status) => {
    try {
      await API.put(`/users/${id}/status`, { active: status === "active" ? "Inactive" : "active" });
      toast.success('Status updated');
      fetchUsers();
    } catch (error) {
      toast.error('Error updating status');
    }
  };

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(filterText.toLowerCase()) ||
    u.username.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Users Management</h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search users..."
            className="border px-3 py-1.5 rounded-md text-sm shadow-sm focus:outline-none"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
          <button
            className="bg-blue-600 text-white px-3 py-2 rounded-md flex items-center gap-2 text-sm hover:bg-blue-700"
            onClick={() => {
              setCurrentUser(null);
              setFormData({ email: '', username: '', phone: '', password: '', role: 'user' });
              setShowModal(true);
            }}
          >
            <FaUserPlus /> Add User
          </button>
        </div>
      </div>

      <div className="overflow-x-auto shadow-sm rounded-lg bg-white">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-100 text-gray-600 uppercase">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="text-center py-6">Loading...</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan="6" className="text-center py-6">No users found</td></tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">{user.email}</td>
                  <td className="px-4 py-2">{user.username}</td>
                  <td className="px-4 py-2">{user.phone}</td>
                  <td className="px-4 py-2 capitalize">{user.role}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.status === "active" ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex gap-3 justify-center text-lg">
                      <button
                        onClick={() => {
                          setCurrentUser(user);
                          setFormData({
                            email: user.email,
                            username: user.username,
                            phone: user.phone,
                            password: '',
                            role: user.role
                          });
                          setShowModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FaTrash />
                      </button>
                      <button
                        onClick={() => toggleStatus(user.id, user.status)}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        {user.status === "active" ? <FaLock /> : <FaUnlock />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
            <h3 className="text-xl font-semibold mb-4">
              {currentUser ? 'Edit User' : 'Create User'}
            </h3>
            <div className="space-y-3">
              <input
                type="email"
                name="email"
                placeholder="Email"
                className="w-full border px-3 py-2 rounded-md"
                value={formData.email}
                onChange={handleInputChange}
              />
              <input
                type="text"
                name="username"
                placeholder="Username"
                className="w-full border px-3 py-2 rounded-md"
                value={formData.username}
                onChange={handleInputChange}
              />
              <input
                type="tel"
                name="phone"
                placeholder="Phone"
                className="w-full border px-3 py-2 rounded-md"
                value={formData.phone}
                onChange={handleInputChange}
              />
              <input
                type="password"
                name="password"
                placeholder={currentUser ? 'Leave blank to keep current password' : 'Password'}
                className="w-full border px-3 py-2 rounded-md"
                value={formData.password}
                onChange={handleInputChange}
              />
              <select
                name="role"
                className="w-full border px-3 py-2 rounded-md"
                value={formData.role}
                onChange={handleInputChange}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="px-4 py-2 border rounded-md hover:bg-gray-100"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                onClick={handleCreateOrUpdate}
              >
                {currentUser ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManagement;
