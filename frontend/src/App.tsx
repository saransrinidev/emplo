import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Certifications from "./pages/Certifications";
import Dashboard from "./pages/Dashboard";
import Documents from "./pages/Documents";
import Employees from "./pages/Employees";
import Login from "./pages/Login";
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
        <Route path="/" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/certifications" element={<Certifications />} />
        <Route path="/salary" element={<Salary />} />
        <Route path="/performance" element={<Performance />} />
        <Route path="/employees" element={<Employees />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
