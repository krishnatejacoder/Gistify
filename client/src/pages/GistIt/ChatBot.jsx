import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './ChatBot.css';

const ChatbotPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const gistData = location.state?.gistData || {};
  const { advantages: summary, content, sourceType, originalFileName, file } = gistData;
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [isAsking, setIsAsking] = useState(false);

  const handleSendMessage = async () => {
    console.log(gistData)
    if (!question.trim()) return; // Ignore empty questions
    if (!content) {
      setMessages([
        ...messages,
        {
          text: 'No content available to ask questions about. Please upload a file or select a gist first.',
          sender: 'ai',
          isError: true,
        },
      ]);
      return;
    }

    setIsAsking(true);
    const newUserMessage = { text: question, sender: 'user' };
    setMessages([...messages, newUserMessage]);
    setQuestion('');
    console.log("chatbot")
    console.log(gistData);

    try {
      // const docId = sourceType === 'file' ? originalFileName || file?.name : `text-${Date.now()}`;
      const response = await fetch('http://localhost:5001/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          doc_id: gistData.docId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('Error from Flask /ask:', data);
        const aiErrorMessage = data?.error || 'Failed to get AI response.';
        setMessages([...messages, newUserMessage, { text: aiErrorMessage, sender: 'ai', isError: true }]);
      } else {
        setMessages([...messages, newUserMessage, { text: data.answer, sender: 'ai' }]);
      }
    } catch (error) {
      console.error('Error sending question to Flask:', error);
      const aiErrorMessage = 'Failed to communicate with the AI.';
      setMessages([...messages, newUserMessage, { text: aiErrorMessage, sender: 'ai', isError: true }]);
    } finally {
      setIsAsking(false);
    }
  };

  const handleGoBack = () => {
    navigate('/gistit', { state: location.state });
  };

  return (
    <div className="chatbot-container">
      <button className="back baloo-2-semiBold" onClick={handleGoBack}>
        Back
      </button>
      <div className="summary-display">
        <div className="summary">
          <p className='baloo-2-medium gistTitles'>Summary</p>
          <p className='baloo-2-regular gistInfo'>{summary || 'No summary available.'}</p>
        </div>
        <div className="advant">
          <p className='baloo-2-medium gistTitles'>Advantages</p>
          <p className='baloo-2-regular gistInfo'>{gistData.advantages || 'No advantages available.'}</p>
        </div>
        <div className="disadvant">
          <p className='baloo-2-medium gistTitles'>Disadvantages</p>
          <p className='baloo-2-regular gistInfo'>{gistData.disadvantages || 'No disadvantages available.'}</p>
        </div>
      </div>
      <div className="chat-area">
        <div className="message-list">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.sender} ${msg.isError ? 'error' : ''}`}>
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
            disabled={isAsking}
          />
          <button onClick={handleSendMessage} disabled={isAsking}>
            {isAsking ? 'Asking...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatbotPage;