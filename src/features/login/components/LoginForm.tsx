"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Smartphone, Lock, ArrowRight, Loader2 } from "lucide-react";
import { getApiUrl } from "@/lib/api";

const LoginForm = () => {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (!/^[0-9]{10}$/.test(phone)) return setMessage("Phone must be 10 digits");
    if (!/^[0-9]{6}$/.test(pin)) return setMessage("PIN must be 6 digits");

    setIsLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", 
        body: JSON.stringify({ phone, pin }),
      });

      const data = await res.json();
      console.log("Login response:", data);

      if (!res.ok) throw new Error(data.message || "Login failed");

      localStorage.setItem("userRole", data.user.role.toLowerCase());
      localStorage.setItem("userId", data.user.id);
      localStorage.setItem("userName", data.user.firstName);
      
      console.log("User role:", data.user.role.toLowerCase());

      if (data.user.role.toLowerCase() === "admin") {
        router.replace("/dashboard");
      } else {
        router.replace("/billing");
      }
    } catch (err: any) {
      setMessage(err.message || "Something went wrong");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Abstract Background Shapes */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-200/40 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
      <div className="absolute top-[-10%] right-[-20%] w-[500px] h-[500px] bg-blue-200/40 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
      <div className="absolute bottom-[-20%] left-[20%] w-[600px] h-[600px] bg-pink-200/40 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />

      {/* Main Card */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl w-full max-w-[420px] p-8 md:p-12 relative z-10 transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 transform rotate-[-6deg] hover:rotate-0 transition-transform duration-300">
               <span className="text-white text-2xl font-bold">HP</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Welcome Back</h1>
          <p className="text-gray-500 text-sm md:text-base">Sign in to manage billing, inventory coverage & Tally exports</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-5">
            {/* Phone Input */}
            <div className="relative group">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ml-1 block">Phone Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Smartphone className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type="tel"
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-gray-900 font-medium placeholder:text-gray-400"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  maxLength={10}
                  placeholder="Enter your phone"
                  required
                />
              </div>
            </div>

            {/* PIN Input */}
            <div className="relative group">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ml-1 block">Security PIN</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type={showPin ? "text" : "password"}
                  className="w-full pl-11 pr-12 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-gray-900 font-medium placeholder:text-gray-400 tracking-widest"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  placeholder="••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {message && (
            <div className="p-4 rounded-xl flex items-center gap-3 bg-red-50 border border-red-100 text-red-600 text-sm font-medium animate-in slide-in-from-top-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              {message}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-white/90" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} HP Computer Billing
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
