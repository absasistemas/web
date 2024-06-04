const express = require('express');
const cors = require('cors');
//const bcrypt = require('bcrypt');
const bcrypt = require('bcryptjs');
const mysql = require('mysql');
const session = require('express-session');
const moment = require('moment-timezone');
const timeZone = 'America/Guayaquil';
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Configurar ruta para la página de inicio
/*app.get('/', (req, res) => {
    res.redirect('/login.html'); // Redirigir a login.html
});*/

// Ruta por defecto para cargar login.html
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/login.html');
});

// Ruta para acceder a registro.html
app.get('/registro', (req, res) => {
  res.sendFile(__dirname + '/registro.html');
});

app.use(session({
    secret: 'secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 día
}));


const pool = mysql.createPool({
    connectionLimit: 10, // Número máximo de conexiones en el pool
     host: '128.0.0.148',
    port: 3333,
    user: 'sa',
    password: '1234',
    database: 'reportes_absa'
});
const conexionDB = mysql.createConnection({
    host: '128.0.0.148',
    port: 3333,
    user: 'sa',
    password: '1234',
    database: 'reportes_absa'
});

conexionDB.connect((error) => {
    if (error) {
        console.error('Error al conectar a la base de datos:', error);
    } else {
        console.log('Conexión exitosa a la base de datos.');
    }
});
// Configuración de Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail', // Cambia esto si usas otro proveedor de correo
    auth: {
        user: 'absa.sistemas@gmail.com',
        pass: 'zblrsovopldepqoi'
    }
});


