'use client';

import { useState } from 'react';

interface MenuProps {
  onAddGrassExample: () => void;
  onAddNonGrassExample: () => void;
  isTraining: boolean;
  isModelReady: boolean;
  hasCamera: boolean;
}

export default function Menu({
  onAddGrassExample,
  onAddNonGrassExample,
  isTraining,
  isModelReady,
  hasCamera
}: MenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute top-4 right-4 z-50">
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg bg-white/90 shadow-lg hover:bg-white transition-colors"
        aria-label="Menu"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
          />
        </svg>
      </button>

      {/* Menu Panel */}
      {isOpen && (
        <div className="absolute top-12 right-0 w-64 bg-white rounded-lg shadow-xl p-4">
          <h3 className="text-lg font-semibold mb-4">Training Options</h3>
          <div className="space-y-2">
            <button
              onClick={() => {
                onAddGrassExample();
                setIsOpen(false);
              }}
              disabled={!isModelReady || isTraining || !hasCamera}
              className="w-full bg-green-500 text-white px-4 py-2 rounded-lg shadow disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
            >
              Add Grass Example
            </button>
            <button
              onClick={() => {
                onAddNonGrassExample();
                setIsOpen(false);
              }}
              disabled={!isModelReady || isTraining || !hasCamera}
              className="w-full bg-red-500 text-white px-4 py-2 rounded-lg shadow disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
            >
              Add Non-Grass Example
            </button>
          </div>
          <div className="mt-4 text-xs text-gray-500">
            Add examples to improve detection accuracy
          </div>
        </div>
      )}
    </div>
  );
} 