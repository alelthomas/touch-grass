'use client'

import { useEffect, useRef, useState } from 'react'
import * as tf from '@tensorflow/tfjs'
import * as mobilenet from '@tensorflow-models/mobilenet'
import * as knnClassifier from '@tensorflow-models/knn-classifier'
import Menu from './Menu'
import WelcomeScreen from './WelcomeScreen'
import SuccessScreen from './SuccessScreen'

// Add type definitions for legacy getUserMedia
declare global {
  interface Navigator {
    webkitGetUserMedia?: (
      constraints: MediaStreamConstraints,
      successCallback: (stream: MediaStream) => void,
      errorCallback: (error: Error) => void
    ) => void;
    mozGetUserMedia?: (
      constraints: MediaStreamConstraints,
      successCallback: (stream: MediaStream) => void,
      errorCallback: (error: Error) => void
    ) => void;
  }
}

interface TrainingStats {
  grass: number;
  not_grass: number;
}

// Add new type for app state
type AppState = 'welcome' | 'detecting' | 'success';

export default function GrassDetector() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [message, setMessage] = useState('Initializing...')
  const [model, setModel] = useState<mobilenet.MobileNet | null>(null)
  const [classifier, setClassifier] = useState<knnClassifier.KNNClassifier | null>(null)
  const [hasCamera, setHasCamera] = useState(false)
  const [isTraining, setIsTraining] = useState(false)
  const [trainingStats, setTrainingStats] = useState<TrainingStats>({ grass: 0, not_grass: 0 })
  const [appState, setAppState] = useState<AppState>('welcome')

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

        // Try to load saved examples
        await loadTrainingExamples(knn)

        if (typeof window !== 'undefined' && navigator.mediaDevices) {
          // Ensure getUserMedia is properly bound
          if (!navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia = function(constraints: MediaStreamConstraints) {
              const getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia
              if (!getUserMedia) {
                return Promise.reject(new Error('getUserMedia is not implemented in this browser'))
              }
              return new Promise((resolve, reject) => {
                getUserMedia.bind(navigator)(
                  constraints,
                  (stream) => resolve(stream),
                  (error) => reject(error)
                )
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

    // Cleanup function
    return () => {
      if (classifier) {
        saveTrainingExamples(classifier)
      }
    }
  }, [])

  const loadTrainingExamples = async (knn: knnClassifier.KNNClassifier) => {
    try {
      // Try to load from localStorage first
      const savedData = localStorage.getItem('grassDetectorData')
      if (savedData) {
        const dataset = JSON.parse(savedData)
        // Convert the dataset back to tensors
        Object.entries(dataset).forEach(([label, data]: [string, any]) => {
          const tensor = tf.tensor2d(data.data, [data.shape[0], data.shape[1]])
          knn.addExample(tensor, label)
          setTrainingStats(prev => ({
            ...prev,
            [label]: (prev[label as keyof TrainingStats] || 0) + 1
          }))
        })
        console.log('Loaded training examples from localStorage')
        setMessage('Loaded saved training examples!')
      }
    } catch (error) {
      console.error('Error loading training examples:', error)
    }
  }

  const saveTrainingExamples = async (knn: knnClassifier.KNNClassifier) => {
    try {
      const dataset = knn.getClassifierDataset()
      if (dataset) {
        // Convert dataset to regular arrays for storage
        const datasetObj = Object.entries(dataset).reduce((acc: any, [label, data]: [string, any]) => {
          const tensorData = data.arraySync()
          acc[label] = {
            shape: data.shape,
            data: Array.from(tensorData)
          }
          return acc
        }, {})

        localStorage.setItem('grassDetectorData', JSON.stringify(datasetObj))
        console.log('Saved training examples to localStorage')
      }
    } catch (error) {
      console.error('Error saving training examples:', error)
    }
  }

  const exportTrainingData = () => {
    if (!classifier) return
    
    try {
      const dataset = classifier.getClassifierDataset()
      if (dataset) {
        const datasetObj = Object.entries(dataset).reduce((acc: any, [label, data]: [string, any]) => {
          const tensorData = data.arraySync()
          acc[label] = {
            shape: data.shape,
            data: Array.from(tensorData)
          }
          return acc
        }, {})

        const dataStr = JSON.stringify(datasetObj)
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
        
        const linkElement = document.createElement('a')
        linkElement.setAttribute('href', dataUri)
        linkElement.setAttribute('download', 'grass-detector-training.json')
        document.body.appendChild(linkElement)
        linkElement.click()
        document.body.removeChild(linkElement)
      }
    } catch (error) {
      console.error('Error exporting training data:', error)
      setMessage('Error exporting training data')
    }
  }

  const importTrainingData = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!classifier || !event.target.files?.[0]) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const dataset = JSON.parse(e.target?.result as string)
        Object.entries(dataset).forEach(([label, data]: [string, any]) => {
          const tensor = tf.tensor2d(data.data, [data.shape[0], data.shape[1]])
          classifier.addExample(tensor, label)
          setTrainingStats(prev => ({
            ...prev,
            [label]: (prev[label as keyof TrainingStats] || 0) + 1
          }))
        })
        setMessage('Successfully imported training data!')
        await saveTrainingExamples(classifier)
      } catch (error) {
        console.error('Error importing training data:', error)
        setMessage('Error importing training data')
      }
    }
    reader.readAsText(event.target.files[0])
  }

  const clearTrainingData = async () => {
    if (!classifier) return
    
    classifier.clearAllClasses()
    localStorage.removeItem('grassDetectorData')
    setTrainingStats({ grass: 0, not_grass: 0 })
    setMessage('All training data cleared!')
  }

  const addExample = async (classId: 'grass' | 'not_grass') => {
    if (!model || !classifier || !videoRef.current || isTraining) return

    setIsTraining(true)
    try {
      // Get the intermediate activation from MobileNet
      const activation = model.infer(videoRef.current, true)
      // Add the example to the classifier
      classifier.addExample(activation, classId)
      setTrainingStats(prev => ({
        ...prev,
        [classId]: prev[classId] + 1
      }))
      await saveTrainingExamples(classifier)
      setMessage(`Added ${classId} example! (Total: ${trainingStats[classId] + 1})`)
      console.log(`Added example for ${classId}`)
    } catch (error) {
      console.error('Training error:', error)
      setMessage('Error adding example. Please try again.')
    }
    setIsTraining(false)
  }

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
          setMessage('Camera ready. Time to touch some grass!')
        }
      }
    } catch (error) {
      console.error('Camera access error:', error)
      setMessage('Camera access denied or not available. Please check your browser settings and permissions.')
      setHasCamera(false)
    }
  }

  const detectGrass = async () => {
    if (!model || !classifier || !videoRef.current || isDetecting || !hasCamera) return

    setIsDetecting(true)
    try {
      const activation = model.infer(videoRef.current, true)
      
      if (classifier.getNumClasses() === 0) {
        const predictions = await model.classify(videoRef.current)
        console.log('MobileNet predictions:', predictions)
        const grassPrediction = predictions.find(p => 
          p.className.toLowerCase().includes('grass') ||
          p.className.toLowerCase().includes('lawn') ||
          p.className.toLowerCase().includes('field')
        )

        if (grassPrediction && grassPrediction.probability > 0.5) {
          setAppState('success')
        } else {
          setMessage('That ain\'t grass. 🤨 Try again!')
        }
      } else {
        const result = await classifier.predictClass(activation)
        console.log('KNN prediction:', result)
        
        if (result.label === 'grass' && result.confidences[result.label] > 0.7) {
          setAppState('success')
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

  if (appState === 'welcome') {
    return <WelcomeScreen onStart={() => setAppState('detecting')} />
  }

  if (appState === 'success') {
    return <SuccessScreen />
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <Menu
        onAddGrassExample={() => addExample('grass')}
        onAddNonGrassExample={() => addExample('not_grass')}
        onExportData={exportTrainingData}
        onImportData={importTrainingData}
        onClearData={clearTrainingData}
        isTraining={isTraining}
        isModelReady={!!model && !!classifier}
        hasCamera={hasCamera}
        trainingStats={trainingStats}
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
