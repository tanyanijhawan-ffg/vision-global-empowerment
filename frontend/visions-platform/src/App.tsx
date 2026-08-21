import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Layouts
import AppLayout from './components/AppLayout';

// Pages - Auth
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Pages - App
import Dashboard from './pages/Dashboard';
import RegionsList from './pages/masters/RegionsList';
import DistrictsList from './pages/masters/DistrictsList';
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
            <Route path="/dashboard" element={<Dashboard />} />
            
            <Route path="/masters/regions" element={<RegionsList />} />
            <Route path="/masters/districts" element={<DistrictsList />} />
            <Route path="/masters/centres" element={<CentresList />} />
            
            <Route path="/students" element={<StudentsList />} />
            <Route path="/students/new" element={<StudentRegistration />} />
            <Route path="/students/:id" element={<StudentProfile />} />
            
            <Route path="/attendance" element={<AttendanceDashboard />} />
            <Route path="/attendance/entry" element={<AttendanceEntry />} />
            
            <Route path="/academics" element={<AcademicDashboard />} />
            <Route path="/academics/entry" element={<AssessmentEntry />} />
            <Route path="/academics/tracking" element={<AcademicTracking />} />
            <Route path="/academics/:studentId" element={<AcademicProfile />} />
            
            <Route path="/reports" element={<ReportsHub />} />
            <Route path="/reports/students" element={<StudentReport />} />
            <Route path="/reports/centres" element={<CentreReport />} />
            <Route path="/reports/districts" element={<DistrictReport />} />
            <Route path="/reports/regions" element={<RegionReport />} />
            
            <Route path="/users" element={<UsersList />} />
            
            <Route path="/settings" element={<SettingsLayout />}>
              <Route index element={<Navigate to="profile" replace />} />
              <Route path="profile" element={<ProfileSettings />} />
              <Route path="organization" element={<OrgSettings />} />
              <Route path="notifications" element={<NotificationSettings />} />
              <Route path="theme" element={<ThemeSettings />} />
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
