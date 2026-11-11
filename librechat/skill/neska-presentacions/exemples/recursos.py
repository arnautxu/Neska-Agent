"""Catalogue of the graphic resources, as slides (data is illustrative).

Shows each resource once at deck quality so the model sees what it gets: maps (Catalonia by
comarca, Spain, Europe, choropleth), icons used big and as pictograms, a progress ring, a
sparkline beside a figure, a slope chart, the halftone texture and the photo treatments.
"""

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts"))
from neska_pdf import (anell, apilades, bandera, calendari, calor, cascada, embut, foto,  # noqa: E402
                       icon, interval, mapa, minigrafic, pendent, pictograma, render, trama, treemap)

PHOTO = os.path.join(HERE, "foto-exemple.jpg")

html = f"""
<style>
  :root {{ --accent: #0F5C4C; --ink: #14201C; --muted: #4F5D58; --line: #D8E0DC; --tint: #EDF2EF;
          --display: "Bricolage Grotesque", sans-serif; --text: "Schibsted Grotesk", sans-serif; --pad: 72px; }}
  h2 {{ font-family: var(--display); font-weight: 800; font-size: 52px; letter-spacing: -0.02em; line-height: 1.02; }}
  .note {{ font-size: 20px; color: var(--muted); }}
  .folio {{ position: absolute; left: var(--pad); right: var(--pad); bottom: 32px; display: flex;
           justify-content: space-between; font-size: 18px; color: var(--muted); }}
  .green {{ background: var(--accent); color: #fff; }}
  .green .note, .green .folio {{ color: #CFE3DC; }}
  .row {{ display: flex; gap: 48px; align-items: flex-end; }}
  .fig {{ font-family: var(--display); font-weight: 800; font-size: 200px; line-height: .85; letter-spacing: -0.03em; }}
</style>

<section class="slide">
  <div style="position:absolute;right:40px;top:40px">{mapa("catalunya-comarques", destaca=["Segrià", "Noguera", "Urgell"],
      etiquetes=True, width=640, height=640)}</div>
  <h2 style="width:520px;margin-top:120px">mapa("catalunya-comarques")</h2>
  <p class="note" style="width:460px;margin-top:24px">43 comarques. destaca=, etiquetes=True. També províncies i municipis.</p>
  <div class="folio"><span>Recursos gràfics</span><span>1</span></div>
</section>

<section class="slide">
  <h2>mapa amb valors: una sola tinta, més fosc és més</h2>
  <div style="margin-top:24px">{mapa("espanya-autonomies", valors={"Catalunya": 31, "Madrid": 24, "Andalusia": 12,
      "País Valencià": 18, "País Basc": 9, "Galícia": 6, "Aragó": 5}, etiquetes=["Catalunya", "Madrid"], height=430)}</div>
  <div class="folio"><span>Espanya per comunitats · Canàries en requadre</span><span>2</span></div>
</section>

<section class="slide green">
  <div style="position:absolute;right:0;top:0">{mapa("europa", destaca=["ES", "FR", "IT"], enfoca=["ES", "FR", "IT"],
      color="#FFFFFF", rest="#2C7563", vora="#0F5C4C", width=820, height=720,
      punts=[(2.17, 41.39, "Barcelona"), (2.35, 48.86, "París"), (9.19, 45.46, "Milà")], ink="#FFFFFF")}</div>
  <h2 style="position:absolute;left:var(--pad);bottom:110px;width:380px;color:#fff">mapa("europa"), enfoca= i punts=</h2>
  <div class="folio"><span>Europa · també mapa("mon")</span><span>3</span></div>
</section>

<section class="slide">
  <div class="row" style="margin-top:40px">
    {icon("bike", 300, "var(--accent)", 1.2)}
    {icon("tractor", 300, "var(--ink)", 1.2)}
    {icon("hospital", 300, "var(--muted)", 1.2)}
  </div>
  <h2 style="margin-top:48px">icon(): 2.356 icones Lucide, grans i de traç fi</h2>
  <div class="folio"><span>icones("cerca") troba noms per etiqueta</span><span>4</span></div>
</section>

<section class="slide">
  <div class="row">
    <div class="fig" style="color:var(--accent)">7 de 10</div>
  </div>
  <div style="margin-top:56px">{pictograma(7, 10, columnes=10, icona="apple", mida=88, gap=16, stroke=1.6)}</div>
  <p class="note" style="margin-top:32px">pictograma(7, 10, icona="apple"): unitats en lloc d'un percentatge abstracte.</p>
  <div class="folio"><span>Recursos gràfics</span><span>5</span></div>
</section>

<section class="slide">
  <div class="row" style="gap:96px;margin-top:24px">
    {anell(68, mida=340, gruix=36)}
    <div><div class="fig" style="font-size:150px">4.600</div>
      <div style="margin-top:20px">{minigrafic([1840, 2410, 3120, 3790, 4600], width=420, height=110)}</div>
      <p class="note" style="margin-top:16px">anell() per a una part d'un total; minigrafic() al costat d'una xifra.</p></div>
  </div>
  <div class="folio"><span>Recursos gràfics</span><span>6</span></div>
</section>

<section class="slide">
  <h2>pendent(): qui puja i qui baixa</h2>
  <div style="margin-top:32px">{pendent(["Préssec", "Poma", "Pera", "Nectarina"], [41, 30, 18, 11], [52, 21, 15, 12],
      periodes=("2024", "2026"), destaca=0, unit=" %", width=900, height=470)}</div>
  <div class="folio"><span>Recursos gràfics</span><span>7</span></div>
</section>

<section class="slide green">
  <div style="position:absolute;right:0;top:0">{trama(640, 720, "#2C7563", cel=18, direccio="esquerra")}</div>
  <h2 style="color:#fff;width:560px;margin-top:300px">trama(): punts de semitò per a portades</h2>
  <div class="folio"><span>Mai sota text</span><span>8</span></div>
</section>

<section class="slide" style="padding:0">
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;height:560px">
    <div style="background:url('{foto(PHOTO, "#0F5C4C", "#E7F0EC", "duotone")}') center/cover"></div>
    <div style="background:url('{foto(PHOTO, "#14201C", "#FFFFFF", "trama", cel=9)}') center/cover"></div>
    <div style="background:url('{foto(PHOTO, "#0F5C4C", "#FFFFFF", "linies", cel=8)}') center/cover"></div>
  </div>
  <h2 style="margin:40px 72px 0;font-size:44px">foto(): la foto de l'usuari, en duotone, trama o línies</h2>
</section>
<section class="slide">
  <div class="row" style="gap:40px">
    <div>{icon("lucide:coffee", 150, "var(--ink)", 1.3)}<p class="note">lucide</p></div>
    <div>{icon("tabler:coffee", 150, "var(--ink)", 1.3)}<p class="note">tabler</p></div>
    <div>{icon("phosphor:coffee-thin", 150, "var(--ink)")}<p class="note">phosphor-thin</p></div>
    <div>{icon("phosphor:coffee", 150, "var(--ink)")}<p class="note">phosphor</p></div>
    <div>{icon("phosphor:coffee-duotone", 150, "var(--accent)")}<p class="note">phosphor-duotone</p></div>
    <div>{icon("phosphor:coffee-fill", 150, "var(--accent)")}<p class="note">phosphor-fill</p></div>
  </div>
  <h2 style="margin-top:56px">Tres jocs d'icones, uns 16.000 dibuixos</h2>
  <p class="note" style="margin-top:16px">icon("tabler:coffee"), icones("coffee") per cercar. Un sol joc i un sol pes per presentació.</p>
  <div class="folio"><span>Recursos gràfics</span><span>10</span></div>
</section>

<section class="slide">
  <div style="position:absolute;right:0;top:0">{mapa("FR-grups", destaca=["Occitanie", "Auvergne-Rhône-Alpes"], width=660, height=720,
      rutes=[("Barcelona", "Lió"), ("Barcelona", "Tolosa"), ("Barcelona", "Montpeller")], ruta_color="var(--accent)",
      enfoca=["Occitanie", "Auvergne-Rhône-Alpes", "Provence-Alpes-Côte-d'Azur", "Nouvelle-Aquitaine"])}</div>
  <div class="row" style="gap:16px">{bandera("es-ct", 96, vora="var(--line)")}{bandera("fr", 96, vora="var(--line)")}</div>
  <h2 style="width:520px;margin-top:40px">Regions de 240 països, rutes i banderes</h2>
  <p class="note" style="width:500px;margin-top:16px">mapa("FR-grups", rutes=[("Barcelona", "Lió")]); punts per nom amb 8.000 llocs; bandera("es-ct").</p>
  <div class="folio"><span>Recursos gràfics</span><span>11</span></div>
</section>

<section class="slide">
  <h2>cascada(): d'on surt la diferència</h2>
  <div style="margin-top:40px">{cascada(["2025", "Preus", "Clients nous", "Clients perduts", "Costos"], [410, 62, 95, -38, -41], unit=" k€", total="2026", height=440)}</div>
  <div class="folio"><span>Recursos gràfics</span><span>12</span></div>
</section>

<section class="slide">
  <h2>calendari(): el pla en una línia de temps</h2>
  <div style="margin-top:48px">{calendari([("Registre de marca", 0, 3, True), ("Primer distribuïdor", 2, 5), ("Logística", 3, 6), ("Primer enviament", 6, 7, True), ("Fira de Lió", 8, 9)],
      ["Gen", "Feb", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Oct"], avui=1.4)}</div>
  <div class="folio"><span>Recursos gràfics</span><span>13</span></div>
</section>

<section class="slide">
  <h2>embut(): on es perden els clients</h2>
  <div style="margin-top:40px">{embut(["Visites a la web", "Fitxa de producte", "Cistella", "Compra"], [48000, 13200, 2900, 1160], destaca=2)}</div>
  <div class="folio"><span>Recursos gràfics</span><span>14</span></div>
</section>

<section class="slide">
  <h2>calor(): quan passa</h2>
  <div style="margin-top:32px">{calor(["Dilluns", "Dimarts", "Dimecres", "Dijous", "Divendres", "Dissabte", "Diumenge"], ["9 h", "11 h", "13 h", "15 h", "17 h", "19 h", "21 h"],
      [[12, 30, 22, 18, 25, 40, 20], [10, 28, 20, 16, 22, 38, 18], [11, 26, 24, 15, 24, 41, 22], [14, 32, 26, 20, 30, 52, 30],
       [18, 40, 34, 28, 44, 70, 58], [30, 64, 72, 40, 52, 80, 66], [26, 58, 60, 30, 34, 36, 20]], fila=62)}</div>
  <div class="folio"><span>Recursos gràfics</span><span>15</span></div>
</section>

<section class="slide">
  <h2>interval(): on som dins del mercat</h2>
  <div style="margin-top:56px">{interval(["Nosaltres", "Competidor A", "Competidor B", "Competidor C"], [3.2, 2.4, 3.8, 2.9], [4.1, 3.9, 5.6, 3.6], punt=[3.6, 3.1, 4.4, 3.2], unit=" €", destaca=0)}</div>
  <div class="folio"><span>Recursos gràfics</span><span>16</span></div>
</section>

<section class="slide">
  <h2>treemap(): quina part és de qui</h2>
  <div style="margin-top:32px">{treemap([("Restaurants", 48), ("Botigues", 21), ("Supermercats", 14), ("Web", 9), ("Exportació", 5), ("Altres", 3)], unit=" %", destaca=0, height=470)}</div>
  <div class="folio"><span>Recursos gràfics</span><span>17</span></div>
</section>

<section class="slide">
  <h2>apilades(): la suma i les parts</h2>
  <div style="margin-top:32px">{apilades(["2023", "2024", "2025", "2026"], {"Botiga": [120, 130, 140, 150], "Web": [20, 40, 70, 110], "Export": [0, 5, 15, 30]}, unit=" k€", height=470)}</div>
  <div class="folio"><span>Recursos gràfics</span><span>18</span></div>
</section>
"""

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "/tmp/recursos.pdf"
    print(render(html, out, sheet=out.replace(".pdf", ".png")))
