import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:8000/api/v1";

// Images from public/images folder
const IMAGES = [
  "/images/Anime_AMV_Style_W5_NF5LP.jpg",
  "/images/Anime_AMV_Style_XwZ-RV34.jpg",
  "/images/Anime_AMV_Style_7SNOgbgk.jpg",
  "/images/Anime_AMV_Style_J88NO5zT.jpg",
  "/images/Anime_AMV_Style_KgW07ojT.jpg",
  "/images/Anime_AMV_Style_3v5JMEQ3.jpg",
  "/images/Anime_AMV_Style_yPRELgbu.jpg",
  "/images/Anime_AMV_Style_gLAMbV0V.jpg",
  "/images/Anime_AMV_Style_VWYiy1dr.jpg",
  "/images/Anime_AMV_Style_LB0OgVR9.jpg",
  "/images/Anime_AMV_Style_Ul4UEPfX.jpg",
  "/images/Anime_AMV_Style_iKaHwnC9.jpg",
  "/images/Anime_AMV_Style_4dJhHsd2.jpg",
  "/images/Anime_AMV_Style_icC48Fk9.jpg",
  "/images/Anime_AMV_Style_LjMvLw5h.jpg",
  "/images/Anime_AMV_Style_1_o5EzsR.jpg"
];

// ── Icons ──────────────────────────────────────────────────
const EyeOpen = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeOff = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);
const UserIco = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const LockIco = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const BrandLogo = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    <rect width="36" height="36" rx="9" fill="url(#bl)"/>
    <defs>
      <linearGradient id="bl" x1="0" y1="0" x2="36" y2="36">
        <stop offset="0%" stopColor="#00e5ff"/>
        <stop offset="100%" stopColor="#7b2fff"/>
      </linearGradient>
    </defs>
    <path d="M9 18l6 6 12-12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ── Slideshow ──────────────────────────────────────────────
function Slideshow() {
  const [cur,  setCur]  = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCur(c => (c + 1) % IMAGES.length);
        setFade(true);
      }, 600);
    }, 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={SL.wrap}>
      {/* preload all images silently */}
      {IMAGES.map((src, i) => (
        <div
          key={i}
          style={{
            ...SL.slide,
            backgroundImage: `url(${src})`,
            opacity: i === cur ? (fade ? 1 : 0) : 0,
            transform: i === cur ? (fade ? "scale(1.04)" : "scale(1.0)") : "scale(1.0)",
            transition: i === cur
              ? "opacity 0.7s ease, transform 3.5s ease"
              : "opacity 0.6s ease",
            zIndex: i === cur ? 1 : 0,
          }}
        />
      ))}

      {/* overlay */}
      <div style={SL.overlay}/>

      {/* scanlines */}
      <div style={SL.scanlines}/>

      {/* hero text */}
      <div style={SL.hero}>
        <div style={SL.badge}>MANUFACTURING · QMS · PRECISION</div>
        <h1 style={SL.h1}>
          Quality.<br/>
          <span style={SL.accent}>Precision.</span><br/>
          Excellence.
        </h1>
        <p style={SL.p}>
          The all-in-one platform for manufacturing quality management
          and project operations — built for teams that demand precision.
        </p>
        <div style={SL.stats}>
          {[["99.8%","Uptime SLA"],["ISO 9001","Certified"],["12K+","Inspections/mo"]].map(([v,l]) => (
            <div key={l} style={SL.stat}>
              <span style={SL.statV}>{v}</span>
              <span style={SL.statL}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* dots */}
      <div style={SL.dots}>
        {IMAGES.map((_,i) => (
          <div
            key={i}
            onClick={() => setCur(i)}
            style={{ ...SL.dot, ...(i === cur ? SL.dotOn : {}) }}
          />
        ))}
      </div>
    </div>
  );
}

