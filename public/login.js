async function iniciarSesion() {
    const usuario = document.getElementById('usuario').value;
    const contrasena = document.getElementById('contrasena').value;
    const nombreDispositivo = navigator.userAgent;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const fp = await FingerprintJS.load();
    const result = await fp.get();
    const visitorId = result.visitorId;

    try {
		 const respuesta = await fetch('/login', { // Cambiamos la URL a una ruta relativa	
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ usuario, contrasena, visitorId, nombreDispositivo, timeZone })
        });

        const contentType = respuesta.headers.get('Content-Type');
        if (!contentType || !contentType.includes('application/json')) {
            const mensajeError = await respuesta.text();
            throw new Error(`Respuesta no válida del servidor: ${mensajeError}`);
        }

        const data = await respuesta.json();

        if (respuesta.ok) {
            sessionStorage.setItem('usuario', usuario);
            const fechaLoginUTC = new Date().toISOString();  // Guardar en UTC
            sessionStorage.setItem('fechaLoginUTC', fechaLoginUTC);
			
			 if (data.cambioContrasenaRequerido) {
                window.location.href = '/cambiarContrasena.html'; // Cambiamos la URL a una ruta relativa
            } else {
                window.location.href = '/dashboard.html'; // Cambiamos la URL a una ruta relativa
            }
        } else {
            alert(`Error: ${data.message || 'Error desconocido en el servidor'}`);
        }
    } catch (error) {
        console.error('Error en la solicitud de inicio de sesión:', error);
        alert('Error en la solicitud de inicio de sesión. Consulta la consola para más detalles.');
    }
}
