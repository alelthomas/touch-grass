'use client'

interface WelcomeScreenProps {
  onStart: () => void;
}

export default function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-green-400 to-green-600 p-4 text-white">
      <h1 className="mb-8 text-4xl font-bold md:text-6xl">🌱 Time to get leafy 🌱</h1>
      <button
        onClick={onStart}
        className="transform rounded-full bg-white px-8 py-4 text-xl font-semibold text-green-600 shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95"
      >
        TOUCH GRASS
      </button>
    </div>
  );
} 