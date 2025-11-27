import React, { useRef, useState, useEffect } from 'react';

interface InputAreaProps {
  onSendMessage: (text: string, image?: File) => void;
  onSendAudio: (audioBlob: Blob) => void;
  onGenerateImage: (prompt: string) => void;
  onToggleThinking: (enabled: boolean) => void;
  isThinkingEnabled: boolean;
  disabled: boolean;
}

const InputArea: React.FC<InputAreaProps> = ({ 
  onSendMessage, 
  onSendAudio, 
  onGenerateImage, 
  onToggleThinking,
  isThinkingEnabled,
  disabled 
}) => {
  const [text, setText] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleSend = () => {
    if ((!text.trim() && !selectedImage) || disabled) return;
    
    if (!selectedImage && (text.startsWith('/draw') || text.includes('תצייר'))) {
       onGenerateImage(text);
    } else {
       onSendMessage(text, selectedImage || undefined);
    }
    setText('');
    setSelectedImage(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const type = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        onSendAudio(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic Error:", err);
      alert("לא ניתן לגשת למיקרופון.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="bg-white border-t border-gray-100 p-3 sm:p-4 sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div className="flex gap-2 sm:gap-3 items-center">
        
        {/* Upload */}
        <button 
          className="p-2.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) setSelectedImage(e.target.files[0]);
          }}
        />

        {/* Thinking Toggle */}
        <button 
          className={`p-2.5 transition rounded-xl ${isThinkingEnabled ? 'bg-purple-100 text-purple-600' : 'text-gray-400 hover:text-purple-500 hover:bg-purple-50'}`}
          onClick={() => onToggleThinking(!isThinkingEnabled)}
          disabled={disabled}
          title="חשיבה עמוקה"
        >
           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 1 4 4c0 2.21-.89 4-2 6h-4c-1.11-2-2-3.79-2-6a4 4 0 0 1 4-4z"></path><path d="M8 14h8"></path><path d="M10 18h4"></path></svg>
        </button>

        {/* Input */}
        <div className="flex-1 relative">
           {selectedImage && (
              <div className="absolute bottom-full left-0 mb-2 bg-white p-1.5 rounded-lg shadow-lg border border-gray-100 flex items-center gap-2 animate-pop-in">
                 <img src={URL.createObjectURL(selectedImage)} alt="Selected" className="h-10 w-10 object-cover rounded-md" />
                 <button onClick={() => setSelectedImage(null)} className="text-red-500 bg-red-50 rounded-full p-1 hover:bg-red-100"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
              </div>
           )}
           <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isRecording ? "מקליט..." : (selectedImage ? "הוסף כיתוב לתמונה..." : "כתוב הודעה...")}
              className={`w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all ${isRecording ? 'placeholder-red-500' : ''}`}
              disabled={disabled || isRecording}
              dir="rtl"
          />
        </div>

        {/* Action Button */}
        {text || selectedImage ? (
           <button 
             onClick={handleSend}
             disabled={disabled}
             className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition transform active:scale-95"
           >
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
           </button>
        ) : (
           <button 
             onMouseDown={startRecording}
             onMouseUp={stopRecording}
             onTouchStart={startRecording}
             onTouchEnd={stopRecording}
             disabled={disabled}
             className={`p-3 transition rounded-xl shadow-sm ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-red-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
           >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
           </button>
        )}
      </div>
    </div>
  );
};

export default InputArea;