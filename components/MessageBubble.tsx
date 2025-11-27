import React, { useRef, useState } from 'react';
import { Message, MessageType, Sender } from '../types';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.sender === Sender.USER;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-3 animate-pop-in`}>
      <div 
        className={`relative max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl shadow-sm text-sm sm:text-base ${
          isUser 
            ? 'bg-blue-600 text-white rounded-tr-none' 
            : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
        }`}
      >
        
        {/* Author Label */}
        <div className={`text-[10px] font-bold mb-1 opacity-70 ${isUser ? 'text-blue-100 text-right' : 'text-purple-600 text-left'}`}>
            {isUser ? 'אני' : 'ליאור AI'}
        </div>

        {/* Images */}
        {message.imageUrl && (
          <div className="mb-2 rounded-xl overflow-hidden shadow-sm">
            <img src={message.imageUrl} alt="content" className="w-full h-auto object-cover" />
          </div>
        )}

        {/* Text */}
        {message.text && (
          <div className="whitespace-pre-wrap leading-relaxed">
            {message.text}
          </div>
        )}

        {/* Audio Player */}
        {message.type === MessageType.AUDIO && message.audioUrl && (
           <div className={`flex items-center gap-3 mt-2 p-2 rounded-xl ${isUser ? 'bg-blue-500' : 'bg-gray-50'}`}>
              <button onClick={toggleAudio} className="w-8 h-8 flex items-center justify-center bg-white text-blue-600 rounded-full shadow-sm">
                 {isPlaying ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                 ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                 )}
              </button>
              <div className="h-1 flex-1 bg-black/10 rounded-full overflow-hidden">
                 <div className={`h-full ${isUser ? 'bg-white' : 'bg-blue-500'} ${isPlaying ? 'animate-pulse' : ''} w-2/3`}></div>
              </div>
              <audio ref={audioRef} src={message.audioUrl} onEnded={() => setIsPlaying(false)} className="hidden" />
           </div>
        )}

        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-3 pt-2 border-t border-black/5">
            <p className="text-[10px] font-bold opacity-60 mb-1">מקורות:</p>
            <div className="flex flex-wrap gap-1.5">
              {message.sources.map((source, idx) => (
                <a 
                  key={idx} 
                  href={source.uri} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-black/5 hover:bg-black/10 px-2 py-0.5 rounded text-[10px] truncate max-w-[120px]"
                >
                  {source.title}
                </a>
              ))}
            </div>
          </div>
        )}
        
        {/* Timestamp */}
        <div className={`text-[10px] mt-1 text-right ${isUser ? 'text-blue-200' : 'text-gray-400'}`}>
           {message.timestamp.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;