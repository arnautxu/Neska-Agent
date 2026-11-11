# Sandbox de codi de Neska

És el que permet a Neska executar Python per crear i editar fitxers de PowerPoint, Excel i Word,
fer gràfics i analitzar dades. Fa servir el Code Interpreter de codi obert de LibreChat
([ClickHouse/code-interpreter](https://github.com/ClickHouse/code-interpreter), Apache 2.0).
S'instal·la al mateix servidor Hetzner que l'app, com un stack Compose a part.

## Peces

`api` (l'única que veu l'app, a `http://codeapi:3112` dins la xarxa de Compose), `service-worker`,
`sandbox-runner` (NsJail, on corre el codi), `egress_gateway`, `tool_call_server`, `file_server`,
`redis` i `minio`. No es publica cap port a internet.

Els servidors cloud de Hetzner no tenen `/dev/kvm`, així que el sandbox fa servir el mode
directe de NsJail (espais de noms, seccomp, sense xarxa, usuari per feina) en lloc de microVMs.
Docker no deixa crear cgroups per feina: el límit de memòria i CPU és el del contenidor
(`mem_limit: 3g`, `cpus: 2`) més els límits de temps per feina.

Les imatges i el paquet de llenguatges (Python 3.14 amb python-pptx, openpyxl, pandas,
matplotlib…) es construeixen per a ARM amb el workflow **Build Neska code sandbox (arm64)**
a partir d'un commit fixat de l'upstream (upstream només publica amd64).

## Instal·lar-ho en un client

1. Executar el workflow amb el commit de l'upstream i anotar-lo.
2. Al servidor:
   ```sh
   install -d -m 700 /srv/neska/<client>/code
   install -d -o 65532 -g 65532 /srv/neska/<client>/code/minio
   id=$(docker create ghcr.io/arnautxu/neska-codeapi-pkgs:sha-<commit> /x)
   docker cp "$id":/pkgs /srv/neska/<client>/code/pkgs && docker rm "$id"
   ```
3. Omplir `/etc/neska/<client>/code.env` a partir de `code.env.example` (`chmod 600`).
4. Afegir a `/etc/neska/<client>/neska.env` les línies `LIBRECHAT_CODE_BASEURL` i `CODEAPI_*`
   de `../neska.env.example`, amb la clau privada que fa parella amb `CODEAPI_JWT_PUBLIC_KEY`.
5. Des d'aquesta carpeta, amb l'app ja en marxa (la seva xarxa ha d'existir):
   `docker compose --env-file /etc/neska/<client>/code.env up -d`
6. Reiniciar l'app perquè llegeixi `LIBRECHAT_CODE_BASEURL`.

## Comprovar-ho

Demanar a Neska: "Fes-me una presentació de 5 diapositives sobre…". Ha de tornar un `.pptx` que
es pot previsualitzar i descarregar. Si falla, mirar `docker compose logs sandbox-runner file_server`.
El build, el desplegament i la prova amb un usuari real són tres passos separats.
