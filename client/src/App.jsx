import { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";
import AuthProvider from "./context/AuthContext/AuthProvider.jsx";
import MainLayout from "./components/Layout/MainLayout.jsx";
import Dashboard from "./pages/Dashboard/Dashboard.jsx";


function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const hiddenNavPages = ["/signup", "/login"];

  const user = JSON.parse(localStorage.getItem("user") || "null");

  useEffect(() => {
    if (!user && !hiddenNavPages.includes(location.pathname)) {
      navigate("/login");
    }
  }, [user, location.pathname, navigate]);

  return (
    <AuthProvider>
      <div className="app">
        {user && !hiddenNavPages.includes(location.pathname) && <MainNavigation />}
        <MainLayout>
          <Routes>
            {user ? (
              <>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/gistit" element={<GistIt />} />
                <Route path="/search" element={<Search />} />
                <Route path="/forum" element={<Forum />} />
                <Route path="/smartlibrary" element={<SmartLibrary />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
              </>
            ) : (
              <>
                <Route path="/" element={<Login />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
              </>
            )}
          </Routes>
        </MainLayout>
      </div>
    </AuthProvider>
  );
}


export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}