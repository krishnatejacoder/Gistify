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
import LoginSignup from "./pages/LoginSignup/LoginSignup.jsx";
import NotFound from './pages/Not Found/NotFound.jsx';
import MainNavigation from './components/navbar/MainNavigation.jsx'
import Toast from "./components/Toast/Toast.jsx";
import 'react-toastify/dist/ReactToastify.css';
import './App.css'
import ChatbotPage from "./pages/GistIt/ChatBot.jsx";


function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const hiddenNavPages = ["/signup", "/login"];

  const storedUser = localStorage.getItem("userGistify");
  let user = null;

  if (storedUser && storedUser !== "undefined") {
    try {
      user = JSON.parse(storedUser);
    } catch (error) {
      console.error("Error parsing user from localStorage:", error);
      // Handle the error, perhaps by clearing the invalid localStorage item
      localStorage.removeItem("userGistify");
    }
  }

  useEffect(() => {
    if (!user && !hiddenNavPages.includes(location.pathname)) {
      navigate("/login");
    }
  }, [user, location.pathname, navigate]);

  return (
    <AuthProvider>
      <div className="app">
        {user && !hiddenNavPages.includes(location.pathname) && <MainNavigation />}
        <Toast />
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
                <Route path="/login" element={<LoginSignup />} />
                <Route path="/signup" element={<LoginSignup />} />
                <Route path="/chatbot" element={<ChatbotPage />} />
                <Route path="*" element={<NotFound />} />
              </>
            ) : (
              <>
                <Route path="/" element={<LoginSignup />} />
                <Route path="/login" element={<LoginSignup />} />
                <Route path="/signup" element={<LoginSignup />} />
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