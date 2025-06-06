import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Dashboard from './../Dashboard/Dashboard';
import mammoth from 'mammoth';
import Loading from '../../components/loading/Loading';
import { notifyError } from '../../components/Toast/Toast';
import axios from 'axios';
import dayjs from 'dayjs';
import './GistIt.css';
import GistItNoFile from './GistItNoFile';

export default function GistIt() {
  const location = useLocation();
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fileProcessed, setFileProcessed] = useState(false);
  const [summary, setSummary] = useState('');
  const [addis, setAddis] = useState({});
  const [gistData, setGistData] = useState({});

  const capitalizeFirstLetter = (val) => {
    val = val.slice(8)
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
  }

  useEffect(() => {
    const processContent = async () => {
      try {
        setIsLoading(true);
        setContent(null);
        setFileProcessed(false);
        setSummary('');

        const { gistData } = location.state || {};
        setGistData(gistData)
        // console.log('GistIt:', gistData);

        if (!gistData) {
          setIsLoading(false);
          return;
        }

        if (gistData.sourceType === 'file' || gistData.sourceType === 'application/pdf') {
          const file = gistData.file;
          // console.log('File gistData:', gistData);

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
            // console.log("Advantages", JSON.parse(gistData.advantages))
            setAddis({ advantages: JSON.parse(gistData.advantages), disadvantages: JSON.parse(gistData.disadvantages) });
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
              setAddis({ advantages: JSON.parse(gistData.advantages), disadvantages: JSON.parse(gistData.disadvantages) });
            } catch (docxError) {
              console.error('Error processing DOCX:', docxError);
              notifyError('Failed to process DOCX file');
              setIsLoading(false);
            }
          } else {
            notifyError('Unsupported file type');
            setIsLoading(false);
          }
        } 
        else if (gistData.sourceType === 'text/plain') {
          try {
            // console.log('Fetching text for fileId:', gistData.fileId);
            // console.log('Access Token:', localStorage.getItem('accessToken'));
            const response = await axios.get(`http://localhost:5000/files/fetch-text/${gistData.fileId}`, {
              headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
            });
            const textContent = response.data.text;
            if (!textContent) {
              notifyError('No text content retrieved');
              setIsLoading(false);
              return;
            }
            // console.log('Setting text content:', textContent);
            setContent({ type: 'text', data: textContent, name: gistData.originalFileName || 'Text Content'});
            setFileProcessed(true);
            setIsLoading(false);
            setSummary(gistData.content);
            // console.log()
            setAddis({ advantages: JSON.parse(gistData.advantages), disadvantages: JSON.parse(gistData.disadvantages) });
          } 
          catch (textError) {
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
    // console.log(location.state);
    navigate('/chatbot', { state: location.state });
  };

  if (isLoading) {
    return <Loading className='gistitContainer' val="Processing your content" />;
  }

  if (!content) {
    return <GistItNoFile />;
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
        {/* { && !isLoading && !content && <div>Failed to load file.</div>} */}
      </div>
      <div className="secondHalf">
        <div className="metaData">
          <p className='baloo-2-semiBold'>Gist</p>
          <div className="sepLine"></div>
          <p className='baloo-2-regular text'>{capitalizeFirstLetter(gistData.summaryType)}</p>
          <div className="sepLine"></div>
          <p className='baloo-2-regular text'>{dayjs(gistData.date).format('MMM D, YYYY')}</p>
        </div>
        <div className="summary-section">
          <div className="summary-content baloo-2-regular">
            <div className="summary">
              <p className="gistTitles">Summary</p>
              <p className="gistInfo">{summary}</p>
            </div>
            <div className="advant">
              <p className="gistTitles">Advantages</p>
              {addis.advantages.map((val, ind) => {
                return <p className="gistInfo" key={ind}>{val}</p>
              })}
            </div>
            <div className="disadvant">
              <p className="gistTitles">Disadvantages</p>
              {addis.disadvantages.map((val, ind) => {
                return <p className="gistInfo" key={ind}>{val}</p>
              })}
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