import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
    BrowserRouter as Router, 
    Routes,
    Route,
    useLocation,
    useNavigate,
} from 'react-router-dom';
import Dashboard from './components/dashboard/Dashboard.jsx';
import GistIt_Chatbot from './components/gistit/GistIt_Chatbot.jsx';
import GistIt from './components/gistit/GistIt.jsx';
import GistIt_Uploaded from './components/gistit/GistIt_Uploaded.jsx';



export default function App(){
    return (
        
        <Router>
            <AppContent />
        </Router>
    );
}