import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Login        from "./pages/Login";
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

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Routes>

        <Route path="/login" element={<Login />} />

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
              <Route path="users" element={<Admin />} />
              <Route path="audit" element={<AuditLog />} />
            </Route>
          </Route>
        </Route>

      </Routes>
    </BrowserRouter>
  );
}
