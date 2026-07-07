'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_NAMES } from '../lib/utils';
import { BookOpen, Award, User, Settings, Lock, Eye, EyeOff } from 'lucide-react';

export default function Home() {
  const { user, login, signUp, loading, loginAsGuest } = useAuth();

  // Auth Form State
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Signup extra fields
  const [username, setUsername] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  // Status State
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setStatusMsg({ type: 'error', text: '이메일과 비밀번호를 입력해주세요.' });
      return;
    }

    setFormLoading(true);
    setStatusMsg(null);

    const res = await login(email, password);
    setFormLoading(false);

    if (!res.success) {
      setStatusMsg({ type: 'error', text: res.error || '이메일 또는 비밀번호가 잘못되었습니다.' });
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !username) {
      setStatusMsg({ type: 'error', text: '모든 항목을 입력해주세요.' });
      return;
    }

    if (password !== passwordConfirm) {
      setStatusMsg({ type: 'error', text: '비밀번호가 일치하지 않습니다.' });
      return;
    }

    setFormLoading(true);
    setStatusMsg(null);

    const res = await signUp(email, password, username);
    setFormLoading(false);

    if (res.success) {
      if (res.msg === 'SUCCESS') {
        setStatusMsg({ type: 'success', text: '회원가입이 완료되었습니다! 로그인해 주세요.' });
        setActiveTab('login');
      } else if (res.msg === 'CHECK_EMAIL') {
        setStatusMsg({ type: 'success', text: '가입 접수 완료! 입력하신 이메일의 인증 링크를 클릭해주세요.' });
      }
      // Reset fields
      setPassword('');
      setPasswordConfirm('');
    } else {
      setStatusMsg({ type: 'error', text: res.error || '회원가입 중 오류가 발생했습니다.' });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-20">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-foreground/60 font-medium">사용자 세션 확인 중...</p>
      </div>
    );
  }

  // --- Auth View (Not logged in) ---
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 max-w-md mx-auto w-full py-8 md:py-16">
        <div className="bg-card w-full rounded-2xl border border-card-border shadow-xl overflow-hidden p-6 md:p-8">

          <div className="text-center mb-6">
            <h1 className="text-3xl font-extrabold text-accent">Audit Say 🏹</h1>
            <p className="text-sm text-foreground/60 mt-1">CPA 회계감사 AI 문제풀이 및 피드백 플랫폼</p>
          </div>

          {/* Alert messages */}
          {statusMsg && (
            <div className={`p-4 mb-4 rounded-lg text-sm font-semibold border ${statusMsg.type === 'success'
              ? 'bg-success/15 border-success/30 text-success'
              : 'bg-danger/15 border-danger/30 text-danger'
              }`}>
              {statusMsg.text}
            </div>
          )}

          {/* Form Tabs */}
          <div className="flex border-b border-card-border mb-6">
            <button
              onClick={() => { setActiveTab('login'); setStatusMsg(null); }}
              className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'login'
                ? 'border-accent text-accent'
                : 'border-transparent text-foreground/40 hover:text-foreground/70'
                }`}
            >
              로그인
            </button>
            <button
              onClick={() => { setActiveTab('signup'); setStatusMsg(null); }}
              className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'signup'
                ? 'border-accent text-accent'
                : 'border-transparent text-foreground/40 hover:text-foreground/70'
                }`}
            >
              회원가입
            </button>
          </div>

          {/* Login tab content */}
          {activeTab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground/50 mb-1">
                  이메일 (Email)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-card-border border border-card-border focus:border-accent text-foreground rounded-lg px-4 py-2.5 text-sm focus:outline-none transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground/50 mb-1">
                  비밀번호 (PW)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-card-border border border-card-border focus:border-accent text-foreground rounded-lg pl-4 pr-10 py-2.5 text-sm focus:outline-none transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/45 hover:text-foreground/90"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full py-3 bg-primary hover:bg-primary-hover disabled:opacity-50 text-foreground font-bold rounded-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {formLoading ? (
                  <div className="w-5 h-5 border-2 border-foreground border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>이메일로 로그인</span>
                  </>
                )}
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-card-border"></div>
                <span className="flex-shrink mx-4 text-foreground/35 text-xs font-bold">또는</span>
                <div className="flex-grow border-t border-card-border"></div>
              </div>

              <button
                type="button"
                onClick={loginAsGuest}
                className="w-full py-3 bg-card-border/40 hover:bg-card-border/75 border border-card-border text-foreground font-extrabold rounded-lg shadow transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <span>👀 비회원으로 바로 시작하기</span>
              </button>
            </form>
          ) : (
            /* Signup tab content */
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div className="p-3 bg-warning/10 border border-warning/20 text-warning rounded-lg text-xs font-semibold leading-relaxed">
                ⚠️ 기존 ID 사용자는 이메일로 새로 가입해야 합니다.
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground/50 mb-1">
                  이메일 (Email)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-card-border border border-card-border focus:border-accent text-foreground rounded-lg px-4 py-2.5 text-sm focus:outline-none transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground/50 mb-1">
                  닉네임 (Username)
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="닉네임 입력"
                  className="w-full bg-card-border border border-card-border focus:border-accent text-foreground rounded-lg px-4 py-2.5 text-sm focus:outline-none transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground/50 mb-1">
                  비밀번호 (PW)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-card-border border border-card-border focus:border-accent text-foreground rounded-lg px-4 py-2.5 text-sm focus:outline-none transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground/50 mb-1">
                  비밀번호 확인
                </label>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-card-border border border-card-border focus:border-accent text-foreground rounded-lg px-4 py-2.5 text-sm focus:outline-none transition-colors"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full py-3 bg-accent/90 hover:bg-accent disabled:opacity-50 text-background font-black rounded-lg shadow-lg shadow-accent/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {formLoading ? (
                  <div className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span>회원가입 완료</span>
                )}
              </button>
            </form>
          )}

        </div>
      </div>
    );
  }

  // --- Dashboard View (Logged In) ---
  const roleName = ROLE_NAMES[user.role] || user.role;
  return (
    <div className="max-w-4xl mx-auto w-full space-y-8 py-4">
      {/* Welcome Card */}
      <div className="bg-card border-l-[6px] border-accent border border-card-border p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-5 w-48 h-48 translate-x-12 translate-y-12 select-none pointer-events-none">
          <BookOpen className="w-full h-full" />
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-2">
          환영합니다, {user.username}님! 👋
        </h2>
        <p className="text-foreground/80 text-sm md:text-base">
          현재 등급: <span className="text-success font-bold">{roleName}</span> |{' '}
          레벨: <span className="text-warning font-extrabold">{user.level}</span>
        </p>

        {/* Simple XP Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-foreground/50 mb-1">
            <span>레벨 진행도</span>
            <span>{user.exp % 100} / 100 EXP</span>
          </div>
          <div className="w-full h-2.5 bg-card-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-500 rounded-full"
              style={{ width: `${user.exp % 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/quiz" className="flex flex-col">
          <div className="bg-card border border-card-border p-6 rounded-2xl shadow-md card-hover flex-1 flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 bg-primary/10 border border-primary/20 text-primary rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold mb-2 text-foreground group-hover:text-accent transition-colors">
                📝 문제 풀기
              </h3>
              <p className="text-sm text-foreground/60 leading-relaxed">
                실제 시험처럼 시나리오 기반 약식 주관식 문제를 풀고 인공지능(AI) 채점과 논리 중심의 상세 피드백을 받아보세요.
              </p>
            </div>
            <div className="text-right mt-6 text-sm font-bold text-accent group-hover:underline">
              문제 풀기 시작 &rarr;
            </div>
          </div>
        </Link>

        <Link href="/ranking" className="flex flex-col">
          <div className="bg-card border border-card-border p-6 rounded-2xl shadow-md card-hover flex-1 flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 bg-warning/10 border border-warning/20 text-warning rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold mb-2 text-foreground group-hover:text-accent transition-colors">
                🏆 랭킹
              </h3>
              <p className="text-sm text-foreground/60 leading-relaxed">
                정답률과 누적 학습 경험치 점수를 바탕으로 다른 회계사 시험 수험생들과 순위를 겨루며 성장을 시각화하고 경쟁력을 키웁니다.
              </p>
            </div>
            <div className="text-right mt-6 text-sm font-bold text-accent group-hover:underline">
              랭킹 보드 확인 &rarr;
            </div>
          </div>
        </Link>

        <Link href="/profile" className="flex flex-col">
          <div className="bg-card border border-card-border p-6 rounded-2xl shadow-md card-hover flex-1 flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 bg-success/10 border border-success/20 text-success rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <User className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold mb-2 text-foreground group-hover:text-accent transition-colors">
                👤 내 정보
              </h3>
              <p className="text-sm text-foreground/60 leading-relaxed">
                지금까지 푼 모의고사 풀이 기록과 누적 성향 통계를 분석하고, 틀린 문제를 기록하는 오답 노트를 검토하여 취약점을 점검합니다.
              </p>
            </div>
            <div className="text-right mt-6 text-sm font-bold text-accent group-hover:underline">
              내 학습 통계 바로가기 &rarr;
            </div>
          </div>
        </Link>
      </div>

      {user.role === 'ADMIN' && (
        <div className="bg-card/40 border border-card-border/60 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-lg font-bold flex items-center gap-2">
              <Settings className="w-5 h-5 text-accent animate-spin-slow" />
              <span>관리자 콘솔에 접근 가능합니다.</span>
            </h4>
            <p className="text-sm text-foreground/50 mt-1">
              시험 문제 데이터베이스 추가, 수정, 삭제(CRUD) 및 회원 권한 관리가 가능합니다.
            </p>
          </div>
          <Link
            href="/admin"
            className="px-5 py-2.5 bg-card-border hover:bg-card-border/80 border border-card-border rounded-xl text-sm font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors"
          >
            <span>관리자 페이지 이동</span>
            <span>&rarr;</span>
          </Link>
        </div>
      )}
    </div>
  );
}
