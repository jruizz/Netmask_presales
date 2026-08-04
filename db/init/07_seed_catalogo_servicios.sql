-- Migracion fiel del catalogo de servicios gestionados de NetmaskSpecGen (Jorge):
-- TIPOS_SERVICIO, SLA_DEF, catalogoCategorias, catalogoNiveles y los defaults
-- de escalamiento (escDefaults) para Contrato de Soporte / Mesa de Ayuda / NOC.

INSERT INTO catalogo_serv_categorias_tecnologia (nombre, orden) VALUES
  ('Seguridad / Firewall', 1), ('Redes LAN / WAN', 2), ('WLAN / Wireless', 3), ('Datacenter', 4),
  ('Servidores / Virtualización', 5), ('Cloud / IaaS', 6), ('Monitoreo', 7), ('Backup', 8),
  ('SD-WAN / VPN', 9), ('Colaboración / Telefonía', 10), ('Aplicativos', 11), ('Switching', 12),
  ('Routing', 13), ('NAC', 14), ('Access Points', 15), ('Sistemas Operativos', 16),
  ('Bases de datos', 17), ('Otro', 18);

INSERT INTO catalogo_serv_niveles (nombre, orden) VALUES
  ('Nivel 1 (N1)', 1), ('Nivel 2 (N2)', 2), ('Nivel 3 (N3)', 3), ('Híbrido N1+N2', 4), ('Híbrido N2+N3', 5),
  ('NOC + N2', 6), ('Mesa de Ayuda + N2', 7), ('Mesa de Ayuda + N3', 8),
  ('Fabricante / Proveedor externo', 9), ('PM / Coordinador de servicio', 10);

INSERT INTO catalogo_serv_severidades (clave, nombre_severidad, descripcion, tiempo_respuesta, tiempo_solucion, color_hex, color_fondo_hex, orden) VALUES
  ('P1', 'P1 / Crítico', 'Indisponibilidad total del servicio crítico', '15 min', '4 horas', '#C53030', '#FFF5F5', 1),
  ('P2', 'P2 / Alto', 'Afectación parcial relevante con impacto operativo', '30 min', '8 horas', '#B45309', '#FFFBEB', 2),
  ('P3', 'P3 / Medio', 'Incidente sin afectación crítica, operación continúa', '2 horas', '24 horas', '#1D6FA0', '#EBF8FF', 3),
  ('P4', 'P4 / Bajo', 'Solicitudes estándar, consultas y cambios menores', '4 horas', '72 horas', '#2D7D46', '#F0FFF4', 4);

INSERT INTO catalogo_serv_plantillas_escalamiento (nombre, descripcion) VALUES
  ('Contrato de Soporte', 'Escalamiento por defecto para Contrato de Soporte'),
  ('Mesa de Ayuda', 'Escalamiento por defecto para Mesa de Ayuda'),
  ('NOC', 'Escalamiento por defecto para NOC');

INSERT INTO catalogo_serv_escalamiento_niveles (plantilla_id, severidad, nivel_inicial, responsable_netmask, tiempo_respuesta, tiempo_escalamiento, siguiente_nivel, canal, orden)
SELECT p.id, v.severidad, v.nivel_inicial, v.responsable_netmask, v.tiempo_respuesta, v.tiempo_escalamiento, v.siguiente_nivel, v.canal, v.orden
FROM catalogo_serv_plantillas_escalamiento p
JOIN (VALUES
  ('Contrato de Soporte','P4','Nivel 1','Técnico N1','4 horas','8 horas','Nivel 2','Portal / CRM',1),
  ('Contrato de Soporte','P3','Nivel 1','Técnico N1','2 horas','4 horas','Nivel 2','CRM / Correo',2),
  ('Contrato de Soporte','P2','Nivel 1','Técnico N1','30 min','1 hora','Nivel 2','CRM / Teléfono',3),
  ('Contrato de Soporte','P1','Nivel 2','Ingeniero N2','15 min','30 min','Nivel 3','Teléfono directo',4),
  ('Mesa de Ayuda','P4','Nivel 1','Agente Mesa','4 horas','8 horas','Nivel 2','Portal',1),
  ('Mesa de Ayuda','P3','Nivel 1','Agente Mesa','2 horas','4 horas','Nivel 2','CRM',2),
  ('Mesa de Ayuda','P2','Nivel 1','Agente Mesa','30 min','2 horas','Nivel 2','CRM / Teléfono',3),
  ('Mesa de Ayuda','P1','Nivel 2','Ingeniero N2','15 min','30 min','Nivel 3','Teléfono directo',4),
  ('NOC','P4','NOC Nivel 1','Analista NOC','4 horas','8 horas','Ingeniero N2','Portal NOC',1),
  ('NOC','P3','NOC Nivel 1','Analista NOC','1 hora','4 horas','Ingeniero N2','CRM / Correo',2),
  ('NOC','P2','NOC Nivel 1','Analista NOC','30 min','1 hora','Ingeniero N2','Teléfono + CRM',3),
  ('NOC','P1','NOC + N2','Ingeniero N2','15 min','30 min','Especialista N3','Teléfono directo',4)
) AS v(nombre_plantilla, severidad, nivel_inicial, responsable_netmask, tiempo_respuesta, tiempo_escalamiento, siguiente_nivel, canal, orden)
  ON v.nombre_plantilla = p.nombre;

