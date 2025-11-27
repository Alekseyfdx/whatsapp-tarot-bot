import React, { useEffect, useState } from 'react';

interface LiveCallOverlayProps {
    onEndCall: () => void;
    subject: string;
}

const LiveCallOverlay: React.FC<LiveCallOverlayProps> = ({ onEndCall, subject }) => {
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setDuration(prev => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#0b141a] flex flex-col items-center justify-between py-12 text-white animate-pop-in">
            {/* Top Bar */}
            <div className="w-full flex justify-between items-start px-4">
                <button onClick={onEndCall} className="text-gray-400 hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                </button>
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1 text-gray-400 text-xs uppercase tracking-wide">
                        <svg viewBox="0 0 12 14" width="10" height="12" fill="currentColor"><path d="M2.625 4.375V2.625a3.5 3.5 0 1 1 7 0v1.75h.875c.483 0 .875.392.875.875v7.875a.875.875 0 0 1-.875.875H1.75a.875.875 0 0 1-.875-.875V5.25c0-.483.392-.875.875-.875h.875zm1.75 0h3.5V2.625a1.75 1.75 0 0 0-3.5 0v1.75z"/></svg>
                        <span>End-to-end encrypted</span>
                    </div>
                </div>
                <div className="w-6"></div> {/* Spacer for centering */}
            </div>

            {/* Profile Info */}
            <div className="flex flex-col items-center gap-4 mt-8">
                <div className="relative">
                     <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 shadow-lg animate-breathe">
                        <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Lior" alt="Lior" className="w-full h-full bg-white/10" />
                     </div>
                     {/* Pulse Ring */}
                     <div className="absolute inset-0 rounded-full border-2 border-[#00a884] animate-ping opacity-20"></div>
                </div>
                <div className="text-center">
                    <h2 className="text-2xl font-semibold">Lior AI</h2>
                    <p className="text-gray-400 text-sm mt-1">{subject}</p>
                    <p className="text-gray-400 text-sm mt-2">{formatTime(duration)}</p>
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="w-full bg-[#1f2c34] rounded-t-3xl p-6 pb-12 mt-auto">
                <div className="flex justify-around items-center max-w-sm mx-auto">
                    <button className="p-3 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition">
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                        </svg>
                    </button>
                    <button className="p-3 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                             <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                    </button>
                    <button className="p-3 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                             <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                        </svg>
                    </button>
                    <button 
                        onClick={onEndCall} 
                        className="bg-red-500 p-4 rounded-full text-white hover:bg-red-600 transition shadow-lg transform active:scale-95"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 3.75L18 6m0 0l2.25 2.25M18 6l2.25-2.25M18 6l-2.25 2.25m1.5 13.5c-8.284 0-15-6.716-15-15V4.5A2.25 2.25 0 014.5 2.25h1.372c.516 0 .966.351 1.091.852l1.106 4.423c.11.44-.054.902-.417 1.173l-1.293.97a1.062 1.062 0 00-.38 1.21 12.035 12.035 0 007.143 7.143c.441.162.928-.004 1.21-.38l.97-1.293a1.125 1.125 0 011.173-.417l4.423 1.106c.5.125.852.575.852 1.091V19.5a2.25 2.25 0 01-2.25 2.25h-2.25z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LiveCallOverlay;