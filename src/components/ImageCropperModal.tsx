import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, ZoomIn, ZoomOut, Check, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ImageCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (compressedDataUrl: string) => void;
  title?: string;
}

export default function ImageCropperModal({
  isOpen,
  onClose,
  onCropComplete,
  title = "Crop & Optimize Image"
}: ImageCropperModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [naturalDimensions, setNaturalDimensions] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragPanStart, setDragPanStart] = useState({ x: 0, y: 0 });
  const [dragOver, setDragOver] = useState(false);

  const cropSize = 300; // Size of the crop window in UI
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reset when modal opens or closes
  useEffect(() => {
    if (!isOpen) {
      setImageSrc(null);
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
      setNaturalDimensions({ width: 0, height: 0 });
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadImage(file);
    }
  };

  const loadImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageSrc(event.target.result as string);
        setZoom(1.0);
        setPan({ x: 0, y: 0 });
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag and Drop files
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      loadImage(file);
    }
  };

  const handleImageLoaded = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight
    });
  };

  // Calculate scaling factors
  const baseScale = naturalDimensions.width && naturalDimensions.height
    ? Math.max(cropSize / naturalDimensions.width, cropSize / naturalDimensions.height)
    : 1;

  const currentScale = baseScale * zoom;
  const displayWidth = naturalDimensions.width * currentScale;
  const displayHeight = naturalDimensions.height * currentScale;

  const centerX = (cropSize - displayWidth) / 2;
  const centerY = (cropSize - displayHeight) / 2;

  // Clamping Pan values to keep the image covering the 1:1 box
  const getClampedPan = (pX: number, pY: number, currentZoom: number) => {
    const cScale = baseScale * currentZoom;
    const dWidth = naturalDimensions.width * cScale;
    const dHeight = naturalDimensions.height * cScale;
    const cX = (cropSize - dWidth) / 2;
    const cY = (cropSize - dHeight) / 2;

    const minPanX = cropSize - cX - dWidth;
    const maxPanX = -cX;
    const minPanY = cropSize - cY - dHeight;
    const maxPanY = -cY;

    return {
      x: Math.min(Math.max(pX, minPanX), maxPanX),
      y: Math.min(Math.max(pY, minPanY), maxPanY)
    };
  };

  // Mouse/Touch Drag event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageSrc) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragPanStart({ ...pan });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    const targetPan = {
      x: dragPanStart.x + dx,
      y: dragPanStart.y + dy
    };
    setPan(getClampedPan(targetPan.x, targetPan.y, zoom));
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Touch support
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!imageSrc || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX, y: touch.clientY });
    setDragPanStart({ ...pan });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragStart.x;
    const dy = touch.clientY - dragStart.y;
    const targetPan = {
      x: dragPanStart.x + dx,
      y: dragPanStart.y + dy
    };
    setPan(getClampedPan(targetPan.x, targetPan.y, zoom));
  };

  // Adjust zoom smoothly and maintain center bounds
  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
    setPan(prev => getClampedPan(prev.x, prev.y, newZoom));
  };

  const handleSave = () => {
    if (!imageRef.current || !naturalDimensions.width || !naturalDimensions.height) return;

    const img = imageRef.current;
    
    // Top left coordinates of the crop zone in the crop box coordinates (0, 0)
    // The top left of the image is at: centerX + pan.x, centerY + pan.y
    const leftOffset = centerX + pan.x;
    const topOffset = centerY + pan.y;

    // Convert crop box offset back to original image space
    const sourceX = -leftOffset / currentScale;
    const sourceY = -topOffset / currentScale;
    const sourceWidth = cropSize / currentScale;
    const sourceHeight = cropSize / currentScale;

    // Create a 800x800 Canvas for high quality compressed JPEG output
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Enable high-quality image scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(
        img,
        sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, 800, 800
      );

      // Compress to JPEG with 0.82 quality to dramatically reduce size without quality loss
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
      onCropComplete(compressedDataUrl);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" id="image-cropper-modal">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-none border border-black max-w-lg w-full flex flex-col overflow-hidden max-h-[90vh]"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#EEEEEE] flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-black">{title}</h3>
              <button
                onClick={onClose}
                className="text-[#717171] hover:text-black transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content Area */}
            <div className="p-6 flex-1 flex flex-col items-center justify-center overflow-y-auto">
              {!imageSrc ? (
                /* Drag & Drop Zone */
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full aspect-square max-w-[320px] border border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-200 ${
                    dragOver 
                      ? 'border-black bg-[#FAF9F6]' 
                      : 'border-[#EEEEEE] hover:border-black bg-white'
                  }`}
                >
                  <Upload className="h-8 w-8 text-[#717171] mb-3" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-black">Drag & Drop Product Image</span>
                  <span className="text-[10px] text-[#717171] mt-1">or click to browse local files</span>
                  <span className="text-[9px] text-[#A1A1A1] mt-3 uppercase tracking-wider">Supports JPEG, PNG, WEBP</span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              ) : (
                /* Crop & Adjust View */
                <div className="w-full flex flex-col items-center space-y-6">
                  {/* Cropping Frame */}
                  <div 
                    className="relative border border-black select-none cursor-move overflow-hidden bg-[#FAF9F6]"
                    style={{ width: `${cropSize}px`, height: `${cropSize}px` }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUpOrLeave}
                    onMouseLeave={handleMouseUpOrLeave}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleMouseUpOrLeave}
                  >
                    {/* The Image inside crop boundary */}
                    <img
                      ref={imageRef}
                      src={imageSrc}
                      alt="Crop Source"
                      onLoad={handleImageLoaded}
                      draggable={false}
                      className="absolute origin-center max-w-none max-h-none pointer-events-none select-none"
                      style={{
                        width: `${displayWidth}px`,
                        height: `${displayHeight}px`,
                        left: `${centerX + pan.x}px`,
                        top: `${centerY + pan.y}px`,
                      }}
                    />

                    {/* Dark overlay showing crop boundaries */}
                    <div className="absolute inset-0 border border-white pointer-events-none" style={{ boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)' }} />
                    <div className="absolute top-2 left-2 bg-black/75 px-2 py-1 text-[8px] font-bold text-white uppercase tracking-wider pointer-events-none">
                      Drag to Pan
                    </div>
                  </div>

                  {/* Zoom Controls */}
                  <div className="w-full max-w-[320px] space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#717171]">
                      <span>Zoom Adjustment</span>
                      <span className="font-mono">{Math.round(zoom * 100)}%</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button 
                        type="button"
                        onClick={() => handleZoomChange(Math.max(1.0, zoom - 0.1))}
                        disabled={zoom <= 1.0}
                        className="p-1 border border-[#EEEEEE] hover:border-black text-black transition-colors disabled:opacity-30 disabled:hover:border-[#EEEEEE]"
                      >
                        <ZoomOut className="h-3.5 w-3.5" />
                      </button>
                      <input
                        type="range"
                        min="1.0"
                        max="3.0"
                        step="0.05"
                        value={zoom}
                        onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                        className="flex-1 accent-black h-1 bg-[#EEEEEE] appearance-none cursor-pointer"
                      />
                      <button 
                        type="button"
                        onClick={() => handleZoomChange(Math.min(3.0, zoom + 0.1))}
                        disabled={zoom >= 3.0}
                        className="p-1 border border-[#EEEEEE] hover:border-black text-black transition-colors disabled:opacity-30 disabled:hover:border-[#EEEEEE]"
                      >
                        <ZoomIn className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div className="px-6 py-4 border-t border-[#EEEEEE] bg-[#FAF9F6] flex justify-between gap-3">
              {imageSrc ? (
                <button
                  type="button"
                  onClick={() => setImageSrc(null)}
                  className="border border-[#EEEEEE] hover:border-black text-black text-[10px] font-bold uppercase tracking-widest px-4 py-3 transition-colors flex items-center space-x-1"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Choose Another</span>
                </button>
              ) : (
                <div />
              )}
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="border border-[#EEEEEE] hover:border-black text-black text-[10px] font-bold uppercase tracking-widest px-5 py-3 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!imageSrc}
                  className="bg-black hover:bg-[#333333] text-white text-[10px] font-bold uppercase tracking-widest px-6 py-3 transition-colors flex items-center space-x-1.5 disabled:bg-[#717171]"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Crop & Apply</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
