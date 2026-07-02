import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleGuard from "./components/RoleGuard";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

// Lazy-load the rest so the initial bundle stays small and pages load on demand.
const Attendance = lazy(() => import("./pages/Attendance"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const Certifications = lazy(() => import("./pages/Certifications"));
const Documents = lazy(() => import("./pages/Documents"));
const EmployeeDetail = lazy(() => import("./pages/EmployeeDetail"));
const Employees = lazy(() => import("./pages/Employees"));
const Messages = lazy(() => import("./pages/Messages"));
const MyRequests = lazy(() => import("./pages/MyRequests"));
const Notifications = lazy(() => import("./pages/Notifications"));
const OrgChart = lazy(() => import("./pages/OrgChart"));
const Performance = lazy(() => import("./pages/Performance"));
const Profile = lazy(() => import("./pages/Profile"));
const Salary = lazy(() => import("./pages/Salary"));
const Tasks = lazy(() => import("./pages/Tasks"));

function PageFallback() {
  return (
    <div className="page-loading-fallback">
      <div className="spinner" />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* All roles */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/profile" element={<Suspense fallback={<PageFallback />}><Profile /></Suspense>} />
        <Route path="/my-requests" element={<Suspense fallback={<PageFallback />}><MyRequests /></Suspense>} />
        <Route path="/messages" element={<Suspense fallback={<PageFallback />}><Messages /></Suspense>} />
        <Route path="/tasks" element={<Suspense fallback={<PageFallback />}><Tasks /></Suspense>} />
        <Route path="/notifications" element={<Suspense fallback={<PageFallback />}><Notifications /></Suspense>} />

        {/* All roles - Attendance */}
        <Route path="/attendance" element={<Suspense fallback={<PageFallback />}><Attendance /></Suspense>} />

        {/* Employee + Manager only */}
        <Route path="/documents" element={<RoleGuard allowed={["employee", "manager"]}><Suspense fallback={<PageFallback />}><Documents /></Suspense></RoleGuard>} />
        <Route path="/certifications" element={<RoleGuard allowed={["employee", "manager"]}><Suspense fallback={<PageFallback />}><Certifications /></Suspense></RoleGuard>} />
        <Route path="/salary" element={<RoleGuard allowed={["employee", "manager"]}><Suspense fallback={<PageFallback />}><Salary /></Suspense></RoleGuard>} />
        <Route path="/performance" element={<RoleGuard allowed={["employee", "manager"]}><Suspense fallback={<PageFallback />}><Performance /></Suspense></RoleGuard>} />

        {/* Manager + HR only */}
        <Route path="/employees" element={<RoleGuard allowed={["manager", "hr_admin"]}><Suspense fallback={<PageFallback />}><Employees /></Suspense></RoleGuard>} />
        <Route path="/employees/:id" element={<RoleGuard allowed={["manager", "hr_admin"]}><Suspense fallback={<PageFallback />}><EmployeeDetail /></Suspense></RoleGuard>} />

        {/* HR only */}
        <Route path="/org-chart" element={<RoleGuard allowed={["hr_admin"]}><Suspense fallback={<PageFallback />}><OrgChart /></Suspense></RoleGuard>} />
        <Route path="/audit-logs" element={<RoleGuard allowed={["hr_admin"]}><Suspense fallback={<PageFallback />}><AuditLogs /></Suspense></RoleGuard>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
