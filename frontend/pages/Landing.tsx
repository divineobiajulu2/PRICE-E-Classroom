import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Users, Award } from 'lucide-react';
import BrandText from '../components/BrandText';

const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <style>{`
        @keyframes springSlide {
          0%, 40% { transform: translateY(0); }
          48% { transform: translateY(-105%); }
          51%, 90% { transform: translateY(-100%); }
          96% { transform: translateY(5%); }
          98%, 100% { transform: translateY(0); }
        }
        @keyframes snapOut {
          0%, 44% { opacity: 1; }
          45%, 94% { opacity: 0; }
          95%, 100% { opacity: 1; }
        }
        @keyframes snapIn {
          0%, 44% { opacity: 0; }
          45%, 94% { opacity: 1; }
          95%, 100% { opacity: 0; }
        }
        .animate-spring-slide {
          animation: springSlide 6s cubic-bezier(0.68, -0.6, 0.32, 1.6) infinite;
        }
        .animate-snap-out {
          animation: snapOut 6s linear infinite;
        }
        .animate-snap-in {
          animation: snapIn 6s linear infinite;
        }
      `}</style>

      <header className="flex justify-between items-center px-4 sm:px-8 py-4 sm:py-5 max-w-7xl mx-auto w-full sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-slate-200/70 transition-all">
        <Link to="/" className="flex items-center gap-3 group">
          <img src="/logo.png" alt="PRICE Logo" className="w-10 h-10 object-contain group-hover:scale-105 transition-transform duration-200" />
          <BrandText className="text-lg sm:text-xl" />
        </Link>
        <div className="flex items-center gap-3 sm:gap-6">
          <Link to="/join" className="text-sm font-semibold text-slate-600 hover:text-primary transition-colors">Sign up</Link>
          <Link to="/login" className="bg-primary hover:bg-blue-700 text-white px-4 sm:px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-lg shadow-primary/20">
            Login
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="relative bg-navy overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center"></div>
          <div className="relative max-w-7xl mx-auto px-4 py-24 md:py-32 flex flex-col items-center text-center text-white">
            <div className="animate-fade-up delay-100 mb-4">
              <span className="font-medium text-amber-300 text-base md:text-xl tracking-wide">
                Welcome to <BrandText className="inline-flex text-base sm:text-xl" primaryClassName="text-white" accentClassName="text-amber-400" />
              </span>
            </div>

            <h1 className="text-5xl sm:text-5xl md:text-7xl lg:text-8xl font-display font-bold text-center flex flex-wrap gap-x-2 sm:gap-x-4 gap-y-2 justify-center items-center text-white mb-12 mt-8 w-full max-w-none mx-auto leading-tight tracking-tight select-none">

              {/* Column 1: Not / Nor (Synchronized Precision Snap) */}
              <span className="relative inline-flex items-center justify-end text-right text-white font-medium">
                <span className="invisible">Not</span>
                <span className="absolute right-0 animate-snap-out">Not</span>
                <span className="absolute right-0 animate-snap-in">Nor</span>
              </span>

              {/* Column 2: STATIC ANCHOR */}
              <span className="text-white font-medium">for</span>

              {/* Column 3: PRICE / REWARD (Elastic Slide Engine) */}
              <span className="relative inline-flex text-left font-bold">
                {/* Invisible placeholder forces the container to scale fluidly to the maximum layout length */}
                <span className="invisible">REWARD</span>
                <span className="absolute inset-0 flex flex-col overflow-hidden h-full w-full">
                  <span className="animate-spring-slide h-full flex items-center text-white">PRIZE</span>
                  <span className="animate-spring-slide h-full flex items-center text-amber-400">REWARD</span>
                </span>
              </span>
            </h1>

            <div className="w-full max-w-2xl h-0.5 bg-amber-400 mx-auto rounded-full mb-10 animate-fade-up delay-300 opacity-80"></div>

            <div className="animate-fade-up delay-500 max-w-3xl mx-auto">
              <p className="text-base md:text-lg text-slate-300 mb-2 font-light italic leading-relaxed">
                "I have raised him up in righteousness, and I will direct all his ways: he shall build my city, and he shall let go my captives, not for price nor reward, saith the LORD of hosts."
              </p>
              <p className="text-sm text-slate-400 mb-10 font-medium">
                — Isaiah 45:13 (KJV)
              </p>
            </div>

            <Link to="/join" className="bg-primary hover:bg-blue-600 text-white text-lg font-bold px-8 py-4 rounded-full transition-all transform hover:-translate-y-1 shadow-xl flex items-center gap-2 animate-fade-up delay-500">
              Join Classroom <ArrowRight size={20} />
            </Link>
          </div>
        </div>

        <div className="py-20 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-blue-100 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <BookOpen size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">Rich Materials</h3>
              <p className="text-slate-600">Access a wide variety of biblical teachings and professional classroom resources anytime.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">Interactive Learning</h3>
              <p className="text-slate-600">Engage with seasoned instructors and fellow interns in a dynamic virtual environment.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Award size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">Discipleship</h3>
              <p className="text-slate-600">A Quarry site that foster the learning and practice of the Life of Christ and practical ways of excelling both spiritually and acedmically</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-navy py-8 text-center text-slate-400 text-sm">
        <p>© 2024 Peace House Revival Labors. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Landing;