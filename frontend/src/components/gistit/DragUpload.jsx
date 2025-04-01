import React,{useCallback} from 'react';
import { useDropzone } from 'react-dropzone';
import upload from '../../assets/Group 24.svg';

export default function DragUpload({onFileUpload}) {
    const onDrop = useCallback((acceptedFiles) => {
        console.log("Uploaded files:", acceptedFiles);
        onFileUpload(acceptedFiles);
      }, [onFileUpload]);
    
      const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: "application/pdf", 
      });
    
      return (
        <div {...getRootProps()} className="upload_section">
          <input {...getInputProps()} />
          <div className="upload_icon">
            <img src={upload} alt="Upload Icon" width={94.55} height={85.44} />
          </div>
          <div className="text_section_upload">
            {isDragActive ? (
              <p>Drop the file here...</p>
            ) : (
              <>
                <p>Drag & Drop</p>
                <p>
                  or <b>Browse</b> PDF
                </p>
              </>
            )}
          </div>
        </div>
      );
}
