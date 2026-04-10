import { useState } from "react";
import api from "../api/client";
import toast from "react-hot-toast";

export default function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [showOtp, setShowOtp] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (showOtp) {
        // Submit OTP verification
        await api.post("/auth/verify-email", { email, code: otp });
        toast.success("Email verified successfully! You can now login.");
        setShowOtp(false);
        setIsLogin(true);
      } else if (isLogin) {
        const formData = new URLSearchParams();
        formData.append("username", username);
        formData.append("password", password);
        const { data } = await api.post("/auth/login", formData);
        localStorage.setItem("token", data.access_token);
        onLogin(data.access_token);
      } else {
        const { data } = await api.post("/auth/register", { email, username, password });
        toast.success(data.detail || "Registration successful! Check your email for OTP.");
        setShowOtp(true);
      }
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.detail?.includes("verified")) {
        toast.error("Please verify your email first.");
        // We could also show the OTP window and prompt for Email, but Registration is the standard flow that triggers email.
      } else {
        toast.error(err.response?.data?.detail || "Authentication error");
      }
    } finally {
      setLoading(false);
    }
  };

  const inp = {
    width: "100%", padding: "10px", marginBottom: "12px",
    border: "1px solid var(--border)", borderRadius: "8px",
    background: "var(--surface)", color: "var(--text)", outline: "none"
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "var(--bg)", color: "var(--text)"
    }}>
      <div style={{
        background: "var(--surface2)", padding: "30px",
        borderRadius: "12px", width: "100%", maxWidth: "360px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
      }}>
        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
          {showOtp ? "Verify Email" : (isLogin ? "Welcome Back" : "Create Account")}
        </h2>
        <form onSubmit={handleSubmit}>
          {showOtp ? (
            <input style={inp} placeholder="Enter 6-digit OTP"
              value={otp} onChange={(e) => setOtp(e.target.value)} required />
          ) : (
            <>
              {!isLogin && (
                <input style={inp} type="email" placeholder="Email"
                  value={email} onChange={(e) => setEmail(e.target.value)} required />
              )}
              <input style={inp} placeholder="Username"
                value={username} onChange={(e) => setUsername(e.target.value)} required />
              <input style={inp} type="password" placeholder="Password"
                value={password} onChange={(e) => setPassword(e.target.value)} required />
            </>
          )}
          <button type="submit" disabled={loading} style={{
            width: "100%", padding: "12px", borderRadius: "8px",
            background: "var(--accent)", color: "#fff", border: "none",
            fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
            marginTop: "10px"
          }}>
            {loading ? "Please wait..." : (showOtp ? "Verify OTP" : (isLogin ? "Login" : "Sign Up"))}
          </button>
        </form>
        {!showOtp && (
          <p style={{ textAlign: "center", marginTop: "16px", fontSize: "14px", color: "var(--text2)" }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span
              style={{ color: "var(--accent)", cursor: "pointer", fontWeight: 500 }}
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Sign Up" : "Login"}
            </span>
          </p>
        )}
        {showOtp && (
          <p style={{ textAlign: "center", marginTop: "16px", fontSize: "14px", color: "var(--text2)", cursor: "pointer", fontWeight: 500 }} onClick={() => setShowOtp(false)}>
            Back to login
          </p>
        )}
      </div>
    </div>
  );
}
