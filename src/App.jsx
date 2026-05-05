import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from '@supabase/supabase-js'
const _sb = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

const _storage = {
  async migrateIfNeeded() {
    const { data: existing } = await _sb.from('projects').select('id').limit(1)
    if (existing?.length > 0) return // Already migrated

    const { data: oldData } = await _sb.from('tracker_state').select('value').eq('id', 'ano-projekti-2026-v2').maybeSingle()
    if (!oldData?.value) return

    const parsed = JSON.parse(oldData.value)
    const projects = parsed.projects || parsed
    console.log(`Migrating ${projects.length} projects from old format...`)

    for (const p of projects) {
      await this.saveProject(p)
      if (p.faze?.length) {
        await this.saveFaze(p.id, p.faze.map((f, i) => ({ ...f, id: `${p.id}_faze_${f.id}` })))
      }
    }
    console.log("Migration complete!")
  },

  async loadProjects() {
    // Check if migration is needed
    await this.migrateIfNeeded()

    const { data: projects, error: pErr } = await _sb
      .from('projects')
      .select('*')
      .is('deleted_at', null)
    if (pErr) throw pErr

    const { data: faze, error: fErr } = await _sb
      .from('project_faze')
      .select('*')
    if (fErr) throw fErr

    const fazeMap = {}
    ;(faze || []).forEach(f => {
      if (!fazeMap[f.project_id]) fazeMap[f.project_id] = []
      const pid = f.id.replace('_faze_', '_')
      fazeMap[f.project_id].push({ id: parseInt(f.id.split('_faze_')[1]) || f.id, naziv: f.naziv, status: f.status })
    })

    return (projects || []).map(p => ({
      id: p.id,
      code: p.code,
      name: p.name,
      category: p.category || '',
      categoryColor: p.category_color || '#00A3E0',
      svrha: p.svrha || '',
      cilj: p.cilj || '',
      tim: p.tim || [],
      start: p.start_date || '—',
      end: p.end_date || '—',
      trajanje: p.trajanje || '—',
      napomene: p.napomene || '',
      ukupniStatus: p.ukupni_status || 'nije_zapoceto',
      naPotezu: p.na_potezu || null,
      linkovi: p.linkovi || [],
      faze: fazeMap[p.id] || []
    }))
  },

  async saveProject(project) {
    const { error } = await _sb.from('projects').upsert({
      id: project.id,
      code: project.code,
      name: project.name,
      category: project.category,
      category_color: project.categoryColor,
      svrha: project.svrha,
      cilj: project.cilj,
      tim: project.tim,
      start_date: project.start,
      end_date: project.end,
      trajanje: project.trajanje,
      napomene: project.napomene,
      ukupni_status: project.ukupniStatus,
      na_potezu: project.naPotezu,
      linkovi: project.linkovi,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' })
    if (error) throw error
  },

  async saveFaze(projectId, faze) {
    await _sb.from('project_faze').delete().eq('project_id', projectId)
    if (faze.length === 0) return
    const toInsert = faze.map((f, idx) => ({
      id: `${projectId}_faze_${f.id}`,
      project_id: projectId,
      naziv: f.naziv,
      status: f.status || 'nije_zapoceto',
      sort_order: idx
    }))
    const { error } = await _sb.from('project_faze').upsert(toInsert, { onConflict: 'id' })
    if (error) throw error
  },

  async deleteProject(projectId) {
    await _sb.from('projects').update({ deleted_at: new Date().toISOString() }).eq('id', projectId)
  }
}

const ANO = {
  navy: "#003087", blue: "#0055A5", lightBlue: "#E8F2FF",
  accent: "#00A3E0", dark: "#00235B", text: "#1A1A2E",
  muted: "#6B7A99", border: "#D0DFF5", bg: "#F5F8FF", white: "#FFFFFF",
};

const CATEGORY_COLORS = [
  { label: "Plava",      value: ANO.accent  },
  { label: "Zelena",     value: "#1E7C4D"   },
  { label: "Narančasta", value: "#D4870A"   },
  { label: "Ljubičasta", value: "#7B3FA0"   },
  { label: "Crvena",     value: "#C0392B"   },
  { label: "Tamnoplava", value: ANO.navy    },
];

const ALL_PROJECTS = [
  // ── Skupina I: Automatizacija i integracija ──────────────────────────────
  {
    id: 1, code: "I.1", name: "ANTARES – Robotiq",
    category: "Automatizacija", categoryColor: ANO.accent,
    svrha: "Automatizacija procesa osiguranja za vozila radi smanjenja ručnog rada. Izrada jedinstvenog rješenja za automatizaciju brokerskog procesa osiguranja vozila kao diferencijacija na tržištu.",
    cilj: "Implementacija AI modela za obradu podataka i automatizaciju procesa osiguranja vozila",
    tim: ["Luka", "Pero", "Anka", "Rusmir"],
    start: "2026-02", end: "2026-06", trajanje: "4 mj.",
    faze: [
      { id: 1, naziv: "Analiza poslovnih potreba i definiranje zahtjeva (identifikacija aktivnosti za automatizaciju, standardizacija emailova i dokumenata)", status: "nije_zapoceto" },
      { id: 2, naziv: "Definiranje arhitekture sustava – integracija s ANO Fidelis", status: "nije_zapoceto" },
      { id: 3, naziv: "Razvoj AI modela za prepoznavanje ključnih podataka iz dokumenata i automatsku validaciju", status: "nije_zapoceto" },
      { id: 4, naziv: "Integracija s osiguranjem i klijentima", status: "nije_zapoceto" },
      { id: 5, naziv: "Testiranje i optimizacija – pilot testiranje", status: "nije_zapoceto" },
      { id: 6, naziv: "Edukacija korisnika AI modela i produkcija", status: "nije_zapoceto" },
    ],
    napomene: "", ukupniStatus: "nije_zapoceto", postotak: 0,
  },
  {
    id: 6, code: "I.2", name: "API integracija Wiener–Fidelis",
    category: "Integracija", categoryColor: ANO.navy,
    svrha: "Automatizacija procesa razmjene podataka između Wienera kao novog osiguratelja ZGH i portala Moj ANO.",
    cilj: "Osigurati svakodnevno ažuriranje podataka o statusima šteta na portalu Moj ANO.",
    tim: ["Pero", "Anka"],
    start: "2026-03", end: "2026-04", trajanje: "1 mj.",
    faze: [
      { id: 1, naziv: "Pokretanje i usuglašavanje zahtjeva – potvrda cilja, odgovornosti, opsega integracije, popisa podataka koji se razmjenjuju i dinamike ažuriranja statusa šteta", status: "nije_zapoceto" },
      { id: 2, naziv: "Analiza postojećih sustava i tehničkih preduvjeta", status: "nije_zapoceto" },
      { id: 3, naziv: "Definiranje modela integracije i mapiranje podataka", status: "nije_zapoceto" },
      { id: 4, naziv: "Razvoj i konfiguracija integracije", status: "nije_zapoceto" },
      { id: 5, naziv: "Testiranje i usklađivanje", status: "nije_zapoceto" },
      { id: 6, naziv: "Puštanje u rad i završna primopredaja", status: "nije_zapoceto" },
    ],
    napomene: "", ukupniStatus: "nije_zapoceto", postotak: 0,
  },
  {
    id: 2, code: "I.3", name: "AI integracija dashboarda s Fidelisom",
    category: "Digitalizacija", categoryColor: "#7B3FA0",
    svrha: "Operativno praćenje polica, komunikacije s klijentima i suradnje s osigurateljima objediniti kroz jedan alat umjesto e-mailova i Excel tablica. Integracija portala InsureDash s Fidelisom kao jedinim izvorom podataka.",
    cilj: "Integrirati InsureDash s Fidelisom kao jedinstvenom bazom podataka o policama i omogućiti digitalni tijek obrade predmeta uz automatsko napredovanje faza.",
    tim: ["Ivan", "Pero", "Anka", "Matija"],
    start: "2026-03", end: "2026-09", trajanje: "6 mj.",
    faze: [
      { id: 1, naziv: "Discovery i analiza Fidelisa – potvrda tehničkog modela integracije i identifikacija operativnih uskih grla", status: "nije_zapoceto" },
      { id: 2, naziv: "Dizajn integracije i specifikacija – mapiranje polja, REST API struktura, strategija sinkronizacije i sigurnosni model", status: "nije_zapoceto" },
      { id: 3, naziv: "Razvoj MVP-a – čitanje podataka iz Fidelisa, prikaz realnih podataka u portalu za agente", status: "nije_zapoceto" },
      { id: 4, naziv: "Razvoj – dvosmjerna integracija, tijek predmeta, menadžerski dashboard, integracija e-maila", status: "nije_zapoceto" },
      { id: 5, naziv: "Testiranje, pilotiranje i produkcija – korisničko testiranje, pilot na jednom timu, edukacija agenata i menadžmenta", status: "nije_zapoceto" },
    ],
    napomene: "", ukupniStatus: "nije_zapoceto", postotak: 0,
  },
  {
    id: 9, code: "I.4", name: "Automatizacija poslovnih procesa – Fidelis",
    category: "Automatizacija", categoryColor: ANO.accent,
    svrha: "Svakodnevno operativno poslovanje ANO-a oslanja se na kombinaciju Fidelisa, Excela, Outlooka i ručnog rada bez standardizacije i automatizacije. ~85% ručnog rada u procesu obnove; prosječno trajanje obrade 2–4 sata; nekontrolirani rizik propuštenih obnova; nekonzistentna komunikacija s klijentima.",
    cilj: "Automatizirati ključne operativne procese: detekcija isteka polica, priprema izvještaja, slanje i evidencija komunikacije, obrada odgovora, provjera nacrta polica, usporedba ponuda i semantic search dokumentacije. Cilj: obrada obnove 15–30 min, ručni rad < 20%, 0% propuštenih obnova.",
    tim: ["Matija", "Marija", "Anka"],
    start: "2026-04", end: "2026-12", trajanje: "8 mj.",
    faze: [
      { id: 1, naziv: "FAZA 1 ✓ – Analiza AS-IS procesa, izrada probnog uzorka i prezentacija rješenja; dogovor oko nastavka i opsega implementacije", status: "zavrseno" },
      { id: 2, naziv: "FAZA 2 – Definiranje TO-BE procesa i tehničke specifikacije: standardizacija koraka obnove, predlošci emailova, mapiranje integracije s Fidelisom, definiranje KPI-jeva", status: "nije_zapoceto" },
      { id: 3, naziv: "FAZA 3 – Automatizacija praćenja isteka polica: automatska detekcija polica pred istekom iz Fidelisa, generiranje liste za obradu, alertovi za referente bez ručne pretrage", status: "nije_zapoceto" },
      { id: 4, naziv: "FAZA 4 – Automatizacija komunikacije: standardizirani predlošci emailova, automatsko slanje upita klijentima i osiguravateljima, evidencija komunikacije u Fidelisu (100% pokrivenost)", status: "nije_zapoceto" },
      { id: 5, naziv: "FAZA 5 – Automatizacija izvještaja i provjera polica: zamjena ručnog Excel procesa automatski generiranim izvještajima u standardiziranom formatu; automatska provjera nacrta polica (premija, datumi, usporedba)", status: "nije_zapoceto" },
      { id: 6, naziv: "FAZA 6 – Semantic search dokumentacije: pretraživanje polica, dopisa i dokumentacije po sadržaju; integracija s Fidelisom kao izvorom podataka", status: "nije_zapoceto" },
      { id: 7, naziv: "FAZA 7 – Testiranje, edukacija i produkcija: pilot s jednim timom, mjerenje KPI-jeva (trajanje obrade, udio ručnog rada, propuštene obnove), edukacija studenata i referenata, puštanje u produkciju", status: "nije_zapoceto" },
    ],
    napomene: "AS-IS problemi: traženje polica pred istekom (Fidelis ručno) · priprema Excel izvještaja (različiti formati po klijentu) · slanje emaila (Outlook ručno, nema evidencije) · obrada klijentovog odgovora (Excel+Fidelis ručno) · provjera nacrta polica (PDF+Excel ručna usporedba) · unos polica (Fidelis ručno) · usporedba ponuda (Excel/Word ručno). TO-BE ciljevi: obrada 15-30 min · ručni rad <20% · 0% propuštenih obnova · 100% evidencija komunikacije · standardizirani predlošci · semantic search.", ukupniStatus: "u_tijeku", postotak: 0,
  },
  // ── Skupina II: Prodaja ──────────────────────────────────────────────────
  {
    id: 3, code: "II.1", name: "\"Semafor\" i ANO Matrix u prodaji",
    category: "Prodaja", categoryColor: "#C0392B",
    svrha: "Uvođenje standardiziranog modela procjene i prezentacije rizika u prodajne aktivnosti ANO-a. Tri strateška smjera: prodajne aktivnosti postojećim klijentima, \"kamen u cipeli\" i cross selling.",
    cilj: "Razviti i implementirati standardizirani model procjene i vizualizacije rizika u prodajnim aktivnostima ANO-a.",
    tim: ["Anka"],
    start: "2025-11", end: "2026-05", trajanje: "4 mj.",
    faze: [
      { id: 1, naziv: "Definicija metodologije – usuglašavanje kriterija za \"semafor\", logika bodovanja, pozicioniranje u ANO Matrix", status: "nije_zapoceto" },
      { id: 2, naziv: "Mapiranje prodajnog procesa – točka u prodajnom ciklusu, način unosa podataka i prezentacije rezultata klijentu", status: "nije_zapoceto" },
      { id: 3, naziv: "Priprema sadržaja i alata – prioritetne djelatnosti, upitnici/kalkulatori, predložak risk profila, odobrenje marketinga", status: "nije_zapoceto" },
      { id: 4, naziv: "Pilot implementacija – testiranje na odabranom uzorku klijenata, prikupljanje povratnih informacija od prodaje", status: "nije_zapoceto" },
      { id: 5, naziv: "Dorada modela – prilagodba kriterija, prikaza i preporuka na temelju rezultata pilota", status: "nije_zapoceto" },
      { id: 6, naziv: "Uvođenje u redovne prodajne aktivnosti – upute za korištenje, KPI-jevi, model praćenja primjene", status: "nije_zapoceto" },
    ],
    napomene: "", ukupniStatus: "nije_zapoceto", postotak: 0,
  },
  {
    id: 7, code: "II.2", name: "Risk konzola osigurateljnog brokera",
    category: "Prodaja", categoryColor: "#C0392B",
    svrha: "Broker koji primijeti razliku između ugovorene police i stvarnog stanja rizika prije štete postaje nezamjenjiv. Konzola kontinuirano prati promjene parametara klijenta (prihodi, imovina, zaposlenici, flota) i automatski generira alertove za reviziju pokrića – umjesto godišnjeg pregleda koji se zaboravi.",
    cilj: "Implementirati Risk konzolu kao alat za proaktivno praćenje portfelja klijenata: automatski alertovi za podosiguranje, cross-sell prilike i zaštita brokera od profesionalnih rizika.",
    tim: ["Anka", "Matija"],
    start: "2026-05", end: "2026-12", trajanje: "7 mj.",
    faze: [
      { id: 1, naziv: "Definiranje opsega i prioritetnih kategorija – odabir 3–4 ključne kategorije osiguranja za MVP (property, odgovornost, zaposlenici, fleet) i definiranje parametara praćenja po svakoj kategoriji", status: "nije_zapoceto" },
      { id: 2, naziv: "Mapiranje izvora podataka – definiranje što se preuzima automatski (FINA, DZS indeksi, Fidelis), što unosi broker, a što klijent kroz portal; format i učestalost ažuriranja", status: "nije_zapoceto" },
      { id: 3, naziv: "Dizajn alert logike i pravila okidanja – pragovi za upozorenja (npr. indeks građevinskih troškova +15%, prihodi +30%), klasifikacija alertova na hitne / preporučene revizije / OK", status: "nije_zapoceto" },
      { id: 4, naziv: "Razvoj MVP dashboarda – prikaz portfelja po klijentu, alert feed, profil rizika klijenta; integracija s Fidelisom kao izvorom podataka o policama", status: "nije_zapoceto" },
      { id: 5, naziv: "Razvoj klijentskog portala – klijent može prijaviti promjenu (nova imovina, promjena prihoda, novi zaposlenici); konzola automatski mapira na relevantne police i kreira zadatak za brokera", status: "nije_zapoceto" },
      { id: 6, naziv: "Pilot s odabranim klijentima – testiranje alert logike u praksi, kalibracija pragova, prikupljanje povratnih informacija od brokera i klijenata", status: "nije_zapoceto" },
      { id: 7, naziv: "Produkcija i edukacija – uvođenje u redovni rad, upute za brokere, KPI-jevi praćenja (% klijenata s aktivnim alertovima, broj generiranih revizija, cross-sell prilike)", status: "nije_zapoceto" },
    ],
    napomene: "", ukupniStatus: "nije_zapoceto", postotak: 0,
  },
  {
    id: 8, code: "II.3", name: "Broker platforma – digitalni proces preuzimanja rizika",
    category: "Prodaja", categoryColor: "#C0392B",
    svrha: "Digitalizacija i automatizacija cjelokupnog procesa preuzimanja rizika – od inicijalnog upita klijenta do usporedbe ponuda i zaključenja ugovora. Projekt je sastavni dio šire ANO broker AI platforme koja obuhvaća workflow automatizaciju, AI ekstrakciju podataka, scoring klijenata i coverage gap analizu.",
    cilj: "Implementirati integrirani digitalni tok u pet koraka (T1–T5): intake obrazac → broker radni list → slanje carrieru → usporedba ponuda → ugovaranje; s punom automatizacijom prijenosa podataka između koraka i gate logikom koja eliminira greške pri preuzimanju.",
    tim: ["Anka", "Matija"],
    start: "2026-05", end: "2026-12", trajanje: "7 mj.",
    faze: [
      { id: 1, naziv: "T1 – Intake obrazac: izrada obrasca za unos podataka o stranci, osiguranom, pokrićima, aktivnostima i dokumentima; OIB validacija; gumb 'Pošalji upit' predaje podatke u sustav", status: "nije_zapoceto" },
      { id: 2, naziv: "T2 – Broker radni list: automatsko povlačenje podataka iz T1 (bez copy-paste); pet koraka s OK/Problem gatovima – validacija podataka, klasifikacija rizika s tablicom podgrupa, medicinska anketa s automatskom provjerom praga, odabir carrierea s vidljivim ograničenjima, carrier check po osiguratelju", status: "nije_zapoceto" },
      { id: 3, naziv: "T3 – Slanje upita carrieru: automatsko generiranje popunjenog emaila za svakog odabranog carrierea s podacima iz T1+T2; 'Kopiraj' u clipboard; 'Evidentiraj slanje' – kad su svi poslani, otvara se nastavak toka", status: "nije_zapoceto" },
      { id: 4, naziv: "T4/T5 – Usporedba i ugovaranje: unos primljenih ponuda s obveznim poljem za ljestvicu invaliditeta (ABI / linearna / vlastita); broker view i client view; upozorenje na mješovite ljestvice; preporuka, potvrda ugovaranja, završni ekran s checklist-om", status: "nije_zapoceto" },
      { id: 5, naziv: "Navigacijska traka i UX: vidljiva od T2 nadalje, prikazuje završene korake i dopušta povratak na prethodne faze; gate logika blokira napredak bez obveznih unosa", status: "nije_zapoceto" },
      { id: 6, naziv: "Integracija s ANO broker AI platformom: povezivanje s modulima za AI ekstrakciju dokumenata, scoring klijenata i coverage gap analizu kao dijelovima šire platforme", status: "nije_zapoceto" },
      { id: 7, naziv: "Testiranje i pilot: end-to-end testiranje toka na stvarnim predmetima, kalibracija gate logike i validacijskih pravila, edukacija brokera", status: "nije_zapoceto" },
    ],
    napomene: "Projekt je dio šire ANO broker AI platforme (workflow automatizacija, AI ekstrakcija, scoring, coverage gap). Šira platforma: automatizacija workflow-a po fazama, alerti i podsjetnici, slanje upita i praćenje statusa, checklist i closure evidencija; AI modul: ekstrakcija i strukturiranje podataka iz dokumenata, scoring klijenata i rizika, coverage gap procjena, personalizirani outreach.", ukupniStatus: "nije_zapoceto", postotak: 0,
  },
  {
    id: 10, code: "II.4", name: "Kampanja – Odgojne ustanove",
    category: "Prodaja", categoryColor: "#C0392B",
    svrha: "Direktna kampanja prema odgojnim ustanovama u RH s ciljem prezentacije ANO-ovih usluga i prikupljanja interesa. Portal za kampanju je izgrađen — slijedi finalizacija sadržaja, pokretanje i praćenje.",
    cilj: "Pokriti sve odgojne ustanove iz baze (1.330 institucija), ostvariti visoku stopu otvaranja i prikupiti konkretne upite za suradnju.",
    tim: ["Anka"],
    start: "2026-04", end: "2026-07", trajanje: "3 mj.",
    linkovi: [{ naziv: "ANO škole – admin panel kampanje", url: "https://insuredash.ano.hr/anoskole" }],
    faze: [
      { id: 1, naziv: "Portal kampanje izgrađen — test kartice (Gymnasium Anka AIMS, OŠ Matija, SŠ Anka ANO) prošle validaciju; probno slanje funkcionira", status: "zavrseno" },
      { id: 2, naziv: "Finalizacija teksta emailova — izrada prijedloga sadržaja uvodnog emaila i pratećih poruka (follow-up); interno odobrenje teksta", status: "nije_zapoceto" },
      { id: 3, naziv: "Određivanje nositelja kampanje ispred ANO-a — tko je odgovoran za praćenje odgovora, komunikaciju s institucijama i izvješćivanje", status: "nije_zapoceto" },
      { id: 4, naziv: "Provjera i čišćenje baze institucija — validacija 1.330 kartica (točnost emailova, duplikati, neaktivne institucije); grupiranje po županijama", status: "nije_zapoceto" },
      { id: 5, naziv: "Pokretanje kampanje — masovno slanje svim institucijama; praćenje stope isporuke, bounce-eva i odjava u prvih 24h", status: "nije_zapoceto" },
      { id: 6, naziv: "Praćenje i obrada odgovora — svakodnevno praćenje otvaranja (cilj 90%+), predaje obrazaca (cilj 22%+), obrada pristiglih upita i prosljeđivanje referentima", status: "nije_zapoceto" },
      { id: 7, naziv: "Follow-up kampanja — podsjetnik institucijama koje su otvorile email ali nisu preddale obrazac; personalizirani follow-up za institucije s visokim interesom", status: "nije_zapoceto" },
      { id: 8, naziv: "Analiza i izvješće — stopa otvaranja, predaje i konverzije po županijama; popis konkretnih upita; prijedlog za nastavak ili sljedeću kampanju", status: "nije_zapoceto" },
    ],
    napomene: "", ukupniStatus: "u_tijeku", postotak: 0,
  },
  {
    id: 11, code: "II.5", name: "Prodajna aktivnost – Končar grupa",
    category: "Prodaja", categoryColor: "#C0392B",
    svrha: "Primjena ANO-ovog prodajnog pristupa temeljenog na konkretnim podacima — RISK matrica, financijska analiza po djelatnosti i grupni pregled izloženosti — kao diferencijator u pristupu klijentima grupe. Pilotom na Končar grupi dokazana je izvedivost i vrijednost pristupa.",
    cilj: "Implementirati standardizirani prodajni proces s podacima za cijeli portfelj, povećati conversion rate kroz personalizirane analize i postaviti model koji se može replicirati na ostale grupe klijenata.",
    tim: ["Matija", "Anka", "Ivan", "Pero"],
    start: "2026-04", end: "2026-10", trajanje: "6 mj.",
    linkovi: [{ naziv: "Končar – financijska analiza grupe", url: "https://insuredash.ano.hr/koncar" }],
    faze: [
      { id: 1, naziv: "FAZA 1 ✓ – Pilot: implementiran alat za RISK matricu i financijsku analizu; pripremljeni obrazaci i PPT za pristup klijentu s konkretnim podacima po tvrtkama grupe; prezentacija metodologije", status: "zavrseno" },
      { id: 2, naziv: "FAZA 2 – Validacija i dorada: pregled rezultata pilota s timom; prilagodba RISK matrice, PPT predložaka i obrasca na temelju iskustva iz prvog sastanka; odobrenje finalnog materijala", status: "nije_zapoceto" },
      { id: 3, naziv: "FAZA 3 – Prodajni susret s Končarom: dogovaranje i provođenje sastanka; prezentacija nalaza po tvrtkama grupe (prihodi, zaposlenici, premije, investicije, zemljišne knjige); identifikacija konkretnih potreba", status: "nije_zapoceto" },
      { id: 4, naziv: "FAZA 4 – Obrada odgovora i izrada ponude: prikupljanje interesa i prioriteta klijenta; izrada konkretnog prijedloga programa osiguranja za grupu; priprema usporedbe pokrića i premija", status: "nije_zapoceto" },
      { id: 5, naziv: "FAZA 5 – Definiranje ciljne liste sljedećih klijenata: selekcija 10–20 prioritetnih klijenata za replikaciju pristupa; segmentacija po djelatnosti, veličini i rizičnom profilu", status: "nije_zapoceto" },
      { id: 6, naziv: "FAZA 6 – Priprema individualiziranih materijala za sljedeće klijente: izrada prilagođenih RISK analiza i financijskih pregleda iz baze za svaki ciljni klijent", status: "nije_zapoceto" },
      { id: 7, naziv: "FAZA 7 – Rollout i standardizacija procesa: dokumentacija prodajnog procesa za repliciranje na širi portfelj; edukacija ostatka prodajnog tima; KPI-jevi praćenja (broj sastanaka, konverzija, nova pokrića)", status: "nije_zapoceto" },
    ],
    napomene: "Alat prikazuje po tvrtkama grupe: ukupni prihodi, prihod od prodaje, zaposlenici, premije evidentirane u GFI, investicije (bruto ulaganja), zemljišne knjige (uloški, površina, tereti), risk izloženost (Top fokus: Osiguranje imovine, Izloženost: Crvena).", ukupniStatus: "u_tijeku", postotak: 0,
  },
  // ── Skupina III: Standardizacija i rast ─────────────────────────────────


  {
    id: 5, code: "III.1", name: "ANO ISO Certifikacija",
    category: "ISO / Procesi", categoryColor: "#D4870A",
    svrha: "Standardizacija i optimizacija poslovnih procesa ANO d.o.o. Mapiranje procesa, definiranje budućeg stanja, implementacija promjena u Fidelisu kao preduvjet za ISO certifikaciju.",
    cilj: "90% mapiranih procesa s definiranom strukturom i dokumentacijom; Fidelis ažuriran i testiran; uprava donosi odluku o pokretanju ISO certifikacije.",
    tim: ["Anđela", "Marija", "Milena", "Ivan", "Anka"],
    start: "2026-03", end: "2026-09", trajanje: "6 mj.",
    faze: [
      { id: 5, naziv: "FAZA I – Osiguravanje tehničkih preduvjeta za share portal", status: "nije_zapoceto" },
      { id: 1, naziv: "FAZA I – Snimanje i mapiranje procesa (3 tjedna): mapiranje po vrstama osiguranja, anketiranje zaposlenika, izrada u Visio, prezentacija upravi", status: "nije_zapoceto" },
      { id: 2, naziv: "FAZA II – Pripremne aktivnosti (4 tjedna): definiranje prijedloga za doradom, struktura optimalnih procesa, prijedlog aplikativnih promjena, predlošci mail-ova i obrazaca", status: "nije_zapoceto" },
      { id: 3, naziv: "FAZA III – Aplikativne promjene u Fidelisu: plan promjena, izrada i testiranje u Fidelisu, korisničke upute i edukacija zaposlenika", status: "nije_zapoceto" },
      { id: 4, naziv: "FAZA IV – Praćenje funkcioniranja promjena u praksi (4 tjedna): praćenje efekata, funkcioniranja aplikacije i novih obrazaca/predložaka", status: "nije_zapoceto" },
    ],
    napomene: "", ukupniStatus: "nije_zapoceto", postotak: 0,
  },
  {
    id: 4, code: "III.2", name: "ANO Agencija",
    category: "Osnivanje", categoryColor: "#1E7C4D",
    svrha: "Dopuniti postojeće brokerske usluge, povećati tržišni doseg i omogućiti pružanje šireg spektra usluga klijentima.",
    cilj: "Registracija ANO agencije d.o.o.",
    tim: ["Anđela", "Marija", "Milena", "Ivan"],
    start: "2026-04", end: "2027-01", trajanje: "9 mj.",
    faze: [
      { id: 1, naziv: "Pravna pitanja – d.o.o., račun, dokumentacija, financijska ulaganja i očekivani efekti", status: "nije_zapoceto" },
      { id: 2, naziv: "Osigurati sukladnost s propisima HANFA-e i drugim nadležnim tijelima", status: "nije_zapoceto" },
      { id: 3, naziv: "Razrada poslovnog modela – za što će biti specijalizirana agencija", status: "nije_zapoceto" },
      { id: 4, naziv: "Definiranje odnosa s ANO brokerom i sinergijski efekti – razmjena podataka, uvjeti poslovanja", status: "nije_zapoceto" },
      { id: 5, naziv: "Uspostava operativnih procesa (zapošljavanje, informatička struktura, prostor ili digitalno)", status: "nije_zapoceto" },
      { id: 6, naziv: "Strategija nastupa na tržištu – web stranica, oglašavanje, prodajne aktivnosti i komunikacija s klijentima", status: "nije_zapoceto" },
    ],
    napomene: "", ukupniStatus: "nije_zapoceto", postotak: 0,
  },
];

const CANONICAL_IDS = new Set(ALL_PROJECTS.map(p => String(p.id)));

const statusConfig = {
  nije_zapoceto: { label: "Nije započeto", color: ANO.muted,  bg: "#EFF3FF", dot: ANO.muted },
  u_tijeku:      { label: "U tijeku",      color: ANO.blue,   bg: ANO.lightBlue, dot: ANO.blue },
  zavrseno:      { label: "Završeno",      color: "#1E7C4D",  bg: "#EAFAF1", dot: "#1E7C4D" },
  na_cekanju:    { label: "Na čekanju",    color: "#B07D00",  bg: "#FFF8E1", dot: "#B07D00" },
  kasni:         { label: "Kasni",         color: "#C0392B",  bg: "#FEF0EE", dot: "#C0392B" },
};

const initials = (n) => (n || "?").slice(0, 2).toUpperCase();
const strToColor = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h); return `hsl(${Math.abs(h) % 360},50%,38%)`; };
const FIXED_COLORS = { Luka: ANO.blue, Pero: ANO.navy, Anka: "#7B3FA0", Rusmir: "#1E7C4D", Anđela: "#C0392B", Marija: ANO.accent, Milena: "#B07D00", Ivan: "#1A6B40", Matija: "#8B5A2B" };
const avatarColor = (n) => FIXED_COLORS[n] || strToColor(n);

