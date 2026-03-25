import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import ProjectCreation from './components/ProjectCreation';
import ProjectManagementLayout from './components/ProjectManagementLayout';
import Assembly from './pages/Assembly';
import InspectionPlan from './pages/InspectionPlan';
import Configurations from './pages/Configurations';
import Login from './pages/login';
import { createContext, useState, useEffect, useContext } from 'react';
import { ProjectProvider } from './context/ProjectContext';
import './App.css';

export const NavContext = createContext();

// Protected Route component - redirects to login if not authenticated
function ProtectedRoute({ children }) {
  const user = localStorage.getItem("user");
  const location = useLocation();
  
  if (!user) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }
  
  return children;
}

function App() {
  const [activeNav, setActiveNav] = useState('projects');
  
  return (
    <NavContext.Provider value={{ activeNav, setActiveNav }}>
      <ProjectProvider>
        <Router>
          <Routes>
            {/* Login page - default route */}
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <NavHandler>
                  <ProjectManagementLayout>
                    <ProjectCreation />
                  </ProjectManagementLayout>
                </NavHandler>
              </ProtectedRoute>
            } />
            <Route path="/configurations" element={
              <ProtectedRoute>
                <NavHandler>
                  <ProjectManagementLayout>
                    <Configurations />
                  </ProjectManagementLayout>
                </NavHandler>
              </ProtectedRoute>
            } />
            <Route path="/license-management" element={
              <ProtectedRoute>
                <NavHandler>
                  <ProjectManagementLayout>
                    <PlaceholderPage title="License Management" />
                  </ProjectManagementLayout>
                </NavHandler>
              </ProtectedRoute>
            } />
            {/* Other protected pages: no sidebar, no header */}
            <Route path="/Assembly" element={
              <ProtectedRoute>
                <NavHandler>
                  <Assembly />
                </NavHandler>
              </ProtectedRoute>
            } />
            <Route path="/inspection-plan" element={
              <ProtectedRoute>
                <NavHandler>
                  <InspectionPlan />
                </NavHandler>
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </ProjectProvider>
    </NavContext.Provider>
  );
}

function PlaceholderPage({ title }) {
  return (
    <div style={{ padding: 24, color: '#6b7280', fontSize: 18 }}>
      {title} — Coming soon
    </div>
  );
}

// Helper component to handle navigation state based on route
function NavHandler({ children }) {
  const location = useLocation();
  const { setActiveNav } = useContext(NavContext);

  useEffect(() => {
    // Update activeNav based on the current route
    if (location.pathname === '/Assembly') {
      setActiveNav('assembly');
    } else {
      setActiveNav('projects');
    }
  }, [location, setActiveNav]);

  return children;
}

export default App;
