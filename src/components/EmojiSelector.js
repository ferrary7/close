import { useState } from 'react';

const EmojiSelector = ({ currentEmoji, onEmojiSelect, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);

  const emojis = [
    '🧡', '❤️', '💛', '💚', '💙', '💜', '🤍', '🖤',
    '💖', '💕', '💓', '💗', '💘', '💝', '💟', '♥️',
    '🥰', '😍', '🤗', '😘', '😚', '🥺', '🤭', '😊',
    '🌹', '🌻', '🌺', '🌸', '🌷', '🌼', '💐', '🌿',
    '🐻', '🐰', '🐱', '🐶', '🦊', '🐯', '🐨', '🐼',
    '⭐', '🌟', '✨', '💫', '🌙', '☀️', '🌈', '☁️'
  ];

  const handleEmojiClick = (emoji) => {
    onEmojiSelect(emoji);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-20 h-20 bg-white/10 backdrop-blur-xl border-2 border-white/20
          rounded-3xl flex items-center justify-center text-3xl shadow-xl
          transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:bg-white/20
          focus:outline-none focus:ring-4 focus:ring-pink-400/50
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
          ${currentEmoji ? 'emoji-bounce' : ''}
        `}
      >
        {currentEmoji || '😊'}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Emoji picker */}
          <div className="absolute bottom-full mb-17 z-50 slide-up-enter w-80">
            <div className="bg-black/80 border border-white/20 p-6 shadow-2xl max-w-xs rounded-3xl">
              <h3 className="text-sm font-bold text-white mb-4 text-center">Choose your mood 💕</h3>
              <div className="grid grid-cols-8 gap-2 max-h-80">
                {emojis.map((emoji, index) => (
                  <button
                    key={index}
                    onClick={() => handleEmojiClick(emoji)}
                    className={`
                      w-8 h-8 flex items-center justify-center text-lg rounded-xl
                      transition-all duration-150 hover:bg-white/20 hover:scale-110
                      focus:outline-none focus:ring-2 focus:ring-pink-400/50
                      ${emoji === currentEmoji ? 'bg-white/30 scale-110' : ''}
                    `}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              
              <div className="mt-3 pt-3 border-t border-white/20">
                <p className="text-xs text-white/70 text-center">
                  Tap an emoji to share your mood
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EmojiSelector;
