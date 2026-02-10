// src/app/admin/qr-codes/page.tsx
'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface Museum {
  id: string;
  name: string;
  description?: string;
  location?: string;
}

interface Artwork {
  id: string;
  title: string;
  artist: string;
  year?: number;
  museum: string;
}

type QRSize = '2inch' | '4inch' | '8x10' | 'custom';

const QR_SIZE_PRESETS = {
  '2inch': { pixels: 600, label: '2" Label (600x600)' },
  '4inch': { pixels: 1200, label: '4" Placard (1200x1200)' },
  '8x10': { pixels: 2400, label: '8x10" Poster (2400x2400)' },
  'custom': { pixels: 800, label: 'Custom Size' }
};

export default function QRCodesPage() {
  const [museums, setMuseums] = useState<Museum[]>([]);
  const [selectedMuseum, setSelectedMuseum] = useState<string>('');
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedSize, setSelectedSize] = useState<QRSize>('4inch');
  const [customSize, setCustomSize] = useState(800);
  const [selectedArtworks, setSelectedArtworks] = useState<Set<string>>(new Set());
  
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());

  useEffect(() => {
    loadMuseums();
  }, []);

  useEffect(() => {
    if (selectedMuseum) {
      loadArtworks(selectedMuseum);
    }
  }, [selectedMuseum]);

  const loadMuseums = async () => {
    try {
      const response = await fetch('/api/museums');
      if (response.ok) {
        const data = await response.json();
        setMuseums(data);
        if (data.length > 0) {
          setSelectedMuseum(data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load museums:', error);
    }
  };

  const loadArtworks = async (museumId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/museum/${museumId}/artworks`);
      if (response.ok) {
        const data = await response.json();
        setArtworks(data);
        setSelectedArtworks(new Set());
      }
    } catch (error) {
      console.error('Failed to load artworks:', error);
    } finally {
      setLoading(false);
    }
  };


  const getQRSize = () => {
    if (selectedSize === 'custom') return customSize;
    return QR_SIZE_PRESETS[selectedSize].pixels;
  };

   const generateQRCode = async (artworkId: string, museumId: string): Promise<string> => {
    // NEW: QR codes now contain just the artwork ID (not the full URL)
    // This makes them work everywhere, including the initial /scan page
    const qrContent = artworkId;  // Simple! Just use the artwork ID
    
    const size = getQRSize();
    
    try {
      const dataUrl = await QRCode.toDataURL(qrContent, {
        width: size,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      return dataUrl;
    } catch (error) {
      console.error('QR generation error:', error);
      throw error;
    }
  };

  const downloadSingleQR = async (artwork: Artwork) => {
    // Now downloads label instead of plain QR
    await generatePrintableLabel(artwork);
  };

  const downloadAllQRs = async () => {
    if (artworks.length === 0) {
      alert('No artworks to generate QR codes for');
      return;
    }

    setGenerating(true);
    const zip = new JSZip();
    const museum = museums.find(m => m.id === selectedMuseum);

    try {
      for (const artwork of artworks) {
        // Generate label instead of plain QR
        const labelBlob = await generateLabelBlob(artwork);
        
        // Add to zip
        const filename = `${artwork.id}-${artwork.title.replace(/[^a-z0-9]/gi, '_').substring(0, 30)}.png`;
        zip.file(filename, labelBlob);
      }

      // Generate zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, `qr-labels-${museum?.name || selectedMuseum}-${Date.now()}.zip`);
      
      alert(`Successfully generated ${artworks.length} QR labels!`);
    } catch (error) {
      console.error('Batch generation error:', error);
      alert('Failed to generate all QR labels');
    } finally {
      setGenerating(false);
    }
  };

  const downloadSelectedQRs = async () => {
    if (selectedArtworks.size === 0) {
      alert('Please select at least one artwork');
      return;
    }

    setGenerating(true);
    const zip = new JSZip();
    const museum = museums.find(m => m.id === selectedMuseum);

    try {
      const selected = artworks.filter(a => selectedArtworks.has(a.id));
      
      for (const artwork of selected) {
        // Generate label instead of plain QR
        const labelBlob = await generateLabelBlob(artwork);
        
        const filename = `${artwork.id}-${artwork.title.replace(/[^a-z0-9]/gi, '_').substring(0, 30)}.png`;
        zip.file(filename, labelBlob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, `qr-labels-selected-${museum?.name || selectedMuseum}-${Date.now()}.zip`);
      
      alert(`Successfully generated ${selectedArtworks.size} QR labels!`);
    } catch (error) {
      console.error('Batch generation error:', error);
      alert('Failed to generate selected QR labels');
    } finally {
      setGenerating(false);
    }
  };

  const generateLabelBlob = async (artwork: Artwork): Promise<Blob> => {
    const qrDataUrl = await generateQRCode(artwork.id, artwork.museum);
    const museum = museums.find(m => m.id === artwork.museum);
    
    // Create a canvas for the label
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    const qrSize = getQRSize();
    const labelWidth = qrSize + 200;
    const labelHeight = qrSize + 150;
    
    canvas.width = labelWidth;
    canvas.height = labelHeight;

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, labelWidth, labelHeight);

    // Load and draw QR code
    const qrImage = new Image();
    qrImage.src = qrDataUrl;
    
    await new Promise((resolve) => {
      qrImage.onload = resolve;
    });

    const qrX = (labelWidth - qrSize) / 2;
    ctx.drawImage(qrImage, qrX, 50, qrSize, qrSize);

    // Add text
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    
    // Title
    ctx.font = 'bold 32px Arial';
    ctx.fillText(artwork.title.substring(0, 40), labelWidth / 2, qrSize + 90);
    
    // Artist
    ctx.font = '24px Arial';
    ctx.fillText(artwork.artist, labelWidth / 2, qrSize + 125);
    
    // Museum
    ctx.font = '20px Arial';
    ctx.fillStyle = '#666666';
    ctx.fillText(museum?.name || artwork.museum, labelWidth / 2, 30);

    // Convert canvas to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      }, 'image/png');
    });
  };

  const generatePrintableLabel = async (artwork: Artwork) => {
    setGenerating(true);
    try {
      const qrDataUrl = await generateQRCode(artwork.id, artwork.museum);
      const museum = museums.find(m => m.id === artwork.museum);
      
      // Create a canvas for the label
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      const qrSize = getQRSize();
      const labelWidth = qrSize + 200;
      const labelHeight = qrSize + 150;
      
      canvas.width = labelWidth;
      canvas.height = labelHeight;

      // White background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, labelWidth, labelHeight);

      // Load and draw QR code
      const qrImage = new Image();
      qrImage.src = qrDataUrl;
      
      await new Promise((resolve) => {
        qrImage.onload = resolve;
      });

      const qrX = (labelWidth - qrSize) / 2;
      ctx.drawImage(qrImage, qrX, 50, qrSize, qrSize);

      // Add text
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      
      // Title
      ctx.font = 'bold 32px Arial';
      ctx.fillText(artwork.title.substring(0, 40), labelWidth / 2, qrSize + 90);
      
      // Artist
      ctx.font = '24px Arial';
      ctx.fillText(artwork.artist, labelWidth / 2, qrSize + 125);
      
      // Museum
      ctx.font = '20px Arial';
      ctx.fillStyle = '#666666';
      ctx.fillText(museum?.name || artwork.museum, labelWidth / 2, 30);

      // Download
      const link = document.createElement('a');
      link.download = `label-${artwork.museum}-${artwork.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
    } catch (error) {
      console.error('Label generation error:', error);
      alert('Failed to generate printable label');
    } finally {
      setGenerating(false);
    }
  };

  const toggleArtwork = (artworkId: string) => {
    const newSelected = new Set(selectedArtworks);
    if (newSelected.has(artworkId)) {
      newSelected.delete(artworkId);
    } else {
      newSelected.add(artworkId);
    }
    setSelectedArtworks(newSelected);
  };

  const toggleAll = () => {
    if (selectedArtworks.size === artworks.length) {
      setSelectedArtworks(new Set());
    } else {
      setSelectedArtworks(new Set(artworks.map(a => a.id)));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center text-sm text-gray-500 mb-2">
            <Link href="/admin/dashboard" className="hover:text-blue-600">
              Admin Dashboard
            </Link>
            <svg className="w-4 h-4 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span>QR Code Generator</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">QR Code Generator</h1>
          <p className="text-gray-600">Generate printable QR codes for museum artworks</p>
        </div>

        {/* Settings Panel */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Museum Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Museum
              </label>
              <select
                value={selectedMuseum}
                onChange={(e) => setSelectedMuseum(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {museums.map(museum => (
                  <option key={museum.id} value={museum.id}>
                    {museum.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Size Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                QR Code Size
              </label>
              <select
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value as QRSize)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(QR_SIZE_PRESETS).map(([key, preset]) => (
                  <option key={key} value={key}>
                    {preset.label}
                  </option>
                ))}
              </select>
              
              {selectedSize === 'custom' && (
                <input
                  type="number"
                  value={customSize}
                  onChange={(e) => setCustomSize(parseInt(e.target.value) || 800)}
                  min="200"
                  max="4000"
                  step="100"
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Custom size in pixels"
                />
              )}
            </div>
          </div>

          {/* Batch Actions */}
          <div className="mt-6 flex gap-3 flex-wrap">
            <button
              onClick={downloadAllQRs}
              disabled={generating || artworks.length === 0}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download All ({artworks.length})
            </button>

            <button
              onClick={downloadSelectedQRs}
              disabled={generating || selectedArtworks.size === 0}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Download Selected ({selectedArtworks.size})
            </button>

            <button
              onClick={toggleAll}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
            >
              {selectedArtworks.size === artworks.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {generating && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="text-blue-800 text-sm">Generating QR codes...</span>
            </div>
          )}
        </div>

        {/* Artworks Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading artworks...</p>
          </div>
        ) : artworks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Artworks Found</h3>
            <p className="text-gray-600">This museum has no artworks yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Artworks ({artworks.length})
              </h2>
            </div>
            
            <div className="divide-y divide-gray-200">
              {artworks.map(artwork => (
                <div key={artwork.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedArtworks.has(artwork.id)}
                      onChange={() => toggleArtwork(artwork.id)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />

                    {/* Artwork Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {artwork.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {artwork.artist} {artwork.year && `• ${artwork.year}`}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">
                        ID: {artwork.id}
                      </p>
               
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => downloadSingleQR(artwork)}
                        disabled={generating}
                        className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 flex items-center gap-1"
                        title="Download printable label"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">📋 Usage Instructions</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• <strong>Single Label:</strong> Click "Download" button to get a printable label with QR code + artwork details</li>
            <li>• <strong>Batch Download:</strong> Select multiple artworks and click "Download Selected" for a ZIP file</li>
            <li>• <strong>All Artworks:</strong> Click "Download All" to get a ZIP with labels for every artwork in the museum</li>
            <li>• <strong>Size Options:</strong> Choose from preset sizes or enter custom dimensions</li>
            <li>• <strong>Label Format:</strong> Each label includes QR code, artwork title, artist name, and museum name</li>
            <li>• <strong>High Quality:</strong> All QR codes use error correction level H for maximum durability</li>
          </ul>
        </div>
      </div>
    </div>
  );
}