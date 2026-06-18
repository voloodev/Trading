import React, { useState, useEffect, useRef } from "react";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "../firebase";
import { AlertCircle, LogIn, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
}

interface SimulatedCandle {
  open: number;
  close: number;
  high: number;
  low: number;
  isGreen: boolean;
  growth: number; // for smooth entrance scaling
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (canvas) {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
      }
    };
    window.addEventListener("resize", handleResize);

    // Vertical boundary limits for candles animation:
    // Strictly limited between top 25% and below around 72% where the login button area is
    let minY = height * 0.25;
    let maxY = height * 0.72;

    const spacing = 11; // ultra-thin skinny spacing as requested
    const candleWidth = 3.5; // narrow elegant bodies
    const candlesList: SimulatedCandle[] = [];

    // Current plotter price coordinate state
    let currentPrice = minY + (maxY - minY) * 0.5;

    // Movement speeds
    let currentSpeed = 1.0;
    const maxPossibleSpeed = 2.8;

    // Generation accumulator
    let generationProgress = 0;

    // Rigid active point horizontal coord tracking
    let activeX = width * 0.65; // initial position

    // Market simulation states
    let trendDirection = 1; // 1 = UP, -1 = DOWN, 0 = RANGE
    let trendDuration = Math.floor(Math.random() * 15) + 8;

    const generateNextPricePoint = (lastClose: number): SimulatedCandle => {
      // Re-evaluate boundaries
      minY = height * 0.25;
      maxY = height * 0.72;

      if (trendDuration <= 0) {
        const r = Math.random();
        trendDirection = r < 0.45 ? 1 : r < 0.9 ? -1 : 0;
        trendDuration = Math.floor(Math.random() * 18) + 8;
      }
      trendDuration--;

      // Dynamic momentum volatility pushes
      const isBurst = Math.random() < 0.15;
      const volatility = isBurst ? (Math.random() * 45 + 30) : (Math.random() * 14 + 6);

      let delta = (Math.random() - 0.5) * volatility;
      if (trendDirection === 1) {
        delta += Math.random() * volatility * 0.4;
      } else if (trendDirection === -1) {
        delta -= Math.random() * volatility * 0.4;
      }

      // Safeguard: strictly steer prices if they approach the minY (25%) or maxY (72%) limits
      if (lastClose < minY + 30) {
        delta += Math.abs(delta) * 0.75 + 10;
      } else if (lastClose > maxY - 30) {
        delta -= Math.abs(delta) * 0.75 + 10;
      }

      const rawOpen = lastClose;
      const rawClose = lastClose + delta;

      // Constrain inside minY & maxY
      const open = Math.max(minY + 4, Math.min(maxY - 4, rawOpen));
      const close = Math.max(minY + 4, Math.min(maxY - 4, rawClose));
      const isGreen = close >= open;

      const wickPadding = volatility * 0.25;
      const high = Math.max(minY + 1, Math.min(open, close) - (Math.random() * wickPadding));
      const low = Math.min(maxY - 1, Math.max(open, close) + (Math.random() * wickPadding));

      return { open, close, high, low, isGreen, growth: 0.1 };
    };

    // Pre-populate viewport with initial chained candles list
    const preCount = 120;
    let tempPrice = currentPrice;
    for (let i = 0; i < preCount; i++) {
      const cData = generateNextPricePoint(tempPrice);
      candlesList.push({
        ...cData,
        growth: 1.0, // pre-grown
      });
      tempPrice = cData.close;
    }
    currentPrice = tempPrice;

    const render = () => {
      if (!ctx) return;

      // Ensure the background is pitch black
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      // Fine premium horizontal and vertical grid lines for depth
      ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Render boundary dotted visual lines (At top 25% and bottom 72%)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(0, minY);
      ctx.lineTo(width, minY);
      ctx.moveTo(0, maxY);
      ctx.lineTo(width, maxY);
      ctx.stroke();
      ctx.setLineDash([]); // reset

      // 1. Calculate dynamic speed factor smoothly (fast momentum bursts vs slow consolidation waves)
      // "sarin sare wege wadiyen gihin passe himin ehema dinamic speed ekakin hadena..."
      const timeFactor = Date.now() * 0.0007;
      let targetSpeed = 1.1 + Math.sin(timeFactor * 1.5) * Math.cos(timeFactor * 0.9) * 0.9;
      
      // Periodically trigger momentum bursts
      if (Math.sin(timeFactor * 3.8) > 0.8) {
        targetSpeed += 0.7; // surge speed
      }
      targetSpeed = Math.max(0.35, Math.min(maxPossibleSpeed, targetSpeed));
      
      // Smoothly interpolate current speed towards target speed
      currentSpeed += (targetSpeed - currentSpeed) * 0.035;

      // 2. Adjust target active point coordinate based on current generation speed!
      // When speed is low, the active generator point + chart drifts left. When fast, it goes right.
      // "dakunu patta kotasa athule... adu weddi chart ekath ekkama wamata yanawa, aay hadeddi dakunata yanawa"
      const lowerBoundX = width * 0.42; // middle area
      const upperBoundX = width * 0.82; // right corner
      
      // Speed ratio maps between 0.0 (slowest) and 1.0 (fastest)
      const speedRatio = (currentSpeed - 0.35) / (maxPossibleSpeed - 0.35);
      const targetActiveX = lowerBoundX + speedRatio * (upperBoundX - lowerBoundX);

      // Smoothly morph activeX position towards targetActiveX
      activeX += (targetActiveX - activeX) * 0.04;

      // 3. Drive generation accumulator based on the speed progress
      generationProgress += currentSpeed;

      if (generationProgress >= spacing) {
        generationProgress -= spacing;

        // Produce next block
        const freshC = generateNextPricePoint(currentPrice);
        candlesList.push(freshC);
        currentPrice = freshC.close;

        // Cap buffer to optimize memory
        if (candlesList.length > 300) {
          candlesList.shift();
        }
      }

      // Smoothly grow recently added candles
      candlesList.forEach((c) => {
        if (c.growth < 1.0) {
          c.growth += 0.085;
          if (c.growth > 1.0) c.growth = 1.0;
        }
      });

      // 4. Render the candles strictly relative to the active point & current scroll progress
      // Ensures they are rigidly anchored together so they never pass/overlap each other!
      const totalCandles = candlesList.length;

      candlesList.forEach((c, idx) => {
        // Position relative to the newest candle at index (totalCandles - 1)
        const offsetIndex = totalCandles - 1 - idx;
        const drawX = activeX - generationProgress - offsetIndex * spacing;

        // Keep rendering optimized inside screen view
        if (drawX < -30 || drawX > width + 30) return;

        const centerY = (c.open + c.close) / 2;
        const halfBody = (Math.abs(c.open - c.close) / 2) * c.growth;
        const wickHigh = centerY - (Math.abs(c.high - centerY) * c.growth);
        const wickLow = centerY + (Math.abs(centerY - c.low) * c.growth);

        // Draw shadow (wick) - always high-contrast white
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(drawX, wickLow);
        ctx.lineTo(drawX, wickHigh);
        ctx.stroke();

        // Draw bodies:
        // Bullish (Green/Buy) -> Solid pure White
        // Bearish (Red/Sell) -> Solid pure Black inside + crisp White border
        if (c.isGreen) {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(
            drawX - candleWidth / 2,
            centerY - halfBody,
            candleWidth,
            Math.max(1.5, halfBody * 2)
          );
        } else {
          ctx.fillStyle = "#000000";
          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = 1;

          ctx.fillRect(
            drawX - candleWidth / 2,
            centerY - halfBody,
            candleWidth,
            Math.max(1.5, halfBody * 2)
          );
          ctx.strokeRect(
            drawX - candleWidth / 2,
            centerY - halfBody,
            candleWidth,
            Math.max(1.5, halfBody * 2)
          );
        }
      });

      // 5. Render active generator point tick locator crosshair
      const finalPlotX = activeX - generationProgress;
      const liveClose = currentPrice;

      // Draw subtle pulsing locator circle
      ctx.beginPath();
      ctx.arc(finalPlotX, liveClose, 3, 0, 2 * Math.PI);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();

      const pulseRadius = 4 + Math.sin(Date.now() * 0.015) * 3;
      ctx.beginPath();
      ctx.arc(finalPlotX, liveClose, pulseRadius, 0, 2 * Math.PI);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 1;
      ctx.stroke();

      animFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animFrameId);
    };
  }, []);

  // Secure Google Authentication Whitelist check handler
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      const userCredential = await signInWithPopup(auth, provider);
      const email = userCredential.user.email;

      if (!email) {
        await signOut(auth);
        setError("Unable to obtain Google Account credentials. Try again.");
        setLoading(false);
        return;
      }

      const cleanEmail = email.toLowerCase().trim();
      const allowedDocRef = doc(db, "allowed_users", cleanEmail);
      
      let userAllowed = false;
      try {
        const allowedSnap = await getDoc(allowedDocRef);
        if (allowedSnap.exists()) {
          userAllowed = true;
        } else {
          // Automatic whitelist setup for Dhanul
          if (cleanEmail === "dhanulyasas200611@gmail.com") {
            try {
              await setDoc(allowedDocRef, { email: cleanEmail });
              userAllowed = true;
            } catch {
              userAllowed = true;
            }
          }
        }
      } catch (peekErr) {
        if (cleanEmail === "dhanulyasas200611@gmail.com") {
          userAllowed = true;
        } else {
          handleFirestoreError(peekErr, OperationType.GET, `allowed_users/${cleanEmail}`);
        }
      }

      if (!userAllowed) {
        await signOut(auth);
        setError(`Access Denied: "${email}" is currently not authorized for this security gateway.`);
        setLoading(false);
        return;
      }

      onLoginSuccess(userCredential.user);
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes("allowed_users")) {
        setError("Database validation currently inactive. Contact your administrator.");
      } else if (err.code === "auth/unauthorized-domain" || (err.message && err.message.includes("unauthorized-domain"))) {
        setError("Firebase Domain mismatch. Please authorize this preview domain in your Firebase Authentication Authorized domains list.");
      } else {
        setError(err.message || "An authentication error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden" id="login-viewport">
      
      {/* Background canvas filled with the endless scrolling high-momentum candles */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block z-0" />

      {/* Exquisite minimalistic premium Frosted Glass container moved even further down as requested */}
      <div 
        className="w-full max-w-sm absolute bottom-[10%] md:bottom-[12%] z-10 p-5 px-6"
        id="phone-wrapper-login"
      >
        <div className="space-y-4" id="unified-actions-panel">
          
          <AnimatePresence mode="popLayout">
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="bg-black/90 backdrop-blur-md border border-red-500/40 p-4 rounded-2xl text-xs text-red-300 flex items-start space-x-2 shadow-2xl"
                id="login-error-toast"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                <span className="leading-relaxed font-semibold">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Premium Frosted Glass styled button displaying only Goole Sign-In trigger */}
          <motion.button
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/15 backdrop-blur-md text-white font-sans font-black py-4 px-5 rounded-[28px] flex items-center justify-between transition-all duration-300 cursor-pointer disabled:opacity-50 active:scale-[0.98] shadow-2xl shadow-black/90 group"
            id="google-main-trigger"
          >
            {loading ? (
              <span className="flex items-center space-x-2.5 mx-auto justify-center font-bold">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="text-xs uppercase tracking-widest font-black text-white/90">Authenticating...</span>
              </span>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <LogIn className="w-4.5 h-4.5 text-white/80 group-hover:rotate-6 transition-transform" />
                  <span className="text-xs md:text-sm tracking-wide uppercase font-extrabold text-white">
                    Sign in with Google Account
                  </span>
                </div>
                <span className="p-1 px-1.5 bg-white/10 border border-white/10 rounded-xl group-hover:translate-x-1 transition-transform">
                  <ChevronRight className="w-4 h-4 text-white" />
                </span>
              </>
            )}
          </motion.button>

        </div>
      </div>
    </div>
  );
}
