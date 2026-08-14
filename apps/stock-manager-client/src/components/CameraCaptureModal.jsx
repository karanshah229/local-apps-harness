import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Check, X, Upload } from 'lucide-react';

export default function CameraCaptureModal({ isOpen, onClose, onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [isFrontCamera, setIsFrontCamera] = useState(false);

  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, capturedImage, isFrontCamera]);

  const startCamera = async () => {
    setCameraError('');
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: isFrontCamera ? 'user' : 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn('Camera access error:', err);
      setCameraError('Camera access unavailable or permission denied. You can select a photo from your gallery below.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleSnap = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  const handleGallerySelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedImage(event.target.result);
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
      setCapturedImage(null);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: '#fff' }}>
            <Camera size={20} style={{ verticalAlign: 'middle', marginRight: '8px', color: 'var(--primary)' }} />
            Item Photo Capture
          </h2>
          <button className="btn btn-secondary btn-sm" onClick={onClose}><X size={16}/></button>
        </div>

        <div style={{ position: 'relative', width: '100%', height: '320px', background: '#020617', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
          {capturedImage ? (
            <img src={capturedImage} alt="Captured preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <>
              {cameraError ? (
                <div style={{ padding: '1.5rem', color: 'var(--text-muted)' }}>
                  <p style={{ marginBottom: '1rem' }}>{cameraError}</p>
                  <button className="btn btn-gold" onClick={() => fileInputRef.current?.click()}>
                    <Upload size={16} /> Choose Photo from Gallery
                  </button>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
            </>
          )}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {capturedImage ? (
            <>
              <button className="btn btn-secondary" onClick={handleRetake}>
                <RefreshCw size={16} /> Retake Photo
              </button>
              <button className="btn btn-primary" onClick={handleConfirm}>
                <Check size={16} /> Use Photo
              </button>
            </>
          ) : (
            <>
              {!cameraError && (
                <>
                  <button className="btn btn-primary" onClick={handleSnap}>
                    <Camera size={16} /> Snap Photo
                  </button>
                  <button className="btn btn-secondary" onClick={() => setIsFrontCamera(!isFrontCamera)}>
                    <RefreshCw size={16} /> Switch Camera
                  </button>
                </>
              )}
              <button className="btn btn-gold" onClick={() => fileInputRef.current?.click()}>
                <Upload size={16} /> Select from Gallery
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleGallerySelect}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
