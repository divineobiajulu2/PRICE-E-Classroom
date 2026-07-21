import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService, adminService } from '../../services/api';
import { Loader } from 'lucide-react';

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

const LiveSessionRoom: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const data = await adminService.getLiveSession(id || '');
        setSession(data);
      } catch (err) {
        console.error('[LiveSessionRoom] Failed to load session:', err);
        setSession({ topic: 'Live Class Session', instructor_name: 'Instructor' });
      }
    };
    loadSession();

    const loadJitsiScript = () => {
      if (window.JitsiMeetExternalAPI) {
        initializeJitsi();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = () => initializeJitsi();
      document.body.appendChild(script);
    };

    loadJitsiScript();

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
      }
    };
  }, [id]);

  const initializeJitsi = () => {
    setLoading(false);
    if (!jitsiContainerRef.current) return;

    const currentUser = authService.getCurrentUser();
    const roomName = `PRICE_CLASSROOM_${id || 'GENERAL'}`;

    const options = {
      roomName: roomName,
      width: '100%',
      height: '100%',
      parentNode: jitsiContainerRef.current,
      configOverwrite: {
        startWithAudioMuted: true,
        disableDeepLinking: true,
        prejoinPageEnabled: false,
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        DEFAULT_BACKGROUND: '#0d121c',
      },
      userInfo: {
        displayName: currentUser ? `${currentUser.firstName} ${currentUser.lastName} (${currentUser.role})` : 'Guest',
        email: currentUser?.email,
      },
    };

    const api = new window.JitsiMeetExternalAPI('meet.jit.si', options);
    apiRef.current = api;

    api.addEventListeners({
      videoConferenceLeft: () => navigate('/live-class'),
      readyToClose: () => navigate('/live-class'),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0d121c] flex flex-col">
      <div className="h-14 bg-navy border-b border-white/10 flex justify-between items-center px-6 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-white font-bold tracking-wider text-sm bg-primary/20 px-2 py-1 rounded border border-primary/30">PRICE Live</span>
          <span className="text-slate-300 text-sm">|</span>
          <h1 className="text-white font-medium text-sm md:text-base">{session?.topic || 'Loading Class...'}</h1>
        </div>
        <button onClick={() => navigate('/live-class')} className="text-slate-400 hover:text-white text-sm font-medium transition-colors">
          Exit Classroom
        </button>
      </div>

      <div className="flex-1 relative bg-black">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <Loader className="animate-spin mb-4 text-primary" size={48} />
            <p className="animate-pulse">Connecting to secure classroom...</p>
          </div>
        )}
        <div ref={jitsiContainerRef} className="w-full h-full" />
      </div>
    </div>
  );
};

export default LiveSessionRoom;