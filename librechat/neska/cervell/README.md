# Cervell del Racó

El cervell comú de Neska: notes Markdown enllaçades (una caixa d'Obsidian) que tot l'equip
comparteix a través de Neska. La memòria privada de cada persona continua sent la memòria de
LibreChat (MongoDB) i no es toca.

## Com funciona

- `server.mjs` és un servidor MCP (stdio) que corre dins el contenidor de l'app, un procés per
  usuari. Eines: `cercar`, `llegir`, `aprendre`, `oblidar`.
- Les notes viuen a `/srv/neska/<client>/cervell` (dins el contenidor, `/app/cervell`), que és
  un repositori git. Cada canvi és un commit amb autor = la persona de la conversa que l'ha
  provocat (ho posa el servidor a partir del compte, mai el model).
- Neska desa sola, sense demanar permís (`toolApproval.ownTools: ['*_mcp_cervell']`), i acaba
  la resposta amb una línia en cursiva «He après que …; ho tindré en compte a partir d'ara.»
- «Oblida això» treu la línia (també queda al registre). Sense text, desfà l'últim fet que va
  aprendre aquell usuari.
- El que llegeix es passa al model com a dades de l'equip, no com a instruccions. No desa
  contrasenyes ni claus.
- `plantilla/` és un cervell d'exemple per començar; el contingut real sortirà de l'auditoria.

## Posar-lo en un servidor

```sh
mkdir -p /srv/neska/<client>/cervell
cp -r /opt/neska/librechat-<sha>/librechat/neska/cervell/plantilla/. /srv/neska/<client>/cervell/
chown -R 1000:1000 /srv/neska/<client>/cervell   # l'usuari node de la imatge
```

El repositori git es crea sol el primer cop que algú fa servir Neska. La imatge porta `git`.

## Obsidian (només l'admin)

Des del Mac:

```sh
git clone root@<servidor>:/srv/neska/<client>/cervell ~/Cervell-Raco
```

Obrir la carpeta a Obsidian com a caixa. Amb el plugin «Git» d'Obsidian (o `git pull` / `git push`)
es veuen els canvis de Neska amb qui els ha provocat (`git log`), i es pot editar o desfer
(`git revert <commit>`) i pujar-ho: el servidor accepta el push directament
(`receive.denyCurrentBranch updateInstead`). Si git es queixa de «dubious ownership» en
fer push com a root: `git config --global --add safe.directory /srv/neska/<client>/cervell`.
