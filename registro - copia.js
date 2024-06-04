async function registrarUsuario() {
    const usuario = document.getElementById('usuario').value;
    const contrasena = document.getElementById('contrasena').value;
    const nombre = document.getElementById('nombre').value;
    const telefono = document.getElementById('telefono').value;
    const fechaCreacion = new Date().toISOString(); // Obtener la fecha actual en formato ISO

    try {
        const respuesta = await fetch('http://localhost:3000/registro', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ usuario, contrasena, nombre, telefono, fechaCreacion })
        });

        if (respuesta.ok) {
            alert('Usuario registrado exitosamente.');
            // Vaciar el formulario después de un registro exitoso
            document.getElementById('usuario').value = '';
            document.getElementById('contrasena').value = '';
            document.getElementById('nombre').value = '';
            document.getElementById('telefono').value = '';
            // Opcional: Redireccionar a la página de inicio de sesión u otra página
        } else {
            const mensajeError = await respuesta.text();
            alert(`Error: ${mensajeError}`);
        }
    } catch (error) {
        console.error('Error en la solicitud de registro:', error);
        alert('Error en la solicitud de registro. Consulta la consola para más detalles.');
    }
}
