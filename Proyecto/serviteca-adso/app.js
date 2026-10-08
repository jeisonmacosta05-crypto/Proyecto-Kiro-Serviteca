/* ============================================================
   SERVITECA ADSO - app.js
   Aplicación de gestión de clientes, vehículos y servicios
   Sin frameworks ni librerías externas.
============================================================ */

'use strict';

/* ============================================================
   CONSTANTES
============================================================ */
const CLAVE_SESION      = 'serviteca_sesion';
const CLAVE_CLIENTES    = 'serviteca_clientes';
const CLAVE_CARROS      = 'serviteca_carros';
const CLAVE_SERVICIOS   = 'serviteca_servicios';
const CLAVE_INTENTOS    = 'serviteca_intentos';
const CLAVE_BLOQUEO     = 'serviteca_bloqueo';

const USUARIO_VALIDO    = 'admin';
const PASSWORD_VALIDA   = '1234';
const MAX_INTENTOS      = 5;
const TIEMPO_BLOQUEO_MS = 60 * 1000; // 60 segundos

/* ============================================================
   UTILIDADES
============================================================ */

/**
 * Obtiene un array desde localStorage. Retorna [] si no existe o hay error.
 * @param {string} clave
 * @returns {Array}
 */
function getData(clave) {
  try {
    const raw = localStorage.getItem(clave);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Persiste un array en localStorage.
 * @param {string} clave
 * @param {Array} array
 */
function saveData(clave, array) {
  localStorage.setItem(clave, JSON.stringify(array));
}

/**
 * Muestra un mensaje en el contenedor indicado.
 * @param {string} idContenedor  - ID del div de mensajes
 * @param {string} mensaje
 * @param {string} tipo          - 'error' | 'exito'
 */
function mostrarMensaje(idContenedor, mensaje, tipo) {
  const el = document.getElementById(idContenedor);
  if (!el) return;
  el.innerHTML = '';
  const div = document.createElement('div');
  div.className = tipo === 'exito' ? 'msg-exito' : 'msg-error';
  div.textContent = mensaje;
  el.appendChild(div);
}

/**
 * Limpia el contenedor de mensajes.
 * @param {string} idContenedor
 */
function limpiarMensaje(idContenedor) {
  const el = document.getElementById(idContenedor);
  if (el) el.innerHTML = '';
}

/**
 * Retorna la fecha de hoy en formato YYYY-MM-DD.
 * @returns {string}
 */
function hoyISO() {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = String(hoy.getMonth() + 1).padStart(2, '0');
  const d = String(hoy.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/* ============================================================
   MÓDULO SESIÓN
============================================================ */

/**
 * Inicialización: decide qué mostrar según sessionStorage.
 * Se llama en DOMContentLoaded.
 */
function init() {
  const sesion = sessionStorage.getItem(CLAVE_SESION);
  if (sesion === 'activa') {
    document.getElementById('navbar').style.display = 'flex';
    mostrarPantalla('pantalla-bienvenida');
  } else {
    document.getElementById('pantalla-login').style.display = 'flex';
  }

  // Configurar fecha máxima en el campo fecha de servicios
  const fechaInput = document.getElementById('srv-fecha');
  if (fechaInput) {
    fechaInput.max = hoyISO();
  }

  // Cerrar submenús al hacer clic fuera del navbar
  document.addEventListener('click', function (e) {
    const navbar = document.getElementById('navbar');
    if (navbar && !navbar.contains(e.target)) {
      cerrarTodosSubmenus();
    }
  });

  // Login al presionar Enter en los campos de login
  const inputPass = document.getElementById('login-password');
  if (inputPass) {
    inputPass.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') login();
    });
  }
  const inputUser = document.getElementById('login-usuario');
  if (inputUser) {
    inputUser.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') login();
    });
  }
}

/**
 * Procesa el intento de login.
 */
