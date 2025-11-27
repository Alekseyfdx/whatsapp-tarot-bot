import React, { useState, useEffect, useRef } from 'react';
import { 
  Message, 
  MessageType, 
  Sender, 
  UserProfile, 
  OnboardingStep 
} from './types';
import { 
  ONBOARDING_QUESTIONS, 
  INITIAL_GREETING, 
  SYSTEM_PROMPT_TEMPLATE 
} from './constants';
import MessageBubble from './components/MessageBubble';
import InputArea from './components/InputArea';
import LiveCallOverlay from './components/LiveCallOverlay';
import { 
  generateResponse, 
  generateImage, 
  generateSpeech, 
  processAudioInput,
  LiveSession
} from './services/geminiService';

// --- ICONS (Inline SVGs to replace lucide-react) ---
const Icons = {
  Menu: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="18" x2="20" y2="18"/></svg>,
  X: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Phone: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  Settings: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Zap: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
};

const App: React.FC = () => {
  const [screen, setScreen] = useState('welcome'); // welcome, chat, call
  const [messages, setMessages] = useState<Message[]>([]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isLiveCallActive, setIsLiveCallActive] = useState(false);
  const [isThinkingEnabled, setIsThinkingEnabled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: '',
    grade: '',
    subject: '',
    topic: '',
    difficulty: '',
    isComplete: false
  });
  const [onboardingStep, setOnboardingStep] = useState<number>(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const liveSessionRef = useRef<LiveSession | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isBotTyping]);

  // Helpers
  const addMessage = (content: string, sender: Sender, type: MessageType = MessageType.TEXT, mediaUrl?: string, sources?: any[]) => {
    const newMessage: Message = {
      id: Date.now().toString() + Math.random(),
      text: type === MessageType.TEXT || type === MessageType.IMAGE ? content : undefined,
      imageUrl: type === MessageType.IMAGE ? mediaUrl : undefined,
      audioUrl: type === MessageType.AUDIO ? mediaUrl : undefined,
      type,
      sender,
      timestamp: new Date(),
      sources
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const fileToBase64 = (file: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  const blobToDataURL = (blob: Blob): Promise<string> => {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  };

  // --- Logic ---

  const handleStartApp = () => {
    setScreen('chat');
    // Start Onboarding
    addMessage(ONBOARDING_QUESTIONS[0], Sender.BOT);
    setOnboardingStep(0);
  };

  const handleOnboarding = (text: string) => {
    const newProfile = { ...userProfile };
    
    // Save answer
    switch (onboardingStep) {
      case 0: newProfile.name = text; break;
      case 1: newProfile.grade = text; break;
      case 2: newProfile.subject = text; break;
      case 3: newProfile.topic = text; break;
      case 4: 
        newProfile.difficulty = text;
        newProfile.isComplete = true;
        break;
    }
    setUserProfile(newProfile);

    // Next Step
    if (newProfile.isComplete) {
      setTimeout(() => addMessage(INITIAL_GREETING, Sender.BOT), 600);
      setOnboardingStep(-1); // Done
    } else {
      setTimeout(() => addMessage(ONBOARDING_QUESTIONS[onboardingStep + 1], Sender.BOT), 600);
      setOnboardingStep(prev => prev + 1);
    }
  };

  const handleSendMessage = async (text: string, image?: File) => {
    // Add User Message
    if (image) {
      const imageUrl = URL.createObjectURL(image);
      const base64 = await fileToBase64(image);
      addMessage(text, Sender.USER, MessageType.IMAGE, imageUrl);
      
      setIsBotTyping(true);
      // If we are in onboarding but sending an image, we might want to analyze it or skip onboarding?
      // For simplicity, if onboarding is not done, we continue onboarding logic for text, but treat image as a special request.
      if (!userProfile.isComplete) {
         // Fallback if user sends image during onboarding - just acknowledge
         setTimeout(() => {
           addMessage("מגניב! אבל קודם בוא נסיים את ההיכרות 😉", Sender.BOT);
           addMessage(ONBOARDING_QUESTIONS[onboardingStep], Sender.BOT);
           setIsBotTyping(false);
         }, 800);
         return;
      }
      
      const history = messages
        .filter(m => m.type === MessageType.TEXT || m.type === MessageType.IMAGE)
        .map(m => ({
          role: m.sender === Sender.USER ? 'user' : 'model',
          parts: [{ text: m.text || '' }]
        })).slice(-10);

      const systemInstruction = SYSTEM_PROMPT_TEMPLATE(userProfile);
      
      // Call Gemini Vision
      const { text: responseText, sources } = await generateResponse(
         history, text, systemInstruction, base64, isThinkingEnabled
      );

      if (responseText) addMessage(responseText, Sender.BOT, MessageType.TEXT, undefined, sources);
      setIsBotTyping(false);

    } else {
      addMessage(text, Sender.USER);

      if (!userProfile.isComplete) {
        handleOnboarding(text);
        return;
      }

      setIsBotTyping(true);
      
      const history = messages
        .filter(m => m.type === MessageType.TEXT)
        .map(m => ({
          role: m.sender === Sender.USER ? 'user' : 'model',
          parts: [{ text: m.text || '' }]
        })).slice(-10);

      const systemInstruction = SYSTEM_PROMPT_TEMPLATE(userProfile);
      
      const { text: responseText, sources } = await generateResponse(
         history, text, systemInstruction, undefined, isThinkingEnabled
      );

      if (responseText) {
        addMessage(responseText, Sender.BOT, MessageType.TEXT, undefined, sources);
        // TTS for short messages
        if (responseText.length < 100) {
           const audioBase64 = await generateSpeech(responseText);
           if (audioBase64) {
             addMessage("הקראה", Sender.BOT, MessageType.AUDIO, `data:audio/wav;base64,${audioBase64}`);
           }
        }
      }
      setIsBotTyping(false);
    }
  };

  const handleSendAudio = async (audioBlob: Blob) => {
    if (audioBlob.size < 2048) {
      addMessage("ההקלטה קצרה מדי, נסה שוב.", Sender.BOT);
      return;
    }

    const audioUrl = await blobToDataURL(audioBlob);
    addMessage("הודעה קולית", Sender.USER, MessageType.AUDIO, audioUrl);
    setIsBotTyping(true);

    const base64Audio = await fileToBase64(audioBlob);
    const systemInstruction = userProfile.isComplete ? SYSTEM_PROMPT_TEMPLATE(userProfile) : "You are a helpful assistant.";
    
    const { transcription, text: responseText } = await processAudioInput(base64Audio, audioBlob.type, systemInstruction, []);
    
    if (transcription) {
       // Ideally update the user audio message bubble with transcription text
       // For now just replying
    }

    if (responseText) {
      addMessage(responseText, Sender.BOT);
      // TTS Response
      const ttsAudio = await generateSpeech(responseText);
      if (ttsAudio) {
         addMessage("תגובה קולית", Sender.BOT, MessageType.AUDIO, `data:audio/wav;base64,${ttsAudio}`);
      }
    }
    setIsBotTyping(false);
  };

  const handleGenerateImage = async (prompt: string) => {
    addMessage(prompt, Sender.USER);
    setIsBotTyping(true);
    const img64 = await generateImage(prompt);
    if (img64) addMessage("הנה הציור שביקשת:", Sender.BOT, MessageType.IMAGE, img64);
    else addMessage("לא הצלחתי לצייר כרגע.", Sender.BOT);
    setIsBotTyping(false);
  };

  // --- Live Call ---
  const startLiveCall = async () => {
    setScreen('call');
    setMenuOpen(false);
    
    const session = new LiveSession(() => {
       setScreen('chat');
       liveSessionRef.current = null;
    });
    liveSessionRef.current = session;
    
    const systemInstruction = userProfile.isComplete ? SYSTEM_PROMPT_TEMPLATE(userProfile) : "Helpful assistant";
    await session.connect(systemInstruction);
  };

  const endLiveCall = () => {
    if (liveSessionRef.current) liveSessionRef.current.disconnect();
    setScreen('chat');
  };

  // --- Render ---

  if (screen === 'welcome') {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 animate-bounce">
            <div className="text-8xl mb-4 drop-shadow-lg">🤖</div>
            <h1 className="text-4xl font-bold text-white mb-2 tracking-wide">Lior AI</h1>
            <p className="text-blue-100 text-lg">עוזר לימודי אישי</p>
          </div>

          <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8 mb-6 border border-white/20">
            <div className="space-y-6 mb-8">
              <div className="flex items-start gap-4">
                <span className="text-3xl">✨</span>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">עזרה חכמה</h3>
                  <p className="text-sm text-gray-600">שאלות מנחות במקום תשובות</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="text-3xl">📚</span>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">כל הנושאים</h3>
                  <p className="text-sm text-gray-600">מתמטיקה, עברית, טבע ועוד</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="text-3xl">😊</span>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">חברותי וחם</h3>
                  <p className="text-sm text-gray-600">תמיד כאן כדי לעזור</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleStartApp}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3.5 rounded-xl transition transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg"
            >
              {Icons.Zap}
              התחל ללמוד עכשיו
            </button>
          </div>
          
          <p className="text-center text-blue-200 text-xs opacity-70">Powered by Google Gemini</p>
        </div>
      </div>
    );
  }

  if (screen === 'call') {
    return (
      <LiveCallOverlay onEndCall={endLiveCall} subject={userProfile.subject || 'שיחה קולית'} />
    );
  }

  return (
    <div className="w-full h-screen bg-gray-50 flex flex-col font-sans" dir="rtl">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 sm:p-4 flex justify-between items-center shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-xl sm:text-2xl">🤖</div>
          <div>
            <h1 className="font-bold text-lg sm:text-xl">ליאור AI</h1>
            <p className="text-xs sm:text-sm text-blue-100">מחובר ✓</p>
          </div>
        </div>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 hover:bg-white/10 rounded-lg transition"
        >
          {menuOpen ? Icons.X : Icons.Menu}
        </button>
      </div>

      {/* MENU */}
      {menuOpen && (
        <div className="absolute top-16 right-4 bg-white border shadow-xl rounded-xl z-40 w-48 overflow-hidden animate-pop-in">
          <button
            onClick={() => {
                startLiveCall();
                setMenuOpen(false);
            }}
            className="w-full px-4 py-3 text-right hover:bg-blue-50 flex items-center gap-3 border-b text-gray-700"
          >
            <span className="text-blue-600">{Icons.Phone}</span>
            שיחה קולית
          </button>
          <button
            onClick={() => {
                setScreen('welcome');
                setMessages([]);
                setUserProfile({ ...userProfile, isComplete: false });
                setMenuOpen(false);
            }}
            className="w-full px-4 py-3 text-right hover:bg-red-50 text-red-600 flex items-center gap-3"
          >
            {Icons.Settings}
            התנתק
          </button>
        </div>
      )}

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-gradient-to-b from-blue-50 to-white">
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isBotTyping && (
           <div className="flex justify-start">
            <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tr-none shadow-sm">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-75"></span>
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-150"></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* INPUT */}
      <InputArea 
        onSendMessage={handleSendMessage}
        onSendAudio={handleSendAudio}
        onGenerateImage={handleGenerateImage}
        onToggleThinking={setIsThinkingEnabled}
        isThinkingEnabled={isThinkingEnabled}
        disabled={isBotTyping}
      />
    </div>
  );
};

export default App;