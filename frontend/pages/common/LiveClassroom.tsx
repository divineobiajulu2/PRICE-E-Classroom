import React, { useState, useEffect } from 'react';
import { Video, Calendar, Clock, Plus, Trash2, Users, ExternalLink, Monitor, PlayCircle } from 'lucide-react';
import { db } from '../../services/database';
import { LiveSession, UserRole } from '../../types';
import { useNavigate } from 'react-router-dom';

const LiveClassroom: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  
  // Create Form State
  const [formData, setFormData] = useState({
    topic: '',
    platform: 'PRICE Connect',
    meetingLink: 'internal',
    date: '',
    time: '',
    targetSet: 'Set 12-A',
    targetStream: 'All'
  });

  useEffect(() => {
    const currentUser = db.auth.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      loadSessions(currentUser);
    }
  }, []);

  const loadSessions = (currentUser: any) => {
    const data = db.features.getSessions(currentUser);
    setSessions(data);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.topic || !formData.date || !formData.time) return;

    const newSession: LiveSession = {
      id: `s${Date.now()}`,
      topic: formData.topic,
      instructorName: `${user.firstName} ${user.lastName}`,
      platform: formData.platform as any,
      meetingLink: formData.platform === 'PRICE Connect' ? 'internal' : formData.meetingLink,
      date: formData.date,
      time: formData.time,
      targetSet: formData.targetSet,
      targetStream: formData.targetStream,
      status: 'Upcoming'
    };

    db.features.createSession(newSession);
    loadSessions(user);
    setShowModal(false);
    // Reset form
    setFormData({ topic: '', platform: 'PRICE Connect', meetingLink: 'internal', date: '', time: '', targetSet: 'Set 12-A', targetStream: 'All' });
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Cancel this live session?")) {
      db.features.deleteSession(id);
      loadSessions(user);
    }
  };

  const handleJoin = (session: LiveSession) => {
    if (session.platform === 'PRICE Connect') {
      navigate(`/live-class/room/${session.id}`);
    } else {
      window.open(session.meetingLink, '_blank');
    }
  };

  const isCreator = user?.role === UserRole.INSTRUCTOR || user?.role === UserRole.ADMIN;

  const getPlatformStyle = (platform: string) => {
     if (platform === 'PRICE Connect') return 'bg-navy text-white';
     if (platform === 'Zoom') return 'bg-[#2D8CFF] text-white';
     if (platform === 'Google Meet') return 'bg-[#00AC47] text-white';
     return 'bg-[#6264A7] text-white'; // Teams
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy flex items-center gap-3">
             <span className="bg-red-600 text-white p-2 rounded-lg animate-pulse shadow-red-200"><Video size={24} /></span>
             Live Classroom
          </h1>
          <p className="text-slate-500 mt-1">
             {isCreator ? 'Schedule and manage your live video sessions.' : 'Join your scheduled classes and workshops.'}
          </p>
        </div>
        
        {isCreator && (
          <button 
            onClick={() => setShowModal(true)} 
            className="px-6 py-3 bg-primary text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-primary/20 flex items-center gap-2"
          >
            <Plus size={20} /> Schedule Session
          </button>
        )}
      </div>

      {/* SESSIONS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sessions.length > 0 ? sessions.map(session => (
           <div key={session.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
              {/* Card Header - Zoom/Meet Style */}
              <div className={`h-24 ${getPlatformStyle(session.platform)} p-6 relative flex flex-col justify-center`}>
                 <div className="flex justify-between items-start">
                    <span className="bg-white/20 backdrop-blur px-2 py-0.5 rounded text-xs font-bold border border-white/10 flex items-center gap-1">
                      <Monitor size={12} /> {session.platform}
                    </span>
                    {isCreator && (
                       <button onClick={() => handleDelete(session.id)} className="text-white/70 hover:text-white p-1 rounded hover:bg-white/10 transition-colors">
                          <Trash2 size={16} />
                       </button>
                    )}
                 </div>
                 <h3 className="font-bold text-lg text-white mt-2 truncate" title={session.topic}>{session.topic}</h3>
              </div>

              {/* Card Body */}
              <div className="p-6 flex-1 flex flex-col gap-4">
                 <div className="flex items-center gap-3 text-sm text-slate-600">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                       <Users size={16} className="text-slate-500" />
                    </div>
                    <div>
                       <p className="font-bold text-navy">{session.instructorName}</p>
                       <p className="text-xs text-slate-400">Host</p>
                    </div>
                 </div>

                 <div className="space-y-2 py-2 border-y border-slate-100">
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                       <Calendar size={16} className="text-primary" />
                       <span className="font-medium">{session.date}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                       <Clock size={16} className="text-primary" />
                       <span className="font-medium">{session.time}</span>
                    </div>
                 </div>

                 <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="bg-slate-50 px-2 py-1 rounded border border-slate-100">{session.targetSet}</span>
                    <span className="bg-slate-50 px-2 py-1 rounded border border-slate-100">{session.targetStream}</span>
                 </div>
                 
                 <div className="mt-auto pt-2">
                    <button 
                      onClick={() => handleJoin(session)}
                      className="w-full py-3 bg-navy text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-primary transition-colors"
                    >
                       {session.platform === 'PRICE Connect' ? 'Enter Classroom' : 'Join Meeting'} <ExternalLink size={16} />
                    </button>
                 </div>
              </div>
           </div>
        )) : (
          <div className="col-span-full py-20 text-center bg-white border border-dashed border-slate-300 rounded-xl">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                <Video size={40} />
             </div>
             <h3 className="text-xl font-bold text-navy mb-2">No Scheduled Classes</h3>
             <p className="text-slate-500">
               {isCreator ? 'Schedule a new live session using the button above.' : 'Check back later for upcoming live sessions.'}
             </p>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="bg-navy p-6 flex justify-between items-center text-white">
                 <h3 className="text-xl font-bold flex items-center gap-2"><Plus size={20} /> Schedule Session</h3>
                 <button onClick={() => setShowModal(false)} className="text-white/70 hover:text-white"><Trash2 className="hidden" /><span className="text-2xl">&times;</span></button>
              </div>
              
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                 <div>
                    <label className="block text-sm font-bold text-navy mb-1">Session Topic</label>
                    <input type="text" className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/20 outline-none" required value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} placeholder="e.g. Marketing 101: SEO Basics" />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-sm font-bold text-navy mb-1">Platform</label>
                       <select className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/20 outline-none" value={formData.platform} onChange={e => setFormData({...formData, platform: e.target.value})}>
                          <option>PRICE Connect</option>
                          <option>Zoom</option>
                          <option>Google Meet</option>
                          <option>Microsoft Teams</option>
                       </select>
                    </div>
                    {formData.platform !== 'PRICE Connect' && (
                        <div>
                        <label className="block text-sm font-bold text-navy mb-1">Meeting Link</label>
                        <input type="url" className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/20 outline-none" required value={formData.meetingLink} onChange={e => setFormData({...formData, meetingLink: e.target.value})} placeholder="https://..." />
                        </div>
                    )}
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-sm font-bold text-navy mb-1">Date</label>
                       <input type="date" className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/20 outline-none" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                    </div>
                    <div>
                       <label className="block text-sm font-bold text-navy mb-1">Time</label>
                       <input type="time" className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/20 outline-none" required value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-sm font-bold text-navy mb-1">Target Set</label>
                       <select className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/20 outline-none" value={formData.targetSet} onChange={e => setFormData({...formData, targetSet: e.target.value})}>
                          <option>Set 12-A</option>
                          <option>Set 12-B</option>
                          <option>Staff</option>
                       </select>
                    </div>
                    <div>
                       <label className="block text-sm font-bold text-navy mb-1">Target Stream</label>
                       <select className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/20 outline-none" value={formData.targetStream} onChange={e => setFormData({...formData, targetStream: e.target.value})}>
                          <option>All</option>
                          <option>Marketing</option>
                          <option>Computer Science</option>
                          <option>Theology</option>
                       </select>
                    </div>
                 </div>

                 <div className="pt-4 flex gap-3">
                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                    <button type="submit" className="flex-1 py-3 bg-primary text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg">Schedule</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default LiveClassroom;