// GistHistory.jsx
import React, { useState, useEffect, useContext } from 'react';
import './GistHistory.css'; // Create this CSS file
import { AuthContext } from '../../context/AuthContext/AuthContext';
import { useNavigate } from 'react-router-dom';
import Loading from '../../components/Loading/Loading';
import { notifyError } from '../../components/Toast/Toast';

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
        // Simulate fetching history from your backend
        // Replace this with your actual API call
        const response = await new Promise((resolve) => {
          setTimeout(() => {
            resolve([
              {
                id: 1,
                title: "Reinstating ReLU Activation in LLM",
                author: "Paulo Finardi",
                lastVisited: "Mar 13, 2025",
                createdOn: "Mar 12, 2025",
                // ... other relevant data
              },
              {
                id: 2,
                title: "Understanding Transformer Networks",
                author: "Vaswani et al.",
                lastVisited: "Apr 10, 2025",
                createdOn: "Apr 05, 2025",
                // ... other relevant data
              },
              // ... more history items
            ]);
          }, 1500); // Simulate network delay
        });

        setHistory(response);
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

  if (isLoading) {
    return <Loading val="Loading Gist History" />;
  }

  if (error) {
    return <div className="gist-history-container error">{error}</div>;
  }

  if (!user) {
    return <div className="gist-history-container">Please log in to view your gist history.</div>;
  }

  return (
    <div className="gist-history-container">
      <h1 className="page-title baloo-2-semiBold">Gist History</h1>
      <div className="history-cards">
        {history.map((item) => (
          <div key={item.id} className="history-card">
            <div className="card-left">
              <h2 className="card-title baloo-2-medium">{item.title}</h2>
              {item.author && <p className="card-author baloo-2-regular">By {item.author}</p>}
            </div>
            <div className="card-right">
              <p className="card-visited baloo-2-regular">Last Visited: {item.lastVisited}</p>
              <p className="card-created baloo-2-regular">Created On: {item.createdOn}</p>
            </div>
          </div>
        ))}
      </div>
      {history.length === 0 && <p className="no-history baloo-2-regular">No gist history available yet.</p>}
    </div>
  );
}