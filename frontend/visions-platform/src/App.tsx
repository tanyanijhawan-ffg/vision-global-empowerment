import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProtectedRoute from './components/ProtectedRoute';

// Layouts
import AppLayout from './components/AppLayout';

// Pages - Auth
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Pages - App
import Dashboard from './pages/Dashboard';
import RegionsList from './pages/masters/RegionsList';
import CentresList from './pages/masters/CentresList';
import StudentsList from './pages/students/StudentsList';
import StudentRegistration from './pages/students/StudentRegistration';
import StudentProfile from './pages/students/StudentProfile';
import AttendanceDashboard from './pages/attendance/AttendanceDashboard';
import AttendanceEntry from './pages/attendance/AttendanceEntry';
import AcademicDashboard from './pages/academics/AcademicDashboard';
import AssessmentEntry from './pages/academics/AssessmentEntry';
import AcademicTracking from './pages/academics/AcademicTracking';
import AcademicProfile from './pages/academics/AcademicProfile';
import LeadershipDashboard from './pages/leadership/LeadershipDashboard';
import LeadershipTrainingEntry from './pages/leadership/LeadershipTrainingEntry';
import ReportsHub from './pages/reports/ReportsHub';
import StudentReport from './pages/reports/StudentReport';
import CentreReport from './pages/reports/CentreReport';
import DistrictReport from './pages/reports/DistrictReport';
import RegionReport from './pages/reports/RegionReport';
import UsersList from './pages/users/UsersList';
import SettingsLayout from './pages/settings/SettingsLayout';
import ProfileSettings from './pages/settings/ProfileSettings';
import OrgSettings from './pages/settings/OrgSettings';
import NotificationSettings from './pages/settings/NotificationSettings';
import ThemeSettings from './pages/settings/ThemeSettings';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* App Routes */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            
            <Route path="/masters/regions" element={<ProtectedRoute><RegionsList /></ProtectedRoute>} />
            <Route path="/masters/centres" element={<ProtectedRoute><CentresList /></ProtectedRoute>} />
            
            <Route path="/students" element={<ProtectedRoute><StudentsList /></ProtectedRoute>} />
            <Route path="/students/new" element={<ProtectedRoute><StudentRegistration /></ProtectedRoute>} />
            <Route path="/students/:id" element={<ProtectedRoute><StudentProfile /></ProtectedRoute>} />
            
            <Route path="/attendance" element={<ProtectedRoute><AttendanceDashboard /></ProtectedRoute>} />
            <Route path="/attendance/entry" element={<ProtectedRoute><AttendanceEntry /></ProtectedRoute>} />
            
            <Route path="/academics" element={<ProtectedRoute><AcademicDashboard /></ProtectedRoute>} />
            <Route path="/academics/entry" element={<ProtectedRoute><AssessmentEntry /></ProtectedRoute>} />
            <Route path="/academics/tracking" element={<ProtectedRoute><AcademicTracking /></ProtectedRoute>} />
            <Route path="/academics/:studentId" element={<ProtectedRoute><AcademicProfile /></ProtectedRoute>} />

            <Route path="/leadership" element={<ProtectedRoute minimumRole="REGIONAL_ADMIN"><LeadershipDashboard /></ProtectedRoute>} />
            <Route path="/leadership/training" element={<ProtectedRoute minimumRole="REGIONAL_ADMIN"><LeadershipTrainingEntry /></ProtectedRoute>} />
            
            <Route path="/reports" element={<ProtectedRoute minimumRole="REGIONAL_ADMIN"><ReportsHub /></ProtectedRoute>} />
            <Route path="/reports/students" element={<ProtectedRoute minimumRole="REGIONAL_ADMIN"><StudentReport /></ProtectedRoute>} />
            <Route path="/reports/centres" element={<ProtectedRoute minimumRole="REGIONAL_ADMIN"><CentreReport /></ProtectedRoute>} />
            <Route path="/reports/districts" element={<ProtectedRoute minimumRole="REGIONAL_ADMIN"><DistrictReport /></ProtectedRoute>} />
            <Route path="/reports/regions" element={<ProtectedRoute minimumRole="REGIONAL_ADMIN"><RegionReport /></ProtectedRoute>} />
            
            <Route path="/users" element={<ProtectedRoute minimumRole="SUPER_ADMIN"><UsersList /></ProtectedRoute>} />
            
            <Route path="/settings" element={<ProtectedRoute><SettingsLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="profile" replace />} />
              <Route path="profile" element={<ProfileSettings />} />
              <Route path="organization" element={<ProtectedRoute minimumRole="SUPER_ADMIN"><OrgSettings /></ProtectedRoute>} />
              <Route path="notifications" element={<ProtectedRoute><NotificationSettings /></ProtectedRoute>} />
              <Route path="theme" element={<ProtectedRoute><ThemeSettings /></ProtectedRoute>} />
            </Route>
          </Route>

          {/* Redirects */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </QueryClientProvider>
  );
}

export default App;
