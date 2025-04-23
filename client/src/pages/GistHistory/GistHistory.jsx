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

  const handleCardClick = async (gist) => {
    console.log("GIST")
    // console.log(gist)
    try {
      const response = await axios.get(`http://localhost:5000/api/gists/document/${gist._id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      console.log('Dashboard fetch recent summary click:', response.data);

      navigate('/gistit', {
        state: {
          gistData: {
            locationFrom: 'recentSummary',
            sourceType: response.data.sourceType,
            content: response.data.summary,
            originalFileName: response.data.fileName,
            summaryType: response.data.summaryType,
            fileName: response.data.fileName,
            fileURL: response.data.fileUrl,
            fileId: response.data.file_id, // Map file_id to fileId
            docId: response.data.chromaId,
            advantages: response.data.advantages,
            disadvantages: response.data.disadvantages,
          },
        },
      });
    } catch (error) {
      console.error('Error fetching recent summary:', error.response?.data || error);
      notifyError(error.response?.data?.error || 'Failed to load summary details.');
    }
    // navigate(`/gistit/${gist._id}`, { state: { gistData: gist, fromHistory: true } });
  };

  if (error) {
    return <div className="gist-history-container error baloo-2-medium">{error}</div>;
  }

  if (!user) {
    return <div className="gist-history-container baloo-2-medium">Please log in to view your gist history.</div>;
  }

  return (
    <div className="gist-history-container">
      {isLoading ? (<Loading val="Fetching Gist History" />) : (
        <div className="history-cards">
        {history.map((item) => (
          <div key={item._id} className="history-card" onClick={() => handleCardClick(item)} style={{ cursor: 'pointer' }}>
            <div className="card-left">
              <h2 className="card-title baloo-2-medium">{item.title}</h2>
              <div className="dateCount">
                <div className="sepLine"></div>
                <div className="dateContainer">
                  <div className="date">
                    <p className="card-created baloo-2-medium">Last Visited:</p>
                    <p className='baloo-2-regular'>{new Date(item.lastVisited).toLocaleDateString()}</p>
                  </div>
                  <div className="date">
                    <p className="card-created baloo-2-medium">Created On:</p>
                    <p className='baloo-2-regular'>{new Date(item.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="card-right">
            </div>
          </div>
        ))}
      </div>
      )}
      
      {!isLoading && history.length === 0 && <p className="no-history baloo-2-regular">No gist history available yet.</p>}
    </div>
  );
}