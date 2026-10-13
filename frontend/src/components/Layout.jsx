import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Car, Settings, LogOut, MapPin, CreditCard, Image, Crown, FileText, Settings2, Banknote, List, Percent, Network } from 'lucide-react';
import cityRideLogo from '../assets/city ride logo.webp';
import './Layout.css';

const Layout = () => {
  const navigate = useNavigate();
  const adminToken = localStorage.getItem('adminToken');
  const adminUser = JSON.parse(localStorage.getItem('adminUser') || 'null');

  React.useEffect(() => {
    if (!adminToken) {
      navigate('/login');
    }
  }, [adminToken, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/login');
  };

  if (!adminToken) return null;

  return (
    <div className="layout-container">
      <aside className="sidebar">
        <div className="sidebar-header" style={{ justifyContent: 'center', padding: '1rem' }}>
          <div className="logo" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <img src={cityRideLogo} alt="City Ride Logo" style={{ maxWidth: '170', maxHeight: '70px', objectFit: 'contain' }} />
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink end to="/dashboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink end to="/users" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <Users size={20} />
            <span>Users</span>
          </NavLink>
          <NavLink end to="/drivers" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <Car size={20} />
            <span>Drivers</span>
          </NavLink>
          <NavLink end to="/vehicles" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <Settings size={20} />
            <span>Vehicle Settings</span>
          </NavLink>
          <NavLink end to="/withdrawals" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <CreditCard size={20} />
            <span>Driver Withdrawals</span>
          </NavLink>
          <NavLink end to="/user-withdrawals" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <CreditCard size={20} />
            <span>User Withdrawals</span>
          </NavLink>
          <NavLink end to="/popular-locations" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <MapPin size={20} />
            <span>Popular Locations</span>
          </NavLink>
          <NavLink end to="/advertisements" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <Image size={20} />
            <span>Advertisements</span>
          </NavLink>
          <NavLink end to="/help" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <Settings size={20} />
            <span>Help & Support</span>
          </NavLink>

          <div style={{ marginTop: '1rem', padding: '0 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Legacy Config</div>
          <NavLink end to="/subscriptions/free-trial" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <Percent size={20} />
            <span>Free Trial Config</span>
          </NavLink>

          <div style={{ marginTop: '1rem', padding: '0 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ride Configuration</div>
          <NavLink end to="/ride-config" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <Settings2 size={20} />
            <span>General Config</span>
          </NavLink>
          <NavLink end to="/ride-config/fares" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <Banknote size={20} />
            <span>Fare Configuration</span>
          </NavLink>


          <div style={{ marginTop: '1rem', padding: '0 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Wallet</div>
          <NavLink end to="/wallet" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <CreditCard size={20} />
            <span>Driver Wallet</span>
          </NavLink>
          <NavLink end to="/wallet/transactions" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <List size={20} />
            <span>Transactions</span>
          </NavLink>

        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-title">City Ride Control Panel</div>
          <div className="user-profile">
            <div className="topbar-avatar">{adminUser?.name ? adminUser.name[0].toUpperCase() : 'A'}</div>
            <span>{adminUser?.name || 'Admin User'}</span>
          </div>
        </header>
        <div className="page-content animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
