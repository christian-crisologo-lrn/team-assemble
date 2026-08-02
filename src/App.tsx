import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Squad from './pages/Squad';
import Roles from './pages/Roles';
import SprintPlanner from './pages/SprintPlanner';
import Presentation from './pages/Presentation';
import Login from './pages/Login';
import { useSprintStore } from './store/useSprintStore';

function App() {
  const { currentTeam, fetchInitialData } = useSprintStore();

  useEffect(() => {
    if (currentTeam) {
      fetchInitialData();
    }
  }, [currentTeam, fetchInitialData]);

  return (
    <BrowserRouter basename="/team-assemble">
      <Routes>
        {/* Public Route */}
        <Route path="/presentation" element={
          <div className="min-h-screen bg-background text-foreground">
            <Presentation />
          </div>
        } />

        {/* Protected Routes */}
        <Route path="*" element={
          !currentTeam ? (
            <Login />
          ) : (
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/squad" element={<Squad />} />
                <Route path="/roles" element={<Roles />} />
                <Route path="/planning" element={<SprintPlanner />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          )
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
