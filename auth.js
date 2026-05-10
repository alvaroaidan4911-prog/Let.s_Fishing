// ============================================================
// LET'S FISHING — AUTH + MAIN MENU + CHARACTER CUSTOMIZER
// v2.0 — Firebase Auth (Google + Anonymous) + DB Rules Fix
// ============================================================
(function () {
"use strict";

// ── SDK URLs ──────────────────────────────────────────────
const FB_APP  = "https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js";
const FB_DB   = "https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js";
const FB_AUTH = "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js";

// ── Character preset data ─────────────────────────────────
const SKIN_TONES  = ["#ffd6b3","#f5c5a3","#d4a574","#c68642","#8d5524","#4a2c0a"];
const HAIR_STYLES = [
  { id:"none",  label:"Botak",   draw: ()=>null },
  { id:"short", label:"Pendek",  draw: drawHairShort  },
  { id:"medium",label:"Sedang",  draw: drawHairMedium },
  { id:"long",  label:"Panjang", draw: drawHairLong   },
  { id:"spiky", label:"Spike",   draw: drawHairSpiky  },
  { id:"bun",   label:"Bun",     draw: drawHairBun    },
];
const FACE_TYPES  = [
  { id:"happy",  label:"Senang",  draw: drawFaceHappy  },
  { id:"cool",   label:"Cool",    draw: drawFaceCool   },
  { id:"sleepy", label:"Ngantuk", draw: drawFaceSleepy },
  { id:"angry",  label:"Serius",  draw: drawFaceAngry  },
  { id:"wink",   label:"Wink",    draw: drawFaceWink   },
];
const ACCESSORIES = [
  { id:"none",     label:"Tidak Ada",    draw: ()=>null },
  { id:"glasses",  label:"Kacamata",     draw: drawAccGlasses  },
  { id:"sunglasses",label:"Hitam",       draw: drawAccSunglasses },
  { id:"hat",      label:"Topi",         draw: drawAccHat      },
  { id:"cap",      label:"Baseball Cap", draw: drawAccCap      },
  { id:"headband", label:"Headband",     draw: drawAccHeadband },
  { id:"crown",    label:"Mahkota",      draw: drawAccCrown    },
];
const PANTS_COLORS = ["#2c3e50","#1a5276","#784212","#1e8449","#7d3c98","#922b21","#1c2833"];

// ── State ─────────────────────────────────────────────────
let authInst = null;
let curUser  = null;
let _onReady = null;

const charState = {
  skinTone:  "#ffd6b3",
  hairStyle: "short",
  hairColor: "#3d1c00",
  faceType:  "happy",
  shirtColor:"#2ecc71",
  pantsColor:"#2c3e50",
  accessory: "none",
};

// ─────────────────────────────────────────────────────────
// SDK LOADER
// ─────────────────────────────────────────────────────────
function loadScript(src,cb){
  const s=document.createElement("script");
  s.src=src; s.onload=cb;
  s.onerror=()=>console.error("LF_Auth: failed to load",src);
  document.head.appendChild(s);
}
function loadSDKs(cb){
  if(window.firebase&&window.firebase.auth){cb();return;}
  if(window.firebase&&window.firebase.database){
    if(!window.firebase.auth){loadScript(FB_AUTH,cb);}else{cb();}
    return;
  }
  if(window.firebase){
    loadScript(FB_DB,()=>loadScript(FB_AUTH,cb));
    return;
  }
  loadScript(FB_APP,()=>loadScript(FB_DB,()=>loadScript(FB_AUTH,cb)));
}

// ─────────────────────────────────────────────────────────
// FACE / HAIR / ACCESSORY DRAW FUNCTIONS (Canvas 256x256)
// ─────────────────────────────────────────────────────────
function drawFaceHappy(ctx,s){
  ctx.fillStyle="#111";
  ctx.beginPath();ctx.arc(s*.31,s*.43,s*.047,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(s*.69,s*.43,s*.047,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#111";ctx.lineWidth=s*.023;
  ctx.beginPath();ctx.arc(s*.5,s*.62,s*.16,0,Math.PI);ctx.stroke();
}
function drawFaceCool(ctx,s){
  ctx.fillStyle="#111";
  ctx.beginPath();ctx.arc(s*.31,s*.43,s*.047,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(s*.69,s*.43,s*.047,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#111";ctx.lineWidth=s*.023;
  ctx.beginPath();ctx.moveTo(s*.34,s*.72);ctx.lineTo(s*.5,s*.69);ctx.lineTo(s*.66,s*.72);ctx.stroke();
}
function drawFaceSleepy(ctx,s){
  ctx.strokeStyle="#111";ctx.lineWidth=s*.023;
  ctx.beginPath();ctx.arc(s*.31,s*.45,s*.047,Math.PI,2*Math.PI);ctx.stroke();
  ctx.beginPath();ctx.arc(s*.69,s*.45,s*.047,Math.PI,2*Math.PI);ctx.stroke();
  ctx.beginPath();ctx.arc(s*.5,s*.65,s*.12,0,Math.PI);ctx.stroke();
}
function drawFaceAngry(ctx,s){
  ctx.strokeStyle="#111";ctx.lineWidth=s*.023;
  ctx.beginPath();ctx.moveTo(s*.24,s*.37);ctx.lineTo(s*.40,s*.42);ctx.stroke();
  ctx.beginPath();ctx.moveTo(s*.76,s*.37);ctx.lineTo(s*.60,s*.42);ctx.stroke();
  ctx.fillStyle="#111";
  ctx.beginPath();ctx.arc(s*.31,s*.47,s*.043,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(s*.69,s*.47,s*.043,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.moveTo(s*.37,s*.72);ctx.lineTo(s*.63,s*.72);ctx.stroke();
}
function drawFaceWink(ctx,s){
  ctx.fillStyle="#111";
  ctx.beginPath();ctx.arc(s*.31,s*.43,s*.047,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#111";ctx.lineWidth=s*.023;
  ctx.beginPath();ctx.arc(s*.69,s*.45,s*.047,Math.PI,2*Math.PI);ctx.stroke();
  ctx.beginPath();ctx.arc(s*.5,s*.62,s*.16,0,Math.PI);ctx.stroke();
}

function drawHairShort(ctx,s,color){
  ctx.fillStyle=color;
  ctx.beginPath();
  ctx.ellipse(s*.5,s*.25,s*.34,s*.22,0,Math.PI,0);
  ctx.fill();
}
function drawHairMedium(ctx,s,color){
  ctx.fillStyle=color;
  ctx.beginPath();
  ctx.ellipse(s*.5,s*.25,s*.37,s*.25,0,Math.PI,0);
  ctx.fill();
  ctx.fillRect(s*.14,s*.22,s*.12,s*.42);
  ctx.fillRect(s*.74,s*.22,s*.12,s*.42);
}
function drawHairLong(ctx,s,color){
  ctx.fillStyle=color;
  ctx.beginPath();
  ctx.ellipse(s*.5,s*.25,s*.37,s*.25,0,Math.PI,0);
  ctx.fill();
  ctx.fillRect(s*.14,s*.22,s*.12,s*.62);
  ctx.fillRect(s*.74,s*.22,s*.12,s*.62);
  ctx.fillRect(s*.14,s*.82,s*.72,s*.06);
}
function drawHairSpiky(ctx,s,color){
  ctx.fillStyle=color;
  const spikes=[[.36,.08],[.5,.02],[.64,.08],[.78,.16],[.22,.16]];
  spikes.forEach(([x,y])=>{
    ctx.beginPath();
    ctx.moveTo(s*(x-.08),s*.3);
    ctx.lineTo(s*x,s*y);
    ctx.lineTo(s*(x+.08),s*.3);
    ctx.fill();
  });
  ctx.beginPath();
  ctx.ellipse(s*.5,s*.28,s*.34,s*.18,0,Math.PI,0);
  ctx.fill();
}
function drawHairBun(ctx,s,color){
  ctx.fillStyle=color;
  ctx.beginPath();
  ctx.ellipse(s*.5,s*.25,s*.32,s*.18,0,Math.PI,0);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(s*.5,s*.1,s*.13,0,Math.PI*2);
  ctx.fill();
}

function drawAccGlasses(ctx,s){
  ctx.strokeStyle="rgba(0,0,0,0.7)";ctx.lineWidth=s*.023;
  ctx.beginPath();ctx.arc(s*.31,s*.46,s*.1,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.arc(s*.69,s*.46,s*.1,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(s*.21,s*.43);ctx.lineTo(s*.12,s*.44);ctx.stroke();
  ctx.beginPath();ctx.moveTo(s*.79,s*.43);ctx.lineTo(s*.88,s*.44);ctx.stroke();
  ctx.beginPath();ctx.moveTo(s*.41,s*.44);ctx.lineTo(s*.59,s*.44);ctx.stroke();
}
function drawAccSunglasses(ctx,s){
  ctx.fillStyle="rgba(20,20,60,0.85)";
  ctx.beginPath();ctx.ellipse(s*.31,s*.45,s*.11,s*.08,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(s*.69,s*.45,s*.11,s*.08,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="rgba(0,0,0,0.9)";ctx.lineWidth=s*.02;
  ctx.beginPath();ctx.moveTo(s*.42,s*.44);ctx.lineTo(s*.58,s*.44);ctx.stroke();
  ctx.beginPath();ctx.moveTo(s*.2,s*.42);ctx.lineTo(s*.12,s*.44);ctx.stroke();
  ctx.beginPath();ctx.moveTo(s*.8,s*.42);ctx.lineTo(s*.88,s*.44);ctx.stroke();
}
function drawAccHat(ctx,s){
  ctx.fillStyle="#8B4513";
  ctx.fillRect(s*.1,s*.17,s*.8,s*.08);
  ctx.beginPath();
  ctx.moveTo(s*.28,s*.17);ctx.lineTo(s*.36,s*(-0.02));ctx.lineTo(s*.64,s*(-0.02));ctx.lineTo(s*.72,s*.17);
  ctx.fill();
}
function drawAccCap(ctx,s){
  ctx.fillStyle="#e74c3c";
  ctx.beginPath();ctx.ellipse(s*.5,s*.22,s*.36,s*.18,0,Math.PI,0);ctx.fill();
  ctx.fillStyle="#c0392b";
  ctx.fillRect(s*.14,s*.21,s*.72,s*.04);
  ctx.beginPath();ctx.moveTo(s*.15,s*.22);ctx.lineTo(s*(-0.01),s*.28);ctx.lineTo(s*.15,s*.27);ctx.fill();
}
function drawAccHeadband(ctx,s){
  ctx.fillStyle="#e74c3c";
  ctx.fillRect(s*.12,s*.27,s*.76,s*.1);
  ctx.fillStyle="#fff";
  ctx.fillRect(s*.44,s*.28,s*.12,s*.08);
}
function drawAccCrown(ctx,s){
  ctx.fillStyle="#f1c40f";
  ctx.beginPath();
  ctx.moveTo(s*.18,s*.27);
  ctx.lineTo(s*.18,s*.08);
  ctx.lineTo(s*.3,s*.18);
  ctx.lineTo(s*.5,s*.03);
  ctx.lineTo(s*.7,s*.18);
  ctx.lineTo(s*.82,s*.08);
  ctx.lineTo(s*.82,s*.27);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle="#e74c3c";
  ctx.beginPath();ctx.arc(s*.3,s*.14,s*.04,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(s*.5,s*.07,s*.04,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(s*.7,s*.14,s*.04,0,Math.PI*2);ctx.fill();
}

// ─────────────────────────────────────────────────────────
// DRAW FULL CHARACTER PREVIEW (Canvas 240x380)
// ─────────────────────────────────────────────────────────
function drawCharacterPreview(canvas){
  const ctx = canvas.getContext("2d");
  const W=canvas.width, H=canvas.height;
  ctx.clearRect(0,0,W,H);

  // Ground shadow
  ctx.fillStyle="rgba(0,0,0,0.15)";
  ctx.beginPath();ctx.ellipse(W*.5,H*.88,W*.25,H*.04,0,0,Math.PI*2);ctx.fill();

  // Scale factor (head = 80px dia)
  const unit = W*0.16; // ~38px for 240px canvas

  // ── LEGS ──
  const legW=unit*.7, legH=unit*1.5;
  const legY = H*.64;
  // Left leg
  ctx.fillStyle=charState.pantsColor;
  ctx.beginPath();ctx.roundRect(W*.5-legW-unit*.1,legY,legW,legH,4);ctx.fill();
  // Right leg
  ctx.beginPath();ctx.roundRect(W*.5+unit*.1,legY,legW,legH,4);ctx.fill();
  // Shoes
  ctx.fillStyle="#1a1a1a";
  ctx.beginPath();ctx.roundRect(W*.5-legW-unit*.15,legY+legH-unit*.18,legW+unit*.1,unit*.22,3);ctx.fill();
  ctx.beginPath();ctx.roundRect(W*.5+unit*.05,legY+legH-unit*.18,legW+unit*.1,unit*.22,3);ctx.fill();

  // ── TORSO ──
  const torsoW=unit*1.7, torsoH=unit*1.6;
  const torsoX=W*.5-torsoW*.5, torsoY=H*.36;
  ctx.fillStyle=charState.shirtColor;
  ctx.beginPath();ctx.roundRect(torsoX,torsoY,torsoW,torsoH,6);ctx.fill();
  // Shirt details (pocket, buttons)
  ctx.fillStyle="rgba(0,0,0,0.1)";
  ctx.beginPath();ctx.roundRect(torsoX+torsoW*.6,torsoY+torsoH*.2,torsoW*.25,torsoH*.25,3);ctx.fill();

  // ── ARMS ──
  const armW=unit*.65, armH=unit*1.4;
  // Left arm
  ctx.fillStyle=charState.shirtColor;
  ctx.beginPath();ctx.roundRect(torsoX-armW+unit*.1,torsoY+unit*.1,armW,armH,4);ctx.fill();
  // Left hand
  ctx.fillStyle=charState.skinTone;
  ctx.beginPath();ctx.arc(torsoX-armW*.1+unit*.1,torsoY+unit*.1+armH,armW*.4,0,Math.PI*2);ctx.fill();
  // Right arm
  ctx.fillStyle=charState.shirtColor;
  ctx.beginPath();ctx.roundRect(torsoX+torsoW-unit*.1,torsoY+unit*.1,armW,armH,4);ctx.fill();
  // Right hand
  ctx.fillStyle=charState.skinTone;
  ctx.beginPath();ctx.arc(torsoX+torsoW+armW*.6-unit*.1,torsoY+unit*.1+armH,armW*.4,0,Math.PI*2);ctx.fill();

  // ── NECK ──
  const neckW=unit*.55;
  ctx.fillStyle=charState.skinTone;
  ctx.beginPath();ctx.roundRect(W*.5-neckW*.5,torsoY-unit*.35,neckW,unit*.4,2);ctx.fill();

  // ── HEAD ──
  const headR = unit*.95;
  const headX = W*.5, headY = torsoY-unit*.6;
  ctx.fillStyle=charState.skinTone;
  ctx.beginPath();ctx.arc(headX,headY,headR,0,Math.PI*2);ctx.fill();

  // Draw face on a sub-canvas, then blit
  const faceSize = headR*2.2;
  const faceCanvas = document.createElement("canvas");
  faceCanvas.width=256;faceCanvas.height=256;
  const faceCtx=faceCanvas.getContext("2d");
  const fEntry = FACE_TYPES.find(f=>f.id===charState.faceType)||FACE_TYPES[0];
  fEntry.draw(faceCtx, 256);
  ctx.drawImage(faceCanvas,headX-faceSize*.5,headY-faceSize*.5,faceSize,faceSize);

  // Draw hair
  const hairCanvas=document.createElement("canvas");
  hairCanvas.width=256;hairCanvas.height=256;
  const hairCtx=hairCanvas.getContext("2d");
  const hEntry=HAIR_STYLES.find(h=>h.id===charState.hairStyle)||HAIR_STYLES[0];
  hEntry.draw(hairCtx,256,charState.hairColor);
  ctx.drawImage(hairCanvas,headX-faceSize*.5,headY-faceSize*.5,faceSize,faceSize);

  // Draw accessory
  const accCanvas=document.createElement("canvas");
  accCanvas.width=256;accCanvas.height=256;
  const accCtx=accCanvas.getContext("2d");
  const aEntry=ACCESSORIES.find(a=>a.id===charState.accessory)||ACCESSORIES[0];
  aEntry.draw(accCtx,256);
  ctx.drawImage(accCanvas,headX-faceSize*.5,headY-faceSize*.5,faceSize,faceSize);
}

// ─────────────────────────────────────────────────────────
// APPLY CUSTOMIZATION TO 3D GAME CHARACTER
// ─────────────────────────────────────────────────────────
function applyToGameCharacter(){
  // Shirt
  if(typeof window.setShirt==="function") window.setShirt(charState.shirtColor);
  else if(window.torso) window.torso.material.color.set(charState.shirtColor);

  // Skin tone — arms + head
  const skinHex = parseInt(charState.skinTone.replace("#",""),16);
  if(window.head && window.head.material) window.head.material.color.setHex(skinHex);
  if(window.armL && window.armL.material) window.armL.material.color.setHex(skinHex);
  if(window.armR && window.armR.material) window.armR.material.color.setHex(skinHex);

  // Pants
  const pantsHex = parseInt(charState.pantsColor.replace("#",""),16);
  if(window.legL && window.legL.material) window.legL.material.color.setHex(pantsHex);
  if(window.legR && window.legR.material) window.legR.material.color.setHex(pantsHex);

  // Face canvas update (local player)
  try {
    const faceEls = document.querySelectorAll("canvas[data-lf-face]");
    faceEls.forEach(c=>{
      const ctx=c.getContext("2d");
      ctx.clearRect(0,0,c.width,c.height);
      const fEntry=FACE_TYPES.find(f=>f.id===charState.faceType)||FACE_TYPES[0];
      fEntry.draw(ctx,c.width);
      if(window.faceTexture) window.faceTexture.needsUpdate=true;
    });
  } catch(e){}
}

// ─────────────────────────────────────────────────────────
// SAVE / LOAD CUSTOMIZATION
// ─────────────────────────────────────────────────────────
function saveChar(){
  localStorage.setItem("lf_char", JSON.stringify(charState));
  // individual keys for compatibility
  localStorage.setItem("playerShirt", charState.shirtColor);
  localStorage.setItem("lf_skinTone", charState.skinTone);
  localStorage.setItem("lf_hairStyle", charState.hairStyle);
  localStorage.setItem("lf_hairColor", charState.hairColor);
  localStorage.setItem("lf_faceType", charState.faceType);
  localStorage.setItem("lf_pantsColor", charState.pantsColor);
  localStorage.setItem("lf_accessory", charState.accessory);
}
function loadChar(){
  try {
    const saved = JSON.parse(localStorage.getItem("lf_char")||"{}");
    Object.assign(charState, saved);
    // also check individual keys (backwards compat)
    if(localStorage.getItem("playerShirt")) charState.shirtColor = localStorage.getItem("playerShirt");
  } catch(e){}
}

// ─────────────────────────────────────────────────────────
// BUILD FULL UI
// ─────────────────────────────────────────────────────────
function buildUI(){
  const root = document.createElement("div");
  root.id = "lfAuthRoot";
  root.innerHTML = `
<style>
#lfAuthRoot {
  position:fixed;inset:0;z-index:99999;
  font-family:'Segoe UI',Arial,sans-serif;
  background:linear-gradient(160deg,#010c1e 0%,#041630 50%,#061d3a 100%);
  overflow:hidden;
}

/* ── Animated ocean ── */
.lf-ocean{position:absolute;bottom:0;left:0;width:100%;height:180px;pointer-events:none;overflow:hidden;}
.lf-ocean svg{position:absolute;bottom:0;width:200%;}
#lf-w1{animation:lfWave 9s linear infinite;}
#lf-w2{animation:lfWave 14s linear infinite reverse;opacity:.4;bottom:6px;}
@keyframes lfWave{from{transform:translateX(0)}to{transform:translateX(-50%)}}

/* ── Stars ── */
.lf-star{position:absolute;border-radius:50%;background:#fff;pointer-events:none;animation:lfTwink 2s ease-in-out infinite alternate;}
@keyframes lfTwink{from{opacity:.15;transform:scale(1)}to{opacity:.9;transform:scale(1.5)}}

/* ── Screens ── */
.lf-screen{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;}
.lf-screen.hidden{display:none!important;}

/* ── Card ── */
.lf-card{
  background:rgba(4,18,42,0.88);border:1px solid rgba(100,180,255,0.18);
  border-radius:22px;padding:32px 28px 24px;
  width:min(92vw,400px);text-align:center;
  box-shadow:0 20px 60px rgba(0,50,120,0.5);
  backdrop-filter:blur(16px);position:relative;overflow:hidden;
}
.lf-card::before{
  content:'';position:absolute;top:-40%;left:-40%;
  width:180%;height:80%;
  background:radial-gradient(ellipse,rgba(52,152,219,.06) 0%,transparent 70%);
  pointer-events:none;
}

/* ── Logo ── */
#lf-logo{font-size:60px;animation:lfBobble 3.5s ease-in-out infinite;display:block;margin-bottom:4px;}
@keyframes lfBobble{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-10px) rotate(4deg)}}
.lf-title{
  font-size:26px;font-weight:900;
  background:linear-gradient(135deg,#7ecfff,#b0e8ff);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
  margin:0 0 2px;
}
.lf-sub{font-size:11px;color:#2a4d6a;letter-spacing:2px;text-transform:uppercase;margin:0 0 24px;}

/* ── User info ── */
#lf-userInfo{
  display:none;align-items:center;gap:10px;
  background:rgba(126,207,255,.07);border:1px solid rgba(126,207,255,.15);
  border-radius:12px;padding:10px 14px;margin-bottom:16px;
}
#lf-avatar{
  width:38px;height:38px;border-radius:50%;
  background:linear-gradient(135deg,#3498db,#7ecfff);
  display:flex;align-items:center;justify-content:center;
  font-size:20px;flex-shrink:0;overflow:hidden;
}
#lf-avatar img{width:100%;height:100%;border-radius:50%;object-fit:cover;}
.lf-utext{text-align:left;flex:1;min-width:0;}
#lf-uname{font-size:14px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
#lf-uemail{font-size:10px;color:#3a6a8a;}
#lf-ubadge{font-size:10px;color:#2ecc71;font-weight:700;margin-top:1px;}

/* ── Inputs ── */
.lf-label{font-size:11px;color:#2a5070;text-align:left;margin-bottom:5px;display:block;letter-spacing:.5px;text-transform:uppercase;}
.lf-inp{
  width:100%;box-sizing:border-box;padding:11px 13px;
  border-radius:10px;border:1px solid rgba(255,255,255,.1);
  background:rgba(255,255,255,.06);color:#fff;font-size:14px;outline:none;
  transition:border-color .2s;margin-bottom:12px;
}
.lf-inp:focus{border-color:rgba(126,207,255,.45);}
.lf-inp::placeholder{color:rgba(255,255,255,.22);}

/* ── Buttons ── */
.lf-btn{
  width:100%;padding:13px;border:none;border-radius:12px;
  font-size:14px;font-weight:700;cursor:pointer;
  display:flex;align-items:center;justify-content:center;gap:9px;
  margin-bottom:9px;transition:opacity .15s,transform .1s;
}
.lf-btn:active{transform:scale(.97);opacity:.88;}
.lf-btn:disabled{opacity:.4;cursor:not-allowed;transform:none!important;}
#lf-googleBtn{background:#fff;color:#1a1a1a;box-shadow:0 3px 12px rgba(255,255,255,.1);}
#lf-anonBtn{background:rgba(255,255,255,.07);color:#8899aa;border:1px solid rgba(255,255,255,.1);}
#lf-customizeBtn{background:linear-gradient(135deg,#8e44ad,#9b59b6);color:#fff;box-shadow:0 4px 16px rgba(142,68,173,.35);}
#lf-playBtn{background:linear-gradient(135deg,#27ae60,#2ecc71);color:#fff;box-shadow:0 5px 18px rgba(39,174,96,.4);font-size:15px;}
#lf-signoutBtn{background:rgba(255,255,255,.05);color:#3a6080;border:1px solid rgba(255,255,255,.08);font-size:12px;padding:8px;}

.lf-div{display:flex;align-items:center;gap:9px;margin:2px 0 9px;color:#1e3a52;font-size:11px;}
.lf-div::before,.lf-div::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.06);}

#lf-status{font-size:12px;color:#e74c3c;min-height:16px;margin-top:6px;}
.lf-ok{color:#2ecc71!important;}

/* ── Spinner ── */
#lf-spin{position:absolute;inset:0;background:rgba(2,12,28,.7);display:none;align-items:center;justify-content:center;border-radius:22px;z-index:5;}
.lf-ring{width:34px;height:34px;border-radius:50%;border:3px solid rgba(126,207,255,.2);border-top-color:#7ecfff;animation:lfSpin .8s linear infinite;}
@keyframes lfSpin{to{transform:rotate(360deg)}}

/* ════════════════ CUSTOMIZER ════════════════ */
#lf-customizeScreen{background:linear-gradient(160deg,#010c1e,#041630);}
.lf-cust-wrap{
  display:flex;gap:16px;width:min(96vw,780px);max-height:88vh;
}
/* Preview panel */
.lf-preview-panel{
  flex:0 0 180px;display:flex;flex-direction:column;align-items:center;gap:10px;
  background:rgba(4,18,42,.8);border:1px solid rgba(100,180,255,.15);border-radius:18px;padding:18px 12px;
}
#lf-preview-canvas{width:150px;height:240px;border-radius:10px;background:rgba(0,0,0,.3);}
.lf-prev-name{color:#7ecfff;font-size:14px;font-weight:700;margin-top:4px;text-align:center;}
.lf-prev-sub{color:#2a5070;font-size:11px;}

/* Options panel */
.lf-opts-panel{
  flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:14px;
  max-height:82vh;padding-right:4px;
}
.lf-opts-panel::-webkit-scrollbar{width:3px;}
.lf-opts-panel::-webkit-scrollbar-thumb{background:rgba(126,207,255,.2);border-radius:3px;}

.lf-sect{
  background:rgba(4,18,42,.7);border:1px solid rgba(100,180,255,.1);
  border-radius:14px;padding:14px 14px 10px;
}
.lf-sect-title{font-size:11px;color:#3a6a9a;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px;font-weight:700;}

/* Skin tone swatches */
.lf-skin-row{display:flex;gap:8px;flex-wrap:wrap;}
.lf-swatch{
  width:32px;height:32px;border-radius:50%;cursor:pointer;
  border:3px solid transparent;transition:transform .15s,border-color .15s;
  flex-shrink:0;
}
.lf-swatch:hover{transform:scale(1.15);}
.lf-swatch.active{border-color:#7ecfff;transform:scale(1.2);}

/* Style chips */
.lf-chips{display:flex;gap:7px;flex-wrap:wrap;}
.lf-chip{
  padding:6px 12px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;
  background:rgba(255,255,255,.07);color:#7a9ab5;border:1px solid rgba(255,255,255,.1);
  transition:all .15s;white-space:nowrap;
}
.lf-chip:hover{background:rgba(255,255,255,.12);color:#bdd8ee;}
.lf-chip.active{background:rgba(126,207,255,.18);color:#7ecfff;border-color:rgba(126,207,255,.4);}

/* Color row */
.lf-color-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
.lf-color-dot{
  width:28px;height:28px;border-radius:50%;cursor:pointer;
  border:3px solid transparent;transition:transform .15s,border-color .15s;flex-shrink:0;
}
.lf-color-dot:hover{transform:scale(1.15);}
.lf-color-dot.active{border-color:#fff;transform:scale(1.2);}
.lf-color-pick{width:28px;height:28px;border:none;border-radius:50%;cursor:pointer;background:none;padding:0;}

/* Cust bottom buttons */
.lf-cust-btns{display:flex;gap:10px;margin-top:6px;}
.lf-cust-btns .lf-btn{margin:0;}
#lf-custBack{background:rgba(255,255,255,.07);color:#7a9ab5;border:1px solid rgba(255,255,255,.1);}
#lf-custSave{background:linear-gradient(135deg,#27ae60,#2ecc71);color:#fff;flex:1;}

/* Mobile tweaks */
@media(max-width:600px){
  .lf-cust-wrap{flex-direction:column;max-height:none;}
  .lf-preview-panel{flex-direction:row;flex:none;width:100%;padding:12px;gap:14px;}
  #lf-preview-canvas{width:90px;height:145px;}
  .lf-opts-panel{max-height:55vh;}
}
</style>

<!-- ═══════════ STARS ═══════════ -->
<div id="lf-stars"></div>

<!-- ═══════════ OCEAN ═══════════ -->
<div class="lf-ocean">
  <svg id="lf-w1" viewBox="0 0 1440 180" preserveAspectRatio="none" style="height:180px">
    <path fill="rgba(14,55,110,0.45)" d="M0,90 C360,150 720,30 1080,90 C1260,120 1350,50 1440,90 L1440,180 L0,180 Z"/>
    <path fill="rgba(8,35,80,0.55)"   d="M0,110 C240,70 480,150 720,110 C960,70 1200,140 1440,110 L1440,180 L0,180 Z"/>
  </svg>
  <svg id="lf-w2" viewBox="0 0 1440 180" preserveAspectRatio="none" style="height:145px">
    <path fill="rgba(20,75,150,0.3)" d="M0,70 C480,130 960,10 1440,70 L1440,180 L0,180 Z"/>
  </svg>
</div>

<!-- ═══════════ SCREEN: LOGIN ═══════════ -->
<div class="lf-screen" id="lf-loginScreen">
  <div class="lf-card">
    <div id="lf-spin"><div class="lf-ring"></div></div>

    <span id="lf-logo">🎣</span>
    <div class="lf-title">Let's Fishing!</div>
    <div class="lf-sub">Multiplayer Fishing Game</div>

    <!-- User info (post-login) -->
    <div id="lf-userInfo">
      <div id="lf-avatar">👤</div>
      <div class="lf-utext">
        <div id="lf-uname">—</div>
        <div id="lf-uemail">—</div>
        <div id="lf-ubadge">● Masuk</div>
      </div>
    </div>

    <!-- Name field (anon only) -->
    <div id="lf-nameSect" style="display:none">
      <label class="lf-label">Nama Karakter</label>
      <input class="lf-inp" id="lf-nameInp" maxlength="14" placeholder="Nama kamu..." autocomplete="off" spellcheck="false">
    </div>

    <!-- Room field (shown after login) -->
    <div id="lf-roomSect" style="display:none;margin-bottom:12px;">
      <label class="lf-label">Room</label>
      <input class="lf-inp" id="lf-roomInp" maxlength="16" placeholder="world_main" autocomplete="off">
    </div>

    <!-- Auth buttons -->
    <div id="lf-authBtns">
      <button class="lf-btn" id="lf-googleBtn">
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        Masuk dengan Google
      </button>
      <div class="lf-div">atau</div>
      <button class="lf-btn" id="lf-anonBtn">👤 Masuk sebagai Tamu</button>
    </div>

    <!-- Post-login actions -->
    <div id="lf-postBtns" style="display:none">
      <button class="lf-btn" id="lf-customizeBtn">🎨 Kustomisasi Karakter</button>
      <button class="lf-btn" id="lf-playBtn">▶ Mulai Bermain</button>
      <button class="lf-btn" id="lf-signoutBtn">🚪 Ganti Akun</button>
    </div>

    <div id="lf-status"></div>
  </div>
</div>

<!-- ═══════════ SCREEN: CUSTOMIZER ═══════════ -->
<div class="lf-screen hidden" id="lf-customizeScreen">
  <div class="lf-cust-wrap">

    <!-- Preview -->
    <div class="lf-preview-panel">
      <div style="font-size:12px;color:#2a5070;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Preview</div>
      <canvas id="lf-preview-canvas" width="200" height="320"></canvas>
      <div class="lf-prev-name" id="lf-prev-name">Player</div>
      <div class="lf-prev-sub">Karakter Kamu</div>
      <div class="lf-cust-btns" style="margin-top:auto;width:100%;">
        <button class="lf-btn" id="lf-custBack">← Back</button>
        <button class="lf-btn" id="lf-custSave">Simpan ✓</button>
      </div>
    </div>

    <!-- Options -->
    <div class="lf-opts-panel">

      <!-- Skin Tone -->
      <div class="lf-sect">
        <div class="lf-sect-title">🎨 Warna Kulit</div>
        <div class="lf-skin-row" id="lf-skinRow"></div>
      </div>

      <!-- Hair Style -->
      <div class="lf-sect">
        <div class="lf-sect-title">💇 Gaya Rambut</div>
        <div class="lf-chips" id="lf-hairChips"></div>
      </div>

      <!-- Hair Color -->
      <div class="lf-sect">
        <div class="lf-sect-title">🎨 Warna Rambut</div>
        <div class="lf-color-row" id="lf-hairColorRow"></div>
      </div>

      <!-- Face -->
      <div class="lf-sect">
        <div class="lf-sect-title">😀 Ekspresi Wajah</div>
        <div class="lf-chips" id="lf-faceChips"></div>
      </div>

      <!-- Shirt Color -->
      <div class="lf-sect">
        <div class="lf-sect-title">👕 Warna Baju</div>
        <div class="lf-color-row" id="lf-shirtColorRow">
          <input type="color" class="lf-color-pick" id="lf-shirtPick" title="Pilih warna">
        </div>
      </div>

      <!-- Pants Color -->
      <div class="lf-sect">
        <div class="lf-sect-title">👖 Warna Celana</div>
        <div class="lf-color-row" id="lf-pantsColorRow"></div>
      </div>

      <!-- Accessories -->
      <div class="lf-sect">
        <div class="lf-sect-title">🎩 Aksesori</div>
        <div class="lf-chips" id="lf-accChips"></div>
      </div>

    </div>
  </div>
</div>
`;
  document.body.appendChild(root);

  // ── Spawn stars ──
  const starsEl = root.querySelector("#lf-stars");
  for(let i=0;i<80;i++){
    const s=document.createElement("div");
    s.className="lf-star";
    const sz=.8+Math.random()*2.5;
    s.style.cssText=`width:${sz}px;height:${sz}px;left:${Math.random()*100}%;top:${Math.random()*78}%;animation-delay:${Math.random()*3}s;animation-duration:${1.5+Math.random()*2.5}s;opacity:${.1+Math.random()*.5}`;
    starsEl.appendChild(s);
  }

  // ── Prevent game input capture ──
  root.querySelectorAll("input").forEach(inp=>{
    inp.addEventListener("keydown",e=>e.stopPropagation());
    inp.addEventListener("keyup",e=>e.stopPropagation());
  });

  // ── Restore saved data ──
  loadChar();
  const savedName = localStorage.getItem("playerName")||"";
  const savedRoom = localStorage.getItem("lastRoom")||"";
  if(root.querySelector("#lf-nameInp")) root.querySelector("#lf-nameInp").value=savedName;
  if(root.querySelector("#lf-roomInp")) root.querySelector("#lf-roomInp").value=savedRoom;

  return root;
}

// ─────────────────────────────────────────────────────────
// CUSTOMIZER UI LOGIC
// ─────────────────────────────────────────────────────────
function initCustomizer(root){
  const previewCanvas = root.querySelector("#lf-preview-canvas");

  function redraw(){ drawCharacterPreview(previewCanvas); }
  redraw();

  // Skin swatches
  const skinRow = root.querySelector("#lf-skinRow");
  SKIN_TONES.forEach(tone=>{
    const s=document.createElement("div");
    s.className="lf-swatch"+(charState.skinTone===tone?" active":"");
    s.style.background=tone;
    s.onclick=()=>{
      charState.skinTone=tone;
      skinRow.querySelectorAll(".lf-swatch").forEach(x=>x.classList.remove("active"));
      s.classList.add("active");
      redraw();
    };
    skinRow.appendChild(s);
  });

  // Hair style chips
  const hairChips=root.querySelector("#lf-hairChips");
  HAIR_STYLES.forEach(h=>{
    const c=document.createElement("div");
    c.className="lf-chip"+(charState.hairStyle===h.id?" active":"");
    c.textContent=h.label;
    c.onclick=()=>{
      charState.hairStyle=h.id;
      hairChips.querySelectorAll(".lf-chip").forEach(x=>x.classList.remove("active"));
      c.classList.add("active");
      redraw();
    };
    hairChips.appendChild(c);
  });

  // Hair colors
  const hairColors=["#3d1c00","#1a1a1a","#8B4513","#c8a96e","#f7e7ce","#e74c3c","#3498db","#2ecc71","#9b59b6","#f39c12","#fff","#95a5a6"];
  const hairColorRow=root.querySelector("#lf-hairColorRow");
  hairColors.forEach(clr=>{
    const d=document.createElement("div");
    d.className="lf-color-dot"+(charState.hairColor===clr?" active":"");
    d.style.background=clr;
    if(clr=="#fff"||clr==="#f7e7ce") d.style.border="3px solid rgba(200,200,200,0.4)";
    d.onclick=()=>{
      charState.hairColor=clr;
      hairColorRow.querySelectorAll(".lf-color-dot").forEach(x=>x.classList.remove("active"));
      d.classList.add("active");
      redraw();
    };
    hairColorRow.appendChild(d);
  });
  // Custom hair color
  const hcPick=document.createElement("input");hcPick.type="color";hcPick.className="lf-color-pick";hcPick.title="Pilih warna";hcPick.value=charState.hairColor;
  hcPick.oninput=e=>{charState.hairColor=e.target.value;hairColorRow.querySelectorAll(".lf-color-dot").forEach(x=>x.classList.remove("active"));redraw();};
  hairColorRow.appendChild(hcPick);

  // Face chips
  const faceChips=root.querySelector("#lf-faceChips");
  FACE_TYPES.forEach(f=>{
    const c=document.createElement("div");
    c.className="lf-chip"+(charState.faceType===f.id?" active":"");
    c.textContent=f.label;
    c.onclick=()=>{
      charState.faceType=f.id;
      faceChips.querySelectorAll(".lf-chip").forEach(x=>x.classList.remove("active"));
      c.classList.add("active");
      redraw();
    };
    faceChips.appendChild(c);
  });

  // Shirt color
  const shirtPresets=["#2ecc71","#3498db","#e74c3c","#f39c12","#9b59b6","#1abc9c","#e67e22","#ecf0f1","#2c3e50","#e91e63","#ff5722","#795548"];
  const shirtRow=root.querySelector("#lf-shirtColorRow");
  // Insert presets before the color picker
  shirtPresets.forEach(clr=>{
    const d=document.createElement("div");
    d.className="lf-color-dot"+(charState.shirtColor===clr?" active":"");
    d.style.background=clr;
    d.onclick=()=>{
      charState.shirtColor=clr;
      shirtRow.querySelectorAll(".lf-color-dot").forEach(x=>x.classList.remove("active"));
      d.classList.add("active");
      const pick=root.querySelector("#lf-shirtPick");if(pick)pick.value=clr;
      redraw();
    };
    shirtRow.insertBefore(d,root.querySelector("#lf-shirtPick"));
  });
  const shirtPick=root.querySelector("#lf-shirtPick");
  if(shirtPick){shirtPick.value=charState.shirtColor;shirtPick.oninput=e=>{charState.shirtColor=e.target.value;shirtRow.querySelectorAll(".lf-color-dot").forEach(x=>x.classList.remove("active"));redraw();};}

  // Pants colors
  const pantsRow=root.querySelector("#lf-pantsColorRow");
  PANTS_COLORS.forEach(clr=>{
    const d=document.createElement("div");
    d.className="lf-color-dot"+(charState.pantsColor===clr?" active":"");
    d.style.background=clr;
    d.onclick=()=>{
      charState.pantsColor=clr;
      pantsRow.querySelectorAll(".lf-color-dot").forEach(x=>x.classList.remove("active"));
      d.classList.add("active");
      redraw();
    };
    pantsRow.appendChild(d);
  });
  const pantsPick=document.createElement("input");pantsPick.type="color";pantsPick.className="lf-color-pick";pantsPick.title="Pilih warna";pantsPick.value=charState.pantsColor;
  pantsPick.oninput=e=>{charState.pantsColor=e.target.value;pantsRow.querySelectorAll(".lf-color-dot").forEach(x=>x.classList.remove("active"));redraw();};
  pantsRow.appendChild(pantsPick);

  // Accessories chips
  const accChips=root.querySelector("#lf-accChips");
  ACCESSORIES.forEach(a=>{
    const c=document.createElement("div");
    c.className="lf-chip"+(charState.accessory===a.id?" active":"");
    c.textContent=a.label;
    c.onclick=()=>{
      charState.accessory=a.id;
      accChips.querySelectorAll(".lf-chip").forEach(x=>x.classList.remove("active"));
      c.classList.add("active");
      redraw();
    };
    accChips.appendChild(c);
  });
}

// ─────────────────────────────────────────────────────────
// UI STATE
// ─────────────────────────────────────────────────────────
function setSpinner(root,on){
  const sp=root.querySelector("#lf-spin");if(sp)sp.style.display=on?"flex":"none";
}
function setStatus(root,msg,ok){
  const el=root.querySelector("#lf-status");if(!el)return;
  el.textContent=msg;el.className=ok?"lf-ok":"";
}
function showLoggedIn(root,user,dispName){
  const info=root.querySelector("#lf-userInfo"),av=root.querySelector("#lf-avatar");
  const uname=root.querySelector("#lf-uname"),uemail=root.querySelector("#lf-uemail"),ubadge=root.querySelector("#lf-ubadge");
  if(user.isAnonymous){
    av.textContent="👤";
    uname.textContent=dispName||"Tamu";
    uemail.textContent="Mode Tamu";
    ubadge.textContent="● Tamu";ubadge.style.color="#f39c12";
    root.querySelector("#lf-nameSect").style.display="block";
    const ni=root.querySelector("#lf-nameInp");
    if(ni&&!ni.value) ni.value=localStorage.getItem("playerName")||"";
  }else{
    if(user.photoURL){av.innerHTML=`<img src="${user.photoURL}" alt="">`;}
    else{av.textContent=(user.displayName||"U")[0].toUpperCase();}
    uname.textContent=dispName||user.displayName||"Player";
    uemail.textContent=user.email||"";
    ubadge.textContent="● Google";ubadge.style.color="#2ecc71";
    root.querySelector("#lf-nameSect").style.display="none";
  }
  if(info)info.style.display="flex";
  root.querySelector("#lf-roomSect").style.display="block";
  root.querySelector("#lf-authBtns").style.display="none";
  root.querySelector("#lf-postBtns").style.display="block";
  // Update preview name
  const prevName=root.querySelector("#lf-prev-name");
  const nm=dispName||(user.isAnonymous?localStorage.getItem("playerName")||"Tamu":user.displayName||"Player");
  if(prevName)prevName.textContent=nm;
  setStatus(root,"");
}
function showLoggedOut(root){
  const info=root.querySelector("#lf-userInfo");if(info)info.style.display="none";
  root.querySelector("#lf-authBtns").style.display="block";
  root.querySelector("#lf-postBtns").style.display="none";
  root.querySelector("#lf-nameSect").style.display="none";
  root.querySelector("#lf-roomSect").style.display="none";
  setStatus(root,"");
}
function showScreen(root,id){
  root.querySelectorAll(".lf-screen").forEach(s=>{s.classList.toggle("hidden",s.id!==id);});
}

// ─────────────────────────────────────────────────────────
// MAIN ENTRY
// ─────────────────────────────────────────────────────────
function startAuthFlow(onReady){
  _onReady=onReady;

  loadSDKs(()=>{
    const cfg=window.FIREBASE_CONFIG;
    if(!cfg||!cfg.apiKey||cfg.apiKey.includes("ISI")){
      // No firebase — skip auth, go straight to old flow
      onReady("local_"+Math.random().toString(36).slice(2,8),
              localStorage.getItem("playerName")||"Player",
              localStorage.getItem("playerShirt")||"#2ecc71",
              "world_main");
      return;
    }

    if(!firebase.apps.length) firebase.initializeApp(cfg);
    authInst=firebase.auth();
    window._firebaseAuth=authInst;

    const root=buildUI();
    initCustomizer(root);

    // ── Customize btn ──
    root.querySelector("#lf-customizeBtn").onclick=()=>{
      showScreen(root,"lf-customizeScreen");
      drawCharacterPreview(root.querySelector("#lf-preview-canvas"));
    };
    root.querySelector("#lf-custBack").onclick=()=>showScreen(root,"lf-loginScreen");
    root.querySelector("#lf-custSave").onclick=()=>{
      saveChar();
      applyToGameCharacter();
      showScreen(root,"lf-loginScreen");
      setStatus(root,"✅ Karakter disimpan!",true);
    };

    // ── Play btn ──
    root.querySelector("#lf-playBtn").onclick=doPlay;
    root.querySelector("#lf-nameInp")&&root.querySelector("#lf-nameInp").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();doPlay();}});

    function doPlay(){
      if(!curUser)return;
      let playerName,shirtColor,roomId;

      if(curUser.isAnonymous){
        const ni=root.querySelector("#lf-nameInp");
        playerName=(ni?ni.value.trim():"");
        if(!playerName){if(ni)ni.style.borderColor="#e74c3c";setStatus(root,"⚠️ Masukkan nama karakter!");return;}
      }else{
        playerName=localStorage.getItem("playerName")||curUser.displayName||"Player";
      }
      const ri=root.querySelector("#lf-roomInp");
      roomId=((ri?ri.value.trim():"word_main")||"world_main").replace(/\s+/g,"_");
      shirtColor=charState.shirtColor;

      localStorage.setItem("playerName",playerName);
      localStorage.setItem("playerShirt",shirtColor);
      localStorage.setItem("lastRoom",roomId);
      localStorage.setItem("mpId","p_"+curUser.uid.slice(0,8));
      saveChar();

      root.style.transition="opacity .5s";
      root.style.opacity="0";
      setTimeout(()=>{root.remove();onReady(curUser.uid,playerName,shirtColor,roomId);},500);
    }

    // ── Google Sign-In ──
    root.querySelector("#lf-googleBtn").onclick=async()=>{
      setSpinner(root,true);setStatus(root,"");
      try{
        const prov=new firebase.auth.GoogleAuthProvider();
        prov.setCustomParameters({prompt:"select_account"});
        const res=await authInst.signInWithPopup(prov);
        curUser=res.user;
        if(res.user.displayName) localStorage.setItem("playerName",res.user.displayName.split(" ")[0].slice(0,14));
        showLoggedIn(root,res.user,localStorage.getItem("playerName"));
        setStatus(root,"✅ Login berhasil!",true);
      }catch(err){
        if(err.code==="auth/popup-closed-by-user") setStatus(root,"Login dibatalkan.");
        else if(err.code==="auth/popup-blocked") setStatus(root,"⚠️ Popup diblokir. Coba lagi.");
        else setStatus(root,"⚠️ "+(err.message||"Gagal login"));
      }finally{setSpinner(root,false);}
    };

    // ── Anonymous ──
    root.querySelector("#lf-anonBtn").onclick=async()=>{
      setSpinner(root,true);setStatus(root,"");
      try{
        const res=await authInst.signInAnonymously();
        curUser=res.user;
        showLoggedIn(root,res.user,localStorage.getItem("playerName"));
      }catch(err){setStatus(root,"⚠️ "+(err.message||"Gagal"));}
      finally{setSpinner(root,false);}
    };

    // ── Sign Out ──
    root.querySelector("#lf-signoutBtn").onclick=async()=>{
      setSpinner(root,true);
      try{await authInst.signOut();curUser=null;showLoggedOut(root);}catch(e){}
      setSpinner(root,false);
    };

    // ── Auth state observer (restore session) ──
    authInst.onAuthStateChanged(user=>{
      if(user){
        curUser=user;
        const savedName=localStorage.getItem("playerName")||(!user.isAnonymous?(user.displayName||"").split(" ")[0].slice(0,14):"");
        showLoggedIn(root,user,savedName);
      }else{
        curUser=null;
        showLoggedOut(root);
      }
    });
  });
}

// ─────────────────────────────────────────────────────────
// EXPOSE
// ─────────────────────────────────────────────────────────
window.LF_Auth={
  start:    startAuthFlow,
  getUser:  ()=>curUser,
  getChar:  ()=>({...charState}),
  applyChar:applyToGameCharacter,
};
window.dispatchEvent(new Event("lf_auth_ready"));

})();