const SL = {
  wrap:     { position:"relative", width:"100%", height:"100%", overflow:"hidden", background:"#000" },
  slide:    { position:"absolute", inset:0, backgroundSize:"cover", backgroundPosition:"center", willChange:"opacity,transform" },
  overlay:  { position:"absolute", inset:0, zIndex:2,
              background:"linear-gradient(125deg,rgba(0,0,0,.78) 0%,rgba(0,10,30,.6) 55%,rgba(0,229,255,.06) 100%)" },
  scanlines:{ position:"absolute", inset:0, zIndex:3, pointerEvents:"none",
              backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.05) 2px,rgba(0,0,0,0.05) 4px)" },
  hero:     { position:"absolute", bottom:"9%", left:"6%", zIndex:4, maxWidth:520 },
  badge:    { display:"inline-block", background:"rgba(0,229,255,0.1)", border:"1px solid rgba(0,229,255,0.4)",
              color:"#00e5ff", fontSize:10, fontWeight:700, letterSpacing:"0.2em",
              padding:"4px 14px", borderRadius:20, marginBottom:16, fontFamily:"'Syne',sans-serif" },
  h1:       { fontFamily:"'Syne',sans-serif", fontSize:"clamp(2.1rem,3.8vw,3.6rem)", fontWeight:800,
              color:"#fff", lineHeight:1.08, marginBottom:14, textShadow:"0 2px 40px rgba(0,0,0,.5)" },
  accent:   { background:"linear-gradient(90deg,#00e5ff,#7b2fff)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" },
  p:        { fontFamily:"'DM Sans',sans-serif", fontSize:"clamp(0.82rem,1vw,0.97rem)",
              color:"rgba(255,255,255,0.62)", lineHeight:1.65, marginBottom:26, fontWeight:300, maxWidth:390 },
  stats:    { display:"flex", gap:20 },
  stat:     { display:"flex", flexDirection:"column", gap:3, borderLeft:"2px solid rgba(0,229,255,0.5)", paddingLeft:12 },
  statV:    { fontFamily:"'Syne',sans-serif", fontSize:"1.1rem", fontWeight:700, color:"#fff" },
  statL:    { fontSize:"0.65rem", color:"rgba(255,255,255,0.4)", letterSpacing:"0.08em", textTransform:"uppercase" },
  dots:     { position:"absolute", bottom:18, left:"50%", transform:"translateX(-50%)",
              zIndex:5, display:"flex", gap:6 },
  dot:      { width:6, height:6, borderRadius:"50%", background:"rgba(255,255,255,0.25)",
              cursor:"pointer", transition:"all 0.3s" },
  dotOn:    { background:"#00e5ff", boxShadow:"0 0 8px #00e5ff", width:20, borderRadius:3 },
};

// ── Input Field ────────────────────────────────────────────
function Field({ label, type, value, onChange, icon, showToggle, show, onToggle, error }) {
  return (
    <div style={G.group}>
      <label style={G.label}>{label}</label>
      <div style={G.wrap}>
        <span style={G.ico}>{icon}</span>
        <input
          style={{ ...G.input, borderColor: error ? "rgba(255,80,80,.7)" : "rgba(255,255,255,.09)" }}
          type={showToggle ? (show ? "text" : "password") : type}
          placeholder={`Enter ${label.toLowerCase()}`}
          value={value}
          onChange={onChange}
        />
        {showToggle && (
          <button style={G.eye} onClick={onToggle} type="button">
            {show ? <EyeOff/> : <EyeOpen/>}
          </button>
        )}
      </div>
      {error && <span style={G.err}>{error}</span>}
    </div>
  );
}

