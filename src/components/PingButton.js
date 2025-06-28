import { useState } from 'react';
import { FiHeart } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const PingButton = ({ onPing, disabled = false, lastPing = null }) => {
  const [isPinging, setIsPinging] = useState(false);
  const [ripples, setRipples] = useState([]);

  const handlePing = async () => {
    if (disabled || isPinging) return;

    setIsPinging(true);

    // Create ripple effect
    const newRipple = {
      id: Date.now(),
      x: Math.random() * 100,
      y: Math.random() * 100,
    };
    setRipples(prev => [...prev, newRipple]);

    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
    }, 1000);

    try {
      await onPing();
      
      // Success feedback
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} 
          max-w-md w-full bg-gradient-to-r from-pink-500 to-rose-500 
          shadow-lg rounded-lg pointer-events-auto flex items-center p-4`}>
          <div className="flex items-center">
            <span className="text-2xl mr-3">💖</span>
            <div>
              <p className="text-sm font-medium text-white">
                Ping sent!
              </p>
              <p className="text-xs text-pink-100">
                Your person will feel the love
              </p>
            </div>
          </div>
        </div>
      ), {
        duration: 3000,
        position: 'top-center',
      });

    } catch (error) {
      console.error('Error sending ping:', error);
      toast.error('Failed to send ping. Please try again.');
    } finally {
      setIsPinging(false);
    }
  };

  // Calculate time since last ping
  const getTimeSinceLastPing = () => {
    if (!lastPing) return null;
    
    const now = new Date();
    const lastPingTime = new Date(lastPing.seconds * 1000);
    const diffInMinutes = Math.floor((now - lastPingTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const timeSinceLastPing = getTimeSinceLastPing();

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Main ping button */}
      <div className="relative">
        {/* Ripple effects */}
        {ripples.map((ripple) => (
          <div
            key={ripple.id}
            className="absolute inset-0 rounded-full border-2 border-pink-400 opacity-70 animate-ping"
            style={{
              left: `${ripple.x}%`,
              top: `${ripple.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}

        <button
          onClick={handlePing}
          disabled={disabled || isPinging}
          className={`
            relative w-20 h-20 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-full shadow-2xl
            flex items-center justify-center
            transition-all duration-300 
            ${disabled || isPinging 
              ? 'opacity-50 cursor-not-allowed scale-95' 
              : 'hover:scale-110 active:scale-95 hover:shadow-pink-500/50'
            }
            focus:outline-none focus:ring-4 focus:ring-pink-400/50
          `}
        >
          {/* Heart icon */}
          <FiHeart 
            size={28} 
            className={`
              text-white relative z-10
              ${isPinging ? 'animate-heart-beat' : ''}
            `}
            fill="currentColor"
          />
        </button>
      </div>

      {/* Last ping indicator */}
      {timeSinceLastPing && (
        <p className="text-xs text-white/60 bg-white/10 rounded-full px-3 py-1 backdrop-blur-sm border border-white/20">
          Last: {timeSinceLastPing}
        </p>
      )}

      {/* Floating hearts animation when pinging */}
      {isPinging && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-float-up text-pink-400"
              style={{
                left: `${20 + i * 15}%`,
                animationDelay: `${i * 0.2}s`,
                fontSize: '1.5rem',
              }}
            >
              💖
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PingButton;
