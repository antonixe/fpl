"use client";

import { memo } from "react";

interface ErrorStateProps {
  title?: string;
  message: string;
  retry?: () => void;
}

export const ErrorState = memo(function ErrorState({ title = "Something went wrong", message, retry }: ErrorStateProps) {
  return (
    <div className="card border-[var(--danger)] border-opacity-30">
      <div className="p-6 text-center">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--danger-bg)] mb-3">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M10 6v4m0 4h.01M18 10a8 8 0 11-16 0 8 8 0 0116 0z" stroke="var(--danger)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 className="font-semibold text-sm mb-1">{title}</h3>
        <p className="text-xs text-[var(--text-tertiary)] mb-4 max-w-md mx-auto">{message}</p>
        {retry && (
          <button onClick={retry} className="btn btn-secondary text-xs">
            Try Again
          </button>
        )}
      </div>
    </div>
  );
});

export const EmptyState = memo(function EmptyState({ icon, title, message }: { icon: string; title: string; message: string }) {
  return (
    <div className="card">
      <div className="text-center py-16">
        <div className="text-4xl mb-4 opacity-20">{icon}</div>
        <div className="text-sm font-medium text-[var(--text-secondary)]">{title}</div>
        <div className="text-xs text-[var(--text-tertiary)] mt-1">{message}</div>
      </div>
    </div>
  );
});
