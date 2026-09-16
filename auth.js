// Lógica de desbloqueio da tela de senha/rosto.
// Depende de CryptoJS e face-api.js (carregados via CDN no index.html) e
// das constantes ENCRYPTED_CONTENT / FACE_UNLOCK_SECRET_B64 (js/content.enc.js).
(function () {
  "use strict";

  var FACE_MATCH_THRESHOLD = 0.5; // menor = mais rigoroso. 0.5–0.6 é o padrão do face-api.js
  // O pacote npm do face-api.js não inclui os pesos do modelo — eles só
  // existem no repositório do GitHub do projeto, por isso usamos o modo
  // "/gh/" do jsdelivr (serve arquivos direto de um repositório GitHub).
  var FACE_MODELS_URL = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights";

  var statusEl = document.getElementById("lock-status");
  var passwordForm = document.getElementById("password-form");
  var passwordInput = document.getElementById("password-input");
  var faceBtn = document.getElementById("face-auth-btn");
  var faceCancelBtn = document.getElementById("face-cancel-btn");
  var videoWrap = document.getElementById("face-video-wrap");
  var video = document.getElementById("face-video");

  var faceModelsLoaded = false;
  var referenceDescriptors = [];
  var mediaStream = null;
  var matchTimer = null;

  function setStatus(message, kind) {
    statusEl.textContent = message || "";
    statusEl.className = "lock-status" + (kind ? " " + kind : "");
  }

  function tryUnlock(password) {
    try {
      var bytes = CryptoJS.AES.decrypt(ENCRYPTED_CONTENT, password);
      var html = bytes.toString(CryptoJS.enc.Utf8);
      if (html && html.trim().toLowerCase().indexOf("<!doctype html") === 0) {
        setStatus("Acesso liberado…", "success");
        document.open();
        document.write(html);
        document.close();
        return true;
      }
    } catch (e) {
      // senha errada costuma gerar bytes inválidos -> cai no fallback abaixo
    }
    return false;
  }

  passwordForm.addEventListener("submit", function (event) {
    event.preventDefault();
    var ok = tryUnlock(passwordInput.value);
    if (!ok) {
      setStatus("Senha incorreta.", "error");
      passwordInput.value = "";
      passwordInput.focus();
    }
  });

  function stopCamera() {
    if (matchTimer) {
      clearInterval(matchTimer);
      matchTimer = null;
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach(function (track) { track.stop(); });
      mediaStream = null;
    }
    videoWrap.style.display = "none";
  }

  async function loadFaceModels() {
    await faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODELS_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(FACE_MODELS_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(FACE_MODELS_URL);
  }

  async function loadReferenceDescriptors() {
    var manifestRes = await fetch("faces/manifest.json", { cache: "no-store" });
    if (!manifestRes.ok) return [];
    var filenames = await manifestRes.json();
    var descriptors = [];
    for (var i = 0; i < filenames.length; i++) {
      try {
        var img = await faceapi.fetchImage("faces/" + encodeURIComponent(filenames[i]));
        var detection = await faceapi
          .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor();
        if (detection) descriptors.push(detection.descriptor);
      } catch (e) {
        console.warn("Não consegui processar a foto de referência:", filenames[i], e);
      }
    }
    return descriptors;
  }

  faceBtn.addEventListener("click", async function () {
    setStatus("Carregando reconhecimento facial…", "info");
    faceBtn.disabled = true;
    try {
      if (!faceModelsLoaded) {
        await loadFaceModels();
        faceModelsLoaded = true;
      }
      if (referenceDescriptors.length === 0) {
        referenceDescriptors = await loadReferenceDescriptors();
      }
      if (referenceDescriptors.length === 0) {
        setStatus("Nenhuma foto de referência cadastrada em faces/. Veja faces/README.md.", "error");
        faceBtn.disabled = false;
        return;
      }

      mediaStream = await navigator.mediaDevices.getUserMedia({ video: {} });
      video.srcObject = mediaStream;
      await video.play();
      videoWrap.style.display = "block";
      setStatus("Posicione seu rosto no centro da câmera…", "info");

      matchTimer = setInterval(async function () {
        var detection = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor();
        if (!detection) return;

        var best = Infinity;
        for (var i = 0; i < referenceDescriptors.length; i++) {
          var dist = faceapi.euclideanDistance(referenceDescriptors[i], detection.descriptor);
          if (dist < best) best = dist;
        }

        if (best < FACE_MATCH_THRESHOLD) {
          stopCamera();
          var secret = atob(FACE_UNLOCK_SECRET_B64);
          if (!tryUnlock(secret)) {
            setStatus("Rosto reconhecido, mas não consegui liberar o conteúdo.", "error");
            faceBtn.disabled = false;
          }
        }
      }, 700);
    } catch (err) {
      setStatus("Não foi possível usar a câmera: " + err.message, "error");
      faceBtn.disabled = false;
      stopCamera();
    }
  });

  faceCancelBtn.addEventListener("click", function () {
    stopCamera();
    setStatus("", "");
    faceBtn.disabled = false;
  });
})();
