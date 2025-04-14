'use client'

export default function SuccessScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-green-400 to-green-600 p-4 text-white">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">Grass secured! 😤🌱</h1>
        <p className="text-xl opacity-90">Time to go back inside.</p>
        <p className="mt-2 text-lg opacity-80">See you tomorrow!</p>
      </div>
    </div>
  );
} 