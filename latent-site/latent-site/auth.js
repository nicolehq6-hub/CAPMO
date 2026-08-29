(function(){
  "use strict";

  const tabs = document.querySelectorAll(".auth-tab");
  const forms = {
    login: document.getElementById("loginForm"),
    signup: document.getElementById("signupForm")
  };

  tabs.forEach(tab=>{
    tab.addEventListener("click", ()=>{
      tabs.forEach(t=>t.classList.remove("active"));
      tab.classList.add("active");
      Object.values(forms).forEach(f=>f.classList.remove("active"));
      forms[tab.dataset.tab].classList.add("active");
    });
  });

  function handleSubmit(form, errorEl, message){
    form.addEventListener("submit", (e)=>{
      e.preventDefault();
      if(!form.checkValidity()){
        errorEl.textContent = message;
        errorEl.classList.add("show");
        form.reportValidity();
        return;
      }
      errorEl.classList.remove("show");
      // No backend here — this is a front-end demo, so a valid submit
      // just takes you into the archive.
      window.location.href = "latent.html";
    });
  }

  handleSubmit(forms.login, document.getElementById("loginError"), "Enter a valid email and password to continue.");
  handleSubmit(forms.signup, document.getElementById("signupError"), "Fill in every field — password needs at least 6 characters.");

  // If the background video fails to load (e.g. file not added yet),
  // the gradient behind it in auth.css shows through on its own.
  const video = document.querySelector(".auth-video");
  if(video){
    video.addEventListener("error", ()=> video.style.display = "none");
  }
})();
