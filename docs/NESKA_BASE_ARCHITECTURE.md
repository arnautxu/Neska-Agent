# Neska: base reutilitzable per a empreses

Direcció del producte, 2026-10-10: un brain amb servidor propi que es connecta als sistemes de l’empresa contractant.

## Separació de responsabilitats

```text
Usuaris → Neska: identitat, permisos, xats, projectes, documents i memòria
             ↓
     Connexió explícita i autoritzada per empresa
             ↓
     Servidor, fitxers, ERP o APIs de l’empresa
```

Neska conserva el seu estat durable al servidor propi. El servidor del client continua sent l’origen de les seves dades de negoci. Connectivitat de xarxa i autorització d’un empleat són controls diferents: cada adaptador limita destinacions, recursos i operacions.

La base actual ja té configuració per instal·lació, aïllament d’usuaris i connectors governats. No hi ha una connexió universal desplegada a qualsevol servidor: cada tipus d’integració necessita configuració, proves i acceptació amb el sistema de destí. Es manté com a base una instal·lació aïllada per empresa; no es canvia ara el proveïdor d’allotjament ni la persistència.

## Neteja d’aquesta revisió

- Retirat el motor vertical d’horaris, la seva base de dades/migracions, eines del xat, API/webhooks, plantilla específica, serveis Docker i job de CI.
- Retirats el context, skill, configuració, logotips, avatar personal, excepcions d’identitat i regles documentals del client anterior.
- Retirats els workflows, scripts de desplegament, unitats systemd i exemples de navegació específics d’aquell host. Els procediments genèrics de release i backup es conserven.
- Eliminades les notes d’incidències i evidències de desplegaments d’un altre client; la documentació actual no les presenta com a acceptació de Neska.
- Substituïdes les dades de client de les proves per empreses i recursos ficticis. Les proves de permisos, aïllament, recuperació i connexions es conserven.
- La càrrega de sessió i les marques utilitzen la configuració de la instal·lació, sense comptes privilegiats per a un avatar ni logos forçats. Els suggeriments específics d’horaris es substitueixen per treball documental genèric, conservant el component i la interacció.
- L’adaptador de sincronització exigeix el binding i la unitat de servei de l’operador; la verificació d’acceptació exigeix un origen HTTPS esperat independent del manifest.

Aquesta neteja afecta el codi actual de Neska. No elimina dades de cap servidor extern ni reescriu l’historial Git. Es mantenen noms interns de protocol i variables `aibrain_*` per compatibilitat, sense lligar-los a cap client.

## Nucli que es conserva

Identitat i permisos; xats/projectes i recuperació; documents, cerca i memòria; credencials i connectors; automatitzacions genèriques; auditoria, observabilitat, còpies i restauració. El navegador, correu, SaaS i adaptadors Windows continuen sotmesos a configuració i autorització, sense activar una connexió per defecte.

El codi reutilitzable desenvolupat anteriorment continua sent útil: s’eliminen dades, regles i acoblaments específics, no els controls de seguretat o recuperació que també necessiten altres empreses.

## Contracte de connexió empresarial

1. Identitat del client, destinació i credencial dedicades a aquella instal·lació. Secrets només al servidor.
2. Recursos i operacions explícits; lectura inicial i escriptures només quan estiguin autoritzades i verificades al sistema de destí.
3. API o canal privat revisat. No s’obre accés genèric del model a IPs internes per connectar un adaptador.
4. Les còpies importades registren origen, versió/data i permisos; una desconnexió mostra l’antiguitat de la darrera informació verificada.
5. Proves d’accés creuat, revocació, indisponibilitat, reintents i restauració abans de donar accés real.

## Seguretat i lliurament

Els problemes del nucli identificats a l’auditoria de seguretat del 10/10/2026 continuen pendents de correcció; retirar el mòdul vertical només retira les dependències d’aquell mòdul. No acredita la seguretat de sessions, permisos o imatges de producció.

Validació local: compilació de producció i worker, typecheck, lint, contractes, infraestructura, 88 proves Python de connexions, 240 proves de coneixement (11 omeses) i 11 proves de navegador superades. Smoke HTTP del servidor compilat: control de vida 200, xats sense sessió 401 i antigues rutes retirades 404 en GET i POST.

Vitest: 2019 proves superades i 27 omeses, combinant la passada completa amb la repetició final dels fitxers afectats. La primera passada va detectar cinc expectatives antigues i dos rebutjos del verificador per scripts de release encara sense commit; corregides les expectatives, aïllada la fixture mutable i comès el candidat, les 245 proves dels 14 fitxers repetits i les 13 del verificador de release passen. No s’ha desactivat cap comprovació de seguretat per fer passar la suite.

Backend CI remot, GHCR, desplegament i acceptació autenticada real: no executats. Les comprovacions de navegador i HTTP utilitzen dades sintètiques i només loopback. No s’ha executat una compilació completa de les imatges Docker ni una prova amb un servidor empresarial real.
