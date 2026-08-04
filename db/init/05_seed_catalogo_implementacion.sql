-- Migracion fiel del catalogo de la Calculadora de Samuel
-- (BASE_CATALOG de server.js, TARIFAS_NIVEL/SITE_SURVEY_TABLE/PLANEACION/ENTREGA/constantes de index.html).

INSERT INTO catalogo_impl_grupos (nombre) VALUES
  ('Switching e Inalambrico'),
  ('Seguridad Perimetral'),
  ('Apliances Forti');

INSERT INTO catalogo_impl_tecnologias (grupo_id, nombre, es_base) VALUES
  ((SELECT id FROM catalogo_impl_grupos WHERE nombre = 'Switching e Inalambrico'), 'APs', true),
  ((SELECT id FROM catalogo_impl_grupos WHERE nombre = 'Switching e Inalambrico'), 'SW Capa 2/3', true),
  ((SELECT id FROM catalogo_impl_grupos WHERE nombre = 'Switching e Inalambrico'), 'SW Core Cisco', true),
  ((SELECT id FROM catalogo_impl_grupos WHERE nombre = 'Switching e Inalambrico'), 'SW Core Forti', true),
  ((SELECT id FROM catalogo_impl_grupos WHERE nombre = 'Switching e Inalambrico'), 'Instalacion SFP', true),
  ((SELECT id FROM catalogo_impl_grupos WHERE nombre = 'Seguridad Perimetral'), 'Firewall Fortigate', true),
  ((SELECT id FROM catalogo_impl_grupos WHERE nombre = 'Apliances Forti'), 'FortiSwitch', true),
  ((SELECT id FROM catalogo_impl_grupos WHERE nombre = 'Apliances Forti'), 'FortiManager', true),
  ((SELECT id FROM catalogo_impl_grupos WHERE nombre = 'Apliances Forti'), 'FortiAnalyzer', true),
  ((SELECT id FROM catalogo_impl_grupos WHERE nombre = 'Apliances Forti'), 'FortiSIEM', true),
  ((SELECT id FROM catalogo_impl_grupos WHERE nombre = 'Apliances Forti'), 'FortiEDR', true),
  ((SELECT id FROM catalogo_impl_grupos WHERE nombre = 'Apliances Forti'), 'FortiPAM', true);

