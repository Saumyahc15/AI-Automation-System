import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Zap,
  BarChart3,
  Brain,
  Mail,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const location = useLocation();
  const { user, logout, hasRole } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
      // Close menu on resize to desktop
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close menu when navigating
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const navLinkClasses = (path) => `
    flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors
    ${
      isActive(path)
        ? 'bg-blue-600 text-white'
        : 'text-gray-700 hover:bg-gray-100'
    }
  `;

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-64 bg-gray-900 text-white h-screen flex-col sticky top-0">
        <SidebarContent 
          location={location}
          navLinkClasses={navLinkClasses}
          user={user}
          hasRole={hasRole}
          showUserMenu={showUserMenu}
          setShowUserMenu={setShowUserMenu}
          logout={logout}
        />
      </div>

      {/* Mobile Header with Hamburger */}
      {isMobile && (
        <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40">
          <div className="px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h2 className="font-bold text-gray-900">RetailAI</h2>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-900" />
              ) : (
                <Menu className="w-6 h-6 text-gray-900" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && isMobile && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30 top-16"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <div
        className={`fixed left-0 top-0 h-screen w-64 bg-gray-900 text-white z-40 transform transition-transform duration-300 lg:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ marginTop: isMobile ? '0' : 'auto' }}
      >
        {/* Mobile Sidebar Close Button */}
        <div className="pt-6 px-4 flex justify-end">
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <SidebarContent
          location={location}
          navLinkClasses={navLinkClasses}
          user={user}
          hasRole={hasRole}
          showUserMenu={showUserMenu}
          setShowUserMenu={setShowUserMenu}
          logout={logout}
          isMobile={true}
        />
      </div>
    </>
  );
}

// Shared Sidebar Content Component
function SidebarContent({
  location,
  navLinkClasses,
  user,
  hasRole,
  showUserMenu,
  setShowUserMenu,
  logout,
  isMobile = false,
}) {
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const linkClasses = (path) => `
    flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors
    ${
      isActive(path)
        ? 'bg-blue-600 text-white'
        : 'text-gray-300 hover:bg-gray-800'
    }
  `;

  return (
    <>
      {/* Logo - Desktop Only */}
      {!isMobile && (
        <div className="px-6 py-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg">RetailAI</h2>
              <p className="text-xs text-gray-400">Agent</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        <Link to="/dashboard" className={linkClasses('/dashboard')}>
          <LayoutDashboard className="w-5 h-5" />
          <span>Dashboard</span>
        </Link>

        <Link to="/inventory" className={linkClasses('/inventory')}>
          <Package className="w-5 h-5" />
          <span>Inventory</span>
        </Link>

        <Link to="/orders" className={linkClasses('/orders')}>
          <ShoppingCart className="w-5 h-5" />
          <span>Orders</span>
        </Link>

        <Link to="/customers" className={linkClasses('/customers')}>
          <Users className="w-5 h-5" />
          <span>Customers</span>
        </Link>

        {/* Manager+ Features */}
        {hasRole(['owner', 'manager']) && (
          <>
            <hr className="border-gray-800 my-3" />

            <Link to="/automations" className={linkClasses('/automations')}>
              <Zap className="w-5 h-5" />
              <span>Automations</span>
            </Link>

            <Link to="/reports" className={linkClasses('/reports')}>
              <BarChart3 className="w-5 h-5" />
              <span>Reports</span>
            </Link>

            <Link to="/ai-insights" className={linkClasses('/ai-insights')}>
              <Brain className="w-5 h-5" />
              <span>AI Insights</span>
            </Link>

            <Link to="/gmail-ops" className={linkClasses('/gmail-ops')}>
              <Mail className="w-5 h-5" />
              <span>Gmail Ops</span>
            </Link>
          </>
        )}

        {/* Owner Features */}
        {hasRole('owner') && (
          <>
            <hr className="border-gray-800 my-3" />

            <Link to="/users" className={linkClasses('/users')}>
              <Users className="w-5 h-5" />
              <span>Users</span>
            </Link>
          </>
        )}

        <hr className="border-gray-800 my-3" />

        <Link to="/settings" className={linkClasses('/settings')}>
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </Link>
      </nav>

      {/* User Menu */}
      <div className="px-4 py-4 border-t border-gray-800 space-y-2">
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-sm"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="text-left min-w-0">
                <p className="font-medium truncate text-white">{user?.name}</p>
                <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 flex-shrink-0" />
          </button>

          {showUserMenu && (
            <div className="absolute bottom-16 left-0 right-0 bg-gray-800 rounded-lg border border-gray-700 overflow-hidden z-50">
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-gray-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
