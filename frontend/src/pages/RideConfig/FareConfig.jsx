import React from 'react';
import { Settings2, AlertTriangle } from 'lucide-react';

export default function FareConfig() {
  return (
    <div className="page-container animate-fade-in">
      <h2 style={{ marginBottom: '0.5rem', color: 'var(--text-main)' }}>Fare Configuration</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Configure Short/Long and One-Way/Two-Way fares for each vehicle type.</p>
      
      <div className="card" style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center' }}>
        <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '1rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
          <Settings2 size={48} color="var(--warning)" />
        </div>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Fare API Integration Pending</h3>
        <p style={{ color: 'var(--text-muted)', maxWidth: '500px', marginBottom: '2rem' }}>
          The backend Fare APIs are currently being updated to support the full 16-parameter matrix (Short/Long x One-Way/Two-Way x Vehicle Type).
          This configuration interface will become available once the backend API is ready.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--warning)', fontWeight: 500, backgroundColor: 'rgba(245, 158, 11, 0.05)', padding: '0.75rem 1.5rem', borderRadius: '99px' }}>
          <AlertTriangle size={18} />
          Do not store fake values locally
        </div>
      </div>
    </div>
  );
}