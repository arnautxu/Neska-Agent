# Neska sobre LibreChat

Aquesta carpeta conté el que fa que LibreChat sigui Neska i com s'instal·la per client.
LibreChat (MIT) és a `../`, copiat de l'upstream `LibreChat-AI/LibreChat` al commit `f4154b6`
(v0.8.9-rc1, 31/10/2026). Vegeu `../NESKA_FORK.md` per a la llista de canvis i com portar versions noves.

## Fitxers

- `librechat.yaml`: configuració per client (tema `neska`, benvinguda, l'assistent Neska i el model).
- `docker-compose.yml`: app + MongoDB + Meilisearch + Caddy (TLS), un stack per servidor Hetzner ARM.
- `neska.env.example`: variables i secrets; la còpia real viu a `/etc/neska/<client>/neska.env`.
- `cerca/`: cerca web pròpia (SearXNG + Firecrawl + reordenador local), un segon stack que s'uneix a la xarxa de l'app.

## Instal·lar un client nou (servidor Hetzner CAX21, Ubuntu 24.04 ARM)

1. Instal·lar Docker Engine i el plugin Compose.
2. `mkdir -p /etc/neska/<client> /srv/neska/<client>` i copiar-hi `librechat.yaml` i `neska.env` (omplert, `chmod 600`).
3. Clonar aquest repo a `/opt/neska` i, des de `/opt/neska/librechat/neska`:
   `docker compose --env-file /etc/neska/<client>/neska.env build app`
   `docker compose --env-file /etc/neska/<client>/neska.env up -d`
4. Crear el primer usuari: `docker compose --env-file … exec app npm run create-user`.
5. Comprovar `https://<domini>/health` i entrar amb l'usuari.
6. Cerca web (`cerca/`, tot dins el servidor, sense cap API de cerca de fora): SearXNG troba pàgines, Firecrawl les llegeix i `reranker.py` tria els trossos que responen la pregunta. Copiar `cerca/cerca.env.example` a `/etc/neska/<client>/cerca.env` (omplert, `chmod 600`) i, des de `cerca/`: `docker compose --env-file /etc/neska/<client>/cerca.env up -d`. Ocupa uns 2,5 GB de memòria. Els cercadors públics que fa servir SearXNG poden limitar-nos si en fem un ús intens. El sandbox de codi continua sense xarxa.

La compilació de la imatge, el desplegament i l'acceptació amb usuaris reals són passos separats:
que un funcioni no demostra el següent.
