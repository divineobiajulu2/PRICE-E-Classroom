import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Mic, MicOff, Video, VideoOff, Monitor, 
  PhoneOff, Users, Settings, Hand, MessageSquare,
  X, Maximize2, Minimize2
} from 'lucide-react';
import { authService, videoMeetingsService } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { UserRole, normalizeUserRole } from '../../types';
import { Room, RoomEvent, RemoteParticipant, LocalParticipant, TrackPublication, RemoteTrack } from 'livekit-client';

// Extended LocalParticipant interface for optional helper methods some runtimes expose
type LocalParticipantExt = LocalParticipant & {
  disableCamera?: () => Promise<void>;
  enableMicrophone?: () => Promise<void>;
  disableMicrophone?: () => Promise<void>;
  stopScreenShare?: () => Promise<void>;
  startScreenShare?: () => Promise<void>;
};

const VideoMeetingRoom: React.FC = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participants, setParticipants] = useState<Map<string, RemoteParticipant>>(new Map());
  const [localVideoTrack, setLocalVideoTrack] = useState<MediaStreamTrack | null>(null);
  const [remoteVideoTracks, setRemoteVideoTracks] = useState<Map<string, MediaStreamTrack>>(new Map());
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const sessionRef = useRef<any>(null);

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided');
      setLoading(false);
      return;
    }

    connectToMeeting();

    return () => {
      disconnect();
    };
  }, [sessionId]);

  const connectToMeeting = async () => {
    try {
      setLoading(true);
      setError('');

      // Get join token from the configured central API service.
      const { token, url } = await videoMeetingsService.getJoinToken(sessionId);
      
      // Get session details
      try {
        sessionRef.current = await videoMeetingsService.getStatus(sessionId);
        const currentUser = authService.getCurrentUser();
        setIsHost(sessionRef.current?.instructor_id === currentUser?.id || normalizeUserRole(currentUser?.role) === UserRole.ADMIN);
      } catch (statusErr) {
        console.warn('Unable to load meeting status', statusErr);
      }

      // Import LiveKit client dynamically
      const { Room, RoomEvent } = await import('livekit-client');
      
      // Create room and connect
      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      newRoom.on(RoomEvent.Connected, () => {
        console.log('Connected to room');
        setIsConnected(true);
        setLoading(false);
        showToast('Connected to meeting', 'success');
      });

      newRoom.on(RoomEvent.Disconnected, () => {
        console.log('Disconnected from room');
        setIsConnected(false);
        showToast('Disconnected from meeting', 'info');
        navigate('/live-class');
      });

      newRoom.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        console.log('Participant connected:', participant.identity);
        setParticipants(prev => new Map(prev).set(participant.identity, participant));
        handleParticipantTracks(participant);
      });

      newRoom.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        console.log('Participant disconnected:', participant.identity);
        setParticipants(prev => {
          const newMap = new Map(prev);
          newMap.delete(participant.identity);
          return newMap;
        });
        setRemoteVideoTracks(prev => {
          const newMap = new Map(prev);
          newMap.delete(participant.identity);
          return newMap;
        });
      });

      newRoom.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: TrackPublication, participant: RemoteParticipant) => {
        if (track.kind === 'video') {
          setRemoteVideoTracks(prev => new Map(prev).set(participant.identity, track.mediaStreamTrack));
          attachTrack(track.mediaStreamTrack, participant.identity);
        }
      });

      newRoom.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, publication: TrackPublication, participant: RemoteParticipant) => {
        if (track.kind === 'video') {
          setRemoteVideoTracks(prev => {
            const newMap = new Map(prev);
            newMap.delete(participant.identity);
            return newMap;
          });
        }
      });

      await newRoom.connect(url, token);
      setRoom(newRoom);

      // Enable camera and mic
      await enableCamera();
      await enableMicrophone();

    } catch (err: any) {
      console.error('Failed to connect:', err);
      setError(err.message || 'Failed to connect to meeting');
      setLoading(false);
      showToast(err.message || 'Failed to connect to meeting', 'error');
    }
  };

  const handleParticipantTracks = (participant: RemoteParticipant) => {
    participant.trackPublications.forEach((publication) => {
      if (publication.track && publication.kind === 'video') {
        setRemoteVideoTracks(prev => new Map(prev).set(participant.identity, publication.track!.mediaStreamTrack));
        attachTrack(publication.track.mediaStreamTrack, participant.identity);
      }
    });
  };

  const attachTrack = (track: MediaStreamTrack, participantId: string) => {
    const videoElement = remoteVideosRef.current.get(participantId);
    if (videoElement) {
      videoElement.srcObject = new MediaStream([track]);
    }
  };

  const enableCamera = async () => {
    if (!room) return;
    
    try {
      await room.localParticipant.enableCameraAndMicrophone();
      const videoTrack = room.localParticipant.videoTrackPublications.values().next().value?.track?.mediaStreamTrack;
      if (videoTrack && localVideoRef.current) {
        localVideoRef.current.srcObject = new MediaStream([videoTrack]);
        setLocalVideoTrack(videoTrack);
        setIsCameraEnabled(true);
      }
    } catch (err) {
      console.error('Failed to enable camera:', err);
      showToast('Failed to enable camera', 'error');
    }
  };

  const disableCamera = async () => {
    if (!room) return;
    const local = room.localParticipant as LocalParticipantExt;
    await local.disableCamera?.();
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    setLocalVideoTrack(null);
    setIsCameraEnabled(false);
  };

  const enableMicrophone = async () => {
    if (!room) return;
    const local = room.localParticipant as LocalParticipantExt;
    await local.enableMicrophone?.();
    setIsMicEnabled(true);
  };

  const disableMicrophone = async () => {
    if (!room) return;
    const local = room.localParticipant as LocalParticipantExt;
    await local.disableMicrophone?.();
    setIsMicEnabled(false);
  };

  const toggleScreenShare = async () => {
    if (!room) return;
    
    try {
      const local = room.localParticipant as LocalParticipantExt;
      if (isScreenSharing) {
        await local.stopScreenShare?.();
        setIsScreenSharing(false);
      } else {
        await local.startScreenShare?.();
        setIsScreenSharing(true);
      }
    } catch (err) {
      console.error('Failed to toggle screen share:', err);
      showToast('Failed to toggle screen share', 'error');
    }
  };

  const disconnect = async () => {
    if (room) {
      room.disconnect();
      setRoom(null);
    }
    setIsConnected(false);
  };

  const leaveMeeting = async () => {
    await disconnect();
    navigate('/live-class');
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-navy flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Connecting to meeting...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-navy flex items-center justify-center">
        <div className="text-center text-white max-w-md mx-auto p-8">
          <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Connection Failed</h2>
          <p className="text-slate-300 mb-6">{error}</p>
          <button
            onClick={() => navigate('/live-class')}
            className="bg-primary hover:bg-primary-dark px-6 py-3 rounded-lg font-semibold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-navy flex flex-col">
      {/* Header */}
      <div className="h-16 bg-navy/90 border-b border-white/10 flex justify-between items-center px-6 shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-white font-bold tracking-wider text-sm bg-primary/20 px-3 py-1 rounded border border-primary/30">
            PRICE Live
          </span>
          <span className="text-slate-300 text-sm">|</span>
          <h1 className="text-white font-medium">{sessionRef.current?.topic || 'Live Class'}</h1>
          {isHost && (
            <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-semibold">
              Host
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-slate-300 text-sm">
            <Users size={16} />
            <span>{participants.size + 1}</span>
          </div>
          <button
            onClick={leaveMeeting}
            className="text-slate-400 hover:text-white text-sm font-medium transition-colors"
          >
            Leave
          </button>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 relative bg-black p-4 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
          {/* Local Video */}
          <div className="relative bg-slate-900 rounded-lg overflow-hidden aspect-video">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            {!isCameraEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                <div className="text-center text-white">
                  <VideoOff size={48} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Camera Off</p>
                </div>
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
              You {isMicEnabled ? '' : '(Muted)'}
            </div>
          </div>

          {/* Remote Videos */}
          {Array.from(participants.entries()).map(([participantId, participant]) => {
            const videoTrack = remoteVideoTracks.get(participantId);
            return (
              <div key={participantId} className="relative bg-slate-900 rounded-lg overflow-hidden aspect-video">
                {videoTrack ? (
                  <video
                    ref={(el) => {
                      if (el) remoteVideosRef.current.set(participantId, el);
                    }}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                    <div className="text-center text-white">
                      <VideoOff size={48} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">{participant.name || 'Participant'}</p>
                    </div>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                  {participant.name || 'Participant'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="h-20 bg-navy/90 border-t border-white/10 flex items-center justify-center gap-4 shrink-0">
        <button
          onClick={isMicEnabled ? disableMicrophone : enableMicrophone}
          className={`p-3 rounded-full transition-colors ${
            isMicEnabled ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
          title={isMicEnabled ? 'Mute' : 'Unmute'}
        >
          {isMicEnabled ? <Mic size={20} /> : <MicOff size={20} />}
        </button>

        <button
          onClick={isCameraEnabled ? disableCamera : enableCamera}
          className={`p-3 rounded-full transition-colors ${
            isCameraEnabled ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
          title={isCameraEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          {isCameraEnabled ? <Video size={20} /> : <VideoOff size={20} />}
        </button>

        {isHost && (
          <button
            onClick={toggleScreenShare}
            className={`p-3 rounded-full transition-colors ${
              isScreenSharing ? 'bg-primary hover:bg-primary-dark text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'
            }`}
            title="Share screen"
          >
            <Monitor size={20} />
          </button>
        )}

        <button
          onClick={leaveMeeting}
          className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors"
          title="Leave meeting"
        >
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  );
};

export default VideoMeetingRoom;
