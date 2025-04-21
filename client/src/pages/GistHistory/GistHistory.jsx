import React, { useState, useEffect, useContext } from 'react';
import './GistHistory.css';
import { AuthContext } from '../../context/AuthContext/AuthContext';
import { useNavigate } from 'react-router-dom';
import Loading from '../../components/Loading/Loading';
import { notifyError } from '../../components/Toast/Toast';
import axios from 'axios'; // Import axios

export default function GistHistory() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGistHistory = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await axios.get('http://localhost:5000/api/gists/history', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });
        setHistory(response.data);
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching gist history:", err);
        setError("Failed to load gist history.");
        setIsLoading(false);
        notifyError("Failed to load gist history.");
      }
    };

    if (user) {
      fetchGistHistory();
    } else {
      setIsLoading(false);
      setError("User not authenticated.");
      notifyError("User not authenticated.");
    }
  }, [user]);

  const handleCardClick = (gist) => {
    navigate(`/gistit/${gist._id}`, { state: { gistData: gist, fromHistory: true } });
  };

  if (isLoading) {
    return <Loading val="Loading Gist History" />;
  }

  if (error) {
    return <div className="gist-history-container error baloo-2-medium">{error}</div>;
  }

  if (!user) {
    return <div className="gist-history-container baloo-2-medium">Please log in to view your gist history.</div>;
  }

  return (
    <div className="gist-history-container">
      <h1 className="page-title baloo-2-semiBold">Gist History</h1>
      <div className="history-cards">
        {history.map((item) => (
          <div key={item._id} className="history-card" onClick={() => handleCardClick(item)} style={{ cursor: 'pointer' }}>
            <div className="card-left">
              <h2 className="card-title baloo-2-medium">{item.title}</h2>
              <p className="card-created baloo-2-regular">Created On: {new Date(item.createdAt).toLocaleDateString()}</p>
              <p className="card-desc">{item.summary}</p>
            </div>
            <div className="card-right">
            </div>
          </div>
        ))}
      </div>
      {history.length === 0 && <p className="no-history baloo-2-regular">No gist history available yet.</p>}
    </div>
  );
}