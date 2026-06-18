import React, { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { UserProfile } from "../types";
import { Wallet, Coins, ArrowRight, TrendingUp } from "lucide-react";
import { motion } from "motion/react";

interface WalletSetupModalProps {
  user: any;
  onSetupComplete: (profile: UserProfile) => void;
}

export default function WalletSetupModal({ user, onSetupComplete }: WalletSetupModalProps) {
  const [balance, setBalance] = useState<number>(100000); // Default to $100k
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presets = [10000, 50000, 100000, 250000, 500000, 1000000];

  const handleInitializeWallet = async () => {
    if (balance <= 0 || isNaN(balance)) {
      setError("Please specify a valid initial deposit.");
      return;
    }

    setLoading(true);
    setError(null);

    const newProfile: UserProfile = {
      uid: user.uid,
      email: user.email || "",
      balance: balance,
      initialBalance: balance,
      isSetup: true,
      createdAt: new Date(),
    };

    try {
      if (user.isBypass) {
        localStorage.setItem(`smc_profile_${user.uid}`, JSON.stringify(newProfile));
        onSetupComplete(newProfile);
        return;
      }
      const profileRef = doc(db, "user_profiles", user.uid);
      await setDoc(profileRef, newProfile);
      onSetupComplete(newProfile);
    } catch (err: any) {
      console.error("Wallet configuration error: ", err);
      try {
        handleFirestoreError(err, OperationType.CREATE, `user_profiles/${user.uid}`);
      } catch (mappedErr: any) {
        setError(mappedErr.message || "Unable to persist wallet profile on servers database.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4" id="wallet-setup-overlay">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg glass-panel p-8 rounded-2xl border border-brand/30 shadow-2xl relative"
        id="wallet-setup-card"
      >
        <div className="flex flex-col items-center text-center">
          <div className="p-4 bg-brand/10 border border-brand/30 rounded-xl mb-6 relative">
            <Wallet className="w-10 h-10 text-brand" />
          </div>

          <h2 className="font-display text-2xl font-bold text-white mb-2 uppercase tracking-wide">
            INITIALIZE PAPER TRADING WALLET
          </h2>
          <p className="font-sans text-sm text-gray-400 max-w-sm mb-8">
            Create your offline persistent virtual balance to test SMC / ICT high win-rate signals with realistic risk parameters.
          </p>
        </div>

        {error && (
          <div className="bg-red-950/30 border border-red-500/20 text-red-200 text-xs p-3.5 rounded-xl mb-6 text-center">
            {error}
          </div>
        )}

        <div className="space-y-6 mb-8">
          {/* Custom Balance Input with glowing feedback */}
          <div className="bg-black/50 border border-white/5 rounded-xl p-4 flex flex-col items-center">
            <span className="font-mono text-[10px] text-gray-500 tracking-wider uppercase mb-1">
              PROPOSED BALANCE DEPOSIT
            </span>
            <div className="flex items-center space-x-2">
              <span className="font-display text-4xl font-extrabold text-brand">$</span>
              <input
                type="number"
                value={balance}
                onChange={(e) => setBalance(Math.max(0, parseInt(e.target.value) || 0))}
                className="bg-transparent text-white font-display text-4xl font-extrabold tracking-tight outline-none border-none w-56 text-center focus:ring-0"
              />
            </div>
          </div>

          {/* Quick presets selectors */}
          <div className="grid grid-cols-3 gap-2.5">
            {presets.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setBalance(val)}
                className={`py-2 px-3 rounded-lg border font-mono text-xs cursor-pointer transition-all ${
                  balance === val
                    ? "bg-brand text-black border-brand font-bold"
                    : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-brand/40"
                }`}
              >
                ${val.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleInitializeWallet}
          disabled={loading}
          className="w-full bg-brand hover:bg-brand/90 hover:shadow-[0_0_20px_rgba(255,215,0,0.3)] text-black font-semibold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all duration-300 font-sans cursor-pointer disabled:opacity-50"
          id="btn-confirm-portfolio"
        >
          {loading ? (
            <span className="flex items-center space-x-2">
              <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
              <span>ESTABLISHING PERSISTENT LEDGER...</span>
            </span>
          ) : (
            <>
              <span>LAUNCH PAPER PORTFOLIO</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        <div className="mt-6 flex justify-center items-center space-x-2 text-gray-500 font-mono text-[9px] uppercase tracking-wide">
          <Coins className="w-3.5 h-3.5 text-brand" />
          <span>Secured Persistent Paper Wallet with Google Auth key</span>
        </div>
      </motion.div>
    </div>
  );
}
