import React, { useState, useEffect } from 'react';
import { TrendingDown, TrendingUp, Package, Eye, EyeOff, RefreshCw, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { inventoryAPI } from '../services/api';

const InventoryPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [expandedProduct, setExpandedProduct] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    stock: 0,
    price: 0,
    category: '',
    supplier_email: '',
    reorder_threshold: 10,
  });

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      const response = await inventoryAPI.getAll();
      // Map backend product fields to display fields
      const mapped = (response.data || []).map((p) => {
        const avgDailySales = p.avg_daily_sales || 0;
        const daysToStockout = avgDailySales > 0 ? Math.round(p.stock / avgDailySales) : 999;
        return {
          product_id: p.product_id,
          name: p.name,
          sku: p.sku || '—',
          category: p.category || 'Uncategorized',
          stock: p.stock ?? 0,
          price: p.price ?? 0,
          reorder_threshold: p.reorder_threshold ?? 10,
          avg_daily_sales: avgDailySales,
          days_to_stockout: daysToStockout,
          supplier_email: p.supplier_email || '—',
          weekly_sales: Math.round(avgDailySales * 7),
          monthly_sales: Math.round(avgDailySales * 30),
          is_active: p.is_active,
          updated_at: p.updated_at,
          created_at: p.created_at,
        };
      });
      setProducts(mapped);
      setError(null);
    } catch (err) {
      console.error('Failed to load inventory:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  // Calculate inventory metrics from real data
  const metrics = {
    total_products: products.length,
    low_stock: products.filter((p) => p.stock > 0 && p.stock <= p.reorder_threshold).length,
    out_of_stock: products.filter((p) => p.stock === 0).length,
    critical: products.filter((p) => p.stock === 0 || p.days_to_stockout <= 3).length,
    total_value: products.reduce((sum, p) => sum + p.stock * p.price, 0),
    at_risk_7d: products.filter((p) => p.days_to_stockout <= 7 && p.days_to_stockout > 0).length,
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    if (filterType === 'all') return true;
    if (filterType === 'low') return p.stock > 0 && p.stock <= p.reorder_threshold;
    if (filterType === 'critical') return p.stock === 0 || p.days_to_stockout <= 3;
    return true;
  });

  // Get status badge
  const getStatus = (product) => {
    if (product.stock === 0) return { color: 'red', text: 'OUT OF STOCK' };
    if (product.days_to_stockout <= 3) return { color: 'red', text: `CRITICAL (${product.days_to_stockout}d)` };
    if (product.stock <= product.reorder_threshold) return { color: 'yellow', text: 'LOW STOCK' };
    return { color: 'green', text: 'OK' };
  };

  const statusColors = {
    red: 'bg-red-100 text-red-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    green: 'bg-green-100 text-green-800',
  };

  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      stock: 0,
      price: 0,
      category: '',
      supplier_email: '',
      reorder_threshold: 10,
    });
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      await inventoryAPI.create({
        ...formData,
        stock: Number(formData.stock),
        price: Number(formData.price),
        reorder_threshold: Number(formData.reorder_threshold),
      });
      setShowAddModal(false);
      resetForm();
      setSuccess('Product saved to database.');
      fetchInventoryData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to save product');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin inline-block">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
            </div>
            <p className="mt-4 text-gray-600">Loading inventory from database...</p>
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
                <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
                <p className="text-gray-600 text-sm mt-1">Live stock levels from database • {products.length} products</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                >
                  <Plus size={18} />
                  Add Product
                </button>
                <button
                  onClick={fetchInventoryData}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                >
                  <RefreshCw size={18} />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 lg:px-8 py-6 lg:py-8">
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="text-green-600" size={20} />
              <p className="text-green-800">{success}</p>
            </div>
          )}

          {error && (
            <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="text-red-600" size={20} />
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-sm text-gray-600">Total Products</div>
              <div className="text-2xl font-bold text-gray-900">{metrics.total_products}</div>
            </div>

            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="text-sm text-red-600">Critical / Out of Stock</div>
              <div className="text-2xl font-bold text-red-900">{metrics.critical}</div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="text-sm text-yellow-600">Low Stock</div>
              <div className="text-2xl font-bold text-yellow-900">{metrics.low_stock}</div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="text-sm text-purple-600">At Risk (7d)</div>
              <div className="text-2xl font-bold text-purple-900">{metrics.at_risk_7d}</div>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="text-sm text-green-600">Inventory Value</div>
              <div className="text-2xl font-bold text-green-900">₹{metrics.total_value.toLocaleString()}</div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="text-sm text-blue-600">Data Source</div>
              <div className="text-2xl font-bold text-blue-900">Live DB</div>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2 mb-6 flex-wrap">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterType === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              All Products ({products.length})
            </button>
            <button
              onClick={() => setFilterType('critical')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterType === 'critical'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Critical ({metrics.critical})
            </button>
            <button
              onClick={() => setFilterType('low')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterType === 'low'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Low Stock ({metrics.low_stock})
            </button>
          </div>

          {/* Products Table/Cards */}
          <div>
            {filteredProducts.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-lg border border-gray-200">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No products found in this category</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Product</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">SKU</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Stock</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Reorder At</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Stockout In</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Price</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Status</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Detail</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredProducts.map((product) => {
                          const status = getStatus(product);
                          const isExpanded = expandedProduct === product.product_id;

                          return (
                            <React.Fragment key={product.product_id}>
                              <tr className="hover:bg-gray-50 transition">
                                <td className="px-6 py-4">
                                  <div className="font-medium text-gray-900">{product.name}</div>
                                  <div className="text-sm text-gray-600">{product.category}</div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">{product.sku}</td>
                                <td className="px-6 py-4 text-right font-semibold text-gray-900">
                                  {product.stock}
                                </td>
                                <td className="px-6 py-4 text-right text-gray-600">{product.reorder_threshold}</td>
                                <td className="px-6 py-4 text-right">
                                  <div className={`inline-flex items-center gap-1 ${
                                    product.days_to_stockout <= 3 ? 'text-red-600' :
                                    product.days_to_stockout <= 7 ? 'text-yellow-600' : 'text-gray-600'
                                  }`}>
                                    {product.days_to_stockout <= 7 ? (
                                      <TrendingDown size={16} />
                                    ) : (
                                      <TrendingUp size={16} />
                                    )}
                                    {product.days_to_stockout >= 999 ? '∞' : `${product.days_to_stockout}d`}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-right text-gray-900 font-medium">
                                  ₹{product.price.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusColors[status.color]}`}>
                                    {status.text}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <button
                                    onClick={() => setExpandedProduct(isExpanded ? null : product.product_id)}
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
                                        <div className="text-xs text-gray-600 font-medium">Avg Daily Sales</div>
                                        <div className="text-lg font-bold text-gray-900">{product.avg_daily_sales}</div>
                                      </div>
                                      <div>
                                        <div className="text-xs text-gray-600 font-medium">Weekly Sales (est.)</div>
                                        <div className="text-lg font-bold text-gray-900">{product.weekly_sales}</div>
                                      </div>
                                      <div>
                                        <div className="text-xs text-gray-600 font-medium">Monthly Sales (est.)</div>
                                        <div className="text-lg font-bold text-gray-900">{product.monthly_sales}</div>
                                      </div>
                                      <div>
                                        <div className="text-xs text-gray-600 font-medium">Inventory Value</div>
                                        <div className="text-lg font-bold text-green-600">
                                          ₹{(product.stock * product.price).toLocaleString()}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-xs text-gray-600 font-medium">Supplier Email</div>
                                        <div className="text-sm font-semibold text-gray-900">{product.supplier_email}</div>
                                      </div>
                                      <div>
                                        <div className="text-xs text-gray-600 font-medium">Last Updated</div>
                                        <div className="text-sm font-semibold text-gray-900">
                                          {product.updated_at ? new Date(product.updated_at).toLocaleDateString() : '—'}
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
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden grid grid-cols-1 gap-4">
                  {filteredProducts.map((product) => {
                    const status = getStatus(product);
                    const isExpanded = expandedProduct === product.product_id;

                    return (
                      <div key={product.product_id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <div className="p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">{product.name}</h3>
                              <p className="text-sm text-gray-600">{product.category} • {product.sku}</p>
                            </div>
                            <button
                              onClick={() => setExpandedProduct(isExpanded ? null : product.product_id)}
                              className="text-blue-600 hover:text-blue-800 ml-2"
                            >
                              {isExpanded ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                          </div>

                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusColors[status.color]}`}>
                            {status.text}
                          </span>

                          <div className="grid grid-cols-2 gap-3 pt-2">
                            <div className="bg-gray-50 rounded p-2">
                              <div className="text-xs text-gray-600">Stock</div>
                              <div className="text-lg font-bold text-gray-900">{product.stock}</div>
                            </div>
                            <div className="bg-gray-50 rounded p-2">
                              <div className="text-xs text-gray-600">Reorder At</div>
                              <div className="text-lg font-bold text-gray-900">{product.reorder_threshold}</div>
                            </div>
                            <div className="bg-gray-50 rounded p-2">
                              <div className="text-xs text-gray-600">Stockout In</div>
                              <div className={`text-lg font-bold ${product.days_to_stockout <= 3 ? 'text-red-600' : 'text-gray-900'}`}>
                                {product.days_to_stockout >= 999 ? '∞' : `${product.days_to_stockout}d`}
                              </div>
                            </div>
                            <div className="bg-gray-50 rounded p-2">
                              <div className="text-xs text-gray-600">Price</div>
                              <div className="text-lg font-bold text-gray-900">₹{product.price.toFixed(2)}</div>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="pt-3 border-t border-gray-200 space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <div className="text-xs text-gray-600">Daily Sales</div>
                                  <div className="font-semibold text-gray-900">{product.avg_daily_sales}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-600">Weekly Sales</div>
                                  <div className="font-semibold text-gray-900">{product.weekly_sales}</div>
                                </div>
                              </div>
                              <div className="bg-blue-50 p-3 rounded text-sm">
                                <p><span className="font-semibold">Supplier:</span> {product.supplier_email}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Legend */}
          <div className="mt-8 bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Understanding the Dashboard</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Critical — Out of stock or ≤3 days remaining</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span>Low Stock — Below reorder threshold</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>OK — Healthy stock level</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add Product</h2>
            <form onSubmit={handleCreateProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg" placeholder="Product name" required />
              <input value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg" placeholder="SKU" />
              <input type="number" min="0" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg" placeholder="Stock" required />
              <input type="number" min="0" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg" placeholder="Price" required />
              <input value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg" placeholder="Category" />
              <input value={formData.supplier_email} onChange={(e) => setFormData({ ...formData, supplier_email: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg" placeholder="Supplier email" />
              <input type="number" min="0" value={formData.reorder_threshold} onChange={(e) => setFormData({ ...formData, reorder_threshold: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg md:col-span-2" placeholder="Reorder threshold" required />
              <div className="md:col-span-2 flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowAddModal(false); resetForm(); }} className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
