# Dirección visual de ZOORIGEN

## Regla de trabajo

La arquitectura de Élite Pecuario no se rediseña ni se simplifica. Se conserva su separación de entradas, router hash, páginas, administración, adaptadores demo/API, autenticación, progreso, certificados, comunidad, recompensas, Stripe, Firebase y Bunny. Esta investigación modifica únicamente la capa visual y la narrativa de ZOORIGEN.

## Referentes estudiados

- Earthwatch organiza la oferta como expediciones filtrables por región, foco, actividad y nivel. ZOORIGEN toma la idea de *ruta de campo* para ordenar cursos y materiales, sin copiar su interfaz: https://earthwatch.org/expeditions/browse
- Brilliant explica su producto mediante rutas guiadas, práctica activa, retroalimentación inmediata, rachas, niveles y ligas. ZOORIGEN conserva esas mecánicas porque ya existen en la arquitectura de Élite, pero las expresa como avance científico y no como videojuego genérico: https://brilliant.org/about/
- Re:wild combina historias, especies, ecosistemas, estrategias e impacto medible. ZOORIGEN toma esa densidad editorial para que la conservación sea el centro de la experiencia: https://www.rewild.org/wildlife

## Concepto: Expedición científica digital

La interfaz se siente como una mezcla contemporánea de estación de campo, archivo naturalista y plataforma educativa premium.

- Fotografía documental en gran formato, con crédito y contexto.
- Números de estación, coordenadas, niveles taxonómicos y sellos de bitácora como detalles funcionales.
- Verde bosque profundo, marfil de libreta, amarillo de señalización y terracota de suelo.
- Titulares editoriales grandes con cuerpo tipográfico técnico y datos en monoespaciada.
- Tarjetas asimétricas, líneas de retícula y contornos topográficos; se evita el tablero SaaS genérico.
- Navegación lateral y móvil intactas en función, pero con identidad de estación de campo.

## Hero v3: paisaje con espacio editorial

El inicio adopta la composición solicitada el 3 de octubre de 2026: la escena de fauna ocupa toda la primera pantalla y el mensaje vive directamente sobre la fotografía. La versión v3 reserva el lado izquierdo para el contenido y reúne a los protagonistas en el lado derecho, de modo que el texto nunca cubra rostros, cuerpos ni alas. La referencia se usó para estudiar profundidad, escala y jerarquía; la escena, el texto, la paleta y los componentes son originales de ZOORIGEN.

- Activo local vigente: `public/assets/zoorigen-fauna-hero-v3.png`; la versión v2 se conserva como antecedente.
- Fauna representada: jaguar, tapir de Baird, venado cola blanca, armadillo, guacamaya roja y mariposas monarca.
- La imagen se generó sin texto, logotipos, personas ni interfaz para mantener la marca y el contenido accesible dentro del HTML.
- En móvil, el mismo encuadre se recorta alrededor del jaguar y conserva acciones, mensaje y métricas visibles.
- La navegación, el hero y las secciones públicas prescinden de marcos repetitivos; usan espacio, contraste y sombras suaves para reducir la saturación visual sin alterar la arquitectura funcional.

## Aplicación sin cambiar la estructura

| Superficie de Élite | Expresión en ZOORIGEN |
| --- | --- |
| Cursos y clases | Expediciones y estaciones de aprendizaje |
| Materiales y visor | Archivo de campo y fichas científicas |
| Retos e historia | Misiones de observación y casos de campo |
| Herramientas | Kit de campo digital |
| Logros y recompensas | Hitos, insignias y acceso verificado |
| Comunidad | Mesa de especialistas |
| En vivo | Sesiones desde la estación |
| Certificados | Evidencias con folio verificable |
| Administración | Centro de operaciones |

## Criterios de calidad

1. La fotografía nunca sustituye información; acompaña títulos, nivel, duración y estado.
2. La gamificación muestra avance y hábito, no puntos decorativos sin consecuencia.
3. Todo contenido comercial o evento sin validar se indica como pendiente.
4. El modo API falla cerrado; jamás rellena una caída con datos demo.
5. La experiencia mantiene paridad funcional en escritorio y móvil.
