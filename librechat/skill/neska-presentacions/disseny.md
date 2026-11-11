# Criteri de disseny per a presentacions

Adaptat d'Impeccable (Paul Bakaus, Apache 2.0) per a diapositives en PDF. L'original, pensat per
a webs, és a `impeccable/craft-floor.md`. Llegeix-lo una vegada: les regles de "Refuse" valen tal
qual per a diapositives. Les de moviment, hover, focus i responsive no hi apliquen.

Treballa com un director d'art premiat: un punt de vista clar, entendre què necessita qui ho
veurà i un acabat impecable. Una presentació és mode **Persuadir**: el disseny és el que jutgen,
així que compromet-te amb una direcció i porta-la fins al final.

## 1. Tria el món abans de dibuixar res

- **L'encàrrec mana.** Si l'usuari dona colors, logo, tipografia o un estil, fes-ho servir encara
  que no t'agradi. Redirigir-lo cap al teu gust és fallar.
- **Si no en dona, tria'l del tema**, no de l'hàbit de la categoria. Una clínica dental no ha de
  ser blau cel perquè "és salut"; pregunta't com és aquell lloc, aquella gent, aquell producte, i
  tradueix-ho a paper, tinta, color i lletra.
- Escriu el món en tres línies abans de començar (en un comentari dins l'HTML):
  paper i tinta, un color amb un paper concret, la parella tipogràfica i per què.
- **Clar o fosc** segons on es projectarà i qui la veurà, no per costum.
- Per defecte (si és per a Neska o no hi ha cap pista): paper blanc, tinta `#161616`, accent
  marró `#6B3A1E`, Young Serif per als títols i Instrument Sans per al text.

### Tipografies que tens (totes OFL, ja carregades)

| Família | Caràcter | Pesos |
| --- | --- | --- |
| Young Serif | serifa càlida, amb personalitat; títols | 400 |
| Instrument Serif | serifa editorial fina, amb cursiva; títols grans i cites | 400, 400 cursiva |
| Bricolage Grotesque | grotesca expressiva; títols contundents, xifres | 400, 600, 800 |
| Instrument Sans | sans neta i precisa; text, etiquetes, taules | 400, 500, 600, 700 |

Fes servir una família per als títols i Instrument Sans per al text. Dues famílies, mai tres.
No facis servir Arial, Helvetica ni la lletra del sistema com a veu de la presentació.

## 2. Una idea per diapositiva

- El **títol és la conclusió** ("Les recomanacions porten 6 de cada 10 pacients"), no el tema
  ("Captació"). Si la diapositiva només té el títol i una prova, millor.
- **Una sola cosa es veu primer**: el títol, una xifra o la barra destacada. Fes la prova de
  mirar-la desenfocada: s'ha de veure què va primer, què va segon i quins grups hi ha.
- **Poques paraules.** Títols de 4 a 10 paraules. Text de suport de menys de 25 paraules. Si no
  hi cap, parteix-ho en dues diapositives; no facis mai la lletra més petita.
- 8 a 12 diapositives per a una presentació normal.

## 3. Composició

- **Agrupa per proximitat**, no amb caixes. Juntes les coses que van juntes i molt d'aire entre
  grups. Més espai sobre un títol que sota.
- **Ritme:** alterna espais justos i generosos; no repeteixis el mateix espai a tot arreu.
  Fes servir una escala (8, 16, 24, 32, 48, 64, 96 px).
- **Varia la composició quan canvia el contingut**: títol gran sol; text a una banda i prova a
  l'altra; una xifra enorme amb una frase; un gràfic a tota amplada; una llista curta en
  columna estreta; una cita. Repeteix una composició només si el contingut és del mateix tipus.
- Marge exterior de 88 px (variable `--pad`). Res enganxat a les vores, excepte un color o una
  imatge que ocupi tota la diapositiva.
- Les diapositives de color sòlid (portada, canvi de bloc, tancament) donen ritme; no més d'una
  de cada tres.

## 4. Tipografia

- Mida mínima de qualsevol text: 20 px (el revisor avisa per sota de 18). Text de suport 24-28 px.
  Títols 48-64 px. Portada i xifres grans 88-220 px.
- Salts de mida i de pes clars: títol, text i nota s'han de distingir sense llegir-los.
- Línies de text de 45 a 75 caràcters (amplada màxima d'un paràgraf: ~760 px a 26 px).
- Interlineat: títols 1,05-1,15; text 1,35-1,5. Espaiat de lletra mai per sota de -0,03em.
- Xifres en taules i gràfics amb `font-variant-numeric: tabular-nums` (classe `.num`).
- Talla els títols a mà (`<br>`) només entre frases, mai deixant una paraula sola a l'última línia.

## 5. Color

- Rols, no una bossa de colors: paper, tinta, text secundari, línies, un accent, i un fons suau
  si cal. Defineix-los a `:root` (vegeu `scripts/base.css`).
- **L'accent és escàs i té feina**: la xifra que importa, la barra destacada, una diapositiva de
  canvi de bloc. No el gastis en decoració.
- Sobre fons de color, el text secundari es tenyeix del mateix color (més clar o més fosc), mai
  gris genèric.
- Contrast mínim: 4,5:1 per al text normal i 3:1 per al text gran. El revisor ho mesura.

## 6. Gràfics i dades

- Fes servir `bars`, `hbars` o `line` de `neska_pdf`: ja tenen els colors i la lletra de la
  presentació. Una sola sèrie sempre que es pugui; destaca (`highlight`) la dada que demostra
  el títol i deixa la resta en gris clar.
- Etiqueta directament (el valor a la barra, el nom al final de la línia). Sense llegenda, sense
  quadrícula, sense eix de valors.
- Les xifres i les afirmacions surten del que t'ha dit l'usuari. Si et faltava una dada i l'has
  suposada, digues-ho a la nota de la diapositiva i a la resposta.

## 7. Prohibit (els reflexos de plantilla)

- **Etiquetes o "kickers" sobre el títol** ("PROPOSTA", "CONTEXT"). El títol ja parla sol.
- **Números de secció** (01, 02, 03) si la seqüència no aporta res.
- **Graella de targetes iguals** (icona + títol + text, tres o quatre vegades). Si són tres
  idees, escriu-les com a llista amb un lema en negreta, o fes una diapositiva per idea.
- **La plantilla de xifra estrella** (número gegant + etiqueta petita + tres xifres més + color)
  com a reflex. Una xifra gran només quan és el missatge de la diapositiva.
- Vores de color gruixudes a l'esquerra de caixes o cites, degradats, text amb degradat, ombres
  decoratives, vidre/blur, cantonades molt arrodonides, fons de ratlles o de quadrícula.
- Emojis o caràcters Unicode fent d'icona. Si cal una icona, dibuixa-la en SVG, totes amb el
  mateix traç.
- Imatges genèriques de banc d'imatges i il·lustracions "fetes a mà" en SVG.
- Lletra monoespaiada per fer "tecnològic".

Qualsevol d'aquests es pot fer si l'usuari ho demana explícitament (excepte els kickers).

## 8. Comprova-ho mirant-ho

Cada volta: genera, obre el full de revisió amb `read_file` i mira totes les diapositives de cop.
Corregeix tot el que vegis en una sola tanda abans de tornar a generar. Pregunta't:

- Es llegeix el títol de cada diapositiva en un segon? Diu una conclusió?
- Hi ha una sola cosa que es veu primer?
- Hi ha text tallat, trepitjat, massa petit o amb poc contrast? (el revisor el marca en vermell)
- Hi ha dues diapositives seguides amb la mateixa composició sense motiu?
- Hi ha algun dels reflexos prohibits?
- Sembla feta per a aquest client, o podria ser de qualsevol empresa?
