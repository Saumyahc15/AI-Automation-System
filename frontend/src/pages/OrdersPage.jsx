import React, { useState, useEffect } from 'react';
import { Clock, TrendingUp, Package, AlertCircle, CheckCircle, Eye, EyeOff, Plus } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { customersAPI, ordersAPI, inventoryAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const OrdersPage = () => {
  const { hasRole } = useAuth();
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, processing, shipped, delayed
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: '',
    product_id: '',
    quantity: 1,
    shipping_address: '',
    payment_method: 'Cash',
  });

  useEffect(() => {
    fetchOrdersData();
  }, []);

  const fetchOrdersData = async () => {
    try {
      setLoading(true);
      const [ordersRes, customersRes, productsRes] = await Promise.all([
        ordersAPI.getAll(),
        customersAPI.getAll(),
        inventoryAPI.getAll(),
      ]);

      const customerMap = new Map((customersRes.data || []).map((customer) => [customer.customer_id, customer]));
      const productMap = new Map((productsRes.data || []).map((product) => [product.product_id, product]));
      const now = new Date();

      const mappedOrders = (ordersRes.data || []).map((order) => {
        const customer = customerMap.get(order.customer_id);
        const product = productMap.get(order.product_id);
        const expectedDelivery = order.expected_delivery
          ? new Date(order.expected_delivery)
          : new Date(new Date(order.order_date).getTime() + 5 * 24 * 60 * 60 * 1000);
        const delayed = order.shipping_status === 'pending' &&
          now.getTime() - new Date(order.order_date).getTime() > 48 * 60 * 60 * 1000;

        return {
          id: `ORD-${String(order.order_id).padStart(3, '0')}`,
          order_id: order.order_id,
          customer: customer?.name || 'Walk-in / Unknown',
          email: customer?.email || 'No email',
          total: order.total_price || 0,
          items: order.quantity || 0,
          status: delayed ? 'delayed' : (order.shipping_status || 'pending'),
          created_at: order.order_date,
          expected_delivery: expectedDelivery.toISOString(),
          actual_delivery: order.shipping_status === 'delivered' ? order.shipped_at : null,
          items_list: product ? [product.name] : ['Unlinked product'],
          payment_method: order.payment_method || 'Not captured',
          shipping_address: order.shipping_address || 'Not captured',
        };
      });

      setOrders(mappedOrders);
      setCustomers(customersRes.data || []);
      setProducts(productsRes.data || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  // Calculate order metrics
  const metrics = {
    total_orders: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    processing: orders.filter((o) => o.status === 'processing').length,
    shipped: orders.filter((o) => o.status === 'shipped').length,
    delayed: orders.filter((o) => o.status === 'delayed').length,
    total_revenue: orders.reduce((sum, o) => sum + o.total, 0),
    avg_order_value: (orders.reduce((sum, o) => sum + o.total, 0) / orders.length || 0).toFixed(2),
  };

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    if (filterStatus === 'all') return true;
    return o.status === filterStatus;
  });

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending' },
      processing: { color: 'bg-blue-100 text-blue-800', icon: TrendingUp, label: 'Processing' },
      shipped: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Shipped' },
      delayed: { color: 'bg-red-100 text-red-800', icon: AlertCircle, label: 'Delayed' },
    };
    return statusConfig[status] || statusConfig.pending;
  };

  const selectedProduct = products.find((product) => product.product_id === Number(formData.product_id));
  const estimatedTotal = selectedProduct ? selectedProduct.price * Number(formData.quantity || 0) : 0;

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    try {
      await ordersAPI.create({
        product_id: Number(formData.product_id),
        customer_id: formData.customer_id ? Number(formData.customer_id) : null,
        quantity: Number(formData.quantity),
        total_price: estimatedTotal,
        shipping_address: formData.shipping_address,
        payment_method: formData.payment_method,
      });
      setShowAddModal(false);
      setFormData({
        customer_id: '',
        product_id: '',
        quantity: 1,
        shipping_address: '',
        payment_method: 'Cash',
      });
      setSuccess('Order saved to database and stock updated.');
      fetchOrdersData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to save order');
    }
  };

  const handleStatusChange = async (orderId, status) => {
    try {
      await ordersAPI.updateStatus(orderId, status);
      setOrders((current) => current.map((order) => (
        order.order_id === orderId ? { ...order, status } : order
      )));
      setSuccess('Order status updated.');
      fetchOrdersData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to update status');
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

      <div className="flex-1 overflow-auto pt-16 lg:pt-0">
        {/* Header */}
        <div className="hidden lg:block bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Orders Management</h1>
                <p className="text-gray-600 text-sm mt-1">Track orders, shipping, and deliveries</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                >
                  <Plus size={18} />
                  Create Order
                </button>
                <button
                  onClick={() => fetchOrdersData()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 lg:px-8 py-6 lg:py-8">
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
              <div className="text-sm text-gray-600">Total Orders</div>
              <div className="text-2xl font-bold text-gray-900">{metrics.total_orders}</div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="text-sm text-yellow-600">Pending</div>
              <div className="text-2xl font-bold text-yellow-900">{metrics.pending}</div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="text-sm text-blue-600">Processing</div>
              <div className="text-2xl font-bold text-blue-900">{metrics.processing}</div>
            </div>

            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="text-sm text-red-600">Delayed</div>
              <div className="text-2xl font-bold text-red-900">{metrics.delayed}</div>
            </div>
          </div>

          {/* Revenue Info */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="text-sm text-green-600">Total Revenue</div>
              <div className="text-2xl font-bold text-green-900">₹{metrics.total_revenue.toFixed(2)}</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="text-sm text-purple-600">Average Order Value</div>
              <div className="text-2xl font-bold text-purple-900">₹{metrics.avg_order_value}</div>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2 mb-6 flex-wrap">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              All ({metrics.total_orders})
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === 'pending'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Pending ({metrics.pending})
            </button>
            <button
              onClick={() => setFilterStatus('processing')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === 'processing'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Processing ({metrics.processing})
            </button>
            <button
              onClick={() => setFilterStatus('shipped')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === 'shipped'
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Shipped ({metrics.shipped})
            </button>
            <button
              onClick={() => setFilterStatus('delayed')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === 'delayed'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Delayed ({metrics.delayed})
            </button>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {filteredOrders.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No orders found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Order ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Customer</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Items</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Expected</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Status</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredOrders.map((order) => {
                      const isExpanded = expandedOrder === order.id;
                      const statusConfig = getStatusBadge(order.status);
                      
                      return (
                        <React.Fragment key={order.id}>
                          <tr className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4 font-medium text-gray-900">{order.id}</td>
                            <td className="px-6 py-4">
                              <div className="font-medium text-gray-900">{order.customer}</div>
                              <div className="text-sm text-gray-600">{order.email}</div>
                            </td>
                            <td className="px-6 py-4 text-right text-gray-900 font-semibold">{order.items}</td>
                            <td className="px-6 py-4 text-right text-gray-900 font-semibold">₹{order.total.toFixed(2)}</td>
                            <td className="px-6 py-4 text-gray-600">
                              {new Date(order.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-gray-600">
                              {new Date(order.expected_delivery).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {hasRole(['owner', 'manager']) ? (
                                <select
                                  value={order.status}
                                  onChange={(e) => handleStatusChange(order.order_id, e.target.value)}
                                  className="min-w-[140px] px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="processing">Processing</option>
                                  <option value="shipped">Shipped</option>
                                  <option value="delayed">Delayed</option>
                                </select>
                              ) : (
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.color}`}>
                                  {statusConfig.label}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
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
                                    <div className="text-xs text-gray-600 font-medium">Shipping Address</div>
                                    <div className="text-sm font-semibold text-gray-900 mt-1">{order.shipping_address}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-600 font-medium">Payment Method</div>
                                    <div className="text-sm font-semibold text-gray-900 mt-1">{order.payment_method}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-600 font-medium">Items Ordered</div>
                                    <div className="text-sm text-gray-900 mt-1">
                                      {order.items_list.map((item, idx) => (
                                        <div key={idx}>• {item}</div>
                                      ))}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-600 font-medium">Order Status</div>
                                    <div className="text-sm font-semibold text-gray-900 mt-1">
                                      {statusConfig.label}
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
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create Order</h2>
            <form onSubmit={handleCreateOrder} className="space-y-4">
              <select value={formData.customer_id} onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="">Select customer (optional)</option>
                {customers.map((customer) => (
                  <option key={customer.customer_id} value={customer.customer_id}>{customer.name} - {customer.email}</option>
                ))}
              </select>
              <select value={formData.product_id} onChange={(e) => setFormData({ ...formData, product_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                <option value="">Select product</option>
                {products.map((product) => (
                  <option key={product.product_id} value={product.product_id}>{product.name} ({product.stock} in stock)</option>
                ))}
              </select>
              <input type="number" min="1" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Quantity" required />
              <textarea value={formData.shipping_address} onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Shipping address" rows="3" required />
              <select value={formData.payment_method} onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="COD">COD</option>
              </select>
              <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-sm text-blue-900">
                Estimated total: ₹{estimatedTotal.toFixed(2)}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg">Save Order</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
