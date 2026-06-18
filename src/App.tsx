import React, { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, collection, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase";
import { UserProfile, TradeHistory } from "./types";
import LoginScreen from "./components/LoginScreen";
import WalletSetupModal from "./components/WalletSetupModal";
import MainDashboard from "./components/MainDashboard";
import { Shield, Sparkles } from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tradeLogs, setTradeLogs] = useState<TradeHistory[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [showEntranceAnimation, setShowEntranceAnimation] = useState(false);
  const [isAnimationCompleted, setIsAnimationCompleted] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const [activeTheme, setActiveTheme] = useState<string>(() => {
    try {
      return localStorage.getItem("genz_theme") || "gold";
    } catch {
      return "gold";
    }
  });

  // Apply chosen theme colors in real time across the entire CSS ecosystem
  useEffect(() => {
    try {
      localStorage.setItem("genz_theme", activeTheme);
    } catch (e) {
      console.warn("Theme write error:", e);
    }
    const root = document.documentElement;
    if (activeTheme === "gold") {
      root.style.setProperty("--color-brand", "#FFD700");
    } else if (activeTheme === "cyberpunk") {
      root.style.setProperty("--color-brand", "#FF007F"); // Hot Magenta Pink
    } else if (activeTheme === "ocean") {
      root.style.setProperty("--color-brand", "#00E5FF"); // Electric Ice Cyan
    } else if (activeTheme === "emerald") {
      root.style.setProperty("--color-brand", "#00E676"); // Neon Mint Emerald
    }
  }, [activeTheme]);

  // Monitor Authentication state changes securely
  useEffect(() => {
    // Safety fallback timeout to prevent infinite loading state if Firebase initialization is delayed
    const fallbackTimeout = setTimeout(() => {
      setAuthLoading(false);
    }, 1200);

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      clearTimeout(fallbackTimeout);
      if (user) {
        setCurrentUser(user);
        setShowEntranceAnimation(true);
        setIsAnimationCompleted(true);
      } else {
        setProfile(null);
        setTradeLogs([]);
        setShowEntranceAnimation(false);
        setIsAnimationCompleted(true);
        setProfileLoading(false);
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });

    return () => {
      clearTimeout(fallbackTimeout);
      unsubscribeAuth();
    };
  }, []);

  // Prevent blank/white screens by ensuring animation or dashboard is triggered when a user session is active
  useEffect(() => {
    if (currentUser && !showEntranceAnimation && !isAnimationCompleted) {
      setShowEntranceAnimation(true);
    }
  }, [currentUser, showEntranceAnimation, isAnimationCompleted]);

  // Sync core user profile and persistent logs from Firestore
  useEffect(() => {
    if (!currentUser || !isAnimationCompleted) return;

    setProfileLoading(true);

    // 1. Set up real-time listener for user profile wallet data
    const profileRef = doc(db, "user_profiles", currentUser.uid);
    const unsubscribeProfile = onSnapshot(profileRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        setProfile(data);
      } else {
        setProfile(null);
      }
      setProfileLoading(false);
    }, (error) => {
      console.warn("Error subscribing profile balance snapshot:", error);
      setProfileLoading(false);
    });

    // 2. Set up real-time listener for the transaction ledger logs
    const tradesColRef = collection(db, "trades_history");
    const unsubscribeTrades = onSnapshot(tradesColRef, (snap) => {
      const logs: TradeHistory[] = [];
      snap.forEach((doc) => {
        const data = doc.data() as any;
        if (data.uid === currentUser.uid) {
          logs.push({
            ...data,
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toLocaleString() : String(data.timestamp),
          });
        }
      });

      // Sort logs chronologically using sequential date identifier
      logs.sort((a, b) => b.id.localeCompare(a.id));
      setTradeLogs(logs);
    }, (error) => {
      console.warn("Error subscribing trades snapshot ledger:", error);
    });

    return () => {
      unsubscribeProfile();
      unsubscribeTrades();
    };
  }, [currentUser, isAnimationCompleted]);

  // Handle successful login from Login screen
  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
    setIsAnimationCompleted(true);
    setShowEntranceAnimation(false);
  };

  const handleSignOut = () => {
    signOut(auth);
    setCurrentUser(null);
    setProfile(null);
    setTradeLogs([]);
    setShowEntranceAnimation(false);
    setIsAnimationCompleted(false);
    setProfileLoading(false);
  };

  const handleProfileUpdate = (updated: UserProfile) => {
    setProfile(updated);
  };

  // Switch display after Candlestick Loader ends
  const handleAnimationComplete = () => {
    setIsAnimationCompleted(true);
    setShowEntranceAnimation(false);
  };

  // Synchronous initial view loading without separate delayed landing screens
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#090b1c] via-[#04050e] to-[#010103] flex flex-col justify-center items-center" id="platform-auth-loader">
        <div className="flex flex-col items-center space-y-4">
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl relative animate-pulse">
            <Shield className="w-8 h-8 text-[#34CDED]" />
          </div>
          <span className="font-mono text-xs text-gray-400 tracking-widest uppercase animate-pulse">
            SECURED CONNECTIONS...
          </span>
        </div>
      </div>
    );
  }

  // State 1: Enforce Whitelist Google Wall
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // State 3: User logged in, animation finished, check profile status
  if (isAnimationCompleted) {
    if (profileLoading) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-[#090b1c] via-[#04050e] to-[#010103] flex flex-col justify-center items-center" id="platform-profile-loader">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-6 h-6 border-2 border-[#34CDED] border-t-transparent rounded-full animate-spin" />
            <span className="font-mono text-[10px] text-gray-500 uppercase tracking-widest">
              Syncing Paper Wallets...
            </span>
          </div>
        </div>
      );
    }

    // New profile -> Setup Paper Portfolio first
    if (!profile) {
      return (
        <WalletSetupModal
          user={currentUser}
          onSetupComplete={(newProfile) => setProfile(newProfile)}
        />
      );
    }

    // Returning profile -> Direct entry to scanner dashboard
    return (
      <MainDashboard
        user={currentUser}
        profile={profile}
        tradeLogs={tradeLogs}
        onProfileUpdate={handleProfileUpdate}
        onSignOut={handleSignOut}
        activeTheme={activeTheme}
        onThemeChange={setActiveTheme}
      />
    );
  }

  return null;
}
