-- Site Survey pasa de Implementacion a Servicios Netmask (troubleshooting, agosto 2026).
-- Se mantiene catalogo_impl_site_survey_rangos como catalogo de referencia de precio
-- por rango de area (no se duplica la tabla) -- el wizard de Servicios lo consulta
-- para mostrar el precio de referencia, pero Site Survey en si es un tipo de
-- servicio mas (igual que los otros 7: descriptivo, sin motor de precios propio
-- en Servicios).

INSERT INTO catalogo_serv_tipos (nombre, icono, version, descripcion, incluye, excluye, condiciones_cliente, campos_dimensionamiento, plantilla_escalamiento_default_id) VALUES
('Site Survey', 'ti-map-pin',  '1.0',
 'Levantamiento de sitio (Ekahau) para dimensionar cobertura inalambrica antes de una implementacion. El precio de referencia por sede depende del rango de area intervenida (ver catalogo de Implementacion).',
 '["Recorrido fisico del sitio con equipo Ekahau","Medicion de cobertura, interferencia y capacidad","Recomendacion de cantidad y ubicacion de APs","Informe de site survey con planos de calor (heatmaps)"]'::jsonb,
 '["Instalacion o configuracion de los APs","Cableado o adecuaciones fisicas del sitio","Licenciamiento de la herramienta de planeacion"]'::jsonb,
 '["Acceso fisico al sitio en la fecha acordada","Planos o layout actualizado del area a intervenir","Acompanamiento de una persona del cliente durante el recorrido"]'::jsonb,
 '["notasSiteSurvey"]'::jsonb,
 NULL);
