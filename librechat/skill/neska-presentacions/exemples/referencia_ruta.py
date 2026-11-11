"""Reference deck A: the craft level to reach (data is illustrative).

World: a cycling-tour company in the Empordà. Its audience reads road signs, route maps and
elevation profiles every day, so those are the material: cobalt road-sign fields carry whole
slides (Committed colour, ~40 % of the deck), Big Shoulders Display is the signage voice,
Schibsted Grotesk the reading voice, and the signature move is the route line with its
kilometre markers, which returns as the timeline and as the elevation chart.
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "scripts"))
from neska_pdf import bars, line, render  # noqa: E402

KM = ["0", "10", "20", "30", "40", "50", "60", "70", "80"]
ALT = [12, 40, 95, 210, 340, 180, 120, 60, 15]

html = f"""
<style>
  /* World: Empordà road signage. Paper white, cobalt sign field, signal yellow only for
     the one figure that matters. Big Shoulders Display (sign lettering) + Schibsted Grotesk. */
  :root {{
    --paper: #FFFFFF; --ink: #0E1A2B; --muted: #4A5568; --line: #D9DEE6; --tint: #EEF2F8;
    --accent: #1D3FBB; --on-accent: #FFFFFF; --signal: #FFC21A;
    --display: "Big Shoulders Display", sans-serif; --text: "Schibsted Grotesk", sans-serif;
    --pad: 72px;
  }}
  h1, h2 {{ font-family: var(--display); font-weight: 800; letter-spacing: 0; line-height: 1; }}
  h2 {{ font-size: 64px; text-transform: none; }}
  .folio {{ position: absolute; left: var(--pad); right: var(--pad); bottom: 36px; display: flex;
           justify-content: space-between; font-size: 18px; color: var(--muted); }}
  .on-blue {{ background: var(--accent); color: var(--on-accent); }}
  .on-blue .folio {{ color: #B9C6F2; }}
  .grid {{ display: grid; grid-template-columns: repeat(12, 1fr); column-gap: 24px; }}

  /* 1 cover: the route itself is the image */
  .cover h1 {{ font-size: 168px; position: absolute; left: var(--pad); bottom: 150px; width: 640px; }}
  .cover .sub {{ position: absolute; left: var(--pad); bottom: 96px; font-size: 24px; color: #DCE3FA; }}
  .cover svg.route {{ position: absolute; right: 0; top: 0; }}

  /* 3 statement with evidence column */
  .statement h2 {{ font-size: 104px; grid-column: 1 / span 9; }}
  .statement .side {{ grid-column: 10 / span 3; align-self: end; border-top: 2px solid var(--ink); padding-top: 16px; }}
  .statement .side b {{ display: block; font-family: var(--display); font-size: 64px; font-weight: 800; line-height: 1; }}

  /* 4 giant figure that crosses the slide */
  .giant {{ position: absolute; left: 56px; top: 40px; font-family: var(--display); font-weight: 800;
           font-size: 520px; line-height: .8; color: var(--signal); letter-spacing: -0.01em; }}
  .giant-copy {{ position: absolute; right: var(--pad); bottom: 120px; width: 420px; }}
  .giant-copy h2 {{ color: #fff; font-size: 56px; }}
  .giant-copy p {{ color: #DCE3FA; margin-top: 16px; }}

  /* 6 timeline drawn as kilometre markers */
  .km {{ display: grid; grid-template-columns: repeat(4, 1fr); margin-top: 140px; border-top: 6px solid var(--ink); }}
  .km div {{ padding: 20px 24px 0 0; position: relative; }}
  .km div::before {{ content: ""; position: absolute; top: -17px; left: 0; width: 28px; height: 28px;
                    border-radius: 50%; background: var(--paper); border: 6px solid var(--ink); }}
  .km div.now::before {{ background: var(--signal); }}
  .km b {{ display: block; font-family: var(--display); font-weight: 800; font-size: 52px; line-height: 1; margin: 16px 0 12px; }}
  .km span {{ color: var(--muted); font-size: 22px; }}

  /* 7 two unequal columns: problem / answer */
  .split {{ display: grid; grid-template-columns: 5fr 7fr; position: absolute; inset: 0; }}
  .split > div {{ padding: var(--pad); }}
  .split .left {{ background: var(--tint); }}
  .big30 {{ font-family: var(--display); font-weight: 800; font-size: 200px; line-height: 1; color: var(--accent); margin-top: 120px; }}
  .split ol {{ margin: 32px 0 0; padding: 0; list-style: none; }}
  .split li {{ padding: 18px 0; border-bottom: 1px solid var(--line); font-size: 26px; }}
  .split li b {{ font-weight: 700; }}

  /* 8 close */
  .close h1 {{ font-size: 120px; width: 900px; }}
  .close .ask {{ margin-top: 40px; font-size: 28px; color: #DCE3FA; width: 760px; }}
</style>

<section class="slide on-blue cover">
  <svg class="route" width="620" height="720" viewBox="0 0 620 720">
    <path d="M300 760 C 330 620, 270 540, 350 480 S 500 420, 470 300 S 560 150, 660 120"
          style="fill:none;stroke:#FFFFFF;stroke-width:10;stroke-linecap:round"/>
    <circle cx="350" cy="480" r="16" style="fill:var(--signal)"/>
    <circle cx="470" cy="300" r="16" style="fill:#FFFFFF"/>
    <text x="376" y="488" style="font-family:'Schibsted Grotesk';font-size:20px;fill:#FFFFFF">km 32 · Pals</text>
    <text x="444" y="308" text-anchor="end" style="font-family:'Schibsted Grotesk';font-size:20px;fill:#FFFFFF">km 58 · Begur</text>
  </svg>
  <h1>Temporada 2027</h1>
  <p class="sub">Pedals de l'Empordà · pla per als socis · novembre 2026</p>
  <div class="folio"><span>Pedals de l'Empordà</span><span>1</span></div>
</section>

<section class="slide">
  <h2 style="width:900px">Les reserves es dupliquen en tres temporades</h2>
  <div style="margin-top:56px">{bars(["2023", "2024", "2025", "2026", "2027"], [1840, 2410, 3120, 3790, 4600], highlight=3, ghost=4, unit="")}</div>
  <div class="folio"><span>Reserves per temporada · 2027 és l'objectiu</span><span>2</span></div>
</section>

<section class="slide">
  <div class="grid statement" style="height:100%">
    <h2>El client que repeteix ja és més de la meitat del negoci</h2>
    <div class="side"><b>54 %</b>de les reserves del 2026 són de clients que ja havien vingut.</div>
  </div>
  <div class="folio"><span>Pedals de l'Empordà</span><span>3</span></div>
</section>

<section class="slide on-blue">
  <div class="giant">4,9</div>
  <div class="giant-copy"><h2>La nota que ens posen al final de cada ruta</h2>
    <p>1.120 valoracions el 2026. La que més es repeteix: "els guies".</p></div>
  <div class="folio"><span>Pedals de l'Empordà</span><span>4</span></div>
</section>

<section class="slide">
  <h2 style="width:860px">La ruta estrella té una sola pujada dura, al km 40</h2>
  <div style="margin-top:48px">{line(KM, {"Altitud": ALT}, unit=" m", height=400, area=True, marks={4: "340 m · Coll de Sant Sebastià"})}</div>
  <div class="folio"><span>Perfil de la ruta Costa Brava, 80 km</span><span>5</span></div>
</section>

<section class="slide">
  <h2>Quatre passos fins a l'estiu</h2>
  <div class="km">
    <div class="now"><span>Desembre</span><b>Nova flota elèctrica</b><span>24 bicis per a la ruta llarga</span></div>
    <div><span>Febrer</span><b>Web amb reserva directa</b><span>sense intermediaris</span></div>
    <div><span>Abril</span><b>Dos guies més</b><span>temporada de 7 mesos</span></div>
    <div><span>Juny</span><b>Ruta nocturna</b><span>prova pilot</span></div>
  </div>
  <div class="folio"><span>Calendari 2027</span><span>6</span></div>
</section>

<section class="slide">
  <div class="split">
    <div class="left"><h2 style="font-size:56px">Què ens frena</h2>
      <p class="big30">30 %</p>
      <p style="margin-top:8px;color:var(--muted)">de les peticions de juliol no les podem atendre.</p></div>
    <div><h2 style="font-size:56px">Què proposem</h2>
      <ol>
        <li><b>Més bicis</b> a la ruta que s'omple primer</li>
        <li><b>Reserva directa</b> per cobrar menys comissió</li>
        <li><b>Guies propis</b> en lloc d'autònoms a última hora</li>
      </ol></div>
  </div>
  <div class="folio"><span>Pedals de l'Empordà</span><span>7</span></div>
</section>

<section class="slide on-blue close">
  <h1>Demanem 60.000 € per arribar a 4.600 reserves</h1>
  <p class="ask">Votació a la junta del 15 de desembre.</p>
  <div class="folio"><span>Pedals de l'Empordà</span><span>8</span></div>
</section>
"""

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "/tmp/referencia-ruta.pdf"
    print(render(html, out, sheet=out.replace(".pdf", ".png")))
