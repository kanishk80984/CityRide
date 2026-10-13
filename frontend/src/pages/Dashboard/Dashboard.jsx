import React from 'react';
import { Users, Car, Wallet, TrendingUp } from 'lucide-react';
import './Dashboard.css';

const StatCard = ({ title, value, icon: Icon, trend, trendUp }) => (
  <div className="stat-card">
    <div className="stat-card-header">
      <div>
        <h3 className="stat-card-title">{title}</h3>
        <p className="stat-card-value">{value}</p>
      </div>
      <div className="stat-card-icon">
        <Icon size={24} />
      </div>
    </div>
    <div className="stat-card-footer">
      <span className={`trend ${trendUp ? 'trend-up' : 'trend-down'}`}>
        {trend}
      </span>
      <span className="trend-label">vs last month</span>
    </div>
  </div>
);

const Dashboard = () => {
  const stats = [
    { title: 'Total Users', value: '12,450', icon: Users, trend: '+12.5%', trendUp: true },
    { title: 'Active Drivers', value: '1,240', icon: Car, trend: '+5.2%', trendUp: true },
    { title: 'Total Revenue', value: '₹4.2M', icon: Wallet, trend: '+18.1%', trendUp: true },
    { title: 'Total Rides', value: '84,230', icon: TrendingUp, trend: '+8.4%', trendUp: true },
  ];

  return (
    <div className="dashboard-container">
      <h1 className="page-title">Dashboard Overview</h1>
      
      <div className="stats-grid">
        {stats.map((stat, idx) => (
          <StatCard key={idx} {...stat} />
        ))}
      </div>

      <div className="dashboard-content">
        <div className="card chart-card">
          <h3>Revenue Overview</h3>
          <div className="placeholder-chart">
            <div className="chart-bar" style={{ height: '40%' }}></div>
            <div className="chart-bar" style={{ height: '60%' }}></div>
            <div className="chart-bar" style={{ height: '30%' }}></div>
            <div className="chart-bar" style={{ height: '80%' }}></div>
            <div className="chart-bar" style={{ height: '50%' }}></div>
            <div className="chart-bar" style={{ height: '90%' }}></div>
            <div className="chart-bar" style={{ height: '70%' }}></div>
          </div>
        </div>
        
        <div className="card recent-activity">
          <h3>Recent Activity</h3>
          <ul className="activity-list">
            <li>
              <div className="activity-dot"></div>
              <div className="activity-info">
                <p>New Driver Registered</p>
                <span>2 minutes ago</span>
              </div>
            </li>
            <li>
              <div className="activity-dot bg-success"></div>
              <div className="activity-info">
                <p>Ride Completed #84230</p>
                <span>15 minutes ago</span>
              </div>
            </li>
            <li>
              <div className="activity-dot bg-warning"></div>
              <div className="activity-info">
                <p>Payment Disputed</p>
                <span>1 hour ago</span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
