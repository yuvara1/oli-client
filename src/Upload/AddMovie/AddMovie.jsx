import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import MuxPlayer from '@mux/mux-player-react';
import { IoClose, IoCloudUpload } from 'react-icons/io5';
import './AddMovie.css';

const DOMAIN = import.meta.env.VITE_DOMAIN || 'http://localhost:3000';

function AddMovie({ onClose, onSuccess }) {
     const [uploading, setUploading] = useState(false);
     const [uploadProgress, setUploadProgress] = useState(0);
     const [playbackId, setPlaybackId] = useState('');
     const [abortController, setAbortController] = useState(null);

     // Upload form state
     const [uploadForm, setUploadForm] = useState({
          title: '',
          description: '',
          genres: '',
          cast: '',
          director: '',
          year: new Date().getFullYear(),
          grade: 'PG',
          videoFile: null,
          posterFile: null,
          trailerFile: null
     });

     // Dropzone for main video
     const onDropVideo = useCallback((acceptedFiles) => {
          setUploadForm(prev => ({ ...prev, videoFile: acceptedFiles[0] }));
     }, []);

     const { getRootProps: getVideoRootProps, getInputProps: getVideoInputProps, isDragActive: isVideoDragActive } = useDropzone({
          onDrop: onDropVideo,
          accept: { 'video/*': [] },
          multiple: false
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

     // Dropzone for trailer
     const onDropTrailer = useCallback((acceptedFiles) => {
          setUploadForm(prev => ({ ...prev, trailerFile: acceptedFiles[0] }));
     }, []);

     const { getRootProps: getTrailerRootProps, getInputProps: getTrailerInputProps, isDragActive: isTrailerDragActive } = useDropzone({
          onDrop: onDropTrailer,
          accept: { 'video/*': [] },
          multiple: false
     });

     // Handle upload
     const handleUpload = async () => {
          if (!uploadForm.title || !uploadForm.description || !uploadForm.videoFile || !uploadForm.posterFile || !uploadForm.trailerFile) {
               alert('Please fill all required fields and select all files');
               return;
          }

          setUploading(true);
          setUploadProgress(0);

          // Create abort controller
          const controller = new AbortController();
          setAbortController(controller);

          try {
               // 1. Get Mux direct upload URL
               const { data } = await axios.post(`${DOMAIN}/mux-direct-upload`, {}, {
                    signal: controller.signal
               });
               const uploadUrl = data.url;
               const uploadId = data.uploadId;

               // 2. Upload main video to Mux
               await axios.put(uploadUrl, uploadForm.videoFile, {
                    headers: { 'Content-Type': uploadForm.videoFile.type },
                    signal: controller.signal,
                    onUploadProgress: (evt) => {
                         const progress = Math.round((evt.loaded * 50) / evt.total);
                         setUploadProgress(progress);
                    }
               });

               if (controller.signal.aborted) {
                    throw new Error('Upload was canceled');
               }

               // 3. Poll for Mux asset status
               const pollMuxAsset = async (uploadId) => {
                    for (let i = 0; i < 30; i++) {
                         if (controller.signal.aborted) {
                              throw new Error('Upload was canceled');
                         }

                         const res = await axios.get(`${DOMAIN}/mux-asset-status/${uploadId}`, {
                              signal: controller.signal
                         });

                         if (res.data.playbackId) return res.data.playbackId;
                         await new Promise(r => setTimeout(r, 1000));
                    }
                    throw new Error('Mux asset not ready');
               };

               const playbackId = await pollMuxAsset(uploadId);
               setPlaybackId(playbackId);
               setUploadProgress(60);

               if (controller.signal.aborted) {
                    throw new Error('Upload was canceled');
               }

               // 4. Save movie info to database
               const movieResponse = await axios.post(`${DOMAIN}/upload-movie-mux`, {
                    movieTitle: uploadForm.title,
                    description: uploadForm.description,
                    genres: uploadForm.genres,
                    cast: uploadForm.cast,
                    director: uploadForm.director,
                    year: uploadForm.year,
                    grade: uploadForm.grade,
                    playbackId
               }, {
                    signal: controller.signal
               });

               const movieId = movieResponse.data.id;
               setUploadProgress(70);

               if (controller.signal.aborted) {
                    throw new Error('Upload was canceled');
               }

               // 5. Upload trailer and poster
               const formData = new FormData();
               formData.append('trailer', uploadForm.trailerFile);
               formData.append('poster', uploadForm.posterFile);
               formData.append('title', uploadForm.title);

               await axios.post(`${DOMAIN}/upload-trailer-poster/${movieId}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    signal: controller.signal,
                    onUploadProgress: (evt) => {
                         const progress = 70 + Math.round((evt.loaded * 30) / evt.total);
                         setUploadProgress(progress);
                    }
               });

               if (controller.signal.aborted) {
                    throw new Error('Upload was canceled');
               }

               setUploadProgress(100);
               alert('Movie uploaded successfully!');

               // Reset form
               handleResetForm();

               // Notify parent component
               if (onSuccess) {
                    onSuccess();
               }

          } catch (error) {
               if (error.name === 'CanceledError' || error.message === 'Upload was canceled') {
                    console.log('Upload was canceled by user');
                    alert('Upload was canceled');
               } else {
                    console.error('Upload failed:', error);
                    alert('Failed to upload movie: ' + (error.response?.data?.error || error.message));
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
          setPlaybackId('');
          setUploadForm({
               title: '',
               description: '',
               genres: '',
               cast: '',
               director: '',
               year: new Date().getFullYear(),
               grade: 'PG',
               videoFile: null,
               posterFile: null,
               trailerFile: null
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
          <div className="add-movie-container">
               <div className="add-movie-header">
                    <h2>Upload New Movie</h2>
                    <button className="close-btn" onClick={handleClose} disabled={uploading}>
                         <IoClose />
                    </button>
               </div>

               <div className="add-movie-form">
                    <div className="form-row">
                         <div className="form-group">
                              <label>Movie Title *</label>
                              <input
                                   type="text"
                                   value={uploadForm.title}
                                   onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                                   placeholder="Enter movie title"
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
                              placeholder="Enter movie description"
                              rows={4}
                              required
                         />
                    </div>

                    <div className="form-row">
                         <div className="form-group">
                              <label>Director</label>
                              <input
                                   type="text"
                                   value={uploadForm.director}
                                   onChange={(e) => setUploadForm(prev => ({ ...prev, director: e.target.value }))}
                                   placeholder="Enter director's name"
                              />
                         </div>
                         <div className="form-group">
                              <label>Cast</label>
                              <input
                                   type="text"
                                   value={uploadForm.cast}
                                   onChange={(e) => setUploadForm(prev => ({ ...prev, cast: e.target.value }))}
                                   placeholder="Enter main cast members (comma separated) "
                              />
                         </div>
                    </div>

                    <div className="form-row">
                         <div className="form-group">
                              <label>Genres</label>
                              <input
                                   type="text"
                                   value={uploadForm.genres}
                                   onChange={(e) => setUploadForm(prev => ({ ...prev, genres: e.target.value }))}
                                   placeholder="Action, Drama, Thriller (comma separated)"
                              />
                         </div>
                         <div className="form-group">
                              <label>Grade</label>
                              <select
                                   value={uploadForm.grade}
                                   onChange={(e) => setUploadForm(prev => ({ ...prev, grade: e.target.value }))}
                              >
                                   <option value="G">G</option>
                                   <option value="PG">PG</option>
                                   <option value="PG-13">PG-13</option>
                                   <option value="R">R</option>
                                   <option value="NC-17">NC-17</option>
                                   <option value="NR">Not Rated</option>
                              </select>
                         </div>
                    </div>

                    <div className="form-group">
                         <label>Main Video (Full Movie) *</label>
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
                                                  ? 'Drop the main video here...'
                                                  : 'Drag & drop main video file, or click to select'
                                             }
                                        </span>
                                        <small>Supported formats: MP4, MOV, AVI, MKV</small>
                                   </div>
                              )}
                         </div>
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
                         <label>Trailer Video *</label>
                         <div {...getTrailerRootProps()} className={`dropzone ${isTrailerDragActive ? 'active' : ''}`}>
                              <input {...getTrailerInputProps()} />
                              {uploadForm.trailerFile ? (
                                   <div className="file-selected">
                                        <IoCloudUpload />
                                        <span>✅ {uploadForm.trailerFile.name}</span>
                                        <small>{(uploadForm.trailerFile.size / 1024 / 1024).toFixed(2)} MB</small>
                                   </div>
                              ) : (
                                   <div className="dropzone-content">
                                        <IoCloudUpload />
                                        <span>
                                             {isTrailerDragActive
                                                  ? 'Drop the trailer here...'
                                                  : 'Drag & drop trailer video, or click to select'
                                             }
                                        </span>
                                        <small>Recommended: 1-3 minutes, MP4 format</small>
                                   </div>
                              )}
                         </div>
                    </div>

                    {/* Preview Player */}
                    {playbackId && (
                         <div className="preview-section">
                              <h3>Preview</h3>
                              <div className="mux-player-container">
                                   <MuxPlayer
                                        playbackId={playbackId}
                                        streamType="on-demand"
                                        metadataVideoTitle={uploadForm.title}
                                        style={{ width: '100%', aspectRatio: '16/9', borderRadius: '8px' }}
                                   />
                              </div>
                         </div>
                    )}

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
                                             uploadProgress < 70 ? 'Processing video...' :
                                                  'Uploading media files...'}
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
                              disabled={uploading || !uploadForm.title || !uploadForm.description || !uploadForm.videoFile || !uploadForm.posterFile || !uploadForm.trailerFile}
                         >
                              {uploading ? `Uploading... ${uploadProgress}%` : 'Upload Movie'}
                         </button>
                    </div>
               </div>
          </div>
     );
}

export default AddMovie;