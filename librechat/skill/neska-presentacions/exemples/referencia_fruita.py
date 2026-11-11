"""Reference deck B: the craft level to reach (data is illustrative).

World: a fruit cooperative from Lleida. Its audience knows fruit-crate labels by heart: flat,
saturated fields of colour, wide heavy lettering, a figure printed huge. Colour strategy is
Drenched: whole slides are the colour (persimmon and orchard green), white slides are the
pause. Unbounded is the label lettering, Archivo the reading voice. Signature move: one huge
word or figure that runs off the edge of the slide, like a label cut by the crate.
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "scripts"))
from neska_pdf import hbars, mapa, pictograma, render, share  # noqa: E402

html = f"""
<style>
  /* World: Lleida fruit-crate labels. Persimmon #CF461B (white text passes AA on it) and orchard green #123D2B own whole
     slides; cream is avoided on purpose (white paper). Unbounded + Archivo. */
  :root {{
    --paper: #FFFFFF; --ink: #14201A; --muted: #4D5A52; --line: #DCE3DE; --tint: #EEF3EF;
    --accent: #CF461B; --on-accent: #FFFFFF; --green: #123D2B;
    --display: "Unbounded", sans-serif; --text: "Archivo", sans-serif; --pad: 80px;
  }}
  h1, h2 {{ font-family: var(--display); font-weight: 700; letter-spacing: -0.02em; line-height: 1.02; }}
  h2 {{ font-size: 48px; }}
  .orange {{ background: var(--accent); color: #fff; }}
  .green {{ background: var(--green); color: #fff; }}
  .note {{ font-size: 22px; color: var(--muted); }}
  .orange .note {{ color: #FFFFFF; }}
  .green .note {{ color: #BFD6C9; }}

  /* 1 cover: the word is cut by the edge of the slide */
  .bleed {{ position: absolute; left: -18px; bottom: -64px; font-family: var(--display);
           font-weight: 700; font-size: 330px; line-height: .8; letter-spacing: -0.04em; color: #fff; }}
  .cover-top {{ display: flex; justify-content: space-between; font-size: 24px; }}
  .cover h1 {{ font-size: 64px; width: 760px; margin-top: 96px; }}

  /* 2 two halves: number on colour, explanation on white */
  .halves {{ position: absolute; inset: 0; display: grid; grid-template-columns: 1fr 1fr; }}
  .halves > div {{ padding: var(--pad); display: flex; flex-direction: column; justify-content: flex-end; }}
  .halves .fig {{ white-space: nowrap; font-family: var(--display); font-weight: 700; font-size: 150px; line-height: .9; letter-spacing: -0.04em; }}

  /* 4 table that reads like a price list */
  table {{ width: 100%; margin-top: 48px; font-size: 26px; }}
  th {{ text-align: left; font-weight: 500; color: var(--muted); font-size: 20px; padding-bottom: 12px; border-bottom: 2px solid var(--ink); }}
  td {{ padding: 16px 0; border-bottom: 1px solid var(--line); }}
  td.n, th.n {{ text-align: right; font-variant-numeric: tabular-nums; }}
  tr.total td {{ border-bottom: 0; font-weight: 700; color: var(--accent); }}

  /* 6 quote */
  .quote blockquote {{ font-family: var(--display); font-weight: 400; font-size: 54px; line-height: 1.15;
                      letter-spacing: -0.02em; width: 1000px; }}
  .quote cite {{ display: block; margin-top: 40px; font-style: normal; font-size: 24px; color: #BFD6C9; }}

  /* 7 three moves, unequal */
  .moves {{ display: grid; grid-template-columns: 6fr 3fr 3fr; column-gap: 40px; margin-top: 64px; }}
  .moves div {{ border-top: 4px solid var(--ink); padding-top: 20px; }}
  .moves div:first-child {{ border-color: var(--accent); }}
  .moves b {{ display: block; font-family: var(--display); font-weight: 700; font-size: 34px; line-height: 1.1; margin-bottom: 12px; }}
  .moves div:first-child b {{ font-size: 56px; }}
</style>

<section class="slide orange cover">
  <div class="cover-top"><span>Cooperativa del Segrià</span><span>Assemblea 2026</span></div>
  <h1>Vendre la fruita amb el nostre nom</h1>
  <div class="bleed">Segrià</div>
</section>

<section class="slide">
  <div class="halves">
    <div class="green"><div class="fig">7 de 10</div>
      <div style="margin-top:40px">{pictograma(7, 10, columnes=5, icona="apple", mida=72, gap=18, color="#FFFFFF", rest="#3B6552", stroke=1.6)}</div></div>
    <div><h2 style="font-size:40px">quilos que collim surten sense la nostra marca</h2>
      <p class="note" style="margin-top:24px">Es venen a granel a tres centrals de compra, que hi posen la seva.</p></div>
  </div>
</section>

<section class="slide">
  <div style="position:absolute;right:0;top:0">{mapa("catalunya-comarques", destaca=["Segrià"], enfoca=["Segrià"],
      punts=[(0.62, 41.61, "Lleida"), (0.52, 41.56, "Alcarràs"), (0.46, 41.49, "Aitona")],
      rest="#E3E9E5", width=700, height=720, gruix=3, credit=False, label_size=24)}</div>
  <h2 style="position:absolute;left:var(--pad);top:var(--pad);width:470px">Collim en 14 pobles d'una sola comarca</h2>
  <p class="note" style="position:absolute;left:var(--pad);bottom:var(--pad);width:420px">412 socis entre el Segre i la Noguera Ribagorçana. Mapa: IGN/CNIG (CC BY 4.0), Idescat.</p>
</section>

<section class="slide">
  <h2 style="width:900px">El préssec paga la meitat de la collita</h2>
  <div style="margin-top:64px">{share([("Préssec", 52), ("Poma", 21), ("Pera", 15), ("Nectarina", 12)], highlight=0, height=140)}</div>
  <p class="note" style="margin-top:56px;width:640px">Ingressos per fruita, campanya 2026. Si el préssec té un mal any, el té tota la cooperativa.</p>
</section>

<section class="slide">
  <h2>Amb marca pròpia, el quilo val el doble</h2>
  <table>
    <tr><th>Canal</th><th class="n">€/kg al soci</th><th class="n">Quilos 2026</th></tr>
    <tr><td>Granel a centrals</td><td class="n">0,38</td><td class="n">6.300.000</td></tr>
    <tr><td>Botiga de la cooperativa</td><td class="n">0,92</td><td class="n">410.000</td></tr>
    <tr><td>Supermercats de proximitat</td><td class="n">0,81</td><td class="n">1.200.000</td></tr>
    <tr class="total"><td>Marca pròpia, de mitjana</td><td class="n">0,84</td><td class="n">1.610.000</td></tr>
  </table>
</section>

<section class="slide orange">
  <h2 style="width:820px">Els supermercats de proximitat ja ens demanen més</h2>
  <div style="margin-top:56px">{hbars(["Bonpreu", "Plusfresc", "Caprabo", "Altres"], [480, 360, 240, 120], highlight=0, unit=" t", color="#FFFFFF", rest="#E9875F", ink="#FFFFFF", muted="#FFF1EA")}</div>
</section>

<section class="slide green quote" style="display:flex;flex-direction:column;justify-content:center">
  <blockquote>«Quan veig la caixa amb el nom del poble a la botiga, sé que el preu l'hem posat nosaltres.»</blockquote>
  <cite>Rosa Pujol, sòcia des del 1994</cite>
</section>

<section class="slide">
  <h2 style="width:900px">Tres decisions per a l'assemblea</h2>
  <div class="moves">
    <div><b>Marca Segrià a totes les caixes</b><span class="note">Disseny i registre abans de la campanya de juny.</span></div>
    <div><b>Una cambra més</b><span class="note">Per vendre fins a l'octubre.</span></div>
    <div><b>Un comercial</b><span class="note">Per als supermercats de proximitat.</span></div>
  </div>
</section>

<section class="slide orange">
  <h1 style="font-size:88px;width:1000px;margin-top:40px">Votem el 12 de desembre</h1>
  <p class="note" style="margin-top:32px;font-size:26px">Inversió total: 340.000 €, retornada en tres campanyes.</p>
  <div class="bleed" style="color:#DD6A43">Segrià</div>
</section>
"""

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "/tmp/referencia-fruita.pdf"
    print(render(html, out, sheet=out.replace(".pdf", ".png")))
