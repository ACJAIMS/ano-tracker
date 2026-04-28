# ANO Projektni Tracker — Deployment na Vercel

## Struktura projekta
```
ano-tracker/
├── index.html
├── package.json
├── vite.config.js
├── src/
│   ├── main.jsx        ← entry point
│   └── App.jsx         ← cijela aplikacija (tracker)
└── README.md
```

---

## Korak 1 — Pohrana: Supabase (besplatno, podaci dostupni svima)

### Zašto Supabase?
`window.storage` koji koristimo radi samo unutar Claude.ai.
Na Vercelu treba pravi backend. Supabase je besplatan za ovakve projekte.

### Postavljanje Supabase:
1. Idite na https://supabase.com → "Start your project" → prijavite se s GitHubom
2. Napravite novi projekt (npr. "ano-tracker"), odaberite EU regiju
3. U lijevom izborniku kliknite **SQL Editor**
4. Zalijepite i pokrenite:

```sql
CREATE TABLE tracker_state (
  id TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Dozvoli čitanje i pisanje bez autentifikacije (interni alat)
ALTER TABLE tracker_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON tracker_state FOR ALL USING (true) WITH CHECK (true);
```

5. Idite na **Settings → API**
6. Kopirajte:
   - **Project URL** (npr. `https://abcdefgh.supabase.co`)
   - **anon public key** (dugi JWT token)

---

## Korak 2 — Zamjena window.storage u App.jsx

Otvorite `src/App.jsx` i napravite ove dvije zamjene (možete i u Claude Code):

### 2a. Na vrhu datoteke, odmah nakon prvog `import`, dodajte:
```js
import { createClient } from '@supabase/supabase-js'
const _sb = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
const _storage = {
  get: async (key) => {
    const { data } = await _sb.from('tracker_state').select('value').eq('id', key).maybeSingle()
    return data ? { value: data.value } : null
  },
  set: async (key, value) => {
    const { error } = await _sb.from('tracker_state')
      .upsert({ id: key, value, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    if (error) throw error
    return { key, value }
  }
}
```

### 2b. Zamijenite SVE instance `window.storage` s `_storage`:
U VS Code: Ctrl+H (Find & Replace)
- Traži: `window.storage`
- Zamijeni s: `_storage`
- Kliknite "Replace All" (trebalo bi ih biti 3-4)

---

## Korak 3 — .env.local datoteka (NE commitajte u Git!)

Napravite datoteku `.env.local` u root folderu:
```
VITE_SUPABASE_URL=https://vaš-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=vaš-anon-key
```

Dodajte u `.gitignore`:
```
.env.local
```

---

## Korak 4 — Testiranje lokalno

```bash
npm install
npm run dev
```

Otvorite http://localhost:5173 — tracker bi trebao raditi s Supabase pohranom.

---

## Korak 5 — Deploy na Vercel

### Opcija A — GitHub (preporučeno):
1. Pushajte projekt na GitHub (bez `.env.local`!)
2. Idite na https://vercel.com → "New Project" → importirajte repo
3. U **Environment Variables** dodajte:
   - `VITE_SUPABASE_URL` = vaš URL
   - `VITE_SUPABASE_ANON_KEY` = vaš key
4. Kliknite Deploy → za ~2 minute imate URL

### Opcija B — Vercel CLI:
```bash
npm install -g vercel
vercel
# Slijedite upute, postavite env varijable kad pita
```

---

## Migracija podataka iz Claude.ai

Ako imate podatke u Claude pohrani koje želite prebaciti:
1. Otvorite tracker u Claude.ai
2. F12 → Console → zalijepite:
```js
window.storage.get("ano-projekti-2026").then(r => console.log(r?.value))
```
3. Kopirajte ispis (JSON string)
4. U Supabase SQL editoru:
```sql
INSERT INTO tracker_state (id, value) 
VALUES ('ano-projekti-2026', 'ZALIJEPITE_JSON_OVDJE');
```

---

## Gotovo!
Vaš tracker je dostupan na personalnom Vercel URL-u (npr. `ano-tracker.vercel.app`)
i svi u timu koji imaju link mogu pristupiti i mijenjati podatke u realnom vremenu.
