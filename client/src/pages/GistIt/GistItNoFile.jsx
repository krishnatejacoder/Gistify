import { useNavigate } from "react-router-dom";
import "./GistItNoFile.css";
import { useContext, useState, useRef, useEffect } from "react";
import { AuthContext } from "../../context/AuthContext/AuthContext";
import uploadArea from "../../assets/uploadArea.svg";
import uploadCloud from "../../assets/uploadCloud.svg";
import PDF from "../../assets/PDF.svg";
import cross from "../../assets/icons/cross/dark.svg";
import {
  notifyError,
  notifyInfo,
  notifySuccess,
  notifyWarn,
} from "../../components/Toast/Toast";
import axios from "axios";
import dayjs from "dayjs";
import Loading from "../../components/loading/Loading";

export default function GistItNoFile() {
  const navigate = useNavigate();
  const { user, uploading, uploadingUpdate } = useContext(AuthContext);
  const [isUploaded, setIsUploaded] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [text, setText] = useState("");
  const fileInputRef = useRef(null);
  const [selectedUploadOption, setSelectedUploadOption] = useState(0);
  const [selectedSummaryOption, setSelectedSummaryOption] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploadedFileFadeIn, setUploadedFileFadeIn] = useState(false);
  const dragRef = useRef(null);

  const uploadOptions = ["PDF", "Text"];
  const summaryOptions = ["Concise", "Analytical", "Comprehensive"];

  useEffect(() => {
    dragRef.current.addEventListener("dragenter", () => {
      dragRef.current.classList.add("dragOver");
    });

    dragRef.current.addEventListener("dragleave", (e) => {
      if (!dragRef.current.contains(e.relatedTarget)) {
        dragRef.current.classList.remove("dragOver");
      }
    });
  }, [dragRef]);

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
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    const validExtensions = [".pdf"];
    const fileName = file.name.toLowerCase();
    const isValid =
      validTypes.includes(file.type) ||
      validExtensions.some((ext) => fileName.endsWith(ext));

    if (isValid) {
      setUploadedFile(file);
      setUploadedFileFadeIn(true);
      setIsUploaded(true);
    } else {
      notifyError("Please upload a valid PDF file");
      setIsUploaded(false);
      setUploadedFile(null);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files?.length > 0) handleFile(e.target.files[0]);
  };

  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
    uploadingUpdate();

    try {
      if (selectedUploadOption === 0 && uploadedFile) {
        const formData = new FormData();
        formData.append("file", uploadedFile);
        formData.append(
          "userId",
          JSON.parse(localStorage.getItem("userGistify")).userId
        );
        formData.append("selectedUploadOption", selectedUploadOption);

        console.log(uploadedFile);

        // Upload to Cloudinary
        const uploadResponse = await axios.post(
          "http://localhost:5000/files/upload",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          }
        );

        console.log("Upload Response:", uploadResponse.data);

        const filePath = uploadResponse.data?.file?.filePath;
        const docId = uploadResponse.data.file.id;
        if (!filePath) throw new Error("No file path returned from server");

        const summarizeFormData = new FormData();
        summarizeFormData.append("file_path", filePath);
        summarizeFormData.append("doc_id", docId);
        summarizeFormData.append(
          "summary_type",
          summaryOptions[selectedSummaryOption].toLowerCase()
        );
        summarizeFormData.append("file_name", uploadedFile.name);
        summarizeFormData.append("selectedUploadOption", selectedUploadOption); // Add this

        const flaskResponse = await axios.post(
          "http://localhost:5000/api/gists/upload",
          summarizeFormData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          }
        );

        console.log("Summarize Response:", flaskResponse.data);

        const { summary, advantages, disadvantages } = flaskResponse.data;
        const chromaId = flaskResponse.data.chromaId;

        const gistData = {
          gistData: {
            sourceType: "file",
            content: summary,
            originalFileName: uploadedFile.name,
            summaryType:
              "summary_" + summaryOptions[selectedSummaryOption].toLowerCase(),
            file: uploadedFile,
            fileURL: flaskResponse.data.fileURL,
            docId: chromaId,
            advantages,
            disadvantages,
            date: flaskResponse.data.date,
          },
        };
        // console.log("Dashboard ")

        uploadingUpdate();

        navigate("/gistit", {
          state: gistData,
        });
      } else if (selectedUploadOption === 1 && text.trim()) {
        const formData = new FormData();
        const timestamp = Date.now();
        const fileName = `text-${timestamp}.txt`;
        formData.append("title", fileName);
        formData.append(
          "userId",
          JSON.parse(localStorage.getItem("userGistify")).userId
        );
        formData.append("selectedUploadOption", selectedUploadOption);
        formData.append("text", text.trim());

        // Upload text to Cloudinary
        const uploadResponse = await axios.post(
          "http://localhost:5000/files/upload",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          }
        );

        console.log("Text Upload Response:", uploadResponse.data);

        const filePath = uploadResponse.data?.file?.filePath;
        const docId = uploadResponse.data.file.id;
        if (!filePath) throw new Error("No file path returned from server");

        const summarizeFormData = new FormData();
        summarizeFormData.append("file_path", filePath);
        summarizeFormData.append("doc_id", docId);
        summarizeFormData.append(
          "summary_type",
          summaryOptions[selectedSummaryOption].toLowerCase()
        );
        summarizeFormData.append("file_name", fileName);
        summarizeFormData.append(
          "userId",
          JSON.parse(localStorage.getItem("userGistify")).userId
        );
        summarizeFormData.append("selectedUploadOption", selectedUploadOption); // Add this
        summarizeFormData.append("text", text.trim()); // Add text for summarization

        const flaskResponse = await axios.post(
          "http://localhost:5000/api/gists/upload",
          summarizeFormData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          }
        );

        console.log("Text Summarize Response:", flaskResponse.data);

        const { summary, advantages, disadvantages } = flaskResponse.data;
        const chromaId = flaskResponse.data.chromaId;

        const gistData = {
          gistData: {
            sourceType: "text/plain",
            content: summary,
            originalFileName: fileName,
            summaryType:
              "summary_" + summaryOptions[selectedSummaryOption].toLowerCase(),
            file: null,
            fileURL: flaskResponse.data.fileUrl,
            fileId: docId,
            docId: chromaId,
            advantages,
            disadvantages,
            date: flaskResponse.data.date,
          },
        };

        console.log("Dashboard gistData:\n", gistData);

        uploadingUpdate();

        navigate("/gistit", {
          state: gistData,
        });
      } else {
        notifyWarn("Please select a file or enter text before proceeding.");
      }
    } catch (err) {
      console.error("Summarization error:", err.response?.data || err);
      notifyError(
        err.response?.data?.error ||
          "An error occurred while processing your request."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gistItNoFileContainer">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleGistItClick();
        }}
      >
        {/* MAIN GIST AREA */}
        <div className="gistArea">
          <div className="leftC">
            <div className="intro">
              <p className="welcome baloo-2-semiBold">
                Welcome Back {user.username}!
              </p>
              <div className="secondaryIntro">
                <div className="welcomeQuestion">
                  <p
                    className="baloo-2-regular"
                    style={{ color: "rgba(67, 64, 64, 0.83)" }}
                  >
                    What would you like to{" "}
                  </p>
                  <p className="baloo-2-semiBold" style={{ color: "#6E00B3" }}>
                    Gistify{" "}
                  </p>
                  <p
                    className="baloo-2-regular"
                    style={{ color: "rgba(67, 64, 64, 0.83)" }}
                  >
                    today?
                  </p>
                </div>
                <p className="welcomeHelp baloo-2-regular">
                  Upload a PDF, paste text
                </p>
              </div>
            </div>

            {/* FILE UPLOAD OR TEXT INPUT */}
            {selectedUploadOption === 0 ? (
              <div className="uploadContent">
                <div
                  className={`uploadArea ${
                    loading || uploading ? "disabled" : ""
                  }`}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  tabIndex="0"
                  onClick={handleBrowseClick}
                  ref={dragRef}
                >
                  <img draggable="false" src={uploadArea} alt="uploadArea" />
                  <img
                    draggable="false"
                    className="uploadCloud"
                    src={uploadCloud}
                    alt="cloud"
                  />
                  <div className="text">
                    <p className="baloo-2-medium">Drag & Drop</p>
                    <div>
                      <p className="baloo-2-medium">or</p>
                      <p className="baloo-2-medium">Browse</p>
                      <p className="baloo-2-medium">PDF</p>
                    </div>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    accept=".pdf"
                    onChange={handleFileSelect}
                    key={uploadedFile ? "file-input-1" : "file-input-0"}
                  />
                </div>
                <div
                  className={`uploadedFile ${
                    uploadedFileFadeIn ? "active" : ""
                  }`}
                >
                  {isUploaded && (
                    <>
                      <div className="primary">
                        <img className="PDF" src={PDF} alt="pdf" />
                        <p
                          className="baloo-2-medium"
                          style={{ color: "black", fontSize: "15px" }}
                        >
                          {uploadedFile.name}
                        </p>
                      </div>
                      <img
                        className={`cross1 ${loading || uploading ? "disabled" : ""}`}
                        src={cross}
                        alt="cross"
                        onClick={handleRemoveFile}
                        style={{ cursor: "pointer" }}
                      />
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="textContent">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste or write your content here..."
                  className="baloo-2-regular"
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
                    transition: "top 0.3s ease",
                  }}
                ></div>
                {uploadOptions.map((val, id) => (
                  <button
                    type="button"
                    className="option baloo-2-semiBold"
                    key={id}
                    onClick={() => setSelectedUploadOption(id)}
                    style={{
                      color: selectedUploadOption === id ? "black" : "white",
                      zIndex: 1,
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
                    transition: "top 0.3s ease",
                  }}
                ></div>
                {summaryOptions.map((val, id) => (
                  <button
                    type="button"
                    className="option baloo-2-semiBold"
                    key={id}
                    onClick={() => setSelectedSummaryOption(id)}
                    style={{
                      color: selectedSummaryOption === id ? "black" : "white",
                      zIndex: 1,
                    }}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={(!uploadedFileFadeIn && !text.trim()) || loading}
              className="gistIt baloo-2-semiBold"
            >
              {loading ? "Processing..." : "Gist IT!"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
