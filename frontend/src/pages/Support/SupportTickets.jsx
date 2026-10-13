import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../services/apiClient';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './SupportTickets.css';

const SupportTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // ALL, USER, DRIVER
  const navigate = useNavigate();

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 5000); // Auto-refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`${getApiUrl()}/support/tickets/admin/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setTickets(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching tickets', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading tickets...</div>;
  }

  const filteredTickets = tickets.filter(ticket => {
    // Filter by type
    if (filterType !== 'ALL' && ticket.user_type !== filterType) {
      return false;
    }
    // Filter by search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const ticketId = `#${ticket.id}`.toLowerCase();
      const userIdStr = ticket.user_id?.toString() || '';
      const userName = ticket.user_name?.toLowerCase() || '';
      
      if (!ticketId.includes(q) && !userIdStr.includes(q) && !userName.includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="support-tickets-page">
      <div className="page-header">
        <h1>Help & Support Tickets</h1>
      </div>
      
      <div className="controls-container">
        <div className="search-box">
          <input 
            type="text" 
            placeholder="Search by Ticket ID, User ID, or Name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="filter-tabs">
          <button 
            className={`filter-btn ${filterType === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilterType('ALL')}
          >
            All Tickets
          </button>
          <button 
            className={`filter-btn ${filterType === 'USER' ? 'active' : ''}`}
            onClick={() => setFilterType('USER')}
          >
            User Tickets
          </button>
          <button 
            className={`filter-btn ${filterType === 'DRIVER' ? 'active' : ''}`}
            onClick={() => setFilterType('DRIVER')}
          >
            Driver Tickets
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>User/Driver ID</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Topic</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center">No tickets found</td>
                </tr>
              ) : (
                filteredTickets.map(ticket => (
                  <tr key={ticket.id}>
                    <td>#{ticket.id}</td>
                    <td>{ticket.user_id} <span className="type-badge">{ticket.user_type === 'DRIVER' ? '(Driver)' : '(User)'}</span></td>
                    <td>{ticket.user_name}</td>
                    <td>{ticket.user_phone}</td>
                    <td>{ticket.topic}</td>
                    <td>
                      <span className={`status-badge ${ticket.status.toLowerCase()}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td>{new Date(ticket.created_at).toLocaleString()}</td>
                    <td>
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate(`/help/${ticket.id}`, { state: { ticket } })}
                      >
                        View & Chat
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SupportTickets;
