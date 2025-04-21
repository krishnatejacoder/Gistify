import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Dashboard from './../Dashboard/Dashboard'; // Import the Dashboard component
import mammoth from 'mammoth';
import Loading from '../../components/Loading/Loading';
import { notifyError } from '../../components/Toast/Toast';
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

        if (!gistData) {
          setIsLoading(false);
          return; // Early return to render Dashboard
        }

        if (gistData.sourceType === 'file') {
          const file = gistData.file;
          console.log(gistData)

          if (!file) {
            notifyError('No file selected');
            setIsLoading(false);
            return;
          }

          if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            const url = URL.createObjectURL(file);
            setContent({ type: 'pdf', data: url, name: file.name });
            setFileProcessed(true);
            setIsLoading(false);
            setSummary(gistData.content);
            setAddis({advantages: gistData.advantages, disadvantages: gistData.disadvantages});
          } else if (
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.type === 'application/msword' ||
            file.name.toLowerCase().endsWith('.docx') ||
            file.name.toLowerCase().endsWith('.doc')
          ) {
            try {
              const arrayBuffer = await file.arrayBuffer();
              const result = await mammoth.convertToHtml({
                arrayBuffer,
                options: {
                  convertImage: mammoth.images.imgElement(function(image) {
                    return image.read("base64").then(function(imageBuffer) {
                      return {
                        src: "data:" + image.contentType + ";base64," + imageBuffer
                      };
                    });
                  })
                }
              });
              setContent({ type: 'docx', data: result.value, name: file.name, format: 'html' });
              setFileProcessed(true);
              setIsLoading(false);
              setSummary("Summary will appear here based on the concise option selected.");
              setAddis({advantages:"rn in dev, take a pill chill", disadvantages: "rn in dev, dude take a Chai break!"})
            } catch (docxError) {
              console.error('Error processing DOCX:', docxError);
              notifyError('Failed to process DOCX file');
              setIsLoading(false);
            }
          } else {
            notifyError('Unsupported file type');
            setIsLoading(false);
          }
        } else if (gistData.sourceType === 'text') {
          if (!gistData.content) {
            notifyError('No text content provided');
            setIsLoading(false);
            return;
          }
          setContent({ type: 'text', data: gistData.content, name: 'Text Input' });
          setFileProcessed(true);
          setIsLoading(false);
          setSummary("Summary will appear here based on the concise option selected.");
          setAddis({advantages:"rn in dev, take a pill chill", disadvantages: "rn in dev, dude take a Chai break!"})
        } else {
          notifyError('Invalid content source');
          setIsLoading(false);
        }

        // if (gistData && gistData.summaryType) {
        //   setSummary("The actual summary based on '" + gistData.summaryType + "' will be fetched here.");
        // }
      } catch (error) {
        console.error('Error processing content:', error);
        notifyError(error.message || 'Failed to process content');
        setIsLoading(false);
      }
    };

    processContent();

    return () => {
      if (content?.type === 'pdf' && content?.data) {
        URL.revokeObjectURL(content.data);
      }
    };
  }, [location.state]);

  const goToChatbot = () => {
    console.log(location.state)
    navigate('/chatbot', { state: location.state  });
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
            <iframe src={content.data} title={content.name} width="100%" height="100%" />
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
            <h3>{content.name}</h3>
            <pre>{content.data}</pre>
          </div>
        )}
        {!fileProcessed && !isLoading && !content && (
          <div>Failed to load file.</div>
        )}
      </div>
      {/* <button className='baloo-2-semiBold back' onClick={goToChatbot}>Continue to Chat Bot</button> */}
      <div className='secondHalf'>
        <div className="summary-section">
          <h2 className='baloo-2-semiBold'>Summary ({location.state?.gistData?.summaryType || 'concise'})</h2>
          <div className="summary-content baloo-2-regular">
            <div className="summary">
              <p className='gistTitles'>Summary</p>
              <p className='gistInfo'>{summary}</p>
            </div>
            <div className="advant">
              <p className='gistTitles'>Advantages</p>
              <p className='gistInfo'>{addis.advantages}</p>
            </div>
            <div className="disadvant">
              <p className='gistTitles'>Disadvantages</p>
              <p className='gistInfo'>{addis.disadvantages}</p>
            </div>
          </div>
        </div>
        <button className='baloo-2-semiBold' onClick={goToChatbot}>Continue to Chat Bot</button>
      </div>
    </div>
  );
}