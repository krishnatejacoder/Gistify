// ChatbotPage.jsx (Create this new component)
import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import './ChatBot.css'; // Create this CSS file

const ChatbotPage = () => {
  const location = useLocation();
  const { summary, content } = location.state || {};
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);

  const handleSendMessage = () => {
    if (question.trim()) {
      const newUserMessage = { text: question, sender: 'user' };
      setMessages([...messages, newUserMessage]);
      setQuestion('');

      // Simulate receiving an AI response (replace with your actual API call)
      setTimeout(() => {
        const aiResponse = { text: `AI response to: "${question}" based on the summary.`, sender: 'ai' };
        setMessages([...messages, newUserMessage, aiResponse]);
      }, 1000);
    }
  };

  return (
    <div className="chatbot-container">
      <div className="summary-display">
        <h2>Summary</h2>
        <p>{summary || 'No summary available.'}</p>
      </div>
      <div className="chat-area">
        <div className="message-list">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.sender}`}>
              {msg.text}
            </div>
          ))}
        </div>
        <div className="input-area">
          <input
            type="text"
            placeholder="Ask a question..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button onClick={handleSendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
};

export default ChatbotPage;