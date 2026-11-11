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

### Tipografies (56 famílies OFL, ja instal·lades)

Mira `exemples/tipografies.png` abans de triar: cada família hi és a mida de títol amb la seva
veu, agrupades (serifes, egípcies, sans, condensades, de cartell, mono, de mà, píxel). Totes
tenen la ela geminada, « » i €. Les variables accepten qualsevol pes del seu rang
(`font-weight: 650`).

- Una per als títols, una per al text (dues de la mateixa família també val). Tria la de
  títols com un objecte del món del client: una condensada de rètol per a transport o esport,
  una Bodoni per a moda, una egípcia negra per a una botiga de barri, una serif "old style"
  (Fraunces) per a un producte artesà.
- Les més "per defecte" (Instrument Serif, Young Serif, Inter Tight) només amb una raó.
- Mono només per a xifres, codi o noms de fitxer; de mà (Caveat) només per a una anotació curta
  sobre un gràfic; píxel només per a etiquetes petites.
- Mai Arial, Helvetica ni la lletra del sistema. Només es carreguen les famílies que el CSS
  anomena, així que fer-ne servir una no alenteix res.

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

## 3b. Gust: escala, espai i acabat

El que fa que una presentació sembli cara no és afegir-hi coses, sinó que cada mida, cada
espai i cada línia surtin d'un sistema. Abans del codi, defineix-lo a `:root` i no en surtis.

- **Escala tipogràfica.** Tria una ràtio (1,333 per a presentacions sòbries, 1,5 o 1,618 per a
  les que criden) i treu-ne 5 o 6 mides a partir del text (24 px): `--t-text`, `--t-sub`,
  `--t-titol`, `--t-gran`, `--t-xifra`. Cap mida fora de l'escala. Si dues mides estan a menys
  d'un esglaó (40 i 44 px), són la mateixa: tria'n una.