// ── Glass Panel ────────────────────────────────────────────
function GlassPanel() {
  const navigate = useNavigate();
  const [view,  setView]  = useState("login");
  const [showP, setShowP] = useState(false);
  const [showC, setShowC] = useState(false);
  const [login, setLogin] = useState({ username:"", password:"" });
  const [reg,   setReg]   = useState({ username:"", password:"", confirm:"" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const mismatch = reg.confirm && reg.confirm !== reg.password;
  const switchTo = (v) => { setView(v); setShowP(false); setShowC(false); setError(""); };

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) navigate("/dashboard");
  }, [navigate]);

  const handleLogin = async () => {
    if (!login.username || !login.password) {
      setError("Please enter username and password");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: login.username, password: login.password }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const data = await response.json();
      if (data.success) {
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", data.token);
        navigate("/dashboard");
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      if (login.username === "system admin" && login.password === "qms2026#") {
        const defaultUser = { id: 1, username: "system admin", role: "admin", created_at: new Date().toISOString() };
        localStorage.setItem("user", JSON.stringify(defaultUser));
        localStorage.setItem("token", "default_admin_token");
        navigate("/dashboard");
      } else {
        setError("Cannot connect to server. Using fallback mode only for system admin.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!reg.username || !reg.password) { setError("Please fill in all fields"); return; }
    if (reg.password !== reg.confirm) { setError("Passwords do not match"); return; }
    setLoading(true);
    setError("");
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: reg.username, password: reg.password, role: "user" }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const data = await response.json();
      if (data.success) {
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", data.token);
        navigate("/dashboard");
      } else {
        setError(data.message || "Registration failed");
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setError("Request timed out. Please try again.");
      } else {
        setError("Cannot connect to server. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={G.box}>
      <div style={G.logoRow}>
        <BrandLogo/>
        <span style={G.logoTxt}>QMS<span style={G.logoAcc}>Pro</span></span>
      </div>

      <div key={view} style={{ animation:"gpIn .32s ease" }}>
        {view === "login" ? (
          <>
            <h2 style={G.h2}>Welcome back</h2>
            <p  style={G.sub}>Sign in to your workspace</p>

            {error && <div style={G.errorBox}>{error}</div>}

            <Field label="Username" type="text"
              value={login.username} onChange={e => setLogin({...login, username:e.target.value})}
              icon={<UserIco/>}/>
            <Field label="Password" type="password"
              value={login.password} onChange={e => setLogin({...login, password:e.target.value})}
              icon={<LockIco/>} showToggle show={showP} onToggle={() => setShowP(!showP)}/>

            <div style={G.forgotRow}>
              <span style={G.forgotTxt}>Forgot password?</span>
            </div>

            <button style={{...G.btn, opacity: loading ? 0.7 : 1}} type="button" onClick={handleLogin} disabled={loading}>
              {loading ? "Signing In..." : "Sign In →"}
            </button>

            <div style={G.divRow}><span style={G.divLine}/><span style={G.divTxt}>or</span><span style={G.divLine}/></div>

            <p style={G.sw}>
              Don't have an account?{" "}
              <button style={G.swLink} onClick={() => switchTo("register")} type="button">Create one</button>
            </p>

            <p style={G.defaultHint}>
              <strong>Default:</strong> system admin / qms2026#
            </p>
          </>
        ) : (
          <>
            <h2 style={G.h2}>Create account</h2>
            <p  style={G.sub}>Join your team's workspace</p>

            {error && <div style={G.errorBox}>{error}</div>}

            <Field label="Username" type="text"
              value={reg.username} onChange={e => setReg({...reg, username:e.target.value})}
              icon={<UserIco/>}/>
            <Field label="Password" type="password"
              value={reg.password} onChange={e => setReg({...reg, password:e.target.value})}
              icon={<LockIco/>} showToggle show={showP} onToggle={() => setShowP(!showP)}/>
            <Field label="Confirm Password" type="password"
              value={reg.confirm} onChange={e => setReg({...reg, confirm:e.target.value})}
              icon={<LockIco/>} showToggle show={showC} onToggle={() => setShowC(!showC)}
              error={mismatch ? "Passwords do not match" : null}/>

            <button style={{...G.btn, marginTop:4, opacity: loading ? 0.7 : 1}} type="button" onClick={handleRegister} disabled={loading}>
              {loading ? "Creating Account..." : "Register +"}
            </button>

            <div style={G.divRow}><span style={G.divLine}/><span style={G.divTxt}>or</span><span style={G.divLine}/></div>

            <p style={G.sw}>
              Already have an account?{" "}
              <button style={G.swLink} onClick={() => switchTo("login")} type="button">Sign in</button>
            </p>
          </>
        )}
      </div>

      <style>{`
        @keyframes gpIn {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0);    }
        }
      `}</style>
    </div>
  );
}

const G = {
  box:       { width:"100%", maxWidth:350,
               background:"rgba(255,255,255,0.04)",
               backdropFilter:"blur(28px)", WebkitBackdropFilter:"blur(28px)",
               border:"1px solid rgba(255,255,255,0.1)", borderRadius:22,
               padding:"32px 24px 26px",
               boxShadow:"0 8px 64px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.07)" },
  logoRow:   { display:"flex", alignItems:"center", gap:10, marginBottom:24 },
  logoTxt:   { fontFamily:"'Syne',sans-serif", fontSize:"1.3rem", fontWeight:800, color:"#fff" },
  logoAcc:   { color:"#00e5ff" },
  h2:        { fontFamily:"'Syne',sans-serif", fontSize:"1.35rem", fontWeight:700, color:"#fff", marginBottom:4 },
  sub:       { fontSize:"0.8rem", color:"rgba(255,255,255,0.38)", marginBottom:20, fontFamily:"'DM Sans',sans-serif" },
  group:     { display:"flex", flexDirection:"column", gap:5, marginBottom:12 },
  label:     { fontSize:"0.7rem", fontWeight:600, color:"rgba(255,255,255,0.45)",
               letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:"'DM Sans',sans-serif" },
  wrap:      { position:"relative", display:"flex", alignItems:"center" },
  ico:       { position:"absolute", left:12, color:"rgba(255,255,255,0.28)",
               display:"flex", alignItems:"center", pointerEvents:"none" },
  input:     { width:"100%", background:"rgba(255,255,255,0.06)", border:"1px solid",
               borderRadius:10, padding:"10px 36px 10px 34px", color:"#fff",
               fontSize:"0.86rem", fontFamily:"'DM Sans',sans-serif",
               outline:"none", transition:"border-color .2s" },
  eye:       { position:"absolute", right:11, background:"none", border:"none",
               color:"rgba(255,255,255,0.28)", cursor:"pointer",
               display:"flex", alignItems:"center", padding:0 },
  err:       { fontSize:"0.7rem", color:"#ff5555", marginTop:2 },
  errorBox:  { background:"rgba(255,80,80,0.15)", border:"1px solid rgba(255,80,80,0.4)",
               borderRadius:8, padding:"8px 12px", marginBottom:12,
               color:"#ff7777", fontSize:"0.8rem", fontFamily:"'DM Sans',sans-serif" },
  forgotRow: { display:"flex", justifyContent:"flex-end", marginBottom:14, marginTop:-4 },
  forgotTxt: { fontSize:"0.74rem", color:"#00e5ff", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" },
  btn:       { width:"100%", background:"#00e5ff",
               border:"none", borderRadius:10, padding:"11px", color:"#040810",
               fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:"0.91rem",
               letterSpacing:"0.05em", cursor:"pointer",
               boxShadow:"0 4px 22px rgba(0,229,255,0.28)", marginBottom:14,
               transition:"opacity .18s,transform .18s" },
  divRow:    { display:"flex", alignItems:"center", gap:10, marginBottom:14 },
  divLine:   { flex:1, height:1, background:"rgba(255,255,255,0.07)" },
  divTxt:    { fontSize:"0.7rem", color:"rgba(255,255,255,0.25)", letterSpacing:"0.1em" },
  sw:        { textAlign:"center", fontSize:"0.8rem", color:"rgba(255,255,255,0.38)", fontFamily:"'DM Sans',sans-serif" },
  swLink:    { background:"none", border:"none", color:"#00e5ff", fontWeight:700,
               fontSize:"0.8rem", cursor:"pointer", padding:0,
               textDecoration:"underline", textUnderlineOffset:3 },
  defaultHint:{ textAlign:"center", fontSize:"0.7rem", color:"rgba(255,255,255,0.25)",
               marginTop:10, fontFamily:"'DM Sans',sans-serif" },
};

// ── Root ───────────────────────────────────────────────────
export default function Login() {
  return (
    <div style={R.page}>
      <div style={R.left}><Slideshow/></div>
      <div style={R.right}><GlassPanel/></div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        body { overflow:hidden; background:#040810; }
        input::placeholder { color:rgba(255,255,255,0.2); }
        input:focus { border-color:rgba(0,229,255,.55) !important; }
        button:hover { opacity:.83; transform:translateY(-1px); }
      `}</style>
    </div>
  );
}

const R = {
  page: { display:"flex", width:"100vw", height:"100vh", overflow:"hidden",
          fontFamily:"'DM Sans',sans-serif", background:"#040810" },
  left: { width:"70%", height:"100%", flexShrink:0, position:"relative" },
  right:{ width:"30%", height:"100%", display:"flex", alignItems:"center",
          justifyContent:"center", padding:"20px 16px",
          background:"linear-gradient(160deg,rgba(4,8,16,.97) 0%,rgba(0,20,50,.95) 100%)",
          borderLeft:"1px solid rgba(0,229,255,0.07)" },
};