app.post('/registro', async (req, res) => {
    try {
        const {
            usuario,
            contrasena,
            documento,
            nombres,
            apellidos,
            telefono,
            correo,
            usuarioCreacion
        } = req.body;

        // Validar el formato del número de teléfono
        const regexTelefono = /^09\d{8}$/;
        if (!regexTelefono.test(telefono)) {
            return res.status(400).json({ error: 'El número de teléfono debe comenzar con 09 y tener 10 dígitos.' });
        }

        // Validar el formato del correo
        const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!regexCorreo.test(correo)) {
            return res.status(400).json({ error: 'El correo no tiene un formato válido.' });
        }

        const fechaCreacion = moment().tz('America/Guayaquil').format('YYYY-MM-DD HH:mm:ss'); // Fecha y hora en la zona horaria de Quito

        const consulta = 'SELECT * FROM login_web WHERE usuario = ?';
        conexionDB.query(consulta, [usuario], async (error, resultados) => {
            if (error) {
                console.error('Error en la consulta:', error);
                return res.status(500).json({ error: 'Error interno del servidor' });
            }

            if (resultados.length > 0) {
                return res.status(400).json({ error: 'El usuario ya está registrado.' });
            }

            const hashedContrasena = await bcrypt.hash(contrasena, 10);

            const insercion = `
                INSERT INTO login_web (usuario, contraseña, documento, nombres, apellidos, telefono, correo, fechaUltimoLogin, estado, fechaCreacion, usuarioCreacion)
                VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 1, ?, ?)
            `;
            conexionDB.query(insercion, [usuario, hashedContrasena, documento, nombres, apellidos, telefono, correo, fechaCreacion, usuarioCreacion], (errorInsercion) => {
                if (errorInsercion) {
                    console.error('Error al insertar usuario en la base de datos:', errorInsercion);
                    return res.status(500).json({ error: 'Error interno del servidor' });
                }

                // Enviar correo para registrar el dispositivo
                const mailOptions = {
                    from: 'absa.sistemas@gmail.com',
                    to: correo,
                    subject: 'Registro de Dispositivo',
                    text: `Hola ${nombres},\n\nPor favor, registra tu dispositivo usando el siguiente enlace:\n\nhttp://localhost:3000/registrarDispositivo.html?usuario=${usuario}`
                };

                transporter.sendMail(mailOptions, (errorEnvio, info) => {
                    if (errorEnvio) {
                        console.error('Error al enviar correo:', errorEnvio);
                        return res.status(500).json({ error: 'Error interno del servidor' });
                    }

                    res.status(201).json({ message: 'Usuario registrado exitosamente. Por favor, revisa tu correo para registrar tu dispositivo.' });
                });
            });
        });
    } catch (error) {
        console.error('Error en el servidor:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post('/registrarDispositivo', async (req, res) => {
    const { usuario, visitorId } = req.body;

    const consulta = 'UPDATE login_web SET dispositivoId = ? WHERE usuario = ?';
    conexionDB.query(consulta, [visitorId, usuario], (error) => {
        if (error) {
            console.error('Error al registrar el dispositivo:', error);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
        res.status(200).send('Dispositivo registrado correctamente.');
    });
});


app.post('/login', async (req, res) => {
    try {
        const { usuario, contrasena, visitorId, nombreDispositivo, timeZone } = req.body;

        const consulta = 'SELECT * FROM login_web WHERE usuario = ?';
        conexionDB.query(consulta, [usuario], async (error, resultados) => {
            if (error) {
                console.error('Error en la consulta:', error);
                return res.status(500).json({ error: 'Error interno del servidor' });
            }

            if (resultados.length === 0) {
                return res.status(401).json({ message: 'Usuario no encontrado.' });
            }
			
			const usuarioEncontrado = resultados[0];
			
			
			if ( usuarioEncontrado.estado === 0) {
                return res.status(401).json({ message: 'Usuario no se encuentra activo. Consulte con el administrador del sistema' });
            }
			
            const contraseñaCoincide = await bcrypt.compare(contrasena, usuarioEncontrado.contraseña);

            if (!contraseñaCoincide) {
                return res.status(401).json({ message: 'Contraseña incorrecta.' });
            }

            // Verificar si el visitorId coincide con el dispositivoId registrado
            if (usuarioEncontrado.dispositivoId !== visitorId) {
                return res.status(401).json({ message: 'Usted está realizando el login desde un dispositivo no autorizado. Póngase en contacto con el administrador.' });
            }

            req.session.usuario = usuario;
            req.session.nombreDispositivo = nombreDispositivo || 'Unknown Device';
            req.session.fecha = new Date().toISOString().slice(0, 10);

            if (!usuarioEncontrado.fechaUltimoLogin) {
                return res.status(200).json({ cambioContrasenaRequerido: true });
            } else {
                const fechaActual = moment().tz(timeZone).format('YYYY-MM-DD HH:mm:ss');
                const actualizacionFechaLogin = 'UPDATE login_web SET fechaUltimoLogin = ? WHERE usuario = ?';
                conexionDB.query(actualizacionFechaLogin, [fechaActual, usuario], (errorActualizacion) => {
                    if (errorActualizacion) {
                        console.error('Error al actualizar fechaUltimoLogin:', errorActualizacion);
                        return res.status(500).json({ error: 'Error interno del servidor' });
                    }

                    res.status(200).json({ cambioContrasenaRequerido: false });
                });
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


app.post('/cambiarContrasena', async (req, res) => {
    try {
        const { usuario, contrasenaActual, contrasenaNueva, timeZone } = req.body;

        // Validar que la zona horaria sea válida
        if (!moment.tz.zone(timeZone)) {
            return res.status(400).json({ error: 'Zona horaria no válida.' });
        }

        // Validar que la nueva contraseña cumpla con los requisitos
        const contrasenaRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
        if (!contrasenaRegex.test(contrasenaNueva)) {
            return res.status(400).json({ error: 'La nueva contraseña debe contener al menos 8 caracteres, incluyendo al menos una letra, un número y un carácter especial.' });
        }

        const consulta = 'SELECT * FROM login_web WHERE usuario = ?';
        conexionDB.query(consulta, [usuario], async (error, resultados) => {
            if (error) {
                console.error('Error en la consulta:', error);
                return res.status(500).json({ error: 'Error interno del servidor' });
            }

            if (resultados.length === 0) {
                return res.status(404).json({ error: 'Usuario no encontrado.' });
            }

            const usuarioEncontrado = resultados[0];
            const contraseñaCoincide = await bcrypt.compare(contrasenaActual, usuarioEncontrado.contraseña);

            if (!contraseñaCoincide) {
                return res.status(401).json({ error: 'Contraseña actual incorrecta.' });
            }

            const hashedContrasenaNueva = await bcrypt.hash(contrasenaNueva, 10);
            const fechaActual = moment().tz(timeZone).format('YYYY-MM-DD HH:mm:ss');

            const actualizacion = 'UPDATE login_web SET contraseña = ?, fechaUltimoLogin = ? WHERE usuario = ?';
            conexionDB.query(actualizacion, [hashedContrasenaNueva, fechaActual, usuario], (errorActualizacion) => {
                if (errorActualizacion) {
                    console.error('Error al actualizar la contraseña:', errorActualizacion);
                    return res.status(500).json({ error: 'Error interno del servidor' });
                }

                res.status(200).json({ message: 'Contraseña actualizada correctamente.' });
            });
        });
    } catch (error) {
        console.error('Error en el servidor:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post('/registrarAsistencia', async (req, res) => {
    try {
        const { tipo, hora, latitude, longitude, timeZone  } = req.body;
        const usuario = req.session.usuario;
        //const fecha = req.session.fecha;
		const fecha = moment().tz(timeZone).format('YYYY-MM-DD');
        const nombreDispositivo = req.session.nombreDispositivo;

        if (!usuario) {
            return res.status(401).send('No ha iniciado sesión.');
        }

        const consultaExistencia = 'SELECT * FROM cm_asistencia_web WHERE codigoEmpleado = ? AND fecha = ?';
		conexionDB.query(consultaExistencia, [usuario, fecha], (errorConsulta, resultadosConsulta) => {
            if (errorConsulta) {
                console.error('Error al verificar la existencia de registro:', errorConsulta);
                return res.status(500).json({ error: 'Error interno del servidor' });
            }

            let consulta;
            let valores;

            if (resultadosConsulta.length === 0 && tipo === 'Ingreso') {
                consulta = 'INSERT INTO cm_asistencia_web (codigoEmpleado, fecha, horaEntrada, latitudIngreso, longitudIngreso, hostMod) VALUES (?, ?, ?, ?, ?, ?)';
                valores = [usuario, fecha, hora, latitude, longitude, nombreDispositivo];
            } else if (resultadosConsulta.length > 0) {
                const registro = resultadosConsulta[0];
                switch (tipo) {
                    case 'SalidaLunch':
                        consulta = 'UPDATE cm_asistencia_web SET salidaLunch = ?, latitudSalidaLunch = ?, longitudSalidaLunch = ? WHERE codigoEmpleado = ? AND fecha = ?';
                        valores = [hora, latitude, longitude, usuario, fecha];
                        break;
                    case 'RetornoLunch':
                        consulta = 'UPDATE cm_asistencia_web SET entradaLunch = ?, latitudRetornoLunch = ?, longitudRetornoLunch = ? WHERE codigoEmpleado = ? AND fecha = ?';
                        valores = [hora, latitude, longitude, usuario, fecha];
                        break;
                    case 'Salida':
                        consulta = 'UPDATE cm_asistencia_web SET horaSalida = ?, latitudSalida = ?, longitudSalida = ?, hostMod = ? WHERE codigoEmpleado = ? AND fecha = ?';
                        valores = [hora, latitude, longitude, nombreDispositivo, usuario, fecha];
                        break;
                    default:
                        return res.status(400).json({ error: 'Tipo de asistencia no válido.' });
                }
            } else {
                return res.status(400).json({ error: 'Debe registrar ingreso primero.' });
            }

            conexionDB.query(consulta, valores, (error, resultados) => {
                if (error) {
                    console.error(`Error al registrar la ${tipo.toLowerCase()}:`, error);
                    return res.status(500).json({ error: 'Error interno del servidor' });
                }

                res.status(200).send(`${tipo} registrado correctamente.`);

            });
        });
       
    } catch (error) {
        console.error(error);
        //res.status(500).send('Error en el servidor.');
	    res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.get('/estadoAsistencia', async (req, res) => {
    try {
        const usuario = req.session.usuario;
        const fecha = req.session.fecha;

        if (!usuario) {
            return res.status(401).send('No ha iniciado sesión.');
        }

        const consulta = 'SELECT * FROM cm_asistencia_web WHERE codigoEmpleado = ? AND fecha = ?';
        conexionDB.query(consulta, [usuario, fecha], (error, resultados) => {
            if (error) {
                console.error('Error al obtener el estado de asistencia:', error);
                //return res.status(500).send('Error en el servidor.');
				return res.status(500).json({ error: 'Error interno del servidor' });
            }

            const estado = {
                Ingreso: resultados.length === 0,
                SalidaLunch: resultados.length > 0 && resultados[0].horaEntrada && !resultados[0].salidaLunch,
                RetornoLunch: resultados.length > 0 && resultados[0].salidaLunch && !resultados[0].entradaLunch,
                Salida: resultados.length > 0 && resultados[0].entradaLunch && !resultados[0].horaSalida
            };

            res.status(200).json(estado);
        });
    } catch (error) {
        console.error(error);
       // res.status(500).send('Error en el servidor.');
	    res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            console.error('Error al cerrar sesión:', error);
            return res.status(500).send('Error en el servidor.');
        }

        res.status(200).send('Sesión cerrada exitosamente.');
    });
});



app.post('/darDeBaja', (req, res) => {
    const { usuario, usuarioCambia } = req.body;
    const fechaBaja = moment().tz(timeZone).format('YYYY-MM-DD HH:mm:ss');

    const consulta = 'UPDATE login_web SET estado = 0, fechaBaja = ?, usuarioCambia = ? WHERE usuario = ?';
    conexionDB.query(consulta, [fechaBaja, usuarioCambia, usuario], (error) => {
        if (error) {
            console.error('Error al dar de baja al usuario:', error);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
        res.status(200).send('Usuario dado de baja correctamente.');
    });
});

app.post('/resetearContrasena', async (req, res) => {
    const { usuario, nuevaContrasena, usuarioCambia, timeZone } = req.body;
    const fechaCambio = moment().tz(timeZone).format('YYYY-MM-DD HH:mm:ss');
    // Validar la zona horaria
   if (!moment.tz.zone(timeZone)) {
        return res.status(400).json({ error: 'Zona horaria no válida.' });
    }

    const hashedContrasena = await bcrypt.hash(nuevaContrasena, 10);
   // const fechaCambio = moment().tz(timeZone).format('YYYY-MM-DD HH:mm:ss');

    const consulta = 'UPDATE login_web SET contraseña = ?, fechaUltimoLogin = NULL, fechaCambio = ?, usuarioCambia = ? WHERE usuario = ?';
    conexionDB.query(consulta, [hashedContrasena, fechaCambio, usuarioCambia, usuario], (error) => {
        if (error) {
            console.error('Error al cambiar la contraseña:', error);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
        res.status(200).send('Contraseña cambiada correctamente.');
    });
});


/**app.post('/actualizarDispositivo', (req, res) => {
    const { usuario, correo, usuarioCambia } = req.body;

  // Enviar correo para registrar el dispositivo
                const mailOptions = {
                    from: 'absa.sistemas@gmail.com',
                    to: correo,
                    subject: 'Registro de Nuevo Dispositivo',
                    text: `Hola ${usuario},\n\nPor favor, registra tu  nuevo dispositivo usando el siguiente enlace:\n\nhttp://localhost:3000/registrarDispositivo.html?usuario=${usuario}`
                };

                transporter.sendMail(mailOptions, (errorEnvio, info) => {
                    if (errorEnvio) {
                        console.error('Error al enviar correo:', errorEnvio);
                        return res.status(500).json({ error: 'Error interno del servidor' });
                    }

                    res.status(200).send('Correo enviado exitosamente.');
                });    
});*/

app.post('/actualizarDispositivo', (req, res) => {
    const { usuario, correo, usuarioCambia, timeZone } = req.body;

    if (!moment.tz.zone(timeZone)) {
        return res.status(400).json({ error: 'Zona horaria no válida.' });
    }

    const fechaCambio = moment().tz(timeZone).format('YYYY-MM-DD HH:mm:ss');

    // Enviar correo para registrar el dispositivo
    const mailOptions = {
        from: 'absa.sistemas@gmail.com',
        to: correo,
        subject: 'Registro de Nuevo Dispositivo',
        text: `Hola ${usuario},\n\nPor favor, registra tu nuevo dispositivo usando el siguiente enlace:\n\nhttp://localhost:3000/registrarDispositivo.html?usuario=${usuario}`
    };

    transporter.sendMail(mailOptions, (errorEnvio, info) => {
        if (errorEnvio) {
            console.error('Error al enviar correo:', errorEnvio);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }

        // Solo actualizar la base de datos si el correo se envía correctamente
        const consulta = 'UPDATE login_web SET usuarioCambia = ?, fechaCambio = ? WHERE usuario = ?';
        conexionDB.query(consulta, [usuarioCambia, fechaCambio, usuario], (error) => {
            if (error) {
                console.error('Error al actualizar dispositivo:', error);
                return res.status(500).json({ error: 'Error interno del servidor' });
            }

            res.status(200).send('Correo enviado y base de datos actualizada exitosamente.');
        });
    });
});


app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});

app.use((err, req, res, next) => {
    console.error('Error no manejado:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
});