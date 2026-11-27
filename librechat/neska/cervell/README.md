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
  contrasenyes, claus, números de targeta (comprovació de Luhn) ni comptes bancaris (IBAN).
- En una resposta on Neska ha llegit la web, el servidor li refusa `aprendre` fins al final
  d'aquella resposta (`packages/api/src/agents/hitl/neskaWebLearn.ts`): una pàgina amb
  instruccions amagades no pot plantar «fets» que després veu tot l'equip.
- En arrencar, el que hi ha a la carpeta i no és a l'historial (la plantilla, notes copiades a mà)
  entra en un sol commit a nom de Neska: «Notes inicials del cervell» o «Canvis fets fora de Neska».
- `plantilla/` és un cervell d'exemple per començar; el contingut real sortirà de l'auditoria.

## Posar-lo en un servidor

```sh
mkdir -p /srv/neska/<client>/cervell
cp -r /opt/neska/librechat-<sha>/librechat/neska/cervell/plantilla/. /srv/neska/<client>/cervell/
chown -R 1000:1000 /srv/neska/<client>/cervell   # l'usuari node de la imatge
```

El repositori git es crea sol el primer cop que algú fa servir Neska. La imatge porta `git`.

## Obsidian (només l'admin)

El cervell és de l'usuari 1000 del servidor (el `node` de la imatge). Obsidian s'hi connecta
amb aquest mateix usuari, mai com a root: un push de root deixaria fitxers que Neska ja no pot
escriure, i git no deixa ni clonar com a root un repositori d'un altre usuari («dubious ownership»).
Fer que root executi git dins una carpeta que Neska pot escriure tampoc seria segur.

Un cop per servidor, com a root (l'usuari només pot fer git, sense terminal):

```sh
id 1000 || useradd --uid 1000 --user-group --create-home --shell /usr/bin/git-shell cervell
install -d -m 700 -o 1000 -g 1000 /home/cervell/.ssh
# la clau pública del Mac de l'admin, només per a git:
echo 'no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty ssh-ed25519 AAAA… admin-mac' \
  > /home/cervell/.ssh/authorized_keys
chown 1000:1000 /home/cervell/.ssh/authorized_keys && chmod 600 /home/cervell/.ssh/authorized_keys
```

Si `id 1000` ja existeix amb un altre nom, fer servir aquell usuari (i la seva carpeta personal).

Des del Mac:

```sh
git clone cervell@<servidor>:/srv/neska/<client>/cervell ~/Cervell-Raco
```

Obrir la carpeta a Obsidian com a caixa. Amb el plugin «Git» d'Obsidian (o `git pull` / `git push`)
es veuen els canvis de Neska amb qui els ha provocat (`git log`), i es pot editar o desfer
(`git revert <commit>`) i pujar-ho: el servidor accepta el push directament
(`receive.denyCurrentBranch updateInstead`). Abans d'editar, fer `git pull`: si Neska ha après
alguna cosa mentrestant, el push es refusa fins que es baixa.
