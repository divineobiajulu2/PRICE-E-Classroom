import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Users, ArrowRight } from 'lucide-react';

const Join: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 py-4 px-8 flex justify-between items-center sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-3 text-primary font-bold text-lg group">
          <img src="/logo.png" alt="PRICE Logo" className="w-9 h-9 object-contain group-hover:scale-110 transition-transform" />
          <span className="text-navy">PRICE E-Classroom</span>
        </Link>
        <Link to="/login" className="text-sm font-semibold text-slate-600 hover:text-primary transition-colors">Log In</Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center mb-12 max-w-2xl">
          <h1 className="text-3xl md:text-4xl font-bold text-navy mb-4">Join the PRICE E-Classroom</h1>
          <p className="text-slate-600 text-lg">Tailor your experience by choosing how you will use the platform. Select the role that best fits your goals today.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
          {/* Instructor Card */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-transparent hover:border-primary hover:shadow-xl transition-all cursor-pointer group flex flex-col">
            <div className="w-16 h-16 bg-blue-50 text-primary rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors">
              <Users size={32} />
            </div>
            <h3 className="text-xl font-bold text-navy mb-3">I am an Instructor</h3>
            <p className="text-slate-500 mb-8 flex-1 text-sm">Create engaging courses, manage virtual classrooms, and track intern progress with our suite of advanced professional teaching tools.</p>
            <Link to="/signup/instructor" className="w-full bg-primary text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors">
              Join as Instructor <ArrowRight size={18} />
            </Link>
          </div>

          {/* Intern Card */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-transparent hover:border-primary hover:shadow-xl transition-all cursor-pointer group flex flex-col">
            <div className="w-16 h-16 bg-blue-50 text-primary rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors">
              <GraduationCap size={32} />
            </div>
            <h3 className="text-xl font-bold text-navy mb-3">I am an Intern</h3>
            <p className="text-slate-500 mb-8 flex-1 text-sm">Access specialized training modules, complete industry-standard assignments, and earn certifications to accelerate your career growth.</p>
            <Link to="/signup/intern" className="w-full bg-primary text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors">
              Join as Intern <ArrowRight size={18} />
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
};

export default Join;
