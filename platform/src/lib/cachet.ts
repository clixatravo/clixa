/**
 * Les marques apposées sur le certificat : le cachet, puis la signature.
 *
 * ── Le cachet officiel de CLIXA SARLAU, tel qu'il est apposé à l'encre ──────
 *
 * ── D'où il vient ───────────────────────────────────────────────────────────
 * Extrait du certificat que la direction a délivré à la main (référence
 * CLIXA-DAF0626-2026-066) : c'est le tampon réel de la société, avec son
 * adresse, son téléphone et son ICE. Il a été détouré sur son disque — les
 * traits de signature qui le débordaient ont été retirés — puis réduit et
 * postérisé, de 111 à 10 Ko, sans que le texte cesse d'être lisible.
 *
 * ⚠️ Un trait de la signature manuscrite traverse encore le tampon à
 * l'intérieur du disque : il était mêlé à l'encre sur le document d'origine, et
 * l'effacer demanderait de repeindre par-dessus le texte du cachet. Pour un
 * cachet parfaitement net, il faudrait une empreinte scannée seule.
 *
 * ── Pourquoi en dur, et pas dans `public/` ──────────────────────────────────
 * ⚠️ `lib/og.tsx` porte la leçon en toutes lettres : un fichier lu sur le
 * disque avec `process.cwd()` marche sur le poste de travail et **se tait en
 * production** — le répertoire courant d'une fonction déployée n'est pas celui
 * du dépôt. Les polices s'en sortent en passant par une requête HTTP ; un
 * certificat, lui, ne doit dépendre d'aucun réseau au moment où quelqu'un le
 * télécharge. Quatorze kilo-octets dans un module serveur coûtent moins qu'un
 * document qui sort sans cachet, un jour, sans que rien ne le signale.
 */
export const CACHET_CLIXA =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQQAAAD6CAYAAABH5znXAAArCElEQVR42u1d63nruA5USSrBpb" +
  "AUlcASVApKcQnuYPfYEskB+BAp6+ngB75798RJnEQc4jGY6f77779OQ0ND4x36S9DQ0FBA0NDQUEDQ0NBQQNDQ0FBA0NDQUE" +
  "DQ0NBQQNDQ0FBA0NDQUEDQ0NBQQNDQ0FBA0NDQUEDQ0NBQQNDQ0FBA0NDQUEDQ0NBQQNDQ0FBA0NDQUEDQ0NBQQNDQ0FBA0N" +
  "DQUEDQ0NBQQNDQ0FBA0NDQUEDQ0NBQQNDQ0FBA0NDQUEDQ0NBQQNDQ0FBA0NDQ0FBA0NDQUEDQ0NBQQNDQ0FBA0NDQUEDQ0N" +
  "BQQNDQ0FBA0NDQUEDQ0NBQQNDQ0FBA0NDQUEDQ0NBQQNDQ0FBA0NDQUEDQ0NBQQNDQ0FBA0Ng5ejM+3mEMPYwl9rH53x62Nu" +
  "j50N+pAoLGheN9oOcYPmFo6Hn85+L9MR7jv38f3/8+hS2Hdd9jDhvHBzj076KAoHFAuAPnQWA62NS7Aw2HH/+NhTzoRh7653" +
  "//MoEp3v9/AgIWAiTC1zEBOFxGQfTUv50CgsbGIDDd6PIQhwM4H144zP+CVsTrxYPE/099jgMOCRTz+xneQVO8QaKzChIKCB" +
  "pNINBZVwZMWYA4/FQ8xGdEDmAQoKzLHj4goT0JBQSNxWwAanQGAv6Qva4BAE1g8ZLZxBsgyMUwxZRBaImhgKDZQMgGQhZwUg" +
  "bAbviDsokPMISfm/4BxvAvPhmE9iEUEP5Ug9Da0BvATOCMlP8NQgYakghMh2UQhI1Mn1F8AEKBQQHhZ5uErHN/cj+AHBD047" +
  "+gT3T9/N+GFt/Xlv2MGBzYpGPKHubyQp8nBYTfAQKiTdJyen33Nd7v4c1F6PrxAwJT2fKcY85cqBJMKsBjbXnBMwcPpAoMCg" +
  "j3ineaO/cINi8J8BZd+zXfn/8Bg44faBK3denzp4xiApT3e6nKALYCB3oSKTAoINwiK3g3xVxWsENJ8D58joS0FhTe7y0FCP" +
  "XZxVReuFgChE+fIvQGVgMkLynCSFOBQQHhguXB0zcLXVaw9jYsveZ9sLr5dv40AWldhtDPt/unb2DqexoTmARm5KfkeP+8he" +
  "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" +
  "CC";

/**
 * La signature du Directeur Général, telle qu'elle est tracée à la main.
 *
 * ── D'où elle vient ─────────────────────────────────────────────────────────
 * Du modèle de diplôme transmis par la direction (`modèle de diplome.ods`),
 * où elle vit déjà détourée. Détourée à nouveau ici — le blanc du papier
 * rendu transparent, l'encre gardée avec sa densité — puis réduite à douze
 * kilo-octets.
 *
 * ⚠️ **Elle ne paraît qu'à une seule place**, sous « Directeur Général ». Le
 * certificat d'origine posait la *même* image sous les deux rôles :
 * « Responsable pédagogique » et « Directeur Général » portaient le même
 * tracé. C'est vraisemblablement un copier-coller de mise en page, mais le
 * reproduire ferait signer deux fonctions différentes par la même main. La
 * case du responsable pédagogique reste donc une ligne vide, comme elle
 * l'était déjà faute de savoir qui encadre les douze parcours.
 *
 * ⚠️ Elle est apposée automatiquement sur **chaque** certificat émis. C'est
 * l'usage courant pour un diplôme, et c'est une décision de la direction du
 * 3 septembre 2026 — pas un effet de bord.
 */