DO $$
DECLARE tec_id INTEGER;
BEGIN
  SELECT id INTO tec_id FROM catalogo_impl_tecnologias WHERE nombre = 'APs';
  INSERT INTO catalogo_impl_actividades (tecnologia_id, texto, horas, modo, orden) VALUES
    (tec_id, 'Montaje fisico, energizacion (PoE) y verificacion de enlace', 1, 'en_sitio', 1),
    (tec_id, 'Site survey / validacion de ubicacion y RF', 1, 'en_sitio', 2),
    (tec_id, 'Registro del AP en WLC / Catalyst Center', 0.5, 'remota', 3),
    (tec_id, 'Configuracion de SSIDs y perfiles de seguridad (WPA2/3, 802.1X)', 1, 'remota', 4),
    (tec_id, 'Configuracion de RF profiles, canales y potencia (RRM)', 1, 'remota', 5),
    (tec_id, 'Validacion de roaming y cobertura', 1, 'en_sitio', 6),
    (tec_id, 'Integracion y licenciamiento en el controlador/On-Prem', 1, 'remota', 7);

  SELECT id INTO tec_id FROM catalogo_impl_tecnologias WHERE nombre = 'SW Capa 2/3';
  INSERT INTO catalogo_impl_actividades (tecnologia_id, texto, horas, modo, orden) VALUES
    (tec_id, 'Montaje fisico, energizacion y verificacion', 1.5, 'en_sitio', 1),
    (tec_id, 'Actualizacion/validacion de firmware y licenciamiento', 1, 'en_sitio', 2),
    (tec_id, 'Configuracion base (hostname, mgmt, NTP, AAA, SNMP)', 1, 'en_sitio', 3),
    (tec_id, 'Configuracion de VLANs, trunks y enrutamiento inter-VLAN (SVIs)', 2, 'en_sitio', 4),
    (tec_id, 'Configuracion de enrutamiento estatico o dinamico hacia el core', 2, 'en_sitio', 5),
    (tec_id, 'Configuracion de redundancia de gateway (HSRP/VRRP), si aplica', 1, 'en_sitio', 6),
    (tec_id, 'Configuracion y validacion de PoE+ por puerto, si aplica', 1, 'en_sitio', 7),
    (tec_id, 'Seguridad de capa 2 (STP, port-security, DHCP snooping) y ACLs', 1.5, 'en_sitio', 8),
    (tec_id, 'Instalacion y validacion de modulo SFP, si aplica', 0.5, 'en_sitio', 9),
    (tec_id, 'Onboarding a plataforma de gestion centralizada (si aplica)', 1, 'remota', 10);

  SELECT id INTO tec_id FROM catalogo_impl_tecnologias WHERE nombre = 'SW Core Cisco';
  INSERT INTO catalogo_impl_actividades (tecnologia_id, texto, horas, modo, unidades_por_equipo, orden) VALUES
    (tec_id, 'Montaje fisico, energizacion y cableado de enlace HA (StackWise Virtual Link)', 2, 'en_sitio', 2, 1),
    (tec_id, 'Actualizacion/validacion de IOS-XE y licenciamiento', 1, 'en_sitio', 2, 2),
    (tec_id, 'Configuracion de HA / StackWise Virtual y validacion de failover', 4, 'en_sitio', 1, 3),
    (tec_id, 'Configuracion base (hostname, mgmt, NTP, AAA, SNMP)', 1, 'en_sitio', 2, 4),
    (tec_id, 'Configuracion de VLANs, trunks y SVIs (interfaces L3)', 2, 'en_sitio', 2, 5),
    (tec_id, 'Configuracion de enrutamiento (OSPF/EIGRP)', 4, 'en_sitio', 1, 6),
    (tec_id, 'Configuracion de redundancia de gateway (HSRP/VRRP)', 2, 'en_sitio', 1, 7),
    (tec_id, 'Configuracion de ACLs y politicas de control de trafico', 2, 'en_sitio', 2, 8),
    (tec_id, 'Configuracion de QoS (si el diseno lo requiere)', 2, 'en_sitio', 1, 9),
    (tec_id, 'Pruebas de conmutacion (failover) y validacion de convergencia', 2, 'en_sitio', 1, 10),
    (tec_id, 'Onboarding a DNA Center / Catalyst Center', 1, 'remota', 2, 11);

  SELECT id INTO tec_id FROM catalogo_impl_tecnologias WHERE nombre = 'SW Core Forti';
  INSERT INTO catalogo_impl_actividades (tecnologia_id, texto, horas, modo, unidades_por_equipo, orden) VALUES
    (tec_id, 'Montaje fisico, energizacion y cableado de enlace HA (ICL/MCLAG)', 2, 'en_sitio', 2, 1),
    (tec_id, 'Actualizacion/validacion de FortiSwitchOS y licenciamiento', 1, 'en_sitio', 2, 2),
    (tec_id, 'Configuracion de HA / MCLAG y validacion de failover', 4, 'en_sitio', 1, 3),
    (tec_id, 'Configuracion base e integracion via FortiLink', 1, 'en_sitio', 2, 4),
    (tec_id, 'Configuracion de VLANs, trunks y enrutamiento inter-VLAN', 2, 'en_sitio', 2, 5),
    (tec_id, 'Configuracion de enrutamiento dinamico (OSPF) en el core', 4, 'en_sitio', 1, 6),
    (tec_id, 'Configuracion de redundancia de gateway (FGCP/VRRP)', 2, 'en_sitio', 1, 7),
    (tec_id, 'Configuracion de politicas/ACLs de control de trafico', 2, 'en_sitio', 2, 8),
    (tec_id, 'Configuracion de QoS (si el diseno lo requiere)', 2, 'en_sitio', 1, 9),
    (tec_id, 'Pruebas de conmutacion (failover) y validacion de convergencia', 2, 'en_sitio', 1, 10),
    (tec_id, 'Administracion centralizada via FortiManager (si aplica)', 1, 'remota', 2, 11);

  SELECT id INTO tec_id FROM catalogo_impl_tecnologias WHERE nombre = 'Instalacion SFP';
  INSERT INTO catalogo_impl_actividades (tecnologia_id, texto, horas, modo, unidades_por_equipo, orden) VALUES
    (tec_id, 'Validacion de compatibilidad del transceiver (datasheet/compat. matrix)', 0.5, 'remota', 1, 1),
    (tec_id, 'Instalacion fisica del modulo SFP en el equipo', 0.25, 'en_sitio', 2, 2),
    (tec_id, 'Validacion de enlace optico (link up, potencia Tx/Rx si hay DOM)', 0.5, 'en_sitio', 2, 3),
    (tec_id, 'Configuracion de puerto (modo, VLAN/trunk si aplica)', 0.5, 'en_sitio', 2, 4);

  SELECT id INTO tec_id FROM catalogo_impl_tecnologias WHERE nombre = 'Firewall Fortigate';
  INSERT INTO catalogo_impl_actividades (tecnologia_id, texto, horas, modo, orden) VALUES
    (tec_id, 'Montaje fisico, energizacion y actualizacion de firmware (FortiOS)', 2, 'en_sitio', 1),
    (tec_id, 'Configuracion base: interfaces, zonas, ruteo, HA y registro en FortiCloud/FortiManager.', 2, 'en_sitio', 2),
    (tec_id, 'Implementacion de la segmentacion IT/OT', 8, 'en_sitio', 3),
    (tec_id, 'Configuracion de politicas de seguridad y perfiles de inspeccion UTP.', 2, 'en_sitio', 4),
    (tec_id, 'Activacion y ajuste del servicio FortiGuard OT Security.', 8, 'en_sitio', 5),
    (tec_id, 'Configuracion de VPN sitio a sitio entre sedes y/o hacia el centro de datos', 2, 'en_sitio', 6),
    (tec_id, 'Habilitacion de dashboards y reportes de cumplimiento', 2, 'en_sitio', 7);

  SELECT id INTO tec_id FROM catalogo_impl_tecnologias WHERE nombre = 'FortiSwitch';
  INSERT INTO catalogo_impl_actividades (tecnologia_id, texto, horas, modo, orden) VALUES
    (tec_id, 'Montaje fisico, energizacion y actualizacion de los switches', 4, 'en_sitio', 1),
    (tec_id, 'Integracion y administracion via FortiLink desde el FortiGate.', 2, 'en_sitio', 2),
    (tec_id, 'Configuracion de VLANs, troncales, enrutamiento inter-VLAN y politicas de puerto.', 2, 'en_sitio', 3),
    (tec_id, 'Habilitacion y validacion de PoE (802.3bt).', 1, 'en_sitio', 4),
    (tec_id, 'Configuracion de mecanismos de proteccion de capa 2 (STP, port-security).', 1, 'en_sitio', 5);

  SELECT id INTO tec_id FROM catalogo_impl_tecnologias WHERE nombre = 'FortiManager';
  INSERT INTO catalogo_impl_actividades (tecnologia_id, texto, horas, modo, orden) VALUES
    (tec_id, 'Despliegue de la maquina virtual FortiManager y aplicacion de la licencia.', 8, 'remota', 1),
    (tec_id, 'Registro y onboarding de los FortiGate y FortiSwitch en FortiManager.', 8, 'remota', 2),
    (tec_id, 'Creacion de plantillas de configuracion, objetos y politicas centralizadas.', 4, 'remota', 3),
    (tec_id, 'Configuracion de respaldos automaticos y control de versiones.', 4, 'remota', 4),
    (tec_id, 'Definicion de perfiles administrativos y RBAC.', 4, 'remota', 5);

  SELECT id INTO tec_id FROM catalogo_impl_tecnologias WHERE nombre = 'FortiAnalyzer';
  INSERT INTO catalogo_impl_actividades (tecnologia_id, texto, horas, modo, orden) VALUES
    (tec_id, 'Aprovisionamiento de FortiAnalyzer Cloud y activacion de la suscripcion', 4, 'remota', 1),
    (tec_id, 'Configuracion del envio de logs desde todos los componentes del Security Fabric', 8, 'remota', 2),
    (tec_id, 'Configuracion de reportes, paneles, IOC y Outbreak Detection.', 8, 'remota', 3),
    (tec_id, 'Habilitacion de Security Automation segun casos de uso definidos.', 16, 'remota', 4);

  SELECT id INTO tec_id FROM catalogo_impl_tecnologias WHERE nombre = 'FortiSIEM';
  INSERT INTO catalogo_impl_actividades (tecnologia_id, texto, horas, modo, orden) VALUES
    (tec_id, 'Despliegue de FortiSIEM en HA sobre la plataforma de virtualizacion.', 16, 'remota', 1),
    (tec_id, 'Integracion de fuentes de eventos (FortiGate, FortiSwitch, FortiEDR, FortiPAM, FortiAnalyzer).', 16, 'remota', 2),
    (tec_id, 'Descubrimiento de activos (CMDB) y normalizacion de eventos.', 16, 'remota', 3),
    (tec_id, 'Configuracion de reglas de correlacion, casos de uso y tableros de monitoreo.', 16, 'remota', 4),
    (tec_id, 'Configuracion de notificaciones, gestion de incidentes y reportes de cumplimiento.', 16, 'remota', 5);

  SELECT id INTO tec_id FROM catalogo_impl_tecnologias WHERE nombre = 'FortiEDR';
  INSERT INTO catalogo_impl_actividades (tecnologia_id, texto, horas, modo, orden) VALUES
    (tec_id, 'Aprovisionamiento de la consola FortiEDR Cloud y configuracion del entorno.', 16, 'en_sitio', 1),
    (tec_id, 'Despliegue de los colectores (agentes) en los equipos definidos.', 4, 'en_sitio', 2),
    (tec_id, 'Configuracion de politicas de descubrimiento, proteccion (Discover & Protect) y respuesta.', 4, 'en_sitio', 3),
    (tec_id, 'Habilitacion del servicio Basic MDR Cloud', 4, 'en_sitio', 4),
    (tec_id, 'Validacion de compatibilidad de sistemas operativos.', 4, 'en_sitio', 5);

  SELECT id INTO tec_id FROM catalogo_impl_tecnologias WHERE nombre = 'FortiPAM';
  INSERT INTO catalogo_impl_actividades (tecnologia_id, texto, horas, modo, orden) VALUES
    (tec_id, 'Despliegue de la maquina virtual FortiPAM y activacion de la licencia.', 8, 'remota', 1),
    (tec_id, 'Configuracion de la boveda de credenciales y politicas PAM.', 8, 'remota', 2),
    (tec_id, 'Configuracion del acceso remoto seguro (SRA) y agente FortiClient VRS.', 4, 'remota', 3),
    (tec_id, 'Definicion de flujos de aprobacion, grabacion de sesiones y rotacion de credenciales.', 4, 'remota', 4),
    (tec_id, 'Integracion con el directorio/identidades del cliente.', 8, 'remota', 5);
