import React, { useState, useEffect, useRef } from 'react';
import { getApiUrl, getSocketUrl } from '../../services/apiClient';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import { ArrowLeft, Send } from 'lucide-react';
import './SupportTicketChat.css';

const SupportTicketChat = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const ticket = location.state?.ticket || {};
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [ticketStatus, setTicketStatus] = useState(ticket.status || 'OPEN');
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    
    const token = localStorage.getItem('adminToken');
    socketRef.current = io(getSocketUrl(), {
      query: { token }
    });

    socketRef.current.emit('ticket:join', { ticketId });

    socketRef.current.on('ticket:receive_message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [ticketId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`${getApiUrl()}/support/tickets/${ticketId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setMessages(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching messages', error);
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    socketRef.current.emit('ticket:message', {
      ticketId,
      message: inputText.trim(),
      senderType: 'ADMIN'
    });
    
    setInputText('');
  };

  const toggleTicketStatus = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const newStatus = ticketStatus === 'OPEN' ? 'CLOSED' : 'OPEN';
      const response = await axios.put(`${getApiUrl()}/support/tickets/admin/${ticketId}/status`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        setTicketStatus(newStatus);
      }
    } catch (error) {
      console.error('Error updating ticket status', error);
      alert('Failed to update ticket status');
    }
  };

  return (
    <div className="ticket-chat-page">
      <div className="chat-header">
        <button className="btn-icon" onClick={() => navigate('/help')}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2>Ticket #{ticketId} - {ticket.topic || 'Support Chat'}</h2>
          <span className="subtitle">{ticket.user_name} ({ticket.user_phone})</span>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button 
            className={`btn btn-sm ${ticketStatus === 'OPEN' ? 'btn-danger' : 'btn-success'}`}
            onClick={toggleTicketStatus}
          >
            {ticketStatus === 'OPEN' ? 'Close Ticket' : 'Reopen Ticket'}
          </button>
        </div>
      </div>

      <div className="chat-container">
        <div className="messages-list">
          {messages.map((msg, index) => {
            const isAdmin = msg.sender_type === 'ADMIN';
            return (
              <div key={index} className={`message-wrapper ${isAdmin ? 'admin' : 'user'}`}>
                <div className="message-bubble">
                  {msg.message}
                </div>
                <div className="message-time">
                  {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-area" onSubmit={sendMessage}>
          <input 
            type="text" 
            placeholder="Type a message to the user..." 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <button type="submit" className="btn btn-primary btn-icon">
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default SupportTicketChat;
