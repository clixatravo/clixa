/**
 * Générateur du Trailer Vidéo Général Officiel de CLIXA Institute.
 *
 * Exécuté via Chromium (Playwright) pour composer en temps réel à 30fps
 * un MP4 haute définition (1280x720) avec :
 *   - Sound design exécutif (sub-bass transitions, arpeggio rhythm, chimes)
 *   - Particules dorées & lueurs ambiantes
 *   - Intégration des extraits vidéo réels de cours et de témoignages
 *   - Typographies dorées et fiches d'impact pour chaque filière (DAF, PMP, Leadership)
 *   - Export final vers public/videos/trailer_clixa_officiel.mp4 et son poster.
 */
import { writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pkg from "@playwright/test";
const { chromium } = pkg;

const RACINE = resolve(import.meta.dirname, "..");
const DOSSIER_SORTIE = resolve(RACINE, "public/videos");

async function genererTrailer() {
  console.log("🎬 Lancement de la génération du Trailer Officiel CLIXA...");
  
  // Charger les fichiers vidéo et images en base64 pour injection instantanée dans Chromium
  const vidDafExtraitB64 = (await readFile(resolve(DOSSIER_SORTIE, "immersion/reel_daf_extrait.mp4"))).toString("base64");
  const vidDafTemoignageB64 = (await readFile(resolve(DOSSIER_SORTIE, "immersion/reel_daf_temoignage.mp4"))).toString("base64");
  const imgSeminaireB64 = (await readFile(resolve(RACINE, "public/images/marketing/seminaire-directeur-clixa.jpg"))).toString("base64");
  const imgCertificatB64 = (await readFile(resolve(RACINE, "public/images/marketing/certification-diplome-clixa.jpg"))).toString("base64");

  console.log("📦 Médias chargés en mémoire. Démarrage du moteur graphique Chromium...");
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1300, height: 750 } });

  // Exécution du studio de rendu dans le contexte du navigateur
  const resultat = await page.evaluate(async (medias) => {
    const W = 1280;
    const H = 720;
    const FPS = 30;
    const DUREE_SEC = 42;
    const TOTAL_FRAMES = FPS * DUREE_SEC;

    // Création du canvas
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    document.body.appendChild(canvas);

    // Initialisation du moteur Audio Web pour le sound design du trailer
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const dest = audioCtx.createMediaStreamDestination();

    // Fonction synthétisant un impact de basse cinéma (Sub-bass drop)
    function jouerImpactBasse(t) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(90, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.8);
      gain.gain.setValueAtTime(0.7, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 1.2);
    }

    // Fonction synthétisant une note de brillance dorée (Chime / Bell)
    function jouerClocheDoree(t, freq = 880) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 1.5);
    }

    // Fonction synthétisant un rythme de pulsation électronique (Pulse beat)
    function jouerTick(t) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(140, t);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.08);
    }

    // Programmation de la bande sonore sur les 42 secondes
    for (let sec = 0; sec < DUREE_SEC; sec++) {
      const t = audioCtx.currentTime + sec;
      // Impacts de transition sur chaque nouvelle scène
      if (sec === 0 || sec === 6 || sec === 14 || sec === 22 || sec === 30 || sec === 37) {
        jouerImpactBasse(t);
        jouerClocheDoree(t, sec === 0 ? 880 : sec === 37 ? 1320 : 660);
      }
      // Battements de rythme (toutes les secondes à partir de 6s)
      if (sec >= 5 && sec <= 38) {
        jouerTick(t);
        jouerTick(t + 0.5);
      }
    }

    // Préparation des éléments vidéo et image
    const vExtrait = document.createElement("video");
    vExtrait.src = "data:video/mp4;base64," + medias.vidDafExtraitB64;
    vExtrait.muted = true;
    vExtrait.playsInline = true;
    await vExtrait.play().catch(() => {});

    const vTemoignage = document.createElement("video");
    vTemoignage.src = "data:video/mp4;base64," + medias.vidDafTemoignageB64;
    vTemoignage.muted = true;
    vTemoignage.playsInline = true;
    await vTemoignage.play().catch(() => {});

    const imgSeminaire = new Image();
    imgSeminaire.src = "data:image/jpeg;base64," + medias.imgSeminaireB64;
    await new Promise(r => imgSeminaire.onload = r);

    const imgCertificat = new Image();
    imgCertificat.src = "data:image/jpeg;base64," + medias.imgCertificatB64;
    await new Promise(r => imgCertificat.onload = r);

    // Particules flottantes d'ambiance dorée
    const particules = Array.from({ length: 45 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 2 + 1,
      vy: Math.random() * 0.4 + 0.2,
      opacity: Math.random() * 0.5 + 0.2,
    }));

    // Configuration de l'enregistrement de flux combiné (Vidéo Canvas + Audio Synth)
    const streamCanvas = canvas.captureStream(FPS);
    const audioTrack = dest.stream.getAudioTracks()[0];
    if (audioTrack) streamCanvas.addTrack(audioTrack);

    const mime = MediaRecorder.isTypeSupported("video/mp4;codecs=avc1")
      ? "video/mp4;codecs=avc1"
      : "video/webm";
    const recorder = new MediaRecorder(streamCanvas, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.start();

    // Variables pour l'instantané du poster (capturé à t = 3.5s)
    let posterDataUrl = "";

    // Boucle de rendu de chaque image du trailer
    for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
      const sec = frame / FPS;

      // 1. Fond d'encre bleu nuit élégant
      ctx.fillStyle = "#070b16";
      ctx.fillRect(0, 0, W, H);

      // 2. Halo d'ambiance doré au centre
      const radGlow = ctx.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, 600);
      radGlow.addColorStop(0, "rgba(201, 162, 76, 0.12)");
      radGlow.addColorStop(1, "rgba(7, 11, 22, 0)");
      ctx.fillStyle = radGlow;
      ctx.fillRect(0, 0, W, H);

      // 3. Mise à jour et tracé des particules dorées
      for (const p of particules) {
        p.y -= p.vy;
        if (p.y < 0) p.y = H;
        ctx.fillStyle = `rgba(201, 162, 76, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. Cadre de luxe discret autour de l'écran
      ctx.strokeStyle = "rgba(201, 162, 76, 0.18)";
      ctx.lineWidth = 1;
      ctx.strokeRect(30, 30, W - 60, H - 60);

      // Barre de progression élégante tout en bas
      const prog = (frame / TOTAL_FRAMES) * (W - 60);
      ctx.fillStyle = "rgba(201, 162, 76, 0.5)";
      ctx.fillRect(30, H - 32, prog, 2);

      // ── SCÈNE 1 (0s à 6s) : L'ACCROCHE & LE PRESTIGE CLIXA ────────────────
      if (sec < 6) {
        const fade = Math.min(1, sec * 1.5) * (sec > 5 ? (6 - sec) : 1);
        ctx.globalAlpha = fade;

        // Badge doré
        ctx.fillStyle = "rgba(201, 162, 76, 0.15)";
        ctx.strokeStyle = "rgba(201, 162, 76, 0.4)";
        ctx.beginPath();
        ctx.roundRect(W / 2 - 220, 160, 440, 38, 19);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#e0be6c";
        ctx.font = "bold 14px monospace";
        ctx.textAlign = "center";
        ctx.fillText("✦ CLIXA INSTITUTE · PAN-AFRICA", W / 2, 184);

        // Titre majestueux
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 50px serif";
        ctx.fillText("Des formations qui changent", W / 2, 270);
        
        // Texte dégradé or
        const gradOr = ctx.createLinearGradient(W / 2 - 250, 0, W / 2 + 250, 0);
        gradOr.addColorStop(0, "#c9a24c");
        gradOr.addColorStop(0.5, "#fad884");
        gradOr.addColorStop(1, "#c9a24c");
        ctx.fillStyle = gradOr;
        ctx.fillText("une trajectoire.", W / 2, 335);

        // Sous-titre institutionnel
        ctx.fillStyle = "rgba(243, 239, 228, 0.85)";
        ctx.font = "18px sans-serif";
        ctx.fillText("Certifications & Formations Exécutives pour Dirigeants et Managers", W / 2, 405);

        // Piliers clés
        ctx.font = "14px monospace";
        ctx.fillStyle = "rgba(201, 162, 76, 0.9)";
        ctx.fillText("100% PRATICIENS EN EXERCICE · CAS RÉELS · EN DIRECT", W / 2, 470);
        ctx.fillText("AGADIR · ABIDJAN · DAKAR · CLASSE VIRTUELLE", W / 2, 500);

        ctx.globalAlpha = 1;
        if (sec >= 3.0 && !posterDataUrl) {
          posterDataUrl = canvas.toDataURL("image/jpeg", 0.9);
        }
      }

      // ── SCÈNE 2 (6s à 14s) : FILIÈRE FINANCE · DAF ────────────────────────
      else if (sec < 14) {
        const sSec = sec - 6;
        const fade = Math.min(1, sSec * 1.5) * (sSec > 7 ? (8 - sSec) : 1);
        ctx.globalAlpha = fade;

        // Titre de section en haut
        ctx.fillStyle = "#fad884";
        ctx.font = "bold 13px monospace";
        ctx.textAlign = "left";
        ctx.fillText("01 / FILIÈRE FINANCE STRATÉGIQUE", 80, 85);

        // À gauche : Incrustation vidéo réelle du cours DAF (1:1 carré)
        const vSize = 440;
        const vX = 80;
        const vY = 130;

        ctx.fillStyle = "#0c1322";
        ctx.fillRect(vX, vY, vSize, vSize);
        if (vExtrait.readyState >= 2) {
          ctx.drawImage(vExtrait, vX, vY, vSize, vSize);
        }
        ctx.strokeStyle = "rgba(201, 162, 76, 0.5)";
        ctx.lineWidth = 2;
        ctx.strokeRect(vX, vY, vSize, vSize);

        // Badge en surimpression sur la vidéo
        ctx.fillStyle = "rgba(10, 16, 32, 0.85)";
        ctx.fillRect(vX + 15, vY + 15, 180, 28);
        ctx.fillStyle = "#2fa37d";
        ctx.font = "bold 11px monospace";
        ctx.fillText("● EN DIRECT · SÉANCE 1", vX + 25, vY + 33);

        // À droite : Fiche programme DAF & Punchline
        const tX = 560;
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 36px serif";
        ctx.fillText("Directeur Administratif", tX, 180);
        ctx.fillText("& Financier (DAF)", tX, 225);

        // Citation en encadré
        ctx.fillStyle = "rgba(201, 162, 76, 0.08)";
        ctx.fillRect(tX, 260, 640, 130);
        ctx.fillStyle = "#c9a24c";
        ctx.fillRect(tX, 260, 4, 130);

        ctx.fillStyle = "#f3efe4";
        ctx.font = "italic 18px serif";
        ctx.fillText("« Être DAF, ce n'est pas seulement faire de la finance.", tX + 25, 298);
        ctx.fillText("C'est piloter la performance, sécuriser la gestion", tX + 25, 328);
        ctx.fillText("et structurer les processus stratégiques. »", tX + 25, 358);

        // Points forts
        ctx.fillStyle = "rgba(243, 239, 228, 0.85)";
        ctx.font = "15px sans-serif";
        ctx.fillText("✦ 40 heures de masterclass exécutive interactive", tX + 10, 430);
        ctx.fillText("✦ Décisions réelles d'entreprise & arbitrages de direction", tX + 10, 465);
        ctx.fillText("✦ Certificat professionnel nominatif et référencé", tX + 10, 500);

        ctx.globalAlpha = 1;
      }

      // ── SCÈNE 3 (14s à 22s) : FILIÈRE PROJET · CERTIFICATION PMP® ─────────
      else if (sec < 22) {
        const sSec = sec - 14;
        const fade = Math.min(1, sSec * 1.5) * (sSec > 7 ? (8 - sSec) : 1);
        ctx.globalAlpha = fade;

        ctx.fillStyle = "#fad884";
        ctx.font = "bold 13px monospace";
        ctx.textAlign = "left";
        ctx.fillText("02 / FILIÈRE MANAGEMENT DE PROJET & EXCELLENCE", 80, 85);

        // Grande carte prestige PMP
        ctx.fillStyle = "rgba(12, 19, 34, 0.9)";
        ctx.strokeStyle = "rgba(201, 162, 76, 0.35)";
        ctx.beginPath();
        ctx.roundRect(80, 120, W - 160, 480, 16);
        ctx.fill();
        ctx.stroke();

        // Macaron PMI
        ctx.fillStyle = "rgba(201, 162, 76, 0.15)";
        ctx.beginPath();
        ctx.roundRect(130, 160, 280, 36, 18);
        ctx.fill();
        ctx.fillStyle = "#fad884";
        ctx.font = "bold 12px monospace";
        ctx.fillText("PMP® · PROJECT MANAGEMENT INSTITUTE", 145, 183);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 44px serif";
        ctx.fillText("Préparation à la Certification PMP®", 130, 260);

        ctx.fillStyle = "#c9a24c";
        ctx.font = "24px serif";
        ctx.fillText("La référence mondiale absolue en conduite de projets complexes.", 130, 305);

        // 3 colonnes de repères méthodologiques
        const colW = 320;
        const bY = 370;

        // Bloc 1
        ctx.fillStyle = "rgba(255,255,255,0.04)";
        ctx.fillRect(130, bY, colW, 160);
        ctx.fillStyle = "#fad884";
        ctx.font = "bold 18px monospace";
        ctx.fillText("35 HEURES LIVE", 150, bY + 45);
        ctx.fillStyle = "rgba(243, 239, 228, 0.8)";
        ctx.font = "14px sans-serif";
        ctx.fillText("Sessions intensives en direct", 150, bY + 80);
        ctx.fillText("avec formateurs certifiés PMP", 150, bY + 105);

        // Bloc 2
        ctx.fillStyle = "rgba(255,255,255,0.04)";
        ctx.fillRect(130 + colW + 20, bY, colW, 160);
        ctx.fillStyle = "#fad884";
        ctx.font = "bold 18px monospace";
        ctx.fillText("STANDARD PMBOK", 150 + colW + 20, bY + 45);
        ctx.fillStyle = "rgba(243, 239, 228, 0.8)";
        ctx.font = "14px sans-serif";
        ctx.fillText("Alignement complet sur", 150 + colW + 20, bY + 80);
        ctx.fillText("le référentiel PMI le plus récent", 150 + colW + 20, bY + 105);

        // Bloc 3
        ctx.fillStyle = "rgba(255,255,255,0.04)";
        ctx.fillRect(130 + (colW + 20) * 2, bY, colW, 160);
        ctx.fillStyle = "#fad884";
        ctx.font = "bold 18px monospace";
        ctx.fillText("SIMULATEURS EXAMEN", 150 + (colW + 20) * 2, bY + 45);
        ctx.fillStyle = "rgba(243, 239, 228, 0.8)";
        ctx.font = "14px sans-serif";
        ctx.fillText("Entraînement en conditions réelles", 150 + (colW + 20) * 2, bY + 80);
        ctx.fillText("pour réussir dès le 1er passage", 150 + (colW + 20) * 2, bY + 105);

        ctx.globalAlpha = 1;
      }

      // ── SCÈNE 4 (22s à 30s) : GOUVERNANCE & DIRECTEUR DE PROJETS ─────────
      else if (sec < 30) {
        const sSec = sec - 22;
        const fade = Math.min(1, sSec * 1.5) * (sSec > 7 ? (8 - sSec) : 1);
        ctx.globalAlpha = fade;

        ctx.fillStyle = "#fad884";
        ctx.font = "bold 13px monospace";
        ctx.textAlign = "left";
        ctx.fillText("03 / FILIÈRE GOUVERNANCE & DIRECTION STRATÉGIQUE", 80, 85);

        // Arrière-plan séminaire estompé
        ctx.drawImage(imgSeminaire, 80, 120, 480, 480);
        ctx.fillStyle = "rgba(7, 11, 22, 0.4)";
        ctx.fillRect(80, 120, 480, 480);
        ctx.strokeStyle = "rgba(201, 162, 76, 0.4)";
        ctx.strokeRect(80, 120, 480, 480);

        // Panneau de droite
        const tX = 610;
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 40px serif";
        ctx.fillText("Directeur de Projets", tX, 190);
        ctx.fillText("& Leadership Exécutif", tX, 240);

        ctx.fillStyle = "#c9a24c";
        ctx.font = "bold 18px sans-serif";
        ctx.fillText("Passez du management d'équipe à la direction stratégique.", tX, 290);

        const items = [
          ["Gouvernance de portefeuille", "Arbitrage de ressources et priorisation des investissements."],
          ["Comités de direction & pilotage", "Savoir interagir et convaincre les parties prenantes clés."],
          ["Maîtrise du delivery & risques", "Sécuriser les projets à forts enjeux financiers."],
        ];

        let iY = 345;
        for (const [titre, desc] of items) {
          ctx.fillStyle = "#fad884";
          ctx.font = "bold 16px sans-serif";
          ctx.fillText("✦ " + titre, tX, iY);
          ctx.fillStyle = "rgba(243, 239, 228, 0.8)";
          ctx.font = "14px sans-serif";
          ctx.fillText(desc, tX + 20, iY + 24);
          iY += 65;
        }

        ctx.globalAlpha = 1;
      }

      // ── SCÈNE 5 (30s à 37s) : PREUVE & RECONNAISSANCE DU CERTIFICAT ────────
      else if (sec < 37) {
        const sSec = sec - 30;
        const fade = Math.min(1, sSec * 1.5) * (sSec > 6 ? (7 - sSec) : 1);
        ctx.globalAlpha = fade;

        ctx.fillStyle = "#fad884";
        ctx.font = "bold 13px monospace";
        ctx.textAlign = "left";
        ctx.fillText("04 / LA PREUVE PAR LE TERRAIN · DIPLÔMES & TÉMOIGNAGES", 80, 85);

        // Gauche : Clip vidéo du participant en direct
        const vSize = 440;
        const vX = 80;
        const vY = 120;
        ctx.fillStyle = "#0c1322";
        ctx.fillRect(vX, vY, vSize, vSize);
        if (vTemoignage.readyState >= 2) {
          ctx.drawImage(vTemoignage, vX, vY, vSize, vSize);
        }
        ctx.strokeStyle = "rgba(201, 162, 76, 0.5)";
        ctx.strokeRect(vX, vY, vSize, vSize);

        ctx.fillStyle = "rgba(10, 16, 32, 0.85)";
        ctx.fillRect(vX + 15, vY + 15, 230, 28);
        ctx.fillStyle = "#fad884";
        ctx.font = "bold 11px monospace";
        ctx.fillText("🎙️ TÉMOIGNAGE PARTICIPANT", vX + 25, vY + 33);

        // Droite : Affichage du certificat officiel réel
        const tX = 560;
        ctx.drawImage(imgCertificat, tX, 120, 640, 340);
        ctx.strokeStyle = "rgba(201, 162, 76, 0.5)";
        ctx.strokeRect(tX, 120, 640, 340);

        ctx.fillStyle = "rgba(201, 162, 76, 0.1)";
        ctx.fillRect(tX, 480, 640, 80);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 17px serif";
        ctx.fillText("Certificat Professionnel CLIXA Institute", tX + 20, 512);
        ctx.fillStyle = "rgba(243, 239, 228, 0.85)";
        ctx.font = "14px sans-serif";
        ctx.fillText("Nominatif, référencé, avec cachet officiel et détail complet des modules.", tX + 20, 538);

        ctx.globalAlpha = 1;
      }

      // ── SCÈNE 6 (37s à 42s) : CLIMAX & APPEL À L'ACTION ───────────────────
      else {
        const sSec = sec - 37;
        const fade = Math.min(1, sSec * 1.5);
        ctx.globalAlpha = fade;

        // Grande étoile d'excellence dorée
        ctx.fillStyle = "#fad884";
        ctx.font = "40px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("✦", W / 2, 190);

        // Nom de marque
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 58px serif";
        ctx.fillText("CLIXA INSTITUTE", W / 2, 265);

        // Devise
        ctx.fillStyle = "#c9a24c";
        ctx.font = "24px serif";
        ctx.fillText("Le leadership commence par un clic.", W / 2, 320);

        // Bouton / Badge CTA
        ctx.fillStyle = "rgba(201, 162, 76, 0.2)";
        ctx.strokeStyle = "#c9a24c";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(W / 2 - 270, 370, 540, 60, 30);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 20px sans-serif";
        ctx.fillText("REJOIGNEZ LA PROCHAINE COHORTE", W / 2, 407);

        // Site web & hubs
        ctx.fillStyle = "#fad884";
        ctx.font = "bold 22px monospace";
        ctx.fillText("WWW.CLIXA.AFRICA", W / 2, 480);

        ctx.fillStyle = "rgba(243, 239, 228, 0.7)";
        ctx.font = "14px monospace";
        ctx.fillText("AGADIR · ABIDJAN · DAKAR · EN DIRECT EN CLASSE VIRTUELLE", W / 2, 525);

        ctx.globalAlpha = 1;
      }

      // Temporisation frame par frame
      await new Promise(r => setTimeout(r, 1000 / FPS));
    }

    // Arrêt de l'enregistrement et extraction du blob vidéo
    recorder.stop();
    await new Promise(r => (recorder.onstop = r));

    const blob = new Blob(chunks, { type: mime });
    const reader = new FileReader();
    const videoBase64 = await new Promise(resolve => {
      reader.onloadend = () => resolve(reader.result.split(",")[1]);
      reader.readAsDataURL(blob);
    });

    return { videoBase64, posterDataUrl, mime };
  }, { vidDafExtraitB64, vidDafTemoignageB64, imgSeminaireB64, imgCertificatB64 });

  console.log("🎥 Rendu vidéo terminé avec succès. Enregistrement des fichiers...");

  // Écriture du fichier MP4 / WebM dans public/videos
  const extension = resultat.mime.includes("mp4") ? "mp4" : "webm";
  const cheminVideo = resolve(DOSSIER_SORTIE, `trailer_clixa_officiel.${extension}`);
  await writeFile(cheminVideo, Buffer.from(resultat.videoBase64, "base64"));
  console.log(`✅ Vidéo enregistrée : ${cheminVideo}`);

  // Écriture du poster de prévisualisation
  if (resultat.posterDataUrl) {
    const posterB64 = resultat.posterDataUrl.split(",")[1];
    const cheminPoster = resolve(DOSSIER_SORTIE, "trailer_clixa_officiel_poster.jpg");
    await writeFile(cheminPoster, Buffer.from(posterB64, "base64"));
    console.log(`✅ Poster enregistré : ${cheminPoster}`);
  }

  await browser.close();
  console.log("🎉 Génération du Trailer Officiel CLIXA finalisée avec succès !");
}

genererTrailer().catch((err) => {
  console.error("❌ Erreur lors de la génération :", err);
  process.exit(1);
});
