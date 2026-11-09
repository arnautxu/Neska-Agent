# Neska sobre LibreChat

Aquesta carpeta conté el que fa que LibreChat sigui Neska i com s'instal·la per client.
LibreChat (MIT) és a `../`, copiat de l'upstream `LibreChat-AI/LibreChat` al commit `f4154b6`
(v0.8.9-rc1, 31/10/2026). Vegeu `../NESKA_FORK.md` per a la llista de canvis i com portar versions noves.

## Fitxers

- `librechat.yaml`: configuració per client (tema `neska`, benvinguda, l'assistent Neska i el model).
- `docker-compose.yml`: app + MongoDB + Meilisearch + Caddy (TLS), un stack per servidor Hetzner ARM.
- `neska.env.example`: variables i secrets; la còpia real viu a `/etc/neska/<client>/neska.env`.

## Instal·lar un client nou (servidor Hetzner CAX21, Ubuntu 24.04 ARM)

1. Instal·lar Docker Engine i el plugin Compose.
2. `mkdir -p /etc/neska/<client> /srv/neska/<client>` i copiar-hi `librechat.yaml` i `neska.env` (omplert, `chmod 600`).
3. Clonar aquest repo a `/opt/neska` i, des de `/opt/neska/librechat/neska`:
   `docker compose --env-file /etc/neska/<client>/neska.env build app`
   `docker compose --env-file /etc/neska/<client>/neska.env up -d`
4. Crear el primer usuari: `docker compose --env-file … exec app npm run create-user`.
5. Comprovar `https://<domini>/health` i entrar amb l'usuari.

La compilació de la imatge, el desplegament i l'acceptació amb usuaris reals són passos separats:
que un funcioni no demostra el següent.
