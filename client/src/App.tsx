import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TenantProvider, useTenant } from '@/providers/TenantProvider';
import AppShell from '@/components/layout/AppShell';

// Broker pages
import BrokerDashboard from '@/pages/broker/BrokerDashboard';
import WarehouseCustomers from '@/pages/broker/WarehouseCustomers';
import TenantAccounts from '@/pages/broker/TenantAccounts';
import CarrierRateCards from '@/pages/broker/CarrierRateCards';
import RateCardImport from '@/pages/broker/RateCardImport';
import AdditionalCharges from '@/pages/broker/AdditionalCharges';
import InvoiceReconciliation from '@/pages/broker/InvoiceReconciliation';

// Tenant / warehouse pages
import TenantDashboard from '@/pages/tenant/TenantDashboard';
import ConnoteList from '@/pages/tenant/ConnoteList';
import ConnoteCreate from '@/pages/tenant/ConnoteCreate';
import ConnoteDetail from '@/pages/tenant/ConnoteDetail';
import ManifestList from '@/pages/tenant/ManifestList';
import ManifestCreate from '@/pages/tenant/ManifestCreate';
import Tracking from '@/pages/tenant/Tracking';
import Reports from '@/pages/tenant/Reports';

// Shared
import NotFoundPage from '@/pages/shared/NotFoundPage';
import OnboardingPendingPage from '@/pages/shared/OnboardingPendingPage';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

function AuthenticatedApp() {
  const { role, tenantId, isTenantUser, isLoading } = useTenant();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Tenant users with no assigned tenant go to the onboarding page
  if (isTenantUser && !tenantId) {
    return <OnboardingPendingPage />;
  }

  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          {/* Root redirect based on role */}
          <Route
            path="/"
            element={
              role === 'Brokers'
                ? <Navigate to="/broker" replace />
                : <Navigate to="/tenant" replace />
            }
          />

          {/* ── Broker routes ─────────────────────────────────── */}
          <Route path="/broker" element={<BrokerDashboard />} />
          <Route path="/broker/warehouses" element={<WarehouseCustomers />} />
          <Route path="/broker/warehouses/:warehouseId/tenants" element={<TenantAccounts />} />
          <Route path="/broker/rate-cards" element={<CarrierRateCards />} />
          <Route path="/broker/rate-cards/import" element={<RateCardImport />} />
          <Route path="/broker/additional-charges" element={<AdditionalCharges />} />
          <Route path="/broker/invoice-reconciliation" element={<InvoiceReconciliation />} />

          {/* ── Tenant / warehouse routes ─────────────────────── */}
          <Route path="/tenant" element={<TenantDashboard />} />
          <Route path="/tenant/connotes" element={<ConnoteList />} />
          <Route path="/tenant/connotes/new" element={<ConnoteCreate />} />
          <Route path="/tenant/connotes/:connoteId" element={<ConnoteDetail />} />
          <Route path="/tenant/manifests" element={<ManifestList />} />
          <Route path="/tenant/manifests/new" element={<ManifestCreate />} />
          <Route path="/tenant/tracking" element={<Tracking />} />
          <Route path="/tenant/reports" element={<Reports />} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <Authenticator
      loginMechanisms={['email']}
      signUpAttributes={['email']}
    >
      <TenantProvider>
        <AuthenticatedApp />
      </TenantProvider>
    </Authenticator>
  );
}