function login() {
  limpiarMensaje('msg-login');

  const usuario  = document.getElementById('login-usuario').value.trim();
  const password = document.getElementById('login-password').value;

  // Verificar bloqueo
  const bloqueoHasta = parseInt(localStorage.getItem(CLAVE_BLOQUEO) || '0', 10);
  if (Date.now() < bloqueoHasta) {
    const restantes = Math.ceil((bloqueoHasta - Date.now()) / 1000);
    mostrarMensaje('msg-login',
      `Cuenta bloqueada. Intenta de nuevo en ${restantes} segundo${restantes !== 1 ? 's' : ''}.`,
      'error');
    return;
  }

  // Campos vacíos
  if (!usuario || !password) {
    mostrarMensaje('msg-login', 'Ambos campos son obligatorios', 'error');
    return;
  }

  // Credenciales válidas
  if (usuario === USUARIO_VALIDO && password === PASSWORD_VALIDA) {
    // Resetear intentos
    localStorage.removeItem(CLAVE_INTENTOS);
    localStorage.removeItem(CLAVE_BLOQUEO);

    // Crear sesión
    sessionStorage.setItem(CLAVE_SESION, 'activa');

    // Limpiar campos
    document.getElementById('login-usuario').value = '';
    document.getElementById('login-password').value = '';

    // Mostrar app
    document.getElementById('pantalla-login').style.display = 'none';
    document.getElementById('navbar').style.display = 'flex';
    mostrarPantalla('pantalla-bienvenida');
    return;
  }

  // Credenciales incorrectas
  let intentos = parseInt(localStorage.getItem(CLAVE_INTENTOS) || '0', 10) + 1;
  localStorage.setItem(CLAVE_INTENTOS, String(intentos));

  if (intentos >= MAX_INTENTOS) {
    const hasta = Date.now() + TIEMPO_BLOQUEO_MS;
    localStorage.setItem(CLAVE_BLOQUEO, String(hasta));
    localStorage.setItem(CLAVE_INTENTOS, '0');
    mostrarMensaje('msg-login',
      'Has superado el número máximo de intentos. Cuenta bloqueada por 60 segundos.',
      'error');
  } else {
    const restantes = MAX_INTENTOS - intentos;
    mostrarMensaje('msg-login',
      `Usuario o contraseña incorrectos. Te quedan ${restantes} intento${restantes !== 1 ? 's' : ''}.`,
      'error');
  }
}

/**
 * Cierra la sesión y regresa al login.
 */
function logout() {
  sessionStorage.removeItem(CLAVE_SESION);
  document.getElementById('navbar').style.display = 'none';

  // Ocultar todas las pantallas
  document.querySelectorAll('.pantalla').forEach(function (p) {
    p.style.display = 'none';
  });

  document.getElementById('pantalla-login').style.display = 'flex';
  limpiarMensaje('msg-login');
  document.getElementById('login-usuario').value = '';
  document.getElementById('login-password').value = '';
  cerrarTodosSubmenus();
}

/**
 * Oculta todas las pantallas y muestra la indicada.
 * @param {string} id - ID de la pantalla a mostrar
 */
