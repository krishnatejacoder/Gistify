// // ChatbotPage.jsx (Create this new component)
// import React, { useState } from 'react';
// import { useLocation, useNavigate } from 'react-router-dom';
// import './ChatBot.css'; // Create this CSS file

// const ChatbotPage = () => {
//   const location = useLocation();
//   const { summary, content } = location.state || {};
//   const [question, setQuestion] = useState('');
//   const [messages, setMessages] = useState([]);
//   const navigate = useNavigate();

//   const handleSendMessage = () => {
//     if (question.trim()) {
//       const newUserMessage = { text: question, sender: 'user' };
//       setMessages([...messages, newUserMessage]);
//       setQuestion('');

//       // Simulate receiving an AI response (replace with your actual API call)
//       setTimeout(() => {
//         const aiResponse = { text: `AI response to: "${question}" based on the summary.`, sender: 'ai' };
//         setMessages([...messages, newUserMessage, aiResponse]);
//       }, 1000);
//     }
//   };

  
//   return (
//     <div className="chatbot-container">
//       <button className='baloo-2-semiBold back' onClick={handleGoBack}>Back</button>
//       <div className="summary-display">
//         <h2>Summary</h2>
//         <p>{summary || 'No summary available.'}</p>
//       </div>
//       <div className="chat-area">
//         <div className="message-list">
//           {messages.map((msg, index) => (
//             <div key={index} className={`message ${msg.sender}`}>
//               {msg.text}
//             </div>
//           ))}
//         </div>
//         <div className="input-area">
//           <input
//             type="text"
//             placeholder="Ask a question..."
//             value={question}
//             onChange={(e) => setQuestion(e.target.value)}
//           />
//           <button onClick={handleSendMessage}>Send</button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ChatbotPage;


// ChatbotPage.jsx
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './ChatBot.css';

const ChatbotPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { summary, content } = location.state.gistData || {};
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [isAsking, setIsAsking] = useState(false); // To disable input while waiting for response

  const handleSendMessage = async () => {
    if (question.trim() && content?.data) {
      setIsAsking(true);
      const newUserMessage = { text: question, sender: 'user' };
      setMessages([...messages, newUserMessage]);
      setQuestion('');

      try {
        const response = await fetch('http://localhost:5001/ask', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question: question,
            doc_id: content.type === 'text' ? `text-${Date.now()}` : content.name, // Or a more stable ID if available
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error from Flask /ask:', errorData);
          const aiErrorMessage = errorData?.error || 'Failed to get AI response.';
          const aiResponseMessage = { text: aiErrorMessage, sender: 'ai', isError: true };
          setMessages([...messages, newUserMessage, aiResponseMessage]);
        } else {
          const data = await response.json();
          const aiResponseMessage = { text: data.answer, sender: 'ai' };
          setMessages([...messages, newUserMessage, aiResponseMessage]);
        }
      } catch (error) {
        console.error('Error sending question to Flask:', error);
        const aiErrorMessage = 'Failed to communicate with the AI.';
        const aiResponseMessage = { text: aiErrorMessage, sender: 'ai', isError: true };
        setMessages([...messages, newUserMessage, aiResponseMessage]);
      } finally {
        setIsAsking(false);
      }
    } else if (!content?.data) {
      alert('No content available to ask questions about.');
    }
  };

  const handleGoBack = () => {
    navigate(-1); // Go back to the previous page in history
  };

  return (
    <div className="chatbot-container">
      <button className="back baloo-2-semiBold" onClick={handleGoBack}>
        Back
      </button>
      <div className="summary-display">
        <h2>Summary</h2>
        <p>{summary || 'No summary available.'}</p>
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