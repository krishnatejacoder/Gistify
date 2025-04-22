import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Dashboard from './../Dashboard/Dashboard';
import mammoth from 'mammoth';
import Loading from '../../components/Loading/Loading';
import { notifyError } from '../../components/Toast/Toast';
import axios from 'axios';
import './GistIt.css';

export default function GistIt() {
  const location = useLocation();
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fileProcessed, setFileProcessed] = useState(false);
  const [summary, setSummary] = useState('');
  const [addis, setAddis] = useState({});

  useEffect(() => {
    const processContent = async () => {
      try {
        setIsLoading(true);
        setContent(null);
        setFileProcessed(false);
        setSummary('');

        const { gistData } = location.state || {};
        console.log('GistIt:', gistData);

        if (!gistData) {
          setIsLoading(false);
          return;
        }

        if (gistData.sourceType === 'file' || gistData.sourceType === 'application/pdf') {
          const file = gistData.file;
          console.log('File gistData:', gistData);

          if (!file && (!gistData.locationFrom || gistData.locationFrom !== 'recentSummary')) {
            notifyError('No file selected');
            setIsLoading(false);
            return;
          }

          if (gistData.fileURL && (!file || file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
            setContent({ type: 'pdf', data: gistData.fileURL, name: gistData.originalFileName || 'Document' });
            setFileProcessed(true);
            setIsLoading(false);
            setSummary(gistData.content);
            setAddis({ advantages: gistData.advantages, disadvantages: gistData.disadvantages });
          } else if (
            file &&
            (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
              file.type === 'application/msword' ||
              file.name.toLowerCase().endsWith('.docx') ||
              file.name.toLowerCase().endsWith('.doc'))
          ) {
            try {
              const arrayBuffer = await file.arrayBuffer();
              const result = await mammoth.convertToHtml({
                arrayBuffer,
                options: {
                  convertImage: mammoth.images.imgElement((image) =>
                    image.read('base64').then((imageBuffer) => ({
                      src: `data:${image.contentType};base64,${imageBuffer}`,
                    }))
                  ),
                },
              });
              setContent({ type: 'docx', data: result.value, name: file.name, format: 'html' });
              setFileProcessed(true);
              setIsLoading(false);
              setSummary(gistData.content);
              setAddis({ advantages: gistData.advantages, disadvantages: gistData.disadvantages });
            } catch (docxError) {
              console.error('Error processing DOCX:', docxError);
              notifyError('Failed to process DOCX file');
              setIsLoading(false);
            }
          } else {
            notifyError('Unsupported file type');
            setIsLoading(false);
          }
        } else if (gistData.sourceType === 'text/plain') {
          try {
            console.log('Fetching text for fileId:', gistData.fileId);
            console.log('Access Token:', localStorage.getItem('accessToken'));
            const response = await axios.get(`http://localhost:5000/files/fetch-text/${gistData.fileId}`, {
              headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
            });
            const textContent = response.data.text;
            if (!textContent) {
              notifyError('No text content retrieved');
              setIsLoading(false);
              return;
            }
            console.log('Setting text content:', textContent);
            setContent({ type: 'text', data: textContent, name: gistData.originalFileName || 'Text Input' });
            setFileProcessed(true);
            setIsLoading(false);
            setSummary(gistData.content);
            setAddis({ advantages: gistData.advantages, disadvantages: gistData.disadvantages });
          } catch (textError) {
            console.error('Error fetching text content:', textError.response?.data || textError);
            notifyError('Failed to fetch text content from file');
            setIsLoading(false);
          }
        } else {
          notifyError('Invalid content source');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error processing content:', error);
        notifyError(error.message || 'Failed to process content');
        setIsLoading(false);
      }
    };

    processContent();
  }, [location.state]);

  const goToChatbot = () => {
    console.log(location.state);
    navigate('/chatbot', { state: location.state });
  };

  if (isLoading) {
    return <Loading val="Processing your content" />;
  }

  if (!content) {
    return <Dashboard />;
  }

  return (
    <div className="gistitContainer">
      <div className="contentDisplay">
        {content?.type === 'pdf' && content?.data && (
          <div className="iframe-container">
            <iframe src={content.data} title={content.name} width="100%" height="100%" onError={() => notifyError('Failed to load PDF')}>
              <p>PDF failed to load. <a href={content.data} target="_blank" rel="noopener noreferrer">Click here to view</a>.</p>
            </iframe>
          </div>
        )}
        {content?.type === 'docx' && content?.format === 'html' && (
          <div className="docx-content">
            <h3>{content.name}</h3>
            <div dangerouslySetInnerHTML={{ __html: content.data }} className="docx-html-content" />
          </div>
        )}
        {content?.type === 'text' && (
          <div className="text-content">
            <p className="baloo-2-semiBold">{content.name}</p>
            <pre className="baloo-2-regular">{content.data}</pre>
          </div>
        )}
        {!fileProcessed && !isLoading && !content && <div>Failed to load file.</div>}
      </div>
      <div className="secondHalf">
        <div className="summary-section">
          <h2 className="baloo-2-semiBold">Summary ({location.state?.gistData?.summaryType || 'concise'})</h2>
          <div className="summary-content baloo-2-regular">
            <div className="summary">
              <p className="gistTitles">Summary</p>
              <p className="gistInfo">{summary}</p>
            </div>
            <div className="advant">
              <p className="gistTitles">Advantages</p>
              <p className="gistInfo">{addis.advantages}</p>
            </div>
            <div className="disadvant">
              <p className="gistTitles">Disadvantages</p>
              <p className="gistInfo">{addis.disadvantages}</p>
            </div>
          </div>
        </div>
        <button className="baloo-2-semiBold" onClick={goToChatbot}>
          Continue to Chat Bot
        </button>
      </div>
    </div>
  );
}