INSERT INTO catalogo_serv_tipos (nombre, icono, version, descripcion, incluye, excluye, condiciones_cliente, campos_dimensionamiento, plantilla_escalamiento_default_id) VALUES
('Contrato de Soporte', 'ti-shield-check', '2.0',
 'Servicio recurrente para garantizar la continuidad operativa mediante atención de incidentes, escalamiento técnico y soporte especializado sobre la base instalada.',
 '["Atención de incidentes y requerimientos","Soporte remoto N1, N2 y N3","Escalamiento a fabricante","Atención en sitio según SLA","Gestión de casos y seguimiento","Soporte sobre la base instalada","Informes periódicos de gestión","Acompañamiento en RMA","Validación operativa post-incidente","RCA para incidentes críticos"]'::jsonb,
 '["Nuevos proyectos","Migraciones","Cambio o rediseño arquitectónico","Instalación de nuevas plataformas","Suministro de hardware","Licenciamiento","Soporte a tecnologías no contratadas","Desarrollo de software","Servicios SOC","Viáticos si no fueron incluidos"]'::jsonb,
 '["Mantener soporte vigente de fabricantes","Proporcionar accesos administrativos","Entregar diagramas y documentación","Autorizar cambios requeridos","Designar punto único de contacto técnico"]'::jsonb,
 '["baseInstalada","sitios","dispositivosCriticos","nivelSoporte","herramientaITSM","incluyeRCA","incluyeRMA"]'::jsonb,
 (SELECT id FROM catalogo_serv_plantillas_escalamiento WHERE nombre = 'Contrato de Soporte')),

('Bolsa de Horas', 'ti-clock-hour-4', '2.0',
 'Paquete prepagado de horas de ingeniería especializada para consumo bajo demanda en soporte, troubleshooting, cambios programados y optimización.',
 '["Soporte especializado remoto","Troubleshooting","Acompañamiento técnico","Cambios programados","Optimización de infraestructura","Revisión de configuraciones","Transferencia de conocimiento","Participación en reuniones técnicas","Elaboración de recomendaciones"]'::jsonb,
 '["SLA garantizado","NOC","Mesa de ayuda","Monitoreo 24×7","Recursos dedicados","PM dedicado","Gestión completa de proyectos","Site Surveys","Soporte permanente en sitio"]'::jsonb,
 '["Solicitudes con anticipación definida","Autorización previa para trabajos fuera de horario","Proporcionar accesos para actividades"]'::jsonb,
 '["horasContratadas","vigenciaBolsa","tipoActividades","minimoConsumo","recargoFueraHorario","formatoReporte"]'::jsonb,
 NULL),

('IaaS', 'ti-server', '2.0',
 'Modelo de prestación de infraestructura tecnológica bajo suscripción: cómputo, almacenamiento, red y datacenter operados por Netmask.',
 '["Máquinas virtuales (CPU, RAM, SO)","Almacenamiento SAN/NAS, Backup y Snapshots","VLAN, VPN, Firewall perimetral y Balanceadores","Energía, climatización, redundancia y seguridad física","Monitoreo, administración básica y gestión de capacidad","Informes de consumo mensuales"]'::jsonb,
 '["Desarrollo de aplicaciones","Administración funcional de aplicaciones","Licenciamiento no contratado","Cambios arquitectónicos complejos","Gestión de bases de datos avanzadas","Cumplimiento regulatorio específico del cliente"]'::jsonb,
 '["Uso aceptable según políticas del proveedor","Notificar con anticipación escalamientos de capacidad","Gestionar sus propias aplicaciones y licencias"]'::jsonb,
 '["vcpu","ram","almacenamientoGB","tipoAlmacenamiento","backupRetention","uptime","ancho_banda","firewallIncluido","ambientes","sistemaOperativo"]'::jsonb,
 NULL),

