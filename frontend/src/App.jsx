import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { LanguageProvider } from "./context/LanguageContext";
import ErrorBoundary from "./components/ErrorBoundary";
import Login          from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword  from "./pages/ResetPassword";
import MainLayout   from "./layout/MainLayout";
import ProtectedRoute from "./ProtectedRoute";
import RoleRoute    from "./RoleRoute";

import Dashboard     from "./pages/main/Dashboard";
import Companies     from "./pages/main/Companies";
import Employees     from "./pages/main/Employees";
import AddEmployee   from "./pages/main/AddEmployee";
import EmployeeDetail     from "./pages/main/EmployeeDetail";
import EmployeeCardDetail from "./pages/main/EmployeeCardDetail";
import CompanyProfile from "./pages/main/CompanyProfile";
import IdCard        from "./pages/main/IdCard";
import Reports       from "./pages/main/Reports";
import Admin         from "./pages/main/Admin";
import AuditLog      from "./pages/main/AuditLog";
import Settings      from "./pages/main/Settings";
import Building        from "./pages/main/Building";
import ImportEmployee  from "./pages/main/ImportEmployee";
import ImportApproval  from "./pages/main/ImportApproval";

export default function App() {
  return (
    <ErrorBoundary>
    <LanguageProvider>
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 5000,
          style: {
            background: "#fff",
            color: "#111827",
            borderRadius: "14px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.13)",
            padding: "14px 18px",
            fontSize: "14px",
            fontFamily: "inherit",
            maxWidth: "380px",
            border: "1px solid #f3f4f6",
          },
          success: {
            iconTheme: { primary: "#22c55e", secondary: "#fff" },
            style: { borderLeft: "4px solid #22c55e" },
          },
          error: {
            iconTheme: { primary: "#ef4444", secondary: "#fff" },
            style: { borderLeft: "4px solid #ef4444" },
          },
        }}
      />
      <Routes>

        <Route path="/login"            element={<Login />} />
        <Route path="/forgot-password"  element={<ForgotPassword />} />
        <Route path="/reset-password"   element={<ResetPassword />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<MainLayout />}>
            <Route index               element={<Dashboard />} />
            <Route path="dashboard"    element={<Dashboard />} />
            <Route path="companies"    element={<Companies />} />
            <Route path="companies/:id" element={<CompanyProfile />} />
            <Route path="employees"          element={<Employees />} />
            <Route path="employees/add"      element={<AddEmployee />} />
            <Route path="employees/edit/:id" element={<AddEmployee />} />
            <Route path="employees/:id"      element={<EmployeeDetail />} />
            <Route path="employees/:id/card" element={<EmployeeCardDetail />} />
            <Route path="idcard"    element={<IdCard />} />
            <Route path="building"  element={<Building />} />
            <Route path="reports"  element={<Reports />} />
            <Route path="import"   element={<ImportEmployee />} />
            <Route path="settings" element={<Settings />} />

            {/* Super Admin only */}
            <Route element={<RoleRoute roles={["Super Admin"]} />}>
              <Route path="users"          element={<Admin />} />
              <Route path="audit"          element={<AuditLog />} />
              <Route path="import-approval" element={<ImportApproval />} />
            </Route>
          </Route>
        </Route>

      </Routes>
    </BrowserRouter>
    </LanguageProvider>
    </ErrorBoundary>
  );
}
