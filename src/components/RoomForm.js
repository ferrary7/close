import { useState, useEffect } from 'react';
import { FiUsers, FiLock, FiHeart } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const RoomForm = ({ onCreateRoom, onJoinRoom, isLoading = false, initialRoomId = null }) => {
  const [mode, setMode] = useState(initialRoomId ? 'join' : 'join'); // 'join' or 'create'
  const [formData, setFormData] = useState({
    roomName: '',
    roomId: initialRoomId || '',
    password: ''
  });

  // Update form data when initialRoomId changes
  useEffect(() => {
    if (initialRoomId) {
      setFormData(prev => ({
        ...prev,
        roomId: initialRoomId
      }));
      setMode('join'); // Auto-switch to join mode if room ID is provided
    }
  }, [initialRoomId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (mode === 'create') {
      if (!formData.roomName.trim()) {
        toast.error('Please enter a room name');
        return;
      }
      if (!formData.password.trim()) {
        toast.error('Please enter a password');
        return;
      }
      
      await onCreateRoom(formData.roomName.trim(), formData.password.trim());
    } else {
      if (!formData.roomId.trim()) {
        toast.error('Please enter a room ID');
        return;
      }
      if (!formData.password.trim()) {
        toast.error('Please enter the password');
        return;
      }
      
      await onJoinRoom(formData.roomId.trim(), formData.password.trim());
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    // Preserve roomId from URL when switching modes, only clear other fields
    setFormData(prev => ({ 
      roomName: '', 
      roomId: initialRoomId || '', 
      password: '' 
    }));
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
          <FiHeart size={40} className="text-white" fill="currentColor" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
          Welcome to CLOSE
        </h1>
        <p className="text-white/80 text-lg leading-relaxed">
          Your private space to stay connected with your person
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-1 mb-8">
        <button
          onClick={() => switchMode('join')}
          className={`
            flex-1 py-4 px-6 rounded-xl font-semibold transition-all duration-200
            ${mode === 'join' 
              ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm' 
              : 'text-white/70 hover:text-white/90 hover:bg-white/5'
            }
          `}
        >
          Join Room
        </button>
        <button
          onClick={() => switchMode('create')}
          className={`
            flex-1 py-4 px-6 rounded-xl font-semibold transition-all duration-200
            ${mode === 'create' 
              ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm' 
              : 'text-white/70 hover:text-white/90 hover:bg-white/5'
            }
          `}
        >
          Create Room
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {mode === 'create' ? (
          <div>
            <label htmlFor="roomName" className="block text-sm font-semibold text-white mb-3">
              Room Name
            </label>
            <div className="relative">
              <FiUsers className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60" size={20} />
              <input
                type="text"
                id="roomName"
                name="roomName"
                value={formData.roomName}
                onChange={handleInputChange}
                placeholder="Our Special Place"
                className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder-white/60 rounded-2xl focus:ring-2 focus:ring-pink-400/50 focus:border-pink-400/50 transition-all duration-300"
                disabled={isLoading}
                maxLength={50}
              />
            </div>
          </div>
        ) : (
          <div>
            <label htmlFor="roomId" className="flex items-center text-sm font-semibold text-white mb-3">
              Room ID
              {initialRoomId && (
                <span className="ml-3 text-xs text-emerald-300 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-400/30">
                  ✓ From shared link
                </span>
              )}
            </label>
            <div className="relative">
              <FiUsers className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60" size={20} />
              <input
                type="text"
                id="roomId"
                name="roomId"
                value={formData.roomId}
                onChange={handleInputChange}
                placeholder="Enter room ID"
                className={`w-full pl-12 pr-4 py-4 backdrop-blur-xl border text-white placeholder-white/60 rounded-2xl focus:ring-2 focus:border-pink-400/50 transition-all duration-300 ${
                  initialRoomId 
                    ? 'border-emerald-400/50 bg-emerald-500/10 focus:ring-emerald-400/50' 
                    : 'border-white/20 bg-white/10 focus:ring-pink-400/50'
                }`}
                disabled={isLoading}
              />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-white mb-3">
            Password
          </label>
          <div className="relative">
            <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60" size={20} />
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter password"
              className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder-white/60 rounded-2xl focus:ring-2 focus:ring-pink-400/50 focus:border-pink-400/50 transition-all duration-300"
              disabled={isLoading}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`
            w-full py-5 px-6 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white font-bold text-lg rounded-2xl shadow-2xl
            transition-all duration-300 transform
            ${isLoading 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:scale-105 active:scale-95 hover:shadow-pink-500/50'
            }
            focus:outline-none focus:ring-4 focus:ring-pink-400/50
          `}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full mr-3"></div>
              {mode === 'create' ? 'Creating Magic...' : 'Joining...'}
            </div>
          ) : (
            <span className="flex items-center justify-center">
              {mode === 'create' ? '✨ Create Our Space' : '💖 Join Our Space'}
            </span>
          )}
        </button>
      </form>

      {/* Info text */}
      <div className="mt-8 glass-effect border border-white/20 p-6 rounded-3xl slide-up-enter">
        <div className="flex items-start space-x-4">
          <div className="text-3xl">{mode === 'create' ? '🔐' : '🗝️'}</div>
          <p className="text-sm text-white/80 leading-relaxed">
            {mode === 'create' 
              ? 'Create a private room for you and your person. Share the Room ID and password with them to connect.' 
              : 'Enter the Room ID and password shared by your person to join your private space.'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default RoomForm;