- **Pesos amb intenció, i pocs de negres.** La negreta és un recurs escàs: només l'element
  protagonista de la diapositiva (la xifra gegant, l'afirmació) pot anar a 700 o més, i no a
  totes les diapositives. Els títols normals, a 400-600 (una serif de display a 400 ja té prou
  presència); el text, a 400; les etiquetes, a 400-500. Contrast per mida i per espai abans que
  per pes. Dos o tres pesos com a màxim, amb salts que es vegin (mai 400 contra 500). Si la
  presentació, mirada de lluny, sembla negra o "cridada", baixa pesos.
- **Escala d'espais** de 8 en 8 que s'eixampla: 8, 16, 24, 40, 64, 104, 168 (`--e-1` … `--e-7`).
  El que va junt s'agrupa a 8-16 px; els blocs se separen a 64-104. Si tots els espais són
  iguals, no hi ha jerarquia. Més aire sobre un títol que sota.
- **Línies de text** de 30 a 60 caràcters (`max-width: 28ch` a `34ch` amb text de 24-28 px). Un
  bloc de text a tota l'amplada és sempre un error.
- **Aire de debò.** Deixa almenys un terç de cada diapositiva buit. L'espai buit és el que fa
  que l'element principal sembli important; omplir-lo el fa barat.
- **Asimetria pensada.** Proporcions 5/7, 4/8 o 3/9 sobre la graella, mai 6/6 per defecte.
  L'element principal ancorat a una cantonada o a una línia de la graella, no flotant al mig.
- **Una capa de profunditat, ben feta.** Si fas servir capes (una foto que trepitja un camp de
  color, una xifra que surt d'una meitat i entra a l'altra), que sigui un gest deliberat i
  repetit, no un accident. El revisor marca els solapaments; els que vulguis, posa'ls amb
  `position: absolute` abans del text.
- **Acabat.** Línies d'1 px en un to de la paleta (mai gris genèric); ombres cap o molt
  difuses; cantonades rectes o d'un sol radi a tota la presentació. Icones de traç fi i d'un
  sol joc i pes: `phosphor:…-light` o `-thin`, o Lucide/Tabler amb `stroke=1.2-1.5`; el traç 2
  només a mides petites. Mai icones gruixudes a mida gran.
- **Variació.** No repeteixis el mateix esquema de presentació en presentació: el món del client
  decideix si és editorial càlida, estructural i neta, o de contrast fosc; si és fosca, que ho
  sigui per una raó (on es projecta, la marca), no per semblar tecnològica.

## 4. Recursos gràfics

Una presentació feta només de text i barres és pobra. Mira `exemples/recursos.png` (un exemple
de cada recurs) i fes-los servir sempre que el contingut en doni peu: en una presentació de 8 a
10 diapositives n'hi hauria d'haver almenys dos o tres tipus. Com es criden: `recursos.md`.

| Si el contingut parla de… | Fes servir |
| --- | --- |
| llocs: comarques, països, regions d'un país, mercats, sucursals | `mapa()` amb la zona destacada, `punts=` per nom, `rutes=` per a fluxos |
| un país concret | `bandera()` petita al costat del nom, mai com a decoració |
| "X de cada Y", persones, unitats, places | `pictograma()` amb una icona del món del client |
| una part d'un tot o un objectiu ("68 % fet") | `anell()` |
| quina part és de qui (més de 4 parts) | `treemap()`; amb 2-4 parts, `share()` |
| d'on surt una diferència (preus, clients, costos) | `cascada()` |
| un pla amb fases i dates | `calendari()` |
| on es perd la gent pel camí | `embut()` |
| quan passa (hores × dies, mesos × productes) | `calor()` |
| on som dins d'un rang (preus, sous, competència) | `interval()` |
| la suma i les parts al llarg del temps | `apilades()` |
| una xifra amb història | la xifra gegant i `minigrafic()` al costat |
| qui puja i qui baixa entre dos moments | `pendent()` |
| un objecte, un producte, un servei | una icona gran (160-360 px) com a imatge de la diapositiva |
| fotos que ha pujat l'usuari | `foto()` en duotone, trama o línies amb els colors de la presentació |
| una portada o una meitat de color que vol textura | `trama()` (mai sota text) |

- **Icones:** uns 16.000 dibuixos en tres jocs (Lucide, Tabler i Phosphor en sis pesos). Un
  sol joc i un sol pes per presentació, triat pel món: Lucide neutre, Tabler el més ampli,
  Phosphor amb més caràcter (thin elegant, bold o fill contundent, duotone càlid). Grans i
  soles, o com a unitats d'un pictograma. Mai una icona petita davant de cada punt d'una llista
  ni graelles de targetes amb icona.
- **Mapes:** un mapa diu una cosa: destaca només el que demostra el títol, la resta en
  `--tint`. Els d'Espanya i Catalunya són CC BY: deixa el crèdit que hi posa o porta'l a la nota.
- **Fotos:** no hi ha banc d'imatges ni internet. Si l'usuari n'ha pujat, fes-les servir grans
  (a sang, o mitja diapositiva) i tractades amb `foto()` perquè siguin del món de la
  presentació. Si no n'hi ha, no en simulis.

## 5. Tipografia

- Mida mínima: 20 px (el revisor avisa per sota de 18). Text de suport 22-28 px. Títols
  48-72 px. Afirmacions 96-120 px. Xifres i portades 150-520 px. Totes, de la teva escala (3b).
- Interlineat: display 0,9-1,05; text 1,35-1,5. Espaiat de lletra mai per sota de -0,04em.
- Xifres en taules i gràfics amb `font-variant-numeric: tabular-nums` (classe `.num`).
- Català ben escrit: espai fi que no es parteix (`&#8239;`) entre la xifra i el % i el € ("54&#8239;%", "60.000&#8239;€"); mai un espai normal, que deixa el % sol a la línia següent, cometes
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
- Hi ha massa negreta? Només el protagonista pot anar negre.
- Les mides i els espais surten de l'escala? Hi ha un terç d'aire? Els grups es veuen sense caixes?
- Està al nivell de les referències? Si no, què li falta? Fes-ho.
