# CuePoint - activer le login Google + les 3 comptes admin

> 5 minutes, 3 actions, zero reflexion. Tout est pre-rempli avec TES vraies valeurs.
> Je (Claude) ne peux pas faire ces 3 actions a ta place : elles demandent TES mots de passe
> Supabase / Google. C'est une limite de securite que je ne franchis pas. Mais c'est tout
> pre-mache ci-dessous.

Projet Supabase : `freqbcfsmqvjdiofdmlb`

---

## ACTION 1 - Creer les tables + promouvoir tes 3 comptes admin (2 min)

Sans ca, meme un login reussi plante (pas de table `profiles`).

1. Ouvre : https://supabase.com/dashboard/project/freqbcfsmqvjdiofdmlb/sql/new
2. Ouvre le fichier `schema.sql` (a la racine du projet), **selectionne tout** (Ctrl+A), **copie** (Ctrl+C).
3. **Colle** dans l'editeur SQL Supabase, clique **RUN** (en bas a droite).
4. C'est idempotent (rejouable sans risque). Ca cree toutes les tables ET met
   `is_admin = true` + credits illimites sur :
   - admin1@example.com
   - admin2@example.com
   - admin@example.com

> Note : les 3 comptes seront admin meme s'ils se connectent APRES (trigger auto). Donc l'ordre
> n'a pas d'importance.

---

## ACTION 2 - Autoriser le retour OAuth cote Supabase (1 min)

1. Ouvre : https://supabase.com/dashboard/project/freqbcfsmqvjdiofdmlb/auth/url-configuration
2. **Site URL** : colle
   ```
   http://localhost:4173
   ```
3. **Redirect URLs** -> "Add URL", ajoute ces deux lignes (une par une) :
   ```
   http://localhost:4173
   http://localhost:5173
   ```
4. **Save**.

> (Quand on deploiera sur Vercel, on ajoutera l'URL de prod ici aussi.)

---

## ACTION 3 - Autoriser le callback cote Google (1 min)

1. Ouvre : https://console.cloud.google.com/apis/credentials
   (choisis le projet Google lie a CuePoint)
2. Clique ton **OAuth 2.0 Client ID** (type "Web application").
3. **Authorized redirect URIs** -> verifie que CETTE ligne exacte est presente (ajoute-la sinon) :
   ```
   https://freqbcfsmqvjdiofdmlb.supabase.co/auth/v1/callback
   ```
4. Si l'ecran de consentement (OAuth consent screen) est en mode **"Testing"** :
   ajoute tes 3 emails dans **Test users**. (Ou passe-le en "Production".)
5. **Save**.

---

## TEST FINAL

1. Va sur http://localhost:4173/  (hard refresh Ctrl+Shift+R)
2. Clique **Continue with Google** -> tu dois arriver sur l'ecran Google, puis revenir connecte.
3. Une fois connecte avec un des 3 emails admin -> un onglet **ADMIN** apparait dans la nav.

Si ca bloque encore : dis-le moi, je debugge avec toi (je peux lire les erreurs).