function mergeWithCanonical(savedProjects) {
  if (!savedProjects || !savedProjects.length) {
    return ALL_PROJECTS.map(p => ({ ...p, postotak: 0 }))
  }

  const savedMap = {}
  savedProjects.forEach(s => { savedMap[String(s.id)] = s })

  const merged = ALL_PROJECTS.map(canonical => {
    const s = savedMap[String(canonical.id)]
    if (!s) return { ...canonical, postotak: 0 }

    const done = (s.faze || []).filter(f => f.status === "zavrseno").length
    const postotak = s.faze?.length ? Math.round((done / s.faze.length) * 100) : 0

    return {
      ...canonical,
      name: s.name || canonical.name,
      code: s.code || canonical.code,
      category: s.category || canonical.category,
      categoryColor: s.categoryColor || canonical.categoryColor,
      svrha: s.svrha || canonical.svrha,
      cilj: s.cilj || canonical.cilj,
      tim: s.tim || canonical.tim,
      start: s.start || canonical.start,
      end: s.end || canonical.end,
      trajanje: s.trajanje || canonical.trajanje,
      faze: s.faze || canonical.faze,
      napomene: s.napomene || '',
      ukupniStatus: s.ukupniStatus || 'nije_zapoceto',
      postotak,
      naPotezu: s.naPotezu || null,
      linkovi: s.linkovi || [],
    }
  })

  const extras = savedProjects.filter(s => !CANONICAL_IDS.has(String(s.id)))
  return [...merged, ...extras]
}

