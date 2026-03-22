import { useState } from "react";
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

  const handleSave = () => {
    toast.success("Settings noted — update your .env file manually to apply changes.");
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ maxWidth:640 }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:20, fontWeight:600 }}>Settings</h1>
        <p style={{ color:"var(--text2)", fontSize:13, marginTop:2 }}>
          Configure your notification credentials. Changes must be applied to your <code style={{ fontFamily:"DM Mono, monospace", fontSize:12, background:"var(--surface2)", padding:"1px 5px", borderRadius:4 }}>.env</code> file and server restarted.
        </p>
      </div>

      <Section title="Email (SMTP)">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div><label style={label}>SMTP host</label><input style={inp} defaultValue="smtp.gmail.com" readOnly /></div>
          <div><label style={label}>SMTP port</label><input style={inp} defaultValue="587" readOnly /></div>
          <div><label style={label}>Gmail address</label><input style={inp} placeholder="you@gmail.com" /></div>
          <div><label style={label}>App password</label><input style={inp} type="password" placeholder="16-char app password" /></div>
          <div style={{ gridColumn:"span 2" }}><label style={label}>Manager email (receives alerts)</label><input style={inp} placeholder="manager@gmail.com" /></div>
        </div>
        <div style={{ marginTop:12, padding:"10px 14px", background:"var(--info-light, #E6F1FB)", borderRadius:8, fontSize:12, color:"var(--info, #185FA5)" }}>
          Use a Gmail App Password, not your normal password. Generate one at Google Account → Security → App passwords.
        </div>
      </Section>

      <Section title="Telegram bot">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div><label style={label}>Bot token</label><input style={inp} type="password" placeholder="From @BotFather" /></div>
          <div><label style={label}>Chat ID</label><input style={inp} placeholder="Your chat ID number" /></div>
        </div>
        <div style={{ marginTop:12, padding:"10px 14px", background:"var(--info-light, #E6F1FB)", borderRadius:8, fontSize:12, color:"var(--info, #185FA5)" }}>
          Get your bot token from @BotFather on Telegram. Get your chat ID by messaging the bot once then visiting api.telegram.org/bot&lt;TOKEN&gt;/getUpdates.
        </div>
      </Section>

      <Section title="Groq API">
        <div><label style={label}>API key</label><input style={inp} type="password" placeholder="gsk_..." /></div>
        <div style={{ marginTop:12, padding:"10px 14px", background:"var(--success-light, #EAF3DE)", borderRadius:8, fontSize:12, color:"var(--success, #3B6D11)" }}>
          Get your free API key at console.groq.com. Model in use: llama-3.3-70b-versatile.
        </div>
      </Section>

      <Section title="Watcher intervals">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div>
            <label style={label}>Stock watcher (seconds)</label>
            <input style={inp} type="number" defaultValue={30} readOnly />
          </div>
          <div>
            <label style={label}>Order watcher (hours)</label>
            <input style={inp} type="number" defaultValue={1} readOnly />
          </div>
          <div>
            <label style={label}>Customer watcher (hours)</label>
            <input style={inp} type="number" defaultValue={6} readOnly />
          </div>
          <div>
            <label style={label}>Daily report time</label>
            <input style={inp} defaultValue="21:00" readOnly />
          </div>
        </div>
        <div style={{ marginTop:12, padding:"10px 14px", background:"var(--surface2)", borderRadius:8, fontSize:12, color:"var(--text2)" }}>
          To change watcher intervals, edit the scheduler jobs in <code style={{ fontFamily:"DM Mono, monospace" }}>backend/app/main.py</code>.
        </div>
      </Section>

      <button onClick={handleSave} style={{
        padding:"10px 24px", borderRadius:8, border:"none",
        background:"var(--accent)", color:"#fff",
        fontWeight:500, cursor:"pointer", fontSize:14
      }}>
        {saved ? "Saved ✓" : "Save settings"}
      </button>
    </div>
  );
}