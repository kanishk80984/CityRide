import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../services/apiClient';
import { createPortal } from 'react-dom';
import { Search, Eye, X, Calendar, Wallet, Phone, Car } from 'lucide-react';

const OwnerDrivers = () => {
  const [drivers, setDrivers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [driverDetails, setDriverDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('today');
  const [currentPage, setCurrentPage] = useState(1);
  const [currentRidePage, setCurrentRidePage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchDrivers();
  }, []);

  // Reset pagination when tab changes
  useEffect(() => {
    setCurrentRidePage(1);
  }, [activeTab]);

  const fetchDrivers = async () => {
    try {
      const token = localStorage.getItem('ownerToken');
      const res = await fetch(`${getApiUrl()}/owner/drivers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDrivers(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredDrivers = drivers.filter(driver =>
    driver.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.phone?.includes(searchTerm)
  );

  const totalPages = Math.ceil(filteredDrivers.length / ITEMS_PER_PAGE);
  const paginatedDrivers = filteredDrivers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleViewDriver = async (driverId) => {
    setSelectedDriver(driverId);
    setLoadingDetails(true);
    setDriverDetails(null);
    setActiveTab('today');
    setCurrentRidePage(1);
    try {
      const token = localStorage.getItem('ownerToken');
      const res = await fetch(`${getApiUrl()}/owner/drivers/${driverId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDriverDetails(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const getRideStats = () => {
    const defaultStats = { received: 0, completed: 0, rejected: 0 };
    if (!driverDetails || !driverDetails.stats) return defaultStats;

    let statsObj;
    switch (activeTab) {
      case 'today': statsObj = driverDetails.stats.ridesToday; break;
      case 'week': statsObj = driverDetails.stats.ridesWeek; break;
      case 'month': statsObj = driverDetails.stats.ridesMonth; break;
      case 'total': statsObj = driverDetails.stats.ridesTotal; break;
      default: statsObj = driverDetails.stats.ridesToday; break;
    }
    return statsObj || defaultStats;
  };

  const getFilteredRides = () => {
    if (!driverDetails || !driverDetails.ridesHistory) return [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // For week (starting Sunday)
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    // For month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return driverDetails.ridesHistory.filter(ride => {
      if (activeTab === 'total') return true;
      const rideDate = new Date(ride.raw_date);
      if (activeTab === 'today') return rideDate >= startOfToday;
      if (activeTab === 'week') return rideDate >= startOfWeek;
      if (activeTab === 'month') return rideDate >= startOfMonth;
      return true;
    });
  };

  const currentFilteredRides = getFilteredRides();
  const totalRidePages = Math.ceil(currentFilteredRides.length / ITEMS_PER_PAGE);

  return (
    <div className="users-container animate-fade-in" style={{ width: '100%' }}>
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>Driver Management</h2>
          <p>View all drivers on the platform</p>
        </div>
      </div>

      <div className="table-controls" style={{ marginBottom: '1.5rem', width: '100%' }}>
        <div className="search-box" style={{ width: '100%', maxWidth: '400px', position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={20} className="search-icon" style={{ position: 'absolute', left: '12px', color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search drivers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }}
          />
        </div>
      </div>

      <div className="table-container" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table className="data-table" style={{ minWidth: '800px' }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Vehicle Type</th>
              <th>Status</th>
              <th>Online Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedDrivers.map(driver => (
              <tr key={driver.id}>
                <td>#{driver.id}</td>
                <td>
                  <div className="user-info" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="user-avatar" style={{ minWidth: '32px', width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary, #059669)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {driver.name ? driver.name[0].toUpperCase() : 'D'}
                    </div>
                    <span style={{ whiteSpace: 'nowrap' }}>{driver.name || 'N/A'}</span>
                  </div>
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>{driver.phone}</td>
                <td><span className="badge">{driver.vehicle_type || 'N/A'}</span></td>
                <td>
                  <span className={`status-badge ${driver.status === 'ACTIVE' ? 'status-active' : 'status-inactive'}`}>
                    {driver.status}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${driver.is_online ? 'status-active' : 'status-inactive'}`}>
                    {driver.is_online ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </td>
                <td>
                  <button
                    onClick={() => handleViewDriver(driver.id)}
                    style={{ background: 'transparent', border: '1px solid var(--primary, #059669)', color: 'var(--primary, #059669)', padding: '0.4rem 0.75rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}
                  >
                    <Eye size={16} /> View
                  </button>
                </td>
              </tr>
            ))}
            {paginatedDrivers.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>No drivers found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
            style={{ padding: '0.5rem 1rem', border: '1px solid #e2e8f0', borderRadius: '6px', background: currentPage === 1 ? '#f8fafc' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
          >
            Prev
          </button>

          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {Array.from({ length: totalPages }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentPage(idx + 1)}
                style={{
                  width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid',
                  borderColor: currentPage === idx + 1 ? 'var(--primary, #059669)' : '#e2e8f0',
                  background: currentPage === idx + 1 ? 'var(--primary, #059669)' : 'white',
                  color: currentPage === idx + 1 ? 'white' : '#64748b',
                  borderRadius: '6px', cursor: 'pointer'
                }}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
            style={{ padding: '0.5rem 1rem', border: '1px solid #e2e8f0', borderRadius: '6px', background: currentPage === totalPages ? '#f8fafc' : 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
          >
            Next
          </button>
        </div>
      )}

      {/* Driver Details Modal */}
      {selectedDriver && createPortal(
        <div className="driver-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div className="driver-modal-content" style={{ backgroundColor: 'white', borderRadius: '12px', width: '95%', maxWidth: '1200px', height: '90vh', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', WebkitOverflowScrolling: 'touch' }}>
            <div className="driver-modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 10 }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Eye size={20} color="var(--primary, #059669)" /> Full Driver Analytics
              </h3>
              <button onClick={() => setSelectedDriver(null)} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={20} color="#475569" />
              </button>
            </div>

            <div className="driver-modal-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {loadingDetails ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Loading comprehensive driver data...</div>
              ) : driverDetails ? (
                <>
                  {/* Top Section: Profile & Wallet */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                      <div className="hide-on-mobile" style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--primary, #059669)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', border: '6px solid #ecfdf5' }}>
                        {driverDetails.driver.name ? driverDetails.driver.name[0].toUpperCase() : 'D'}
                      </div>
                      <div>
                        <h2 style={{ margin: '0 0 0.35rem 0', color: '#0f172a', fontSize: '1.75rem', fontWeight: 700 }}>{driverDetails.driver.name}</h2>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Phone size={16} /> {driverDetails.driver.phone} 
                          <span style={{ margin: '0 0.1rem' }}>•</span>
                          <Car size={18} /> <span style={{ fontWeight: 500, color: '#475569' }}>{driverDetails.driver.vehicle_type || 'Unknown'}</span>
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                          <span style={{ 
                            display: 'flex', alignItems: 'center', gap: '0.375rem', 
                            padding: '0.35rem 0.85rem', borderRadius: '999px', 
                            backgroundColor: driverDetails.driver.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2', 
                            color: driverDetails.driver.status === 'ACTIVE' ? '#166534' : '#991b1b', 
                            fontSize: '0.75rem', fontWeight: 700 
                          }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: driverDetails.driver.status === 'ACTIVE' ? '#16a34a' : '#ef4444' }}></span>
                            {driverDetails.driver.status}
                          </span>
                          <span style={{ 
                            display: 'flex', alignItems: 'center', gap: '0.375rem', 
                            padding: '0.35rem 0.85rem', borderRadius: '999px', 
                            backgroundColor: driverDetails.driver.is_online ? '#dcfce7' : '#f1f5f9', 
                            color: driverDetails.driver.is_online ? '#166534' : '#475569', 
                            fontSize: '0.75rem', fontWeight: 700 
                          }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: driverDetails.driver.is_online ? '#16a34a' : '#94a3b8' }}></span>
                            {driverDetails.driver.is_online ? 'ONLINE' : 'OFFLINE'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="wallet-card">
                      <div style={{ position: 'absolute', right: '-15px', bottom: '-15px', opacity: 0.1, zIndex: 0 }}>
                        <Wallet size={100} color="#b45309" />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'left', justifyContent: 'left', gap: '0.5rem', marginBottom: '0.5rem', zIndex: 1, position: 'relative' }}>
                        <Wallet size={18} color="#92400e" />
                        <p style={{ margin: 0, color: '#92400e', fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase' }}>Current Wallet Balance</p>
                      </div>
                      <h3 style={{ margin: 0, color: '#b45309', fontSize: '2.5rem', zIndex: 1, position: 'relative', textAlign: 'left' }}>₹{Number(driverDetails.stats.walletBalance).toFixed(2)}</h3>
                    </div>
                  </div>

                  {/* Middle Section: Earnings Overview */}
                  <div>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#334155', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '0.05em' }}>Earnings Overview</h4>
                    <div className="earnings-grid">
                      <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <p style={{ margin: '0 0 0.5rem 0', color: '#64748b', fontSize: '0.875rem' }}>Today's Earnings</p>
                        <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.5rem' }}>₹{Number(driverDetails.stats.todayEarnings).toFixed(2)}</h3>
                      </div>
                      <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <p style={{ margin: '0 0 0.5rem 0', color: '#64748b', fontSize: '0.875rem' }}>Weekly Earnings</p>
                        <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.5rem' }}>₹{Number(driverDetails.stats.weeklyEarnings).toFixed(2)}</h3>
                      </div>
                      <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <p style={{ margin: '0 0 0.5rem 0', color: '#64748b', fontSize: '0.875rem' }}>Monthly Earnings</p>
                        <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.5rem' }}>₹{Number(driverDetails.stats.monthlyEarnings).toFixed(2)}</h3>
                      </div>
                      <div style={{ backgroundColor: '#eff6ff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                        <p style={{ margin: '0 0 0.5rem 0', color: '#1e40af', fontSize: '0.875rem' }}>Tips (Today)</p>
                        <h3 style={{ margin: 0, color: '#1d4ed8', fontSize: '1.5rem' }}>₹{Number(driverDetails.stats.tipsAmount).toFixed(2)}</h3>
                      </div>
                    </div>
                  </div>

                  {/* Orders Analytics with Tabs */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem', width: '100%' }}>
                      <h4 style={{ margin: 0, color: '#334155', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '0.05em' }}>Rides Analytics</h4>
                      <div className="analytics-tabs">
                        {['today', 'week', 'month', 'total'].map(tab => (
                          <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                              padding: '0.5rem 1rem',
                              border: 'none',
                              backgroundColor: activeTab === tab ? 'white' : 'transparent',
                              boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontWeight: activeTab === tab ? 600 : 400,
                              color: activeTab === tab ? '#0f172a' : '#64748b',
                              textTransform: 'capitalize'
                            }}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="analytics-grid">
                      <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <p style={{ margin: '0 0 0.5rem 0', color: '#64748b', fontSize: '1rem' }}>Total Received</p>
                        <h3 style={{ margin: 0, color: '#0f172a', fontSize: '2.5rem' }}>{getRideStats().received}</h3>
                      </div>
                      <div style={{ backgroundColor: '#f0fdf4', padding: '1.5rem', borderRadius: '12px', border: '1px solid #bbf7d0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <p style={{ margin: '0 0 0.5rem 0', color: '#166534', fontSize: '1rem' }}>Completed</p>
                        <h3 style={{ margin: 0, color: '#15803d', fontSize: '2.5rem' }}>{getRideStats().completed}</h3>
                      </div>
                      <div style={{ backgroundColor: '#fef2f2', padding: '1.5rem', borderRadius: '12px', border: '1px solid #fecaca', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <p style={{ margin: '0 0 0.5rem 0', color: '#991b1b', fontSize: '1rem' }}>Rejected / Cancelled</p>
                        <h3 style={{ margin: 0, color: '#b91c1c', fontSize: '2.5rem' }}>{getRideStats().rejected}</h3>
                      </div>
                    </div>
                  </div>

                  {/* Recent Rides Table */}
                  <div style={{ marginTop: '1rem' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#334155', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '0.05em' }}>Rides List ({activeTab})</h4>
                    {currentFilteredRides.length > 0 ? (
                      <div>
                        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                            <thead style={{ backgroundColor: '#f8fafc' }}>
                              <tr>
                                <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600, fontSize: '0.875rem' }}>Date</th>
                                <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600, fontSize: '0.875rem' }}>Pickup & Drop</th>
                                <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600, fontSize: '0.875rem' }}>Status</th>
                                <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600, fontSize: '0.875rem' }}>Fare</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentFilteredRides.slice((currentRidePage - 1) * ITEMS_PER_PAGE, currentRidePage * ITEMS_PER_PAGE).map(ride => (
                                <tr key={ride.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#334155', whiteSpace: 'nowrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                      <Calendar size={14} color="#94a3b8" />
                                      {ride.date}
                                    </div>
                                  </td>
                                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#334155' }}>
                                    <div style={{ fontWeight: 500 }}>From: <span style={{ fontWeight: 400 }}>{ride.pickup_address}</span></div>
                                    <div style={{ fontWeight: 500, marginTop: '0.25rem' }}>To: <span style={{ fontWeight: 400 }}>{ride.drop_address}</span></div>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Distance: {ride.distance_km} km</div>
                                  </td>
                                  <td style={{ padding: '0.75rem 1rem' }}>
                                    <span style={{
                                      padding: '0.25rem 0.5rem',
                                      borderRadius: '999px',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      backgroundColor: ride.status === 'COMPLETED' ? '#dcfce7' : ride.status === 'CANCELLED' ? '#fee2e2' : '#fef9c3',
                                      color: ride.status === 'COMPLETED' ? '#166534' : ride.status === 'CANCELLED' ? '#991b1b' : '#854d0e'
                                    }}>
                                      {ride.status}
                                    </span>
                                  </td>
                                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>
                                    ₹{Number(ride.final_fare || 0).toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Rides Pagination */}
                        {totalRidePages > 1 && (
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                            <button
                              disabled={currentRidePage === 1}
                              onClick={() => setCurrentRidePage(p => p - 1)}
                              style={{ padding: '0.4rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', background: currentRidePage === 1 ? '#f8fafc' : 'white', cursor: currentRidePage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}
                            >
                              Prev
                            </button>

                            <div style={{ display: 'flex', gap: '0.25rem', overflowX: 'auto', maxWidth: '200px' }}>
                              {Array.from({ length: totalRidePages }).map((_, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => setCurrentRidePage(idx + 1)}
                                  style={{
                                    minWidth: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: '1px solid',
                                    borderColor: currentRidePage === idx + 1 ? 'var(--primary, #059669)' : '#e2e8f0',
                                    background: currentRidePage === idx + 1 ? 'var(--primary, #059669)' : 'white',
                                    color: currentRidePage === idx + 1 ? 'white' : '#64748b',
                                    borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem'
                                  }}
                                >
                                  {idx + 1}
                                </button>
                              ))}
                            </div>

                            <button
                              disabled={currentRidePage === totalRidePages}
                              onClick={() => setCurrentRidePage(p => p + 1)}
                              style={{ padding: '0.4rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', background: currentRidePage === totalRidePages ? '#f8fafc' : 'white', cursor: currentRidePage === totalRidePages ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', color: '#64748b' }}>
                        No rides available for the selected period.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#ef4444' }}>Failed to load driver data</div>
              )}
            </div>
          </div>
        </div>
        , document.body)}
    </div>
  );
};

export default OwnerDrivers;
