'use client'

import { useState, useRef } from 'react'

interface MenuProps {
  onAddGrassExample: () => void
  onAddNonGrassExample: () => void
  onExportData: () => void
  onImportData: (event: React.ChangeEvent<HTMLInputElement>) => void
  onClearData: () => void
  isTraining: boolean
  isModelReady: boolean
  hasCamera: boolean
  trainingStats: {
    grass: number
    not_grass: number
  }
}

export default function Menu({
  onAddGrassExample,
  onAddNonGrassExample,
  onExportData,
  onImportData,
  onClearData,
  isTraining,
  isModelReady,
  hasCamera,
  trainingStats,
}: MenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="absolute right-4 top-4 z-50">
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-lg bg-white/90 p-2 shadow-lg transition-colors hover:bg-white"
        aria-label="Menu"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={isOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
          />
        </svg>
      </button>

      {/* Menu Panel */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-72 rounded-lg bg-white p-4 shadow-xl">
          <h3 className="mb-2 text-lg font-semibold">Training Options</h3>

          {/* Training Stats */}
          <div className="mb-4 text-sm text-gray-600">
            <div>Grass examples: {trainingStats.grass}</div>
            <div>Non-grass examples: {trainingStats.not_grass}</div>
          </div>

          {/* Training Buttons */}
          <div className="space-y-2">
            <button
              onClick={() => {
                onAddGrassExample()
                setIsOpen(false)
              }}
              disabled={!isModelReady || isTraining || !hasCamera}
              className="w-full rounded-lg bg-green-500 px-4 py-2 text-sm text-white shadow transition-colors disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              Add Grass Example
            </button>
            <button
              onClick={() => {
                onAddNonGrassExample()
                setIsOpen(false)
              }}
              disabled={!isModelReady || isTraining || !hasCamera}
              className="w-full rounded-lg bg-red-500 px-4 py-2 text-sm text-white shadow transition-colors disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              Add Non-Grass Example
            </button>
          </div>

          {/* Data Management */}
          <div className="mt-4 border-t border-gray-200 pt-4">
            <h4 className="mb-2 text-sm font-semibold">Data Management</h4>
            <div className="space-y-2">
              <button
                onClick={onExportData}
                disabled={
                  !isModelReady ||
                  trainingStats.grass + trainingStats.not_grass === 0
                }
                className="w-full rounded-lg bg-blue-500 px-4 py-2 text-sm text-white shadow transition-colors disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                Export Training Data
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={!isModelReady}
                className="w-full rounded-lg bg-purple-500 px-4 py-2 text-sm text-white shadow transition-colors disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                Import Training Data
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={onImportData}
                accept=".json"
                className="hidden"
              />
              <button
                onClick={() => {
                  if (
                    confirm('Are you sure you want to clear all training data?')
                  ) {
                    onClearData()
                  }
                }}
                disabled={
                  !isModelReady ||
                  trainingStats.grass + trainingStats.not_grass === 0
                }
                className="w-full rounded-lg bg-gray-500 px-4 py-2 text-sm text-white shadow transition-colors disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                Clear All Data
              </button>
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-500">
            Training data is automatically saved in your browser. Export to save
            permanently.
          </div>
        </div>
      )}
    </div>
  )
}
