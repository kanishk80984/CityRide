import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import OwnerLayout from './components/OwnerLayout';
import Login from './pages/Login/Login';
import Home from './pages/Home/Home';
import OwnerDashboard from './pages/Owner/OwnerDashboard';
import OwnerDrivers from './pages/Owner/OwnerDrivers';
import OwnerSettings from './pages/Owner/OwnerSettings';
import Dashboard from './pages/Dashboard/Dashboard';
import Users from './pages/Users/Users';
import Drivers from './pages/Drivers/Drivers';
import DriverReview from './pages/Drivers/DriverReview';
import DriverOnboardAdmin from './pages/Drivers/DriverOnboardAdmin';
import VehicleSettings from './pages/VehicleSettings/VehicleSettings';
import SupportTickets from './pages/Support/SupportTickets';
import SupportTicketChat from './pages/Support/SupportTicketChat';
import PopularLocations from './pages/PopularLocations/PopularLocations';
import Advertisements from './pages/Advertisements/Advertisements';
import Withdrawals from './pages/Withdrawals/Withdrawals';
import UserWithdrawals from './pages/UserWithdrawals/UserWithdrawals';

import SubscriptionPlans from './pages/Subscriptions/SubscriptionPlans';
import FreeTrialConfig from './pages/Subscriptions/FreeTrialConfig';
import DriverSubscriptions from './pages/Subscriptions/DriverSubscriptions';
import RideConfig from './pages/RideConfig/RideConfig';
import FareConfig from './pages/RideConfig/FareConfig';
import DriverWallet from './pages/Wallet/DriverWallet';
import WalletTransactions from './pages/Wallet/WalletTransactions';

import './index.css';

function App() {
  return (
    <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<Home />} />
        <Route path="/rides" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Login />} />

        {/* Protected Admin Routes */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/users" element={<Users />} />
          <Route path="/drivers" element={<Drivers />} />
          <Route path="/drivers/new" element={<DriverOnboardAdmin />} />
          <Route path="/drivers/review/:id" element={<DriverReview />} />
          <Route path="/vehicles" element={<VehicleSettings />} />
          <Route path="/popular-locations" element={<PopularLocations />} />
          <Route path="/advertisements" element={<Advertisements />} />
          <Route path="/withdrawals" element={<Withdrawals />} />
          <Route path="/user-withdrawals" element={<UserWithdrawals />} />
          <Route path="/help" element={<SupportTickets />} />
          <Route path="/help/:ticketId" element={<SupportTicketChat />} />

          {/* Subscriptions */}
          <Route path="/subscriptions/plans" element={<SubscriptionPlans />} />
          <Route path="/subscriptions/free-trial" element={<FreeTrialConfig />} />
          <Route path="/subscriptions/drivers" element={<DriverSubscriptions />} />

          {/* Ride Configuration */}
          <Route path="/ride-config" element={<RideConfig />} />
          <Route path="/ride-config/fares" element={<FareConfig />} />

          {/* Wallet */}
          <Route path="/wallet" element={<DriverWallet />} />
          <Route path="/wallet/transactions" element={<WalletTransactions />} />
        </Route>

        {/* Owner Routes */}
        <Route path="/owner" element={<OwnerLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<OwnerDashboard />} />
          <Route path="drivers" element={<OwnerDrivers />} />
          <Route path="settings" element={<OwnerSettings />} />
        </Route>
    </Routes>
  );
}

export default App;
