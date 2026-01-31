'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ensureSessionId } from '@/utils/session';

const modules = [
  { name: 'Delegation', icon: '👥', color: 'from-yellow-400 to-yellow-600' },
  { name: 'Todo & Checklist', icon: '✓', color: 'from-purple-400 to-purple-600' },
  { name: 'Dashboard', icon: '📊', color: 'from-blue-400 to-blue-600' },
  { name: 'Lead to Sales', icon: '📈', color: 'from-green-400 to-green-600' },
  { name: 'HelpDesk', icon: '🎧', color: 'from-red-400 to-red-600' },
  { name: 'MOM', icon: '📝', color: 'from-indigo-400 to-indigo-600' },
  { name: 'Chat', icon: '💬', color: 'from-pink-400 to-pink-600' },
  { name: 'Users', icon: '👤', color: 'from-cyan-400 to-cyan-600' },
];

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Create dots
    const dots: Array<{ x: number; y: number; baseX: number; baseY: number; vx: number; vy: number }> = [];
    const dotCount = 200;
    const dotSpacing = Math.min(canvas.width, canvas.height) / 10;

    for (let i = 0; i < dotCount; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      dots.push({ 
        x, 
        y, 
        baseX: x, 
        baseY: y,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      dots.forEach((dot, i) => {
        // Move dots slightly
        dot.x += dot.vx;
        dot.y += dot.vy;

        // Bounce back to base position
        const dx = dot.baseX - dot.x;
        const dy = dot.baseY - dot.y;
        dot.x += dx * 0.05;
        dot.y += dy * 0.05;

        // Keep in bounds
        if (dot.x < 0 || dot.x > canvas.width) dot.vx *= -1;
        if (dot.y < 0 || dot.y > canvas.height) dot.vy *= -1;

        // Calculate distance from mouse
        const distX = mousePos.current.x - dot.x;
        const distY = mousePos.current.y - dot.y;
        const distance = Math.sqrt(distX * distX + distY * distY);
        const maxDistance = 150;

        // Draw dot with size based on mouse distance
        const size = distance < maxDistance ? 4 + (maxDistance - distance) / 30 : 2;
        const opacity = distance < maxDistance ? 0.8 : 0.3;
        
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 193, 7, ${opacity})`;
        ctx.fill();

        // Connect nearby dots
        dots.forEach((otherDot, j) => {
          if (i < j) {
            const dx = otherDot.x - dot.x;
            const dy = otherDot.y - dot.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < dotSpacing) {
              const lineOpacity = (1 - dist / dotSpacing) * 0.3;
              ctx.beginPath();
              ctx.moveTo(dot.x, dot.y);
              ctx.lineTo(otherDot.x, otherDot.y);
              ctx.strokeStyle = `rgba(255, 193, 7, ${lineOpacity})`;
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
        });
      });

      requestAnimationFrame(animate);
    };

    animate();

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const sessionId = ensureSessionId();
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      // Add a small delay to ensure cookie is set, then redirect
      setTimeout(() => {
        router.push('/dashboard');
      }, 500);
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Animated Dots Background */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 z-0"
      />

      {/* Floating Module Cards Animation */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {modules.map((module, index) => (
          <div
            key={module.name}
            className="absolute animate-float-horizontal opacity-20"
            style={{
              top: `${(index * 12) % 80}%`,
              left: index % 2 === 0 ? '-20%' : '120%',
              animationDelay: `${index * 2}s`,
              animationDuration: `${20 + index * 2}s`,
            }}
          >
            <div className={`bg-gradient-to-r ${module.color} rounded-2xl p-4 shadow-2xl border-2 border-white/20 backdrop-blur-sm min-w-[180px]`}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{module.icon}</span>
                <div>
                  <p className="font-bold text-white text-sm">{module.name}</p>
                  <p className="text-xs text-white/80">ERP Module</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Container */}
      <div className="relative z-10 min-h-screen flex">
        {/* Left Side - Welcome Section */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-start p-12 xl:p-20">
          <div className="max-w-xl">
            {/* Logo */}
            <div className="flex items-center gap-4 mb-12">
              <div className="w-16 h-16 bg-gradient-to-br from-[var(--theme-primary)] to-[#f5c842] rounded-2xl flex items-center justify-center shadow-2xl">
                <svg className="w-10 h-10 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Company</h1>
                <p className="text-gray-400 text-sm">Logo</p>
              </div>
            </div>

            {/* Welcome Text */}
            <div className="space-y-6">
              <h1 className="text-6xl font-bold text-white leading-tight">
                Welcome
              </h1>
              <h2 className="text-2xl text-gray-300 font-light">
                Register for an ERP account here
              </h2>
              <p className="text-lg text-gray-400 leading-relaxed">
                Register for a free ERP account here and get access to the webshop, academy and myERP membership portal.
              </p>
            </div>

            {/* Features List */}
            <div className="mt-12 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--theme-primary)]/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[var(--theme-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-300">Complete Business Management</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--theme-primary)]/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[var(--theme-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-300">Task Delegation & Tracking</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--theme-primary)]/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[var(--theme-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-300">Real-time Collaboration</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--theme-primary)]/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[var(--theme-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-300">Advanced Analytics & Reporting</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[var(--theme-primary)] to-[#f5c842] rounded-2xl mb-4 shadow-2xl">
                <svg className="w-10 h-10 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">ERP System</h1>
              <p className="text-gray-400">Complete Business Solution</p>
            </div>

            {/* Login Card */}
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8">
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-white mb-2">
                  Sign In
                </h2>
                <p className="text-gray-300">
                  Enter your credentials to access your account
                </p>
              </div>

              {error && (
                <div className="mb-5 p-4 bg-red-500/20 border border-red-500/50 text-red-200 rounded-xl backdrop-blur-sm animate-shake">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-5 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-white placeholder-gray-400 transition-all"
                    placeholder="Enter your username"
                    disabled={loading}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-5 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-white placeholder-gray-400 transition-all pr-12"
                      placeholder="••••••••••••••••••"
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-all"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[var(--theme-primary)] to-[#f5c842] hover:from-[#f5c842] hover:to-[var(--theme-primary)] disabled:from-gray-600 disabled:to-gray-700 text-gray-900 font-bold py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:-translate-y-1 disabled:transform-none disabled:text-gray-400"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing in...
                    </span>
                  ) : 'Sign In'}
                </button>
              </form>

              {/* Test Credentials */}
              <div className="mt-6 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                <p className="text-sm font-semibold text-gray-200 mb-2">Test Credentials:</p>
                <div className="space-y-1">
                  <p className="text-sm text-gray-300">
                    Username: <span className="font-mono font-bold text-[var(--theme-primary)]">admin</span>
                  </p>
                  <p className="text-sm text-gray-300">
                    Password: <span className="font-mono font-bold text-[var(--theme-primary)]">admin123</span>
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 text-center text-sm text-gray-300">
                <span>Need access? </span>
                <a href="#" className="text-[var(--theme-primary)] font-semibold hover:text-[#f5c842] transition-colors">
                  Contact Admin
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float-horizontal {
          0% {
            transform: translateX(0) translateY(0) rotate(0deg);
          }
          25% {
            transform: translateX(25vw) translateY(-20px) rotate(5deg);
          }
          50% {
            transform: translateX(50vw) translateY(20px) rotate(-5deg);
          }
          75% {
            transform: translateX(75vw) translateY(-20px) rotate(5deg);
          }
          100% {
            transform: translateX(100vw) translateY(0) rotate(0deg);
          }
        }

        @keyframes float-horizontal-reverse {
          0% {
            transform: translateX(0) translateY(0) rotate(0deg);
          }
          25% {
            transform: translateX(-25vw) translateY(-20px) rotate(-5deg);
          }
          50% {
            transform: translateX(-50vw) translateY(20px) rotate(5deg);
          }
          75% {
            transform: translateX(-75vw) translateY(-20px) rotate(-5deg);
          }
          100% {
            transform: translateX(-100vw) translateY(0) rotate(0deg);
          }
        }

        .animate-float-horizontal:nth-child(odd) {
          animation: float-horizontal linear infinite;
        }

        .animate-float-horizontal:nth-child(even) {
          animation: float-horizontal-reverse linear infinite;
        }
      `}</style>
    </div>
  );
}

