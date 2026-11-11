---
name: neska-presentacions
description: Crea presentacions en PDF amb un disseny de nivell d'estudi (criteri Impeccable). Fes-la servir sempre que l'usuari demani una presentació, unes diapositives, un deck, un pitch o un PowerPoint, o vulgui convertir un document o unes dades en diapositives. El resultat és sempre un PDF, mai un .pptx.
---

# Presentacions Neska (PDF)

Les presentacions es lliuren **sempre en PDF**, encara que l'usuari digui "PowerPoint". Es
dissenyen en HTML i CSS (una `<section class="slide">` per diapositiva, 1280×720 px) i
`neska_pdf.render` en fa el PDF i un full de revisió per mirar-les.

## Com treballar

1. **Llegeix el criteri i mira el llistó** la primera vegada de la conversa: `cat` de
   `/mnt/data/skills/neska-presentacions/disseny.md` i de `…/impeccable/craft-floor.md`, i obre
   amb `read_file` `…/exemples/referencia_ruta.png`, `…/exemples/referencia_fruita.png` i
   `…/exemples/recursos.png` (els mapes, icones i gràfics que tens). Les referències són el
   nivell mínim; no en copiïs el món. Segueix el criteri. Fes les crides **d'una en una**, mai
   diverses alhora: el sandbox en limita el ritme i les que van en paral·lel fallen.
2. **Entén l'encàrrec**: qui la veurà, per a què, on es projectarà. Si falta una dada clau (les
   xifres, per exemple), pregunta-ho una sola vegada; si no, decideix tu i digues què has suposat.
3. **Tria el món** (d'on surt, estratègia de color, tipografies, gest propi) a partir del client,
   escriu-lo en un comentari CSS, defineix l'escala de mides i d'espais (`disseny.md`, 3b) i fes el **guió**: un títol-conclusió per diapositiva, quina
   composició del repertori de `disseny.md` farà cada una i quin recurs gràfic hi va. Per triar
   la lletra, obre `…/exemples/tipografies.png`; per cridar els recursos, `cat …/recursos.md`.
4. **Fes-la i revisa-la en una sola crida de codi.** Al sandbox, `/tmp` s'esborra entre crides i
   tot el que es desa a `/mnt/data` li apareix a l'usuari. Per tant, escriu el programa amb un
   heredoc (`python3 - <<'EOF' … EOF`), sense desar-ne el `.py`:

```python
import sys; sys.path.insert(0, "/mnt/data/skills/neska-presentacions/scripts")
from neska_pdf import *   # render, gràfics, mapes, icones… (vegeu recursos.md)

html = f"""
<style>
  /* Món: <d'on surt> · Color: <estratègia> · Lletra: <títols> + <text>, perquè …
     Gest propi: <el recurs que torna a 2-3 diapositives> · Clar/fosc: <per què> */
  :root {{ --accent: …; --ink: …; --display: "…"; --text: "…";
           --t-text: 24px; --t-sub: …; --t-titol: …; --t-gran: …; --t-xifra: …;   /* una ràtio */
           --e-1: 8px; --e-2: 16px; --e-3: 24px; --e-4: 40px; --e-5: 64px; --e-6: 104px; }}
  /* una classe per composició: .cover, .statement, .halves, … */
</style>
<section class="slide cover">…</section>
<section class="slide">… {bars([...], [...], highlight=3)} …</section>
"""
print(render(html, "/tmp/presentacio.pdf"))   # PDF + /mnt/data/revisio-diapositives.png
```

5. **Mira-la de debò.** Aquest pas no se salta mai. Obre `/mnt/data/revisio-diapositives.png`
   amb `read_file` (si diu que no el troba, torna-ho a provar una vegada) i revisa-la amb les preguntes del final de `disseny.md`. El que el revisor pot
   mesurar (text tallat, trepitjat, tapat per un gràfic, massa petit, poc contrast, pàgines de més, emojis) surt a la
   llista i marcat en vermell; la resta ho has de veure tu. Corregeix-ho tot d'una vegada i torna
   al pas 4. Com a màxim tres voltes. No lliuris mai una presentació amb un problema que ja has
   vist ni el deixis "per a la propera volta": la crida final s'hi nega mentre en quedi algun.
6. **Quan estigui bé**, genera-la per última vegada directament al lloc final, sense full de
   revisió: `render(html, "/mnt/data/<nom-curt>.pdf", sheet=None)` (minúscules i guions). Aquesta
   crida esborra sola el full de revisió. No deixis cap altre fitxer a `/mnt/data`. El PDF apareix sol al xat: no escriguis mai la ruta a la resposta.
7. **Respon breu**: una frase amb què has fet, la llista de diapositives (una línia cada una),
   què has suposat i què pot demanar de canviar. No expliquis el procés ni parlis del revisor, del
   full de revisió o de fitxers.

## Eines

- `render(html, pdf, sheet=..., slides_dir=None)`: `html` pot ser només les `<section>` amb un
  `<style>`. Afegeix sol les tipografies i `scripts/base.css` (mida de pàgina, `.slide`, variables
  `--paper --ink --muted --line --tint --accent --on-accent --display --text --pad`, mides de
  `h1 h2 h3`). Retorna un informe; imprimeix-lo. Amb `slides_dir="/tmp/d"` també desa cada
  diapositiva gran, per mirar-ne una de prop.
- Gràfics, mapes, icones, banderes, pictogrames, textures i fotos: `recursos.md`. Tot retorna
  SVG amb els colors de `:root` i accepta `color=`, `rest=`, `ink=`, `muted=` per a fons de color.
- Imatges: si l'usuari puja un logo, és a `/mnt/data/<fitxer>` i va tal qual
  (`<img src="file:///mnt/data/<fitxer>">`); una foto, tractada amb `foto()`.
- Classe `bleed`: text tallat a propòsit per la vora de la diapositiva (el revisor no el mira).
- CSS que funciona: flexbox, grid, `position: absolute`, variables, `@font-face`. No hi ha
  JavaScript ni animacions, i `text-wrap: balance` no té efecte: talla els títols a mà si cal.

## Si l'usuari puja una presentació

- Si vol canviar-ne el contingut o el disseny, refés-la com a PDF amb aquest mètode i conserva
  el contingut. Si té una marca (colors, logo, lletra), aquesta marca és el món.
- Si demana explícitament editar el seu `.pptx` i tornar-lo en `.pptx`, fes-ho amb `python-pptx`
  (`Presentation("/mnt/data/<fitxer>.pptx")`), canvia només el que demana i desa'l amb un nom
  nou (`…-v2.pptx`). És l'únic cas en què es lliura un `.pptx`.
