import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MyEvents from './pages/MyEvents';
import RegisterOrganizer from './pages/RegisterOrganizer';
import OrganizerDashboard from './pages/OrganizerDashboard';
import OrganizerProfile from './pages/OrganizerProfile';
import CompleteProfile from './pages/CompleteProfile';
import EventDetail from './pages/EventDetail';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import CompletedEvents from './pages/CompletedEvents';
import UserProfile from './pages/UserProfile';
import LandingPage from './pages/LandingPage';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register-organizer" element={<RegisterOrganizer />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/my-events" element={<MyEvents />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/completed-events" element={<CompletedEvents />} />
        <Route path="/event/:id" element={
          <PrivateRoute>
            <EventDetail />
          </PrivateRoute>
        } />
        <Route path="/organizer-dashboard" element={<OrganizerDashboard />} />
        <Route path="/organizer-profile" element={<OrganizerProfile />} />
        <Route path="/admin-login" element={<Navigate to="/login" />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
