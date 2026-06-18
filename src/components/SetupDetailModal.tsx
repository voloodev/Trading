import React, { useState } from "react";
import { TradingSetup, UserProfile, TradeHistory } from "../types";
import { X, ShieldCheck, Activity, Info, Percent } from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

interface SetupDetailModalProps {
  setup: TradingSetup;
  profile: UserProfile;
  onClose: () => void;
  onTradeExecuted: (updatedProfile: UserProfile) => void;
}

export default function SetupDetailModal({ setup, profile, onClose, onTradeExecuted }: SetupDetailModalProps) {
  const [riskRate, setRiskRate] = useState<number>(2); // Default to 2%
  const [error, setError] = useState<string | null>(null);

  // Calculate dynamic Risk USD rounded to the nearest whole USD integer
  const riskUSD = Math.round(profile.balance * (riskRate / 100)) || 1;

  const handleEnterTrade = async () => {
    setError(null);
    const uniqueTradeId = `trade_${Date.now()}`;
    
    // Create new active RUNNING trade
    const runningTrade: TradeHistory = {
      id: uniqueTradeId,
      uid: profile.uid,
      coinName: setup.coinName,
      tradeType: setup.tradeType,
      result: "RUNNING",
      gainLossPct: 0,
      entryPrice: setup.entryPrice,
      exitPrice: setup.entryPrice, // initially starts close to entry
      strategy: setup.summaryText || "SMC Quantum Signal",
      timestamp: new Date().toISOString(),
      riskUSD: riskUSD,
      riskRate: riskRate,
      tpPrice: setup.tpPrice,
      slPrice: setup.slPrice,
      currentPnlUSD: 0
    };

    try {
      if (profile.uid.startsWith("bypass")) {
        const storedTrades = localStorage.getItem(`smc_trades_${profile.uid}`) || "[]";
        const localTrades = JSON.parse(storedTrades);
        localTrades.unshift(runningTrade);
        localStorage.setItem(`smc_trades_${profile.uid}`, JSON.stringify(localTrades));
        onTradeExecuted(profile);
      } else {
        const tradeDocRef = doc(db, "trades_history", uniqueTradeId);
        await setDoc(tradeDocRef, runningTrade);
      }
      // Instant transition - close modal and let it start running
      onClose();
    } catch (err: any) {
      console.error(err);
      setError("Failed to initialize active position on the database.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4" id="setup-detail-overlay">
      <div
        className="w-full max-w-sm bg-black/40 backdrop-blur-2xl rounded-[40px] border border-white/10 overflow-hidden shadow-2xl flex flex-col justify-between"
        id="phone-setup-sheet"
        style={{ minHeight: "560px" }}
      >
        {/* Modal Header */}
        <div className="p-6 pb-2 flex items-center justify-between z-10 select-none">
          <button 
            onClick={onClose}
            className="text-white hover:text-[#34CDED] flex items-center gap-1.5 font-mono text-[10px] tracking-wide cursor-pointer uppercase py-1 px-3 bg-white/5 rounded-full border border-white/10 active:scale-95 transition-all"
            id="modal-back-button"
          >
            ← Back
          </button>
          <span className="font-sans font-black text-xs text-white uppercase tracking-wider bg-white/5 border border-white/10 px-3 py-1 rounded-full text-center">
            {setup.coinName.includes("/") ? setup.coinName.toUpperCase() : `${setup.coinName.toUpperCase()}/USDT`}
          </span>
          <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse border border-white/10" />
        </div>

        {/* Core details frame */}
        <div className="px-6 flex-1 flex flex-col justify-between py-4 space-y-5">
          
          <div className="space-y-4 flex flex-col justify-between flex-1">
            
            {/* Title */}
            <div className="text-center py-1 select-none">
              <span className="text-[10px] uppercase text-[#34CDED] font-black tracking-widest block mb-1">DETECTION SPECIFICATION</span>
              <p className="text-sm font-sans text-white font-black">Active Smart Money Order Flow</p>
            </div>

            {/* Winrate Accordion Option */}
            <div className="grid grid-cols-2 gap-2 p-3 bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-2xl select-none shadow-md">
              <div className="text-center border-r border-white/5 py-1">
                <span className="text-[9px] uppercase text-white/70 font-bold block">True Accuracy</span>
                <span className="font-sans font-black text-sm text-[#34CDED] tracking-wide">{setup.winRate}% Verified</span>
              </div>
              <div className="text-center py-1">
                <span className="text-[9px] uppercase text-white/70 font-bold block">Stance Signal</span>
                <span className={`font-sans font-black text-xs uppercase tracking-wide ${
                  setup.tradeType === "LONG" ? "text-green-400" : "text-pink-400"
                }`}>
                  {setup.tradeType === "LONG" ? "🡵 BUY / LONG" : "🡶 SELL / SHORT"}
                </span>
              </div>
            </div>

            {/* Static Signal Details */}
            <div className="space-y-2 bg-white/[0.03] backdrop-blur-lg p-4.5 rounded-3xl border border-white/10 shadow-lg">
              <span className="text-[10px] uppercase font-black text-[#34CDED] tracking-wider block border-b border-white/5 pb-1 select-none">Signal Statistics</span>
              <div className="grid grid-cols-2 gap-y-2 text-[11px] font-sans">
                <div className="flex justify-between items-center border-b border-white/5 pb-1.5Col col-span-2">
                  <span className="text-white/80 font-bold">Trading asset:</span>
                  <span className="text-white font-mono font-black">{setup.coinName.toUpperCase()}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-1.5Col pr-2 border-r border-white/5">
                  <span className="text-white/80">TP Price:</span>
                  <span className="text-green-400 font-mono font-bold">${setup.tpPrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-1.5Col pl-2">
                  <span className="text-white/80">SL Price:</span>
                  <span className="text-pink-400 font-mono font-bold">${setup.slPrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-1.5Col pr-2 border-r border-white/5">
                  <span className="text-white/80">Entry Price:</span>
                  <span className="text-[#34CDED] font-mono font-bold">${setup.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-1.5Col pl-2">
                  <span className="text-white/80">Timeframe:</span>
                  <span className="text-white font-mono font-bold uppercase">{setup.timeframe}</span>
                </div>
              </div>
            </div>

            {/* Interactive Dynamic Risk Selector */}
            <div className="space-y-2 bg-white/[0.04] backdrop-blur-lg p-4.5 rounded-3xl border border-[#34CDED]/20 shadow-lg">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-black text-white tracking-wider block select-none">
                  Choose Trade Risk
                </span>
                <span className="text-[9px] font-mono bg-[#34CDED]/10 border border-[#34CDED]/30 text-[#34CDED] px-2 py-0.5 rounded-full font-bold">
                  SMC STANDARD
                </span>
              </div>
              
              {/* Risk Percentage Selection Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 5, 10].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => setRiskRate(rate)}
                    type="button"
                    className={`py-1.5 font-mono text-[11px] font-black rounded-lg border transition-all cursor-pointer ${
                      riskRate === rate 
                        ? "bg-[#34CDED] text-black border-[#34CDED] shadow-sm shadow-[#34CDED]/25"
                        : "bg-black/40 border-white/10 hover:border-white/30 text-white"
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>

              {/* Nearest full USD value statistics */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-1 text-[11px]">
                <span className="text-white/80 font-bold">Calculated Risk USD:</span>
                <span className="text-white font-mono font-black bg-white/10 px-2.5 py-0.5 rounded-md text-xs border border-white/20">
                  ${riskUSD} USD
                </span>
              </div>
            </div>

            {/* Reason block */}
            <div className="space-y-1 select-none">
              <span className="text-[9px] uppercase text-white/70 font-bold block tracking-wider">Algorithm Reasoning Trigger</span>
              <p className="text-[10px] text-white/90 leading-relaxed bg-black/40 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                {setup.tradeType === "LONG" 
                  ? "SMC verified block orders sweeping retail stop-losses at limits. Formulating order accumulation block."
                  : "SMC identified high institutional distribution resistance at major highs. Preparing expansion downwards."
                }
              </p>
            </div>

            {/* Cancel / Enter */}
            <div className="grid grid-cols-2 gap-3 pt-2 select-none" id="dual-mockup-action-pills">
              <button
                onClick={onClose}
                className="w-full bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-white font-sans font-bold py-3 px-4 rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer text-center"
                id="cancel-simulated-trade"
              >
                Cancel
              </button>
              <button
                onClick={handleEnterTrade}
                className="w-full bg-[#34CDED] hover:bg-[#34CDED]/90 active:scale-95 text-black font-sans font-black py-3 px-4 rounded-2xl text-xs uppercase tracking-widest transition-all cursor-pointer text-center shadow-lg shadow-[#34CDED]/25"
                id="enter-simulated-trade"
              >
                Enter Trade
              </button>
            </div>

            {error && (
              <div className="text-center p-2.5 bg-pink-500/10 border border-pink-500/20 text-pink-400 font-mono text-[9px] rounded-xl">
                {error}
              </div>
            )}

          </div>

        </div>

        {/* Footer */}
        <div className="bg-black/20 py-3 border-t border-white/5 flex items-center justify-between px-6 text-[9px] font-mono text-white/70 select-none">
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-[#34CDED]" />
            <span>Ref: Live Signals</span>
          </span>
          <span className="flex items-center gap-1 text-[#34CDED]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#34CDED]" />
            <span>EXECUTION ONLINE</span>
          </span>
        </div>
      </div>
    </div>
  );
}
