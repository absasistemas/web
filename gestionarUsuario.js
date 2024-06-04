async function darDeBaja() {
    const usuario = document.getElementById('usuario').value.toUpperCase();
    const usuarioCambia = document.getElementById('usuarioCambia').value.toUpperCase();

    if (!usuario || !usuarioCambia) {
        alert('Los campos Usuario y Usuario Cambia son obligatorios.');
        return;
    }

    const confirmacion = confirm(`Confirma que desea dar de baja al usuario ${usuario}`);
    if (!confirmacion) {
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/darDeBaja', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ usuario, usuarioCambia })
        });

        if (response.ok) {
            alert('Usuario dado de baja correctamente.');
			document.getElementById('usuario').value = '';
            document.getElementById('nuevaContrasena').value = '';
            document.getElementById('correo').value = '';
            document.getElementById('usuarioCambia').value = '';
        } else {
            const mensajeError = await response.text();
            alert(`Error: ${mensajeError}`);
        }
    } catch (error) {
        console.error('Error en la solicitud de dar de baja:', error);
        alert('Error en la solicitud de dar de baja. Consulta la consola para más detalles.');
    }
}

async function cambiarContrasena() {
    const usuario = document.getElementById('usuario').value.toUpperCase();
    const nuevaContrasena = document.getElementById('nuevaContrasena').value;
    const usuarioCambia = document.getElementById('usuarioCambia').value.toUpperCase();
	const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!usuario || !nuevaContrasena || !usuarioCambia) {
        alert('Los campos Usuario, Nueva Contraseña y Usuario Cambia son obligatorios.');
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/resetearContrasena', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ usuario, nuevaContrasena, usuarioCambia, timeZone })
        });

        if (response.ok) {
            alert('Contraseña cambiada correctamente.');
			 // Vaciar el formulario después de un registro exitoso
            document.getElementById('usuario').value = '';
            document.getElementById('nuevaContrasena').value = '';
            document.getElementById('correo').value = '';
            document.getElementById('usuarioCambia').value = '';
        } else {
            const mensajeError = await response.text();
            alert(`Error: ${mensajeError}`);
        }
    } catch (error) {
        console.error('Error en la solicitud de cambiar contraseña:', error);
        alert('Error en la solicitud de cambiar contraseña. Consulta la consola para más detalles.');
    }
}

/**async function registrarDispositivo() {
    const usuario = document.getElementById('usuario').value;
    const correo = document.getElementById('correo').value;
    const usuarioCambia = document.getElementById('usuarioCambia').value;

    if (!usuario || !correo || !usuarioCambia) {
        alert('Los campos Usuario, Correo y Usuario Cambia son obligatorios.');
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/actualizarDispositivo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ usuario, correo, usuarioCambia })
        });

        if (response.ok) {
            alert('Correo enviado para registrar dispositivo.');
			document.getElementById('usuario').value = '';
            document.getElementById('nuevaContrasena').value = '';
            document.getElementById('correo').value = '';
            document.getElementById('usuarioCambia').value = '';
        } else {
            const mensajeError = await response.text();
            alert(`Error: ${mensajeError}`);
        }
    } catch (error) {
        console.error('Error en la solicitud de registrar dispositivo:', error);
        alert('Error en la solicitud de registrar dispositivo. Consulta la consola para más detalles.');
    }
}*/
async function registrarDispositivo() {
    const usuario = document.getElementById('usuario').value.toUpperCase();
    const correo = document.getElementById('correo').value;
    const usuarioCambia = document.getElementById('usuarioCambia').value.toUpperCase();

    if (!usuario || !correo || !usuarioCambia) {
        alert('Los campos Usuario, Correo y Usuario Cambia son obligatorios.');
        return;
    }

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    try {
        const response = await fetch('http://localhost:3000/actualizarDispositivo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ usuario, correo, usuarioCambia, timeZone })
        });

        if (response.ok) {
            alert('Correo enviado para registrar dispositivo.');
            // Vaciar los campos después de una respuesta exitosa
            document.getElementById('usuario').value = '';
            document.getElementById('nuevaContrasena').value = '';
            document.getElementById('correo').value = '';
            document.getElementById('usuarioCambia').value = '';
        } else {
            const mensajeError = await response.text();
            alert(`Error: ${mensajeError}`);
        }
    } catch (error) {
        console.error('Error en la solicitud de registrar dispositivo:', error);
        alert('Error en la solicitud de registrar dispositivo. Consulta la consola para más detalles.');
    }
}

document.getElementById('btn-registrar-dispositivo').addEventListener('click', registrarDispositivo);