async function loadFromStorage() {
  try {
    const projects = await _storage.loadProjects()
    return { projects, deletedIds: [] }
  } catch (err) {
    console.warn("Storage load failed:", err)
    return null
  }
}

async function saveToStorage(projects) {
  try {
    for (const p of projects) {
      await _storage.saveProject(p)
      await _storage.saveFaze(p.id, p.faze || [])
    }
  } catch (err) {
    console.error("saveToStorage failed:", err)
    throw err
  }
}

// ── DATE HELPERS (module-level — accessible from all components) ─────────────
// "YYYY-MM"    → "MM.YYYY"
// "YYYY-MM-DD" → "DD.MM.YYYY"
// "MM.YYYY"    → "MM.YYYY"  (passthrough)
function fmtDate(s) {
  if (!s || s === "—") return s || "";
  if (/^\d{1,2}\.\d{4}$/.test(s)) return s;
  if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(s)) return s;
  const parts = s.split("-");
  if (parts.length === 2) return `${parts[1]}.${parts[0]}`;
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
  return s;
}
// "MM.YYYY" or "M.YYYY" → "YYYY-MM"  (passthrough if already internal)
function parseMonthInput(s) {
  if (!s || s === "—") return s || "—";
  s = s.trim();
  const m = s.match(/^(\d{1,2})\.(\d{4})$/);
  if (m) return `${m[2]}-${m[1].padStart(2, "0")}`;
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  return s;
}
// Today as DD.MM.YYYY
function todayStr() {
  const t = new Date();
  return `${String(t.getDate()).padStart(2,"0")}.${String(t.getMonth()+1).padStart(2,"0")}.${t.getFullYear()}`;
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function Label({ children }) {
  return <div style={{ fontSize: 10, letterSpacing: 2, color: ANO.muted, textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>{children}</div>;
}
function Inp({ value, onChange, placeholder, style = {} }) {
  return <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    style={{ width: "100%", padding: "8px 10px", fontSize: 13, border: `1px solid ${ANO.border}`, borderRadius: 6, color: ANO.text, background: ANO.white, boxSizing: "border-box", outline: "none", ...style }} />;
}

function SaveBadge({ status, lastSaved }) {
  if (status === "idle") return null;
  const cfg = {
    saving: { text: "Spremanje…",          color: ANO.blue,  bg: ANO.lightBlue },
    saved:  { text: `✓ Spremljeno${lastSaved ? " · " + lastSaved : ""}`, color: "#1E7C4D", bg: "#EAFAF1" },
    error:  { text: "⚠ Greška pri spremanju – pokušaj ponovo", color: "#C0392B", bg: "#FEF0EE" },
  }[status];
  if (!cfg) return null;
  return (
    <div style={{ position: "fixed", bottom: 20, right: 24, padding: "9px 18px", background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40`, borderRadius: 22, fontSize: 12, fontWeight: 600, boxShadow: "0 2px 12px rgba(0,0,0,0.12)", zIndex: 999, transition: "opacity 0.3s" }}>
      {cfg.text}
    </div>
  );
}

// ── NEW PROJECT MODAL ─────────────────────────────────────────────────────────
function NewProjectModal({ onSave, onClose, initialCode = "" }) {
  const [form, setForm] = useState({ code: initialCode, name: "", category: "", categoryColor: ANO.accent, svrha: "", cilj: "", timInput: "", start: "", end: "", trajanje: "" });
  const [faze, setFaze] = useState([{ id: 1, naziv: "" }]);
  const [errors, setErrors] = useState({});
  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Naziv je obavezan";
    if (!form.category.trim()) e.category = "Kategorija je obavezna";
    const isMiniCode = form.code.trim().toUpperCase().startsWith("IV");
    if (!isMiniCode && !faze.some(f => f.naziv.trim())) e.faze = "Unesite barem jednu fazu";
    if (Object.keys(e).length) { setErrors(e); return; }
    const tim = form.timInput.split(",").map(s => s.trim()).filter(Boolean);
    const validFaze = faze.filter(f => f.naziv.trim()).map((f, i) => ({ id: i + 1, naziv: f.naziv.trim(), status: "nije_zapoceto" }));
    const isMini = (form.code.trim().toUpperCase().startsWith("IV") || form.trajanje.toLowerCase().includes("tjedan") || form.trajanje.toLowerCase().includes("dan"));
    onSave({ id: Date.now(), code: form.code.trim() || "—", name: form.name.trim(), category: form.category.trim(), categoryColor: form.categoryColor, svrha: form.svrha.trim(), cilj: form.cilj.trim(), tim: tim.length ? tim : ["—"], start: parseMonthInput(form.start) || "—", end: parseMonthInput(form.end) || "—", trajanje: form.trajanje.trim() || "—", faze: validFaze, napomene: "", ukupniStatus: "nije_zapoceto", postotak: 0 });
  };

  const fs = { marginBottom: 14 };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,35,91,0.55)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px", overflowY: "auto" }}>
      <div style={{ background: ANO.white, borderRadius: 12, width: "100%", maxWidth: 680, boxShadow: "0 20px 60px rgba(0,35,91,0.3)", overflow: "hidden" }}>
        <div style={{ background: `linear-gradient(90deg,${ANO.dark},${ANO.navy})`, padding: "18px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, color: ANO.accent, letterSpacing: 3, textTransform: "uppercase", marginBottom: 3 }}>ANO d.o.o.</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: ANO.white }}>Novi projekt</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.25)", color: "rgba(255,255,255,0.7)", borderRadius: 6, padding: "5px 14px", cursor: "pointer", fontSize: 12 }}>Odustani ✕</button>
        </div>
        <div style={{ padding: "24px 28px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 12, ...fs }}>
            <div><Label>Oznaka</Label><Inp value={form.code} onChange={set("code")} placeholder="npr. II.3" /></div>
            <div><Label>Naziv projekta *</Label><Inp value={form.name} onChange={set("name")} placeholder="Naziv projekta" />{errors.name && <div style={{ fontSize: 11, color: "#C0392B", marginTop: 3 }}>{errors.name}</div>}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, ...fs }}>
            <div><Label>Kategorija *</Label><Inp value={form.category} onChange={set("category")} placeholder="npr. Digitalizacija, HR…" />{errors.category && <div style={{ fontSize: 11, color: "#C0392B", marginTop: 3 }}>{errors.category}</div>}</div>
            <div><Label>Boja</Label><div style={{ display: "flex", gap: 6, marginTop: 4 }}>{CATEGORY_COLORS.map(c => <div key={c.value} onClick={() => set("categoryColor")(c.value)} title={c.label} style={{ width: 26, height: 26, borderRadius: "50%", background: c.value, cursor: "pointer", border: form.categoryColor === c.value ? `3px solid ${ANO.text}` : "3px solid transparent" }} />)}</div></div>
          </div>
          <div style={fs}><Label>Svrha projekta</Label><textarea value={form.svrha} onChange={e => set("svrha")(e.target.value)} placeholder="Kratki opis zašto se projekt pokreće…" rows={2} style={{ width: "100%", padding: "8px 10px", fontSize: 13, border: `1px solid ${ANO.border}`, borderRadius: 6, color: ANO.text, boxSizing: "border-box", outline: "none", resize: "vertical" }} /></div>
          <div style={fs}><Label>Cilj projekta</Label><Inp value={form.cilj} onChange={set("cilj")} placeholder="Što se projektom želi postići…" /></div>
          <div style={fs}><Label>Projektni tim</Label><Inp value={form.timInput} onChange={set("timInput")} placeholder="Ana, Marko, Petra  (odvojeni zarezima)" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, ...fs }}>
            <div><Label>Početak (MM.GGGG)</Label><Inp value={form.start} onChange={set("start")} placeholder="04.2026" /></div>
            <div><Label>Kraj (MM.GGGG)</Label><Inp value={form.end} onChange={set("end")} placeholder="10.2026" /></div>
            <div><Label>Trajanje</Label><Inp value={form.trajanje} onChange={set("trajanje")} placeholder="6 mj." /></div>
          </div>
          <div style={fs}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Label>Ključne faze / aktivnosti {form.code.toUpperCase().startsWith("IV") ? "(nije obavezno za zadatke IV. skupine)" : "*"}</Label>
              <button onClick={() => setFaze(f => [...f, { id: Date.now(), naziv: "" }])} style={{ fontSize: 11, padding: "4px 12px", background: ANO.lightBlue, color: ANO.blue, border: `1px solid ${ANO.border}`, borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>+ Dodaj fazu</button>
            </div>
            {errors.faze && <div style={{ fontSize: 11, color: "#C0392B", marginBottom: 6 }}>{errors.faze}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {faze.map((f, i) => (
                <div key={f.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: form.categoryColor, color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
                  <input value={f.naziv} onChange={e => setFaze(prev => prev.map(x => x.id === f.id ? { ...x, naziv: e.target.value } : x))} placeholder={`Faza ${i + 1} – opis aktivnosti`} style={{ flex: 1, padding: "7px 10px", fontSize: 13, border: `1px solid ${ANO.border}`, borderRadius: 6, color: ANO.text, background: ANO.bg, outline: "none" }} />
                  {faze.length > 1 && <button onClick={() => setFaze(prev => prev.filter(x => x.id !== f.id))} style={{ background: "transparent", border: "none", color: "#C0392B", cursor: "pointer", fontSize: 18, padding: "0 4px" }}>×</button>}
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 20, padding: "10px 14px", background: ANO.bg, border: `1px solid ${ANO.border}`, borderRadius: 8, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: form.categoryColor, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: ANO.navy }}>{form.code || "—"} {form.name || "Naziv projekta"}</span>
            <span style={{ fontSize: 11, color: form.categoryColor, fontWeight: 600, marginLeft: 4 }}>{form.category || "Kategorija"}</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: ANO.muted }}>{faze.filter(f => f.naziv.trim()).length} faza</span>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={onClose} style={{ padding: "9px 20px", background: ANO.white, color: ANO.muted, border: `1px solid ${ANO.border}`, borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Odustani</button>
            <button onClick={handleSave} style={{ padding: "9px 24px", background: `linear-gradient(90deg,${ANO.dark},${ANO.navy})`, color: ANO.white, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>＋ Spremi projekt</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [projects, setProjects]             = useState(null);
  const [selectedId, setSelectedId]         = useState(null);
  const [editNapomena, setEditNapomena]     = useState("");
  const [editingNapomena, setEditingNapomena] = useState(false);
  const [showNewModal, setShowNewModal]     = useState(false);
  const [modalInitialCode, setModalInitialCode] = useState("");
  const [saveStatus, setSaveStatus]         = useState("idle");
  const [lastSaved, setLastSaved]           = useState(null);
  const [editingProject, setEditingProject] = useState(false);
  const [editForm, setEditForm]             = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [viewMode, setViewMode]             = useState("kanban"); // "kanban" | "timeline" | "team"
  const [editingNaPotezu, setEditingNaPotezu] = useState(null);
  const [logForm, setLogForm]               = useState({ datum: "", osoba: "", biljeska: "" });
  const [naPotezuDraft, setNaPotezuDraft]   = useState({ korak: "", rok: "" }); // local draft — saved only on blur/submit
  const [showLogForm, setShowLogForm]       = useState(false);

  // Derive selected project directly from projects state — always fresh, never stale
  const selected = projects ? (projects.find(p => p.id === selectedId) ?? null) : null;

  // Debounce timer ref – we batch rapid changes into one write
  const saveTimer   = useRef(null);
  const pendingData = useRef(null);
  const projectsRef  = useRef(null);

  // ── Load on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    loadFromStorage().then(loaded => {
      const { projects: saved } = loaded || { projects: null };
      const initial = mergeWithCanonical(saved);
      projectsRef.current = initial;
      setProjects(initial);
    });
  }, []);

  // ── Debounced save ─────────────────────────────────────────────────────────
  // Called every time projects state changes (except initial null→value transition)
  const isFirstLoad = useRef(true);
  useEffect(() => {
    if (projects === null) return;
    projectsRef.current = projects;
    if (isFirstLoad.current) { isFirstLoad.current = false; return; }

    pendingData.current = projects;
    setSaveStatus("saving");

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await saveToStorage(pendingData.current);
        const now = new Date();
        setLastSaved(`${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}`);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } catch (err) {
        console.error("Save failed:", err);
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 5000);
      }
    }, 600);

    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [projects]);

  // ── Project mutation helpers ───────────────────────────────────────────────
  const recalc = (p) => {
    const done = p.faze.filter(f => f.status === "zavrseno").length;
    const postotak = p.faze.length ? Math.round((done / p.faze.length) * 100) : 0;
    const keep = p.ukupniStatus === "na_cekanju" || p.ukupniStatus === "kasni";
    const ukupniStatus = postotak === 100 ? "zavrseno" : done > 0 ? "u_tijeku" : keep ? p.ukupniStatus : "nije_zapoceto";
    return { ...p, postotak, ukupniStatus };
  };

  const updateFazaStatus = (projectId, fazaId, newStatus) => {
    const upd = p => p.id !== projectId ? p : recalc({ ...p, faze: p.faze.map(f => f.id === fazaId ? { ...f, status: newStatus } : f) });
    const newProjects = (projectsRef.current || []).map(upd);
    projectsRef.current = newProjects;
    setProjects(newProjects);
    setSaveStatus("saving");
    saveToStorage(newProjects)
      .then(() => { const now = new Date(); setLastSaved(`${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}`); setSaveStatus("saved"); setTimeout(() => setSaveStatus("idle"), 2000); })
      .catch(() => setSaveStatus("error"));
  };

  const updateProjectStatus = (projectId, s) => {
    const newProjects = (projectsRef.current || []).map(p => p.id !== projectId ? p : { ...p, ukupniStatus: s });
    projectsRef.current = newProjects;
    setProjects(newProjects);
    setSaveStatus("saving");
    saveToStorage(newProjects)
      .then(() => { const now = new Date(); setLastSaved(`${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}`); setSaveStatus("saved"); setTimeout(() => setSaveStatus("idle"), 2000); })
      .catch(() => setSaveStatus("error"));
  };

  const saveNapomena = (projectId) => {
    const val = editNapomena;
    const newProjects = (projectsRef.current || []).map(p => p.id !== projectId ? p : { ...p, napomene: val });
    projectsRef.current = newProjects;
    setProjects(newProjects);
    setEditingNapomena(false);
    setSaveStatus("saving");
    saveToStorage(newProjects)
      .then(() => { const now = new Date(); setLastSaved(`${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}`); setSaveStatus("saved"); setTimeout(() => setSaveStatus("idle"), 2000); })
      .catch(() => setSaveStatus("error"));
  };

  const addProject = (p) => {
    // Ensure all fields exist so extractMutableState never hits undefined
    const fullProject = { linkovi: [], naPotezu: null, napomene: "", ukupniStatus: "nije_zapoceto", postotak: 0, ...p };
    const newProjects = [...(projectsRef.current || []), fullProject];
    projectsRef.current = newProjects;
    setProjects(newProjects);
    setShowNewModal(false);
    setModalInitialCode("");
    // Save immediately — don't rely on debounce
    setSaveStatus("saving");
    saveToStorage(newProjects)
      .then(() => {
        const now = new Date();
        setLastSaved(`${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}`);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      })
      .catch(() => setSaveStatus("error"));
    setTimeout(() => { setSelectedId(fullProject.id); setEditNapomena(""); setEditingNapomena(false); }, 50);
  };

  const deleteProject = async (id) => {
    try {
      await _storage.deleteProject(id)
    } catch (err) {
      console.error("Delete failed:", err)
    }
    setProjects(prev => prev.filter(p => p.id !== id));
    setConfirmDeleteId(null);
    setSelectedId(null);
  };

  const openProject = (p) => {
    setSelectedId(p.id);
    setEditNapomena(p.napomene);
    setEditingNapomena(false);
    setEditingProject(false);
    setEditForm(null);
    setConfirmDeleteId(null);
  };

  const startEdit = () => {
    setEditForm({
      code: selected.code,
      name: selected.name,
      category: selected.category,
      categoryColor: selected.categoryColor,
      svrha: selected.svrha,
      cilj: selected.cilj,
      timInput: selected.tim.join(", "),
      start: fmtDate(selected.start),
      end: fmtDate(selected.end),
      trajanje: selected.trajanje,
      faze: selected.faze.map(f => ({ ...f })),
      linkovi: (selected.linkovi || []).map(l => ({ ...l })),
    });
    setEditingProject(true);
  };

  const cancelEdit = () => { setEditingProject(false); setEditForm(null); };

  const setEF = (k) => (v) => setEditForm(f => ({ ...f, [k]: v }));

  const updateFazaNaziv = (id, val) =>
    setEditForm(f => ({ ...f, faze: f.faze.map(fz => fz.id === id ? { ...fz, naziv: val } : fz) }));
  const addEditFaza = () =>
    setEditForm(f => ({ ...f, faze: [...f.faze, { id: Date.now(), naziv: "", status: "nije_zapoceto" }] }));
  const removeEditFaza = (id) =>
    setEditForm(f => ({ ...f, faze: f.faze.filter(fz => fz.id !== id) }));
  const moveEditFaza = (idx, dir) =>
    setEditForm(f => {
      const arr = [...f.faze];
      const to = idx + dir;
      if (to < 0 || to >= arr.length) return f;
      [arr[idx], arr[to]] = [arr[to], arr[idx]];
      return { ...f, faze: arr };
    });

  const saveEditedProject = () => {
    const tim = editForm.timInput.split(",").map(s => s.trim()).filter(Boolean);
    const validFaze = editForm.faze.filter(f => f.naziv.trim());
    const updated = recalc({
      ...selected,
      code: editForm.code.trim() || selected.code,
      name: editForm.name.trim() || selected.name,
      category: editForm.category.trim(),
      categoryColor: editForm.categoryColor,
      svrha: editForm.svrha.trim(),
      cilj: editForm.cilj.trim(),
      tim: tim.length ? tim : selected.tim,
      start: parseMonthInput(editForm.start.trim()) || "—",
      end: parseMonthInput(editForm.end.trim()) || "—",
      trajanje: editForm.trajanje.trim() || "—",
      faze: validFaze,
      linkovi: editForm.linkovi || [],
    });
    const newProjects = (projectsRef.current || []).map(p => p.id === updated.id ? updated : p);
    projectsRef.current = newProjects;
    setProjects(newProjects);
    setEditingProject(false);
    setEditForm(null);
    setSaveStatus("saving");
    saveToStorage(newProjects)
      .then(() => { const now = new Date(); setLastSaved(`${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}`); setSaveStatus("saved"); setTimeout(() => setSaveStatus("idle"), 2000); })
      .catch(() => setSaveStatus("error"));
  };

  // European date format helper: "2026-04-26" → "26.04.2026"
  // EU format display
  
  const addLogEntry = (projectId, entry) => {
    const newEntry = { ...entry, id: Date.now() };
    const upd = p => p.id !== projectId ? p : {
      ...p,
      naPotezu: {
        ...(p.naPotezu || {}),
        log: [...((p.naPotezu || {}).log || []), newEntry],
      }
    };
    // Compute new state synchronously from the ref (always fresh)
    const newProjects = (projectsRef.current || []).map(upd);
    projectsRef.current = newProjects;
    setProjects(newProjects);
    // Immediately persist — don't rely on debounce for user-initiated log entries
    setSaveStatus("saving");
    saveToStorage(newProjects).then(() => {
      const now = new Date();
      setLastSaved(`${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }).catch(() => setSaveStatus("error"));
  };

  const deleteLogEntry = (projectId, entryId) => {
    const upd = p => p.id !== projectId ? p : {
      ...p,
      naPotezu: { ...(p.naPotezu || {}), log: ((p.naPotezu || {}).log || []).filter(e => e.id !== entryId) }
    };
    const newProjects = (projectsRef.current || []).map(upd);
    projectsRef.current = newProjects;
    setProjects(newProjects);
    setSaveStatus("saving");
    saveToStorage(newProjects).then(() => {
      const now = new Date();
      setLastSaved(`${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }).catch(() => setSaveStatus("error"));
  };

  const updateNaPotezu = (projectId, field, value) => {
    const upd = p => p.id !== projectId ? p : { ...p, naPotezu: { ...(p.naPotezu || {}), [field]: value } };
    const newProjects = (projectsRef.current || []).map(upd);
    projectsRef.current = newProjects;
    setProjects(newProjects);
    // Save immediately — don't rely on debounce for naPotezu edits
    setSaveStatus("saving");
    saveToStorage(newProjects)
      .then(() => {
        const now = new Date();
        setLastSaved(`${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}`);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      })
      .catch(() => setSaveStatus("error"));
  };

  // ── Loading screen ─────────────────────────────────────────────────────────
  if (projects === null) {
    return (
      <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", background: ANO.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: 40, height: 40, border: `3px solid ${ANO.lightBlue}`, borderTop: `3px solid ${ANO.navy}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <div style={{ color: ANO.muted, fontSize: 13 }}>Učitavanje podataka…</div>
      </div>
    );
  }

  const totalFaze = projects.reduce((a, p) => a + p.faze.length, 0);
  const doneTotal = projects.reduce((a, p) => a + p.faze.filter(f => f.status === "zavrseno").length, 0);
  const overallPct = totalFaze ? Math.round((doneTotal / totalFaze) * 100) : 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", background: ANO.bg, minHeight: "100vh", color: ANO.text }}>
      {showNewModal && <NewProjectModal onSave={addProject} onClose={() => { setShowNewModal(false); setModalInitialCode(""); }} initialCode={modalInitialCode} />}
      <SaveBadge status={saveStatus} lastSaved={lastSaved} />

      {/* HEADER */}
      <div style={{ background: `linear-gradient(135deg,${ANO.dark} 0%,${ANO.navy} 60%,${ANO.blue} 100%)` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "22px 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 46, height: 46, borderRadius: 10, background: ANO.white, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16, color: ANO.navy, letterSpacing: -1, boxShadow: "0 2px 12px rgba(0,0,0,0.25)" }}>ANO</div>
            <div>
              <div style={{ fontSize: 10, letterSpacing: 3, color: ANO.accent, textTransform: "uppercase", marginBottom: 3 }}>ANO d.o.o. · Projektni tracker</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: ANO.white }}>Realizacija projekata 2026.</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: ANO.accent, lineHeight: 1 }}>{overallPct}%</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", letterSpacing: 2, textTransform: "uppercase", marginTop: 2 }}>ukupno završeno</div>
            </div>
            <button onClick={() => setShowNewModal(true)} style={{ padding: "10px 20px", background: ANO.accent, color: ANO.white, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, boxShadow: "0 2px 10px rgba(0,163,224,0.4)", whiteSpace: "nowrap" }}>＋ Novi projekt</button>
          </div>
        </div>
        <div style={{ height: 3, background: ANO.accent }} />
      </div>

      {/* TAB BAR */}
      {!selected && <div style={{ background: ANO.white, borderBottom: `1px solid ${ANO.border}` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px", display: "flex", gap: 0 }}>
          {[{ id: "kanban", label: "📋  Opis projekata" }, { id: "timeline", label: "📅  Timeline" }, { id: "team", label: "👥  Zauzetost tima" }].map(tab => (
            <button key={tab.id} onClick={() => setViewMode(tab.id)} style={{
              padding: "12px 22px", background: "transparent", border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: viewMode === tab.id ? 700 : 500,
              color: viewMode === tab.id ? ANO.navy : ANO.muted,
              borderBottom: viewMode === tab.id ? `3px solid ${ANO.navy}` : "3px solid transparent",
              marginBottom: -1, transition: "all 0.15s"
            }}>{tab.label}</button>
          ))}
        </div>
      </div>}

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 40px" }}>

        {!selected && viewMode === "timeline" && (() => {
          // ── TIMELINE VIEW ───────────────────────────────────────────────────
          const MONTHS = ["Sij","Velj","Ožu","Tra","Svi","Lip","Srp","Kol","Ruj","Lis","Stu","Pro"];
          const YEAR = 2026;
          const today = new Date();
          const todayMonth = today.getFullYear() === YEAR ? today.getMonth() : (today.getFullYear() > YEAR ? 11 : 0);
          const todayPct = today.getFullYear() === YEAR ? ((today.getDate()-1)/31) : 0;

          const parseMonth = (s) => {
            if (!s || s === "—") return null;
            const [y, m] = s.split("-");
            return { year: parseInt(y), month: parseInt(m) - 1 };
          };

          const monthToCol = (s) => {
            const p = parseMonth(s);
            if (!p) return null;
            return (p.year - YEAR) * 12 + p.month;
          };

          const TOTAL_COLS = 12; // Jan–Dec 2026 + a bit of 2027
          const EXTRA = 2; // show 2 months of 2027
          const COLS = TOTAL_COLS + EXTRA;

          // Group projects by person for resource view
          const allPeople = [...new Set(projects.flatMap(p => p.tim || []))].sort();

          // Color per group
          const groupColor = (code) => {
            if (!code) return ANO.muted;
            if (code.startsWith("IV"))  return "#5B6B99";
            if (code.startsWith("III")) return "#1E7C4D";
            if (code.startsWith("II"))  return "#C0392B";
            return ANO.accent;
          };

          const BAR_H = 28;
          const ROW_H = 44;
          const LABEL_W = 200;
          const headerBg = ANO.dark;

          return (
            <div style={{ background: ANO.white, borderRadius: 10, border: `1px solid ${ANO.border}`, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,48,135,0.08)", marginBottom: 24 }}>
              {/* Header row */}
              <div style={{ display: "flex", background: headerBg }}>
                <div style={{ width: LABEL_W, flexShrink: 0, padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: 2, textTransform: "uppercase" }}>Projekt</div>
                <div style={{ flex: 1, display: "grid", gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
                  {Array.from({ length: TOTAL_COLS }).map((_, i) => (
                    <div key={i} style={{ padding: "10px 0", textAlign: "center", fontSize: 10, fontWeight: i === todayMonth ? 800 : 600, color: i === todayMonth ? ANO.accent : "rgba(255,255,255,0.6)", borderLeft: "1px solid rgba(255,255,255,0.08)", background: i === todayMonth ? "rgba(0,163,224,0.15)" : "transparent" }}>
                      {MONTHS[i]}
                    </div>
                  ))}
                  {Array.from({ length: EXTRA }).map((_, i) => (
                    <div key={"ex"+i} style={{ padding: "10px 0", textAlign: "center", fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.35)", borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                      {MONTHS[i]} '27
                    </div>
                  ))}
                </div>
              </div>

              {/* Project rows */}
              {projects.map((p, pi) => {
                const startCol = monthToCol(p.start);
                const endCol   = monthToCol(p.end);
                if (startCol === null && endCol === null) return null;
                const sc = Math.max(0, Math.min(startCol ?? 0, COLS - 1));
                const ec = Math.min(COLS - 1, Math.max(sc, endCol ?? sc));
                const spanCols = ec - sc + 1;
                const pct = p.postotak || 0;
                const color = groupColor(p.code);
                const sc2 = statusConfig[p.ukupniStatus] || statusConfig.nije_zapoceto;
                const isMini = p.code?.startsWith("IV");

                return (
                  <div key={p.id} onClick={() => { openProject(p); setViewMode("kanban"); }}
                    style={{ display: "flex", alignItems: "center", borderBottom: `1px solid ${ANO.border}`, cursor: "pointer", background: selected?.id === p.id ? ANO.lightBlue : pi % 2 === 0 ? ANO.white : "#FAFBFF", transition: "background 0.1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = ANO.lightBlue}
                    onMouseLeave={e => e.currentTarget.style.background = selected?.id === p.id ? ANO.lightBlue : pi % 2 === 0 ? ANO.white : "#FAFBFF"}>
                    {/* Label */}
                    <div style={{ width: LABEL_W, flexShrink: 0, padding: "8px 16px", display: "flex", flexDirection: "column", gap: 2 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: ANO.navy, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.code} {p.name}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ fontSize: 9, fontWeight: 600, background: sc2.bg, color: sc2.color, padding: "1px 6px", borderRadius: 10 }}>{sc2.label}</span>
                        {isMini && <span style={{ fontSize: 9, color: "#5B6B99", fontWeight: 600 }}>≤2tj</span>}
                      </div>
                      {/* People dots */}
                      <div style={{ display: "flex", marginTop: 1 }}>
                        {(p.tim||[]).slice(0,5).map((ime,i) => (
                          <div key={ime+i} title={ime} style={{ width: 14, height: 14, borderRadius: "50%", background: avatarColor(ime), border: `1px solid ${ANO.white}`, marginLeft: i>0?-4:0, fontSize: 7, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{initials(ime)}</div>
                        ))}
                      </div>
                    </div>
                    {/* Bar grid */}
                    <div style={{ flex: 1, display: "grid", gridTemplateColumns: `repeat(${COLS}, 1fr)`, height: ROW_H, position: "relative", alignItems: "center" }}>
                      {/* Month grid lines */}
                      {Array.from({ length: COLS }).map((_, i) => (
                        <div key={i} style={{ height: "100%", borderLeft: `1px solid ${ANO.border}`, background: i === todayMonth ? "rgba(0,163,224,0.05)" : "transparent" }} />
                      ))}
                      {/* Today line */}
                      <div style={{ position: "absolute", left: `${((todayMonth + todayPct) / COLS) * 100}%`, top: 0, bottom: 0, width: 2, background: ANO.accent, opacity: 0.6, zIndex: 3 }} />
                      {/* Project bar */}
                      <div style={{
                        position: "absolute",
                        left: `${(sc / COLS) * 100}%`,
                        width: `${(spanCols / COLS) * 100}%`,
                        height: BAR_H,
                        borderRadius: 5,
                        background: color,
                        opacity: isMini ? 0.75 : 1,
                        zIndex: 2,
                        overflow: "hidden",
                        boxShadow: isMini ? `0 1px 4px ${color}60` : `0 2px 8px ${color}50`,
                        border: isMini ? `2px dashed ${color}` : "none",
                        backgroundClip: "padding-box",
                      }}>
                        {/* Progress fill */}
                        {pct > 0 && !isMini && (
                          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: "rgba(255,255,255,0.22)", borderRadius: 5 }} />
                        )}
                        {/* Label on bar */}
                        {spanCols >= 2 && (
                          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", paddingLeft: 8, fontSize: 10, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {p.code}{pct > 0 ? ` · ${pct}%` : ""}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }).filter(Boolean)}

              {/* Legend */}
              <div style={{ padding: "10px 16px", background: ANO.bg, borderTop: `1px solid ${ANO.border}`, display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
                {[["I.", ANO.accent], ["II.", "#C0392B"], ["III.", "#1E7C4D"], ["IV.", "#5B6B99"]].map(([g, c]) => (
                  <div key={g} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 24, height: 8, borderRadius: 4, background: c }} />
                    <span style={{ fontSize: 11, color: ANO.muted }}>Skupina {g}</span>
                  </div>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 2, height: 16, background: ANO.accent }} />
                  <span style={{ fontSize: 11, color: ANO.muted }}>Danas</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 24, height: 8, borderRadius: 4, background: "#5B6B99", border: "2px dashed #5B6B99", boxSizing: "border-box" }} />
                  <span style={{ fontSize: 11, color: ANO.muted }}>Jednokratni zadatak</span>
                </div>
                <span style={{ marginLeft: "auto", fontSize: 11, color: ANO.muted }}>Kliknite na projekt za detalje →</span>
              </div>
            </div>
          );
        })()}

        {!selected && viewMode === "team" && (() => {
          // ── TEAM CAPACITY VIEW ───────────────────────────────────────────────
          const MONTHS = ["Sij","Velj","Ožu","Tra","Svi","Lip","Srp","Kol","Ruj","Lis","Stu","Pro"];
          const YEAR = 2026;
          const today = new Date();
          const todayMonth = today.getFullYear() === YEAR ? today.getMonth() : (today.getFullYear() > YEAR ? 11 : 0);

          const parseYM = (s) => {
            if (!s || s === "—") return null;
            // handles "YYYY-MM" or "MM.YYYY"
            if (s.includes("-")) { const [y,m] = s.split("-"); return { y: parseInt(y), m: parseInt(m)-1 }; }
            if (s.includes(".")) { const [m,y] = s.split("."); return { y: parseInt(y), m: parseInt(m)-1 }; }
            return null;
          };
          const toCol = (s) => {
            const p = parseYM(s); if (!p) return null;
            return (p.y - YEAR) * 12 + p.m;
          };

          const EXTRA = 2;
          const COLS = 12 + EXTRA;

          // Gather all unique team members across all projects
          const allPeople = [...new Set(projects.flatMap(p => p.tim || []))].sort();

          // For each person, collect their projects with start/end cols
          const personProjects = {};
          allPeople.forEach(ime => { personProjects[ime] = []; });
          projects.forEach(p => {
            (p.tim || []).forEach(ime => {
              const sc = toCol(p.start); const ec = toCol(p.end);
              if (sc === null && ec === null) return;
              personProjects[ime].push({ ...p, sc: sc ?? 0, ec: ec ?? (sc ?? 0) });
            });
          });

          // Compute per-person per-month load (count of active projects)
          const load = {};
          allPeople.forEach(ime => {
            load[ime] = Array(COLS).fill(0);
            personProjects[ime].forEach(p => {
              const from = Math.max(0, p.sc);
              const to   = Math.min(COLS - 1, p.ec);
              for (let m = from; m <= to; m++) load[ime][m]++;
            });
          });

          const maxLoad = Math.max(1, ...allPeople.flatMap(ime => load[ime]));

          const groupColor = (code) => {
            if (!code) return ANO.muted;
            if (code.startsWith("IV"))  return "#5B6B99";
            if (code.startsWith("III")) return "#1E7C4D";
            if (code.startsWith("II"))  return "#C0392B";
            return ANO.accent;
          };

          const loadColor = (n, max) => {
            if (n === 0) return "transparent";
            const ratio = n / max;
            if (ratio <= 0.35) return "#D4F5E2";  // zeleno – slobodno
            if (ratio <= 0.65) return "#FFF3CD";  // žuto – umjereno
            if (ratio <= 0.85) return "#FFD8B0";  // narančasto – puno
            return "#FFBABA";                      // crveno – prekapacitiran
          };
          const loadTextColor = (n, max) => {
            const ratio = n / max;
            if (ratio <= 0.35) return "#1E7C4D";
            if (ratio <= 0.65) return "#B07D00";
            if (ratio <= 0.85) return "#C0390B";
            return "#C0392B";
          };

          const COL_W = 58;
          const LABEL_W = 130;

          return (
            <div style={{ marginBottom: 24 }}>
              {/* Legend */}
              <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
                {[["Slobodno (1 projekt)", "#D4F5E2", "#1E7C4D"], ["Umjereno (2)", "#FFF3CD", "#B07D00"], ["Puno (3)", "#FFD8B0", "#C0390B"], ["Prekapacitiran (4+)", "#FFBABA", "#C0392B"]].map(([l,bg,c]) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 16, height: 16, borderRadius: 3, background: bg, border: `1px solid ${c}40` }} />
                    <span style={{ fontSize: 11, color: ANO.muted }}>{l}</span>
                  </div>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 2, height: 16, background: ANO.accent }} />
                  <span style={{ fontSize: 11, color: ANO.muted }}>Danas</span>
                </div>
              </div>

              {/* Heat map table */}
              <div style={{ background: ANO.white, borderRadius: 10, border: `1px solid ${ANO.border}`, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,48,135,0.07)" }}>
                {/* Month header */}
                <div style={{ display: "flex", background: ANO.dark }}>
                  <div style={{ width: LABEL_W, flexShrink: 0, padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: 2, textTransform: "uppercase" }}>Član tima</div>
                  <div style={{ flex: 1, display: "grid", gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} style={{ padding: "10px 0", textAlign: "center", fontSize: 10, fontWeight: i === todayMonth ? 800 : 600, color: i === todayMonth ? ANO.accent : "rgba(255,255,255,0.6)", borderLeft: "1px solid rgba(255,255,255,0.08)", background: i === todayMonth ? "rgba(0,163,224,0.15)" : "transparent" }}>
                        {MONTHS[i]}
                      </div>
                    ))}
                    {Array.from({ length: EXTRA }).map((_, i) => (
                      <div key={"ex"+i} style={{ padding: "10px 0", textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.35)", borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                        {MONTHS[i]} '27
                      </div>
                    ))}
                  </div>
                </div>

                {/* Person rows */}
                {allPeople.map((ime, pi) => (
                  <div key={ime} style={{ display: "flex", borderBottom: pi < allPeople.length - 1 ? `1px solid ${ANO.border}` : "none" }}>
                    {/* Name */}
                    <div style={{ width: LABEL_W, flexShrink: 0, padding: "0 16px", display: "flex", alignItems: "center", gap: 8, background: pi % 2 === 0 ? ANO.white : "#FAFBFF", borderRight: `1px solid ${ANO.border}` }}>
                      <div style={{ width: 26, height: 26, borderRadius: "50%", background: avatarColor(ime), color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{initials(ime)}</div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: ANO.navy }}>{ime}</span>
                    </div>
                    {/* Month cells */}
                    <div style={{ flex: 1, display: "grid", gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
                      {Array.from({ length: COLS }).map((_, mi) => {
                        const n = load[ime][mi];
                        const isToday = mi === todayMonth;
                        return (
                          <div key={mi} title={n > 0 ? `${ime} · ${MONTHS[mi < 12 ? mi : mi-12]}${mi >= 12 ? " '27" : ""}: ${n} projekt${n === 1 ? "" : "a"}` : ""}
                            style={{ height: 48, position: "relative", background: n === 0 ? (isToday ? "rgba(0,163,224,0.04)" : "transparent") : loadColor(n, maxLoad), borderLeft: `1px solid ${isToday ? ANO.accent+"60" : ANO.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1 }}>
                            {isToday && <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 2, background: ANO.accent, opacity: 0.5 }} />}
                            {n > 0 && <span style={{ fontSize: 13, fontWeight: 900, color: loadTextColor(n, maxLoad) }}>{n}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Per-person project detail */}
              <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
                {allPeople.map(ime => {
                  const ps = personProjects[ime];
                  if (!ps.length) return null;
                  const peakLoad = Math.max(...load[ime]);
                  return (
                    <div key={ime} style={{ background: ANO.white, border: `1px solid ${ANO.border}`, borderRadius: 10, overflow: "hidden" }}>
                      <div style={{ padding: "12px 16px", background: peakLoad >= 4 ? "#FFF0F0" : peakLoad >= 3 ? "#FFF8EE" : ANO.lightBlue, borderBottom: `1px solid ${ANO.border}`, display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: avatarColor(ime), color: "#fff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{initials(ime)}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: ANO.navy }}>{ime}</div>
                          <div style={{ fontSize: 11, color: ANO.muted }}>{ps.length} projekt{ps.length === 1 ? "" : "a"}{peakLoad >= 4 ? " · ⚠ rizik prekapacitiranosti" : peakLoad >= 3 ? " · puno angažiran" : ""}</div>
                        </div>
                      </div>
                      <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                        {ps.map(p => (
                          <div key={p.id} onClick={() => { openProject(p); setViewMode("kanban"); }}
                            style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, background: ANO.bg, cursor: "pointer", border: `1px solid ${ANO.border}` }}
                            onMouseEnter={e => e.currentTarget.style.background = ANO.lightBlue}
                            onMouseLeave={e => e.currentTarget.style.background = ANO.bg}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: groupColor(p.code), flexShrink: 0 }} />
                            <span style={{ fontSize: 11, fontWeight: 700, color: ANO.navy, flex: 1 }}>{p.code}</span>
                            <span style={{ fontSize: 11, color: ANO.text, flex: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                            <span style={{ fontSize: 10, color: ANO.muted, flexShrink: 0 }}>{fmtDate(p.start)} – {fmtDate(p.end)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {!selected && (() => {
          /* PROJECT CARDS — grouped by skupina */
          const GROUPS = [
            { key: "I",   label: "Skupina I.",   subtitle: "Automatizacija i integracija sustava", accentColor: ANO.accent },
            { key: "II",  label: "Skupina II.",  subtitle: "Jačanje prodajnog pristupa",           accentColor: "#C0392B" },
            { key: "III", label: "Skupina III.", subtitle: "Standardizacija i priprema za rast",   accentColor: "#1E7C4D" },
            { key: "IV",  label: "Skupina IV.",  subtitle: "Jednokratni zadaci (maks. 2 tjedna)",  accentColor: "#5B6B99", mini: true },
          ];

          const getGroup = (code) => {
            if (code.startsWith("IV"))  return "IV";
            if (code.startsWith("III")) return "III";
            if (code.startsWith("II"))  return "II";
            if (code.startsWith("I"))   return "I";
            return "other";
          };

          const canonicalIds = new Set(ALL_PROJECTS.map(p => p.id));
          const grouped = {};
          GROUPS.forEach(g => { grouped[g.key] = []; });
          grouped["other"] = [];
          projects.forEach(p => { const g = getGroup(p.code); grouped[g] ? grouped[g].push(p) : grouped["other"].push(p); });

          const renderCard = (p) => {
            const sc = statusConfig[p.ukupniStatus] || statusConfig.nije_zapoceto;
            const active = selected?.id === p.id;
            return (
              <div key={p.id} onClick={() => openProject(p)} style={{ background: ANO.white, borderRadius: 10, padding: "18px 20px", cursor: "pointer", border: active ? `2px solid ${ANO.navy}` : `1px solid ${ANO.border}`, boxShadow: active ? `0 6px 24px rgba(0,48,135,0.18)` : `0 1px 6px rgba(0,48,135,0.07)`, position: "relative", overflow: "hidden", transition: "box-shadow 0.15s" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: p.categoryColor }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: p.categoryColor, letterSpacing: 1.5, textTransform: "uppercase" }}>{p.category}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, background: sc.bg, color: sc.color, padding: "2px 9px", borderRadius: 20 }}>{sc.label}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: ANO.navy, marginBottom: 3 }}>{p.code} {p.name}</div>
                <div style={{ fontSize: 11, color: ANO.muted, marginBottom: p.naPotezu?.osoba ? 8 : 14 }}>{p.start !== "—" ? fmtDate(p.start) : "—"} → {p.end !== "—" ? fmtDate(p.end) : "—"} · {p.trajanje}</div>
                {p.naPotezu?.osoba && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, padding: "5px 8px", background: "#FFFBF0", border: "1px solid #E8C97A", borderRadius: 6 }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: avatarColor(p.naPotezu.osoba), color: "#fff", fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{initials(p.naPotezu.osoba)}</div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#B07D00" }}>{p.naPotezu.osoba}</span>
                    {p.naPotezu.korak && <span style={{ fontSize: 10, color: ANO.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>· {p.naPotezu.korak}</span>}
                  </div>
                )}
                <div style={{ background: ANO.lightBlue, borderRadius: 4, height: 5, marginBottom: 10 }}>
                  <div style={{ height: 5, borderRadius: 4, background: p.categoryColor, width: `${p.postotak}%`, transition: "width 0.3s" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex" }}>
                    {p.tim.slice(0, 4).map((ime, i) => <div key={ime + i} style={{ width: 26, height: 26, borderRadius: "50%", background: avatarColor(ime), color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${ANO.white}`, marginLeft: i > 0 ? -7 : 0 }}>{initials(ime)}</div>)}
                    {p.tim.length > 4 && <div style={{ width: 26, height: 26, borderRadius: "50%", background: ANO.lightBlue, color: ANO.navy, fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${ANO.white}`, marginLeft: -7 }}>+{p.tim.length - 4}</div>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {(p.linkovi||[]).some(l => l.url) && (
                      <span title={`${(p.linkovi||[]).filter(l=>l.url).length} link${(p.linkovi||[]).filter(l=>l.url).length===1?"":"a"}`}
                        style={{ fontSize: 12, background: ANO.lightBlue, color: ANO.blue, border: `1px solid ${ANO.border}`, borderRadius: 10, padding: "1px 7px", fontWeight: 600 }}>
                        🔗 {(p.linkovi||[]).filter(l=>l.url).length}
                      </span>
                    )}
                    <span style={{ fontSize: 15, fontWeight: 900, color: p.postotak > 0 ? p.categoryColor : ANO.muted }}>{p.postotak}%</span>
                  </div>
                </div>
              </div>
            );
          };

          const renderMiniCard = (p) => {
            const sc = statusConfig[p.ukupniStatus] || statusConfig.nije_zapoceto;
            const active = selected?.id === p.id;
            return (
              <div key={p.id} onClick={() => openProject(p)}
                style={{ background: ANO.white, borderRadius: 8, padding: "14px 16px", cursor: "pointer",
                  border: active ? `2px solid #5B6B99` : `1px solid ${ANO.border}`,
                  boxShadow: active ? `0 4px 16px rgba(91,107,153,0.18)` : `0 1px 4px rgba(0,48,135,0.06)`,
                  position: "relative", overflow: "hidden", transition: "box-shadow 0.15s" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: p.categoryColor || "#5B6B99" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: ANO.navy }}>{p.code} {p.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, background: sc.bg, color: sc.color, padding: "2px 8px", borderRadius: 20, flexShrink: 0, marginLeft: 8 }}>{sc.label}</span>
                </div>
                {p.svrha && <div style={{ fontSize: 11, color: ANO.muted, lineHeight: 1.45, marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.svrha}</div>}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex" }}>
                    {(p.tim||[]).slice(0,4).map((ime,i) => <div key={ime+i} style={{ width: 22, height: 22, borderRadius: "50%", background: avatarColor(ime), color: "#fff", fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${ANO.white}`, marginLeft: i>0?-6:0 }}>{initials(ime)}</div>)}
                  </div>
                  <span style={{ fontSize: 10, color: ANO.muted }}>
                    {p.start !== "—" ? fmtDate(p.start) : "—"} → {p.end !== "—" ? fmtDate(p.end) : "—"}
                  </span>
                </div>
              </div>
            );
          };

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 24 }}>
              {GROUPS.map((g, gi) => {
                const grpProjects = grouped[g.key] || [];
                if (!grpProjects.length) return null;
                const grpDone = grpProjects.reduce((a, p) => a + p.faze.filter(f => f.status === "zavrseno").length, 0);
                const grpTotal = grpProjects.reduce((a, p) => a + p.faze.length, 0);
                const grpPct = grpTotal ? Math.round((grpDone / grpTotal) * 100) : 0;
                return (
                  <div key={g.key} style={{ marginBottom: gi < GROUPS.length - 1 ? 28 : 0 }}>
                    {/* Group header */}
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: g.accentColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ color: "#fff", fontWeight: 900, fontSize: 13 }}>{g.key}.</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: ANO.navy }}>{g.label}</span>
                          <span style={{ fontSize: 12, color: ANO.muted }}>{g.subtitle}</span>
                        </div>
                        <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 8 }}>
                          {!g.mini && <>
                            <div style={{ flex: 1, maxWidth: 200, height: 4, borderRadius: 4, background: ANO.lightBlue }}>
                              <div style={{ height: 4, borderRadius: 4, background: g.accentColor, width: `${grpPct}%`, transition: "width 0.3s" }} />
                            </div>
                            <span style={{ fontSize: 11, color: g.accentColor, fontWeight: 700 }}>{grpPct}%</span>
                          </>}
                          <span style={{ fontSize: 11, color: ANO.muted }}>{grpProjects.length} {grpProjects.length === 1 ? "zadatak" : g.mini ? "zadataka" : "projekata"}</span>
                        </div>
                      </div>
                    </div>
                    {/* Divider line */}
                    <div style={{ height: 1, background: `linear-gradient(90deg, ${g.accentColor}40, transparent)`, marginBottom: 14 }} />
                    {/* Cards */}
                    <div style={{ display: "grid", gridTemplateColumns: g.mini ? "repeat(auto-fill, minmax(240px, 1fr))" : "repeat(auto-fill, minmax(300px, 1fr))", gap: g.mini ? 10 : 14 }}>
                      {grpProjects.map(g.mini ? renderMiniCard : renderCard)}
                      {g.mini && (
                        <div onClick={() => { setModalInitialCode("IV."); setShowNewModal(true); }}
                          style={{ background: "transparent", borderRadius: 8, padding: "14px 16px", cursor: "pointer", border: `2px dashed ${ANO.border}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 80 }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = "#5B6B99"; e.currentTarget.style.background = "#F0F2FA"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = ANO.border; e.currentTarget.style.background = "transparent"; }}>
                          <span style={{ fontSize: 18, color: "#5B6B99" }}>＋</span>
                          <span style={{ fontSize: 12, color: ANO.muted, fontWeight: 600 }}>Dodaj zadatak</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {/* Extra user-created projects outside groups */}
              {grouped["other"]?.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 11, color: ANO.muted, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Ostali projekti</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
                    {grouped["other"].map(renderCard)}
                  </div>
                </div>
              )}
              {/* Add card */}
              <div style={{ marginTop: 16 }}>
                <div onClick={() => setShowNewModal(true)}
                  style={{ background: "transparent", borderRadius: 10, padding: "18px 20px", cursor: "pointer", border: `2px dashed ${ANO.border}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, height: 60 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = ANO.accent; e.currentTarget.style.background = ANO.lightBlue; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = ANO.border; e.currentTarget.style.background = "transparent"; }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: ANO.lightBlue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: ANO.accent }}>＋</div>
                  <span style={{ fontSize: 12, color: ANO.muted, fontWeight: 600 }}>Dodaj novi projekt</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* DETAIL PANEL */}
        {selected ? (
          <div style={{ borderRadius: 14, overflow: "hidden", boxShadow: `0 8px 48px rgba(0,35,91,0.18)` }}>

            {/* Breadcrumb */}
            <div style={{ background: ANO.bg, padding: "11px 32px", borderBottom: `1px solid ${ANO.border}`, display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => { setSelectedId(null); setEditingProject(false); setEditForm(null); setConfirmDeleteId(null); }} style={{ background: "transparent", border: "none", color: ANO.muted, fontSize: 11, fontWeight: 700, cursor: "pointer", padding: 0, textTransform: "uppercase", letterSpacing: 0.8, display: "flex", alignItems: "center", gap: 5 }}>
                ← Svi projekti
              </button>
              <span style={{ color: ANO.border, fontSize: 16 }}>›</span>
              <span style={{ fontSize: 11, color: ANO.muted, textTransform: "uppercase", letterSpacing: 0.8 }}>{editingProject ? editForm.code : selected.code}</span>
              <span style={{ color: ANO.border, fontSize: 16 }}>›</span>
              <span style={{ fontSize: 11, color: ANO.navy, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>{editingProject ? editForm.name : selected.name}</span>
            </div>

            {/* Hero header */}
            <div style={{ background: `linear-gradient(135deg,${ANO.dark} 0%,${ANO.navy} 65%,${ANO.blue} 100%)`, position: "relative", overflow: "hidden" }}>
              {/* Left accent bar in category color */}
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: editingProject ? editForm.categoryColor : selected.categoryColor }} />
              {/* Decorative large code watermark */}
              <div style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", fontSize: 110, fontWeight: 900, color: "rgba(255,255,255,0.04)", letterSpacing: -2, pointerEvents: "none", lineHeight: 1, userSelect: "none", fontFamily: "monospace" }}>
                {editingProject ? editForm.code : selected.code}
              </div>
              <div style={{ padding: "26px 32px 24px 37px", position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Category badge */}
                    <span style={{ display: "inline-block", background: `${(editingProject ? editForm.categoryColor : selected.categoryColor)}28`, border: `1px solid ${(editingProject ? editForm.categoryColor : selected.categoryColor)}80`, color: editingProject ? editForm.categoryColor : selected.categoryColor, padding: "3px 11px", borderRadius: 20, fontSize: 9, fontWeight: 800, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 12 }}>
                      {editingProject ? editForm.category || selected.category : selected.category}
                    </span>
                    {/* Project title */}
                    <div style={{ fontSize: 26, fontWeight: 900, color: ANO.white, marginBottom: 16, lineHeight: 1.15 }}>
                      <span style={{ color: "rgba(255,255,255,0.38)", marginRight: 10, fontWeight: 400, fontSize: 22 }}>{editingProject ? editForm.code : selected.code}</span>
                      {editingProject ? editForm.name : selected.name}
                    </div>
                    {/* Stats chips */}
                    {!editingProject && (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 20, padding: "5px 13px", fontSize: 11, color: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center", gap: 5, backdropFilter: "blur(4px)" }}>
                          <span style={{ fontWeight: 800, color: ANO.accent, fontSize: 13 }}>{selected.postotak}%</span>
                          <span>završeno</span>
                        </div>
                        <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 20, padding: "5px 13px", fontSize: 11, color: "rgba(255,255,255,0.9)", backdropFilter: "blur(4px)" }}>
                          👥 {selected.tim.length} {selected.tim.length === 1 ? "član" : "članova tima"}
                        </div>
                        <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 20, padding: "5px 13px", fontSize: 11, color: "rgba(255,255,255,0.9)", backdropFilter: "blur(4px)" }}>
                          📅 {selected.trajanje} · {selected.start !== "—" ? fmtDate(selected.start) : "—"} – {selected.end !== "—" ? fmtDate(selected.end) : "—"}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 8, flexShrink: 0, marginLeft: 24, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {!editingProject && confirmDeleteId === selected.id ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(192,57,43,0.18)", border: "1px solid rgba(255,100,100,0.5)", borderRadius: 8, padding: "6px 12px" }}>
                        <span style={{ fontSize: 11, color: "rgba(255,200,200,0.9)" }}>Obrisati projekt?</span>
                        <button onClick={() => deleteProject(selected.id)} style={{ background: "#C0392B", border: "none", color: "#fff", borderRadius: 5, padding: "4px 11px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>Da, obriši</button>
                        <button onClick={() => setConfirmDeleteId(null)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.7)", borderRadius: 5, padding: "4px 11px", cursor: "pointer", fontSize: 11 }}>Odustani</button>
                      </div>
                    ) : !editingProject ? (
                      <button onClick={() => setConfirmDeleteId(selected.id)} style={{ background: "transparent", border: "1px solid rgba(255,100,100,0.4)", color: "rgba(255,150,150,0.9)", borderRadius: 7, padding: "7px 15px", cursor: "pointer", fontSize: 12 }}>Obriši</button>
                    ) : null}
                    {!editingProject && (
                      <button onClick={startEdit} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.28)", color: ANO.white, borderRadius: 7, padding: "7px 17px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>✏ Uredi</button>
                    )}
                    {editingProject && (
                      <>
                        <button onClick={cancelEdit} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.25)", color: "rgba(255,255,255,0.7)", borderRadius: 7, padding: "7px 15px", cursor: "pointer", fontSize: 12 }}>Odustani</button>
                        <button onClick={saveEditedProject} style={{ background: ANO.accent, border: "none", color: ANO.white, borderRadius: 7, padding: "7px 20px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>✓ Spremi</button>
                      </>
                    )}
                    {!editingProject && (
                      <button onClick={() => { setSelectedId(null); setEditingProject(false); setEditForm(null); setConfirmDeleteId(null); }} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.25)", color: "rgba(255,255,255,0.7)", borderRadius: 7, padding: "7px 15px", cursor: "pointer", fontSize: 12 }}>← Nazad</button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: "28px 32px", display: editingProject ? "block" : "grid", gridTemplateColumns: "1fr 1fr", gap: 32, background: ANO.white }}>
              {/* LEFT COLUMN */}
              <div>
                {editingProject ? (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: 10, marginBottom: 14 }}>
                      <div>
                        <Label>Oznaka</Label>
                        <input value={editForm.code} onChange={e => setEF("code")(e.target.value)} style={{ width:"100%", padding:"9px 12px", fontSize:14, border:`1px solid ${ANO.border}`, borderRadius:6, color:ANO.text, background:ANO.bg, boxSizing:"border-box", outline:"none" }} />
                      </div>
                      <div>
                        <Label>Naziv projekta</Label>
                        <input value={editForm.name} onChange={e => setEF("name")(e.target.value)} style={{ width:"100%", padding:"9px 12px", fontSize:14, border:`1px solid ${ANO.border}`, borderRadius:6, color:ANO.text, background:ANO.bg, boxSizing:"border-box", outline:"none" }} />
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginBottom: 14 }}>
                      <div>
                        <Label>Kategorija</Label>
                        <input value={editForm.category} onChange={e => setEF("category")(e.target.value)} style={{ width:"100%", padding:"9px 12px", fontSize:14, border:`1px solid ${ANO.border}`, borderRadius:6, color:ANO.text, background:ANO.bg, boxSizing:"border-box", outline:"none" }} />
                      </div>
                      <div>
                        <Label>Boja</Label>
                        <div style={{ display: "flex", gap: 5, marginTop: 4 }}>
                          {[ANO.accent,"#1E7C4D","#D4870A","#7B3FA0","#C0392B",ANO.navy].map(c => (
                            <div key={c} onClick={() => setEF("categoryColor")(c)} style={{ width: 22, height: 22, borderRadius: "50%", background: c, cursor: "pointer", border: editForm.categoryColor === c ? "3px solid #333" : "3px solid transparent" }} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 14 }}>
                      <div><Label>Svrha projekta</Label>
                      <textarea rows={5} value={editForm.svrha} onChange={e => setEF("svrha")(e.target.value)} style={{ width:"100%", padding:"9px 12px", fontSize:14, border:`1px solid ${ANO.border}`, borderRadius:6, color:ANO.text, background:ANO.bg, boxSizing:"border-box", outline:"none", resize:"vertical" }} />
                      </div></div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 14 }}><div>
                      <Label>Cilj</Label>
                      <textarea rows={4} value={editForm.cilj} onChange={e => setEF("cilj")(e.target.value)} style={{ width:"100%", padding:"9px 12px", fontSize:14, border:`1px solid ${ANO.border}`, borderRadius:6, color:ANO.text, background:ANO.bg, boxSizing:"border-box", outline:"none", resize:"vertical" }} />
                      </div></div>
                    <div style={{ marginBottom: 14 }}>
                      <Label>Projektni tim (odvojeni zarezima)</Label>
                      <input value={editForm.timInput} onChange={e => setEF("timInput")(e.target.value)} placeholder="Anka, Matija, Ivan…" style={{ width:"100%", padding:"9px 12px", fontSize:14, border:`1px solid ${ANO.border}`, borderRadius:6, color:ANO.text, background:ANO.bg, boxSizing:"border-box", outline:"none" }} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
                      <div><Label>Početak (MM.GGGG)</Label><input value={editForm.start} onChange={e => setEF("start")(e.target.value)} placeholder="03.2026" style={{ width:"100%", padding:"9px 12px", fontSize:14, border:`1px solid ${ANO.border}`, borderRadius:6, color:ANO.text, background:ANO.bg, boxSizing:"border-box", outline:"none" }} /></div>
                      <div><Label>Kraj (MM.GGGG)</Label><input value={editForm.end} onChange={e => setEF("end")(e.target.value)} placeholder="09.2026" style={{ width:"100%", padding:"9px 12px", fontSize:14, border:`1px solid ${ANO.border}`, borderRadius:6, color:ANO.text, background:ANO.bg, boxSizing:"border-box", outline:"none" }} /></div>
                      <div><Label>Trajanje</Label><input value={editForm.trajanje} onChange={e => setEF("trajanje")(e.target.value)} placeholder="6 mj." style={{ width:"100%", padding:"9px 12px", fontSize:14, border:`1px solid ${ANO.border}`, borderRadius:6, color:ANO.text, background:ANO.bg, boxSizing:"border-box", outline:"none" }} /></div>
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <Label>Napomene / bilješke</Label>
                      <textarea rows={4} value={editNapomena} onChange={e => setEditNapomena(e.target.value)}
                        onBlur={() => setEF && setEditForm(f => f ? {...f} : f)}
                        style={{ width:"100%", padding:"9px 12px", fontSize:14, border:`1px solid ${ANO.border}`, borderRadius:6, color:ANO.text, background:ANO.bg, boxSizing:"border-box", outline:"none", resize:"vertical" }} />
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <Label>Linkovi / aplikacije</Label>
                        <button onClick={() => setEditForm(f => ({ ...f, linkovi: [...(f.linkovi||[]), { id: Date.now(), naziv: "", url: "" }] }))}
                          style={{ fontSize: 11, padding: "3px 12px", background: ANO.lightBlue, color: ANO.blue, border: `1px solid ${ANO.border}`, borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>+ Dodaj link</button>
                      </div>
                      {(editForm.linkovi || []).length === 0 && (
                        <div style={{ fontSize: 12, color: ANO.muted, fontStyle: "italic" }}>Nema linkova — dodajte link na aplikaciju, portal ili dokument</div>
                      )}
                      {(editForm.linkovi || []).map((lnk, li) => (
                        <div key={lnk.id || li} style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 6, marginBottom: 6 }}>
                          <input value={lnk.naziv} onChange={e => setEditForm(f => ({ ...f, linkovi: f.linkovi.map((l,i) => i===li ? {...l, naziv: e.target.value} : l) }))}
                            placeholder="Naziv (npr. Admin panel)" style={{ padding: "6px 10px", fontSize: 12, border: `1px solid ${ANO.border}`, borderRadius: 5, color: ANO.text, background: ANO.white, outline: "none" }} />
                          <input value={lnk.url} onChange={e => setEditForm(f => ({ ...f, linkovi: f.linkovi.map((l,i) => i===li ? {...l, url: e.target.value} : l) }))}
                            placeholder="https://…" style={{ padding: "6px 10px", fontSize: 12, border: `1px solid ${ANO.border}`, borderRadius: 5, color: ANO.text, background: ANO.white, outline: "none" }} />
                          <button onClick={() => setEditForm(f => ({ ...f, linkovi: f.linkovi.filter((_,i) => i!==li) }))}
                            style={{ background: "none", border: `1px solid ${ANO.border}`, borderRadius: 5, color: ANO.muted, cursor: "pointer", fontSize: 16, padding: "0 8px" }}
                            onMouseEnter={e => e.currentTarget.style.color="#C0392B"} onMouseLeave={e => e.currentTarget.style.color=ANO.muted}>×</button>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <Label>Ukupni status</Label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                        {Object.entries(statusConfig).map(([k, cfg]) => (
                          <button key={k} onClick={() => {
                            updateProjectStatus(selected.id, k);
                          }} style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", border: selected.ukupniStatus === k ? `2px solid ${cfg.color}` : `1px solid ${ANO.border}`, background: selected.ukupniStatus === k ? cfg.bg : ANO.white, color: selected.ukupniStatus === k ? cfg.color : ANO.muted }}>{cfg.label}</button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {selected.svrha && <div style={{ marginBottom: 16, borderLeft: `3px solid ${selected.categoryColor}`, background: ANO.bg, borderRadius: "0 8px 8px 0", padding: "12px 16px" }}><Label>Svrha projekta</Label><p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.72, color: ANO.text }}>{selected.svrha}</p></div>}
                    {selected.cilj  && <div style={{ marginBottom: 16, borderLeft: `3px solid ${ANO.accent}`, background: `rgba(0,163,224,0.06)`, borderRadius: "0 8px 8px 0", padding: "12px 16px" }}><Label>Cilj</Label><p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.72, color: ANO.text }}>{selected.cilj}</p></div>}
                    <div style={{ marginBottom: 18 }}>
                      <Label>Ukupni status projekta</Label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                        {Object.entries(statusConfig).map(([k, cfg]) => (
                          <button key={k} onClick={() => updateProjectStatus(selected.id, k)} style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", border: selected.ukupniStatus === k ? `2px solid ${cfg.color}` : `1px solid ${ANO.border}`, background: selected.ukupniStatus === k ? cfg.bg : ANO.white, color: selected.ukupniStatus === k ? cfg.color : ANO.muted }}>{cfg.label}</button>
                        ))}
                      </div>
                    </div>
                    {/* NA POTEZU + KRONOLOŠKI LOG */}
                    <div style={{ marginBottom: 18 }}>

                      {/* ── BLOK 1: Tko je sada na potezu ── */}
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <Label>🟡 Tko je sada na potezu</Label>
                          {!editingNaPotezu && (
                            <button onClick={() => { setEditingNaPotezu(selected.id); setNaPotezuDraft({ korak: selected.naPotezu?.korak || "", rok: selected.naPotezu?.rok || "" }); }}
                              style={{ fontSize: 11, padding: "3px 12px", background: "#FFFBF0", color: "#B07D00", border: "1px solid #E8C97A", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
                              ✏ Uredi
                            </button>
                          )}
                        </div>

                        {editingNaPotezu === selected.id ? (
                          <div style={{ background: "#FFFBF0", border: "1px solid #D4870A", borderRadius: 8, padding: 12 }}>
                            <div style={{ marginBottom: 8 }}>
                              <div style={{ fontSize: 11, color: ANO.muted, marginBottom: 4 }}>Na potezu</div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                                {selected.tim.map(ime => (
                                  <button key={ime} onClick={() => updateNaPotezu(selected.id, "osoba", ime)}
                                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 10px 3px 4px", borderRadius: 20, cursor: "pointer", fontSize: 11, fontWeight: 600,
                                      background: selected.naPotezu?.osoba === ime ? avatarColor(ime) : ANO.lightBlue,
                                      color: selected.naPotezu?.osoba === ime ? "#fff" : ANO.navy,
                                      border: `2px solid ${selected.naPotezu?.osoba === ime ? avatarColor(ime) : ANO.border}` }}>
                                    <div style={{ width: 16, height: 16, borderRadius: "50%", background: selected.naPotezu?.osoba === ime ? "rgba(255,255,255,0.3)" : avatarColor(ime), color: "#fff", fontSize: 7, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{initials(ime)}</div>
                                    {ime}
                                  </button>
                                ))}
                                <button onClick={() => updateNaPotezu(selected.id, "osoba", "")}
                                  style={{ padding: "3px 10px", borderRadius: 20, cursor: "pointer", fontSize: 11, background: !selected.naPotezu?.osoba ? ANO.lightBlue : ANO.white, color: ANO.muted, border: `1px solid ${ANO.border}` }}>Nitko</button>
                              </div>
                            </div>
                            <div style={{ marginBottom: 8 }}>
                              <div style={{ fontSize: 11, color: ANO.muted, marginBottom: 4 }}>Što treba napraviti / što se čeka</div>
                              <textarea value={naPotezuDraft.korak} rows={2}
                                onChange={e => setNaPotezuDraft(d => ({ ...d, korak: e.target.value }))}
                                onBlur={e => updateNaPotezu(selected.id, "korak", e.target.value)}
                                placeholder="npr. Čekamo potvrdu od Wienera, rok 15.5."
                                style={{ width: "100%", padding: "6px 10px", fontSize: 12, border: "1px solid #D4870A", borderRadius: 6, resize: "none", boxSizing: "border-box", color: ANO.text, background: "#fffff8", outline: "none" }} />
                            </div>
                            <div style={{ marginBottom: 10 }}>
                              <div style={{ fontSize: 11, color: ANO.muted, marginBottom: 4 }}>Rok (DD.MM.GGGG)</div>
                              <input type="text" value={naPotezuDraft.rok} placeholder="npr. 15.05.2026"
                                onChange={e => setNaPotezuDraft(d => ({ ...d, rok: e.target.value }))}
                                onBlur={e => updateNaPotezu(selected.id, "rok", e.target.value)}
                                style={{ padding: "6px 10px", fontSize: 12, border: `1px solid ${ANO.border}`, borderRadius: 6, color: ANO.text, background: ANO.white, outline: "none", width: 150 }} />
                            </div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 2 }}>
                              <button onClick={() => {
                                // Flush draft to projects then save once
                                const upd = p => p.id !== selected.id ? p : {
                                  ...p,
                                  naPotezu: { ...(p.naPotezu || {}), korak: naPotezuDraft.korak, rok: naPotezuDraft.rok }
                                };
                                const newProjects = (projectsRef.current || []).map(upd);
                                projectsRef.current = newProjects;
                                setProjects(newProjects);
                                setSaveStatus("saving");
                                saveToStorage(newProjects)
                                  .then(() => {
                                    const now = new Date();
                                    setLastSaved(`${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}`);
                                    setSaveStatus("saved");
                                    setTimeout(() => setSaveStatus("idle"), 3000);
                                  })
                                  .catch(() => setSaveStatus("error"));
                                setEditingNaPotezu(null);
                              }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 16px", background: "#1E7C4D", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                                <span style={{ fontSize: 14 }}>💾</span> Spremi i zatvori
                              </button>
                              <button onClick={() => setEditingNaPotezu(null)} style={{ padding: "6px 12px", background: "transparent", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, cursor: "pointer", fontSize: 11 }}>Zatvori bez spremanja</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ padding: "10px 14px", background: selected.naPotezu?.osoba ? "#FFFBF0" : ANO.bg,
                            border: `1px solid ${selected.naPotezu?.osoba ? "#D4870A" : ANO.border}`, borderRadius: 8 }}>
                            {selected.naPotezu?.osoba ? (
                              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                                <div style={{ width: 30, height: 30, borderRadius: "50%", background: avatarColor(selected.naPotezu.osoba), color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{initials(selected.naPotezu.osoba)}</div>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: "#B07D00" }}>Na potezu: {selected.naPotezu.osoba}</div>
                                  {selected.naPotezu.korak && <div style={{ fontSize: 12, color: ANO.text, marginTop: 3, lineHeight: 1.55 }}>{selected.naPotezu.korak}</div>}
                                  {selected.naPotezu.rok   && <div style={{ fontSize: 11, color: "#C0392B", marginTop: 3, fontWeight: 600 }}>🗓 Rok: {fmtDate(selected.naPotezu.rok)}</div>}
                                </div>
                              </div>
                            ) : (
                              <span style={{ fontSize: 12, color: ANO.muted, fontStyle: "italic" }}>Nije postavljeno — kliknite Uredi za unos</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* ── BLOK 2: Kronologija aktivnosti ── */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <Label>📋 Kronologija aktivnosti</Label>
                          <button onClick={() => { setShowLogForm(s => !s); setLogForm({ datum: todayStr(), osoba: selected.tim[0] || "", biljeska: "" }); }}
                            style={{ fontSize: 11, padding: "3px 12px", background: ANO.lightBlue, color: ANO.blue, border: `1px solid ${ANO.border}`, borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
                            + Dodaj korak
                          </button>
                        </div>

                        {/* Form za dodavanje */}
                        {showLogForm && (
                          <div style={{ background: ANO.lightBlue, border: `1px solid ${ANO.border}`, borderRadius: 8, padding: 12, marginBottom: 8 }}
                            onClick={e => e.stopPropagation()}>
                            <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: 8, marginBottom: 8 }}>
                              <div>
                                <div style={{ fontSize: 11, color: ANO.muted, marginBottom: 3 }}>Datum (DD.MM.GGGG)</div>
                                <input type="text" value={logForm.datum} placeholder="26.04.2026"
                                  onChange={e => setLogForm(f => ({ ...f, datum: e.target.value }))}
                                  style={{ width: "100%", padding: "6px 8px", fontSize: 12, border: `1px solid ${ANO.border}`, borderRadius: 5, color: ANO.text, background: ANO.white, outline: "none", boxSizing: "border-box" }} />
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: ANO.muted, marginBottom: 3 }}>Tko</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                  {selected.tim.map(ime => (
                                    <button key={ime} onClick={() => setLogForm(f => ({ ...f, osoba: ime }))}
                                      style={{ padding: "3px 8px", borderRadius: 12, cursor: "pointer", fontSize: 11, fontWeight: 600,
                                        background: logForm.osoba === ime ? avatarColor(ime) : ANO.white,
                                        color: logForm.osoba === ime ? "#fff" : ANO.navy,
                                        border: `1px solid ${logForm.osoba === ime ? avatarColor(ime) : ANO.border}` }}>
                                      {ime}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div style={{ marginBottom: 8 }}>
                              <div style={{ fontSize: 11, color: ANO.muted, marginBottom: 3 }}>Što se napravilo / dogovorilo</div>
                              <textarea value={logForm.biljeska} rows={2} autoFocus
                                onChange={e => setLogForm(f => ({ ...f, biljeska: e.target.value }))}
                                placeholder="npr. Dogovoreno s Wienerom — dostavljaju API dokumentaciju do 30.4."
                                style={{ width: "100%", padding: "6px 10px", fontSize: 12, border: `1px solid ${ANO.border}`, borderRadius: 5, resize: "none", boxSizing: "border-box", color: ANO.text, background: ANO.white, outline: "none" }} />
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button onClick={() => {
                                if (!logForm.biljeska.trim()) return;
                                addLogEntry(selected.id, { datum: logForm.datum || todayStr(), osoba: logForm.osoba, biljeska: logForm.biljeska.trim() });
                                setShowLogForm(false);
                                setLogForm({ datum: todayStr(), osoba: selected.tim[0] || "", biljeska: "" });
                              }} style={{ padding: "5px 16px", background: ANO.navy, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
                                ＋ Spremi u kronologiju
                              </button>
                              <button onClick={() => setShowLogForm(false)} style={{ padding: "5px 12px", background: ANO.white, color: ANO.muted, border: `1px solid ${ANO.border}`, borderRadius: 6, cursor: "pointer", fontSize: 11 }}>Odustani</button>
                            </div>
                          </div>
                        )}

                        {/* Prikaz kronologije */}
                        {((selected.naPotezu?.log) || []).length > 0 ? (
                          <div style={{ borderLeft: `2px solid ${ANO.border}`, marginLeft: 10, paddingLeft: 14, display: "flex", flexDirection: "column", gap: 6 }}>
                            {[...(selected.naPotezu?.log || [])].reverse().map((entry, i) => (
                              <div key={entry.id || i} style={{ position: "relative" }}>
                                <div style={{ position: "absolute", left: -19, top: 7, width: 8, height: 8, borderRadius: "50%", background: entry.osoba ? avatarColor(entry.osoba) : ANO.muted, border: `2px solid ${ANO.white}` }} />
                                <div style={{ background: ANO.white, border: `1px solid ${ANO.border}`, borderRadius: 7, padding: "8px 10px" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                      {entry.osoba && (
                                        <div style={{ width: 16, height: 16, borderRadius: "50%", background: avatarColor(entry.osoba), color: "#fff", fontSize: 7, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{initials(entry.osoba)}</div>
                                      )}
                                      <span style={{ fontSize: 11, fontWeight: 700, color: ANO.navy }}>{entry.osoba || "—"}</span>
                                      <span style={{ fontSize: 10, color: ANO.muted }}>· {fmtDate(entry.datum)}</span>
                                    </div>
                                    <button onClick={() => deleteLogEntry(selected.id, entry.id)}
                                      style={{ background: "none", border: "none", color: ANO.border, cursor: "pointer", fontSize: 14, padding: "0 2px", lineHeight: 1 }}
                                      onMouseEnter={e => e.currentTarget.style.color = "#C0392B"}
                                      onMouseLeave={e => e.currentTarget.style.color = ANO.border}>×</button>
                                  </div>
                                  <div style={{ fontSize: 12, color: ANO.text, lineHeight: 1.5 }}>{entry.biljeska}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ padding: "10px 14px", background: ANO.bg, border: `1px dashed ${ANO.border}`, borderRadius: 8, fontSize: 12, color: ANO.muted, fontStyle: "italic" }}>
                            Nema evidentiranih koraka — kliknite "+ Dodaj korak" za unos prve aktivnosti
                          </div>
                        )}
                      </div>

                    </div>
                    <div style={{ marginBottom: 18 }}>
                      <Label>Projektni tim</Label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 8 }}>
                        {selected.tim.map((ime, i) => (
                          <div key={ime+i} style={{ display: "flex", alignItems: "center", gap: 6, background: ANO.lightBlue, border: `1px solid ${ANO.border}`, borderRadius: 20, padding: "4px 12px 4px 5px" }}>
                            <div style={{ width: 22, height: 22, borderRadius: "50%", background: avatarColor(ime), color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{initials(ime)}</div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: ANO.navy }}>{ime}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>Napomene / bilješke</Label>
                      {editingNapomena ? (
                        <div style={{ marginTop: 6 }}>
                          <textarea value={editNapomena} onChange={e => setEditNapomena(e.target.value)} rows={3}
                            style={{ width: "100%", padding: 10, fontSize: 13, border: `2px solid ${ANO.blue}`, borderRadius: 6, resize: "vertical", boxSizing: "border-box", color: ANO.text, outline: "none" }} />
                          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                            <button onClick={() => saveNapomena(selected.id)} style={{ padding: "6px 16px", background: ANO.navy, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Spremi</button>
                            <button onClick={() => setEditingNapomena(false)} style={{ padding: "6px 14px", background: ANO.white, color: ANO.muted, border: `1px solid ${ANO.border}`, borderRadius: 6, cursor: "pointer", fontSize: 12 }}>Odustani</button>
                          </div>
                        </div>
                      ) : (
                        <div onClick={() => { setEditNapomena(selected.napomene); setEditingNapomena(true); }}
                          style={{ marginTop: 6, minHeight: 56, padding: 10, fontSize: 13, color: selected.napomene ? ANO.text : ANO.muted, border: `1px dashed ${ANO.border}`, borderRadius: 6, cursor: "pointer", lineHeight: 1.6, background: ANO.bg }}>
                          {selected.napomene || "Kliknite za dodavanje napomena…"}
                        </div>
                      )}
                    </div>

                    {/* LINKOVI */}
                    {(selected.linkovi || []).length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <Label>🔗 Linkovi i aplikacije</Label>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                          {(selected.linkovi || []).filter(l => l.url).map((lnk, i) => (
                            <a key={i} href={lnk.url} target="_blank" rel="noopener noreferrer"
                              style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", background: ANO.lightBlue, border: `1px solid ${ANO.border}`, borderRadius: 8, textDecoration: "none", transition: "all 0.15s" }}
                              onMouseEnter={e => { e.currentTarget.style.background = ANO.accent; e.currentTarget.style.borderColor = ANO.accent; e.currentTarget.querySelector("span").style.color="#fff"; e.currentTarget.querySelector("div").style.color="#fff"; }}
                              onMouseLeave={e => { e.currentTarget.style.background = ANO.lightBlue; e.currentTarget.style.borderColor = ANO.border; e.currentTarget.querySelector("span").style.color=ANO.navy; e.currentTarget.querySelector("div").style.color=ANO.muted; }}>
                              <div style={{ width: 28, height: 28, borderRadius: 6, background: ANO.white, border: `1px solid ${ANO.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🔗</div>
                              <div style={{ flex: 1 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: ANO.navy, display: "block" }}>{lnk.naziv || lnk.url}</span>
                                <div style={{ fontSize: 10, color: ANO.muted, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lnk.url}</div>
                              </div>
                              <span style={{ fontSize: 11, color: ANO.navy, fontWeight: 600 }}>Otvori →</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* RIGHT COLUMN – faze (full width in edit mode) */}
              <div style={{ marginTop: editingProject ? 20 : 0 }}>
                {editingProject ? (
                  <>
                    <div style={{ borderTop: `1px solid ${ANO.border}`, paddingTop: 20 }} />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <Label>Ključne faze / aktivnosti</Label>
                      <button onClick={addEditFaza} style={{ fontSize: 11, padding: "3px 12px", background: ANO.lightBlue, color: ANO.blue, border: `1px solid ${ANO.border}`, borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>+ Dodaj fazu</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {editForm.faze.map((faza, idx) => (
                        <div key={faza.id} style={{ display: "flex", gap: 6, alignItems: "flex-start", background: ANO.bg, border: `1px solid ${ANO.border}`, borderRadius: 8, padding: "8px 10px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingTop: 2 }}>
                            <button onClick={() => moveEditFaza(idx, -1)} disabled={idx === 0} style={{ background: "none", border: "none", cursor: idx===0?"default":"pointer", color: idx===0?ANO.border:ANO.muted, fontSize: 10, padding: "0 2px", lineHeight: 1 }}>▲</button>
                            <button onClick={() => moveEditFaza(idx, 1)} disabled={idx === editForm.faze.length-1} style={{ background: "none", border: "none", cursor: idx===editForm.faze.length-1?"default":"pointer", color: idx===editForm.faze.length-1?ANO.border:ANO.muted, fontSize: 10, padding: "0 2px", lineHeight: 1 }}>▼</button>
                          </div>
                          <div style={{ width: 20, height: 20, borderRadius: "50%", background: editForm.categoryColor, color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 3 }}>{idx+1}</div>
                          <textarea rows={2} value={faza.naziv} onChange={e => updateFazaNaziv(faza.id, e.target.value)}
                            style={{ flex: 1, padding: "7px 10px", fontSize: 13, border: `1px solid ${ANO.border}`, borderRadius: 5, resize: "vertical", color: ANO.text, background: ANO.white, outline: "none" }} />
                          <select value={faza.status} onChange={e => setEditForm(f => ({...f, faze: f.faze.map(fz => fz.id===faza.id ? {...fz, status:e.target.value} : fz)}))}
                            style={{ fontSize: 10, padding: "3px 4px", border: `1px solid ${ANO.border}`, borderRadius: 4, color: ANO.text, background: ANO.white, cursor: "pointer", flexShrink: 0 }}>
                            {Object.entries(statusConfig).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                          {editForm.faze.length > 1 && (
                            <button onClick={() => removeEditFaza(faza.id)} style={{ background: "none", border: "none", color: "#C0392B", cursor: "pointer", fontSize: 16, padding: "0 2px", flexShrink: 0 }}>×</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    {(!selected.faze || selected.faze.length === 0) ? (
                      // Mini project — no faze, just timeline
                      <div style={{ padding: 20, background: ANO.lightBlue, border: `1px solid ${ANO.border}`, borderRadius: 10 }}>
                        <Label>Vremenski okvir</Label>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 10, marginBottom: 20 }}>
                          <div><span style={{ color: ANO.muted, fontSize: 11 }}>Početak</span><br /><strong style={{ color: ANO.navy, fontSize: 15 }}>{selected.start !== "—" ? fmtDate(selected.start) : "—"}</strong></div>
                          <div style={{ textAlign: "right" }}><span style={{ color: ANO.muted, fontSize: 11 }}>Kraj</span><br /><strong style={{ color: ANO.navy, fontSize: 15 }}>{selected.end !== "—" ? fmtDate(selected.end) : "—"}</strong></div>
                        </div>
                        <div style={{ height: 6, borderRadius: 6, background: `${ANO.border}`, position: "relative", overflow: "hidden" }}>
                          <div style={{ position: "absolute", inset: 0, background: selected.categoryColor || "#5B6B99", borderRadius: 6, opacity: 0.4 }} />
                        </div>
                        <div style={{ marginTop: 16, fontSize: 12, color: ANO.muted, fontStyle: "italic", textAlign: "center" }}>Jednokratni zadatak · maks. 2 tjedna</div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <Label>Ključne faze / aktivnosti</Label>
                          <span style={{ fontSize: 15, fontWeight: 900, color: selected.categoryColor }}>{selected.postotak}%</span>
                        </div>
                        <div style={{ background: ANO.lightBlue, borderRadius: 6, height: 7, marginBottom: 16 }}>
                          <div style={{ height: 7, borderRadius: 6, background: selected.categoryColor, width: `${selected.postotak}%`, transition: "width 0.35s" }} />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {selected.faze.map(faza => {
                            const sc = statusConfig[faza.status] || statusConfig.nije_zapoceto;
                            return (
                              <div key={faza.id} style={{ background: ANO.bg, border: `1px solid ${ANO.border}`, borderRadius: 8, padding: "11px 13px", display: "flex", alignItems: "flex-start", gap: 10 }}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: sc.dot, marginTop: 4, flexShrink: 0 }} />
                                <div style={{ flex: 1, fontSize: 12, lineHeight: 1.5, color: ANO.text }}>{faza.naziv}</div>
                                <select value={faza.status} onChange={e => updateFazaStatus(selected.id, faza.id, e.target.value)}
                                  style={{ fontSize: 10, padding: "3px 6px", border: `1px solid ${sc.color}`, borderRadius: 4, background: sc.bg, color: sc.color, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
                                  {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                </select>
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ marginTop: 16, padding: 14, background: ANO.lightBlue, border: `1px solid ${ANO.border}`, borderRadius: 8 }}>
                          <Label>Vremenski okvir</Label>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 8 }}>
                            <div><span style={{ color: ANO.muted, fontSize: 11 }}>Početak</span><br /><strong style={{ color: ANO.navy }}>{selected.start !== "—" ? fmtDate(selected.start) : "—"}</strong></div>
                            <div style={{ textAlign: "center" }}><span style={{ color: ANO.muted, fontSize: 11 }}>Trajanje</span><br /><strong style={{ color: ANO.navy }}>{selected.trajanje}</strong></div>
                            <div style={{ textAlign: "right" }}><span style={{ color: ANO.muted, fontSize: 11 }}>Kraj</span><br /><strong style={{ color: ANO.navy }}>{selected.end !== "—" ? fmtDate(selected.end) : "—"}</strong></div>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "28px", color: ANO.muted, fontSize: 13, background: ANO.white, border: `1px dashed ${ANO.border}`, borderRadius: 10 }}>
            ↑ Kliknite na projekt za prikaz detalja i ažuriranje statusa faza
          </div>
        )}

        <div style={{ marginTop: 20, borderTop: `1px solid ${ANO.border}`, paddingTop: 14, display: "flex", justifyContent: "space-between", fontSize: 11, color: ANO.muted }}>
          <span style={{ fontWeight: 700, color: ANO.navy }}>ANO d.o.o.</span>
          <span>{projects.length} projekata · {doneTotal} od {totalFaze} faza završeno{lastSaved ? ` · zadnje spremljeno u ${lastSaved}` : ""}</span>
        </div>
      </div>
    </div>
  );
}
