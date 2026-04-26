import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
  AreaChart,
} from 'recharts';

const axisTickStyle = {
  fontSize: 12,
  fill: '#6b7280',
};

const truncateLabel = (value, max = 18) => {
  if (!value) return '';
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
};

function ChartEmptyState({ title, message = 'No live data yet' }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="h-[300px] flex items-center justify-center text-center text-gray-500">
        <p>{message}</p>
      </div>
    </div>
  );
}

// Revenue Trend Chart (Last 30 Days)
export function RevenueTrendChart({ data = [] }) {
  if (!data.length) {
    return <ChartEmptyState title="Revenue Trend (30 Days)" message="Create orders to see revenue movement." />;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend (30 Days)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 12 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" stroke="#6b7280" tick={axisTickStyle} minTickGap={24} />
          <YAxis stroke="#6b7280" tick={axisTickStyle} width={56} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
            }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#3b82f6"
            fillOpacity={1}
            fill="url(#colorRevenue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// Order Distribution Chart (Last 7 Days)
export function OrderDistributionChart({ data = [] }) {
  if (!data.length) {
    return <ChartEmptyState title="Order Distribution (7 Days)" message="Orders will appear here as they are created." />;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Distribution (7 Days)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 12 }} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="day" stroke="#6b7280" tick={axisTickStyle} />
          <YAxis stroke="#6b7280" tick={axisTickStyle} width={40} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
            }}
          />
          <Legend />
          <Bar dataKey="pending" stackId="a" fill="#f59e0b" />
          <Bar dataKey="processing" stackId="a" fill="#3b82f6" />
          <Bar dataKey="shipped" stackId="a" fill="#22c55e" />
          <Bar dataKey="delayed" stackId="a" fill="#ef4444" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Top Products Chart (By Revenue)
export function TopProductsChart({ data = [] }) {
  if (!data.length) {
    return <ChartEmptyState title="Top 5 Products (Revenue)" message="Your best-selling products will show up here." />;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Products (Revenue)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ top: 12, right: 20, left: 48, bottom: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" stroke="#6b7280" tick={axisTickStyle} width={56} />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#6b7280"
            width={140}
            tick={axisTickStyle}
            tickFormatter={(value) => truncateLabel(value, 18)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
            }}
            formatter={(value) => [`₹${Number(value || 0).toLocaleString()}`, 'Revenue']}
          />
          <Bar dataKey="revenue" fill="#22c55e" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Inventory Status Pie Chart
export function InventoryStatusChart({ data = [] }) {
  const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6'];

  if (!data.length) {
    return <ChartEmptyState title="Inventory Status" message="Add products to start tracking stock health." />;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory Status</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={false}
            outerRadius={88}
            innerRadius={42}
            fill="#8884d8"
            dataKey="value"
            paddingAngle={3}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-4 mt-6">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: COLORS[index] }}
            ></div>
            <span className="text-sm text-gray-600">
              {item.name}: {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Category Sales Chart (Comparison)
export function CategorySalesChart({ data = [] }) {
  if (!data.length) {
    return <ChartEmptyState title="Sales by Category" message="Category revenue will appear once products are sold." />;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales by Category</h3>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="category"
            stroke="#6b7280"
            tick={axisTickStyle}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={56}
            tickFormatter={(value) => truncateLabel(value, 12)}
          />
          <YAxis stroke="#6b7280" tick={axisTickStyle} width={56} />
          <YAxis yAxisId="right" orientation="right" allowDecimals={false} stroke="#22c55e" tick={axisTickStyle} width={40} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
            }}
          />
          <Legend />
          <Bar dataKey="revenue" fill="#3b82f6" />
          <Line type="monotone" dataKey="orders" stroke="#22c55e" yAxisId="right" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ActivityTimelineChart({ data = [] }) {
  if (!data.length) {
    return <ChartEmptyState title="Records Created (7 Days)" message="New products, customers, and orders will appear here by day." />;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Records Created (7 Days)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" stroke="#6b7280" tick={axisTickStyle} />
          <YAxis allowDecimals={false} stroke="#6b7280" tick={axisTickStyle} width={40} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
            }}
          />
          <Legend />
          <Line type="monotone" dataKey="products" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="customers" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="orders" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
