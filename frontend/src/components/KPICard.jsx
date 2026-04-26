import { ArrowUp, ArrowDown } from 'lucide-react';

export default function KPICard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  color = 'blue',
  onClick,
  loading = false,
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  };

  const trendColorClasses = {
    up: 'text-green-600 bg-green-50',
    down: 'text-red-600 bg-red-50',
  };

  const bgColor = colorClasses[color] || colorClasses.blue;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg border border-gray-200 p-6 ${
        onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''
      } ${loading ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {loading ? '...' : value}
          </p>

          {trend && trendValue && (
            <div className={`flex items-center gap-1 mt-2 px-2 py-1 rounded ${trendColorClasses[trend]}`}>
              {trend === 'up' ? (
                <ArrowUp className="w-4 h-4" />
              ) : (
                <ArrowDown className="w-4 h-4" />
              )}
              <span className="text-xs font-medium">{trendValue}</span>
            </div>
          )}
        </div>

        {Icon && (
          <div className={`p-3 rounded-lg ${bgColor}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
}
