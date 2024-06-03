async function cambiarContrasena() {
    const contrasenaActual = document.getElementById('currentPassword').value;
    const contrasenaNueva = document.getElementById('newPassword').value;
    const confirmarContrasenaNueva = document.getElementById('confirmNewPassword').value;
    const usuario = sessionStorage.getItem('usuario'); // Asumiendo que el usuario está almacenado en sessionStorage

    // Validar la estructura de la nueva contraseña
    const contrasenaRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    if (!contrasenaRegex.test(contrasenaNueva)) {
        alert('La nueva contraseña debe contener al menos 8 caracteres, incluyendo al menos una letra, un número y un carácter especial.');
        return;
    }

    if (contrasenaNueva !== confirmarContrasenaNueva) {
        alert('La nueva contraseña y la confirmación no coinciden.');
        return;
    }

    try {
        // Obtener la zona horaria del cliente
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        const respuesta = await fetch('http://localhost:3000/cambiarContrasena', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ usuario, contrasenaActual, contrasenaNueva, timeZone })
        });

        if (respuesta.ok) {
            alert('Contraseña actualizada correctamente.');
            window.location.href = 'http://localhost:3000/dashboard.html';
        } else {
            const mensajeError = await respuesta.text();
            alert(`Error: ${mensajeError}`);
        }
    } catch (error) {
        console.error('Error en la solicitud de cambio de contraseña:', error);
        alert('Error en la solicitud de cambio de contraseña. Consulta la consola para más detalles.');
    }
}
