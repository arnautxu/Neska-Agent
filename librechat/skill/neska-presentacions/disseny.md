# Criteri de disseny per a presentacions

Adaptat d'Impeccable (Paul Bakaus, Apache 2.0) per a diapositives en PDF. L'original, pensat per
a webs, és a `impeccable/craft-floor.md`: les regles de "Refuse" valen tal qual; les de
moviment, hover, focus i responsive no hi apliquen.

Treballa com el director d'art d'un estudi premiat. Una presentació és mode **Persuadir**: el
disseny és el que jutgen. Compromet-te amb una direcció i porta-la fins al final. Correcte i
net no és prou: si sembla una plantilla, has fallat.

## 0. El llistó

Abans de començar la primera presentació de la conversa, obre amb `read_file` els dos fulls de
referència: `exemples/referencia_ruta.png` i `exemples/referencia_fruita.png` (el codi és al
`.py` del costat). Aquest és el nivell mínim d'acabat i d'ambició. **No en copiïs el món, els
colors ni la composició**: el teu client és un altre. Copia'n la convicció: color que ocupa
diapositives senceres, tipografia amb caràcter a mida gran, un gest propi que es repeteix,
gràfics que diuen una sola cosa i cap diapositiva de farciment.

**Prova de memòria:** si algú veu la presentació i se'n va, què recordarà d'aquí a una hora? Si
la resposta és "era neta" o "tenia bons colors", encara no hi ha direcció.

## 1. Tria el món abans de dibuixar res

- **L'encàrrec mana.** Si l'usuari dona colors, logo, tipografia o un estil, fes-ho servir.
- **Si no en dona, busca'l al món del client**, no a la categoria. Pensa en objectes, llocs,
  rituals i gràfics que el seu públic coneix de memòria (senyals de carretera per a una empresa
  de rutes, etiquetes de caixes de fruita per a una cooperativa, la carta d'un restaurant, el
  plànol d'una obra, el marcador d'un partit). D'allà en surten el color, la lletra i el gest.
- **Escriu el món en un comentari CSS** abans del codi, en cinc línies: de quin objecte o lloc
  surt, l'estratègia de color, la parella tipogràfica i per què, el **gest propi** (el recurs
  visual que tornarà a 2 o 3 diapositives) i clar/fosc segons on es projectarà.
- **Calibratge.** Les presentacions fetes per IA cauen sempre en quatre looks: (1) paper crema,
  serifa de contrast alt i accent terracota; (2) gairebé negre amb un neó; (3) diari amb filets
  fins, cursiva i etiquetes petites en majúscules; (4) blocs plans amb ombres dures. Si el client
  no ho demana i el teu món s'hi assembla, refés-lo. Si algú podria endevinar el teu estil només
  sabent el sector, també.

### Estratègia de color (tria'n una i escriu-la)

| Estratègia | Què vol dir | Quan |
| --- | --- | --- |
| **Compromesa** | un color saturat ocupa el 30-60 % de la presentació, en diapositives senceres o meitats | opció per defecte |
| **Inundada** | la presentació *és* el color; les diapositives blanques són la pausa | marques fortes, llançaments, assemblees |
| **Paleta** | 3-4 colors amb rols fixos (un per bloc, per producte, per sèrie) | quan les dades o els blocs ho demanen |
| **Continguda** | neutres i un accent escàs | només si el client és sobri de debò (banca, legal) i ho has de justificar |

El color es compromet a escala de diapositiva: camps que ocupen regions senceres, no detalls
escampats. Comprova el contrast: text blanc sobre un color saturat necessita un to prou fosc
(el revisor ho mesura; si falla, enfosqueix el color, no aclareixis el text).

### Tipografies (totes OFL, ja carregades)

| Família | Veu | Pesos |
| --- | --- | --- |
| Big Shoulders Display | condensada, de rètol o de senyal; contundent | 500, 800 |
| Unbounded | ampla i rodona, d'etiqueta o de marca jove | 400, 700 |
| Gloock | serifa de contrast alt, de revista o de luxe | 400 |
| Bricolage Grotesque | grotesca amb personalitat, càlida | 400, 600, 800 |
| Young Serif | serifa càlida i robusta (és la de Neska) | 400 |
| Instrument Serif | serifa editorial fina, amb cursiva | 400, 400 cursiva |
| Archivo | sans de treball, sòlida; text i xifres | 400, 600, 800 |
| Schibsted Grotesk | sans de diari, clara; text | 400, 500, 700 |
| Instrument Sans | sans neta; text | 400, 500, 600, 700 |

