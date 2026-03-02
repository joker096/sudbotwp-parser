import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import ErrorBoundary from './components/ErrorBoundary';
import PageLoader from './components/PageLoader';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import AuthCallback from './components/AuthCallback';

// Lazy-loaded pages
const Home = lazy(() => import('./pages/Home'));
const CaseSearch = lazy(() => import('./pages/CaseSearch'));
const Lawyers = lazy(() => import('./pages/Lawyers'));
const Leads = lazy(() => import('./pages/Leads'));
const Monitoring = lazy(() => import('./pages/Monitoring'));
const TaxpayerCheck = lazy(() => import('./pages/TaxpayerCheck'));
const Calculator = lazy(() => import('./pages/Calculator'));
const Blog = lazy(() => import('./pages/Blog'));
const AdminBlog = lazy(() => import('./pages/AdminBlog'));
const Help = lazy(() => import('./pages/Help'));
const Login = lazy(() => import('./pages/Login'));
const Messages = lazy(() => import('./pages/Messages'));
const Profile = lazy(() => import('./pages/Profile'));
const Privacy = lazy(() => import('./pages/Privacy'));
const NotFound = lazy(() => import('./pages/NotFound'));

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader withBackground />}>
              <Routes>
                <Route path="/" element={<Layout />}>
                  {/* Public routes */}
                  <Route index element={<Home />} />
                  <Route path="search" element={<CaseSearch />} />
                  <Route path="lawyers" element={<Lawyers />} />
                  <Route path="calculator" element={<Calculator />} />
                  <Route path="blog" element={<Blog />} />
                  <Route path="admin/blog" element={<AdminBlog />} />
                  <Route path="admin/blog/:id" element={<AdminBlog />} />
                  <Route path="help" element={<Help />} />
                  <Route path="login" element={<Login />} />
                  <Route path="taxpayer" element={<TaxpayerCheck />} />
                  <Route path="privacy" element={<Privacy />} />
                  
                  {/* Protected routes */}
                  <Route 
                    path="profile" 
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="messages" 
                    element={
                      <ProtectedRoute>
                        <Messages />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="leads" 
                    element={
                      <ProtectedRoute>
                        <Leads />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="monitoring" 
                    element={
                      <ProtectedRoute>
                        <Monitoring />
                      </ProtectedRoute>
                    } 
                  />
                </Route>
                
                {/* Auth callback route - outside Layout */}
                <Route path="/auth/callback" element={<AuthCallback />} />
                
                {/* 404 route - outside Layout */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}