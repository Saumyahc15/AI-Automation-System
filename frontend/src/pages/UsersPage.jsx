import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, Plus, Edit2, Trash2, Eye, EyeOff, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

const UsersPage = () => {
  const { user, hasRole } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // create or edit
  const [editingUser, setEditingUser] = useState(null);
  const [expandedUser, setExpandedUser] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff',
    status: 'active',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  // Only Owner can access this page
  if (!hasRole('owner')) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">Only owners can manage users</p>
          </div>
        </div>
      </div>
    );
  }

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await authAPI.listUsers();
      const mappedUsers = (response.data || []).map((entry) => ({
        id: entry.user_id,
        display_id: `USR-${String(entry.user_id).padStart(3, '0')}`,
        name: entry.name,
        email: entry.email,
        role: entry.role,
        status: entry.is_active ? 'active' : 'inactive',
        created_at: entry.created_at,
        last_login: entry.last_login,
        activity_count: 0,
        permissions: getPerm(entry.role),
      }));
      setUsers(mappedUsers);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics
  const metrics = {
    total_users: users.length,
    active_users: users.filter((u) => u.status === 'active').length,
    owners: users.filter((u) => u.role === 'owner').length,
    managers: users.filter((u) => u.role === 'manager').length,
    staff: users.filter((u) => u.role === 'staff').length,
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (modalMode === 'create') {
        await authAPI.createUser({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        });
        setSuccess('User created successfully!');
      } else {
        await authAPI.updateUser(editingUser.id, {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          is_active: formData.status === 'active',
        });
        setSuccess('User updated successfully!');
      }

      setShowModal(false);
      resetForm();
      fetchUsers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to save user');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'staff',
      status: 'active',
    });
    setEditingUser(null);
    setModalMode('create');
  };

  // Edit user
  const handleEdit = (u) => {
    setEditingUser(u);
    setFormData({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      status: u.status,
    });
    setModalMode('edit');
    setShowModal(true);
  };

  // Delete user
  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      authAPI.deleteUser(id)
        .then(() => {
          setSuccess('User deleted successfully!');
          fetchUsers();
          setTimeout(() => setSuccess(null), 3000);
        })
        .catch((err) => {
          setError(err.response?.data?.detail || err.message || 'Failed to delete user');
        });
    }
  };

  // Get permissions
  const getPerm = (role) => {
    const perms = {
      owner: 'Full access',
      manager: 'Manage automations, reports, analytics',
      staff: 'View-only access',
    };
    return perms[role] || perms.staff;
  };

  // Get role badge
  const getRoleBadge = (role) => {
    const roleConfig = {
      owner: { color: 'bg-purple-100 text-purple-800', label: '👑 Owner' },
      manager: { color: 'bg-blue-100 text-blue-800', label: '👔 Manager' },
      staff: { color: 'bg-gray-100 text-gray-800', label: '👤 Staff' },
    };
    return roleConfig[role] || roleConfig.staff;
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', label: '🟢 Active' },
      inactive: { color: 'bg-gray-100 text-gray-800', label: '⚫ Inactive' },
    };
    return statusConfig[status] || statusConfig.active;
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                <p className="text-gray-600 text-sm mt-1">Create, edit, and manage team members (Owner only)</p>
              </div>
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              >
                <Plus size={18} />
                Add User
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-8">
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="text-green-600" size={20} />
              <p className="text-green-800">{success}</p>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="text-red-600" size={20} />
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-sm text-gray-600">Total Users</div>
              <div className="text-2xl font-bold text-gray-900">{metrics.total_users}</div>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="text-sm text-green-600">Active</div>
              <div className="text-2xl font-bold text-green-900">{metrics.active_users}</div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="text-sm text-purple-600">Owners</div>
              <div className="text-2xl font-bold text-purple-900">{metrics.owners}</div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="text-sm text-blue-600">Managers</div>
              <div className="text-2xl font-bold text-blue-900">{metrics.managers}</div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="text-sm text-gray-600">Staff</div>
              <div className="text-2xl font-bold text-gray-900">{metrics.staff}</div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {users.length === 0 ? (
              <div className="p-12 text-center">
                <UsersIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Email</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Role</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Last Login</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Activity</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map((u) => {
                      const isExpanded = expandedUser === u.id;
                      const roleBadge = getRoleBadge(u.role);
                      const statusBadge = getStatusBadge(u.status);

                      return (
                        <React.Fragment key={u.id}>
                          <tr className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4">
                              <div className="font-medium text-gray-900">{u.name}</div>
                              <div className="text-xs text-gray-500">{u.display_id}</div>
                            </td>
                            <td className="px-6 py-4 text-gray-600">{u.email}</td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${roleBadge.color}`}>
                                {roleBadge.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusBadge.color}`}>
                                {statusBadge.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-600 text-sm">{u.last_login}</td>
                            <td className="px-6 py-4 text-right text-gray-600 text-sm">{u.activity_count}</td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex justify-center gap-2">
                                <button
                                  onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  {isExpanded ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                                <button
                                  onClick={() => handleEdit(u)}
                                  className="text-orange-600 hover:text-orange-800"
                                >
                                  <Edit2 size={18} />
                                </button>
                                <button
                                  onClick={() => handleDelete(u.id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <tr className="bg-blue-50 border-t-2 border-blue-200">
                              <td colSpan="7" className="px-6 py-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Account Info</h4>
                                    <div className="space-y-1 text-sm text-gray-600">
                                      <p>Created: <span className="font-medium text-gray-900">{u.created_at}</span></p>
                                      <p>User ID: <span className="font-medium text-gray-900">{u.display_id}</span></p>
                                    </div>
                                  </div>

                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Activity</h4>
                                    <div className="space-y-1 text-sm text-gray-600">
                                      <p>Total Actions: <span className="font-medium text-gray-900">{u.activity_count}</span></p>
                                      <p>Last Login: <span className="font-medium text-gray-900">{u.last_login}</span></p>
                                    </div>
                                  </div>

                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Permissions</h4>
                                    <p className="text-sm text-gray-600">{u.permissions}</p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* User Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {modalMode === 'create' ? 'Create New User' : 'Edit User'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  {modalMode === 'create' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="staff">Staff (View-only)</option>
                      <option value="manager">Manager (Edit)</option>
                      <option value="owner">Owner (Full)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        resetForm();
                      }}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      {modalMode === 'create' ? 'Create' : 'Update'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UsersPage;
