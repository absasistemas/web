document.getElementById('btn-registrar').addEventListener('click', async () => {
    const fp = await FingerprintJS.load();
    const result = await fp.get();

    const visitorId = result.visitorId;
    const params = new URLSearchParams(window.location.search);
    const usuario = params.get('usuario');

    if (!usuario) {
        alert('No se encontró información de usuario. Por favor, inicie sesión nuevamente.');
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/registrarDispositivo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ usuario, visitorId })
        });

        if (response.ok) {
            alert('Dispositivo registrado correctamente.');
            window.location.href = 'http://localhost:3000/login.html';
        } else {
            const errorMessage = await response.text();
            alert(`Error al registrar dispositivo: ${errorMessage}`);
        }
    } catch (error) {
        console.error('Error al registrar dispositivo:', error);
        alert('Error al registrar dispositivo. Consulte la consola para más detalles.');
    }
});
