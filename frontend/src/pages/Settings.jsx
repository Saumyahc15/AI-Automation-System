import { useState, useEffect } from "react";
import api from "../api/client";
import toast from "react-hot-toast";

const inp = {
  width:"100%", padding:"8px 10px",
  border:"0.5px solid var(--border2)", borderRadius:8,
  background:"var(--surface)", color:"var(--text)",
  fontSize:13, outline:"none"
};
const label = { fontSize:12, color:"var(--text2)", marginBottom:4, display:"block" };

const Section = ({ title, children }) => (
  <div style={{ background:"var(--surface)", border:"0.5px solid var(--border)", borderRadius:12, padding:20, marginBottom:16 }}>
    <div style={{ fontSize:13, fontWeight:500, marginBottom:16, paddingBottom:10, borderBottom:"0.5px solid var(--border)" }}>{title}</div>
    {children}
  </div>
);

export default function Settings() {
  const [saved, setSaved] = useState(false);
  const [config, setConfig] = useState({
    smtp_host: "smtp.gmail.com",
    smtp_port: 587,
    smtp_user: "",
    smtp_password: "",
    manager_email: "",
    telegram_bot_token: "",
    telegram_chat_id: "",
    twilio_sid: "",
    twilio_token: "",
    twilio_from: ""
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await api.get("/auth/config");
        setConfig((prev) => ({ ...prev, ...data }));
      } catch (err) {
        toast.error("Failed to load user configuration");
      }
    };
    fetchConfig();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      await api.patch("/auth/config", config);
      toast.success("Settings saved successfully.");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      toast.error("Failed to save settings");
    }
  };

  return (
    <div style={{ maxWidth:640 }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:20, fontWeight:600 }}>Account Settings</h1>
        <p style={{ color:"var(--text2)", fontSize:13, marginTop:2 }}>
          Configure your personal notification credentials. Workflows will dynamically sync with these settings.
        </p>
      </div>

      <Section title="Email (SMTP)">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div><label style={label}>SMTP host</label><input style={inp} name="smtp_host" value={config.smtp_host || ""} onChange={handleChange} /></div>
          <div><label style={label}>SMTP port</label><input style={inp} type="number" name="smtp_port" value={config.smtp_port || 587} onChange={handleChange} /></div>
          <div><label style={label}>Gmail address</label><input style={inp} name="smtp_user" value={config.smtp_user || ""} onChange={handleChange} placeholder="you@gmail.com" /></div>
          <div><label style={label}>App password</label><input style={inp} type="password" name="smtp_password" value={config.smtp_password || ""} onChange={handleChange} placeholder="16-char app password" /></div>
          <div style={{ gridColumn:"span 2" }}><label style={label}>Manager email (receives alerts)</label><input style={inp} name="manager_email" value={config.manager_email || ""} onChange={handleChange} placeholder="manager@gmail.com" /></div>
        </div>
        <div style={{ marginTop:12, padding:"10px 14px", background:"var(--info-light, #E6F1FB)", borderRadius:8, fontSize:12, color:"var(--info, #185FA5)" }}>
          Use a Gmail App Password, not your normal password. Generate one at Google Account → Security → App passwords.
        </div>
      </Section>

      <Section title="Telegram bot">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div><label style={label}>Bot token</label><input style={inp} type="password" name="telegram_bot_token" value={config.telegram_bot_token || ""} onChange={handleChange} placeholder="From @BotFather" /></div>
          <div><label style={label}>Chat ID</label><input style={inp} name="telegram_chat_id" value={config.telegram_chat_id || ""} onChange={handleChange} placeholder="Your chat ID number" /></div>
        </div>
        <div style={{ marginTop:12, padding:"10px 14px", background:"var(--info-light, #E6F1FB)", borderRadius:8, fontSize:12, color:"var(--info, #185FA5)" }}>
          Get your bot token from @BotFather on Telegram. Get your chat ID by messaging the bot once then visiting api.telegram.org/bot&lt;TOKEN&gt;/getUpdates.
        </div>
      </Section>

      <Section title="WhatsApp (Twilio)">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div style={{ gridColumn:"span 2" }}><label style={label}>Twilio Account SID</label><input style={inp} type="password" name="twilio_sid" value={config.twilio_sid || ""} onChange={handleChange} /></div>
          <div style={{ gridColumn:"span 2" }}><label style={label}>Twilio Auth Token</label><input style={inp} type="password" name="twilio_token" value={config.twilio_token || ""} onChange={handleChange} /></div>
          <div><label style={label}>Twilio WhatsApp Number</label><input style={inp} name="twilio_from" value={config.twilio_from || ""} onChange={handleChange} placeholder="+14155238886" /></div>
        </div>
        <div style={{ marginTop:12, padding:"10px 14px", background:"var(--info-light, #E6F1FB)", borderRadius:8, fontSize:12, color:"var(--info, #185FA5)" }}>
          Twilio Sandbox for WhatsApp requires a From number. Setup your sandbox at Twilio Console → Messaging → Try it Out → WhatsApp Sandbox.
        </div>
      </Section>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button onClick={handleSave} style={{
          padding:"10px 24px", borderRadius:8, border:"none",
          background:"var(--accent)", color:"#fff",
          fontWeight:500, cursor:"pointer", fontSize:14
        }}>
          {saved ? "Saved ✓" : "Save settings"}
        </button>
        <button onClick={() => { localStorage.removeItem("token"); window.location.reload(); }} style={{
          padding:"10px 24px", borderRadius:8, border:"1px solid var(--border)",
          background:"transparent", color:"var(--text)",
          fontWeight:500, cursor:"pointer", fontSize:14
        }}>
          Logout
        </button>
      </div>
    </div>
  );
}