export const SIGNATURE_DIRECTEUR =
  "data:image/png;base64,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" +
  "J6zwP3YnCPcDtlxDRoqy0Wvln06yuJLYfIfZL3yF1quyOomJWyt4teyvS0/d60y450Wv/kPcnPu4FtEbFvS4Pvb1XLOztvzG" +
  "rYthjQjczFuKSGiByKieTnUdTKveP2ltzDt8UFRS9DEfwhU/8c0YuyRa/697eJrc6N+WM+9MYtuPMW2M1T9K9J02+cjKebjV" +
  "X3wyzlv9wnsoTzdLmyfc1Kpw1FJ/PVqscK+thJccGCuGq2dQ6RQ/np+nTJ35pGPmVbnOceI4Sz3KY+47jMmblvT8wsTPR9i6" +
  "2u1kQfygj362w7lLX9sDaTCRvP2NrZtLtB8urR1fR3z7r3bEfa9iYOUv9dnNrpXQ9F67kFa2dUw29f3bpaEIdIoOzJcNO62c" +
  "RU/e2TNK2gYb/QI/eDWW3Paa/Zu1xHuDU+Jqi4/eFKZZ7Pd0KW9hIg02poy12G5zRYLXXNmyP4TNG3b6g+SvQqM32m7ME0fV" +
  "ubXGxcSyhKO170PoELK3uQNp+dKnd41RApk2Jt5r3JkSzgLSl76x5T+aR46MO//2z+RNF7WtYCor+rJVZ5M8aLDX+D6LWJuq" +
  "PdUYHZ9M5ypK9JPiWil0dE9HI2hSlwDuam4ruzaNmEW9m2r1UVCV/k8LhK54sSOMuXjbfKPTItF2HAM9P1g+SnFaPjDTcu+V" +
  "OjypXhV9WpUXz8weHU1jbli5bFog7oNtEP0bzyHQuLRdq9DvXBR1rmGm9F/UNGKhci+pzz+u6prTY3BL1yFla7e5g9Uo+xqQ" +
  "jOx0qWQAxfVDlbTNOdeVXtwZNdGIcM4M2SNxvQmsxx2c3R0zMDUq8C95jm0hqcZSHeuaJX4bT43aJX3iE5OhTRJ8zu18u2Oa" +
  "t43Pz5ayvqTxd9egW+HmWf9CUTKn2f+gGyF+EovUlYi0r/OXw6kt8gzcNTp8l97nvuFTtT+ReLXkonYp4dMw7z7m+4X/nP5r" +
  "XnGDWWFQoJ3g0y315Rf6LoNw3P2Z72Om+ue+O2rPWkjHzlRg+cyedLvr1naF3VP9SBUby6LA0fDgASN1JeKvrVz+cO0SsZ/3" +
  "2593H9FxrDriKzXb4exSeL3lu96ZydVGa0oD56rvOZq1bDLWtE518UFvUSFw2Qae8bP8EPotc/5GwZS3zrs29mRihLuCiY3b" +
  "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";
/**
 * Le sigle de la maison, tel qu'il est imprimé sur le certificat manuel.
 *
 * ── Pourquoi une image, et non du texte ─────────────────────────────────────
 * Il était composé en Times-Bold, avec un point doré posé à côté : de loin cela
 * ressemblait au sigle, de près c'était une autre lettre. Le vrai dessin a ses
 * empattements, ses proportions et son point à lui, et un certificat est
 * justement le document qu'on regarde de près — on l'encadre, on le montre, on
 * le fait vérifier.
 *
 * Extrait du modèle de la direction, détouré au pixel près de son fond
 * transparent, réduit à 234 px de large et postérisé : un kilo-octet.
 */
export const LOGO_CLIXA =
  "data:image/png;base64,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";
/**
 * La marque SkillAfrique, « By CLIXA Institute ».
 *
 * Elle était elle aussi composée au texte — « SKILL » en noir, « AFRIQUE » en
 * orange — ce qui perdait la flèche qui traverse le A, seul élément dessiné du
 * logo, et donc la seule chose qui le rende reconnaissable.
 *
 * ⚠️ La mention « By CLIXA Institute » fait partie de l'image : c'est ainsi
 * qu'elle est dessinée dans le modèle, alignée sur la droite du logo. La
 * réécrire en dessous en produirait deux.
 *
 * ⚠️ Son fond est blanc, pas transparent, et il doit l'être **exactement**.
 * Sorti de la réduction, il valait (254, 254, 254) : une marche d'un cran sur
 * le blanc du bloc qui le porte, invisible à la lecture du code et parfaitement
 * visible sur le rendu — un rectangle gris pâle encadrait le logo. Les pixels
 * quasi blancs sont donc ramenés à 255 avant la mise en palette.
 *
 * ⚠️ Ce qui suppose que le bloc reste blanc. Le jour où il changerait de
 * couleur, il faudrait détourer le fond plutôt que le repeindre : un logo
 * dessiné en bleu nuit sur un bloc bleu nuit disparaîtrait.
 */
export const LOGO_SKILLAFRIQUE =
  "data:image/png;base64,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" +
  "5CYII=";
