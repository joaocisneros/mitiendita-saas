# 🚀 Despliegue de MiTiendita (gratis, siempre encendido)

Stack elegido para mantenerlo **gratis hasta tener clientes**:

| Pieza | Dónde | Por qué |
|---|---|---|
| **Frontend** (Next.js) | **Vercel** | Gratis para siempre, no se duerme |
| **Backend + MySQL** | **AlwaysData** (plan gratis) | Siempre encendido, MySQL incluido |
| **Imágenes** | **Cloudinary** | Gratis 25 GB, ya configurado |

---

## ❓ ¿Cómo "salen" las tiendas / subdominios?

Tu app identifica cada tienda **por la RUTA**, no por subdominio DNS real. Las tiendas viven en:

```
https://tu-frontend.vercel.app/tienda/demo-carta
https://tu-frontend.vercel.app/tienda/cismafact
https://tu-frontend.vercel.app/tienda/EL-QUE-SEA
```

👉 **No necesitas comprar dominio ni configurar wildcard DNS.** Funciona tal cual, gratis.

- El **panel del dueño** es: `https://tu-frontend.vercel.app/panel/login`
- El **superadmin** es: `https://tu-frontend.vercel.app/superadmin/login`
- El **registro de nuevos negocios** es: `https://tu-frontend.vercel.app/registro`

### ¿Y si quiero subdominios bonitos tipo `cismafact.mitienda.com`?
Eso sí necesita: (1) **comprar un dominio** (~S/ 40 al año) y (2) configurar **wildcard DNS** (`*.mitienda.com`).
Tu backend YA lo soporta (variable `ROOT_DOMAIN` + `tenancy.middleware.ts`). Es un upgrade opcional para cuando vendas; **no lo necesitas para arrancar.**

---

## 1️⃣ Base de datos MySQL (AlwaysData)

1. Crea cuenta gratis en https://www.alwaysdata.com
2. Panel → **Bases de datos → MySQL → Añadir una base de datos**.
3. Anota: usuario, contraseña, host (`mysql-tucuenta.alwaysdata.net`), nombre de la BD.
4. Tu `DATABASE_URL` quedará así:
   ```
   mysql://usuario:password@mysql-tucuenta.alwaysdata.net:3306/tucuenta_mitiendita
   ```

## 2️⃣ Backend (AlwaysData)

1. Panel → **Sitios → Añadir un sitio** → tipo **Node.js**.
2. Sube el código del `backend/` (por Git o SSH/SFTP).
3. Comando de arranque:
   ```
   npm run start:prod
   ```
   (apunta a `dist/src/main.js`)
4. En **Entorno → Variables de entorno**, pega las de `backend/.env.production.example`
   (con tus valores reales).
5. Primera vez, desde la consola SSH de AlwaysData, dentro de `backend/`:
   ```bash
   npm install
   npx prisma generate
   npx prisma migrate deploy     # crea las tablas en MySQL
   npm run prisma:seed           # crea el superadmin + planes (ESENCIAL)
   npm run prisma:seed:showcase  # crea la tienda vitrina de ejemplo (opcional)
   npm run build                 # genera dist/
   ```
   ⚠️ **NO ejecutes `prisma:seed:demo`** en producción: ese crea las tiendas de
   prueba (datos basura). Producción arranca limpia con solo lo esencial.
6. Verifica: `https://tu-cuenta.alwaysdata.net/api` debe responder.

## 3️⃣ Frontend (Vercel)

1. Sube el repo a GitHub e importa el proyecto en https://vercel.com
2. **Root Directory**: `frontend`
3. En **Settings → Environment Variables**, agrega:
   ```
   BACKEND_URL            = https://tu-cuenta.alwaysdata.net
   NEXT_PUBLIC_API_URL    = https://tu-cuenta.alwaysdata.net/api
   NEXT_PUBLIC_DEMO_STORE = bella-napoli   # tienda vitrina (o quítala para no mostrar ejemplo)
   ```
4. **Deploy.** Vercel te da una URL tipo `https://mitiendita.vercel.app`.

## 4️⃣ Conectar los dos

- En el **backend** (AlwaysData), pon en `CORS_ORIGINS` la URL de Vercel:
  ```
  CORS_ORIGINS=https://mitiendita.vercel.app
  ```
- Reinicia el backend. ¡Listo!

---

## ✅ Comprobaciones finales
- [ ] `https://tu-cuenta.alwaysdata.net/api` responde.
- [ ] La tienda abre: `https://mitiendita.vercel.app/tienda/demo-carta`
- [ ] Login dueño funciona: `https://mitiendita.vercel.app/panel/login`
- [ ] Login superadmin funciona: `https://mitiendita.vercel.app/superadmin/login`
- [ ] Subir una foto de producto se ve (Cloudinary).
- [ ] Hacer un pedido y subir comprobante funciona.

## 💡 Notas
- **No se duerme**: AlwaysData mantiene el backend activo. No necesitas UptimeRobot.
- **100 MB de disco**: alcanza de sobra porque las fotos van a Cloudinary, no al servidor.
- **Costo real = S/ 0** hasta que quieras un dominio propio.
