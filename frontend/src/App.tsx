import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleGuard from "./components/RoleGuard";
import AuditLogs from "./pages/AuditLogs";
import Certifications from "./pages/Certifications";
import Dashboard from "./pages/Dashboard";
import Documents from "./pages/Documents";
import EmployeeDetail from "./pages/EmployeeDetail";
import Employees from "./pages/Employees";
import Login from "./pages/Login";
import Notifications from "./pages/Notifications";
import OrgChart from "./pages/OrgChart";
import Performance from "./pages/Performance";
import Profile from "./pages/Profile";
import Salary from "./pages/Salary";

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
        <Route path="/profile" element={<Profile />} />
        <Route path="/notifications" element={<Notifications />} />

        {/* Employee + Manager only */}
        <Route path="/documents" element={<RoleGuard allowed={["employee", "manager"]}><Documents /></RoleGuard>} />
        <Route path="/certifications" element={<RoleGuard allowed={["employee", "manager"]}><Certifications /></RoleGuard>} />
        <Route path="/salary" element={<RoleGuard allowed={["employee", "manager"]}><Salary /></RoleGuard>} />
        <Route path="/performance" element={<RoleGuard allowed={["employee", "manager"]}><Performance /></RoleGuard>} />

        {/* Manager + HR only */}
        <Route path="/employees" element={<RoleGuard allowed={["manager", "hr_admin"]}><Employees /></RoleGuard>} />
        <Route path="/employees/:id" element={<RoleGuard allowed={["manager", "hr_admin"]}><EmployeeDetail /></RoleGuard>} />

        {/* HR only */}
        <Route path="/org-chart" element={<RoleGuard allowed={["hr_admin"]}><OrgChart /></RoleGuard>} />
        <Route path="/audit-logs" element={<RoleGuard allowed={["hr_admin"]}><AuditLogs /></RoleGuard>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
