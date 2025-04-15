import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { useContext, useState, useRef, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext/AuthContext';
import uploadArea from '../../assets/uploadArea.svg';
import uploadCloud from '../../assets/uploadCloud.svg';
import PDF from '../../assets/PDF.svg';
import cross from '../../assets/icons/cross/dark.svg';
import { notifyError, notifyInfo, notifySuccess, notifyWarn } from '../../components/Toast/Toast';
import axios from 'axios'; // Import axios

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [isUploaded, setIsUploaded] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [text, setText] = useState("");
  const fileInputRef = useRef(null);
  const [selectedUploadOption, setSelectedUploadOption] = useState(0);
  const [selectedSummaryOption, setSelectedSummaryOption] = useState(0);
  const [recentSummaries, setRecentSummaries] = useState([]);

  const uploadOptions = ["PDF / Docx", "Text"];
  const summaryOptions = ["Concise", "Analytical", "Comprehensive"];

  useEffect(() => {
    const fetchRecentSummaries = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/gists/recent', { // <-- Corrected URL
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });
        setRecentSummaries(response.data);
      } catch (error) {
        console.error("Error fetching recent summaries:", error);
        notifyError("Failed to load recent summaries.");
      }
    };

    if (user) {
      fetchRecentSummaries();
    }
  }, [user]);

  if (!user) {
    return (<div></div>);
  }

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFile(file);
    }
  };

  const handleFile = (file) => {
    if (!file) {
      setIsUploaded(false);
      setUploadedFile(null);
      return;
    }

    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];

    const validExtensions = ['.pdf', '.docx'];
    const fileName = file.name.toLowerCase();

    const isValidType = validTypes.includes(file.type) || validExtensions.some(ext => fileName.endsWith(ext));

    if (isValidType) {
      setUploadedFile(file);
      setIsUploaded(true);
    } else {
      notifyError("Please upload a PDF or DOCX file");
      setIsUploaded(false);
      setUploadedFile(null);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setIsUploaded(false);
  };

  const handleGistItClick = async () => {
    if (selectedUploadOption === 0 && uploadedFile) {
      const formData = new FormData();
      formData.append('file', uploadedFile);

      try {
        const uploadResponse = await axios.post('http://localhost:5000/files/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });

        console.log(uploadResponse);

        if (uploadResponse.data && uploadResponse.data.file && uploadResponse.data.file.filePath) {
          const flaskResponse = await axios.post('http://localhost:5001/summarize', {
            file_path: uploadResponse.data.file.filePath, // Send the filePath (Cloudinary URL)
            summary_type: summaryOptions[selectedSummaryOption].toLowerCase(),
            file_name: uploadedFile.name, // You can still send the filename
          });

          if (flaskResponse.data) {
            navigate('/gistit', {
              state: {
                gistData: {
                  sourceType: 'file',
                  content: flaskResponse.data.summary,
                  originalFileName: uploadedFile.name,
                  summaryType: summaryOptions[selectedSummaryOption].toLowerCase(),
                  advantages: flaskResponse.data.advantages,
                  disadvantages: flaskResponse.data.disadvantages,
                },
              },
            });
          } else {
            notifyError("Failed to get summary from the server.");
          }
        } else {
          notifyError("File upload failed to provide file information.");
        }
      } catch (error) {
        console.error("Error during file upload or summarization:", error);
        notifyError("Failed to process the file.");
      }
    } else if (selectedUploadOption === 1 && text) {
      // ... (Text summarization logic remains the same for now, but you might
      // want to integrate it with ChromaDB as well for consistency)
      try {
        const tempDocId = `text-${Date.now()}`;
        // Assuming you still want to add text to ChromaDB for summarization
        collection.add(ids=[tempDocId], documents=[text], metadatas=[{"source": "text-input"}]);
        const flaskResponse = await axios.post('http://localhost:5001/summarize', {
          doc_id: tempDocId, // Keep this for text input
          summary_type: summaryOptions[selectedSummaryOption].toLowerCase(),
          file_name: 'text-input.txt',
        });

        if (flaskResponse.data) {
          navigate('/gistit', {
            state: {
              gistData: {
                sourceType: 'text',
                content: flaskResponse.data.summary,
                originalFileName: 'text-input.txt',
                summaryType: summaryOptions[selectedSummaryOption].toLowerCase(),
                advantages: flaskResponse.data.advantages,
                disadvantages: flaskResponse.data.disadvantages,
              },
            },
          });
        } else {
          notifyError("Failed to get summary from the server.");
        }
      } catch (error) {
        console.error("Error during text summarization:", error);
        notifyError("Failed to process the text.");
      }
    } else {
      notifyWarn("Please select a file or enter text before proceeding.");
    }
  };

  return (
    <div className='dashboardContainer'>
      <div className="recentSummaries">
        <p className='title piazzolla-bold'>Recent Summaries</p>
        <div className="summaries">
          {recentSummaries.map((summary, index) => (
            <div key={index} className='summary'>
              <div className="titleCard">
                <p className="titlePaper baloo-2-medium">{summary.title}</p>
                <p className="titleDate baloo-2-regular">{new Date(summary.createdAt).toLocaleDateString()}</p>
              </div>
              <p className="desc baloo-2-regular">{summary.summary}</p>
            </div>
          ))}
        </div>
        <button className='viewMore baloo-2-semiBold' onClick={() => navigate("/gisthistory")}>View More</button>
      </div>
      <div className="gistArea">
        {/* ... (rest of your UI - intro, upload area, text area, options) */}
        <div className="leftC">
          <div className="intro">
            <p className="welcome baloo-2-semiBold">Welcome Back {user.username}!</p>
            <div className="secondaryIntro">
              <div className='welcomeQuestion'>
                <p className="baloo-2-regular" style={{ color: "rgba(67, 64, 64, 0.83)" }}>What would you like to </p>
                <p className="baloo-2-semiBold" style={{ color: "#6E00B3" }}>Gistify </p>
                <p className="baloo-2-regular" style={{ color: "rgba(67, 64, 64, 0.83)" }}>today?</p>
              </div>
              <p className="welcomeHelp baloo-2-regular">Upload a PDF or Docx, paste text</p>
            </div>
          </div>
          {selectedUploadOption === 0 ? (
            <div className="uploadContent">
              <div
                className="uploadArea"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                tabIndex="0"
              >
                <img src={uploadArea} alt="uploadArea" />
                <img className='uploadCloud' src={uploadCloud} alt="cloud" />

                <div className="text">
                  <p className='baloo-2-medium' style={{ color: "rgba(0,0,0,0.77)" }}>Drag & Drop</p>
                  <div>
                    <p className='baloo-2-medium' style={{ color: "rgba(0,0,0,0.77)" }}>or</p>
                    <p
                      className='baloo-2-bold'
                      style={{ color: "#6E00B3", cursor: "pointer" }}
                      onClick={handleBrowseClick}
                    >
                      Browse
                    </p>
                    <p className='baloo-2-medium' style={{ color: "rgba(0,0,0,0.77)" }}>PDF</p>
                  </div>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".pdf,.docx"
                  onChange={handleFileSelect}
                  key={uploadedFile ? "file-input-1" : "file-input-0"}
                />

                {isUploaded && (
                  <div className="uploadedFile">
                    <div className="primary">
                      <img className="PDF" src={PDF} alt="pdf" />
                      <p className='baloo-2-medium' style={{ color: "black", fontSize: "15px" }}>{uploadedFile.name}</p>
                    </div>
                    <img
                      className='cross'
                      src={cross}
                      alt="cross"
                      onClick={handleRemoveFile}
                      style={{ cursor: "pointer" }}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className='textContent'>
              <textarea value={text} onChange={(e) => setText(e.target.value)} name="text" id="text" className='baloo-2-regular'></textarea>
            </div>
          )}
        </div>
        <div className="rightC">
          <div className="opt">
            <div className="uploadOptions options">
              <div
                className="activeContainer"
                style={{
                  top: `${8 + selectedUploadOption * 36.5}px`,
                  transition: 'top 0.3s ease'
                }}
              ></div>
              {uploadOptions.map((val, id) => (
                <button
                  className='option baloo-2-semiBold'
                  key={id}
                  onClick={() => setSelectedUploadOption(id)}
                  style={{
                    color: selectedUploadOption === id ? "black" : "white",
                    zIndex: 1
                  }}
                >
                  {val}
                </button>
              ))}
            </div>
            <div className="summaryOptions options">
              <div
                className="activeContainer"
                style={{
                  top: `${8 + selectedSummaryOption * 36.5}px`,
                  transition: 'top 0.3s ease'
                }}
              ></div>
              {summaryOptions.map((val, id) => (
                <button
                  className='option baloo-2-semiBold'
                  key={id}
                  onClick={() => setSelectedSummaryOption(id)}
                  style={{
                    color: selectedSummaryOption === id ? "black" : "white",
                    zIndex: 1
                  }}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
          <button disabled={!isUploaded && !text} className='gistIt baloo-2-semiBold' onClick={handleGistItClick}>Gist IT!</button>
        </div>
      </div>
    </div>
  );
}