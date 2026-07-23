import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { LanguageProvider } from "./context/LanguageContext";
import { useDarkMode } from "./hooks/useDarkMode";
import ErrorBoundary from "./components/ErrorBoundary";
import SkeletonLoader from "./components/SkeletonLoader";
import MainLayout   from "./layout/MainLayout";
import ProtectedRoute from "./ProtectedRoute";
import RoleRoute    from "./RoleRoute";

/* Route-level code splitting — each page becomes its own chunk, fetched on
   first visit instead of all being bundled into one multi-MB file upfront. */
const Login          = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword  = lazy(() => import("./pages/ResetPassword"));

const Dashboard     = lazy(() => import("./pages/main/Dashboard"));
const Companies     = lazy(() => import("./pages/main/Companies"));
const Employees     = lazy(() => import("./pages/main/Employees"));
const TapInOut      = lazy(() => import("./pages/main/TapInOut"));
const AddEmployee   = lazy(() => import("./pages/main/AddEmployee"));
const EmployeeDetail     = lazy(() => import("./pages/main/EmployeeDetail"));
const EmployeeCardDetail = lazy(() => import("./pages/main/EmployeeCardDetail"));
const CompanyProfile = lazy(() => import("./pages/main/CompanyProfile"));
const IdCard           = lazy(() => import("./pages/main/IdCard"));
const CardRequests       = lazy(() => import("./pages/main/CardRequests"));
const CardRequestDetail  = lazy(() => import("./pages/main/CardRequestDetail"));
const CardRequestForm  = lazy(() => import("./pages/main/CardRequestForm"));
const PreviewRequest   = lazy(() => import("./pages/main/PreviewRequest"));
const RequestSuccess   = lazy(() => import("./pages/main/RequestSuccess"));
const Reports       = lazy(() => import("./pages/main/Reports"));
const Admin         = lazy(() => import("./pages/main/Admin"));
const AuditLog      = lazy(() => import("./pages/main/AuditLog"));
const Settings      = lazy(() => import("./pages/main/Settings"));
const Building        = lazy(() => import("./pages/main/Building"));
const ImportEmployee  = lazy(() => import("./pages/main/ImportEmployee"));
const ImportApproval  = lazy(() => import("./pages/main/ImportApproval"));
const BulkPhotoUpload = lazy(() => import("./pages/main/BulkPhotoUpload"));
const UserManual      = lazy(() => import("./pages/main/UserManual"));
const About           = lazy(() => import("./pages/main/About"));
const NotFound         = lazy(() => import("./pages/main/NotFound"));

function RouteFallback() {
  return (
    <div style={{ padding: 24 }}>
      <SkeletonLoader variant="table" rows={5} />
    </div>
  );
}

export default function App() {
  const [dark] = useDarkMode();

  const toastBase = dark
    ? { background: "#102030", color: "#eef4ff", border: "1px solid #1e3050", boxShadow: "0 8px 32px rgba(0,0,0,.45)" }
    : { background: "#fff",    color: "#111827", border: "1px solid #f3f4f6", boxShadow: "0 8px 32px rgba(0,0,0,.13)" };
  const iconBg = dark ? "#102030" : "#fff";

  return (
    <ErrorBoundary>
    <LanguageProvider>
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 5000,
          style: {
            ...toastBase,
            borderRadius: "14px",
            padding: "14px 18px",
            fontSize: "14px",
            fontFamily: "inherit",
            maxWidth: "380px",
          },
          success: {
            iconTheme: { primary: "#22c55e", secondary: iconBg },
            style: { borderLeft: "4px solid #22c55e" },
          },
          error: {
            iconTheme: { primary: "#ef4444", secondary: iconBg },
            style: { borderLeft: "4px solid #ef4444" },
          },
        }}
      />
      <Suspense fallback={<RouteFallback />}>
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
            <Route path="employees/tap-in-out" element={<TapInOut />} />
            <Route path="employees/:id/card" element={<EmployeeCardDetail />} />
            <Route path="idcard"         element={<IdCard />} />
            <Route path="idcard/request"         element={<CardRequestForm />} />
            <Route path="idcard/request/preview" element={<PreviewRequest />} />
            <Route path="idcard/request/success" element={<RequestSuccess />} />
            <Route path="building"  element={<Building />} />
            <Route path="reports"  element={<Reports />} />
            <Route path="import"        element={<ImportEmployee />} />
            <Route path="bulk-photo"    element={<BulkPhotoUpload />} />
            <Route path="user-manual"   element={<UserManual />} />
            <Route path="settings"      element={<Settings />} />
            <Route path="about"         element={<About />} />

            {/* Super Admin only */}
            <Route element={<RoleRoute roles={["Super Admin"]} />}>
              <Route path="users"          element={<Admin />} />
              <Route path="audit"          element={<AuditLog />} />
              <Route path="import-approval" element={<ImportApproval />} />
              <Route path="idcard/requests"     element={<CardRequests />} />
              <Route path="idcard/requests/:id" element={<CardRequestDetail />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>

      </Routes>
      </Suspense>
    </BrowserRouter>
    </LanguageProvider>
    </ErrorBoundary>
  );
}
