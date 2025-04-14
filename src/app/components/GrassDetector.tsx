'use client'

import { useEffect, useRef, useState } from 'react'
import * as tf from '@tensorflow/tfjs'
import * as mobilenet from '@tensorflow-models/mobilenet'
import * as knnClassifier from '@tensorflow-models/knn-classifier'
import Menu from './Menu'

// Add type definitions for legacy getUserMedia
declare global {
  interface Navigator {
    webkitGetUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
    mozGetUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  }
}

export default function GrassDetector() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [message, setMessage] = useState('Initializing...')
  const [model, setModel] = useState<mobilenet.MobileNet | null>(null)
  const [classifier, setClassifier] = useState<knnClassifier.KNNClassifier | null>(null)
  const [hasCamera, setHasCamera] = useState(false)
  const [isTraining, setIsTraining] = useState(false)

  // Initialize TensorFlow and models
  useEffect(() => {
    const init = async () => {
      try {
        await tf.ready()
        console.log('TensorFlow initialized')

        // Initialize KNN Classifier
        const knn = knnClassifier.create()
        setClassifier(knn)

        // Load MobileNet
        const mobilenetModel = await mobilenet.load()
        setModel(mobilenetModel)

        if (typeof window !== 'undefined' && navigator.mediaDevices) {
          // Ensure getUserMedia is properly bound
          if (!navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia = function(constraints: MediaStreamConstraints) {
              const getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia
              if (!getUserMedia) {
                return Promise.reject(new Error('getUserMedia is not implemented in this browser'))
              }
              return new Promise((resolve, reject) => {
                getUserMedia.call(navigator, constraints, resolve, reject)
              })
            }
          }
          console.log('Media devices API available')
          startCamera()
        } else {
          setMessage('Camera access not supported in this browser.')
          console.error('mediaDevices API not available')
        }
      } catch (error) {
        console.error('Initialization error:', error)
        setMessage('Error initializing. Please ensure camera permissions are granted and refresh.')
      }
    }

    init()
  }, [])

  const startCamera = async () => {
    if (!videoRef.current) return

    try {
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      }

      console.log('Requesting camera with constraints:', constraints)
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
        .catch(async () => {
          console.log('Falling back to any available camera')
          return await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          })
        })

      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
          setHasCamera(true)
          setMessage('Camera ready! Add some training examples or try detection.')
        }
      }
    } catch (error) {
      console.error('Camera access error:', error)
      setMessage('Camera access denied or not available. Please check your browser settings and permissions.')
      setHasCamera(false)
    }
  }

  const addExample = async (classId: 'grass' | 'not_grass') => {
    if (!model || !classifier || !videoRef.current || isTraining) return

    setIsTraining(true)
    try {
      // Get the intermediate activation from MobileNet
      const activation = model.infer(videoRef.current, true)
      // Add the example to the classifier
      classifier.addExample(activation, classId)
      setMessage(`Added ${classId} example! Add more or try detecting.`)
      console.log(`Added example for ${classId}`)
    } catch (error) {
      console.error('Training error:', error)
      setMessage('Error adding example. Please try again.')
    }
    setIsTraining(false)
  }

  const detectGrass = async () => {
    if (!model || !classifier || !videoRef.current || isDetecting || !hasCamera) return

    setIsDetecting(true)
    try {
      // Get the activation from the video element
      const activation = model.infer(videoRef.current, true)
      
      // If we have no training examples, use the basic MobileNet classification
      if (classifier.getNumClasses() === 0) {
        const predictions = await model.classify(videoRef.current)
        console.log('MobileNet predictions:', predictions)
        const grassPrediction = predictions.find(p => 
          p.className.toLowerCase().includes('grass') ||
          p.className.toLowerCase().includes('lawn') ||
          p.className.toLowerCase().includes('field')
        )

        if (grassPrediction && grassPrediction.probability > 0.5) {
          setMessage('Grass detected! 🌱 (Using basic detection - add training examples for better results)')
        } else {
          setMessage('No grass detected. Try again or add training examples!')
        }
      } else {
        // Use the trained KNN classifier
        const result = await classifier.predictClass(activation)
        console.log('KNN prediction:', result)
        
        if (result.label === 'grass' && result.confidences[result.label] > 0.7) {
          setMessage('Grass touched! 🌱 (Confidence: ' + Math.round(result.confidences[result.label] * 100) + '%)')
        } else {
          setMessage('No grass detected. Try again!')
        }
      }
    } catch (error) {
      console.error('Detection error:', error)
      setMessage('Error during detection. Please try again.')
    }
    setIsDetecting(false)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <Menu
        onAddGrassExample={() => addExample('grass')}
        onAddNonGrassExample={() => addExample('not_grass')}
        isTraining={isTraining}
        isModelReady={!!model && !!classifier}
        hasCamera={hasCamera}
      />
      <div className="relative w-full max-w-md aspect-[3/4] bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <button
          onClick={detectGrass}
          disabled={!model || isDetecting || !hasCamera}
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-6 py-3 rounded-full shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {!hasCamera ? 'Camera Not Available' : isDetecting ? 'Detecting...' : 'Detect Grass'}
        </button>
      </div>
      <p className="mt-4 text-center text-lg font-medium text-gray-700">
        {message}
      </p>
    </div>
  )
}
