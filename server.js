/**
 * BEERUTIFUL — server.js
 * npm install express sqlite3 bcrypt express-session
 * node server.js
 */

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt  = require('bcrypt');
const session = require('express-session');
const path    = require('path');
const fs      = require('fs'); // ✅ AGREGADO

const app  = express();
const PORT = process.env.PORT || 3000;

// ✅ Verificación inmediata de index.html al arrancar
const INDEX_PATH = path.join(__dirname, 'index.html');
console.log('📁 Directorio:', __dirname);
console.log('📄 index.html existe:', fs.existsSync(INDEX_PATH));

app.use(express.json());
app.use(express.static(__dirname)); // ✅ Simplificado, equivalente pero más directo
app.use(session({
  secret: 'beerutiful_secret_2025',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

const db = new sqlite3.Database(path.join(__dirname, 'database.db'));

const run = (sql, params = []) => new Promise((res, rej) =>
  db.run(sql, params, function(err) { err ? rej(err) : res(this); }));
const get = (sql, params = []) => new Promise((res, rej) =>
  db.get(sql, params, (err, row) => err ? rej(err) : res(row)));
const all = (sql, params = []) => new Promise((res, rej) =>
  db.all(sql, params, (err, rows) => err ? rej(err) : res(rows)));

async function initDB() {
  await run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, email TEXT,
    documento TEXT NOT NULL UNIQUE, password TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'cliente', ciudad TEXT,
    creado_en TEXT DEFAULT (datetime('now')))`);

  await run(`CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT, vendedor_id INTEGER NOT NULL,
    nombre TEXT NOT NULL, estilo TEXT NOT NULL, descripcion TEXT,
    precio REAL NOT NULL, abv REAL, ibu INTEGER, disponible INTEGER NOT NULL DEFAULT 1,
    creado_en TEXT DEFAULT (datetime('now')))`);

  await run(`CREATE TABLE IF NOT EXISTS pedidos (
    id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER NOT NULL,
    producto_id INTEGER NOT NULL, vendedor_id INTEGER NOT NULL,
    cantidad INTEGER NOT NULL DEFAULT 1, total REAL NOT NULL,
    estado TEXT NOT NULL DEFAULT 'pendiente', fecha TEXT DEFAULT (date('now')),
    direccion TEXT, telefono TEXT, metodo_pago TEXT, notas_envio TEXT,
    creado_en TEXT DEFAULT (datetime('now')))`);

  // ✅ Admin: se crea O se actualiza siempre con credenciales correctas
  const hash = await bcrypt.hash('1021926317', 10);
  const admin = await get('SELECT id FROM usuarios WHERE rol = ?', ['admin']);
  if (!admin) {
    await run(`INSERT INTO usuarios (nombre,documento,password,rol) VALUES ('Administrador','1021926317',?,'admin')`, [hash]);
    console.log('✅ Admin creado: 1021926317 / 1021926317');
  } else {
    await run(`UPDATE usuarios SET documento='1021926317', password=? WHERE rol='admin'`, [hash]);
    console.log('✅ Admin actualizado: 1021926317 / 1021926317');
  }

  const hayProds = await get('SELECT id FROM productos LIMIT 1');
  if (!hayProds) {
    const pwd = await bcrypt.hash('demo1234', 10);
    const r1 = await run(`INSERT INTO usuarios (nombre,email,documento,password,rol,ciudad)
      VALUES ('Carlos Restrepo','carlos@example.com','1111111111',?,'vendedor','Medellin')`, [pwd]);
    const r2 = await run(`INSERT INTO usuarios (nombre,email,documento,password,rol,ciudad)
      VALUES ('Ana Gomez','ana@example.com','2222222222',?,'vendedor','Bogota')`, [pwd]);
    const v1 = r1.lastID, v2 = r2.lastID;
    const prods = [
      [v1,'Medellin Golden Ale','Pale Ale','Ligera, dorada, con notas de miel y citricos.',12000,4.8,25,1],
      [v1,'Antioquia IPA','IPA','Amarga y aromatica, con lupulo importado.',15000,6.5,65,1],
      [v1,'Noche Oscura Stout','Stout','Oscura con sabores a cafe y chocolate.',14000,5.2,30,1],
      [v2,'Bogota Lager','Lager','Refrescante, suave y limpia.',9000,4.2,18,1],
      [v2,'Cereza Agria Sour','Sour','Fermentacion espontanea con cerezas colombianas.',18000,4.0,8,1],
      [v2,'Cafe Porter','Porter','Elaborada con cafe de Huila.',16000,5.8,35,1],
      [v1,'Trigo del Valle','Pale Ale','Cerveza de trigo estilo Hefeweizen.',13000,5.0,15,1],
      [v2,'Maracuya IPA','IPA','IPA tropical con maracuya colombiano.',17000,6.0,55,0],
    ];
    for (const p of prods)
      await run(`INSERT INTO productos (vendedor_id,nombre,estilo,descripcion,precio,abv,ibu,disponible) VALUES (?,?,?,?,?,?,?,?)`, p);
    console.log('✅ Datos demo creados');
  }
}

const reqAuth     = (req,res,next) => { if(!req.session.usuario) return res.status(401).json({error:true,mensaje:'No autenticado'}); next(); };
const reqAdmin    = (req,res,next) => { if(!req.session.usuario||req.session.usuario.rol!=='admin') return res.status(403).json({error:true,mensaje:'Acceso denegado'}); next(); };
const reqVendedor = (req,res,next) => { if(!req.session.usuario||!['vendedor','admin'].includes(req.session.usuario.rol)) return res.status(403).json({error:true,mensaje:'Solo vendedores'}); next(); };

app.post('/login', async (req,res) => {
  try {
    const {documento,password} = req.body;
    console.log('🔐 Login intento:', documento); // ✅ Log de diagnóstico
    if (!documento||!password) return res.json({mensaje:'Faltan credenciales'});
    const user = await get('SELECT * FROM usuarios WHERE documento = ?',[documento]);
    if (!user||!(await bcrypt.compare(password,user.password))) return res.json({mensaje:'Documento o contrasena incorrectos'});
    req.session.usuario = {id:user.id,nombre:user.nombre,rol:user.rol,documento:user.documento};
    res.json({mensaje:'ok',nombre:user.nombre,rol:user.rol});
  } catch(e){res.json({mensaje:'Error: '+e.message});}
});

app.post('/registro', async (req,res) => {
  try {
    const {nombre,email,documento,password,rol} = req.body;
    if (!nombre||!documento||!password) return res.json({mensaje:'Completa los campos obligatorios'});
    if (password.length<8) return res.json({mensaje:'La contrasena debe tener al menos 8 caracteres'});
    const rolFinal = ['cliente','vendedor'].includes(rol)?rol:'cliente';
    if (await get('SELECT id FROM usuarios WHERE documento = ?',[documento])) return res.json({mensaje:'Ese documento ya esta registrado'});
    const hash = await bcrypt.hash(password,10);
    await run(`INSERT INTO usuarios (nombre,email,documento,password,rol) VALUES (?,?,?,?,?)`,[nombre,email||null,documento,hash,rolFinal]);
    res.json({mensaje:'Cuenta creada correctamente'});
  } catch(e){res.json({mensaje:'Error: '+e.message});}
});

app.post('/logout',(req,res)=>{req.session.destroy();res.json({ok:true});});
app.get('/sesion',(req,res)=>{if(!req.session.usuario)return res.json({activa:false});res.json({activa:true,usuario:req.session.usuario});});
app.post('/recuperar-password',(req,res)=>res.json({mensaje:'Si el correo existe, recibiras un enlace pronto.'}));

app.get('/productos', async (req,res) => {
  try { res.json(await all(`SELECT p.*,u.nombre AS vendedor_nombre FROM productos p JOIN usuarios u ON u.id=p.vendedor_id ORDER BY p.creado_en DESC`)); }
  catch(e){res.json([]);}
});

app.get('/vendedores', async (req,res) => {
  try { res.json(await all(`SELECT u.id,u.nombre,u.ciudad,COUNT(p.id) AS total_productos FROM usuarios u LEFT JOIN productos p ON p.vendedor_id=u.id WHERE u.rol='vendedor' GROUP BY u.id ORDER BY total_productos DESC`)); }
  catch(e){res.json([]);}
});

app.post('/pedido', reqAuth, async (req,res) => {
  try {
    const {items, envio} = req.body;
    if (!Array.isArray(items)||items.length===0) return res.json({error:true,mensaje:'El carrito esta vacio'});
    for (const item of items) {
      const prod = await get('SELECT * FROM productos WHERE id=? AND disponible=1',[item.id]);
      if (!prod) return res.json({error:true,mensaje:'Producto no disponible'});
      await run(`INSERT INTO pedidos (cliente_id,producto_id,vendedor_id,cantidad,total,direccion,telefono,metodo_pago,notas_envio) VALUES (?,?,?,?,?,?,?,?,?)`,
        [req.session.usuario.id,
         prod.id,
         prod.vendedor_id,
         item.cantidad,
         prod.precio*item.cantidad,
         envio?.direccion ? `${envio.nombre} — ${envio.direccion}, ${envio.ciudad}` : null,
         envio?.telefono || null,
         envio?.pago || null,
         envio?.notas || null
        ]);
    }
    res.json({ok:true,mensaje:'Pedido realizado correctamente'});
  } catch(e){res.json({error:true,mensaje:e.message});}
});

app.get('/vendedor/mis-productos', reqVendedor, async (req,res) => {
  res.json(await all('SELECT * FROM productos WHERE vendedor_id=? ORDER BY creado_en DESC',[req.session.usuario.id]));
});
app.post('/vendedor/producto', reqVendedor, async (req,res) => {
  try {
    const {nombre,estilo,descripcion,precio,abv,ibu,disponible} = req.body;
    if (!nombre||!estilo||precio==null) return res.json({error:true,mensaje:'Faltan campos'});
    const r = await run(`INSERT INTO productos (vendedor_id,nombre,estilo,descripcion,precio,abv,ibu,disponible) VALUES (?,?,?,?,?,?,?,?)`,[req.session.usuario.id,nombre,estilo,descripcion||null,precio,abv||null,ibu||null,disponible?1:0]);
    res.json({ok:true,id:r.lastID});
  } catch(e){res.json({error:true,mensaje:e.message});}
});
app.put('/vendedor/producto/:id', reqVendedor, async (req,res) => {
  try {
    const {nombre,estilo,descripcion,precio,abv,ibu,disponible} = req.body;
    const prod = await get('SELECT * FROM productos WHERE id=? AND vendedor_id=?',[req.params.id,req.session.usuario.id]);
    if (!prod) return res.json({error:true,mensaje:'No encontrado'});
    await run(`UPDATE productos SET nombre=?,estilo=?,descripcion=?,precio=?,abv=?,ibu=?,disponible=? WHERE id=?`,[nombre,estilo,descripcion||null,precio,abv||null,ibu||null,disponible?1:0,req.params.id]);
    res.json({ok:true,mensaje:'Actualizado'});
  } catch(e){res.json({error:true,mensaje:e.message});}
});
app.delete('/vendedor/producto/:id', reqVendedor, async (req,res) => {
  const prod = await get('SELECT * FROM productos WHERE id=? AND vendedor_id=?',[req.params.id,req.session.usuario.id]);
  if (!prod) return res.json({error:true,mensaje:'No encontrado'});
  await run('DELETE FROM productos WHERE id=?',[req.params.id]);
  res.json({ok:true,mensaje:'Eliminado'});
});
app.get('/vendedor/mis-pedidos', reqVendedor, async (req,res) => {
  res.json(await all(`SELECT pe.*,p.nombre AS producto_nombre,u.nombre AS cliente_nombre FROM pedidos pe JOIN productos p ON p.id=pe.producto_id JOIN usuarios u ON u.id=pe.cliente_id WHERE pe.vendedor_id=? ORDER BY pe.creado_en DESC`,[req.session.usuario.id]));
});
app.post('/vendedor/pedido', reqVendedor, async (req,res) => {
  const {id,estado} = req.body;
  if (!['confirmado','cancelado','entregado'].includes(estado)) return res.json({error:true,mensaje:'Estado invalido'});
  await run('UPDATE pedidos SET estado=? WHERE id=? AND vendedor_id=?',[estado,id,req.session.usuario.id]);
  res.json({ok:true,mensaje:'Actualizado'});
});

app.get('/admin/productos', reqAdmin, async (req,res) => {
  res.json(await all(`SELECT p.*,u.nombre AS vendedor_nombre FROM productos p JOIN usuarios u ON u.id=p.vendedor_id ORDER BY p.creado_en DESC`));
});
app.delete('/admin/producto/:id', reqAdmin, async (req,res) => {
  await run('DELETE FROM productos WHERE id=?',[req.params.id]);
  res.json({ok:true,mensaje:'Eliminado'});
});
app.get('/admin/usuarios', reqAdmin, async (req,res) => {
  res.json(await all('SELECT id,nombre,email,documento,rol,ciudad,creado_en FROM usuarios ORDER BY creado_en DESC'));
});
app.post('/admin/usuario/rol', reqAdmin, async (req,res) => {
  const {id,rol} = req.body;
  if (!['cliente','vendedor','admin'].includes(rol)) return res.json({error:true,mensaje:'Rol invalido'});
  await run('UPDATE usuarios SET rol=? WHERE id=?',[rol,id]);
  res.json({ok:true,mensaje:'Rol actualizado'});
});
app.post('/admin/eliminar-usuario', reqAdmin, async (req,res) => {
  const {id} = req.body;
  const user = await get('SELECT * FROM usuarios WHERE id=?',[id]);
  if (!user||user.rol==='admin') return res.json({error:true,mensaje:'No se puede eliminar'});
  await run('DELETE FROM pedidos WHERE cliente_id=? OR vendedor_id=?',[id,id]);
  await run('DELETE FROM productos WHERE vendedor_id=?',[id]);
  await run('DELETE FROM usuarios WHERE id=?',[id]);
  res.json({ok:true,mensaje:'Usuario eliminado'});
});
app.get('/admin/pedidos', reqAdmin, async (req,res) => {
  res.json(await all(`SELECT pe.*,p.nombre AS producto_nombre,uc.nombre AS cliente_nombre,uv.nombre AS vendedor_nombre FROM pedidos pe JOIN productos p ON p.id=pe.producto_id JOIN usuarios uc ON uc.id=pe.cliente_id JOIN usuarios uv ON uv.id=pe.vendedor_id ORDER BY pe.creado_en DESC`));
});
app.get('/admin/exportar', reqAdmin, async (req,res) => {
  const pedidos = await all(`SELECT pe.id,uc.nombre AS cliente,uv.nombre AS vendedor,p.nombre AS producto,p.estilo,pe.cantidad,pe.total,pe.estado,pe.fecha FROM pedidos pe JOIN productos p ON p.id=pe.producto_id JOIN usuarios uc ON uc.id=pe.cliente_id JOIN usuarios uv ON uv.id=pe.vendedor_id ORDER BY pe.creado_en DESC`);
  const header = 'ID,Cliente,Vendedor,Producto,Estilo,Cantidad,Total,Estado,Fecha\n';
  const rows = pedidos.map(p=>`${p.id},"${p.cliente}","${p.vendedor}","${p.producto}","${p.estilo}",${p.cantidad},${p.total},${p.estado},${p.fecha}`).join('\n');
  res.setHeader('Content-Type','text/csv; charset=utf-8');
  res.setHeader('Content-Disposition','attachment; filename="beerutiful_pedidos.csv"');
  res.send('\uFEFF'+header+rows);
});

// ✅ Wildcard corregido: verifica que index.html existe antes de enviarlo
app.get('*', (req, res) => {
  if (fs.existsSync(INDEX_PATH)) {
    res.sendFile(INDEX_PATH);
  } else {
    res.status(500).send(`
      <h2>⚠️ Error: no se encontró index.html</h2>
      <p>Asegúrate de que <strong>index.html</strong> esté en la misma carpeta que <strong>server.js</strong>:</p>
      <code>${__dirname}</code>
    `);
  }
});

initDB().then(()=>{
  app.listen(PORT,()=>{
    console.log(`\n🍺 Beerutiful corriendo en http://localhost:${PORT}`);
    console.log('  Admin:     1021926317 / 1021926317');
    console.log('  Vendedor1: 1111111111 / demo1234');
    console.log('  Vendedor2: 2222222222 / demo1234\n');
  });
}).catch(e=>console.error('Error DB:',e));
