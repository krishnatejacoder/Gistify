import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { useContext, useState, useRef, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext/AuthContext';
import uploadArea from '../../assets/uploadArea.svg';
import uploadCloud from '../../assets/uploadCloud.svg';
import PDF from '../../assets/PDF.svg';
import cross from '../../assets/icons/cross/dark.svg';
import { notifyError, notifyInfo, notifySuccess, notifyWarn } from '../../components/Toast/Toast';
import axios from 'axios';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [isUploaded, setIsUploaded] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [text, setText] = useState('');
  const fileInputRef = useRef(null);
  const [selectedUploadOption, setSelectedUploadOption] = useState(0);
  const [selectedSummaryOption, setSelectedSummaryOption] = useState(0);
  const [recentSummaries, setRecentSummaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadedFileFadeIn, setUploadedFileFadeIn] = useState(false);

  const uploadOptions = ['PDF / Docx', 'Text'];
  const summaryOptions = ['Concise', 'Analytical', 'Comprehensive'];

  useEffect(() => {
    let isMounted = true;

    const fetchRecentSummaries = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/gists/recent', {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        });
        if (isMounted) setRecentSummaries(response.data);
      } catch (err) {
        console.error('Error fetching recent summaries:', err);
        notifyError('Failed to load recent summaries.');
      }
    };

    if (user) fetchRecentSummaries();
    return () => { isMounted = false; };
  }, [user]);

  if (!user) return null;

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files?.length > 0) handleFile(e.dataTransfer.files[0]);
  };

  const handleFile = (file) => {
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];
    const validExtensions = ['.pdf', '.docx'];
    const fileName = file.name.toLowerCase();
    const isValid = validTypes.includes(file.type) || validExtensions.some(ext => fileName.endsWith(ext));

    if (isValid) {
      setUploadedFile(file);
      setUploadedFileFadeIn(true);
      setIsUploaded(true);
    } else {
      notifyError('Please upload a valid PDF or DOCX file');
      setIsUploaded(false);
      setUploadedFile(null);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files?.length > 0) handleFile(e.target.files[0]);
  };

  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleRemoveFile = () => {
    setUploadedFileFadeIn(false);
    setTimeout(() => {
      setIsUploaded(false);
      setUploadedFile(null);
    }, 300);
  };

  const handleGistItClick = async () => {
    if (loading) return;

    setLoading(true);

    try {
      if (selectedUploadOption === 0 && uploadedFile) {
        const formData = new FormData();
        formData.append('file', uploadedFile);
        formData.append('userId', JSON.parse(localStorage.getItem('userGistify')).userId);
        formData.append('selectedUploadOption', selectedUploadOption);

        // Upload to Cloudinary
        const uploadResponse = await axios.post('http://localhost:5000/files/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });

        console.log('Upload Response:', uploadResponse.data);

        const filePath = uploadResponse.data?.file?.filePath;
        const docId = uploadResponse.data.file.id;
        if (!filePath) throw new Error('No file path returned from server');

        // Summarize via Flask
        const summarizeFormData = new FormData();
        summarizeFormData.append('file_path', filePath);
        summarizeFormData.append('doc_id', docId);
        summarizeFormData.append('summary_type', summaryOptions[selectedSummaryOption].toLowerCase());
        summarizeFormData.append('file_name', uploadedFile.name);
        summarizeFormData.append('userId', JSON.parse(localStorage.getItem('userGistify')).userId);

        const flaskResponse = await axios.post('http://localhost:5001/summarize', summarizeFormData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });

        console.log('Summarize Response:', flaskResponse.data);

        const { summary, advantages, disadvantages } = flaskResponse.data;
        const chromaId = flaskResponse.data.chromaId;

        navigate('/gistit', {
          state: {
            gistData: {
              sourceType: 'file',
              content: summary,
              originalFileName: uploadedFile.name,
              summaryType: summaryOptions[selectedSummaryOption].toLowerCase(),
              file: uploadedFile,
              fileURL: flaskResponse.data.fileUrl,
              docId: chromaId,
              advantages,
              disadvantages,
            },
          },
        });
      } else if (selectedUploadOption === 1 && text.trim()) {
        const formData = new FormData();
        const timestamp = Date.now();
        const fileName = `text-${timestamp}.txt`;
        formData.append('title', fileName);
        formData.append('userId', JSON.parse(localStorage.getItem('userGistify')).userId);
        formData.append('selectedUploadOption', selectedUploadOption);
        formData.append('text', text.trim());

        // Upload text to Cloudinary
        const uploadResponse = await axios.post('http://localhost:5000/files/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });

        console.log('Text Upload Response:', uploadResponse.data);

        const filePath = uploadResponse.data?.file?.filePath;
        const docId = uploadResponse.data.file.id;
        if (!filePath) throw new Error('No file path returned from server');

        // Summarize via Flask
        const summarizeFormData = new FormData();
        summarizeFormData.append('file_path', filePath);
        summarizeFormData.append('doc_id', docId);
        summarizeFormData.append('summary_type', summaryOptions[selectedSummaryOption].toLowerCase());
        summarizeFormData.append('file_name', fileName);
        summarizeFormData.append('userId', JSON.parse(localStorage.getItem('userGistify')).userId);

        const flaskResponse = await axios.post('http://localhost:5001/summarize', summarizeFormData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });

        console.log('Text Summarize Response:', flaskResponse.data);

        const { summary, advantages, disadvantages } = flaskResponse.data;
        const chromaId = flaskResponse.data.chromaId;

        navigate('/gistit', {
          state: {
            gistData: {
              sourceType: 'text',
              content: summary,
              originalFileName: fileName,
              summaryType: summaryOptions[selectedSummaryOption].toLowerCase(),
              file: null,
              fileURL: flaskResponse.data.fileUrl,
              docId: chromaId,
              advantages,
              disadvantages,
            },
          },
        });
      } else {
        notifyWarn('Please select a file or enter text before proceeding.');
      }
    } catch (err) {
      console.error('Summarization error:', err.response?.data || err);
      notifyError(err.response?.data?.error || 'An error occurred while processing your request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='dashboardContainer'>
      <form onSubmit={(e) => {
        e.preventDefault();
        handleGistItClick();
      }}>
        {/* RECENT SUMMARIES SECTION */}
        <div className="recentSummaries">
          <p className='title piazzolla-bold'>Recent Summaries</p>
          <div className="summaries">
            {recentSummaries.length > 0 ? (
              recentSummaries.map((summary, index) => (
                <div key={index} className='summary'>
                  <div className="titleCard">
                    <p className="titlePaper baloo-2-medium">{summary.title}</p>
                    <p className="titleDate baloo-2-regular">
                      {new Date(summary.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="desc baloo-2-regular">{summary.truncatedSummary}</p>
                </div>
              ))
            ) : (
              <p className="noSummary baloo-2-regular">No summaries yet. Try uploading something!</p>
            )}
          </div>
          <button 
            type="button" 
            className='viewMore baloo-2-semiBold' 
            onClick={() => navigate('/gisthistory')}
          >
            View More
          </button>
        </div>

        {/* MAIN GIST AREA */}
        <div className="gistArea">
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

            {/* FILE UPLOAD OR TEXT INPUT */}
            {selectedUploadOption === 0 ? (
              <div className="uploadContent">
                <div
                  className="uploadArea"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  tabIndex="0"
                >
                  <img draggable="false" src={uploadArea} alt="uploadArea" />
                  <img draggable="false" className='uploadCloud' src={uploadCloud} alt="cloud" />

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
                      <p className='baloo-2-medium' style={{ color: "rgba(0,0,0,0.77)" }}>PDF / Docx</p>
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

                  <div className={`uploadedFile ${uploadedFileFadeIn ? "active" : ""}`}>
                    {isUploaded && (
                      <>
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
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className='textContent'>
                <textarea 
                  value={text} 
                  onChange={(e) => setText(e.target.value)} 
                  placeholder='Paste or write your content here...'
                  className='baloo-2-regular'
                />
              </div>
            )}
          </div>

          {/* OPTIONS AND SUBMIT BUTTON */}
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
                    type="button"
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
                    type="button"
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
            <button 
              type='submit' 
              disabled={(!uploadedFileFadeIn && !text.trim()) || loading} 
              className='gistIt baloo-2-semiBold'
            >
              {loading ? 'Processing...' : 'Gist IT!'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}