import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Palette, Trash2, Search, Pin, Image as ImageIcon, Save, CheckCircle, RotateCcw } from 'lucide-react';
import { db } from '../../services/database';
import { Note } from '../../types';

const COLORS = [
  { id: 'white', bg: 'bg-white', border: 'border-slate-200' },
  { id: 'yellow', bg: 'bg-yellow-100', border: 'border-yellow-200' },
  { id: 'green', bg: 'bg-green-100', border: 'border-green-200' },
  { id: 'blue', bg: 'bg-blue-100', border: 'border-blue-200' },
  { id: 'red', bg: 'bg-red-100', border: 'border-red-200' },
  { id: 'purple', bg: 'bg-purple-100', border: 'border-purple-200' },
];

const Notes: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', content: '', color: 'bg-white' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const user = db.auth.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      loadNotes(user.id);
    }
  }, []);

  const loadNotes = (userId: string) => {
    const data = db.features.getNotes(userId);
    setNotes(data);
  };

  const handleStartEdit = (note: Note) => {
    setNewNote({ title: note.title, content: note.content, color: note.color });
    setEditingId(note.id);
    setIsExpanded(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewNote({ title: '', content: '', color: 'bg-white' });
    setIsExpanded(false);
  };

  const handleSaveNote = () => {
    if (!newNote.title.trim() && !newNote.content.trim()) {
        setIsExpanded(false);
        return;
    }
    
    if (currentUser) {
      setSaveStatus('saving');
      setTimeout(() => {
          const noteData = {
            id: editingId || `n${Date.now()}`,
            title: newNote.title,
            content: newNote.content,
            color: newNote.color,
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            userId: currentUser.id
          };

          if (editingId) {
             db.features.updateNote(noteData);
          } else {
             db.features.saveNote(noteData);
          }

          loadNotes(currentUser.id);
          setNewNote({ title: '', content: '', color: 'bg-white' });
          setEditingId(null);
          setSaveStatus('saved');
          
          setTimeout(() => {
              setSaveStatus('idle');
              setIsExpanded(false);
          }, 1000);
      }, 500);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this note?')) {
      db.features.deleteNote(id);
      if (currentUser) loadNotes(currentUser.id);
      if (editingId === id) handleCancelEdit();
    }
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    n.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
      
      {/* Search Header */}
      <div className="flex flex-col md:flex-row items-center gap-4 mb-8 justify-center">
        <div className="relative w-full max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search your notes..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border-transparent focus:bg-white shadow-sm rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-slate-700"
          />
        </div>
      </div>

      {/* Input Area (Google Keep Style) */}
      <div className="flex justify-center mb-12 relative z-10">
        <div 
          ref={formRef}
          className={`w-full max-w-xl bg-white rounded-lg shadow-md border border-slate-200 transition-all duration-300 overflow-hidden ${newNote.color} ${isExpanded ? 'ring-2 ring-primary/10' : ''}`}
        >
          {isExpanded && (
            <input
              type="text"
              placeholder="Title"
              value={newNote.title}
              onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
              className={`w-full px-4 pt-4 pb-2 text-lg font-bold bg-transparent outline-none placeholder-slate-500 text-slate-800`}
            />
          )}
          
          <textarea
            placeholder={isExpanded ? "Take a note..." : "Take a note..."}
            value={newNote.content}
            onClick={() => setIsExpanded(true)}
            onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
            className={`w-full px-4 py-3 resize-none outline-none bg-transparent placeholder-slate-500 text-slate-700 text-sm ${isExpanded ? 'min-h-[120px]' : 'min-h-[46px]'}`}
          />

          {isExpanded && (
            <div className="px-2 py-2 flex justify-between items-center bg-black/5">
              <div className="flex items-center gap-1">
                <div className="relative group">
                   <button className="p-2 hover:bg-black/10 rounded-full text-slate-600 transition-colors" title="Change Color">
                     <Palette size={18} />
                   </button>
                   <div className="absolute top-full left-0 mt-2 bg-white shadow-xl rounded-lg p-2 flex gap-1 border border-slate-100 invisible group-hover:visible transition-all opacity-0 group-hover:opacity-100 z-20">
                     {COLORS.map(c => (
                       <button 
                         key={c.id} 
                         onClick={() => setNewNote({...newNote, color: c.bg})}
                         className={`w-6 h-6 rounded-full border ${c.border} ${c.bg} hover:scale-110 transition-transform`}
                       />
                     ))}
                   </div>
                </div>
              </div>
              <div className="flex gap-2">
                {editingId && (
                   <button 
                     onClick={handleCancelEdit}
                     className="px-4 py-1.5 font-bold text-sm text-slate-600 hover:bg-black/10 rounded transition-colors"
                   >
                     Cancel
                   </button>
                )}
                <button 
                  onClick={handleSaveNote}
                  disabled={saveStatus !== 'idle'}
                  className="px-6 py-1.5 font-bold text-sm bg-primary text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  {saveStatus === 'saved' ? <CheckCircle size={16} /> : <Save size={16} />}
                  {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving...' : editingId ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Masonry-ish Grid */}
      {filteredNotes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-start">
          {filteredNotes.map(note => (
            <div 
              key={note.id} 
              onClick={() => handleStartEdit(note)}
              className={`rounded-xl border border-transparent shadow-sm hover:shadow-md transition-all p-4 group relative flex flex-col gap-2 cursor-pointer ${note.color} ${note.color === 'bg-white' ? 'border-slate-200' : ''} ${editingId === note.id ? 'ring-2 ring-primary ring-offset-2' : ''}`}
            >
              {note.title && <h3 className="font-bold text-navy text-lg">{note.title}</h3>}
              <p className="text-slate-700 text-sm whitespace-pre-wrap">{note.content}</p>
              
              <div className="mt-4 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity pt-2">
                 <span className="text-[10px] text-slate-500 font-medium bg-white/50 px-2 py-0.5 rounded">{note.date}</span>
                 <div className="flex gap-1">
                    <button onClick={(e) => handleDelete(note.id, e)} className="p-1.5 bg-white/60 hover:bg-white rounded-full text-slate-500 hover:text-red-500 shadow-sm transition-colors">
                      <Trash2 size={14} />
                    </button>
                 </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 opacity-50">
          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
             <Search size={48} className="text-slate-300" />
          </div>
          <p className="text-slate-500 font-medium">No notes found. Add one above!</p>
        </div>
      )}

    </div>
  );
};

export default Notes;