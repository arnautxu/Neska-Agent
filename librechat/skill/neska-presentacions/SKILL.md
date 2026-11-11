---
name: neska-presentacions
description: Crea presentacions en PDF amb un disseny de nivell d'estudi (criteri Impeccable). Fes-la servir sempre que l'usuari demani una presentació, unes diapositives, un deck, un pitch o un PowerPoint, o vulgui convertir un document o unes dades en diapositives. El resultat és sempre un PDF, mai un .pptx.
---

# Presentacions Neska (PDF)

Les presentacions es lliuren **sempre en PDF**, encara que l'usuari digui "PowerPoint". Es
dissenyen en HTML i CSS (una `<section class="slide">` per diapositiva, 1280×720 px) i
`neska_pdf.render` en fa el PDF i un full de revisió per mirar-les.

## Com treballar

1. **Llegeix el criteri** la primera vegada de la conversa: `cat` de
   `/mnt/data/skills/neska-presentacions/disseny.md` i de
   `/mnt/data/skills/neska-presentacions/impeccable/craft-floor.md`. Segueix-los.
2. **Entén l'encàrrec**: qui la veurà, per a què, on es projectarà. Si falta una dada clau (les
   xifres, per exemple), pregunta-ho una sola vegada; si no, decideix tu i digues què has suposat.
3. **Tria el món** (paper, tinta, accent, tipografia) a partir del client i del tema, i escriu
   el **guió**: un títol-conclusió per diapositiva i quina composició farà cada una.
4. **Fes-la i revisa-la en una sola crida de codi.** Al sandbox, `/tmp` s'esborra entre crides i
   tot el que es desa a `/mnt/data` li apareix a l'usuari. Per tant, escriu el programa amb un
   heredoc (`python3 - <<'EOF' … EOF`), sense desar-ne el `.py`:

```python
import sys; sys.path.insert(0, "/mnt/data/skills/neska-presentacions/scripts")
from neska_pdf import render, bars, hbars, line

html = f"""
<style>
  /* Món: paper càlid, tinta gairebé negra, verd fosc com a únic accent; Young Serif + Instrument Sans */
  :root {{ --accent: #1F5C4D; --line: #D7DFDB; --tint: #EEF3F0; }}
  .cover {{ background: var(--accent); color: #fff; display: flex; flex-direction: column; justify-content: flex-end; }}
  .cover p {{ color: #CFE0DA; margin-top: 24px; }}
  .lead {{ max-width: 760px; color: var(--muted); margin-top: 24px; }}
</style>

<section class="slide cover">
  <h1>Una clínica que la gent recomana</h1>
  <p>Pla de creixement 2027</p>
</section>

<section class="slide">
  <h2>6 de cada 10 pacients nous arriben per recomanació</h2>
  <div style="margin-top: 56px">{hbars(["Recomanació", "Google", "Instagram"], [61, 22, 9], highlight=0, unit=" %")}</div>
</section>
"""
print(render(html, "/tmp/presentacio.pdf"))   # PDF + /mnt/data/revisio-diapositives.png
```

5. **Mira-la de debò.** Aquest pas no se salta mai. Obre `/mnt/data/revisio-diapositives.png`
   amb `read_file` (si diu que no el troba, torna-ho a provar una vegada) i revisa-la amb les preguntes del final de `disseny.md`. El que el revisor pot
   mesurar (text tallat, trepitjat, massa petit, poc contrast, pàgines de més, emojis) surt a la
   llista i marcat en vermell; la resta ho has de veure tu. Corregeix-ho tot d'una vegada i torna
   al pas 4. Com a màxim tres voltes.
6. **Quan estigui bé**, genera-la per última vegada directament al lloc final, sense full de
   revisió, i esborra el de les voltes anteriors:
   `render(html, "/mnt/data/<nom-curt>.pdf", sheet=None)` (minúscules i guions) i
   `os.remove("/mnt/data/revisio-diapositives.png")`. No deixis cap altre fitxer a `/mnt/data`. El PDF apareix sol al xat: no escriguis mai la ruta a la resposta.
7. **Respon breu**: una frase amb què has fet, la llista de diapositives (una línia cada una),
   què has suposat i què pot demanar de canviar. No expliquis el procés.

## Eines

- `render(html, pdf, sheet=..., slides_dir=None)`: `html` pot ser només les `<section>` amb un
  `<style>`. Afegeix sol les tipografies i `scripts/base.css` (mida de pàgina, `.slide`, variables
  `--paper --ink --muted --line --tint --accent --on-accent --display --text --pad`, mides de
  `h1 h2 h3`). Retorna un informe; imprimeix-lo. Amb `slides_dir="/tmp/d"` també desa cada
  diapositiva gran, per mirar-ne una de prop.
- `bars(labels, values, highlight=i, unit="")`, `hbars(...)` (rànquings) i
  `line(labels, {"Sèrie": [...]}, highlight="Sèrie")`: SVG amb els colors de `:root`.
  Amplada per defecte 1104 px (l'amplada útil de la diapositiva); passa `width=`/`height=` si
  el gràfic va en una columna.
- Imatges: si l'usuari puja una foto o un logo, és a `/mnt/data/<fitxer>`; posa-la amb
  `<img src="file:///mnt/data/<fitxer>">`.
- CSS que funciona: flexbox, grid, `position: absolute`, variables, `@font-face`. No hi ha
  JavaScript ni animacions, i `text-wrap: balance` no té efecte: talla els títols a mà si cal.

## Si l'usuari puja una presentació

- Si vol canviar-ne el contingut o el disseny, refés-la com a PDF amb aquest mètode i conserva
  el contingut. Si té una marca (colors, logo, lletra), aquesta marca és el món.
- Si demana explícitament editar el seu `.pptx` i tornar-lo en `.pptx`, fes-ho amb `python-pptx`
  (`Presentation("/mnt/data/<fitxer>.pptx")`), canvia només el que demana i desa'l amb un nom
  nou (`…-v2.pptx`). És l'únic cas en què es lliura un `.pptx`.
