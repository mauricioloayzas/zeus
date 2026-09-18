# Zeus

Panel de administración de la plataforma (perfiles "origin"/`type=service` — Clichín y las
apps que vengan). Nuxt 4 + Nuxt UI v4, mismo stack y convenciones que
`caja-registradora/frontend`.

## Acceso

El acceso se otorga vía RBAC (mismo mecanismo que cualquier otro perfil): rol **Owner**
sobre un perfil `type=service` da acceso total; rol **Contador** solo ve
Suscripciones/Contabilidad. No hay todavía una pantalla para invitar administradores —
se otorga a mano (ver `profiles_rbacs` en DynamoDB) hasta que se construya esa pantalla.

## Desarrollo

```
npm install
npm run dev
```

## Deploy

App de Amplify `zeus` (appId `d1fa09xuldgje9`), **sin conexión a Git todavía** — no había
`gh` CLI disponible al crearla, así que el primer deploy se hizo subiendo el build a mano:

```
npm run generate
cd .output/public && zip -rq /tmp/zeus_deploy.zip .
aws amplify create-deployment --app-id d1fa09xuldgje9 --branch-name main
# subir el zip a la zipUploadUrl que devuelve (PUT)
aws amplify start-deployment --app-id d1fa09xuldgje9 --branch-name main --job-id <el que corresponda>
```

Conectar un repo de GitHub real (para que cada push redeploye solo) es un pendiente.

Dominio: `zeus.mauloasan.com` — asociación ya pedida en Amplify, falta agregar los
registros CNAME en el DNS real de mauloasan.com (ver conversación/PR para los valores
exactos, cambian por deploy).

## Sitio web (mauloasan.com)

La sección **Sitio web** (solo Owner) edita el contenido público de `mauloasan-nuxt`:
información, servicios, reseñas, skills, contacto, Términos y Privacidad. Los documentos
viven en la tabla DynamoDB `{stage}_orchestrator_site_content` (PK `site_id`, SK `key`, valor
en `data_json`) y se leen/escriben vía `GET /site-content/{site}` (público) y
`PUT /site-content/{site}/{key}` (admin de plataforma) del orchestrator. El sitio los consume
con caché de 60 s y, si la API no responde o falta un documento, usa el contenido de
`server/utils/database.js` como respaldo.

Puesta en marcha (una sola vez por stage):
1. `bob-contruye`: `php dev-scripts/DynamoDB/DDL/siteContentTable.php --environment <stage> --prefix orchestrator`
2. `orchestrator`: desplegar (nuevas funciones `site-content-*` y variable `DYNAMODB_TABLE_SITE_CONTENT`)
3. `mauloasan-nuxt`: `npm run seed:<stage>` para cargar el contenido actual, y definir
   `NUXT_API_SITE_CONTENT` (URL base del orchestrator) en su `.env` antes de `deploy:<stage>`
