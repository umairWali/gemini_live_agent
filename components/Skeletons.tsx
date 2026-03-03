
import React from 'react';

interface SkeletonProps {
  className?: string;
  count?: number;
}

export const SkeletonText: React.FC<SkeletonProps> = ({ className = '', count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse bg-slate-800/50 rounded ${className}`}
          style={{
            backgroundImage: 'linear-gradient(90deg, rgba(148,163,184,0.05) 25%, rgba(148,163,184,0.1) 50%, rgba(148,163,184,0.05) 75%)',
            backgroundSize: '200% 100%',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite, shimmer 2s linear infinite'
          }}
        />
      ))}
    </>
  );
};

export const SkeletonCard: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div className={`p-6 bg-slate-900/40 border border-slate-800 rounded-[2.5rem] animate-pulse ${className}`}>
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-slate-800" />
        <div className="flex-1">
          <div className="h-4 bg-slate-800 rounded w-1/3 mb-2" />
          <div className="h-3 bg-slate-800 rounded w-1/4" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-slate-800 rounded w-full" />
        <div className="h-3 bg-slate-800 rounded w-5/6" />
        <div className="h-3 bg-slate-800 rounded w-4/6" />
      </div>
    </div>
  );
};

export const SkeletonMessage: React.FC<{ isUser?: boolean }> = ({ isUser = false }) => {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] p-7 rounded-[2.5rem] border ${
        isUser ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-900 border-slate-800/50'
      } animate-pulse`}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 rounded-full bg-slate-800" />
          <div className="h-2 w-24 bg-slate-800 rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-slate-800 rounded w-full" />
          <div className="h-3 bg-slate-800 rounded w-5/6" />
          <div className="h-3 bg-slate-800 rounded w-4/6" />
        </div>
      </div>
    </div>
  );
};

export const LoadingDots: React.FC = () => {
  return (
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" />
    </div>
  );
};

export const PageLoader: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-[1000]">
      <div className="text-center">
        <div className="relative w-24 h-24 mx-auto mb-6">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
          {/* Animated ring */}
          <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
          {/* Inner pulse */}
          <div className="absolute inset-4 rounded-full bg-emerald-500/20 animate-pulse" />
        </div>
        <h2 className="text-xl font-bold text-slate-200 mb-2">Personal AI Operator</h2>
        <p className="text-slate-500 animate-pulse">Initializing systems...</p>
        <div className="mt-4 flex justify-center gap-1">
          <LoadingDots />
        </div>
      </div>
    </div>
  );
};

export default {
  SkeletonText,
  SkeletonCard,
  SkeletonMessage,
  LoadingDots,
  PageLoader
};
