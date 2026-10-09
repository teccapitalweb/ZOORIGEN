/* ============================================================ */
/* CONTENIDO DE LA ZONA DE RETOS · Club VIP Zoorigen              */
/*                                                                */
/* Aquí vive TODO el contenido de los retos (solo datos, sin      */
/* pantalla):                                                     */
/*   quiz        22 preguntas de 3 opciones                       */
/*   orden       18 secuencias de 4 a 6 pasos                     */
/*   flashcards  40 tarjetas                                      */
/*   historia    6 mundos x 4 casos de 3 opciones                 */
/*   detective   13 escenas (se muestran solo cuando tienen       */
/*               imagen y 3 zonas: activo:true)                   */
/*                                                                */
/* Cómo activar una escena del detective cuando ya exista su      */
/* imagen: pon la imagen en assets/img/retos/, llena `zonas` con  */
/* 3 puntos { x, y, r } (0 a 1; r = radio como fracción del ancho */
/* de la imagen, uno por cada texto de `riesgos`, en el mismo     */
/* orden) y cambia `activo` a true. Activa las escenas en orden,  */
/* de la primera en adelante: el avance del camino se guarda por  */
/* posición.                                                      */
/*                                                                */
/* Las respuestas correctas se revisan en tests/club-retos.test.js */
/* y los reactivos que un especialista debe validar están en      */
/* REVISION-CONTENIDO.md (no se publica).                         */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_RETOS_DATOS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ───────────── Quiz relámpago: 22 preguntas ───────────── */
  // ok = posición (0, 1 o 2) de la opción correcta. En pantalla las opciones se barajan.
  const quiz = [
    { id: 'q01', tema: 'Bioseguridad', q: 'Llega un animal silvestre nuevo a un centro de manejo. ¿Qué se hace primero?',
      a: ['Ponerlo en cuarentena, separado de los demás animales', 'Meterlo con los otros para que se acostumbre', 'Dejarlo en el área de visitas unos días'], ok: 0,
      why: 'Todo animal nuevo debe pasar por un periodo de cuarentena aparte para observar si trae alguna enfermedad antes de convivir con los demás.' },
    { id: 'q02', tema: 'Fauna ponzoñosa', q: 'Debes mover una serpiente y no sabes si es venenosa. ¿Qué haces?',
      a: ['La tomas de la cola con la mano', 'La manejas con gancho herpetológico, manteniendo distancia', 'La tapas con un trapo y la levantas'], ok: 1,
      why: 'Si no se conoce la especie, se supone que puede ser peligrosa: se maneja con gancho herpetológico y sin usar las manos.' },
    { id: 'q03', tema: 'Legislación', q: '¿Qué regula la Ley General de Vida Silvestre (LGVS)?',
      a: ['El precio de venta de mascotas', 'Solo la pesca comercial', 'La conservación y el aprovechamiento sustentable de la vida silvestre'], ok: 2,
      why: 'La LGVS establece cómo se protege, se maneja y se aprovecha de manera sustentable la vida silvestre y su hábitat en México.' },
    { id: 'q04', tema: 'Legislación', q: '¿Qué contiene la NOM-059-SEMARNAT-2010?',
      a: ['Las reglas para construir zoológicos', 'Los horarios de visita a áreas naturales', 'La lista de especies de flora y fauna silvestres en riesgo, con sus categorías'], ok: 2,
      why: 'La NOM-059 identifica las especies en riesgo y las clasifica en categorías como probablemente extinta en el medio silvestre, en peligro de extinción, amenazada y sujeta a protección especial.' },
    { id: 'q05', tema: 'Legislación', q: '¿Qué significan las siglas UMA?',
      a: ['Unidad de Manejo para la Conservación de la Vida Silvestre', 'Unión de Médicos Animales', 'Unidad Móvil de Atención'], ok: 0,
      why: 'Una UMA es un predio registrado que maneja la vida silvestre con un plan de manejo para su conservación y su aprovechamiento sustentable.' },
    { id: 'q06', tema: 'Legislación', q: 'Un lugar que mantiene animales silvestres fuera de su hábitat natural, como un zoológico o un criadero, se registra como…',
      a: ['Mercado de animales', 'Clínica de belleza animal', 'PIMVS'], ok: 2,
      why: 'PIMVS significa Predio o Instalación que Maneja vida silvestre fuera de su hábitat natural.' },
    { id: 'q07', tema: 'Legislación', q: '¿Qué institución federal se encarga de inspeccionar y vigilar que se cumpla la normatividad ambiental?',
      a: ['La PROFEPA', 'La Secretaría de Turismo', 'El Instituto del Deporte'], ok: 0,
      why: 'La Procuraduría Federal de Protección al Ambiente (PROFEPA) realiza inspecciones y vigila el cumplimiento de las leyes ambientales, incluida la de vida silvestre.' },
    { id: 'q08', tema: 'Rescate', q: 'Encuentras un ave silvestre adulta herida. ¿Qué es lo más prudente?',
      a: ['Forzarla a comer y beber con una jeringa', 'Soltarla en el jardín para que se recupere sola', 'Ponerla en una caja ventilada, oscura y tranquila, y avisar a personal capacitado'], ok: 2,
      why: 'Un ambiente oscuro y silencioso reduce el estrés. No se debe forzar alimento ni agua; lo correcto es pedir ayuda a personal capacitado o a un centro autorizado.' },
    { id: 'q09', tema: 'Aves rapaces', q: '¿Qué protección es básica para sostener un ave rapaz?',
      a: ['Un guante de cuero grueso', 'Una playera de algodón', 'Nada, para no asustarla'], ok: 0,
      why: 'Las garras de las rapaces son su principal herramienta: el guante de cuero grueso protege la mano y el antebrazo de quien la maneja.' },
    { id: 'q10', tema: 'Felinos', q: 'En el recinto de un felino, ¿qué medida de seguridad es indispensable para quien entra a trabajar?',
      a: ['Una sola puerta, siempre abierta', 'Una cuerda en el piso', 'Una doble puerta de seguridad, con una cerrada antes de abrir la otra'], ok: 2,
      why: 'La doble puerta evita que el animal pueda salir si una de las puertas falla o se abre por descuido.' },
    { id: 'q11', tema: 'Fauna ponzoñosa', q: 'Una persona sufre una mordedura de serpiente de cascabel. ¿Qué es lo correcto?',
      a: ['Cortar la herida y succionar el veneno', 'Mantenerla calmada y quieta, y llevarla de inmediato a un hospital', 'Ponerle un torniquete muy apretado'], ok: 1,
      why: 'Cortar, succionar o poner torniquetes causa más daño. Lo importante es mantener a la persona tranquila, inmovilizar la zona y trasladarla pronto a un hospital, donde se aplica el suero antiviperino.' },
    { id: 'q12', tema: 'Fauna ponzoñosa', q: 'Para recoger un escorpión en campo, la herramienta más segura es…',
      a: ['Las manos con guantes de tela', 'Un palo con el que se le golpea', 'Unas pinzas largas'], ok: 2,
      why: 'Las pinzas largas permiten sujetar al animal sin acercar la mano. Los guantes de tela no protegen de un aguijón.' },
    { id: 'q13', tema: 'Fototrampeo', q: 'Al instalar una cámara trampa, ¿qué conviene revisar frente al sensor?',
      a: ['Que haya ramas y hojas para esconderla mejor', 'Que apunte directo al sol', 'Que esté despejado de vegetación que se mueva con el viento'], ok: 2,
      why: 'Las ramas y hojas frente al sensor provocan disparos falsos y pueden tapar a los animales. Se despeja el frente y se evita apuntar al sol.' },
    { id: 'q14', tema: 'Fototrampeo', q: '¿Para qué sirve principalmente una cámara trampa?',
      a: ['Para atrapar animales vivos', 'Para ahuyentar a los depredadores', 'Para registrar fauna sin molestarla'], ok: 2,
      why: 'El fototrampeo es un método de monitoreo no invasivo: la cámara se activa con el movimiento o el calor y el animal sigue su vida sin ser capturado.' },
    { id: 'q15', tema: 'Entomología forense', q: '¿Qué estudia la entomología forense?',
      a: ['Los insectos que ayudan en investigaciones legales, por ejemplo para estimar el tiempo transcurrido desde una muerte', 'Solo las plagas de los cultivos', 'La crianza de insectos como mascotas'], ok: 0,
      why: 'Los insectos que llegan a unos restos siguen un orden y un ritmo de desarrollo conocidos, y eso ayuda a las investigaciones legales.' },
    { id: 'q16', tema: 'Entomología forense', q: 'Al recolectar larvas en el sitio de un caso, ¿qué es indispensable?',
      a: ['Mezclar todas en un solo frasco sin etiqueta', 'Frascos rotulados con fecha, hora y lugar, y registrar la temperatura ambiente', 'Tirar las larvas y quedarse con una foto'], ok: 1,
      why: 'Sin fecha, lugar y temperatura, las muestras pierden valor. Cada frasco se rotula y se registran las condiciones del sitio.' },
    { id: 'q17', tema: 'Zoonosis', q: '¿Qué es una zoonosis?',
      a: ['Una enfermedad que solo afecta a los zoológicos', 'Una enfermedad que puede transmitirse entre los animales y las personas', 'Una vacuna para animales silvestres'], ok: 1,
      why: 'Zoonosis es cualquier enfermedad que se transmite de los animales a las personas (y a veces al revés). Por eso se cuida la higiene al manejar fauna.' },
    { id: 'q18', tema: 'Zoonosis', q: 'Vas a manejar murciélagos o roedores en campo. ¿Qué es básico?',
      a: ['Usar guantes y mascarilla, no comer en el área de trabajo y lavarse las manos', 'Trabajar con las manos limpias, sin guantes', 'Comer en la mesa de trabajo para no perder tiempo'], ok: 0,
      why: 'El equipo de protección, no comer ni beber en el área de trabajo y el lavado de manos reducen el riesgo de contagio de enfermedades.' },
    { id: 'q19', tema: 'Mariposarios', q: '¿Por qué un mariposario necesita plantas hospederas?',
      a: ['Porque las orugas se alimentan de plantas específicas', 'Solo para dar sombra a los visitantes', 'Porque las mariposas adultas comen hojas'], ok: 0,
      why: 'Cada especie de mariposa deposita sus huevos en ciertas plantas, y las orugas se alimentan de ellas. Sin plantas hospederas no hay nuevas generaciones.' },
    { id: 'q20', tema: 'Mariposarios', q: '¿Para qué se usa una entrada con dos puertas en un mariposario?',
      a: ['Para cobrar la entrada', 'Para que las mariposas no se escapen al abrir la puerta', 'Para que entre más aire frío'], ok: 1,
      why: 'Se abre una puerta, se cierra y hasta entonces se abre la otra; así las mariposas no salen del lugar.' },
    { id: 'q21', tema: 'Ultrasonografía', q: '¿Para qué se aplica gel en la sonda del ultrasonido?',
      a: ['Para dar frío al animal', 'Para eliminar el aire entre la sonda y la piel y que pasen las ondas', 'Para que la sonda no se manche'], ok: 1,
      why: 'El aire bloquea las ondas de sonido. El gel de acoplamiento llena ese espacio y permite una imagen clara.' },
    { id: 'q22', tema: 'Ultrasonografía', q: 'El ultrasonido produce las imágenes con…',
      a: ['Rayos X', 'Ondas de sonido de alta frecuencia', 'Luz láser'], ok: 1,
      why: 'El ultrasonido emite ondas de sonido y forma la imagen con los ecos. No usa radiación ionizante como los rayos X.' }
  ];

  /* ───────────── Ordena el procedimiento: 18 secuencias ───────────── */
  // pasos = el orden CORRECTO. En pantalla se barajan.
  const orden = [
    { id: 'o01', tema: 'Bioseguridad', titulo: 'Lavado de manos después de manejar fauna',
      pasos: ['Mojar las manos con agua', 'Aplicar jabón y tallar al menos 20 segundos', 'Enjuagar con agua limpia', 'Secar con una toalla desechable'] },
    { id: 'o02', tema: 'Bioseguridad', titulo: 'Colocarse el equipo de protección',
      pasos: ['Lavarse las manos', 'Ponerse la bata u overol', 'Colocarse el cubrebocas', 'Ponerse los lentes de protección', 'Ponerse los guantes'] },
    { id: 'o03', tema: 'Bioseguridad', titulo: 'Quitarse el equipo de protección',
      pasos: ['Quitarse los guantes', 'Quitarse los lentes de protección', 'Quitarse la bata u overol', 'Quitarse el cubrebocas', 'Lavarse las manos'] },
    { id: 'o04', tema: 'Bioseguridad', titulo: 'Limpieza y desinfección de un recinto',
      pasos: ['Mover al animal a un área segura', 'Retirar restos de comida y heces', 'Lavar con agua y detergente', 'Enjuagar', 'Aplicar el desinfectante y respetar su tiempo de contacto', 'Dejar secar antes de regresar al animal'] },
    { id: 'o05', tema: 'Bioseguridad', titulo: 'Llegada de un animal nuevo al centro',
      pasos: ['Registrar su llegada y revisar sus documentos', 'Hacer una revisión visual inicial', 'Colocarlo en el área de cuarentena', 'Observarlo durante todo el periodo de cuarentena', 'Pasarlo al recinto definitivo con el visto bueno del veterinario'] },
    { id: 'o06', tema: 'Rescate', titulo: 'Captura de una serpiente con gancho herpetológico',
      pasos: ['Mantener distancia y evaluar el entorno', 'Colocarse el equipo de protección', 'Sujetar a la serpiente con el gancho por la parte media del cuerpo', 'Depositarla en un contenedor seguro con tapa', 'Cerrar el contenedor y registrar el rescate'] },
    { id: 'o07', tema: 'Rescate', titulo: 'Rescate de fauna antes de una obra',
      pasos: ['Recorrer y delimitar el área de trabajo', 'Capturar y contener a los animales', 'Revisar su estado de salud', 'Trasladarlos en contenedores adecuados', 'Liberarlos en un sitio seguro y registrar la liberación'] },
    { id: 'o08', tema: 'Rescate', titulo: 'Ave herida encontrada por una persona',
      pasos: ['Acercarse con calma y sin ruido', 'Colocar el ave en una caja ventilada y oscura', 'Dejarla en un lugar tranquilo, sin ruido ni mascotas', 'Avisar a un veterinario o a un centro autorizado', 'Entregarla a personal capacitado'] },
    { id: 'o09', tema: 'Rescate', titulo: 'Liberación de un animal rehabilitado',
      pasos: ['El veterinario confirma que ya puede salir', 'Elegir un sitio adecuado dentro de su hábitat', 'Trasladarlo en una caja segura', 'Liberarlo con cuidado y desde la distancia', 'Registrar la fecha y el lugar de la liberación'] },
    { id: 'o10', tema: 'Manejo', titulo: 'Transporte de un animal silvestre',
      pasos: ['Verificar que cuenta con la documentación necesaria', 'Preparar una caja ventilada y resistente', 'Colocar al animal con cuidado', 'Rotular la caja', 'Trasladar a la sombra, sin calor excesivo', 'Revisar su estado al llegar'] },
    { id: 'o11', tema: 'Aves rapaces', titulo: 'Subir un ave rapaz al guante',
      pasos: ['Ponerse el guante de cuero grueso', 'Acercarse con calma y sin movimientos bruscos', 'Sujetar las correas de las patas', 'Subir el ave al guante', 'Mantenerla con las correas firmes en la mano'] },
    { id: 'o12', tema: 'Fauna ponzoñosa', titulo: 'Primeros auxilios ante una mordedura de serpiente',
      pasos: ['Alejar a la persona de la serpiente', 'Mantenerla calmada y sin moverse', 'Retirar anillos y relojes cercanos a la mordedura', 'Llamar a emergencias o trasladarla de inmediato al hospital'] },
    { id: 'o13', tema: 'Fototrampeo', titulo: 'Instalar una cámara trampa',
      pasos: ['Elegir un sitio con rastros de fauna', 'Despejar la vegetación frente al sensor', 'Fijar la cámara al árbol', 'Configurar fecha y hora y hacer una prueba', 'Anotar las coordenadas del sitio y activarla'] },
    { id: 'o14', tema: 'Entomología forense', titulo: 'Recolección de insectos en un sitio de estudio',
      pasos: ['Fotografiar y documentar el sitio', 'Registrar la temperatura ambiente', 'Recolectar los ejemplares con pinzas', 'Colocarlos en frascos rotulados con fecha y lugar', 'Entregar las muestras con su cadena de custodia'] },
    { id: 'o15', tema: 'Zoonosis', titulo: 'Muestreo de roedores en campo',
      pasos: ['Ponerse guantes y mascarilla', 'Capturar al animal con la trampa', 'Tomar las muestras', 'Rotular los tubos', 'Desinfectar el material y lavarse las manos'] },
    { id: 'o16', tema: 'Mariposarios', titulo: 'Entrada de visitantes a un mariposario',
      pasos: ['Abrir la primera puerta', 'Entrar y cerrar la primera puerta', 'Abrir la segunda puerta', 'Entrar y cerrar la segunda puerta'] },
    { id: 'o17', tema: 'Ultrasonografía', titulo: 'Ultrasonido a un mamífero silvestre',
      pasos: ['Preparar el equipo y revisar la sonda', 'Colocar al animal en posición segura, bajo la supervisión del veterinario', 'Aplicar gel de acoplamiento', 'Recorrer la zona con la sonda', 'Guardar las imágenes y limpiar la sonda'] },
    { id: 'o18', tema: 'Monitoreo', titulo: 'Registro de un avistamiento de fauna',
      pasos: ['Observar y fotografiar desde lejos', 'Anotar fecha, hora y lugar', 'Describir tamaño y color', 'Comparar con una guía de campo', 'Confirmar con un especialista'] }
  ];

  /* ───────────── Flashcards: 40 tarjetas ───────────── */
  const flashcards = [
    { id: 'f01', front: 'LGVS', back: 'Ley General de Vida Silvestre. Regula la conservación y el aprovechamiento sustentable de la vida silvestre y su hábitat en México.' },
    { id: 'f02', front: 'NOM-059-SEMARNAT-2010', back: 'Norma que identifica las especies de flora y fauna silvestres en riesgo y las clasifica en categorías.' },
    { id: 'f03', front: 'SEMARNAT', back: 'Secretaría de Medio Ambiente y Recursos Naturales. Dependencia federal que, entre otras cosas, otorga los registros y las autorizaciones de vida silvestre.' },
    { id: 'f04', front: 'PROFEPA', back: 'Procuraduría Federal de Protección al Ambiente. Inspecciona y vigila que se cumpla la normatividad ambiental.' },
    { id: 'f05', front: 'UMA', back: 'Unidad de Manejo para la Conservación de la Vida Silvestre. Predio registrado que maneja vida silvestre con un plan de manejo.' },
    { id: 'f06', front: 'PIMVS', back: 'Predio o Instalación que Maneja vida silvestre fuera de su hábitat natural, como un zoológico o un criadero.' },
    { id: 'f07', front: 'Plan de manejo', back: 'Documento técnico que describe cómo se cuidará y se aprovechará de forma sustentable una población de vida silvestre o su hábitat.' },
    { id: 'f08', front: 'Marcaje', back: 'Método para identificar a cada ejemplar de forma individual, por ejemplo con un anillo, una marca o un microchip.' },
    { id: 'f09', front: 'Especie en riesgo', back: 'Especie cuya población está amenazada. En México se clasifica en la NOM-059 como amenazada, en peligro de extinción o sujeta a protección especial.' },
    { id: 'f10', front: 'Especie endémica', back: 'Especie que vive de forma natural solo en una región determinada y en ningún otro lugar del mundo.' },
    { id: 'f11', front: 'Especie exótica invasora', back: 'Especie que vive fuera de su área natural y que, al establecerse, daña a otras especies o al ecosistema.' },
    { id: 'f12', front: 'Cuarentena', back: 'Aislamiento de los animales recién llegados para observar si están enfermos antes de unirlos a los demás.' },
    { id: 'f13', front: 'Bioseguridad', back: 'Conjunto de medidas para evitar que entren o salgan enfermedades de un lugar con animales y para proteger a las personas.' },
    { id: 'f14', front: 'Zoonosis', back: 'Enfermedad que puede transmitirse entre los animales y las personas.' },
    { id: 'f15', front: 'EPP', back: 'Equipo de protección personal: guantes, cubrebocas, lentes de protección, bata u overol y calzado adecuado.' },
    { id: 'f16', front: 'Limpieza y desinfección', back: 'Primero se limpia (se retira la suciedad) y después se desinfecta (se eliminan los microbios). Un desinfectante no funciona bien sobre superficies sucias.' },
    { id: 'f17', front: 'Gancho herpetológico', back: 'Herramienta de mango largo que permite mover serpientes a distancia, sin usar las manos.' },
    { id: 'f18', front: 'Contención física', back: 'Sujetar o limitar el movimiento de un animal con técnicas y equipo adecuados, sin lastimarlo.' },
    { id: 'f19', front: 'Contención química', back: 'Uso de medicamentos, siempre por un veterinario, para inmovilizar o sedar a un animal y poder manejarlo de forma segura.' },
    { id: 'f20', front: 'Enriquecimiento ambiental', back: 'Elementos y actividades que permiten al animal en cautiverio expresar su conducta natural y mejoran su bienestar.' },
    { id: 'f21', front: 'Bienestar animal', back: 'Estado de salud física y mental de un animal. Suele evaluarse con las cinco libertades: sin hambre ni sed, sin incomodidad, sin dolor ni enfermedad, con conducta natural y sin miedo.' },
    { id: 'f22', front: 'Pihuelas', back: 'Correas delgadas de cuero que se colocan en las patas de un ave rapaz para sujetarla.' },
    { id: 'f23', front: 'Capirote', back: 'Caperuza que cubre los ojos de un ave rapaz para mantenerla tranquila.' },
    { id: 'f24', front: 'Cetrería', back: 'Arte de manejar aves rapaces entrenadas.' },
    { id: 'f25', front: 'Fototrampeo', back: 'Uso de cámaras activadas por movimiento o calor para registrar fauna sin molestarla.' },
    { id: 'f26', front: 'Día-cámara', back: 'Una cámara trampa funcionando durante un día. Es la unidad con la que se mide el esfuerzo de muestreo.' },
    { id: 'f27', front: 'Fauna ponzoñosa', back: 'Animales que producen veneno y tienen un aparato para inocularlo, como colmillos o aguijón.' },
    { id: 'f28', front: 'Suero antiviperino', back: 'Medicamento que neutraliza el veneno de las víboras. Se aplica en un hospital, bajo supervisión médica.' },
    { id: 'f29', front: 'Entomología forense', back: 'Estudio de los insectos asociados a unos restos para apoyar investigaciones legales.' },
    { id: 'f30', front: 'Intervalo postmortem', back: 'Tiempo que pasó desde la muerte hasta que se encuentran los restos. Los insectos ayudan a estimarlo.' },
    { id: 'f31', front: 'Cadena de custodia', back: 'Registro de quién tiene una muestra y cuándo, desde que se toma hasta que se analiza.' },
    { id: 'f32', front: 'Metamorfosis completa', back: 'Desarrollo con cuatro etapas: huevo, larva, pupa y adulto. Es el caso de las mariposas.' },
    { id: 'f33', front: 'Planta hospedera', back: 'Planta en la que una mariposa pone sus huevos y de la que se alimentan sus orugas.' },
    { id: 'f34', front: 'Planta nectarífera', back: 'Planta con flores que ofrecen néctar, el alimento de muchas mariposas adultas.' },
    { id: 'f35', front: 'Crisálida', back: 'Etapa en la que la oruga se transforma en mariposa. También se le llama pupa.' },
    { id: 'f36', front: 'Ultrasonido', back: 'Técnica que forma imágenes del interior del cuerpo con ondas de sonido de alta frecuencia, sin radiación.' },
    { id: 'f37', front: 'Transductor (sonda)', back: 'Parte del ultrasonido que emite las ondas de sonido y recibe su eco para formar la imagen.' },
    { id: 'f38', front: 'Gel de acoplamiento', back: 'Gel que se pone entre la sonda y la piel para eliminar el aire y permitir que pasen las ondas.' },
    { id: 'f39', front: 'Rescate y reubicación de fauna', back: 'Captura y traslado de animales desde un sitio que será intervenido, como una obra, hacia un lugar seguro y adecuado.' },
    { id: 'f40', front: 'Trampa Sherman', back: 'Trampa de aluminio, plegable, con la que se capturan vivos a roedores pequeños para estudiarlos y liberarlos.' }
  ];

  /* ───────────── Modo historia: 6 mundos x 4 casos ───────────── */
  // Cada caso: escena, a (3 opciones), ok (posición correcta), why. Con 3 aciertos de 4 se abre el siguiente mundo.
  const historia = [
    { id: 1, nombre: 'La selva y las cámaras', descripcion: 'Fototrampeo y felinos: aprende a registrar fauna sin molestarla.',
      imagen: 'assets/img/retos/historia-selva.jpg', color: '#95A303',
      intro: 'Amanece en la selva. Hoy toca revisar el monitoreo con cámaras trampa y moverte con respeto por el territorio de los felinos.',
      casos: [
        { escena: 'Vas a instalar una cámara trampa en un sendero con huellas frescas. Frente al sensor hay una rama grande que se mueve con el viento.',
          a: ['Quitar o despejar la rama para evitar disparos falsos', 'Apuntar la cámara hacia arriba', 'Dejar la rama: así la cámara queda escondida'], ok: 0,
          why: 'Lo que se mueve frente al sensor dispara la cámara sin que haya animales. Se despeja el frente y se apunta hacia el sendero.' },
        { escena: 'Al revisar la cámara, aparece la foto de un jaguar. ¿Qué haces con ese dato?',
          a: ['Publicar de inmediato el punto exacto en redes sociales', 'Borrar la foto para no tener problemas', 'Registrar fecha, hora y sitio, y guardar la imagen como evidencia del monitoreo'], ok: 2,
          why: 'El valor del fototrampeo está en los datos. La ubicación exacta de especies en riesgo no se difunde, para no ponerlas en peligro.' },
        { escena: 'Caminando por la selva te topas con un felino adulto a unos metros. No parece haberte visto.',
          a: ['Acercarte para tomar una foto mejor', 'Mantener la calma, no darle la espalda y alejarte despacio', 'Correr para alejarte rápido'], ok: 1,
          why: 'Correr puede activar su instinto de persecución. Lo prudente es mantener la calma, no acercarse y retirarse con tranquilidad sin darle la espalda.' },
        { escena: 'Notas que la cámara que dejaste hace un mes ya no está en el árbol, solo quedan las correas.',
          a: ['Anotar el incidente y avisar al responsable del proyecto', 'Seguir como si nada: no se perdió ninguna foto', 'Instalar otra en el mismo lugar sin avisar a nadie'], ok: 0,
          why: 'Un equipo perdido o robado se reporta para que el responsable decida qué hacer; también sirve para mejorar la seguridad de las cámaras, por ejemplo con candado y cable.' }
      ] },
    { id: 2, nombre: 'El humedal y los vectores', descripcion: 'Zoonosis, vectores y entomología: cuida tu salud y la de los animales.',
      imagen: 'assets/img/retos/historia-humedal.jpg', color: '#037BC9',
      intro: 'En el humedal hay aves, roedores, mosquitos y muchísimos insectos. Aquí la higiene personal es parte del trabajo.',
      casos: [
        { escena: 'Vas a tomar muestras de roedores en el humedal. Tu compañero propone trabajar sin guantes porque "son más rápidos".',
          a: ['Trabajar sin guantes, pero lavarse las manos al final', 'Usar guantes y mascarilla, aunque tome un poco más de tiempo', 'Usar guantes solo con los animales grandes'], ok: 1,
          why: 'Los roedores pueden portar agentes de enfermedades. El equipo de protección se usa siempre, sin importar el tamaño del animal.' },
        { escena: 'Es hora del almuerzo. La mesa de trabajo está llena de tubos con muestras.',
          a: ['Comer en otra zona, lejos de las muestras, después de lavarse las manos', 'Comer con los guantes puestos', 'Comer en la mesa de trabajo para no perder tiempo'], ok: 0,
          why: 'Nunca se come ni se bebe donde hay muestras o animales. Se sale del área de trabajo y se lavan las manos antes.' },
        { escena: 'Quieres recolectar larvas de insectos en un sitio de estudio. Tienes frascos, pero no tienes etiquetas a la mano.',
          a: ['Tirar las larvas y tomar solo una foto', 'Guardar todo junto y rotularlo en casa de memoria', 'Anotar fecha, hora y lugar en una etiqueta o con marcador antes de cerrar cada frasco'], ok: 2,
          why: 'Una muestra sin datos pierde su valor. Cada frasco se rotula con fecha, hora y lugar en el momento de recolectarlo.' },
        { escena: 'Los mosquitos abundan al atardecer. Debes hacer un monitoreo de aves.',
          a: ['Cancelar el monitoreo del humedal', 'Usar ropa clara que cubra brazos y piernas, y repelente', 'Ir en short y playera sin repelente para no sudar'], ok: 1,
          why: 'La ropa que cubre la piel y el repelente reducen las picaduras y el riesgo de enfermedades transmitidas por mosquitos.' }
      ] },
    { id: 3, nombre: 'El arrecife y la costa', descripcion: 'Tiburones, rayas y tortugas marinas: respeto y seguridad en el agua.',
      imagen: 'assets/img/retos/historia-arrecife.jpg', color: '#037BC9',
      intro: 'El mar esconde mucha vida. Aquí cada decisión se toma pensando en los animales y en las personas.',
      casos: [
        { escena: 'Encuentras una tortuga marina anidando en la playa de noche. Un grupo de turistas quiere acercarse con linternas y cámaras con flash.',
          a: ['Dejar que se tomen fotos rápido, porque son pocos', 'Cubrir a la tortuga con una lona', 'Pedirles que mantengan distancia, sin luces ni flash, y avisar a las autoridades o al personal del campamento'], ok: 2,
          why: 'Las luces y el ruido pueden hacer que la tortuga abandone el nido. Se mantiene distancia y se avisa a quien está a cargo de la protección.' },
        { escena: 'En un acuario debes mover una raya a otro tanque. ¿Qué precaución es la más importante?',
          a: ['Sujetarla por la cola', 'Conocer dónde está el aguijón y manejarla con cuidado, con guantes y equipo adecuado', 'Sacarla del agua lo más rápido posible'], ok: 1,
          why: 'Muchas rayas tienen un aguijón en la cola que puede causar lesiones. Se manejan con protección y sosteniendo el cuerpo con cuidado.' },
        { escena: 'En la playa, un bañista te pregunta si puede llevarse una concha grande de caracol marino "de recuerdo".',
          a: ['Explicarle que algunos moluscos y su hábitat tienen protección y que es mejor dejarla en su lugar', 'Pedirle dinero por la concha', 'Sí, la naturaleza se renueva sola'], ok: 0,
          why: 'Retirar organismos marinos puede afectar al ecosistema y, en algunos casos, está regulado por la ley. Lo mejor es dejar todo en su lugar.' },
        { escena: 'Ves una red de pesca enredada en un arrecife con peces atrapados.',
          a: ['Tirar de la red hasta romperla', 'Ignorarla: no es tu zona de trabajo', 'Avisar a personal capacitado y no arriesgarte a bucear sin preparación'], ok: 2,
          why: 'Las redes abandonadas son peligrosas también para quien intenta quitarlas. Se reporta y lo hace personal con la capacitación y el equipo.' }
      ] },
    { id: 4, nombre: 'El desierto ponzoñoso', descripcion: 'Serpientes, alacranes y otros animales ponzoñosos: cómo trabajar sin riesgos.',
      imagen: 'assets/img/retos/historia-desierto.jpg', color: '#C75402',
      intro: 'Bajo las piedras del desierto viven animales que merecen respeto. Con el equipo correcto, el riesgo baja muchísimo.',
      casos: [
        { escena: 'Antes de mover una piedra grande para buscar alacranes, ¿qué haces?',
          a: ['Ponerte botas cerradas y guantes, y moverla con una herramienta o pinzas largas', 'Moverla con las manos descubiertas, rápido', 'Pisarla para espantar lo que haya debajo'], ok: 0,
          why: 'Las piedras son refugio de animales. Se usan botas cerradas, guantes y herramientas para mantener distancia.' },
        { escena: 'Una serpiente de cascabel está enroscada junto a la camioneta, lista para alejarse.',
          a: ['Tomarla de la cola para subirla a la caja', 'Golpearla con un palo', 'Mantener distancia, dejarle camino libre y avisar a personal capacitado si hay riesgo'], ok: 2,
          why: 'La mayoría de las mordeduras ocurre cuando se intenta matar o manipular a la serpiente. Lo mejor es alejarse y dar aviso.' },
        { escena: 'Un compañero fue picado por un alacrán. Está asustado y quiere correr a buscar ayuda.',
          a: ['Dejarlo dormir para que se le pase', 'Tranquilizarlo, mantenerlo quieto y llevarlo de inmediato a un servicio médico', 'Ponerle hielo directo y esperar a ver si mejora'], ok: 1,
          why: 'La calma disminuye la circulación del veneno. Cualquier picadura de alacrán debe atenderse rápido en un servicio médico, sobre todo en niños.' },
        { escena: 'En el laboratorio de fauna ponzoñosa, un contenedor con escorpiones está sin tapa mientras limpias la mesa.',
          a: ['Taparlo de inmediato y asegurarlo antes de seguir', 'Moverlo con las manos a otra mesa', 'Terminar de limpiar y luego tapar'], ok: 0,
          why: 'Los contenedores con animales ponzoñosos siempre van cerrados. Lo primero es asegurar que no puedan salir.' }
      ] },
    { id: 5, nombre: 'El bosque de niebla y la ley', descripcion: 'UMA, NOM-059, SEMARNAT y PROFEPA: el marco legal de la fauna silvestre.',
      imagen: 'assets/img/retos/historia-bosque-niebla.jpg', color: '#95A303',
      intro: 'En el bosque de niebla trabajan comunidades y técnicos. Saber qué dice la ley te ayuda a proteger a la fauna y a protegerte.',
      casos: [
        { escena: 'Una persona te ofrece un loro silvestre en venta, sin ningún documento.',
          a: ['Comprarlo para que no sufra', 'Rechazar la compra y avisar a las autoridades, como la PROFEPA', 'Comprarlo y venderlo más caro'], ok: 1,
          why: 'Comprar fauna silvestre sin documentos fomenta el tráfico ilegal. Lo correcto es no comprarla y reportarlo a la autoridad.' },
        { escena: 'Una comunidad quiere aprovechar de forma ordenada la fauna de su terreno. ¿Qué figura legal les conviene?',
          a: ['Registrar una UMA con su plan de manejo', 'Abrir una tienda sin registro', 'Soltar animales exóticos en el terreno'], ok: 0,
          why: 'La UMA permite hacerlo de forma legal y sustentable, con un plan de manejo que sustente el aprovechamiento.' },
        { escena: 'Te piden revisar si una especie está en riesgo. ¿Dónde se consulta su categoría oficial?',
          a: ['En un folleto turístico', 'En un buscador de imágenes', 'En la NOM-059-SEMARNAT-2010'], ok: 2,
          why: 'La NOM-059 es la norma que lista las especies en riesgo y su categoría oficial en México.' },
        { escena: 'Vas a mantener fauna silvestre fuera de su hábitat natural en un predio nuevo. ¿Qué tienes que hacer antes?',
          a: ['Avisar a los vecinos, y nada más', 'Dar de alta la instalación como PIMVS y cumplir con lo que pide la ley', 'Esperar a que PROFEPA haga una visita'], ok: 1,
          why: 'Las instalaciones que manejan fauna fuera de su hábitat deben registrarse como PIMVS ante la autoridad ambiental.' }
      ] },
    { id: 6, nombre: 'El centro de rescate', descripcion: 'Cuarentena, rapaces, rescate y ultrasonido: un día completo de trabajo.',
      imagen: 'assets/img/retos/historia-centro-rescate.jpg', color: '#C75402',
      intro: 'Es la última etapa. En el centro de rescate se juntan todos los temas: seguridad, bioseguridad y respeto por cada animal.',
      casos: [
        { escena: 'Entra al centro un halcón rescatado. ¿Dónde lo recibes?',
          a: ['En el recinto con las demás aves, para que socialice', 'En la oficina, junto a las visitas', 'En el área de cuarentena, apartado de las demás aves'], ok: 2,
          why: 'Todo animal nuevo pasa por cuarentena. Así se protege a los animales sanos del centro.' },
        { escena: 'Debes revisar al halcón. ¿Con qué protección y de qué forma lo sostienes?',
          a: ['Con las manos desnudas, rápido', 'Con guante grueso de cuero, sujetando las correas y las patas, con calma', 'Con una toalla fina, sin sujetar las garras'], ok: 1,
          why: 'Las garras son su arma principal. El guante grueso protege y sujetar bien las patas evita lesiones al ave y a la persona.' },
        { escena: 'Antes de un ultrasonido a un mamífero silvestre sedado, el veterinario te pide preparar el equipo. ¿Qué incluye?',
          a: ['Sonda limpia, gel de acoplamiento y el equipo de monitoreo del animal', 'Solo el gel; lo demás no es necesario', 'Solo la sonda; el gel mancha la piel'], ok: 0,
          why: 'Un animal sedado se vigila durante todo el procedimiento. El gel permite una buena imagen y la sonda debe estar limpia.' },
        { escena: 'Terminas de revisar a un animal en cuarentena. ¿Cuál es el siguiente paso antes de ir con el siguiente?',
          a: ['Quitarte solo el cubrebocas', 'Pasar directo al siguiente, con los mismos guantes', 'Cambiar los guantes, desinfectar el material y lavarte las manos'], ok: 2,
          why: 'Cambiar de guantes y lavarse las manos entre un animal y otro evita llevar enfermedades de uno a otro.' }
      ] }
  ];

  /* ───────────── Detective de campo: 13 escenas ───────────── */
  // Cada escena se activa (activo:true) hasta que tenga imagen y sus 3 zonas { x, y, r }.
  // riesgos[i] explica el error de zonas[i].
  const detective = [
    { id: 'serpiente-rescate', titulo: 'Rescate de una serpiente', imagen: 'assets/img/retos/detective-serpiente-rescate.webp', zonas: [], activo: false,
      riesgos: ['Sostiene a la serpiente por la cola y sin gancho herpetológico: puede morder y se lastima al animal.',
                'No usa guantes ni protección en los ojos.',
                'Hay una bolsa de transporte abierta en el suelo con otro reptil asomando: puede escapar.'] },
    { id: 'cuarentena', titulo: 'Área de cuarentena', imagen: 'assets/img/retos/detective-cuarentena.webp', zonas: [], activo: false,
      riesgos: ['Hay jaulas de especies distintas pegadas, sin separación: se pueden contagiar entre sí.',
                'La persona maneja un animal sin cubrebocas ni guantes.',
                'Hay comida sobre el piso, junto a las jaulas: atrae plagas y contamina.'] },
    { id: 'ave-rapaz', titulo: 'Revisión de un halcón', imagen: 'assets/img/retos/detective-ave-rapaz.webp', zonas: [], activo: false,
      riesgos: ['No usa guante de cuero grueso: las garras pueden lesionar la mano.',
                'Las garras están sueltas, sin sujetar.',
                'La ventana del cuarto está abierta y sin cubrir: el ave podría escapar.'] },
    { id: 'transporte', titulo: 'Transporte de animales', imagen: 'assets/img/retos/detective-transporte.webp', zonas: [], activo: false,
      riesgos: ['Una caja no tiene orificios de ventilación: el animal podría asfixiarse.',
                'Las cajas están apiladas al sol directo: riesgo de golpe de calor.',
                'Las cajas no tienen etiqueta ni documentos: no se sabe qué animal lleva cada una.'] },
    { id: 'anestesia', titulo: 'Mamífero sedado', imagen: 'assets/img/retos/detective-anestesia.webp', zonas: [], activo: false,
      riesgos: ['No hay monitor de signos vitales para vigilar al animal sedado.',
                'El médico no usa guantes ni bata.',
                'Los frascos de medicamento de la charola no tienen etiqueta.'] },
    { id: 'mariposario', titulo: 'Interior de un mariposario', imagen: 'assets/img/retos/detective-mariposario.webp', zonas: [], activo: false,
      riesgos: ['Un visitante atrapa una mariposa con la mano: se dañan sus alas.',
                'Hay fruta fermentada derramada con hormigas: atrae plagas.',
                'La puerta exterior y la interior están abiertas a la vez: las mariposas pueden escapar.'] },
    { id: 'fototrampeo', titulo: 'Instalación de una cámara trampa', imagen: 'assets/img/retos/detective-fototrampeo.webp', zonas: [], activo: false,
      riesgos: ['La cámara está muy alta e inclinada hacia el cielo: no registrará a los animales del sendero.',
                'No tiene candado ni cable de seguridad: pueden robarla.',
                'Ramas y hojas tapan el sensor: provocan disparos falsos.'] },
    { id: 'obra-rescate', titulo: 'Rescate de fauna en una obra', imagen: 'assets/img/retos/detective-obra-rescate.webp', zonas: [], activo: false,
      riesgos: ['Un trabajador toca un mamífero sin guantes.',
                'No hay área de contención ni cajas de transporte.',
                'La maquinaria funciona junto a la zona de rescate.'] },
    { id: 'zoonosis', titulo: 'Toma de muestras en campo', imagen: 'assets/img/retos/detective-zoonosis.webp', zonas: [], activo: false,
      riesgos: ['No se usan guantes ni mascarilla al manejar roedores o murciélagos.',
                'Los tubos de las muestras no están rotulados.',
                'Hay comida y bebida sobre la mesa de trabajo.'] },
    { id: 'entomologia', titulo: 'Recolección de insectos', imagen: 'assets/img/retos/detective-entomologia.webp', zonas: [], activo: false,
      riesgos: ['Los frascos no tienen etiqueta.',
                'Se recolecta con las manos, sin guantes ni pinzas.',
                'Una persona está comiendo en el área de trabajo.'] },
    { id: 'uma-felino', titulo: 'Recinto de un felino', imagen: 'assets/img/retos/detective-uma-felino.webp', zonas: [], activo: false,
      riesgos: ['El recinto no tiene doble puerta de seguridad.',
                'Un visitante tiene la mano sobre la malla del recinto.',
                'El cuidador entra con la compuerta abierta detrás de él.'] },
    { id: 'tiburones', titulo: 'Manejo de una raya', imagen: 'assets/img/retos/detective-tiburones.webp', zonas: [], activo: false,
      riesgos: ['Se maneja la raya sin guantes y sin cuidar la zona del aguijón.',
                'La cubeta no tiene oxigenación ni suficiente agua.',
                'El personal usa calzado resbaloso sobre piso mojado.'] },
    { id: 'ponzonosa', titulo: 'Laboratorio de fauna ponzoñosa', imagen: 'assets/img/retos/detective-ponzonosa.webp', zonas: [], activo: false,
      riesgos: ['Hay escorpiones en un contenedor sin tapa.',
                'La persona usa sandalias y trabaja con las manos descubiertas.',
                'No hay pinzas largas ni herramientas de contención a la mano.'] }
  ];

  return { quiz: quiz, orden: orden, flashcards: flashcards, historia: historia, detective: detective };
});
