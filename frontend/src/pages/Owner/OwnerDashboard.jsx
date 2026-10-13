import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../services/apiClient';
import { Users, Car, MapPin, CheckCircle, XCircle, ChevronDown, TrendingUp, BarChart2, ArrowRight, Calendar as CalendarIcon } from 'lucide-react';
import '../Dashboard/Dashboard.css';
import './OwnerDashboard.css';

const OwnerDashboard = () => {
  const [stats, setStats] = useState({
    totalDrivers: 0,
    totalRides: 0,
    activeRides: 0,
    completedRides: 0,
    cancelledRides: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('ownerToken');
      const res = await fetch(`${getApiUrl()}/owner/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="dashboard-container animate-fade-in">
      {/* =========================================
          DESKTOP VIEW (matches the provided image)
          ========================================= */}
      <div className="desktop-view">
        <div className="owner-hero-banner">
          <div className="owner-hero-content">
            <div className="owner-welcome-badge">
              WELCOME BACK 👋
            </div>
            <h1 className="owner-hero-title">Owner <span>Overview</span></h1>
            <p className="owner-hero-subtitle">Here's what's happening on your CityRide platform today.</p>
          </div>
          <div className="owner-hero-illustration">
            <div className="floating-quote-card">
              <div className="quote-icon">
                <BarChart2 size={24} />
              </div>
              <div className="quote-text">
                <h4>Keep growing!</h4>
                <p>"More rides, happier cities."</p>
              </div>
            </div>
            {/* The illustration background is handled by CSS pseudo elements */}
          </div>
        </div>

        <div className="stats-grid">
          {/* Desktop Driver Card */}
          <div className="owner-stat-card">
            <div className="owner-stat-header">
              <div className="owner-stat-header-left">
                <div className="owner-stat-icon green">
                  <Users size={24} />
                </div>
                <div className="owner-stat-titles">
                  <h3>Total Drivers</h3>
                  <p>Active drivers on platform</p>
                </div>
              </div>
              <div className="owner-stat-trend positive">
                <span className="owner-stat-trend-val">↗ +1</span>
                <span className="owner-stat-trend-label">vs last week</span>
              </div>
            </div>
            <div className="owner-stat-body">
              <div className="owner-stat-number">{stats.totalDrivers}</div>
              <div className="owner-stat-chart-mini">
                <div className="mini-bar green"></div><div className="mini-bar green"></div><div className="mini-bar green"></div><div className="mini-bar green"></div><div className="mini-bar green"></div><div className="mini-bar green"></div><div className="mini-bar green"></div>
              </div>
            </div>
            <div className="owner-stat-footer">
              <span className="owner-stat-link green">View Drivers <ArrowRight size={16}/></span>
            </div>
          </div>

          {/* Desktop Rides Card */}
          <div className="owner-stat-card">
            <div className="owner-stat-header">
              <div className="owner-stat-header-left">
                <div className="owner-stat-icon green">
                  <MapPin size={24} />
                </div>
                <div className="owner-stat-titles">
                  <h3>Total Rides</h3>
                  <p>All rides (completed + cancelled)</p>
                </div>
              </div>
              <div className="owner-stat-trend positive">
                <span className="owner-stat-trend-val">↗ +12%</span>
                <span className="owner-stat-trend-label">vs last week</span>
              </div>
            </div>
            <div className="owner-stat-body">
              <div className="owner-stat-number">{stats.totalRides}</div>
              <div className="owner-stat-chart-mini">
                <div className="mini-bar green"></div><div className="mini-bar green"></div><div className="mini-bar green"></div><div className="mini-bar green"></div><div className="mini-bar green"></div><div className="mini-bar green"></div><div className="mini-bar green"></div>
              </div>
            </div>
            <div className="owner-stat-footer">
              <span className="owner-stat-link green">View Ride Details <ArrowRight size={16}/></span>
            </div>
          </div>

          {/* Desktop Completed Rides Card */}
          <div className="owner-stat-card">
            <div className="owner-stat-header">
              <div className="owner-stat-header-left">
                <div className="owner-stat-icon blue">
                  <CheckCircle size={24} />
                </div>
                <div className="owner-stat-titles">
                  <h3>Completed Rides</h3>
                  <p>Successfully completed</p>
                </div>
              </div>
              <div className="owner-stat-trend positive">
                <span className="owner-stat-trend-val">↗ +8%</span>
                <span className="owner-stat-trend-label">vs last week</span>
              </div>
            </div>
            <div className="owner-stat-body">
              <div className="owner-stat-number">{stats.completedRides}</div>
              <div className="owner-stat-chart-mini">
                <div className="mini-bar blue"></div><div className="mini-bar blue"></div><div className="mini-bar blue"></div><div className="mini-bar blue"></div><div className="mini-bar blue"></div><div className="mini-bar blue"></div><div className="mini-bar blue"></div>
              </div>
            </div>
            <div className="owner-stat-footer">
              <span className="owner-stat-link blue">View Completed Rides <ArrowRight size={16}/></span>
            </div>
          </div>

          {/* Desktop Cancelled Rides Card */}
          <div className="owner-stat-card">
            <div className="owner-stat-header">
              <div className="owner-stat-header-left">
                <div className="owner-stat-icon red">
                  <XCircle size={24} />
                </div>
                <div className="owner-stat-titles">
                  <h3>Cancelled Rides</h3>
                  <p>Rides cancelled by users</p>
                </div>
              </div>
              <div className="owner-stat-trend negative">
                <span className="owner-stat-trend-val">↘ -5%</span>
                <span className="owner-stat-trend-label">vs last week</span>
              </div>
            </div>
            <div className="owner-stat-body">
              <div className="owner-stat-number">{stats.cancelledRides}</div>
              <div className="owner-stat-chart-mini">
                <div className="mini-bar red"></div><div className="mini-bar red"></div><div className="mini-bar red"></div><div className="mini-bar red"></div><div className="mini-bar red"></div><div className="mini-bar red"></div><div className="mini-bar red"></div>
              </div>
            </div>
            <div className="owner-stat-footer">
              <span className="owner-stat-link red">View Cancelled Rides <ArrowRight size={16}/></span>
            </div>
          </div>
        </div>

        <div className="owner-charts-section">
          {/* Donut Chart Card */}
          <div className="owner-chart-card">
            <div className="owner-chart-header">
              <div>
                <h3>Ride Status Distribution</h3>
                <p>Overview of completed vs cancelled rides</p>
              </div>
              <div className="date-dropdown">
                <CalendarIcon size={16} /> Last 7 days <ChevronDown size={14} />
              </div>
            </div>
            <div className="donut-chart-container">
              <div className="donut-circle">
                <div className="donut-inner">
                  <h2>{stats.totalRides}</h2>
                  <span>Total Rides</span>
                </div>
              </div>
              <div className="donut-legend">
                <div className="legend-item">
                  <div className="legend-label"><div className="dot green"></div> Completed Rides</div>
                  <div className="legend-value">
                    <h4>{stats.completedRides}</h4>
                    <span>{stats.totalRides > 0 ? ((stats.completedRides / stats.totalRides) * 100).toFixed(1) : 0}%</span>
                  </div>
                </div>
                <div className="legend-item">
                  <div className="legend-label"><div className="dot red"></div> Cancelled Rides</div>
                  <div className="legend-value">
                    <h4>{stats.cancelledRides}</h4>
                    <span>{stats.totalRides > 0 ? ((stats.cancelledRides / stats.totalRides) * 100).toFixed(1) : 0}%</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="success-banner">
              <span><TrendingUp size={16} style={{display:'inline', marginRight:'8px', verticalAlign:'middle'}}/> Success rate is {stats.totalRides > 0 ? ((stats.completedRides / stats.totalRides) * 100).toFixed(1) : 0}% this week!</span>
              <ChevronDown size={16} style={{transform: 'rotate(-90deg)'}}/>
            </div>
          </div>

          {/* Line Chart Card */}
          <div className="owner-chart-card">
            <div className="owner-chart-header">
              <div>
                <h3>Activity Trend</h3>
                <p>Ride activity over the selected period</p>
              </div>
              <div className="date-dropdown">
                <CalendarIcon size={16} /> Last 7 days <ChevronDown size={14} />
              </div>
            </div>
            <div className="placeholder-line-chart">
              <div className="chart-grid-lines">
                <div className="grid-line" data-val="40"></div>
                <div className="grid-line" data-val="30"></div>
                <div className="grid-line" data-val="20"></div>
                <div className="grid-line" data-val="10"></div>
                <div className="grid-line" data-val="0"></div>
              </div>
              
              <svg className="chart-svg-placeholder" viewBox="0 0 500 200" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="gradGreen" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.2"/>
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
                  </linearGradient>
                  <linearGradient id="gradRed" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2"/>
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <path d="M0,150 L80,100 L160,80 L240,75 L320,60 L400,40 L480,50 L500,50 L500,200 L0,200 Z" fill="url(#gradGreen)"></path>
                <path d="M0,150 L80,100 L160,80 L240,75 L320,60 L400,40 L480,50" fill="none" stroke="#10b981" strokeWidth="2"></path>
                
                <path d="M0,190 L80,180 L160,175 L240,185 L320,180 L400,165 L480,175 L500,175 L500,200 L0,200 Z" fill="url(#gradRed)"></path>
                <path d="M0,190 L80,180 L160,175 L240,185 L320,180 L400,165 L480,175" fill="none" stroke="#ef4444" strokeWidth="2"></path>
                
                {/* Dots */}
                <circle cx="0" cy="150" r="4" fill="#10b981"></circle>
                <circle cx="80" cy="100" r="4" fill="#10b981"></circle>
                <circle cx="160" cy="80" r="4" fill="#10b981"></circle>
                <circle cx="240" cy="75" r="4" fill="#10b981"></circle>
                <circle cx="320" cy="60" r="4" fill="#10b981"></circle>
                <circle cx="400" cy="40" r="4" fill="#10b981"></circle>
                <circle cx="480" cy="50" r="4" fill="#10b981"></circle>
                
                <circle cx="0" cy="190" r="4" fill="#ef4444"></circle>
                <circle cx="80" cy="180" r="4" fill="#ef4444"></circle>
                <circle cx="160" cy="175" r="4" fill="#ef4444"></circle>
                <circle cx="240" cy="185" r="4" fill="#ef4444"></circle>
                <circle cx="320" cy="180" r="4" fill="#ef4444"></circle>
                <circle cx="400" cy="165" r="4" fill="#ef4444"></circle>
                <circle cx="480" cy="175" r="4" fill="#ef4444"></circle>
              </svg>
              
              <div className="chart-labels">
                <span>Apr 20</span>
                <span>Apr 21</span>
                <span>Apr 22</span>
                <span>Apr 23</span>
                <span>Apr 24</span>
                <span>Apr 25</span>
                <span>Apr 26</span>
              </div>
            </div>
            
            <div className="chart-legend-bottom">
              <div className="chart-legend-item"><div className="dot green"></div> Completed Rides</div>
              <div className="chart-legend-item"><div className="dot red"></div> Cancelled Rides</div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================
          MOBILE VIEW (PRESERVED OLD LAYOUT)
          ========================================= */}
      <div className="mobile-view">
        <div className="dashboard-header">
          <h1>Owner Overview</h1>
          <p>Your platform activity at a glance</p>
        </div>

        <div className="stats-grid">
          {/* Drivers Card */}
          <div className="stat-card">
            <div className="stat-card-top">
              <div className="stat-top-left">
                <div className="stat-icon purple-bg">
                  <Car size={24} color="#6366f1" />
                </div>
                <h3 className="stat-card-title">Total Drivers</h3>
              </div>
              <div className="stat-trend trend-green desktop-only">
                <span className="trend-value">↗ +1</span>
                <span className="trend-label">vs last week</span>
              </div>
            </div>
            <div className="stat-info">
              <p className="stat-value text-purple">{stats.totalDrivers}</p>
            </div>
            <div className="stat-footer purple-light-bg">
              <Users size={16} color="#6366f1" />
              <span>Active drivers on platform</span>
            </div>
          </div>

          {/* Total Rides Card */}
          <div className="stat-card">
            <div className="stat-card-top">
              <div className="stat-top-left">
                <div className="stat-icon green-bg">
                  <MapPin size={24} color="#10b981" />
                </div>
                <h3 className="stat-card-title">Total Rides</h3>
              </div>
              <div className="stat-trend trend-green desktop-only">
                <span className="trend-value">↗ +12%</span>
                <span className="trend-label">vs last week</span>
              </div>
            </div>
            <div className="stat-info">
              <p className="stat-value text-green">{stats.totalRides}</p>
            </div>
            <div className="stat-footer green-light-bg">
              <CheckCircle size={16} color="#10b981" />
              <span>All rides (completed + cancelled)</span>
            </div>
          </div>

          {/* Completed Rides Card */}
          <div className="stat-card">
            <div className="stat-card-top">
              <div className="stat-top-left">
                <div className="stat-icon blue-bg">
                  <CheckCircle size={24} color="#3b82f6" />
                </div>
                <h3 className="stat-card-title">Completed Rides</h3>
              </div>
              <div className="stat-trend trend-green desktop-only">
                <span className="trend-value">↗ +8%</span>
                <span className="trend-label">vs last week</span>
              </div>
            </div>
            <div className="stat-info">
              <p className="stat-value text-blue">{stats.completedRides}</p>
            </div>
            <div className="stat-footer blue-light-bg">
              <CheckCircle size={16} color="#3b82f6" />
              <span>Successfully completed</span>
            </div>
          </div>

          {/* Cancelled Rides Card */}
          <div className="stat-card">
            <div className="stat-card-top">
              <div className="stat-top-left">
                <div className="stat-icon red-bg">
                  <XCircle size={24} color="#ef4444" />
                </div>
                <h3 className="stat-card-title">Cancelled Rides</h3>
              </div>
              <div className="stat-trend trend-red desktop-only">
                <span className="trend-value">↗ +5%</span>
                <span className="trend-label">vs last week</span>
              </div>
            </div>
            <div className="stat-info">
              <p className="stat-value text-red">{stats.cancelledRides}</p>
            </div>
            <div className="stat-footer red-light-bg">
              <XCircle size={16} color="#ef4444" />
              <span>Rides cancelled by users or drivers</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;