('NOC', 'ti-activity', '2.0',
 'Operación centralizada de monitoreo 24×7 y gestión de eventos con correlación, alertas, escalamiento y reporting de infraestructura.',
 '["Monitoreo 24×7","Correlación de eventos","Gestión de alertas","Escalamiento y creación de tickets","Seguimiento hasta cierre","Dashboard de monitoreo","Reportes mensuales","Análisis de tendencia","Validación de disponibilidad"]'::jsonb,
 '["Corrección de incidentes complejos","Administración diaria de plataformas","Gestión de usuarios","Operación de aplicaciones","SOC (salvo contratación específica)","Desarrollo de automatizaciones personalizadas"]'::jsonb,
 '["Herramientas de monitoreo instaladas","Equipos accesibles por red","Comunicación permanente con equipo NOC","Catálogo de eventos documentado"]'::jsonb,
 '["herramientaMonitoreo","totalDispositivos","tiposDispositivos","umbralesAlerta","ventanasMantenimiento","escalamientoNOC","formatoReporte","integrarITSM"]'::jsonb,
 (SELECT id FROM catalogo_serv_plantillas_escalamiento WHERE nombre = 'NOC')),

('Mesa de Ayuda', 'ti-headset', '2.0',
 'Punto único de contacto para usuarios finales con gestión de incidentes, requerimientos, soporte remoto y seguimiento hasta cierre.',
 '["Recepción de incidentes y requerimientos","Gestión de tickets","Soporte remoto y telefónico","Atención por portal","Escalamiento y seguimiento","Cierre y encuesta de satisfacción"]'::jsonb,
 '["Desarrollo","Gestión de proyectos","Administración avanzada de datacenter","Cambios mayores","Migraciones","Ciberseguridad especializada","Consultoría estratégica"]'::jsonb,
 '["Herramienta ITSM disponible","Inventario actualizado","Catálogo de servicios definido","Matriz de escalamiento acordada"]'::jsonb,
 '["totalUsuarios","ticketsEstimadosMes","canalesAtencion","horaAtencion","herramientaITSM","nivelesEscalamiento","idiomaAtencion","soporteRemoto"]'::jsonb,
 (SELECT id FROM catalogo_serv_plantillas_escalamiento WHERE nombre = 'Mesa de Ayuda')),

('Assessment', 'ti-shield-search', '2.0',
 'Servicio consultivo para evaluar el estado actual de una infraestructura o servicio con análisis de rendimiento, riesgos y plan de acción.',
 '["Descubrimiento: inventario, topología, componentes y dependencias","Análisis de rendimiento, disponibilidad, capacidad y seguridad","Informe ejecutivo e informe técnico","Matriz de riesgos y hallazgos","Plan de acción y recomendaciones"]'::jsonb,
 '["Implementación","Corrección de hallazgos","Compra de equipos","Administración posterior","Soporte recurrente"]'::jsonb,
 '["Acceso al entorno","Disponibilidad de sesiones técnicas","Documentación existente","Participación de responsables técnicos"]'::jsonb,
 '["alcanceAssessment","tipoAnalisis","totalDispositivos","diasEjecucion","entregables","entornoProduccion"]'::jsonb,
 NULL),

('Outsourcing de TI', 'ti-users', '2.0',
 'Asignación parcial o total de recursos especializados para operar procesos tecnológicos del cliente en modalidades Dedicated, Shared o Squad.',
 '["Ingenieros N1, N2, N3 según perfil","Coordinadores, PM y Arquitectos","Procedimientos operativos documentados","Indicadores de gestión (KPIs)","Gobierno operativo","Transferencia de conocimiento"]'::jsonb,
 '["Responsabilidad sobre decisiones de negocio","Licenciamiento","Infraestructura no incluida","Proyectos fuera de alcance","Incrementos no planeados de demanda","Garantías de fabricante"]'::jsonb,
 '["Definición de horarios y dedicación","Modelo operativo acordado","Indicadores de desempeño definidos","Herramienta ITSM disponible","Matriz RACI aprobada","Gestión de vacaciones y reemplazos acordada"]'::jsonb,
 '["modalidadOutsourcing","perfilesRequeridos","cantidadRecursos","horariosOperacion","dedicacion","herramientaITSM","kpisDefinidos","lugarPrestacion"]'::jsonb,
 NULL);
