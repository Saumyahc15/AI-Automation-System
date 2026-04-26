import React, { useState, useEffect } from 'react';
import { Users, AlertCircle, CheckCircle, Eye, EyeOff, Plus } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { customersAPI, inventoryAPI, ordersAPI } from '../services/api';

const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [filterSegment, setFilterSegment] = useState('all'); // all, new, loyal, at-risk, inactive
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });

  useEffect(() => {
    fetchCustomersData();
  }, []);

  const fetchCustomersData = async () => {
    try {
      setLoading(true);
      const [customersRes, ordersRes, productsRes] = await Promise.all([
        customersAPI.getAll(),
        ordersAPI.getAll({ limit: 500 }),
        inventoryAPI.getAll(),
      ]);

      const productMap = new Map((productsRes.data || []).map((product) => [product.product_id, product]));
      const ordersByCustomer = new Map();
      for (const order of ordersRes.data || []) {
        if (!order.customer_id) continue;
        if (!ordersByCustomer.has(order.customer_id)) {
          ordersByCustomer.set(order.customer_id, []);
        }
        ordersByCustomer.get(order.customer_id).push(order);
      }

      const now = new Date();
      const currentYear = now.getFullYear();
      const mappedCustomers = (customersRes.data || []).map((customer) => {
        const customerOrders = ordersByCustomer.get(customer.customer_id) || [];
        const daysSincePurchase = customer.last_purchase_date
          ? Math.floor((now.getTime() - new Date(customer.last_purchase_date).getTime()) / (24 * 60 * 60 * 1000))
          : null;
        const avgOrderValue = customer.total_orders > 0 ? customer.lifetime_value / customer.total_orders : 0;
        const preferredCategory = customerOrders.reduce((acc, order) => {
          const category = productMap.get(order.product_id)?.category || 'Uncategorized';
          acc[category] = (acc[category] || 0) + (order.quantity || 0);
          return acc;
        }, {});
        const topCategory = Object.entries(preferredCategory).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';
        const spentThisYear = customerOrders
          .filter((order) => new Date(order.order_date).getFullYear() === currentYear)
          .reduce((sum, order) => sum + (order.total_price || 0), 0);

        let segment = 'new';
        if ((daysSincePurchase ?? 9999) > 90) {
          segment = 'inactive';
        } else if ((daysSincePurchase ?? 9999) > 45) {
          segment = 'at-risk';
        } else if ((customer.total_orders || 0) >= 5) {
          segment = 'loyal';
        }

        const churnRisk =
          segment === 'inactive' ? 'critical' :
          segment === 'at-risk' ? 'high' :
          segment === 'loyal' ? 'low' : 'medium';

        return {
          id: `CUST-${String(customer.customer_id).padStart(3, '0')}`,
          name: customer.name,
          email: customer.email,
          phone: customer.phone || 'Not provided',
          segment,
          lifetime_value: customer.lifetime_value || 0,
          total_orders: customer.total_orders || 0,
          avg_order_value: avgOrderValue,
          last_purchase: customer.last_purchase_date,
          days_since_purchase: daysSincePurchase,
          signup_date: customer.created_at,
          customer_since_days: Math.floor((now.getTime() - new Date(customer.created_at).getTime()) / (24 * 60 * 60 * 1000)),
          churn_risk: churnRisk,
          purchase_frequency: customer.total_orders > 8 ? 'frequent' : customer.total_orders > 2 ? 'repeat' : 'early',
          preferred_category: topCategory,
          total_spent_this_year: spentThisYear,
        };
      });

      setCustomers(mappedCustomers);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  // Calculate customer metrics
  const metrics = {
    total_customers: customers.length,
    new_customers: customers.filter((c) => c.segment === 'new').length,
    loyal_customers: customers.filter((c) => c.segment === 'loyal').length,
    at_risk: customers.filter((c) => c.segment === 'at-risk').length,
    inactive: customers.filter((c) => c.segment === 'inactive').length,
    total_ltv: customers.reduce((sum, c) => sum + c.lifetime_value, 0),
    avg_ltv: (customers.reduce((sum, c) => sum + c.lifetime_value, 0) / customers.length || 0).toFixed(2),
  };

  // Filter customers
  const filteredCustomers = customers.filter((c) => {
    if (filterSegment === 'all') return true;
    return c.segment === filterSegment;
  });

  // Get segment badge
  const getSegmentBadge = (segment) => {
    const segmentConfig = {
      new: { color: 'bg-green-100 text-green-800', label: 'New Customer', icon: '✨' },
      loyal: { color: 'bg-blue-100 text-blue-800', label: 'Loyal Customer', icon: '⭐' },
      'at-risk': { color: 'bg-yellow-100 text-yellow-800', label: 'At Risk', icon: '⚠️' },
      inactive: { color: 'bg-gray-100 text-gray-800', label: 'Inactive', icon: '😴' },
    };
    return segmentConfig[segment] || segmentConfig.new;
  };

  // Get churn risk badge
  const getChurnRiskBadge = (risk) => {
    const riskConfig = {
      low: { color: 'text-green-600', label: 'Low Risk' },
      medium: { color: 'text-yellow-600', label: 'Medium Risk' },
      high: { color: 'text-orange-600', label: 'High Risk' },
      critical: { color: 'text-red-600', label: 'Critical Risk' },
    };
    return riskConfig[risk] || riskConfig.low;
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    try {
      await customersAPI.create(formData);
      setShowAddModal(false);
      setFormData({ name: '', email: '', phone: '' });
      setSuccess('Customer saved to database.');
      fetchCustomersData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to save customer');
    }
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
                <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
                <p className="text-gray-600 text-sm mt-1">Segment, insights, and customer analytics</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                >
                  <Plus size={18} />
                  Add Customer
                </button>
                <button
                  onClick={() => fetchCustomersData()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-8">
          {success && (
            <div className="mb-8 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="text-green-600" size={20} />
              <p className="text-green-800">{success}</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 mb-8">
              {error}
            </div>
          )}

          {/* Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-sm text-gray-600">Total Customers</div>
              <div className="text-2xl font-bold text-gray-900">{metrics.total_customers}</div>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="text-sm text-green-600">New</div>
              <div className="text-2xl font-bold text-green-900">{metrics.new_customers}</div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="text-sm text-blue-600">Loyal</div>
              <div className="text-2xl font-bold text-blue-900">{metrics.loyal_customers}</div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="text-sm text-yellow-600">At Risk</div>
              <div className="text-2xl font-bold text-yellow-900">{metrics.at_risk}</div>
            </div>
          </div>

          {/* LTV Info */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="text-sm text-purple-600">Total LTV</div>
              <div className="text-2xl font-bold text-purple-900">₹{metrics.total_ltv.toFixed(2)}</div>
            </div>
            <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
              <div className="text-sm text-indigo-600">Average LTV</div>
              <div className="text-2xl font-bold text-indigo-900">₹{metrics.avg_ltv}</div>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2 mb-6 flex-wrap">
            <button
              onClick={() => setFilterSegment('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterSegment === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              All ({metrics.total_customers})
            </button>
            <button
              onClick={() => setFilterSegment('new')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterSegment === 'new'
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              New ✨ ({metrics.new_customers})
            </button>
            <button
              onClick={() => setFilterSegment('loyal')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterSegment === 'loyal'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Loyal ⭐ ({metrics.loyal_customers})
            </button>
            <button
              onClick={() => setFilterSegment('at-risk')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterSegment === 'at-risk'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              At Risk ⚠️ ({metrics.at_risk})
            </button>
            <button
              onClick={() => setFilterSegment('inactive')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterSegment === 'inactive'
                  ? 'bg-gray-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Inactive 😴 ({metrics.inactive})
            </button>
          </div>

          {/* Customers Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {filteredCustomers.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No customers found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Email</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Lifetime Value</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Orders</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Last Purchase</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Segment</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Churn Risk</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredCustomers.map((customer) => {
                      const isExpanded = expandedCustomer === customer.id;
                      const segmentBadge = getSegmentBadge(customer.segment);
                      const churnRisk = getChurnRiskBadge(customer.churn_risk);
                      
                      return (
                        <React.Fragment key={customer.id}>
                          <tr className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4">
                              <div className="font-medium text-gray-900">{customer.name}</div>
                              <div className="text-sm text-gray-600">{customer.id}</div>
                            </td>
                            <td className="px-6 py-4 text-gray-600">{customer.email}</td>
                            <td className="px-6 py-4 text-right font-semibold text-gray-900">
                              ₹{customer.lifetime_value.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-right text-gray-900">{customer.total_orders}</td>
                            <td className="px-6 py-4 text-gray-600">
                              {customer.days_since_purchase === 0 
                                ? 'Today' 
                                : `${customer.days_since_purchase} days ago`}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${segmentBadge.color}`}>
                                {segmentBadge.icon} {segmentBadge.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`font-semibold text-sm ${churnRisk.color}`}>
                                {churnRisk.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => setExpandedCustomer(isExpanded ? null : customer.id)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                {isExpanded ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <tr className="bg-blue-50 border-t-2 border-blue-200">
                              <td colSpan="8" className="px-6 py-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div>
                                    <div className="text-xs text-gray-600 font-medium">Phone</div>
                                    <div className="text-sm font-semibold text-gray-900 mt-1">{customer.phone}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-600 font-medium">Customer Since</div>
                                    <div className="text-sm font-semibold text-gray-900 mt-1">
                                      {customer.customer_since_days} days
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-600 font-medium">Avg Order Value</div>
                                    <div className="text-sm font-semibold text-gray-900 mt-1">
                                      ₹{customer.avg_order_value.toFixed(2)}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-600 font-medium">Purchase Frequency</div>
                                    <div className="text-sm font-semibold text-gray-900 mt-1">
                                      {customer.purchase_frequency}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-600 font-medium">Preferred Category</div>
                                    <div className="text-sm font-semibold text-gray-900 mt-1">
                                      {customer.preferred_category}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-600 font-medium">Spent This Year</div>
                                    <div className="text-sm font-semibold text-gray-900 mt-1">
                                      ₹{customer.total_spent_this_year.toFixed(2)}
                                    </div>
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
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add Customer</h2>
            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Customer name" required />
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Email" required />
              <input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Phone" />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg">Save Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersPage;
