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
import Forum from './pages/Forum/Forum.jsx';
import GistHistory from './pages/GistHistory/GistHistory.jsx';
import GistIt from './pages/GistIt/GistIt.jsx';
import Search from './pages/Search/Search.jsx';
import SmartLibrary from './pages/SmartLibrary/SmartLibrary.jsx';
import Login from "./pages/Login/Login.jsx";
import Signup from './pages/Signup/Signup.jsx';
import NotFound from './pages/Not Found/NotFound.jsx';
import MainNavigation from './components/navbar/MainNavigation.jsx'
import './App.css'


function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const hiddenNavPages = ["/signup", "/login"];

  const user = JSON.parse(localStorage.getItem("userGistify") || null);

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
                <Route path="/forum" element={<Forum />} />
                <Route path="/gisthistory" element={<GistHistory />} />
                <Route path="/gistit" element={<GistIt />} />
                <Route path="/search" element={<Search />} />
                <Route path="/smartlibrary" element={<SmartLibrary />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="*" element={<NotFound />} />
              </>
            ) : (
              <>
                <Route path="/" element={<Login />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="*" element={<NotFound />} />
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