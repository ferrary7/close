const LoadingSpinner = ({ size = 'md', color = 'orange' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const colorClasses = {
    orange: 'border-orange-500',
    pink: 'border-pink-500',
    white: 'border-white'
  };

  return (
    <div className={`${sizeClasses[size]} border-2 ${colorClasses[color]} border-t-transparent rounded-full animate-spin`} />
  );
};

const LoadingScreen = ({ message = 'Loading...' }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-rose-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-6">
          <LoadingSpinner size="md" color="white" />
        </div>
        
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          {message}
        </h2>
        
        <div className="flex items-center justify-center space-x-1 text-gray-600">
          <span className="animate-bounce delay-0">💖</span>
          <span className="animate-bounce delay-100">💕</span>
          <span className="animate-bounce delay-200">💖</span>
        </div>
      </div>
    </div>
  );
};

const LoadingOverlay = ({ message = 'Loading...' }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full text-center">
        <LoadingSpinner size="lg" color="orange" />
        <p className="mt-4 text-gray-700 font-medium">{message}</p>
      </div>
    </div>
  );
};

export { LoadingSpinner, LoadingScreen, LoadingOverlay };
export default LoadingScreen;
