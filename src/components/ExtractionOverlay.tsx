'use client';

import { useState, useEffect } from 'react';

interface ExtractionOverlayProps {
  urls: string[];
  currentUrl: string | null;
  currentStep: string;
  progress: number;
  isComplete: boolean;
}

export default function ExtractionOverlay({
  urls,
  currentUrl,
  currentStep,
  progress,
  isComplete
}: ExtractionOverlayProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-4 w-[450px] shadow-lg mx-2">
        <h2 className="text-lg font-bold mb-3 text-gray-800">Extracting Information</h2>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
          <div
            className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Current status */}
        <div className="mb-3">
          <p className="text-sm text-gray-600 truncate">
            {currentUrl || 'Preparing...'}
          </p>
          <p className="text-xs text-gray-500">
            {currentStep}
          </p>
        </div>
        
        {/* URLs list */}
        <div className="max-h-32 overflow-y-auto">
          {urls.map((url, index) => (
            <div
              key={url}
              className={`py-1.5 px-2 rounded mb-1 text-xs ${
                currentUrl === url
                  ? 'bg-blue-50 border border-blue-200'
                  : 'bg-gray-50'
              }`}
            >
              <span className="inline-flex items-center text-gray-600">
                {currentUrl === url ? '⚡' : index < urls.indexOf(currentUrl || '') ? '✓' : '○'}
                <span className="ml-1 truncate">{url}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}