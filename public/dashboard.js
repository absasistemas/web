let usuarioHaRegistrado = {
    Ingreso: false,
    SalidaLunch: false,
    RetornoLunch: false,
    Salida: false
};

async function obtenerCoordenadas() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            }, (error) => {
                reject(error);
            });
        } else {
            reject(new Error('Geolocalización no soportada.'));
        }
    });
}

async function registrarAsistencia(tipo) {
	const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    try {
        const coordenadas = await obtenerCoordenadas();
        const hora = new Date().toLocaleTimeString();


        if (tipo === 'Salida') {
            const confirmar = confirm('Al ejecutar esta acción usted va a cerrar su jornada laboral y no podrá realizar cambios en sus registros. ¿Desea continuar?');
            if (!confirmar) {
                return;
            }
        }

        const requestBody = {
            tipo,
            hora,
            latitude: coordenadas.latitude,
            longitude: coordenadas.longitude,
            timeZone
        };

        // Agregar condiciones para los botones de Salida Lunch y Retorno Lunch
        if (tipo === 'SalidaLunch' || tipo === 'RetornoLunch') {
            requestBody[`latitude${tipo}`] = coordenadas.latitude; // Agregar latitud específica
            requestBody[`longitude${tipo}`] = coordenadas.longitude; // Agregar longitud específica
        }

        const response = await fetch('/registrarAsistencia', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (response.ok) {
            usuarioHaRegistrado[tipo] = true;
            alert(`${tipo} registrado correctamente.`);
            actualizarEstadoBotones();
        } else {
            const errorMessage = await response.text();
            alert(`Error al registrar ${tipo.toLowerCase()}: ${errorMessage}`);
        }

        if (tipo === 'Salida') {
            desactivarBotones();
        }
    } catch (error) {
        console.error(`Error al registrar ${tipo.toLowerCase()}:`, error);
        alert(`Error al registrar ${tipo.toLowerCase()}.`);
    }
}


async function actualizarEstadoBotones() {
    try {
        const response = await fetch('/estadoAsistencia');
        if (response.ok) {
            const estado = await response.json();
            document.getElementById('btn-ingreso').disabled = !estado.Ingreso;
            document.getElementById('btn-salida-lunch').disabled = !estado.SalidaLunch;
            document.getElementById('btn-retorno-lunch').disabled = !estado.RetornoLunch;
            document.getElementById('btn-salida').disabled = !estado.Salida;
        } else {
            const errorMessage = await response.text();
            console.error('Error al obtener el estado de asistencia:', errorMessage);
        }
    } catch (error) {
        console.error('Error al obtener el estado de asistencia:', error);
    }
}

function desactivarBotones() {
    document.getElementById('btn-ingreso').disabled = true;
    document.getElementById('btn-salida-lunch').disabled = true;
    document.getElementById('btn-retorno-lunch').disabled = true;
    document.getElementById('btn-salida').disabled = true;
}

function iniciarTemporizadorInactividad() {
    let tiempoInactividad = 0;
    const tiempoLimite = 3 * 60 * 1000; // 3 minutos

    function reiniciarTemporizador() {
        tiempoInactividad = 0;
    }

    function verificarInactividad() {
        tiempoInactividad += 1000;
        if (tiempoInactividad >= tiempoLimite) {
            alert('Sesión cerrada por inactividad.');
            cerrarSesion();
        }
    }

    document.addEventListener('mousemove', reiniciarTemporizador);
    document.addEventListener('keypress', reiniciarTemporizador);

    setInterval(verificarInactividad, 1000);
}

function cargarInformacionUsuario() {
    const usuario = sessionStorage.getItem('usuario');
    const fechaLogin = sessionStorage.getItem('fechaLogin');

    if (usuario && fechaLogin) {
        document.getElementById('usuario').textContent = usuario;
        document.getElementById('fecha-login').textContent = fechaLogin;
    } else {
        alert('No se encontró información de usuario. Por favor, inicie sesión nuevamente.');
        logout();
    }
}
async function cerrarSesion() {
    try {
        // Guardar estados de los botones antes de cerrar sesión
        const botones = {
            ingreso: document.getElementById('btn-ingreso').disabled,
            salidaLunch: document.getElementById('btn-salida-lunch').disabled,
            retornoLunch: document.getElementById('btn-retorno-lunch').disabled,
            salida: document.getElementById('btn-salida').disabled
        };
        sessionStorage.setItem('estadosBotones', JSON.stringify(botones));

        const response = await fetch('/logout', { method: 'POST' });
        if (response.ok) {
            window.location.href = '/login.html';
        } else {
            const errorMessage = await response.text();
            alert(`Error al cerrar sesión: ${errorMessage}`);
        }
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        alert('Error al cerrar sesión.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const usuario = sessionStorage.getItem('usuario');
    let fechaLoginUTC = sessionStorage.getItem('fechaLoginUTC');
	
    if (!fechaLoginUTC) {
        fechaLoginUTC = new Date().toISOString();  // Guardar en UTC si no está disponible
        sessionStorage.setItem('fechaLoginUTC', fechaLoginUTC);
    }

    // Convertir la fecha UTC a la zona horaria del usuario
    const fechaLoginLocal = new Date(fechaLoginUTC).toLocaleString('es-ES', { timeZone });

    if (usuario && fechaLoginLocal) {
        document.getElementById('usuario').textContent = usuario;
        document.getElementById('fecha-login').textContent = fechaLoginLocal;
    } else {
        alert('No se encontró información de usuario. Por favor, inicie sesión nuevamente.');
        logout();
    }

    actualizarEstadoBotones();
    iniciarTemporizadorInactividad();

    document.getElementById('btn-ingreso').addEventListener('click', () => registrarAsistencia('Ingreso'));
    document.getElementById('btn-salida-lunch').addEventListener('click', () => registrarAsistencia('SalidaLunch'));
    document.getElementById('btn-retorno-lunch').addEventListener('click', () => registrarAsistencia('RetornoLunch'));
    document.getElementById('btn-salida').addEventListener('click', () => registrarAsistencia('Salida'));
    document.getElementById('btn-logout').addEventListener('click', cerrarSesion);
});