function mostrarPantalla(id) {
  document.querySelectorAll('.pantalla').forEach(function (p) {
    p.style.display = 'none';
  });
  const pantalla = document.getElementById(id);
  if (pantalla) {
    pantalla.style.display = 'block';
  }
  cerrarTodosSubmenus();
  // Scroll al inicio
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Navega a una pantalla y ejecuta lógica de inicialización si aplica.
 * @param {string} id
 */
function irA(id) {
  mostrarPantalla(id);

  // Limpiar resultados previos al navegar a consulta
  if (id === 'pantalla-clientes-consultar') {
    limpiarMensaje('msg-clientes-consultar');
    document.getElementById('resultado-cliente').innerHTML = '';
    const input = document.getElementById('consultar-cli-id');
    if (input) input.value = '';
  }
  if (id === 'pantalla-carros-consultar') {
    limpiarMensaje('msg-carros-consultar');
    document.getElementById('resultado-carro').innerHTML = '';
    const input = document.getElementById('consultar-car-placa');
    if (input) input.value = '';
  }
  if (id === 'pantalla-servicios-consultar') {
    limpiarMensaje('msg-servicios-consultar');
    document.getElementById('resultado-servicios').innerHTML = '';
    const input = document.getElementById('consultar-srv-placa');
    if (input) input.value = '';
  }

  // Auto-ejecutar listados al navegar
  if (id === 'pantalla-clientes-listar')   listarClientes();
  if (id === 'pantalla-carros-listar')     listarCarros();
  if (id === 'pantalla-servicios-listar')  listarServicios();

  // Configurar fecha máxima en servicios
  if (id === 'pantalla-servicios-agregar') {
    const fechaInput = document.getElementById('srv-fecha');
    if (fechaInput) fechaInput.max = hoyISO();
  }
}

/* ============================================================
   MÓDULO SUBMENÚS
============================================================ */

/**
 * Abre o cierra el submenú del ítem indicado.
 * @param {string} idMenuItem
 */
function toggleSubmenu(idMenuItem) {
  const item = document.getElementById(idMenuItem);
  if (!item) return;
  const estaAbierto = item.classList.contains('abierto');

  // Cerrar todos primero
  cerrarTodosSubmenus();

  // Si no estaba abierto, abrirlo
  if (!estaAbierto) {
    item.classList.add('abierto');
  }
}

/**
 * Cierra todos los submenús del navbar.
 */
function cerrarTodosSubmenus() {
  document.querySelectorAll('.menu-item.abierto').forEach(function (m) {
    m.classList.remove('abierto');
  });
}

/* ============================================================
   MÓDULO CLIENTES
============================================================ */

/**
 * Valida, verifica duplicado y persiste un nuevo cliente.
 */
function guardarCliente() {
  limpiarMensaje('msg-clientes-agregar');

  const identificacion = document.getElementById('cli-identificacion').value.trim();
  const nombres        = document.getElementById('cli-nombres').value.trim();
  const apellidos      = document.getElementById('cli-apellidos').value.trim();
  const email          = document.getElementById('cli-email').value.trim();
  const celular        = document.getElementById('cli-celular').value.trim();

  // Campos obligatorios
  if (!identificacion || !nombres || !apellidos || !email || !celular) {
    mostrarMensaje('msg-clientes-agregar', 'Todos los campos son obligatorios', 'error');
    return;
  }

  // Longitudes
  if (identificacion.length > 20) {
    mostrarMensaje('msg-clientes-agregar', 'La identificación no puede superar 20 caracteres', 'error');
    return;
  }
  if (nombres.length > 100) {
    mostrarMensaje('msg-clientes-agregar', 'Los nombres no pueden superar 100 caracteres', 'error');
    return;
  }
  if (apellidos.length > 100) {
    mostrarMensaje('msg-clientes-agregar', 'Los apellidos no pueden superar 100 caracteres', 'error');
    return;
  }

  // Validar email
  const regexEmail = /^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/;
  if (!regexEmail.test(email)) {
    mostrarMensaje('msg-clientes-agregar',
      'El correo electrónico no tiene un formato válido (ej: usuario@dominio.com)', 'error');
    return;
  }

  // Validar celular
  const regexCelular = /^\d{10}$/;
  if (!regexCelular.test(celular)) {
    mostrarMensaje('msg-clientes-agregar',
      'El celular debe contener exactamente 10 dígitos numéricos', 'error');
    return;
  }

  // Verificar duplicado
  const clientes = getData(CLAVE_CLIENTES);
  const existe = clientes.some(function (c) {
    return c.identificacion === identificacion;
  });
  if (existe) {
    mostrarMensaje('msg-clientes-agregar',
      'La identificación ya se encuentra registrada', 'error');
    return;
  }

  // Guardar
  clientes.push({ identificacion, nombres, apellidos, email, celular });
  saveData(CLAVE_CLIENTES, clientes);

  // Confirmar y limpiar
  mostrarMensaje('msg-clientes-agregar', 'Cliente registrado exitosamente', 'exito');
  limpiarFormCliente();
}

/**
 * Limpia el formulario de agregar cliente.
 */
function limpiarFormCliente() {
  document.getElementById('cli-identificacion').value = '';
  document.getElementById('cli-nombres').value = '';
  document.getElementById('cli-apellidos').value = '';
  document.getElementById('cli-email').value = '';
  document.getElementById('cli-celular').value = '';
}

/**
 * Busca un cliente por identificación y muestra el resultado.
 */
function consultarCliente() {
  limpiarMensaje('msg-clientes-consultar');
  document.getElementById('resultado-cliente').innerHTML = '';

  const id = document.getElementById('consultar-cli-id').value.trim();
  if (!id) {
    mostrarMensaje('msg-clientes-consultar', 'Ingresa una identificación para buscar', 'error');
    return;
  }

  const clientes = getData(CLAVE_CLIENTES);
  const cliente  = clientes.find(function (c) { return c.identificacion === id; });

  if (!cliente) {
    mostrarMensaje('msg-clientes-consultar',
      'No se encontró ningún cliente con esa identificación', 'error');
    return;
  }

  const html = `
    <div class="tarjeta-resultado">
      <h3>👤 Datos del cliente</h3>
      <div class="tarjeta-campo">
        <span class="tarjeta-label">Identificación:</span>
        <span class="tarjeta-valor">${escHtml(cliente.identificacion)}</span>
      </div>
      <div class="tarjeta-campo">
        <span class="tarjeta-label">Nombres:</span>
        <span class="tarjeta-valor">${escHtml(cliente.nombres)}</span>
      </div>
      <div class="tarjeta-campo">
        <span class="tarjeta-label">Apellidos:</span>
        <span class="tarjeta-valor">${escHtml(cliente.apellidos)}</span>
      </div>
      <div class="tarjeta-campo">
        <span class="tarjeta-label">Correo:</span>
        <span class="tarjeta-valor">${escHtml(cliente.email)}</span>
      </div>
      <div class="tarjeta-campo">
        <span class="tarjeta-label">Celular:</span>
        <span class="tarjeta-valor">${escHtml(cliente.celular)}</span>
      </div>
    </div>`;
  document.getElementById('resultado-cliente').innerHTML = html;
}

/**
 * Recupera, ordena por apellidos/nombres y renderiza la tabla de clientes.
 */
function listarClientes() {
  limpiarMensaje('msg-clientes-listar');
  const contenedor = document.getElementById('tabla-clientes');
  contenedor.innerHTML = '';

  const clientes = getData(CLAVE_CLIENTES);
  if (clientes.length === 0) {
    contenedor.innerHTML = '<p class="sin-registros">No hay clientes registrados</p>';
    return;
  }

  // Ordenar por apellidos, luego por nombres
  const ordenados = clientes.slice().sort(function (a, b) {
    const cmpApellidos = a.apellidos.localeCompare(b.apellidos, 'es', { sensitivity: 'base' });
    if (cmpApellidos !== 0) return cmpApellidos;
    return a.nombres.localeCompare(b.nombres, 'es', { sensitivity: 'base' });
  });

  let filas = '';
  ordenados.forEach(function (c) {
    filas += `
      <tr>
        <td>${escHtml(c.identificacion)}</td>
        <td>${escHtml(c.nombres)}</td>
        <td>${escHtml(c.apellidos)}</td>
        <td>${escHtml(c.email)}</td>
        <td>${escHtml(c.celular)}</td>
      </tr>`;
  });

  contenedor.innerHTML = `
    <div class="tabla-wrapper">
      <table>
        <thead>
          <tr>
            <th>Identificación</th>
            <th>Nombres</th>
            <th>Apellidos</th>
            <th>Correo</th>
            <th>Celular</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    </div>`;
}

/* ============================================================
   MÓDULO CARROS
============================================================ */

/**
 * Valida formato de placa, verifica duplicado y persiste el vehículo.
 */
function guardarCarro() {
  limpiarMensaje('msg-carros-agregar');

  const placa  = document.getElementById('car-placa').value.trim().toUpperCase();
  const marca  = document.getElementById('car-marca').value.trim();
  const modelo = document.getElementById('car-modelo').value.trim();

  // Campos obligatorios
  if (!placa || !marca || !modelo) {
    mostrarMensaje('msg-carros-agregar', 'Todos los campos son obligatorios', 'error');
    return;
  }

  // Longitudes
  if (marca.length > 50) {
    mostrarMensaje('msg-carros-agregar', 'La marca no puede superar 50 caracteres', 'error');
    return;
  }
  if (modelo.length > 50) {
    mostrarMensaje('msg-carros-agregar', 'El modelo no puede superar 50 caracteres', 'error');
    return;
  }

  // Formato placa
  const regexPlaca = /^[A-Za-z]{3}[0-9]{3}$/;
  if (!regexPlaca.test(placa)) {
    mostrarMensaje('msg-carros-agregar',
      'La placa debe tener el formato: 3 letras seguidas de 3 dígitos (ej: ABC123)', 'error');
    return;
  }

  // Verificar duplicado (comparar en MAYÚSCULAS, ya fue convertida)
  const carros = getData(CLAVE_CARROS);
  const existe = carros.some(function (c) {
    return c.placa.toUpperCase() === placa;
  });
  if (existe) {
    mostrarMensaje('msg-carros-agregar',
      'La placa ya se encuentra registrada', 'error');
    return;
  }

  // Guardar en MAYÚSCULAS
  carros.push({ placa, marca, modelo });
  saveData(CLAVE_CARROS, carros);

  mostrarMensaje('msg-carros-agregar', 'Vehículo registrado exitosamente', 'exito');
  limpiarFormCarro();
}

/**
 * Limpia el formulario de agregar carro.
 */
function limpiarFormCarro() {
  document.getElementById('car-placa').value  = '';
  document.getElementById('car-marca').value  = '';
  document.getElementById('car-modelo').value = '';
}

/**
 * Busca un carro por placa (sin distinción de mayúsculas) y muestra el resultado.
 */
function consultarCarro() {
  limpiarMensaje('msg-carros-consultar');
  document.getElementById('resultado-carro').innerHTML = '';

  const placa = document.getElementById('consultar-car-placa').value.trim().toUpperCase();
  if (!placa) {
    mostrarMensaje('msg-carros-consultar', 'Ingresa una placa para buscar', 'error');
    return;
  }

  const carros = getData(CLAVE_CARROS);
  const carro  = carros.find(function (c) {
    return c.placa.toUpperCase() === placa;
  });

  if (!carro) {
    mostrarMensaje('msg-carros-consultar',
      'No se encontró ningún vehículo con esa placa', 'error');
    return;
  }

  const html = `
    <div class="tarjeta-resultado">
      <h3>🚗 Datos del vehículo</h3>
      <div class="tarjeta-campo">
        <span class="tarjeta-label">Placa:</span>
        <span class="tarjeta-valor">${escHtml(carro.placa)}</span>
      </div>
      <div class="tarjeta-campo">
        <span class="tarjeta-label">Marca:</span>
        <span class="tarjeta-valor">${escHtml(carro.marca)}</span>
      </div>
      <div class="tarjeta-campo">
        <span class="tarjeta-label">Modelo:</span>
        <span class="tarjeta-valor">${escHtml(carro.modelo)}</span>
      </div>
    </div>`;
  document.getElementById('resultado-carro').innerHTML = html;
}

/**
 * Recupera y renderiza la tabla de carros.
 */
function listarCarros() {
  limpiarMensaje('msg-carros-listar');
  const contenedor = document.getElementById('tabla-carros');
  contenedor.innerHTML = '';

  const carros = getData(CLAVE_CARROS);
  if (carros.length === 0) {
    contenedor.innerHTML = '<p class="sin-registros">No hay vehículos registrados</p>';
    return;
  }

  let filas = '';
  carros.forEach(function (c) {
    filas += `
      <tr>
        <td>${escHtml(c.placa)}</td>
        <td>${escHtml(c.marca)}</td>
        <td>${escHtml(c.modelo)}</td>
      </tr>`;
  });

  contenedor.innerHTML = `
    <div class="tabla-wrapper">
      <table>
        <thead>
          <tr>
            <th>Placa</th>
            <th>Marca</th>
            <th>Modelo</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    </div>`;
}

/* ============================================================
   MÓDULO SERVICIOS
============================================================ */

/**
 * Valida todos los campos y FK, persiste el servicio.
 */
function guardarServicio() {
  limpiarMensaje('msg-servicios-agregar');

  const placa          = document.getElementById('srv-placa').value.trim().toUpperCase();
  const identificacion = document.getElementById('srv-identificacion').value.trim();
  const fecha          = document.getElementById('srv-fecha').value;
  const tipoServicio   = document.getElementById('srv-tipo').value;

  // Campos obligatorios
  if (!placa || !identificacion || !fecha || !tipoServicio) {
    mostrarMensaje('msg-servicios-agregar', 'Todos los campos son obligatorios', 'error');
    return;
  }

  // Verificar que la placa exista en carros
  const carros = getData(CLAVE_CARROS);
  const carroExiste = carros.some(function (c) {
    return c.placa.toUpperCase() === placa;
  });
  if (!carroExiste) {
    mostrarMensaje('msg-servicios-agregar',
      'La placa del vehículo no está registrada', 'error');
    return;
  }

  // Verificar que el cliente exista
  const clientes = getData(CLAVE_CLIENTES);
  const clienteExiste = clientes.some(function (c) {
    return c.identificacion === identificacion;
  });
  if (!clienteExiste) {
    mostrarMensaje('msg-servicios-agregar',
      'El cliente no está registrado', 'error');
    return;
  }

  // Verificar que la fecha no sea futura
  if (fecha > hoyISO()) {
    mostrarMensaje('msg-servicios-agregar',
      'La fecha del servicio no puede ser una fecha futura', 'error');
    return;
  }

  // Guardar
  const servicios = getData(CLAVE_SERVICIOS);
  servicios.push({ placa, identificacion, fecha, tipoServicio });
  saveData(CLAVE_SERVICIOS, servicios);

  mostrarMensaje('msg-servicios-agregar', 'Servicio registrado exitosamente', 'exito');
  limpiarFormServicio();
}

/**
 * Limpia el formulario de agregar servicio.
 */
function limpiarFormServicio() {
  document.getElementById('srv-placa').value          = '';
  document.getElementById('srv-identificacion').value = '';
  document.getElementById('srv-fecha').value          = '';
  document.getElementById('srv-tipo').value           = '';
  // Restablecer fecha máxima
  document.getElementById('srv-fecha').max = hoyISO();
}

/**
 * Busca servicios por placa de vehículo y muestra el resultado.
 */
function consultarServicios() {
  limpiarMensaje('msg-servicios-consultar');
  document.getElementById('resultado-servicios').innerHTML = '';

  const placa = document.getElementById('consultar-srv-placa').value.trim().toUpperCase();
  if (!placa) {
    mostrarMensaje('msg-servicios-consultar', 'Ingresa una placa para buscar', 'error');
    return;
  }

  // Verificar que la placa exista en carros
  const carros = getData(CLAVE_CARROS);
  const carroExiste = carros.some(function (c) {
    return c.placa.toUpperCase() === placa;
  });
  if (!carroExiste) {
    mostrarMensaje('msg-servicios-consultar',
      'No se encontró ningún vehículo con esa placa', 'error');
    return;
  }

  // Filtrar servicios por placa
  const servicios = getData(CLAVE_SERVICIOS);
  const filtrados  = servicios.filter(function (s) {
    return s.placa.toUpperCase() === placa;
  });

  if (filtrados.length === 0) {
    mostrarMensaje('msg-servicios-consultar',
      'El vehículo no tiene servicios registrados', 'error');
    return;
  }

  let filas = '';
  filtrados.forEach(function (s) {
    filas += `
      <tr>
        <td>${escHtml(s.placa)}</td>
        <td>${escHtml(s.tipoServicio)}</td>
        <td>${escHtml(s.fecha)}</td>
      </tr>`;
  });

  document.getElementById('resultado-servicios').innerHTML = `
    <div class="tabla-wrapper">
      <table>
        <thead>
          <tr>
            <th>Placa</th>
            <th>Servicio prestado</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    </div>`;
}

/**
 * Recupera todos los servicios y los renderiza en tabla.
 */
function listarServicios() {
  limpiarMensaje('msg-servicios-listar');
  const contenedor = document.getElementById('tabla-servicios');
  contenedor.innerHTML = '';

  const servicios = getData(CLAVE_SERVICIOS);
  if (servicios.length === 0) {
    contenedor.innerHTML = '<p class="sin-registros">No hay servicios registrados</p>';
    return;
  }

  let filas = '';
  servicios.forEach(function (s) {
    filas += `
      <tr>
        <td>${escHtml(s.placa)}</td>
        <td>${escHtml(s.identificacion)}</td>
        <td>${escHtml(s.tipoServicio)}</td>
        <td>${escHtml(s.fecha)}</td>
      </tr>`;
  });

  contenedor.innerHTML = `
    <div class="tabla-wrapper">
      <table>
        <thead>
          <tr>
            <th>Placa</th>
            <th>Identificación cliente</th>
            <th>Tipo de servicio</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    </div>`;
}

/* ============================================================
   UTILIDADES DE SEGURIDAD
============================================================ */

/**
 * Escapa caracteres HTML para prevenir XSS al insertar datos en el DOM.
 * @param {*} valor
 * @returns {string}
 */
function escHtml(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ============================================================
   ARRANQUE
============================================================ */
document.addEventListener('DOMContentLoaded', init);
