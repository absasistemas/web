const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const mysql = require('mysql');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use(session({
    secret: 'secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 día
}));

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

app.post('/registro', async (req, res) => {
    try {
        const { usuario, contrasena, nombre, telefono, fechaCreacion } = req.body;

        const consulta = 'SELECT * FROM login_web WHERE usuario = ?';
        conexionDB.query(consulta, [usuario], async (error, resultados) => {
            if (error) {
                console.error('Error en la consulta:', error);
                return res.status(500).send('Error en el servidor.');
            }

            if (resultados.length > 0) {
                return res.status(400).send('El usuario ya está registrado.');
            }

            const hashedContrasena = await bcrypt.hash(contrasena, 10);

            const insercion = 'INSERT INTO login_web (usuario, contraseña, nombre, telefono, fechaCreacion) VALUES (?, ?, ?, ?, ?)';
            conexionDB.query(insercion, [usuario, hashedContrasena, nombre, telefono, fechaCreacion], (errorInsercion) => {
                if (errorInsercion) {
                    console.error('Error al insertar usuario en la base de datos:', errorInsercion);
                    return res.status(500).send('Error en el servidor.');
                }

                res.status(201).send('Usuario registrado exitosamente.');
            });
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor.');
    }
});

app.post('/login', async (req, res) => {
    try {
        const { usuario, contrasena, nombreDispositivo } = req.body;

        const consulta = 'SELECT * FROM login_web WHERE usuario = ?';
        conexionDB.query(consulta, [usuario], async (error, resultados) => {
            if (error) {
                console.error('Error en la consulta:', error);
                return res.status(500).send('Error en el servidor.');
            }

            if (resultados.length === 0) {
                return res.status(401).send('Usuario no encontrado.');
            }

            const usuarioEncontrado = resultados[0];
            const contraseñaCoincide = await bcrypt.compare(contrasena, usuarioEncontrado.contraseña);

            if (!contraseñaCoincide) {
                return res.status(401).send('Contraseña incorrecta.');
            }

            req.session.usuario = usuario;
			req.session.nombreDispositivo = nombreDispositivo || 'Unknown Device'; // Guardar el nombre del dispositivo en la sesión
            req.session.fecha = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

            res.status(200).send('Inicio de sesión exitoso.');
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor.');
    }
});

app.post('/registrarAsistencia', async (req, res) => {
    try {
        const { tipo, hora, latitude, longitude } = req.body;
        const usuario = req.session.usuario;
        const fecha = req.session.fecha;
        const nombreDispositivo = req.session.nombreDispositivo;

        if (!usuario) {
            return res.status(401).send('No ha iniciado sesión.');
        }

        const consultaExistencia = 'SELECT * FROM cm_asistencia_web WHERE codigoEmpleado = ? AND fecha = ?';
        conexionDB.query(consultaExistencia, [usuario, fecha], (errorConsulta, resultadosConsulta) => {
            if (errorConsulta) {
                console.error('Error al verificar la existencia de registro:', errorConsulta);
                return res.status(500).send('Error en el servidor.');
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
                        consulta = 'UPDATE cm_asistencia_web SET salidaLunch = ? WHERE codigoEmpleado = ? AND fecha = ?';
                        valores = [hora, usuario, fecha];
                        break;
                    case 'RetornoLunch':
                        consulta = 'UPDATE cm_asistencia_web SET entradaLunch = ? WHERE codigoEmpleado = ? AND fecha = ?';
                        valores = [hora, usuario, fecha];
                        break;
                    case 'Salida':
                        consulta = 'UPDATE cm_asistencia_web SET horaSalida = ?, latitudSalida = ?, longitudSalida = ?, hostMod = ? WHERE codigoEmpleado = ? AND fecha = ?';
                        valores = [hora, latitude, longitude, nombreDispositivo, usuario, fecha];
                        break;
                    default:
                        return res.status(400).send('Tipo de asistencia no válido.');
                }
            } else {
                return res.status(400).send('Debe registrar ingreso primero.');
            }

            conexionDB.query(consulta, valores, (error, resultados) => {
                if (error) {
                    console.error(`Error al registrar la ${tipo.toLowerCase()}:`, error);
                    return res.status(500).send('Error en el servidor.');
                }

                res.status(200).send(`${tipo} registrado correctamente.`);
            });
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor.');
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
                return res.status(500).send('Error en el servidor.');
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
        res.status(500).send('Error en el servidor.');
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

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});
