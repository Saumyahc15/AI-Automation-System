import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { analyticsAPI, aiAPI, workflowsAPI } from '../services/api';
import KPICard from '../components/KPICard';
import Sidebar from '../components/Sidebar';
import {
  RevenueTrendChart,
  OrderDistributionChart,
  TopProductsChart,
  InventoryStatusChart,
  CategorySalesChart,
  ActivityTimelineChart,
} from '../components/DashboardCharts';
import {
  ShoppingCart,
  Package,
  AlertCircle,
  Zap,
  DollarSign,
} from 'lucide-react';

export default function Dashboard() {
  const { user, hasRole } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [dashboardError, setDashboardError] = useState(null);
  const [revenueChart, setRevenueChart] = useState([]);
  const [orderDistribution, setOrderDistribution] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [inventoryStatus, setInventoryStatus] = useState([]);
  const [categorySales, setCategorySales] = useState([]);
  const [activityTimeline, setActivityTimeline] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setDashboardError(null);

      const results = await Promise.allSettled([
        analyticsAPI.getSummary(),
        analyticsAPI.getRevenueChart(30),
        analyticsAPI.getTopProducts(7, 5),
        analyticsAPI.getOrderDistribution(7),
        analyticsAPI.getInventoryStatus(),
        analyticsAPI.getCategorySales(30),
        analyticsAPI.getActivityTimeline(7),
      ]);

      const [
        analyticsRes,
        revenueRes,
        productsRes,
        orderDistributionRes,
        inventoryStatusRes,
        categorySalesRes,
        activityTimelineRes,
      ] = results;

      if (analyticsRes.status === 'fulfilled') {
        setAnalytics(analyticsRes.value.data);
      } else {
        console.error('Dashboard summary failed:', analyticsRes.reason);
        setAnalytics({
          orders_today: 0,
          revenue_today: 0,
          orders_this_week: 0,
          revenue_this_week: 0,
          total_products: 0,
          low_stock_products: 0,
          out_of_stock: 0,
          total_customers: 0,
          pending_orders: 0,
          purchase_orders_sent: 0,
        });
        setDashboardError('Some dashboard data could not be loaded. The page is showing whatever data is available.');
      }

      setRevenueChart(revenueRes.status === 'fulfilled' ? revenueRes.value.data : []);
      setTopProducts(productsRes.status === 'fulfilled' ? productsRes.value.data : []);
      setOrderDistribution(orderDistributionRes.status === 'fulfilled' ? orderDistributionRes.value.data : []);
      setInventoryStatus(inventoryStatusRes.status === 'fulfilled' ? inventoryStatusRes.value.data : []);
      setCategorySales(categorySalesRes.status === 'fulfilled' ? categorySalesRes.value.data : []);
      setActivityTimeline(activityTimelineRes.status === 'fulfilled' ? activityTimelineRes.value.data : []);

      if (hasRole(['owner', 'manager'])) {
        const optionalResults = await Promise.allSettled([
          workflowsAPI.list(),
        ]);
        const [workflowsRes] = optionalResults;

        setWorkflows(workflowsRes.status === 'fulfilled' ? (workflowsRes.value.data || []) : []);
      }

      setLoading(false);
    };

    fetchDashboardData();
  }, [hasRole]);

  if (loading && !analytics) {
    return (
      <div className="flex">
        <Sidebar />
        <div className="flex-1 bg-gray-50 p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-4">
              <div className="w-6 h-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
            </div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  const todayRevenue = analytics?.revenue_today || 0;
  const weekRevenue = analytics?.revenue_this_week || 0;
  const growthPercentage = weekRevenue > 0 ? Math.round(((todayRevenue / (weekRevenue / 7)) - 1) * 100) : 0;
  const todayActivity = activityTimeline[activityTimeline.length - 1] || { products: 0, customers: 0, orders: 0 };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 overflow-auto pt-16 lg:pt-0">
        <div className="hidden lg:block bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600 text-sm mt-1">
                  Welcome back, <span className="font-medium">{user?.name}</span>!
                </p>
              </div>
              <div className="text-right">
                <p className="text-gray-600 text-sm">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 lg:px-8 py-6 lg:py-8 space-y-8">
          {dashboardError && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
              {dashboardError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard
              title="Revenue Today"
              value={`₹${todayRevenue.toLocaleString()}`}
              icon={DollarSign}
              trend={growthPercentage > 0 ? 'up' : 'down'}
              trendValue={`${growthPercentage > 0 ? '+' : ''}${growthPercentage}%`}
              color="green"
              loading={loading}
            />

            <KPICard
              title="Orders Today"
              value={analytics?.orders_today || 0}
              icon={ShoppingCart}
              trend="up"
              trendValue={`${analytics?.orders_this_week || 0} this week`}
              color="blue"
              loading={loading}
            />

            <KPICard
              title="Low Stock Products"
              value={analytics?.low_stock_products || 0}
              icon={Package}
              trend={(analytics?.low_stock_products || 0) > 5 ? 'down' : 'up'}
              trendValue={`${analytics?.out_of_stock || 0} out of stock`}
              color="red"
              loading={loading}
            />

            <KPICard
              title="Active Automations"
              value={workflows.length || 0}
              icon={Zap}
              color="purple"
              loading={loading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-sm text-gray-600">Products Added Today</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{todayActivity.products}</p>
              <p className="text-sm text-gray-500 mt-2">Backed by product creation timestamps in the database.</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-sm text-gray-600">Customers Added Today</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{todayActivity.customers}</p>
              <p className="text-sm text-gray-500 mt-2">Backed by customer creation timestamps in the database.</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-sm text-gray-600">Orders Created Today</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{todayActivity.orders}</p>
              <p className="text-sm text-gray-500 mt-2">Backed by order timestamps in the database.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RevenueTrendChart data={revenueChart} />
            <OrderDistributionChart data={orderDistribution} />
          </div>

          <div>
            <ActivityTimelineChart data={activityTimeline} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopProductsChart
              data={topProducts.slice(0, 5).map((product) => ({
                name: product[0],
                revenue: product[2],
              }))}
            />
            <InventoryStatusChart data={inventoryStatus} />
          </div>

          <div>
            <CategorySalesChart data={categorySales} />
          </div>

          <div className="grid grid-cols-1 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-gray-900">Active Automations</h2>
                </div>
                <div className="space-y-3">
                  {workflows.slice(0, 5).map((workflow) => (
                    <div key={workflow.workflow_id} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-sm font-medium text-blue-900">
                        {workflow.natural_language_input?.substring(0, 60)}...
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                          {workflow.trigger_type}
                        </span>
                        <span className="text-xs text-blue-600">{workflow.actions_json?.length || 0} actions</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 p-6">
              <p className="text-sm text-blue-700 font-medium">Total Customers</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">{analytics?.total_customers || 0}</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200 p-6">
              <p className="text-sm text-green-700 font-medium">This Week Revenue</p>
              <p className="text-3xl font-bold text-green-900 mt-2">
                ₹{(analytics?.revenue_this_week || 0).toLocaleString()}
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200 p-6">
              <p className="text-sm text-purple-700 font-medium">Pending Orders</p>
              <p className="text-3xl font-bold text-purple-900 mt-2">{analytics?.pending_orders || 0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
