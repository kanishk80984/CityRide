import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Car, LogOut, Settings, Menu } from 'lucide-react';
import cityRideLogo from '../assets/city ride logo.webp';
import './Layout.css';

const OwnerLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const ownerToken = localStorage.getItem('ownerToken');
  const ownerUser = JSON.parse(localStorage.getItem('ownerUser') || 'null');

  useEffect(() => {
    if (!ownerToken) {
      navigate('/login');
    }
  }, [ownerToken, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('ownerToken');
    localStorage.removeItem('ownerUser');
    navigate('/login');
  };

  if (!ownerToken) return null;

  return (
    <div className="layout-container">
      <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header" style={{ justifyContent: 'center', padding: '1rem' }}>
          <div className="logo" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <img src={cityRideLogo} alt="City Ride Logo" style={{ maxWidth: '175px', maxHeight: '76px', objectFit: 'contain' }} />
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/owner/dashboard" onClick={() => setIsSidebarOpen(false)} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/owner/drivers" onClick={() => setIsSidebarOpen(false)} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <Car size={20} />
            <span>Drivers</span>
          </NavLink>
          <NavLink to="/owner/settings" onClick={() => setIsSidebarOpen(false)} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <Settings size={20} />
            <span>Settings</span>
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
          <div className="topbar-left">
            <button className="menu-toggle" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <div className="topbar-title">
              <span className="hide-on-mobile">City Ride </span>
              Owner Panel
            </div>
          </div>
          <div className="user-profile">
            <div className="topbar-avatar">{ownerUser?.name ? ownerUser.name[0].toUpperCase() : 'O'}</div>
            <span>{ownerUser?.name || 'Owner'}</span>
          </div>
        </header>
        <div className="page-content animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default OwnerLayout;
