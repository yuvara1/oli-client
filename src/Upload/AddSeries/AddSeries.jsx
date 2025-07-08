import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { IoClose, IoCloudUpload } from 'react-icons/io5';
import './AddSeries.css';

const DOMAIN = import.meta.env.VITE_DOMAIN || 'http://localhost:3000';

function AddSeries({ onClose, onSuccess }) {
     const [uploading, setUploading] = useState(false);
     const [uploadProgress, setUploadProgress] = useState(0);
     const [abortController, setAbortController] = useState(null);

     // Upload form state
     const [uploadForm, setUploadForm] = useState({
          title: '',
          description: '',
          genres: '',
          year: new Date().getFullYear(),
          seasons: 1,
          episodes: 1,
          posterFile: null,
          videoFile: null
     });

     // Dropzone for poster
     const onDropPoster = useCallback((acceptedFiles) => {
          setUploadForm(prev => ({ ...prev, posterFile: acceptedFiles[0] }));
     }, []);

     const { getRootProps: getPosterRootProps, getInputProps: getPosterInputProps, isDragActive: isPosterDragActive } = useDropzone({
          onDrop: onDropPoster,
          accept: { 'image/*': [] },
          multiple: false
     });

     // Dropzone for video
     const onDropVideo = useCallback((acceptedFiles) => {
          setUploadForm(prev => ({ ...prev, videoFile: acceptedFiles[0] }));
     }, []);

     const { getRootProps: getVideoRootProps, getInputProps: getVideoInputProps, isDragActive: isVideoDragActive } = useDropzone({
          onDrop: onDropVideo,
          accept: { 'video/*': [] },
          multiple: false
     });

     // Handle upload
     const handleUpload = async () => {
          if (!uploadForm.title || !uploadForm.posterFile || !uploadForm.videoFile) {
               alert('Please fill all required fields and select both poster and video files');
               return;
          }

          setUploading(true);
          setUploadProgress(0);

          // Create abort controller
          const controller = new AbortController();
          setAbortController(controller);

          try {
               // Step 1: Create Series Mux direct upload URL
               const muxResponse = await axios.post(`${DOMAIN}/series-mux-direct-upload`, {}, {
                    signal: controller.signal
               });

               if (!muxResponse.data.url || !muxResponse.data.uploadId) {
                    throw new Error('Failed to create Mux upload URL');
               }

               const { url: muxUploadUrl, uploadId } = muxResponse.data;
               setUploadProgress(10);

               // Step 2: Upload video to Mux
               await axios.put(muxUploadUrl, uploadForm.videoFile, {
                    headers: { 'Content-Type': uploadForm.videoFile.type },
                    signal: controller.signal,
                    onUploadProgress: (progressEvent) => {
                         const progress = 10 + Math.round((progressEvent.loaded * 40) / progressEvent.total);
                         setUploadProgress(progress);
                    }
               });

               if (controller.signal.aborted) {
                    throw new Error('Upload was canceled');
               }

               setUploadProgress(50);

               // Step 3: Wait for Mux processing
               let playbackId = null;
               let attempts = 0;
               const maxAttempts = 30;

               while (!playbackId && attempts < maxAttempts && !controller.signal.aborted) {
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    try {
                         const statusResponse = await axios.get(`${DOMAIN}/series-mux-asset-status/${uploadId}`, {
                              signal: controller.signal
                         });

                         if (statusResponse.data.ready && statusResponse.data.playbackId) {
                              playbackId = statusResponse.data.playbackId;
                              break;
                         }

                         attempts++;
                         const progressIncrement = Math.min(40, attempts * 1.5);
                         setUploadProgress(50 + progressIncrement);

                    } catch (statusError) {
                         if (statusError.name === 'CanceledError') {
                              throw new Error('Upload was canceled');
                         }
                         attempts++;
                    }
               }

               if (controller.signal.aborted) {
                    throw new Error('Upload was canceled');
               }

               if (!playbackId) {
                    throw new Error('Video processing timeout. Please try again.');
               }

               setUploadProgress(90);

               // Step 4: Upload poster and save series data
               const formData = new FormData();
               formData.append('title', uploadForm.title);
               formData.append('description', uploadForm.description);
               formData.append('genres', uploadForm.genres);
               formData.append('year', uploadForm.year);
               formData.append('seasons', uploadForm.seasons);
               formData.append('episodes', uploadForm.episodes);
               formData.append('poster', uploadForm.posterFile);
               formData.append('playbackId', playbackId);

               const response = await axios.post(`${DOMAIN}/upload-series`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    signal: controller.signal,
                    onUploadProgress: (progressEvent) => {
                         const progress = 90 + Math.round((progressEvent.loaded * 10) / progressEvent.total);
                         setUploadProgress(progress);
                    }
               });

               if (controller.signal.aborted) {
                    throw new Error('Upload was canceled');
               }

               if (response.data.success) {
                    setUploadProgress(100);
                    alert('Series uploaded successfully!');
                    handleResetForm();

                    // Notify parent component
                    if (onSuccess) {
                         onSuccess();
                    }
               } else {
                    throw new Error(response.data.error || 'Upload failed');
               }

          } catch (error) {
               if (error.name === 'CanceledError' || error.message === 'Upload was canceled') {
                    console.log('Upload was canceled by user');
                    alert('Upload was canceled');
               } else {
                    console.error('Upload failed:', error);
                    const errorMessage = error.response?.data?.error ||
                         error.response?.data?.message ||
                         error.message ||
                         'Unknown error occurred';
                    alert(`Failed to upload series: ${errorMessage}`);
               }
          } finally {
               setUploading(false);
               setUploadProgress(0);
               setAbortController(null);
          }
     };

     // Cancel upload
     const handleCancelUpload = () => {
          if (abortController) {
               abortController.abort();
          }
          handleResetForm();
          if (uploading) {
               alert('Upload canceled successfully');
          }
     };

     // Reset form
     const handleResetForm = () => {
          setUploading(false);
          setUploadProgress(0);
          setUploadForm({
               title: '',
               description: '',
               genres: '',
               year: new Date().getFullYear(),
               seasons: 1,
               episodes: 1,
               posterFile: null,
               videoFile: null
          });
          setAbortController(null);
     };

     // Handle close
     const handleClose = () => {
          if (uploading) {
               handleCancelUpload();
          }
          if (onClose) {
               onClose();
          }
     };

     return (
          <div className="add-series-container">
               <div className="add-series-header">
                    <h2>Upload New Series</h2>
                    <button className="close-btn" onClick={handleClose} disabled={uploading}>
                         <IoClose />
                    </button>
               </div>

               <div className="add-series-form">
                    <div className="form-row">
                         <div className="form-group">
                              <label>Series Title *</label>
                              <input
                                   type="text"
                                   value={uploadForm.title}
                                   onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                                   placeholder="Enter series title"
                                   required
                              />
                         </div>

                         <div className="form-group">
                              <label>Year</label>
                              <input
                                   type="number"
                                   value={uploadForm.year}
                                   onChange={(e) => setUploadForm(prev => ({ ...prev, year: e.target.value }))}
                                   min="1900"
                                   max="2030"
                              />
                         </div>
                    </div>

                    <div className="form-group">
                         <label>Description *</label>
                         <textarea
                              value={uploadForm.description}
                              onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="Enter series description"
                              rows={4}
                              required
                         />
                    </div>

                    <div className="form-row">
                         <div className="form-group">
                              <label>Genres</label>
                              <input
                                   type="text"
                                   value={uploadForm.genres}
                                   onChange={(e) => setUploadForm(prev => ({ ...prev, genres: e.target.value }))}
                                   placeholder="Drama, Romance, Comedy (comma separated)"
                              />
                         </div>

                         <div className="form-group">
                              <label>Seasons</label>
                              <input
                                   type="number"
                                   value={uploadForm.seasons}
                                   onChange={(e) => setUploadForm(prev => ({ ...prev, seasons: parseInt(e.target.value) || 1 }))}
                                   min="1"
                                   max="50"
                              />
                         </div>
                    </div>

                    <div className="form-group">
                         <label>Episodes</label>
                         <input
                              type="number"
                              value={uploadForm.episodes}
                              onChange={(e) => setUploadForm(prev => ({ ...prev, episodes: parseInt(e.target.value) || 1 }))}
                              min="1"
                              max="500"
                         />
                    </div>

                    <div className="form-group">
                         <label>Poster Image *</label>
                         <div {...getPosterRootProps()} className={`dropzone ${isPosterDragActive ? 'active' : ''}`}>
                              <input {...getPosterInputProps()} />
                              {uploadForm.posterFile ? (
                                   <div className="file-selected">
                                        <IoCloudUpload />
                                        <span>✅ {uploadForm.posterFile.name}</span>
                                        <small>{(uploadForm.posterFile.size / 1024).toFixed(2)} KB</small>
                                   </div>
                              ) : (
                                   <div className="dropzone-content">
                                        <IoCloudUpload />
                                        <span>
                                             {isPosterDragActive
                                                  ? 'Drop the poster here...'
                                                  : 'Drag & drop poster image, or click to select'
                                             }
                                        </span>
                                        <small>Recommended: 600x900px, JPG/PNG</small>
                                   </div>
                              )}
                         </div>
                    </div>

                    <div className="form-group">
                         <label>Video File *</label>
                         <div {...getVideoRootProps()} className={`dropzone ${isVideoDragActive ? 'active' : ''}`}>
                              <input {...getVideoInputProps()} />
                              {uploadForm.videoFile ? (
                                   <div className="file-selected">
                                        <IoCloudUpload />
                                        <span>✅ {uploadForm.videoFile.name}</span>
                                        <small>{(uploadForm.videoFile.size / 1024 / 1024).toFixed(2)} MB</small>
                                   </div>
                              ) : (
                                   <div className="dropzone-content">
                                        <IoCloudUpload />
                                        <span>
                                             {isVideoDragActive
                                                  ? 'Drop the video here...'
                                                  : 'Drag & drop video file, or click to select'
                                             }
                                        </span>
                                        <small>Supported formats: MP4, MOV, AVI, MKV</small>
                                   </div>
                              )}
                         </div>
                    </div>

                    {/* Upload Progress */}
                    {uploading && (
                         <div className="upload-progress">
                              <div className="progress-bar">
                                   <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                              </div>
                              <div className="progress-info">
                                   <span>{uploadProgress}% uploaded</span>
                                   <span className="status-text">
                                        {uploadProgress < 50 ? 'Uploading video...' :
                                             uploadProgress < 90 ? 'Processing video...' :
                                                  'Finalizing upload...'}
                                   </span>
                              </div>
                         </div>
                    )}

                    {/* Form Actions */}
                    <div className="form-actions">
                         <button
                              className="cancel-btn"
                              onClick={handleCancelUpload}
                              disabled={false}
                         >
                              {uploading ? 'Cancel Upload' : 'Cancel'}
                         </button>
                         <button
                              className="upload-btn"
                              onClick={handleUpload}
                              disabled={uploading || !uploadForm.title || !uploadForm.posterFile || !uploadForm.videoFile}
                         >
                              {uploading ? `Uploading... ${uploadProgress}%` : 'Upload Series'}
                         </button>
                    </div>
               </div>
          </div>
     );
}

export default AddSeries;