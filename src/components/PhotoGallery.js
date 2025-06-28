import { useState, useRef, useEffect, useCallback } from 'react';
import { ref, set, push, remove, query, orderByChild, limitToLast } from 'firebase/database';
import { realtimeDb } from '@/lib/firebase';
import { FiCamera, FiX, FiTrash2, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

const PhotoGallery = ({ roomId, photos = [], onPhotosUpdate, disabled = false }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [viewingPhoto, setViewingPhoto] = useState(null);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [isCameraMode, setIsCameraMode] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Touch/swipe handling for photo viewer
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // Auto-cleanup photos older than 1 hour
  useEffect(() => {
    const cleanupOldPhotos = async () => {
      if (!roomId || !photos.length) return;

      const now = Date.now();
      const oneHourAgo = now - (60 * 60 * 1000); // 1 hour in milliseconds

      const photosToDelete = photos.filter(photo => 
        photo.uploadedAt && photo.uploadedAt < oneHourAgo
      );

      for (const photo of photosToDelete) {
        try {
          const photoRef = ref(realtimeDb, `rooms/${roomId}/photos/${photo.id}`);
          await remove(photoRef);
          console.log(`Auto-deleted expired photo: ${photo.id}`);
        } catch (error) {
          console.error('Error auto-deleting photo:', error);
        }
      }
    };

    // Check for cleanup every 5 minutes
    const interval = setInterval(cleanupOldPhotos, 5 * 60 * 1000);
    
    // Also check immediately
    cleanupOldPhotos();

    return () => clearInterval(interval);
  }, [roomId, photos]);

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    // Check total photos limit
    if (photos.length + files.length > 3) {
      toast.error(`Maximum 3 photos allowed. You can add ${3 - photos.length} more.`);
      return;
    }

    // Validate all files
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select only image files');
        return;
      }
      if (file.size > 1 * 1024 * 1024) {
        toast.error('Each image should be less than 1MB');
        return;
      }
    }

    // Upload all valid files
    for (const file of files) {
      await uploadPhoto(file);
    }
  };

  const uploadPhoto = async (file) => {
    if (!roomId) {
      toast.error('Room not found');
      return;
    }

    setIsUploading(true);
    
    try {
      // Convert file to base64
      const base64Data = await fileToBase64(file);
      
      // Create photo data with metadata
      const photoData = {
        data: base64Data,
        type: file.type,
        name: file.name,
        size: file.size,
        uploadedAt: Date.now(),
        expiresAt: Date.now() + (60 * 60 * 1000) // 1 hour from now
      };

      // Store in Realtime Database - push to create new entry
      const photosRef = ref(realtimeDb, `rooms/${roomId}/photos`);
      const newPhotoRef = push(photosRef);
      await set(newPhotoRef, photoData);
      
      console.log('Photo uploaded successfully to gallery');
      
      toast.success('Photo added to gallery! 📸');
      setPreviewUrl(null);
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo. Please try again.');
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  // Helper function to convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const removePhoto = async (photoId, showToast = true) => {
    try {
      const photoRef = ref(realtimeDb, `rooms/${roomId}/photos/${photoId}`);
      await remove(photoRef);
      if (showToast) {
        toast.success('Photo removed');
      }
    } catch (error) {
      console.error('Error removing photo:', error);
      if (showToast) {
        toast.error('Failed to remove photo');
      }
    }
  };

  // Handle camera capture
  const handleCameraCapture = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Same validation as file upload
    if (!file.type.startsWith('image/')) {
      toast.error('Please capture an image');
      return;
    }
    if (file.size > 1 * 1024 * 1024) {
      toast.error('Image size should be less than 1MB');
      return;
    }
    if (photos.length >= 3) {
      toast.error('Maximum 3 photos allowed. Delete one to add a new photo.');
      return;
    }

    await uploadPhoto(file);
  };

  // Multi-select functionality
  const togglePhotoSelection = (photoId) => {
    setSelectedPhotos(prev => 
      prev.includes(photoId) 
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  };

  const deleteSelectedPhotos = async () => {
    if (selectedPhotos.length === 0) return;
    
    try {
      await Promise.all(selectedPhotos.map(photoId => removePhoto(photoId, false)));
      setSelectedPhotos([]);
      setIsMultiSelectMode(false);
      toast.success(`${selectedPhotos.length} photo(s) deleted`);
    } catch (error) {
      toast.error('Failed to delete some photos');
    }
  };

  const toggleMultiSelectMode = () => {
    setIsMultiSelectMode(!isMultiSelectMode);
    setSelectedPhotos([]);
  };

  // Photo viewing
  const openPhotoViewer = (photo) => {
    if (isMultiSelectMode) {
      togglePhotoSelection(photo.id);
    } else {
      setViewingPhoto(photo);
    }
  };

  const closePhotoViewer = () => {
    setViewingPhoto(null);
  };

  // Navigate between photos in viewer
  const navigatePhoto = useCallback((direction) => {
    if (!viewingPhoto) return;
    
    const currentIndex = photos.findIndex(p => p.id === viewingPhoto.id);
    let nextIndex;
    
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % photos.length;
    } else {
      nextIndex = (currentIndex - 1 + photos.length) % photos.length;
    }
    
    setViewingPhoto(photos[nextIndex]);
  }, [viewingPhoto, photos]);

  // Touch handling for swipe gestures
  const handleTouchStart = useCallback((e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const handleTouchMove = useCallback((e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (photos.length > 1) {
      if (isLeftSwipe) {
        navigatePhoto('next');
      } else if (isRightSwipe) {
        navigatePhoto('prev');
      }
    }
  }, [touchStart, touchEnd, photos.length, navigatePhoto]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!viewingPhoto) return;
      
      if (e.key === 'ArrowLeft') {
        navigatePhoto('prev');
      } else if (e.key === 'ArrowRight') {
        navigatePhoto('next');
      } else if (e.key === 'Escape') {
        closePhotoViewer();
      }
    };

    if (viewingPhoto) {
      document.addEventListener('keydown', handleKeyPress);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [viewingPhoto, navigatePhoto]);

  // Camera functionality
  const startCamera = async () => {
    setCameraLoading(true);
    setIsCameraMode(true);
    
    try {
      // Simple camera access like in your example
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false // We don't need audio for photos
      });

      if (stream && videoRef.current) {
        setCameraStream(stream);
        
        // Set the video source
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true; // Ensure muted
        
        // Wait for metadata to load then play
        videoRef.current.addEventListener("loadedmetadata", () => {
          videoRef.current.play().then(() => {
            console.log('Camera started successfully');
            setCameraLoading(false);
          }).catch((error) => {
            console.error('Error playing video:', error);
            setCameraLoading(false);
          });
        });
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setCameraLoading(false);
      setIsCameraMode(false);
      toast.error('Cannot access camera. Please check permissions and try the file picker instead.');
      // Fallback to file input
      cameraInputRef.current?.click();
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraMode(false);
    setCameraLoading(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || cameraLoading) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set canvas dimensions to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Flip the canvas horizontally to match the mirrored video
    context.save();
    context.scale(-1, 1);
    context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    context.restore();

    // Convert canvas to blob
    canvas.toBlob(async (blob) => {
      if (blob) {
        // Create a file from the blob
        const file = new File([blob], `camera-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        
        // Validate file size
        if (file.size > 1 * 1024 * 1024) {
          toast.error('Photo too large. Try again.');
          return;
        }

        // Stop camera first
        stopCamera();

        // Upload the photo
        await uploadPhoto(file);
      }
    }, 'image/jpeg', 0.9); // Higher quality for camera photos
  };

  // Clean up camera when component unmounts
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const triggerCameraCapture = () => {
    // Check if we have camera support
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      startCamera();
    } else {
      // Fallback to file input with capture
      cameraInputRef.current?.click();
    }
  };

  const getTimeRemaining = (uploadedAt) => {
    if (!uploadedAt) return '';
    
    const now = Date.now();
    const expiresAt = uploadedAt + (60 * 60 * 1000); // 1 hour
    const remaining = expiresAt - now;
    
    if (remaining <= 0) return 'Expired';
    
    const minutes = Math.floor(remaining / (60 * 1000));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m left`;
    } else {
      return `${minutes}m left`;
    }
  };

  return (
    <div className="w-full">
      {/* File inputs (hidden) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="camera"
        onChange={handleCameraCapture}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {/* Multi-select toolbar */}
      {photos.length > 0 && (
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={toggleMultiSelectMode}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
              isMultiSelectMode 
                ? 'bg-red-500/20 text-red-300 border border-red-400/50' 
                : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
            }`}
          >
            {isMultiSelectMode ? 'Cancel' : 'Select'}
          </button>
          
          {isMultiSelectMode && selectedPhotos.length > 0 && (
            <button
              onClick={deleteSelectedPhotos}
              className="px-4 py-2 bg-red-500/80 text-white rounded-xl text-sm font-medium hover:bg-red-500 transition-all duration-300 flex items-center space-x-2"
            >
              <FiTrash2 size={16} />
              <span>Delete ({selectedPhotos.length})</span>
            </button>
          )}
        </div>
      )}

      {/* Photo Grid - Responsive */}
      <div className="w-full">
        {photos.length === 0 && !previewUrl ? (
          // Empty state - responsive sizing
          <div className="aspect-square max-w-sm mx-auto lg:max-w-md rounded-3xl bg-gradient-to-br from-white/5 via-white/3 to-white/5 border-2 border-dashed border-white/20 flex flex-col items-center justify-center text-white/60">
            <div className="text-4xl lg:text-6xl mb-4 opacity-70 animate-pulse">📷</div>
            <p className="text-sm lg:text-base text-center px-6 font-medium">
              Share your moments together
            </p>
            <p className="text-xs lg:text-sm text-center px-6 mt-2 text-white/40">
              Photos auto-delete after 1 hour
            </p>
          </div>
        ) : (
          // Photo grid - Responsive collage layout
          <div className={`grid gap-2 lg:gap-4 max-w-sm mx-auto lg:max-w-2xl ${
            photos.length === 1 ? 'grid-cols-1' : 
            photos.length === 2 ? 'grid-cols-2' : 
            'grid-cols-2'
          }`}>
            {photos.map((photo, index) => (
              <div 
                key={photo.id} 
                className={`relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5 border border-white/20 shadow-xl group cursor-pointer transition-all duration-300 hover:scale-105 ${
                  // Collage-style sizing
                  photos.length === 1 ? 'aspect-square rounded-3xl' :
                  photos.length === 2 ? 'aspect-square rounded-2xl lg:rounded-3xl' :
                  index === 0 ? 'aspect-[4/3] col-span-2 rounded-2xl lg:rounded-3xl' : // First photo spans 2 columns
                  'aspect-square rounded-2xl lg:rounded-3xl'
                } ${
                  isMultiSelectMode && selectedPhotos.includes(photo.id) ? 'ring-4 ring-pink-400 scale-95' : ''
                }`}
                onClick={() => openPhotoViewer(photo)}
              >
                <Image
                  src={photo.data}
                  alt="Shared moment"
                  fill
                  className="object-cover transition-all duration-500"
                  sizes="(max-width: 768px) 50vw, 33vw"
                />
                
                {/* Multi-select indicator */}
                {isMultiSelectMode && (
                  <div className="absolute top-2 left-2 w-6 h-6 rounded-full border-2 border-white bg-black/50 flex items-center justify-center">
                    {selectedPhotos.includes(photo.id) && (
                      <div className="w-3 h-3 bg-pink-400 rounded-full"></div>
                    )}
                  </div>
                )}
                
                {/* Time remaining overlay */}
                <div className="absolute top-2 right-2 lg:top-3 lg:right-3 bg-black/60 text-white text-xs px-2 py-1 lg:px-3 lg:py-1.5 rounded-full backdrop-blur-sm border border-white/20">
                  {getTimeRemaining(photo.uploadedAt)}
                </div>
                
                {/* Remove button (only in non-multi-select mode) */}
                {!isMultiSelectMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removePhoto(photo.id);
                    }}
                    className="absolute bottom-2 right-2 lg:bottom-3 lg:right-3 w-7 h-7 lg:w-8 lg:h-8 bg-red-500/80 text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-all duration-300 opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 backdrop-blur-sm"
                  >
                    <FiX size={14} />
                  </button>
                )}
              </div>
            ))}
            
            {/* Third slot when only 2 photos */}
            {photos.length === 2 && (
              <div className="aspect-square rounded-2xl lg:rounded-3xl bg-gradient-to-br from-white/5 to-white/3 border-2 border-dashed border-white/20 flex items-center justify-center">
                <div className="text-center text-white/50">
                  <div className="text-xl lg:text-2xl mb-2">📸</div>
                  <p className="text-xs">One more</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Preview overlay during upload */}
        {previewUrl && (
          <div className="aspect-square max-w-sm mx-auto lg:max-w-md rounded-3xl overflow-hidden bg-gradient-to-br from-white/10 to-white/5 border border-white/20 shadow-xl relative">
            <Image
              src={previewUrl}
              alt="Preview"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
              <div className="text-center text-white">
                <div className="w-8 h-8 lg:w-12 lg:h-12 border-4 border-white border-t-transparent rounded-full mx-auto mb-4 animate-spin"></div>
                <p className="font-medium text-sm lg:text-base">Adding to gallery...</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload buttons */}
      <div className="flex justify-center space-x-4 mt-6">
        <button
          onClick={triggerFileSelect}
          disabled={disabled || isUploading || photos.length >= 3}
          className={`
            w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-full shadow-xl
            flex items-center justify-center
            transition-all duration-300 hover:scale-110
            focus:outline-none focus:ring-4 focus:ring-pink-400/50
            ${disabled || isUploading || photos.length >= 3 ? 'opacity-50 cursor-not-allowed' : 'active:scale-95 hover:shadow-2xl'}
          `}
        >
          <FiCamera size={18} className="text-white lg:hidden" />
          <FiCamera size={24} className="text-white hidden lg:block" />
        </button>
        
        <button
          onClick={triggerCameraCapture}
          disabled={disabled || isUploading || photos.length >= 3}
          className={`
            w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-full shadow-xl
            flex items-center justify-center
            transition-all duration-300 hover:scale-110
            focus:outline-none focus:ring-4 focus:ring-emerald-400/50
            ${disabled || isUploading || photos.length >= 3 ? 'opacity-50 cursor-not-allowed' : 'active:scale-95 hover:shadow-2xl'}
          `}
        >
          <span className="text-white text-lg lg:text-2xl">📷</span>
        </button>
      </div>

      {/* Photo count indicator */}
      <div className="flex justify-center mt-4">
        <div className="flex space-x-2">
          {[1, 2, 3].map((index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index <= photos.length 
                  ? 'bg-gradient-to-r from-pink-400 to-purple-400' 
                  : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Photo Viewer Modal */}
      {viewingPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div 
            ref={viewerRef}
            className="relative max-w-4xl max-h-full w-full h-full flex items-center justify-center"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Close button */}
            <button
              onClick={closePhotoViewer}
              className="absolute top-4 right-4 w-12 h-12 bg-white/10 backdrop-blur-xl text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-all duration-300 z-20 shadow-xl"
            >
              <FiX size={24} />
            </button>
            
            {/* Navigation buttons */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => navigatePhoto('prev')}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white/10 backdrop-blur-xl text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-all duration-300 z-20 shadow-xl"
                >
                  <FiChevronLeft size={24} />
                </button>
                <button
                  onClick={() => navigatePhoto('next')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white/10 backdrop-blur-xl text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-all duration-300 z-20 shadow-xl"
                >
                  <FiChevronRight size={24} />
                </button>
              </>
            )}
            
            {/* Photo counter for multiple photos */}
            {photos.length > 1 && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm font-medium z-20">
                {photos.findIndex(p => p.id === viewingPhoto.id) + 1} of {photos.length}
              </div>
            )}
            
            {/* Photo */}
            <div className="relative w-full h-full max-w-3xl max-h-[80vh] bg-white/5 rounded-3xl overflow-hidden">
              <Image
                src={viewingPhoto.data}
                alt="Viewing shared moment"
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </div>
            
            {/* Swipe indicator for mobile */}
            {photos.length > 1 && (
              <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 text-white/50 text-xs text-center md:hidden">
                ← Swipe to navigate →
              </div>
            )}
            
            {/* Photo info */}
            <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-sm rounded-2xl p-4 text-white z-20">
              <div className="flex justify-between items-center">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {viewingPhoto.name || 'Shared moment'}
                  </p>
                  <p className="text-sm text-white/70">
                    {getTimeRemaining(viewingPhoto.uploadedAt)} • {Math.round(viewingPhoto.size / 1024)}KB
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removePhoto(viewingPhoto.id);
                    closePhotoViewer();
                  }}
                  className="w-10 h-10 bg-red-500/80 text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-all duration-300 flex-shrink-0 ml-4"
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {(isCameraMode || cameraLoading) && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <div className="relative w-full h-full flex flex-col">
            {/* Camera Controls */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20">
              <button
                onClick={stopCamera}
                className="w-12 h-12 bg-white/10 backdrop-blur-xl text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-all duration-300 shadow-xl"
              >
                <FiX size={24} />
              </button>
              <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm font-medium">
                {cameraLoading ? 'Starting Camera...' : 'Camera'}
              </div>
              <div className="w-12"></div> {/* Spacer for balance */}
            </div>

            {/* Video Feed */}
            <div className="flex-1 relative">
              {cameraLoading ? (
                // Loading state
                <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full mx-auto mb-4 animate-spin"></div>
                    <p className="text-lg font-medium">Starting Camera...</p>
                    <p className="text-sm text-white/70 mt-2">Please allow camera access if prompted</p>
                  </div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    controls={false}
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }} // Mirror the video for front camera
                  />
                  
                  {/* Camera frame overlay */}
                  <div className="absolute inset-4 border-2 border-white/30 rounded-3xl pointer-events-none"></div>
                </>
              )}
            </div>

            {/* Camera Controls Bottom */}
            {!cameraLoading && (
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center space-x-8 z-20">
                {/* Gallery button */}
                <button
                  onClick={() => {
                    stopCamera();
                    triggerFileSelect();
                  }}
                  className="w-12 h-12 bg-white/10 backdrop-blur-xl text-white rounded-xl flex items-center justify-center hover:bg-white/20 transition-all duration-300"
                >
                  <FiCamera size={20} />
                </button>

                {/* Capture button */}
                <button
                  onClick={capturePhoto}
                  disabled={isUploading || cameraLoading}
                  className="w-20 h-20 bg-white border-4 border-white rounded-full flex items-center justify-center hover:scale-105 transition-all duration-300 shadow-xl disabled:opacity-50"
                >
                  <div className="w-16 h-16 bg-white rounded-full"></div>
                </button>

                {/* Switch camera button (placeholder for future enhancement) */}
                <button
                  className="w-12 h-12 bg-white/10 backdrop-blur-xl text-white rounded-xl flex items-center justify-center hover:bg-white/20 transition-all duration-300"
                  onClick={() => {
                    // Future: implement camera switching
                    toast.info('Camera switching coming soon!');
                  }}
                >
                  <span className="text-xl">🔄</span>
                </button>
              </div>
            )}

            {/* Hidden canvas for photo capture */}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoGallery;