END $$;

INSERT INTO catalogo_impl_bloques_fijos (tipo, texto, horas, modo, es_unitario, orden) VALUES
  ('planeacion', 'Levantamiento de informacion', 4, 'en_sitio', false, 1),
  ('planeacion', 'Definicion de arquitectura logica', 4, 'remota', false, 2),
  ('planeacion', 'Definicion de politicas base', 1, 'remota', false, 3),
  ('planeacion', 'Definicion de direccionamiento IP y objetos.', 1, 'remota', false, 4),
  ('planeacion', 'HLD (High Level Design).', 4, 'remota', false, 5),
  ('planeacion', 'Plan de Implementacion (MOP de alto nivel)', 1, 'remota', false, 6),
  ('planeacion', 'Matriz de riesgos tecnicos.', 1, 'remota', false, 7),
  ('planeacion', 'Registro de contratos a Forticloud (si aplica)', 0.5, 'remota', false, 8),
  ('entrega', 'Ejecucion de pruebas de aceptacion funcional (UAT).', 8, 'remota', false, 1),
  ('entrega', 'Documentacion final: as-built, LLD, matrices de politicas y diagramas.', 8, 'remota', false, 2),
  ('entrega', 'Transferencia de conocimiento y acompanamiento operativo.', 8, 'remota', false, 3),
  ('entrega', 'Entrega segura de las credenciales de administracion.', 1, 'remota', true, 4),
  ('entrega', 'Firma del acta de aceptacion y cierre formal del proyecto.', 1, 'remota', true, 5);

