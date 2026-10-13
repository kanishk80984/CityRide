import { getApiUrl } from './apiClient';
const BASE_URL = getApiUrl();

const getHeaders = () => {
  const token = localStorage.getItem('adminToken') || localStorage.getItem('ownerToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  };
};

const handleResponse = async (response) => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
};

export default {
  getSubscriptionPlans: () => fetch(BASE_URL + '/admin/config/plans', { headers: getHeaders() }).then(handleResponse),
  createSubscriptionPlan: (data) => fetch(BASE_URL + '/admin/config/plans', { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse),
  updateSubscriptionPlan: (id, data) => fetch(BASE_URL + '/admin/config/plans/' + id, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse),
  updateSubscriptionPlanStatus: (id, status) => fetch(BASE_URL + '/admin/config/plans/' + id + '/status', { method: 'PATCH', headers: getHeaders(), body: JSON.stringify({ status }) }).then(handleResponse),
  
  getGlobalSettings: () => fetch(BASE_URL + '/admin/config/settings', { headers: getHeaders() }).then(handleResponse),
  updateGlobalSettings: (data) => fetch(BASE_URL + '/admin/config/settings', { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse),
  
  getDriverSubscriptions: () => fetch(BASE_URL + '/admin/config/driver-subscriptions', { headers: getHeaders() }).then(handleResponse),
  
  getDriverWallets: () => fetch(BASE_URL + '/admin/config/wallets', { headers: getHeaders() }).then(handleResponse),
  getWalletTransactions: () => fetch(BASE_URL + '/admin/config/wallet-transactions', { headers: getHeaders() }).then(handleResponse),
  adjustDriverWallet: (data) => fetch(BASE_URL + '/admin/config/wallets/adjust', { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse)
};