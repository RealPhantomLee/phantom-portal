import React from 'react';

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClass = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }[size];

  return (
    <div className={`${sizeClass} animate-spin`}>
      <svg className="text-white" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
};

export const LoadingOverlay: React.FC = () => (
  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
    <LoadingSpinner size="md" />
  </div>
);

export const ErrorMessage: React.FC<{ error: string | null; onDismiss?: () => void }> = ({
  error,
  onDismiss,
}) => {
  if (!error) return null;

  return (
    <div className="flex items-start gap-3 bg-red-600/20 border border-red-600/50 rounded-lg p-4 text-red-200">
      <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
      <div className="flex-1">
        <p className="text-sm">{error}</p>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="text-red-200 hover:text-red-100 transition">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
};

export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center h-full text-center">
    {icon && <div className="mb-4 text-gray-600 opacity-50">{icon}</div>}
    <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
    {description && <p className="text-gray-400 mb-4">{description}</p>}
    {action && (
      <button
        onClick={action.onClick}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
      >
        {action.label}
      </button>
    )}
  </div>
);

export const SkeletonLoader: React.FC<{ count?: number }> = ({ count = 1 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, idx) => (
      <div key={idx} className="bg-gray-800 rounded-lg p-4 animate-pulse h-16" />
    ))}
  </div>
);
