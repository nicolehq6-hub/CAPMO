(function(){
  "use strict";

  // ---------- seed data ----------
  const ROLLS = [
    {id:"r1", name:"Coast Road, March"},
    {id:"r2", name:"Kitchen Table Portraits"},
    {id:"r3", name:"35mm Test Roll — Tri-X"},
    {id:"r4", name:"Grandma's Attic"},
    {id:"r5", name:"City at Night"},
    {id:"r6", name:"First Roll, New Camera"},
    {id:"r7", name:"Backyard, Every Season"},
    {id:"r8", name:"Unsorted"}
  ];
  let FOLDERS = [
    {id:"fo1", name:"Favorites"},
    {id:"fo2", name:"To print"},
    {id:"fo3", name:"For the album"}
  ];
  const APERTURES=["f/1.4","f/2","f/2.8","f/4","f/5.6","f/8","f/11"];
  const SHUTTERS=["1/30","1/60","1/125","1/250","1/500","1/1000"];
  const ISOS=[100,200,400,800,1600];
  const MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}
  function randDate(){
    const y = 2023 + Math.floor(Math.random()*3);
    const m = MONTHS[Math.floor(Math.random()*12)];
    const d = 1 + Math.floor(Math.random()*28);
    return `${m} ${d}, ${y}`;
  }
  function maybeFolder(){
    // roughly a third of frames start filed into a folder
    return Math.random() < 0.32 ? pick(FOLDERS).id : null;
  }

  const counts = {r1:9,r2:6,r3:12,r4:7,r5:8,r6:5,r7:10,r8:3};
  let FRAMES = [];
  let fid = 1;
  ROLLS.forEach((roll, ri)=>{
    const n = counts[roll.id] || 4;
    for(let i=1;i<=n;i++){
      FRAMES.push({
        id:"f"+fid,
        rollId:roll.id,
        rollIndex:ri,
        frameIndex:i,
        folderId:maybeFolder(),
        seed:"latent-"+fid,
        name:`R${String(ri+1).padStart(3,"0")}_F${String(i).padStart(2,"0")}`,
        date:randDate(),
        aperture:pick(APERTURES),
        shutter:pick(SHUTTERS),
        iso:pick(ISOS),
        rot:(Math.random()*4-2).toFixed(1),
        isNew:false,
        localSrc:null
      });
      fid++;
    }
  });

  const STORAGE_CAP_FRAMES = 500;
  const GB_PER_FRAME = 0.043;
  const STORAGE_CAP_GB = Math.round(STORAGE_CAP_FRAMES * GB_PER_FRAME);

  // ---------- state ----------
  let activeRoll = "all";
  let activeFolder = null;
  let query = "";
  let view = "contact";
  let lightboxIndex = -1;
  let currentList = [];

  // ---------- helpers ----------
  function imgSrc(frame, w, h){
    if(frame.localSrc) return frame.localSrc;
    return `https://picsum.photos/seed/${frame.seed}/${w}/${h}`;
  }
  function rollName(id){
    const r = ROLLS.find(x=>x.id===id);
    return r ? r.name : "Unsorted";
  }
  function folderName(id){
    const f = FOLDERS.find(x=>x.id===id);
    return f ? f.name : null;
  }

  function filteredFrames(){
    return FRAMES.filter(f=>{
      if(activeRoll!=="all" && f.rollId!==activeRoll) return false;
      if(activeFolder!==null && f.folderId!==activeFolder) return false;
      if(!query) return true;
      const hay = (f.name+" "+rollName(f.rollId)+" "+(folderName(f.folderId)||"")+" "+f.date+" "+f.aperture+" ISO"+f.iso).toLowerCase();
      return hay.includes(query.toLowerCase());
    });
  }

  // ---------- render: sidebar ----------
  function renderSidebar(){
    const list = document.getElementById("rollList");
    list.innerHTML = "";

    const allItem = document.createElement("li");
    allItem.className = "roll-item" + (activeRoll==="all" ? " active" : "");
    allItem.innerHTML = `<span class="rname">All rolls</span><span class="rcount">${FRAMES.length}</span>`;
    allItem.addEventListener("click", ()=>{ activeRoll="all"; render(); });
    list.appendChild(allItem);

    ROLLS.forEach((r, i)=>{
      const count = FRAMES.filter(f=>f.rollId===r.id).length;
      const li = document.createElement("li");
      li.className = "roll-item" + (activeRoll===r.id ? " active" : "");
      li.innerHTML = `<span class="rn">${String(i+1).padStart(2,"0")}</span><span class="rname">${r.name}</span><span class="rcount">${count}</span>`;
      li.addEventListener("click", ()=>{ activeRoll = (activeRoll===r.id ? "all" : r.id); render(); });
      list.appendChild(li);
    });

    const flist = document.getElementById("folderList");
    flist.innerHTML = "";
    FOLDERS.forEach(fo=>{
      const count = FRAMES.filter(f=>f.folderId===fo.id).length;
      const li = document.createElement("li");
      li.className = "roll-item" + (activeFolder===fo.id ? " active" : "");
      li.innerHTML = `<span class="ricon">▸</span><span class="rname">${fo.name}</span><span class="rcount">${count}</span>`;
      li.addEventListener("click", ()=>{ activeFolder = (activeFolder===fo.id ? null : fo.id); render(); });
      flist.appendChild(li);
    });
  }

  // ---------- render: recent tray ---------
  function renderTray(){
    const tray = document.getElementById("tray");
    tray.innerHTML = "";
    const recent = FRAMES.slice(-12).reverse();
    recent.forEach(f=>{
      const div = document.createElement("div");
      div.className = "tray-print";
      div.tabIndex = 0;
      div.style.setProperty("--rot", f.rot+"deg");
      div.innerHTML = `<img loading="lazy" src="${imgSrc(f,180,180)}" alt="${f.name} thumbnail"><span>${f.name}</span>`;
      div.addEventListener("click", ()=> openLightbox(f.id, FRAMES));
      tray.appendChild(div);
    });
  }

  // ---------- render: grid ----------
  function renderGrid(){
    const grid = document.getElementById("grid");
    const empty = document.getElementById("emptyState");
    const list = filteredFrames();
    currentList = list;
    grid.innerHTML = "";

    if(list.length === 0){
      empty.style.display = "block";
    } else {
      empty.style.display = "none";
      list.forEach(f=>{
        const el = document.createElement("article");
        el.className = "frame";
        el.tabIndex = 0;
        el.style.setProperty("--rot", f.rot+"deg");
        const fname = folderName(f.folderId);
        el.innerHTML = `
          <div class="frame-imgwrap">
            <span class="frame-number">${f.name}</span>
            ${f.isNew ? '<span class="frame-new-badge">new</span>' : ''}
            ${fname ? `<span class="frame-folder-badge">${fname}</span>` : ''}
            <img loading="lazy" src="${imgSrc(f, view==='light'?520:320, view==='light'?347:213)}" alt="${f.name}, from ${rollName(f.rollId)}">
          </div>
          <div class="frame-meta">
            <span class="frame-name">${f.name} · ${rollName(f.rollId)}</span>
            <span class="frame-exif">${f.aperture} · ${f.shutter}s · ISO${f.iso}</span>
          </div>`;
        el.addEventListener("click", ()=> openLightbox(f.id, list));
        el.addEventListener("keydown", (e)=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); openLightbox(f.id, list);} });
        grid.appendChild(el);
      });
    }

    let title = activeRoll==="all" ? "All frames" : rollName(activeRoll);
    if(activeFolder!==null){
      title = folderName(activeFolder) + (activeRoll==="all" ? "" : " · " + rollName(activeRoll));
    }
    document.getElementById("stageTitle").textContent = query ? `Results for "${query}"` : title;
    document.getElementById("stageSub").textContent = `${list.length} frame${list.length===1?"":"s"}`;
  }

  // ---------- render: counters ----------
  function renderCounters(){
    const total = FRAMES.length;
    document.getElementById("counterDigits").innerHTML = `${String(total).padStart(3,"0")}<span>/${STORAGE_CAP_FRAMES}</span>`;
    const gbUsed = (total*GB_PER_FRAME).toFixed(1);
    document.getElementById("counterSub").textContent = `${gbUsed} GB used of ${STORAGE_CAP_GB} GB`;

    document.getElementById("gaugeLabel").textContent = `${total} of ${STORAGE_CAP_FRAMES} frames stored`;
    const pct = Math.min(100, (total/STORAGE_CAP_FRAMES)*100);
    requestAnimationFrame(()=>{ document.getElementById("gaugeFill").style.width = pct+"%"; });
  }

  function render(){
    renderSidebar();
    renderGrid();
    renderCounters();
  }

  // ---------- lightbox ----------
  function refreshFolderSelect(f){
    const sel = document.getElementById("lbFolder");
    sel.innerHTML = `<option value="">Unfiled</option>` + FOLDERS.map(fo=>`<option value="${fo.id}">${fo.name}</option>`).join("");
    sel.value = f.folderId || "";
  }
  function openLightbox(frameId, list){
    currentList = list && list.length ? list : filteredFrames();
    lightboxIndex = currentList.findIndex(f=>f.id===frameId);
    if(lightboxIndex===-1) lightboxIndex = 0;
    showLightboxFrame();
    document.getElementById("lightbox").classList.add("open");
  }
  function showLightboxFrame(){
    const f = currentList[lightboxIndex];
    if(!f) return;
    document.getElementById("lbImg").src = imgSrc(f, 1000, 667);
    document.getElementById("lbImg").alt = f.name;
    document.getElementById("lbName").textContent = f.name;
    document.getElementById("lbRoll").textContent = rollName(f.rollId);
    document.getElementById("lbDate").textContent = f.date;
    document.getElementById("lbAperture").textContent = f.aperture;
    document.getElementById("lbShutter").textContent = f.shutter + "s";
    document.getElementById("lbIso").textContent = f.iso;
    refreshFolderSelect(f);
    document.getElementById("lbDownload").onclick = ()=> window.open(imgSrc(f,1600,1067), "_blank");
  }
  function closeLightbox(){ document.getElementById("lightbox").classList.remove("open"); render(); }
  function stepLightbox(dir){
    if(currentList.length===0) return;
    lightboxIndex = (lightboxIndex + dir + currentList.length) % currentList.length;
    showLightboxFrame();
  }

  document.getElementById("lbClose").addEventListener("click", closeLightbox);
  document.getElementById("lbPrev").addEventListener("click", ()=>stepLightbox(-1));
  document.getElementById("lbNext").addEventListener("click", ()=>stepLightbox(1));
  document.getElementById("lbFolder").addEventListener("change", (e)=>{
    const f = currentList[lightboxIndex];
    if(!f) return;
    f.folderId = e.target.value || null;
  });
  document.getElementById("lightbox").addEventListener("click", (e)=>{ if(e.target.id==="lightbox") closeLightbox(); });
  document.addEventListener("keydown", (e)=>{
    if(!document.getElementById("lightbox").classList.contains("open")) return;
    if(e.key==="Escape") closeLightbox();
    if(e.key==="ArrowLeft") stepLightbox(-1);
    if(e.key==="ArrowRight") stepLightbox(1);
  });

  // ---------- search ----------
  document.getElementById("search").addEventListener("input", (e)=>{
    query = e.target.value.trim();
    renderGrid();
  });

  // ---------- view toggle ----------
  document.querySelectorAll(".view-toggle button").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll(".view-toggle button").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      view = btn.dataset.view;
      document.getElementById("grid").className = "grid" + (view==="light" ? " light-table" : "");
      renderGrid();
    });
  });

  // ---------- new roll / folder ----------
  document.getElementById("newRollForm").addEventListener("submit", (e)=>{
    e.preventDefault();
    const input = document.getElementById("newRollName");
    const name = input.value.trim();
    if(!name) return;
    const id = "r_"+Date.now();
    ROLLS.push({id, name});
    activeRoll = id;
    input.value = "";
    render();
  });
  document.getElementById("newFolderForm").addEventListener("submit", (e)=>{
    e.preventDefault();
    const input = document.getElementById("newFolderName");
    const name = input.value.trim();
    if(!name) return;
    const id = "fo_"+Date.now();
    FOLDERS.push({id, name});
    activeFolder = id;
    input.value = "";
    render();
  });

  // ---------- upload / drop ----------
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");

  function addFiles(files){
    const list = Array.from(files).filter(f=>f.type.startsWith("image/"));
    if(list.length===0) return;
    const targetRoll = activeRoll==="all" ? "r8" : activeRoll;
    list.forEach(file=>{
      const url = URL.createObjectURL(file);
      const rollFrames = FRAMES.filter(f=>f.rollId===targetRoll);
      const idx = rollFrames.length + 1;
      const ri = ROLLS.findIndex(r=>r.id===targetRoll);
      FRAMES.push({
        id:"f"+(fid++),
        rollId:targetRoll,
        rollIndex: ri<0?0:ri,
        frameIndex: idx,
        folderId: activeFolder,
        seed:"local-"+fid,
        name:`R${String((ri<0?0:ri)+1).padStart(3,"0")}_F${String(idx).padStart(2,"0")}`,
        date:"Just now",
        aperture:pick(APERTURES),
        shutter:pick(SHUTTERS),
        iso:pick(ISOS),
        rot:(Math.random()*4-2).toFixed(1),
        isNew:true,
        localSrc:url
      });
    });
    activeRoll = targetRoll;
    render();
    renderTray();
  }

  dropzone.addEventListener("click", ()=> fileInput.click());
  dropzone.addEventListener("keydown", (e)=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); fileInput.click(); } });
  fileInput.addEventListener("change", (e)=> addFiles(e.target.files));
  ["dragenter","dragover"].forEach(ev=>{
    dropzone.addEventListener(ev, (e)=>{ e.preventDefault(); dropzone.classList.add("drag"); });
  });
  ["dragleave","drop"].forEach(ev=>{
    dropzone.addEventListener(ev, (e)=>{ e.preventDefault(); dropzone.classList.remove("drag"); });
  });
  dropzone.addEventListener("drop", (e)=>{
    if(e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
  });

  // ---------- misc UI ----------
  document.getElementById("scrollToGrid").addEventListener("click", ()=>{
    document.getElementById("grid-anchor").scrollIntoView({behavior:"smooth", block:"start"});
  });
  document.getElementById("scrollToUpload").addEventListener("click", ()=>{
    document.getElementById("grid-anchor").scrollIntoView({behavior:"smooth", block:"start"});
    setTimeout(()=> dropzone.focus(), 400);
  });

  document.getElementById("footStamp").textContent = "Archive established " + MONTHS[new Date().getMonth()] + " " + new Date().getFullYear();

  // ---------- hero slider ----------
  const HERO_SRC = document.getElementById("printImg").getAttribute("src");
  const SLIDES = [
    {src:HERO_SRC, caption:"R002_F03 · Kitchen Table Portraits", alt:"A group of friends laughing together outdoors on a sunny day"},
    ...FRAMES.slice(0,3).map(f=>({src:imgSrc(f,600,900), caption:`${f.name} · ${rollName(f.rollId)}`, alt:`${f.name}, from ${rollName(f.rollId)}`})),
    ...FRAMES.slice(20,22).map(f=>({src:imgSrc(f,600,900), caption:`${f.name} · ${rollName(f.rollId)}`, alt:`${f.name}, from ${rollName(f.rollId)}`}))
  ];
  let slideIndex = 0;
  let slideTimer = null;

  function renderDots(){
    const dots = document.getElementById("slideDots");
    dots.innerHTML = "";
    SLIDES.forEach((s,i)=>{
      const b = document.createElement("button");
      b.className = i===slideIndex ? "active" : "";
      b.setAttribute("aria-label", "Go to photo "+(i+1));
      b.addEventListener("click", ()=> goToSlide(i));
      dots.appendChild(b);
    });
  }

  function goToSlide(i){
    slideIndex = (i + SLIDES.length) % SLIDES.length;
    const s = SLIDES[slideIndex];
    const oldPrint = document.getElementById("printSlide");
    const tilt = (Math.random()*6 - 3).toFixed(1) + "deg";

    const newPrint = oldPrint.cloneNode(true);
    newPrint.id = "printSlide";
    newPrint.style.setProperty("--tilt", tilt);
    newPrint.querySelector("img").src = s.src;
    newPrint.querySelector("img").alt = s.alt;
    newPrint.querySelector("figcaption").textContent = s.caption;

    oldPrint.replaceWith(newPrint);
    renderDots();
    resetAutoplay();
  }

  function resetAutoplay(){
    if(slideTimer) clearInterval(slideTimer);
    slideTimer = setInterval(()=> goToSlide(slideIndex+1), 3000);
  }

  document.getElementById("slidePrev").addEventListener("click", ()=> goToSlide(slideIndex-1));
  document.getElementById("slideNext").addEventListener("click", ()=> goToSlide(slideIndex+1));

  renderDots();
  resetAutoplay();

  // ---------- init ----------
  renderTray();
  render();
})();
