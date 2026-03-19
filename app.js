/* BEERUTIFUL — app.js */

function showToast(msg, type = 'info', duration = 4000) {
  const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
  const c = document.getElementById('toastContainer');
  if (!c) return;
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerHTML = `<span>${icons[type]||'ℹ️'}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => {
    t.style.animation = 'fadeOut .3s forwards';
    setTimeout(() => t.remove(), 300);
  }, duration);
}

function formatCOP(val) {
  if (val == null) return '–';
  return '$' + Number(val).toLocaleString('es-CO');
}

function estiloEmoji(estilo) {
  const m = { IPA:'🌿', Stout:'🖤', Lager:'🌊', 'Pale Ale':'☀️', Sour:'🍋', Porter:'🍫' };
  return m[estilo] || '🍺';
}

function estiloColor(estilo) {
  const m = { IPA:'#2d6a2d', Stout:'#1a1a1a', Lager:'#1565c0', 'Pale Ale':'#c17b00', Sour:'#7b5ea7', Porter:'#5d2e0c' };
  return m[estilo] || '#3a6a3a';
}

function verificarSesion() {
  fetch('/sesion').then(r=>r.json()).then(data=>{
    if (data.activa) {
      document.getElementById('navUser').style.display = 'flex';
      document.getElementById('navGuest').style.display = 'none';
      document.getElementById('navNombre').textContent = data.usuario.nombre;
    }
  }).catch(()=>{});
}

function logout() {
  fetch('/logout',{method:'POST'}).then(()=>window.location.href='login.html');
}

let todosProductos = [];
let estiloActual = 'todos';

function cargarProductos() {
  fetch('/productos').then(r=>r.json()).then(data=>{
    todosProductos = Array.isArray(data) ? data : [];
    const elProd = document.getElementById('statProds');
    if (elProd) elProd.textContent = todosProductos.length;
    renderProductos(todosProductos);
  }).catch(()=>renderProductos([]));
}

function filtrarEstilo(estilo, btn) {
  estiloActual = estilo;
  document.querySelectorAll('.cat-chip').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  aplicarFiltros();
}

function buscar() { aplicarFiltros(); }
function ordenarProductos() { aplicarFiltros(); }

function aplicarFiltros() {
  let lista = [...todosProductos];
  if (estiloActual !== 'todos') lista = lista.filter(p=>p.estilo===estiloActual);
  const q = (document.getElementById('busqueda')?.value||'').toLowerCase();
  if (q) lista = lista.filter(p=>
    p.nombre.toLowerCase().includes(q)||
    (p.estilo||'').toLowerCase().includes(q)||
    (p.descripcion||'').toLowerCase().includes(q));
  const orden = document.getElementById('ordenar')?.value;
  if (orden==='precio_asc') lista.sort((a,b)=>a.precio-b.precio);
  else if (orden==='precio_desc') lista.sort((a,b)=>b.precio-a.precio);
  else if (orden==='abv') lista.sort((a,b)=>(b.abv||0)-(a.abv||0));
  else lista.sort((a,b)=>a.nombre.localeCompare(b.nombre));
  renderProductos(lista);
}

function renderProductos(lista) {
  const grid = document.getElementById('productosGrid');
  const noRes = document.getElementById('noResultados');
  if (!grid) return;
  if (!lista||lista.length===0) {
    grid.innerHTML='';
    if (noRes) noRes.style.display='flex';
    return;
  }
  if (noRes) noRes.style.display='none';
  grid.innerHTML = lista.map(p=>`
    <div class="beer-card ${!p.disponible?'sold-out':''}" onclick="abrirModal(${p.id})">
      <div class="beer-card-emoji" style="background:${estiloColor(p.estilo)}22">
        <span class="beer-big-emoji">${estiloEmoji(p.estilo)}</span>
      </div>
      <div class="beer-card-body">
        <div class="beer-card-style">
          <span class="badge badge-beer">${p.estilo}</span>
          ${!p.disponible?'<span class="badge badge-red">Agotado</span>':''}
        </div>
        <div class="beer-card-name">${p.nombre}</div>
        <div class="beer-card-rating">
          ${p.promedio
            ? `${'⭐'.repeat(Math.round(p.promedio))}${'☆'.repeat(5-Math.round(p.promedio))} <span class="rating-num">${Number(p.promedio).toFixed(1)} (${p.total_resenas})</span>`
            : '<span class="rating-empty">Sin reseñas aún</span>'}
        </div>
        <div class="beer-card-meta">
          ${p.abv?`<span>🍺 ${p.abv}% ABV</span>`:''}
          ${p.ibu?`<span>🌿 ${p.ibu} IBU</span>`:''}
          ${p.vendedor_nombre?`<span>👤 ${p.vendedor_nombre}</span>`:''}
        </div>
        ${p.descripcion?`<p class="beer-card-desc">${p.descripcion.substring(0,80)}${p.descripcion.length>80?'…':''}</p>`:''}
      </div>
      <div class="beer-card-footer">
        <span class="beer-card-price">${formatCOP(p.precio)}</span>
        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();agregarAlCarrito(${p.id})" ${!p.disponible?'disabled':''}>
          ${p.disponible?'+ Agregar':'Agotado'}
        </button>
      </div>
    </div>`).join('');
}

function abrirModal(id) {
  const p = todosProductos.find(x=>x.id===id);
  if (!p) return;
  document.getElementById('modalContenido').innerHTML = `
    <div class="modal-beer">
      <div class="modal-beer-emoji" style="background:${estiloColor(p.estilo)}22">
        <span style="font-size:5rem">${estiloEmoji(p.estilo)}</span>
      </div>
      <div class="modal-beer-info">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
          <span class="badge badge-beer">${p.estilo}</span>
          ${!p.disponible?'<span class="badge badge-red">Agotado</span>':'<span class="badge badge-green">Disponible</span>'}
        </div>
        <h2 class="modal-beer-name">${p.nombre}</h2>
        <div class="modal-rating-row">
          ${p.promedio
            ? `${'⭐'.repeat(Math.round(p.promedio))}${'☆'.repeat(5-Math.round(p.promedio))}
               <span class="rating-num">${Number(p.promedio).toFixed(1)} · ${p.total_resenas} reseña${p.total_resenas!==1?'s':''}</span>`
            : '<span class="rating-empty">Sin reseñas aún — ¡sé el primero!</span>'}
        </div>
        <div class="modal-beer-stats">
          ${p.abv?`<div class="modal-stat"><div class="modal-stat-val">${p.abv}%</div><div class="modal-stat-lbl">ABV</div></div>`:''}
          ${p.ibu?`<div class="modal-stat"><div class="modal-stat-val">${p.ibu}</div><div class="modal-stat-lbl">IBU</div></div>`:''}
          <div class="modal-stat"><div class="modal-stat-val" style="color:var(--amber)">${formatCOP(p.precio)}</div><div class="modal-stat-lbl">Precio</div></div>
        </div>
        ${p.descripcion?`<p class="modal-beer-desc">${p.descripcion}</p>`:''}
        ${p.vendedor_nombre?`<p class="modal-vendedor">🍺 Por: <strong>${p.vendedor_nombre}</strong></p>`:''}
        <div style="margin-top:16px;display:flex;gap:10px;align-items:center">
          <div style="display:flex;align-items:center;gap:6px">
            <button class="btn btn-ghost btn-sm qty-btn" onclick="cambiarCantidad(-1)">−</button>
            <span id="modalQty" style="font-weight:600;min-width:24px;text-align:center">1</span>
            <button class="btn btn-ghost btn-sm qty-btn" onclick="cambiarCantidad(1)">+</button>
          </div>
          <button class="btn btn-primary" onclick="agregarAlCarrito(${p.id},parseInt(document.getElementById('modalQty').textContent))" ${!p.disponible?'disabled':''}>
            ${p.disponible?'🛒 Añadir al pedido':'Agotado'}
          </button>
        </div>
      </div>
    </div>
    <div class="resenas-section">
      <div class="resenas-title">⭐ Reseñas</div>
      <div id="resenasList"><p style="color:var(--slate-400);font-size:.85rem">Cargando…</p></div>
    </div>`;
  document.getElementById('modalOverlay').style.display='block';
  document.getElementById('modalProducto').style.display='block';
  document.body.style.overflow='hidden';
  cargarResenas(id);
}

function cambiarCantidad(delta) {
  const el = document.getElementById('modalQty');
  if (!el) return;
  el.textContent = Math.max(1, parseInt(el.textContent)+delta);
}

function cerrarModal() {
  document.getElementById('modalOverlay').style.display='none';
  document.getElementById('modalProducto').style.display='none';
  document.body.style.overflow='';
}

let carrito = JSON.parse(localStorage.getItem('beerutiful_cart')||'[]');

function guardarCarrito() {
  localStorage.setItem('beerutiful_cart',JSON.stringify(carrito));
  actualizarBadgeCarrito();
}

function actualizarBadgeCarrito() {
  const total = carrito.reduce((s,i)=>s+i.cantidad,0);
  const el = document.getElementById('cartCount');
  if (el) el.textContent=total;
}

function agregarAlCarrito(id, cantidad=1) {
  const p = todosProductos.find(x=>x.id===id);
  if (!p||!p.disponible) return;
  const existente = carrito.find(i=>i.id===id);
  if (existente) existente.cantidad+=cantidad;
  else carrito.push({id,nombre:p.nombre,precio:p.precio,estilo:p.estilo,cantidad});
  guardarCarrito();
  renderCarrito();
  showToast(`${p.nombre} agregado al pedido 🍺`,'success',2500);
  cerrarModal();
}

function renderCarrito() {
  const itemsEl=document.getElementById('cartItems');
  const footerEl=document.getElementById('cartFooter');
  if (!itemsEl) return;
  if (carrito.length===0) {
    itemsEl.innerHTML=`<div class="empty-state"><div class="icon">🍺</div><p>Tu carrito está vacío</p></div>`;
    if (footerEl) footerEl.style.display='none';
    return;
  }
  itemsEl.innerHTML=carrito.map((item,idx)=>`
    <div class="cart-item">
      <div class="cart-item-emoji">${estiloEmoji(item.estilo)}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.nombre}</div>
        <div class="cart-item-price">${formatCOP(item.precio)} c/u</div>
      </div>
      <div class="cart-item-qty">
        <button class="qty-btn" onclick="cambiarQtyCart(${idx},-1)">−</button>
        <span>${item.cantidad}</span>
        <button class="qty-btn" onclick="cambiarQtyCart(${idx},1)">+</button>
      </div>
      <button class="cart-remove" onclick="quitarDelCarrito(${idx})">✕</button>
    </div>`).join('');
  const total=carrito.reduce((s,i)=>s+i.precio*i.cantidad,0);
  if (footerEl) {
    footerEl.style.display='block';
    document.getElementById('cartTotal').textContent=formatCOP(total);
  }
}

function cambiarQtyCart(idx,delta) {
  carrito[idx].cantidad=Math.max(1,carrito[idx].cantidad+delta);
  guardarCarrito(); renderCarrito();
}

function quitarDelCarrito(idx) {
  carrito.splice(idx,1); guardarCarrito(); renderCarrito();
}

function toggleCart() {
  const panel=document.getElementById('cartPanel');
  const overlay=document.getElementById('cartOverlay');
  if (!panel) return;
  const open=panel.classList.toggle('open');
  overlay.style.display=open?'block':'none';
  if (open) renderCarrito();
}

function checkout() {
  fetch('/sesion').then(r=>r.json()).then(data=>{
    if (!data.activa) {
      showToast('Debes iniciar sesión para hacer un pedido','warning');
      setTimeout(()=>window.location.href='login.html',1500); return;
    }
    if (carrito.length===0) { showToast('Tu carrito está vacío','warning'); return; }

    document.getElementById('modalContenido').innerHTML = `
      <div style="padding:8px">
        <h2 style="font-family:var(--font-display);font-size:1.8rem;letter-spacing:1px;margin-bottom:4px">🛒 Finalizar pedido</h2>
        <p style="color:var(--slate-400);font-size:.875rem;margin-bottom:20px">Completa los datos de entrega</p>

        <div style="background:var(--slate-50);border-radius:var(--r-lg);padding:14px;margin-bottom:20px">
          <div style="font-weight:600;font-size:.875rem;margin-bottom:10px">📦 Resumen del pedido</div>
          ${carrito.map(i=>`
            <div style="display:flex;justify-content:space-between;font-size:.85rem;padding:4px 0;border-bottom:1px solid var(--slate-100)">
              <span>${estiloEmoji(i.estilo)} ${i.nombre} x${i.cantidad}</span>
              <span style="font-family:var(--font-mono);color:var(--malt)">${formatCOP(i.precio*i.cantidad)}</span>
            </div>`).join('')}
          <div style="display:flex;justify-content:space-between;font-weight:700;font-size:.95rem;margin-top:10px">
            <span>Total</span>
            <span style="font-family:var(--font-mono);color:var(--malt)">${formatCOP(carrito.reduce((s,i)=>s+i.precio*i.cantidad,0))}</span>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:12px">
          <div class="form-group">
            <label class="form-label">👤 Nombre de quien recibe *</label>
            <input class="form-control" type="text" id="ckNombre" placeholder="Ej: Carlos Restrepo">
          </div>
          <div class="form-group">
            <label class="form-label">📍 Dirección de entrega *</label>
            <input class="form-control" type="text" id="ckDireccion" placeholder="Ej: Calle 50 #30-20, Apto 401">
          </div>
          <div class="form-group">
            <label class="form-label">🏙 Ciudad *</label>
            <input class="form-control" type="text" id="ckCiudad" placeholder="Ej: Medellín">
          </div>
          <div class="form-group">
            <label class="form-label">📱 Teléfono de contacto *</label>
            <input class="form-control" type="tel" id="ckTelefono" placeholder="Ej: 3001234567">
          </div>
          <div class="form-group">
            <label class="form-label">💳 Método de pago *</label>
            <select class="form-control" id="ckPago">
              <option value="">Seleccionar…</option>
              <option value="Efectivo contra entrega">💵 Efectivo contra entrega</option>
              <option value="Nequi">📲 Nequi</option>
              <option value="Daviplata">📲 Daviplata</option>
              <option value="Transferencia bancaria">🏦 Transferencia bancaria</option>
              <option value="Tarjeta crédito/débito">💳 Tarjeta crédito/débito</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">📝 Notas adicionales</label>
            <textarea class="form-control" id="ckNotas" rows="2" placeholder="Instrucciones especiales, referencias del lugar…"></textarea>
          </div>
        </div>

        <div id="ckError" class="alert alert-warning" style="display:none;margin-top:12px">
          <span>⚠️</span><span id="ckErrorMsg"></span>
        </div>

        <div style="display:flex;gap:10px;margin-top:20px">
          <button class="btn btn-primary btn-lg" style="flex:1" onclick="confirmarPedido()">Confirmar pedido →</button>
          <button class="btn btn-ghost" onclick="cerrarModal()">Cancelar</button>
        </div>
      </div>`;

    document.getElementById('modalOverlay').style.display='block';
    document.getElementById('modalProducto').style.display='block';
    document.body.style.overflow='hidden';
  });
}

function confirmarPedido() {
  const nombre    = document.getElementById('ckNombre').value.trim();
  const direccion = document.getElementById('ckDireccion').value.trim();
  const ciudad    = document.getElementById('ckCiudad').value.trim();
  const telefono  = document.getElementById('ckTelefono').value.trim();
  const pago      = document.getElementById('ckPago').value;
  const notas     = document.getElementById('ckNotas').value.trim();

  const errEl  = document.getElementById('ckError');
  const errMsg = document.getElementById('ckErrorMsg');
  errEl.style.display='none';

  if (!nombre||!direccion||!ciudad||!telefono||!pago) {
    errEl.style.display='flex';
    errMsg.textContent='Por favor completa todos los campos obligatorios.';
    return;
  }

  fetch('/pedido',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ items:carrito, envio:{ nombre, direccion, ciudad, telefono, pago, notas } })
  })
  .then(r=>r.json())
  .then(res=>{
    if (res.error){ errEl.style.display='flex'; errMsg.textContent=res.mensaje; return; }
    cerrarModal();
    showToast('¡Pedido realizado con éxito! 🍺 Te contactaremos pronto.','success',5000);
    carrito=[]; guardarCarrito(); renderCarrito(); toggleCart();
  })
  .catch(()=>{ errEl.style.display='flex'; errMsg.textContent='Error de conexión. Intenta de nuevo.'; });
}

function cargarVendedores() {
  fetch('/vendedores').then(r=>r.json()).then(data=>{
    const arr=Array.isArray(data)?data:[];
    const el=document.getElementById('statVendedores');
    if (el) el.textContent=arr.length;
    const grid=document.getElementById('vendedoresGrid');
    if (!grid) return;
    if (arr.length===0){grid.innerHTML=`<div class="empty-state light"><div class="icon">🍺</div><p>Pronto habrá vendedores.</p></div>`;return;}
    grid.innerHTML=arr.map(v=>`
      <div class="vendedor-card">
        <div class="vendedor-avatar">${(v.nombre||'V').charAt(0).toUpperCase()}</div>
        <div class="vendedor-info">
          <div class="vendedor-name">${v.nombre}</div>
          <div class="vendedor-meta">🍺 ${v.total_productos||0} productos${v.ciudad?` · 📍 ${v.ciudad}`:''}</div>
        </div>
      </div>`).join('');
  }).catch(()=>{});
}

document.addEventListener('DOMContentLoaded',()=>{ actualizarBadgeCarrito(); });

/* ══ RESEÑAS ══════════════════════════════════════════════ */

function seleccionarEstrella(val) {
  document.querySelectorAll('.estrella-btn').forEach(el=>{
    el.style.opacity = Number(el.dataset.val)<=val ? '1' : '.3';
  });
  const c = document.getElementById('resenaCalif');
  if (c) c.value = val;
}

async function cargarResenas(prodId) {
  const contenedor = document.getElementById('resenasList');
  if (!contenedor) return;
  contenedor.innerHTML='<p style="color:var(--slate-400);font-size:.85rem">Cargando reseñas…</p>';

  try {
    const [resenas, sesion] = await Promise.all([
      fetch(`/producto/${prodId}/resenas`).then(r=>r.json()),
      fetch('/sesion').then(r=>r.json())
    ]);

    const miResena = sesion.activa ? resenas.find(r=>r.usuario_id===sesion.usuario.id) : null;

    let formHtml = '';
    if (sesion.activa) {
      formHtml = `
        <div class="resena-form">
          <div class="resena-form-title">${miResena?'✏️ Editar tu reseña':'✍️ Dejar una reseña'}</div>
          <input type="hidden" id="resenaCalif" value="${miResena?.calificacion||0}">
          <div class="estrellas-picker">
            ${[1,2,3,4,5].map(i=>`<span class="estrella-btn" data-val="${i}" onclick="seleccionarEstrella(${i})" style="font-size:1.6rem;cursor:pointer;opacity:.4;transition:opacity .15s">⭐</span>`).join('')}
          </div>
          <textarea class="form-control" id="resenaComentario" rows="2"
            placeholder="Cuéntanos qué te pareció esta cerveza…"
            style="margin-top:8px;font-size:.875rem">${miResena?.comentario||''}</textarea>
          <div style="display:flex;gap:8px;margin-top:8px">
            <button class="btn btn-primary btn-sm" onclick="enviarResena(${prodId})">
              ${miResena?'Actualizar':'Publicar reseña'}
            </button>
            ${miResena?`<button class="btn btn-danger btn-sm" onclick="eliminarResena(${prodId})">Eliminar</button>`:''}
          </div>
        </div>`;
      if (miResena) setTimeout(()=>seleccionarEstrella(miResena.calificacion), 50);
    } else {
      formHtml = `<p class="resena-login-hint"><a href="login.html" style="color:var(--hops);font-weight:500">Inicia sesión</a> para dejar una reseña.</p>`;
    }

    let listaHtml = '';
    if (!resenas || resenas.length===0) {
      listaHtml='<p style="color:var(--slate-400);font-size:.85rem;margin-top:12px">Sé el primero en reseñar esta cerveza.</p>';
    } else {
      listaHtml=resenas.map(r=>`
        <div class="resena-item ${sesion.activa&&r.usuario_id===sesion.usuario?.id?'resena-mia':''}">
          <div class="resena-header">
            <div class="resena-avatar">${r.autor.charAt(0).toUpperCase()}</div>
            <div>
              <div class="resena-autor">${r.autor} ${sesion.activa&&r.usuario_id===sesion.usuario?.id?'<span class="badge badge-beer" style="font-size:.65rem">Tú</span>':''}</div>
              <div class="resena-fecha">${r.creado_en?.split('T')[0]||''}</div>
            </div>
            <div class="resena-estrellas">${'⭐'.repeat(r.calificacion)}${'☆'.repeat(5-r.calificacion)}</div>
          </div>
          ${r.comentario?`<p class="resena-comentario">${r.comentario}</p>`:''}
        </div>`).join('');
    }

    contenedor.innerHTML = formHtml + '<div class="resenas-divider"></div>' + listaHtml;

  } catch(e) {
    contenedor.innerHTML='<p style="color:var(--slate-400);font-size:.85rem">Error cargando reseñas. Recarga la página.</p>';
    console.error('Error en cargarResenas:', e);
  }
}

async function enviarResena(prodId) {
  const calificacion = parseInt(document.getElementById('resenaCalif').value);
  const comentario   = document.getElementById('resenaComentario').value.trim();
  if (!calificacion||calificacion<1) { showToast('Selecciona una calificación de 1 a 5 estrellas','warning'); return; }
  const res = await fetch(`/producto/${prodId}/resena`,{
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({calificacion,comentario})
  }).then(r=>r.json());
  showToast(res.mensaje, res.error?'error':'success');
  if (!res.error) { cargarResenas(prodId); cargarProductos(); }
}

async function eliminarResena(prodId) {
  if (!confirm('¿Eliminar tu reseña?')) return;
  const res = await fetch(`/producto/${prodId}/resena`,{method:'DELETE'}).then(r=>r.json());
  showToast(res.mensaje, res.error?'error':'success');
  if (!res.error) { cargarResenas(prodId); cargarProductos(); }
}