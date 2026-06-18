import React from "react";
import { X, TrendingUp, TrendingDown, ClipboardList, Wallet, Sparkles, LogOut, Clock, Play } from "lucide-react";
import { UserProfile, TradeHistory } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface HamburgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  tradeLogs: TradeHistory[];
  onSignOut: () => void;
  livePrices: Record<string, number>;
  onClosePosition: (tradeId: string, finalPnlUSD: number, finalGainPct: number) => void;
}

export default function HamburgerMenu({
  isOpen,
  onClose,
  profile,
  tradeLogs,
  onSignOut,
  livePrices,
  onClosePosition,
}: HamburgerMenuProps) {
  // Calculate completed stats
  const totalTrades = tradeLogs.length;
  const completedTrades = tradeLogs.filter((t) => t.result !== "RUNNING");
  const winTrades = completedTrades.filter((t) => t.result === "TP Hit").length;
  const winRate = completedTrades.length > 0 ? ((winTrades / completedTrades.length) * 100).toFixed(1) : "0.0";
  const profitLossPct = profile.initialBalance > 0 
    ? (((profile.balance - profile.initialBalance) / profile.initialBalance) * 100).toFixed(2)
    : "0.00";

  const totalGains = parseFloat(profitLossPct);

  // Generate dynamic chart data based on completed historical trades timeline
  let runningBalance = profile.initialBalance;
  const balanceChartData = [
    { name: "Start", balance: profile.initialBalance },
    ...[...completedTrades]
      .reverse() // chronological order for flow
      .map((trade, i) => {
        // Find allocation gain/loss
        const delta = (trade.riskUSD || 5) * (trade.result === "TP Hit" ? (trade.gainLossPct / 10) : -1);
        runningBalance = parseFloat((runningBalance + delta).toFixed(2));
        return {
          name: `Trade ${i + 1}`,
          balance: runningBalance,
        };
      }),
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Blur overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 cursor-pointer"
            id="menu-backdrop-layer"
          />

          {/* Sliding Menu Board */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 180 }}
            className="fixed inset-y-0 left-0 w-full max-w-sm bg-black/40 border-r border-white/10 z-55 flex flex-col shadow-[15px_0_30px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
            id="menu-side-pane"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/20">
              <div className="flex items-center space-x-2.5">
                <Sparkles className="w-5 h-5 text-[#34CDED] animate-pulse" />
                <span className="font-display font-black text-white text-xs tracking-widest uppercase">
                  SMC LEDGER CONSOLE
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-white/5 rounded-full text-white hover:text-[#34CDED] transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Wallet Block */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-white">
                  <Wallet className="w-4 h-4 text-[#34CDED]" />
                  <span className="font-display text-[10px] font-black uppercase tracking-widest">
                    Simulated Portfolio Balance
                  </span>
                </div>

                <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 relative overflow-hidden">
                  <span className="font-mono text-[8px] text-[#34CDED] block uppercase tracking-wider font-extrabold">CURRENT LIQUIDITY</span>
                  <div className="font-sans text-2xl font-black text-white tracking-tight mb-2">
                    ${profile.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>

                  <div className="flex items-center space-x-2">
                    {totalGains >= 0 ? (
                      <span className="flex items-center space-x-1 font-mono text-[10px] text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                        <TrendingUp className="w-3 h-3" />
                        <span>+{totalGains}% YIELD</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 font-mono text-[10px] text-pink-400 font-bold bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20">
                        <TrendingDown className="w-3 h-3" />
                        <span>{totalGains}% YIELD</span>
                      </span>
                    )}
                    <span className="font-mono text-[9px] text-white/70">
                      from ${profile.initialBalance.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic Compound Yield Chart */}
              {completedTrades.length > 0 && (
                <div className="space-y-2">
                  <span className="font-mono text-[9px] text-white uppercase tracking-widest block font-bold">
                    Portfolio Growth Curve
                  </span>
                  <div className="bg-black/40 border border-white/10 rounded-2xl p-3 h-[130px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={balanceChartData} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
                        <XAxis dataKey="name" stroke="#555" fontSize={8} tickLine={false} />
                        <YAxis hide domain={["auto", "auto"]} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#000000",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            fontSize: "9px",
                            borderRadius: "12px",
                            color: "#fff",
                            fontFamily: "monospace",
                          }}
                          labelStyle={{ color: "#34CDED" }}
                        />
                        <Line
                          type="monotone"
                          dataKey="balance"
                          stroke="#34CDED"
                          strokeWidth={2}
                          dot={{ r: 2 }}
                          activeDot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Trade Log Ledger (Split into Running & Completed for pristine organization) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center space-x-2 text-white">
                    <ClipboardList className="w-4 h-4 text-[#34CDED]" />
                    <span className="font-display text-[10px] font-bold uppercase tracking-widest text-[#34CDED]">
                      LIVE POSITION LEDGER
                    </span>
                  </div>
                  <span className="font-mono text-[9px] text-[#34CDED] font-bold bg-[#34CDED]/10 px-2 py-0.5 rounded">
                    {winRate}% ACC ({winTrades}/{completedTrades.length})
                  </span>
                </div>

                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {totalTrades === 0 ? (
                    <div className="text-center font-sans text-[11px] text-white/50 py-8 border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
                      No active trades. Click any detected instances to start trading.
                    </div>
                  ) : (
                    tradeLogs.map((trade) => {
                      const isRunning = trade.result === "RUNNING";
                      
                      // Calculate active fluctuating values in real-time
                      const isLong = trade.tradeType === "LONG";
                      const ticker = (trade.coinName || "BTC").replace("/", "").toUpperCase();
                      const livePrice = livePrices[ticker] || trade.entryPrice;
                      const entry = trade.entryPrice;
                      const tp = trade.tpPrice || entry * 1.02;
                      const sl = trade.slPrice || entry * 0.99;
                      const riskUSD = trade.riskUSD || 5;

                      // Risk-to-Reward ratio
                      const riskToReward = Math.abs(tp - entry) / Math.abs(entry - sl) || 2;

                      // Live fluctuating yield metrics
                      let currentPnlUSD = 0;
                      let currentYieldPct = 0;

                      if (isRunning) {
                        if (isLong) {
                          if (livePrice >= entry) {
                            const gap = tp - entry;
                            const ratio = gap > 0 ? (livePrice - entry) / gap : 0;
                            currentPnlUSD = ratio * (riskUSD * riskToReward);
                            currentYieldPct = ratio * (riskToReward * 10);
                          } else {
                            const gap = entry - sl;
                            const ratio = gap > 0 ? (entry - livePrice) / gap : 0;
                            currentPnlUSD = -ratio * riskUSD;
                            currentYieldPct = -ratio * 10;
                          }
                        } else { // SHORT
                          if (livePrice <= entry) {
                            const gap = entry - tp;
                            const ratio = gap > 0 ? (entry - livePrice) / gap : 0;
                            currentPnlUSD = ratio * (riskUSD * riskToReward);
                            currentYieldPct = ratio * (riskToReward * 10);
                          } else {
                            const gap = sl - entry;
                            const ratio = gap > 0 ? (livePrice - entry) / gap : 0;
                            currentPnlUSD = -ratio * riskUSD;
                            currentYieldPct = -ratio * 10;
                          }
                        }
                      } else {
                        // Settle static completed
                        const isWin = trade.result === "TP Hit";
                        currentYieldPct = trade.gainLossPct;
                        currentPnlUSD = isWin ? (riskUSD * (trade.gainLossPct / 10)) : -riskUSD;
                      }

                      const finalPnlStr = currentPnlUSD >= 0 
                        ? `+$${currentPnlUSD.toFixed(2)}` 
                        : `-$${Math.abs(currentPnlUSD).toFixed(2)}`;

                      return (
                        <div
                          key={trade.id}
                          className={`border rounded-2xl p-3.5 space-y-2.5 transition-all relative overflow-hidden backdrop-blur-md ${
                            isRunning 
                              ? "bg-[#34CDED]/5 border-[#34CDED]/30 animate-pulse-slow" 
                              : "bg-white/[0.03] border-white/10"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-2">
                                <span className="font-sans font-extrabold text-xs text-white uppercase">
                                  {trade.coinName.toUpperCase()}
                                </span>
                                <span className={`text-[8px] font-mono font-black px-2 py-0.5 rounded-full ${
                                  isLong ? "bg-green-500/15 text-green-400" : "bg-pink-500/15 text-pink-400"
                                }`}>
                                  {trade.tradeType}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1 font-mono text-[9px] text-white/70">
                                <span>Risk: ${riskUSD} USD</span>
                                <span>•</span>
                                <span>Ratio: 1:{riskToReward.toFixed(1)}</span>
                              </div>
                            </div>

                            <div className="text-right">
                              {isRunning ? (
                                <div className="space-y-0.5">
                                  <span className="font-mono text-[9px] text-[#34CDED] font-black block animate-pulse">
                                    🟡 RUNNING
                                  </span>
                                  <span className={`font-mono text-[11px] font-black block ${
                                    currentPnlUSD >= 0 ? "text-green-400" : "text-pink-400"
                                  }`}>
                                    {finalPnlStr} ({currentYieldPct >= 0 ? "+" : ""}{currentYieldPct.toFixed(1)}%)
                                  </span>
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <span className={`font-mono text-[9px] font-black block ${
                                    trade.result === "TP Hit" ? "text-green-400" : "text-pink-400"
                                  }`}>
                                    {trade.result === "TP Hit" ? "🟢 TP HIT" : "🔴 SL HIT"}
                                  </span>
                                  <span className={`font-mono text-[10px] font-black ${
                                    trade.result === "TP Hit" ? "text-green-400" : "text-pink-400"
                                  }`}>
                                    {finalPnlStr}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Prices bar */}
                          <div className="flex items-center justify-between text-[9px] font-mono border-t border-white/5 pt-2 text-white/90">
                            <span>ENTRY: ${entry}</span>
                            {isRunning ? (
                              <span className="text-[#34CDED] animate-pulse">LIVE: ${livePrice}</span>
                            ) : (
                              <span>EXIT: ${trade.exitPrice}</span>
                            )}
                          </div>

                          {/* Trigger cancel or manual Early Close for active running positions */}
                          {isRunning && (
                            <button
                              onClick={() => onClosePosition(trade.id, currentPnlUSD, currentYieldPct)}
                              className="w-full bg-[#34CDED] text-black font-extrabold py-1.5 rounded-xl text-[9px] uppercase tracking-wider cursor-pointer hover:bg-white transition-colors"
                            >
                              Close Position Early ({finalPnlStr})
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Footer with Operator Identifier & Sign Out */}
            <div className="p-4 bg-black/40 border-t border-white/10 flex items-center justify-between">
              <div className="flex flex-col space-y-0.5">
                <span className="font-mono text-[8px] text-[#34CDED] uppercase tracking-widest block font-bold">OPERATING AS</span>
                <span className="font-mono text-[10px] text-white font-bold truncate max-w-[170px]">
                  {profile.email}
                </span>
              </div>
              <button
                onClick={onSignOut}
                className="flex items-center space-x-1.5 py-2 px-3 rounded-xl bg-red-950/20 hover:bg-rose-950/40 border border-red-500/20 text-[#34CDED] font-mono text-[10px] font-bold transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-white" />
                <span className="text-white">LOGOUT</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