Una per als títols, una per al text. Tria la de títols com un objecte del món del client, no
per costum: Instrument Serif i Young Serif són les més "per defecte", fes-les servir només si
tenen una raó. Mai Arial, Helvetica ni la lletra del sistema.

## 2. Una idea per diapositiva

- El **títol és la conclusió** ("Les reserves es dupliquen en tres temporades"), mai el tema.
- **Una sola cosa es veu primer**: el títol, una xifra o la dada destacada. Desenfoca-la de
  memòria: s'ha de veure què va primer, què va segon i quins grups hi ha.
- **Poques paraules**: títols de 4 a 10 paraules, text de suport de menys de 25. Si no hi cap,
  dues diapositives. Mai lletra més petita.
- 7 a 12 diapositives. Cada una ha de guanyar-se el lloc: res de "índex", "gràcies" buit ni
  "preguntes?" si no aporten res.

## 3. Composició

Fes servir una graella de 12 columnes (`display: grid; grid-template-columns: repeat(12, 1fr);
column-gap: 24px`) i marges de 72-88 px. Repertori (barreja'n almenys cinc de diferents en una
presentació de 8 a 10):

1. **Portada amb gest**: títol enorme ancorat a baix a l'esquerra i el gest propi ocupant
   l'altra meitat (una ruta, una paraula tallada per la vora, una forma del món del client).
2. **Afirmació**: una frase gegant (96-120 px) a 8-9 columnes i una prova petita a les altres 3.
3. **Xifra gegant**: el número a 300-520 px, que ocupa mitja diapositiva o surt per la vora, i
   el context en una columna estreta.
4. **Meitats**: una meitat de color sòlid amb la xifra o la paraula, l'altra en blanc amb
   l'explicació. També en proporció 5/7.
5. **Gràfic d'una sola idea**: títol-conclusió i el gràfic a tota amplada amb la dada destacada.
6. **Repartiment**: una barra al 100 % (`share`) quan la idea és "quina part és de qui".
7. **Mapa o diagrama del món**: un `mapa()` amb la zona que importa, o una ruta, un perfil, un
   procés dibuixat en SVG amb formes netes i dades reals.
