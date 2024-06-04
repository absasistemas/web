async function registrarUsuario() {
    const usuario = document.getElementById('usuario').value.toUpperCase();
    const contrasena = document.getElementById('contrasena').value;
    const documento = document.getElementById('documento').value;
    const nombres = document.getElementById('nombres').value.toUpperCase();
    const apellidos = document.getElementById('apellidos').value.toUpperCase();
    const telefono = document.getElementById('telefono').value;
    const correo = document.getElementById('correo').value;
    const usuarioCreacion = document.getElementById('usuarioCreacion').value.toUpperCase();
    const fechaCreacion = new Date().toISOString(); // Obtener la fecha actual en formato ISO

    try {
        const respuesta = await fetch('http://localhost:3000/registro', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ usuario, contrasena, documento, nombres, apellidos, telefono, correo, usuarioCreacion, fechaCreacion })
        });

        if (respuesta.ok) {
            alert('Usuario registrado exitosamente. Revisa tu correo para registrar tu dispositivo.');
            // Vaciar el formulario después de un registro exitoso
            document.getElementById('usuario').value = '';
            document.getElementById('contrasena').value = '';
            document.getElementById('documento').value = '';
            document.getElementById('nombres').value = '';
            document.getElementById('apellidos').value = '';
            document.getElementById('telefono').value = '';
            document.getElementById('correo').value = '';
            document.getElementById('usuarioCreacion').value = '';
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