INSERT INTO catalogo_impl_tarifas (nivel, condicion, tarifa_cop_hora) VALUES
  (1, 'interno', 70000), (2, 'interno', 140000), (3, 'interno', 195000),
  (1, 'aliado', 60000),  (2, 'aliado', 120000),  (3, 'aliado', 170000);

INSERT INTO catalogo_impl_site_survey_rangos (clave, etiqueta, horas_ingenieria, horas_ekahau, precio_fijo_cop, orden) VALUES
  ('300',         'Hasta 300 m²',         4,  4,  1600000,  1),
  ('300-1000',    '300 - 1000 m²',        6,  8,  2800000,  2),
  ('1000-5000',   '1000 - 5000 m²',       10, 10, 4000000,  3),
  ('5000-10000',  '5000 - 10000 m²',      12, 14, 5200000,  4),
  ('10000-20000', '10000 - 20000 m²',     16, 16, 6400000,  5),
  ('20000+',      '20000 m² en adelante', 32, 32, 12800000, 6);

INSERT INTO catalogo_impl_parametros (clave, valor, descripcion) VALUES
  ('HORAS_DIA',            9,      'Horas laborales por dia'),
  ('USD_DIA_EPSP',         1785,   'Valor en USD de un dia EPSP de viaticos'),
  ('FACTOR_EPSP',          3.5,    'Divisor para convertir dias de trabajo en dias EPSP'),
  ('PM_UMBRAL_HORAS',      24,     'Umbral de horas de ingenieria a partir del cual se cobra PM'),
  ('PM_PORCENTAJE',        0.08,   'Porcentaje de horas adicionales por Gerencia de Proyectos'),
  ('DEFAULT_ALIMENTACION', 75000,  'Valor por defecto de alimentacion por dia (COP)'),
  ('DEFAULT_HOSPEDAJE',    200000, 'Valor por defecto de hospedaje por dia (COP)'),
  ('DEFAULT_TRANSP',       200000, 'Valor por defecto de transporte interno por dia (COP)'),
  ('DEFAULT_AEROP',        350000, 'Valor por defecto de transporte aeropuerto (COP)');