8. **Línia de temps** com a objecte del món (punts quilomètrics, collites, fases d'obra).
9. **Taula com una llista de preus**: poques files, xifres alineades a la dreta, total destacat.
10. **Problema / proposta**: dues columnes desiguals, la primera tenyida.
11. **Cita** gran, amb cometes catalanes «», sobre color.
12. **Decisions**: tres columnes desiguals, la primera més gran perquè és la principal.
13. **Tancament que demana alguna cosa**: què es vota, quan, quant.

**Detalls que separen un estudi d'una plantilla:**

- **Contrast d'escala**: l'element principal fa com a mínim 4 vegades la mida del text.
- **Sang**: color a sang (de vora a vora) i, com a gest, text tallat per la vora amb la classe
  `bleed` (el revisor no el comprova; mira'l tu).
- **Ritme**: alterna diapositives de color i blanques, denses i buides. Mai dues composicions
  iguals seguides.
- **Peu discret i constant** (`folio`): nom del client o de la presentació i número de
  diapositiva, a 18 px, en la mateixa posició a totes. No és una etiqueta sobre el títol.
- **Agrupa per proximitat**, no amb caixes. Més espai sobre un títol que sota.
- **Res al mig per defecte**: alinea a l'esquerra i deixa que l'aire faci la feina.

## 4. Recursos gràfics

Una presentació feta només de text i barres és pobra. Tens recursos de debò a `neska_pdf` (mira
`exemples/recursos.png` per veure'ls); fes-los servir sempre que el contingut en doni peu, i en
una presentació de 8 a 10 diapositives n'hi hauria d'haver almenys dos tipus.

| Si el contingut parla de… | Fes servir |
| --- | --- |
| llocs: comarques, províncies, països, mercats, sucursals, clients | `mapa()` amb la zona destacada, `enfoca=` i `punts=` |
| "X de cada Y", persones, unitats, places | `pictograma()` amb una icona del món del client |
| una part d'un tot o un objectiu ("68 % fet") | `anell()` |
| una xifra amb història | la xifra gegant i `minigrafic()` al costat |
| qui puja i qui baixa entre dos moments | `pendent()` |
| un objecte, un producte, un servei | una icona gran (160-360 px, traç 1-1,5) com a imatge de la diapositiva |
| fotos que ha pujat l'usuari | `foto()` en duotone, trama o línies amb els colors de la presentació |
| una portada o una meitat de color que vol textura | `trama()` (mai sota text) |

- **Icones:** 2.356 de Lucide (`icones("bike")` cerca per etiqueta en anglès). Totes amb el
  mateix traç. Grans i soles, o com a unitats d'un pictograma. Mai una icona petita davant de
  cada punt d'una llista ni graelles de targetes amb icona.
- **Mapes:** `mon`, `europa`, `espanya-autonomies`, `espanya-provincies`, `catalunya-provincies`,
  `catalunya-comarques` i `catalunya-municipis` (`mapa_noms()` en dona els noms). Un mapa diu
  una cosa: destaca només el que demostra el títol, la resta en `--tint`. Els d'Espanya i
  Catalunya són CC BY: deixa el crèdit que hi posa o porta'l a la nota.
- **Fotos:** no hi ha banc d'imatges ni internet. Si l'usuari n'ha pujat, fes-les servir grans
  (a sang, o mitja diapositiva) i tractades amb `foto()` perquè siguin del món de la
  presentació. Si no n'hi ha, no en simulis.

## 5. Tipografia

- Mida mínima: 20 px (el revisor avisa per sota de 18). Text de suport 22-28 px. Títols
  48-72 px. Afirmacions 96-120 px. Xifres i portades 150-520 px.
- Interlineat: display 0,9-1,05; text 1,35-1,5. Espaiat de lletra mai per sota de -0,04em.
- Xifres en taules i gràfics amb `font-variant-numeric: tabular-nums` (classe `.num`).
- Català ben escrit: espai fi o normal entre la xifra i el % i el € ("54 %", "60.000 €"), cometes
  «», punt volat a "l·l", guió llarg només si cal.
- Talla els títols a mà (`<br>`) entre frases, mai deixant una paraula sola a l'última línia.

## 6. Gràfics i dades

- `bars`, `hbars`, `line` i `share` de `neska_pdf` ja surten amb els colors i la lletra de la
  presentació. Una sola sèrie si es pot; `highlight` per a la dada que demostra el títol; la
  resta en un to suau. `ghost` per a objectius o previsions (contorn discontinu, mai com si fos
  real). `line(..., area=True, marks={i: "text"})` per a perfils i per anotar un punt.
- Etiqueta directament. Sense llegenda, sense quadrícula, sense eix de valors.
- Les xifres i les afirmacions surten del que diu l'usuari. Si n'has calculat o suposat alguna,
  digues-ho en una nota petita a la diapositiva i a la resposta. Cites i noms de persones:
  només si l'usuari els ha donat.

## 7. Prohibit (reflexos de plantilla)

- **Etiquetes o "kickers" sobre el títol** ("PROPOSTA", "CONTEXT"). Sense excepció.
- **Números de secció** (01, 02, 03) si la seqüència no aporta res.
- **Graella de targetes iguals** (icona + títol + text, tres o quatre vegades).
- **La plantilla de xifra estrella** (número + etiqueta + tres xifres més) com a reflex.
- Vores de color gruixudes a l'esquerra de caixes, degradats, text amb degradat, ombres
  decoratives, vidre o blur, cantonades molt arrodonides, fons de ratlles o quadrícula.
- Emojis o caràcters fent d'icona. Si cal una icona, SVG propi, tot amb el mateix traç.
- Imatges de banc d'imatges, il·lustracions "fetes a mà" i figures humanes en SVG.
- Lletra monoespaiada per fer "tecnològic".
- Tot centrat. Llistes de punts genèriques de PowerPoint.

L'usuari pot demanar explícitament qualsevol d'aquestes coses, excepte els kickers.

## 8. Comprova-ho mirant-ho

Cada volta: genera, obre el full de revisió amb `read_file` i mira totes les diapositives de cop.
Corregeix-ho tot en una sola tanda abans de tornar a generar. Pregunta't:

- Passa la prova de memòria? Hi ha un gest propi que es repeteix?
- El color ocupa regions senceres, com diu l'estratègia que has triat?
- Hi ha almenys cinc composicions diferents i cap de repetida seguida?
- Fa servir els recursos que el contingut demana (mapa si hi ha llocs, pictograma si hi ha
  "X de cada Y", les fotos de l'usuari si n'hi ha)?
- Cada títol es llegeix en un segon i diu una conclusió?
- Hi ha text tallat, trepitjat, massa petit o amb poc contrast? (el revisor el marca en vermell)
- Hi ha algun reflex prohibit, o s'assembla a un dels quatre looks d'IA?
- Està al nivell de les referències? Si no, què li falta? Fes-ho.
