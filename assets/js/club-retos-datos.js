/* ============================================================ */
/* CONTENIDO DE LA ZONA DE RETOS · Club VIP Zoorigen              */
/*                                                                */
/* Aquí vive TODO el contenido de los retos (solo datos, sin      */
/* pantalla):                                                     */
/*   quiz        32 preguntas de 3 opciones                       */
/*   orden       24 secuencias de 4 a 6 pasos                     */
/*   flashcards  55 tarjetas                                      */
/*   historia    6 mundos x 4 casos de 3 opciones                 */
/*   detective   30 escenas (13 originales y 17 adicionales de        */
/*               identificación, legal y bienestar)               */
/*                                                                */
/* Forma de cada escena del detective:                            */
/*   { id, titulo, imagen, zonas: [], activo: true,               */
/*     tipo: 'seguridad' | 'identificacion' | 'bienestar' |       */
/*           'legal',                                             */
/*     consigna: lo que debe marcar el jugador,                   */
/*     escena: descripción de la imagen (también sirve de         */
/*             respaldo si la imagen no existe),                  */
/*     pistas: 6 objetos { t, ok, why }, exactamente 3 con        */
/*             ok:true,                                           */
/*     riesgos: los `why` de las 3 pistas ok:true, en el mismo    */
/*              orden en que aparecen en `pistas` }               */
/* Las imágenes van en assets/img/retos/. Para inspeccionar la imagen,      */
/* `zonas` lleva 3 rectángulos { x, y, w, h } (0 a 1; x/y =       */
/* centro y w/h = ancho/alto de la zona), uno por cada      */
/* texto de `riesgos`, en el mismo orden.                         */
/*                                                                */
/* Las respuestas correctas se revisan en tests/club-retos.test.js */
/* y los reactivos que un especialista debe validar están en      */
/* REVISION-CONTENIDO.md y FUENTES-RETOS-NUEVOS.md (no se        */
/* publican).                                                     */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_RETOS_DATOS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ───────────── Quiz relámpago: 32 preguntas ───────────── */
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
      why: 'El ultrasonido emite ondas de sonido y forma la imagen con los ecos. No usa radiación ionizante como los rayos X.' },
    { id: 'q23', tema: 'Legislación', q: 'En la lista de la NOM-059-SEMARNAT-2010, ¿qué significa la letra P?',
      a: ['Probablemente protegida', 'En peligro de extinción', 'Prioritaria para la conservación'], ok: 1,
      why: 'La norma abrevia sus categorías así: E es probablemente extinta en el medio silvestre, P es en peligro de extinción, A es amenazada y Pr es sujeta a protección especial.' },
    { id: 'q24', tema: 'Legislación', q: 'Según la NOM-059, una especie «amenazada» es la que…',
      a: ['Podría llegar a estar en peligro de desaparecer a corto o mediano plazo si siguen los factores que afectan su viabilidad', 'Ya desapareció de todo el planeta y solo se conoce por fósiles', 'Representa un peligro para las personas que viven cerca de ella'], ok: 0,
      why: 'La categoría «amenazada» (A) se refiere a especies que podrían estar en peligro de desaparecer a corto o mediano plazo si el deterioro de su hábitat o la disminución de sus poblaciones continúa.' },
    { id: 'q25', tema: 'Legislación', q: 'Según la NOM-059-SEMARNAT-2010, una especie endémica es aquella…',
      a: ['Que fue introducida desde otro país', 'Que vive en cualquier país de América', 'Cuyo ámbito de distribución natural está circunscrito únicamente al territorio nacional'], ok: 2,
      why: 'La norma define a la especie endémica como la que solo se distribuye de forma natural dentro del territorio de México y de las zonas donde la Nación ejerce su soberanía y jurisdicción.' },
    { id: 'q26', tema: 'Legislación', q: '¿Qué es la CONABIO?',
      a: ['Una empresa privada que vende productos de origen silvestre', 'Una comisión del gobierno federal que promueve y coordina el conocimiento de la biodiversidad de México', 'Un zoológico administrado por el gobierno'], ok: 1,
      why: 'La Comisión Nacional para el Conocimiento y Uso de la Biodiversidad es una comisión intersecretarial permanente, creada en 1992. Opera el Sistema Nacional de Información sobre la Biodiversidad y pone esa información a disposición de la sociedad.' },
    { id: 'q27', tema: 'Legislación', q: 'En la Ley General de Vida Silvestre, ¿qué se entiende por «vida silvestre»?',
      a: ['Los organismos que subsisten sujetos a la evolución natural y se desarrollan libremente en su hábitat, incluidos los individuos bajo control del hombre y los ferales', 'Solo los animales que viven en libertad dentro de un área natural protegida', 'Únicamente las especies que ya están catalogadas como en peligro de extinción'], ok: 0,
      why: 'La definición de la ley es amplia: incluye a los organismos en vida libre y también a sus poblaciones menores e individuos que están bajo el control del hombre, así como a los ferales.' },
    { id: 'q28', tema: 'Legislación', q: '¿Cómo define la Ley General de Vida Silvestre el «hábitat»?',
      a: ['Cualquier terreno extenso que tenga árboles y agua', 'El lugar construido donde una persona cría a un animal', 'El sitio específico en un medio ambiente físico, ocupado por un organismo, una población, una especie o comunidades de especies en un tiempo determinado'], ok: 2,
      why: 'El hábitat es el sitio concreto que ocupa un organismo, una población, una especie o una comunidad de especies en un tiempo determinado.' },
    { id: 'q29', tema: 'Legislación', q: 'Según la Ley General de Vida Silvestre, ¿qué ocurre con las tortugas marinas, de cualquier especie?',
      a: ['Se pueden aprovechar libremente si es para consumo de la propia familia', 'Ningún ejemplar puede ser sujeto de aprovechamiento extractivo, de subsistencia ni comercial, incluidas sus partes y derivados', 'Solo se pueden aprovechar las crías y los huevos, no los adultos'], ok: 1,
      why: 'El artículo 60 Bis 1 establece que ningún ejemplar de tortuga marina puede ser sujeto de aprovechamiento extractivo, ni de subsistencia ni comercial, y esto incluye sus partes y derivados.' },
    { id: 'q30', tema: 'Legislación', q: '¿Qué dice la Ley General de Vida Silvestre sobre las especies exóticas invasoras?',
      a: ['No se permite su liberación ni su introducción a los hábitats y ecosistemas naturales', 'Se pueden soltar en cualquier área natural si son bonitas', 'Solo está prohibido soltarlas en las ciudades'], ok: 0,
      why: 'Una especie exótica invasora no es nativa y, al establecerse, amenaza la diversidad biológica nativa, la economía o la salud pública. Por eso su liberación en ecosistemas naturales no está permitida.' },
    { id: 'q31', tema: 'Legislación', q: 'Según la Ley General de Vida Silvestre, ¿cómo se demuestra la legal procedencia de un ejemplar que está fuera de su hábitat natural?',
      a: ['Con la palabra de quien lo vende, si parece confiable', 'Con una fotografía del animal tomada en el lugar de venta', 'Con la marca que muestre su aprovechamiento sustentable y la tasa autorizada, o con la nota de remisión o factura correspondiente'], ok: 2,
      why: 'El artículo 51 de la ley indica que la legal procedencia se demuestra, conforme al reglamento, con la marca o con la nota de remisión o factura. Por eso un animal sin documentos es una señal de alerta.' },
    { id: 'q32', tema: 'Legislación', q: 'Según la Ley General de Vida Silvestre, en el traslado, la exhibición y la comercialización de fauna silvestre se debe evitar o disminuir…',
      a: ['El contacto con otras especies', 'La tensión, el sufrimiento, el traumatismo y el dolor de los animales', 'La luz natural'], ok: 1,
      why: 'El capítulo de trato digno y respetuoso exige evitar o disminuir la tensión, el sufrimiento, el traumatismo y el dolor de la fauna silvestre en todas estas actividades, y prohíbe todo acto de crueldad.' }
  ];

  /* ───────────── Ordena el procedimiento: 24 secuencias ───────────── */
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
      pasos: ['Observar y fotografiar desde lejos', 'Anotar fecha, hora y lugar', 'Describir tamaño y color', 'Comparar con una guía de campo', 'Confirmar con un especialista'] },
    { id: 'o19', tema: 'Mariposarios', titulo: 'Metamorfosis de la mariposa monarca',
      pasos: ['La hembra deposita los huevecillos en el envés de hojas de Asclepias', 'De los huevecillos nacen las orugas, que se alimentan de esas hojas y mudan de piel', 'La oruga deja de comer y busca un lugar donde colgarse', 'La oruga cambia de piel por última vez y forma la crisálida', 'Dentro de la crisálida se completa la transformación y la cubierta se rompe', 'La mariposa extiende y seca sus alas antes de volar'] },
    { id: 'o20', tema: 'Tortugas marinas', titulo: 'Anidación de la tortuga verde',
      pasos: ['La hembra se aparea cerca de la costa', 'Sube a la playa, sobre la línea de marea alta', 'Cava con las aletas traseras un hoyo en forma de cántaro', 'Deposita los huevos en el hoyo', 'Cubre el nido con arena y regresa al mar', 'Tras la incubación, las crías rompen el cascarón y se orientan hacia el mar'] },
    { id: 'o21', tema: 'Fototrampeo', titulo: 'Un muestreo con cámara trampa, de principio a fin',
      pasos: ['Preparar y programar la cámara antes de salir a campo, empezando por la fecha y la hora', 'Colocarla en campo, a poca altura del suelo y con el frente despejado', 'Comprobar que la configuración sea la correcta', 'Dejarla funcionando durante el periodo de muestreo', 'Recogerla y apagarla', 'Sacar la tarjeta de memoria y subir las imágenes para identificarlas'] },
    { id: 'o22', tema: 'Monitoreo', titulo: 'Sacar el molde de yeso de una huella',
      pasos: ['Elegir la huella que se va a colectar', 'Hacer una marca alrededor de la huella', 'Mezclar el yeso con agua, poco a poco, hasta lograr la consistencia deseada', 'Verter la mezcla sobre la huella sin rebasar la marca', 'Esperar a que el molde esté duro, tibio y no se manche al tallarlo con un dedo', 'Levantar el molde y lavarlo con agua y un cepillo suave'] },
    { id: 'o23', tema: 'Tortugas marinas', titulo: 'Observación guiada de una tortuga que anida',
      pasos: ['El guía da una plática con las reglas de comportamiento antes del recorrido', 'El grupo recorre la playa a pie, en fila, en silencio y sin flash ni luces', 'Los visitantes esperan a 10 metros como mínimo hasta que la tortuga inicia el desove', 'El guía indica cuándo acercarse, y se hace por la parte posterior de la tortuga', 'Cuando la tortuga termina de tapar el nido, el grupo se aleja a 10 metros como mínimo', 'Si salen las crías, el grupo se queda a 2 metros por detrás sin pisarlas ni cerrarles el paso al mar'] },
    { id: 'o24', tema: 'Monitoreo', titulo: 'Registrar e identificar una huella en campo',
      pasos: ['Buscar la huella más nítida', 'Fotografiarla con una referencia de tamaño, como un bolígrafo o una escala', 'Hacer una lista de los mamíferos que podrían estar en la localidad', 'Revisar si es de una sola extremidad o si hay huellas encimadas', 'Observar tamaño, forma, número de dedos y si hay marcas de garras'] }
  ];

  /* ───────────── Flashcards: 55 tarjetas ───────────── */
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
    { id: 'f40', front: 'Trampa Sherman', back: 'Trampa de aluminio, plegable, con la que se capturan vivos a roedores pequeños para estudiarlos y liberarlos.' },
    { id: 'f41', front: 'Probablemente extinta en el medio silvestre (E)', back: 'Categoría de la NOM-059 para una especie nativa de México cuyos ejemplares en vida libre dentro del territorio nacional han desaparecido, pero de la cual se conocen ejemplares vivos en confinamiento o fuera de México.' },
    { id: 'f42', front: 'En peligro de extinción (P)', back: 'Categoría de la NOM-059 para especies cuyas áreas de distribución o tamaño de población en el territorio nacional han disminuido drásticamente, poniendo en riesgo su viabilidad biológica en todo su hábitat natural.' },
    { id: 'f43', front: 'Amenazada (A)', back: 'Categoría de la NOM-059 para especies que podrían llegar a estar en peligro de desaparecer a corto o mediano plazo si siguen operando los factores que afectan su viabilidad.' },
    { id: 'f44', front: 'Sujeta a protección especial (Pr)', back: 'Categoría de la NOM-059 para especies que podrían llegar a estar amenazadas por factores que afectan su viabilidad, por lo que se busca propiciar su recuperación y conservación.' },
    { id: 'f45', front: 'Vida silvestre', back: 'Organismos que subsisten sujetos a los procesos de evolución natural y que se desarrollan libremente en su hábitat, incluidos los individuos bajo el control del hombre y los ferales.' },
    { id: 'f46', front: 'Hábitat', back: 'El sitio específico en un medio ambiente físico, ocupado por un organismo, una población, una especie o comunidades de especies en un tiempo determinado.' },
    { id: 'f47', front: 'Población', back: 'Conjunto de individuos de una especie silvestre que comparten el mismo hábitat. Es la unidad básica de manejo de las especies silvestres en vida libre.' },
    { id: 'f48', front: 'Manejo en vida libre', back: 'El que se hace con ejemplares o poblaciones de especies que se desarrollan en condiciones naturales, sin imponer restricciones a sus movimientos.' },
    { id: 'f49', front: 'Manejo intensivo', back: 'El que se realiza sobre ejemplares o poblaciones de especies silvestres en condiciones de cautiverio o confinamiento.' },
    { id: 'f50', front: 'Captura', back: 'La extracción de ejemplares vivos de fauna silvestre del hábitat en que se encuentran.' },
    { id: 'f51', front: 'Aprovechamiento no extractivo', back: 'Actividades relacionadas con la vida silvestre en su hábitat natural que no implican retirar ejemplares, partes o derivados, pero que, si no se regulan, podrían causar impactos significativos. Requieren autorización previa de la Secretaría.' },
    { id: 'f52', front: 'Reintroducción', back: 'Liberación planificada al hábitat natural de ejemplares de la misma subespecie (o especie) silvestre, con el objeto de restituir una población desaparecida.' },
    { id: 'f53', front: 'Repoblación', back: 'Liberación planificada al hábitat natural de ejemplares de la misma subespecie (o especie) silvestre, con el objeto de reforzar una población disminuida.' },
    { id: 'f54', front: 'Trato digno y respetuoso', back: 'Medidas que establecen la ley, su reglamento, los tratados y las normas para evitar dolor, deterioro físico o sufrimiento a la fauna durante su posesión, crianza, captura, traslado, exhibición, cuarentena, comercialización, aprovechamiento, adiestramiento o sacrificio.' },
    { id: 'f55', front: 'Servicios ambientales', back: 'Beneficios de interés social que se derivan de la vida silvestre y su hábitat, como la regulación climática, la polinización de plantas, el control biológico de plagas o la formación de suelo.' }
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

  /* ───────────── Detective de campo: 30 escenas ───────────── */
  // Cada escena trae su consigna, la descripción de la imagen (`escena`, respaldo si la imagen
  // no existe) y 6 pistas: 3 con ok:true (los hallazgos) y 3 con ok:false (cosas que se ven en la
  // escena pero están bien hechas, o afirmaciones que no se sostienen).
  // riesgos[i] es el `why` de la i-ésima pista ok:true, en el mismo orden en que aparecen en `pistas`.
  // Las 21 primeras conservan su posición; las 9 nuevas se agregan al final.
  const detective = [
    { id: 'serpiente-rescate', titulo: 'Rescate de una serpiente', imagen: 'assets/img/retos/detective-serpiente-rescate.webp', zonas: [{"x": 0.525, "y": 0.4, "w": 0.09, "h": 0.46}, {"x": 0.355, "y": 0.19, "w": 0.15, "h": 0.22}, {"x": 0.82, "y": 0.81, "w": 0.34, "h": 0.26}], activo: true,
      tipo: 'seguridad',
      consigna: 'Observa la escena y marca los 3 errores de seguridad que encuentres.',
      escena: 'En la sala de un centro de rescate, una persona sostiene con la mano por la cola a una serpiente delgada de colores discretos, sin gancho herpetológico, sin guantes y sin lentes de protección. En el suelo hay una bolsa de transporte abierta de la que asoma otro reptil. Sobre la mesa de al lado hay un contenedor rígido con tapa, cerrado, y una libreta de registro.',
      pistas: [
        { t: 'Sostiene a la serpiente por la cola, sin gancho herpetológico', ok: true, why: 'Sostiene a la serpiente por la cola y sin gancho herpetológico: puede morder y se lastima al animal.' },
        { t: 'Hay un contenedor rígido con tapa, cerrado, sobre la mesa', ok: false, why: 'Es correcto: la serpiente se deposita en un contenedor seguro y con tapa. No es un error.' },
        { t: 'La serpiente es delgada y de colores discretos', ok: false, why: 'El aspecto no basta para saber si es venenosa. Si no se conoce la especie, se supone que puede ser peligrosa y no se maneja con las manos.' },
        { t: 'La persona no usa guantes ni lentes de protección', ok: true, why: 'No usa guantes ni protección en los ojos.' },
        { t: 'Una bolsa de transporte abierta en el suelo deja asomar otro reptil', ok: true, why: 'Hay una bolsa de transporte abierta en el suelo con otro reptil asomando: puede escapar.' },
        { t: 'Hay una libreta de registro sobre la mesa', ok: false, why: 'Es una buena práctica: el rescate se registra. No es un error.' }
      ],
      riesgos: ['Sostiene a la serpiente por la cola y sin gancho herpetológico: puede morder y se lastima al animal.',
                'No usa guantes ni protección en los ojos.',
                'Hay una bolsa de transporte abierta en el suelo con otro reptil asomando: puede escapar.'] },
    { id: 'cuarentena', titulo: 'Área de cuarentena', imagen: 'assets/img/retos/detective-cuarentena.webp', zonas: [{"x": 0.27, "y": 0.33, "w": 0.5, "h": 0.48}, {"x": 0.72, "y": 0.315, "w": 0.24, "h": 0.31}, {"x": 0.175, "y": 0.84, "w": 0.29, "h": 0.22}], activo: true,
      tipo: 'seguridad',
      consigna: 'Observa la escena y marca los 3 errores de bioseguridad que encuentres.',
      escena: 'En un área de cuarentena de fauna recién llegada hay jaulas de especies distintas pegadas una a otra, sin separación. Una persona sin cubrebocas ni guantes maneja a un animal pequeño sobre una mesa, y junto a las jaulas hay comida tirada en el piso. Al fondo se ve un lavamanos, el piso es liso y cada jaula tiene una tarjeta de identificación colgada.',
      pistas: [
        { t: 'Cada jaula tiene una tarjeta de identificación colgada', ok: false, why: 'Identificar a cada animal es una buena práctica de registro. No es un error.' },
        { t: 'Jaulas de especies distintas pegadas, sin separación', ok: true, why: 'Hay jaulas de especies distintas pegadas, sin separación: se pueden contagiar entre sí.' },
        { t: 'Hay un lavamanos al fondo del área', ok: false, why: 'Es correcto contar con un lugar para lavarse las manos: es parte de la bioseguridad.' },
        { t: 'Una persona maneja a un animal sin cubrebocas ni guantes', ok: true, why: 'La persona maneja un animal sin cubrebocas ni guantes.' },
        { t: 'El piso es liso y fácil de lavar', ok: false, why: 'Un piso liso se limpia y se desinfecta mejor. No es un error.' },
        { t: 'Hay comida sobre el piso, junto a las jaulas', ok: true, why: 'Hay comida sobre el piso, junto a las jaulas: atrae plagas y contamina.' }
      ],
      riesgos: ['Hay jaulas de especies distintas pegadas, sin separación: se pueden contagiar entre sí.',
                'La persona maneja un animal sin cubrebocas ni guantes.',
                'Hay comida sobre el piso, junto a las jaulas: atrae plagas y contamina.'] },
    { id: 'ave-rapaz', titulo: 'Revisión de un halcón', imagen: 'assets/img/retos/detective-ave-rapaz.webp', zonas: [{"x": 0.465, "y": 0.455, "w": 0.05, "h": 0.07}, {"x": 0.515, "y": 0.49, "w": 0.05, "h": 0.08}, {"x": 0.835, "y": 0.235, "w": 0.31, "h": 0.39}], activo: true,
      tipo: 'seguridad',
      consigna: 'Observa la escena y marca los 3 errores de seguridad que encuentres.',
      escena: 'En un cuarto de un centro de rescate, una persona revisa a un halcón sin guante de cuero grueso y sin sujetar sus garras, que cuelgan libres. La ventana del cuarto está abierta y sin cubrir. El ave tiene la cabeza cubierta con un capirote, sobre la mesa hay una báscula y una segunda persona espera en silencio junto a la pared.',
      pistas: [
        { t: 'La persona sostiene al halcón sin guante de cuero grueso', ok: true, why: 'No usa guante de cuero grueso: las garras pueden lesionar la mano.' },
        { t: 'El halcón tiene la cabeza cubierta con un capirote', ok: false, why: 'El capirote cubre los ojos del ave y ayuda a mantenerla tranquila. Es correcto.' },
        { t: 'Las garras del halcón cuelgan libres, sin sujetar', ok: true, why: 'Las garras están sueltas, sin sujetar.' },
        { t: 'Hay una báscula sobre la mesa', ok: false, why: 'Pesar al ave es parte de la revisión. No es un error.' },
        { t: 'Una segunda persona espera en silencio junto a la pared', ok: false, why: 'Poco ruido y poca gente cerca ayudan a que el ave esté tranquila. No es un error.' },
        { t: 'La ventana del cuarto está abierta y sin cubrir', ok: true, why: 'La ventana del cuarto está abierta y sin cubrir: el ave podría escapar.' }
      ],
      riesgos: ['No usa guante de cuero grueso: las garras pueden lesionar la mano.',
                'Las garras están sueltas, sin sujetar.',
                'La ventana del cuarto está abierta y sin cubrir: el ave podría escapar.'] },
    { id: 'transporte', titulo: 'Transporte de animales', imagen: 'assets/img/retos/detective-transporte.webp', zonas: [{"x": 0.46, "y": 0.38, "w": 0.26, "h": 0.3}, {"x": 0.175, "y": 0.455, "w": 0.29, "h": 0.57}, {"x": 0.815, "y": 0.62, "w": 0.17, "h": 0.32}], activo: true,
      tipo: 'seguridad',
      consigna: 'Observa la escena y marca los 3 errores en el transporte de los animales.',
      escena: 'En la caja descubierta de una camioneta estacionada en terreno plano y bajo el sol directo hay varias cajas de transporte apiladas. Una de ellas no tiene orificios de ventilación y ninguna lleva etiqueta ni documentos pegados. Otra caja, a un lado, es rígida, tiene orificios y una puerta con seguro.',
      pistas: [
        { t: 'Una caja tiene orificios de ventilación y puerta con seguro', ok: false, why: 'Es correcto: una caja ventilada, resistente y con seguro es lo adecuado. No es un error.' },
        { t: 'Una de las cajas no tiene orificios de ventilación', ok: true, why: 'Una caja no tiene orificios de ventilación: el animal podría asfixiarse.' },
        { t: 'Las cajas están apiladas bajo el sol directo', ok: true, why: 'Las cajas están apiladas al sol directo: riesgo de golpe de calor.' },
        { t: 'Las cajas son de material rígido y resistente', ok: false, why: 'Una caja rígida y resistente es lo adecuado para trasladar animales. No es un error.' },
        { t: 'La camioneta está estacionada en un terreno plano', ok: false, why: 'Es un dato del entorno; por sí solo no representa un riesgo para los animales.' },
        { t: 'Ninguna caja tiene etiqueta ni documentos', ok: true, why: 'Las cajas no tienen etiqueta ni documentos: no se sabe qué animal lleva cada una.' }
      ],
      riesgos: ['Una caja no tiene orificios de ventilación: el animal podría asfixiarse.',
                'Las cajas están apiladas al sol directo: riesgo de golpe de calor.',
                'Las cajas no tienen etiqueta ni documentos: no se sabe qué animal lleva cada una.'] },
    { id: 'anestesia', titulo: 'Mamífero sedado', imagen: 'assets/img/retos/detective-anestesia.webp', zonas: [{"x": 0.105, "y": 0.565, "w": 0.19, "h": 0.41}, {"x": 0.48, "y": 0.355, "w": 0.2, "h": 0.11}, {"x": 0.82, "y": 0.75, "w": 0.3, "h": 0.28}], activo: true,
      tipo: 'seguridad',
      consigna: 'Observa la escena y marca los 3 errores de seguridad que encuentres.',
      escena: 'Sobre una mesa de procedimiento de acero inoxidable, bajo una lámpara, hay un mamífero sedado, y junto a él no se ve ningún monitor de signos vitales. El médico trabaja sin guantes ni bata. En una charola cercana hay frascos de medicamento sin etiqueta, y una segunda persona vigila de pie junto a la mesa.',
      pistas: [
        { t: 'No hay monitor de signos vitales junto al animal', ok: true, why: 'No hay monitor de signos vitales para vigilar al animal sedado.' },
        { t: 'Una segunda persona vigila de pie junto a la mesa', ok: false, why: 'Contar con otra persona de apoyo, bajo la supervisión del médico, es correcto. No es un error.' },
        { t: 'El médico trabaja sin guantes ni bata', ok: true, why: 'El médico no usa guantes ni bata.' },
        { t: 'La mesa de procedimiento es de acero inoxidable', ok: false, why: 'Es una superficie fácil de limpiar y desinfectar. No es un error.' },
        { t: 'Los frascos de la charola no tienen etiqueta', ok: true, why: 'Los frascos de medicamento de la charola no tienen etiqueta.' },
        { t: 'Hay una lámpara de luz sobre la mesa', ok: false, why: 'Iluminar bien el área de trabajo es correcto. No es un error.' }
      ],
      riesgos: ['No hay monitor de signos vitales para vigilar al animal sedado.',
                'El médico no usa guantes ni bata.',
                'Los frascos de medicamento de la charola no tienen etiqueta.'] },
    { id: 'mariposario', titulo: 'Interior de un mariposario', imagen: 'assets/img/retos/detective-mariposario.webp', zonas: [{"x": 0.375, "y": 0.38, "w": 0.07, "h": 0.1}, {"x": 0.17, "y": 0.83, "w": 0.26, "h": 0.22}, {"x": 0.855, "y": 0.27, "w": 0.27, "h": 0.38}], activo: true,
      tipo: 'seguridad',
      consigna: 'Observa la escena y marca los 3 errores de manejo que encuentres.',
      escena: 'Dentro de un mariposario con plantas de flores y hojas mordidas por orugas, un visitante atrapa con los dedos una mariposa posada en una flor. En el piso hay fruta fermentada derramada con hormigas. Al fondo, la puerta exterior y la interior de la entrada están abiertas al mismo tiempo, y otros visitantes caminan por un sendero marcado.',
      pistas: [
        { t: 'Hay plantas con flores que ofrecen néctar', ok: false, why: 'Las plantas nectaríferas alimentan a las mariposas adultas. Es correcto.' },
        { t: 'Un visitante atrapa una mariposa con los dedos', ok: true, why: 'Un visitante atrapa una mariposa con la mano: se dañan sus alas.' },
        { t: 'Algunas plantas tienen hojas mordidas por orugas', ok: false, why: 'Las orugas se alimentan de plantas hospederas, así que las hojas mordidas son normales en un mariposario. No es un error.' },
        { t: 'Hay fruta fermentada derramada en el piso con hormigas', ok: true, why: 'Hay fruta fermentada derramada con hormigas: atrae plagas.' },
        { t: 'Las dos puertas de la entrada están abiertas a la vez', ok: true, why: 'La puerta exterior y la interior están abiertas a la vez: las mariposas pueden escapar.' },
        { t: 'Los visitantes caminan por un sendero marcado', ok: false, why: 'Un sendero marcado ayuda a cuidar las plantas y a las mariposas. No es un error.' }
      ],
      riesgos: ['Un visitante atrapa una mariposa con la mano: se dañan sus alas.',
                'Hay fruta fermentada derramada con hormigas: atrae plagas.',
                'La puerta exterior y la interior están abiertas a la vez: las mariposas pueden escapar.'] },
    { id: 'fototrampeo', titulo: 'Instalación de una cámara trampa', imagen: 'assets/img/retos/detective-fototrampeo.webp', zonas: [{"x": 0.3, "y": 0.0725, "w": 0.06, "h": 0.075}, {"x": 0.29, "y": 0.1375, "w": 0.08, "h": 0.045}, {"x": 0.355, "y": 0.1275, "w": 0.09, "h": 0.125}], activo: true,
      tipo: 'seguridad',
      consigna: 'Observa la escena y marca los 3 errores en la instalación de la cámara.',
      escena: 'En un bosque, una persona de espaldas, con botas cerradas, instala una cámara trampa en un árbol, muy alta y inclinada hacia el cielo, sin candado ni cable de seguridad. Ramas y hojas cubren el sensor. Frente al árbol pasa un sendero con huellas, y sobre una roca hay una libreta de campo.',
      pistas: [
        { t: 'La cámara está muy alta e inclinada hacia el cielo', ok: true, why: 'La cámara está muy alta e inclinada hacia el cielo: no registrará a los animales del sendero.' },
        { t: 'Frente a la cámara hay un sendero con huellas', ok: false, why: 'Elegir un sitio con rastros de fauna es correcto. No es un error.' },
        { t: 'Una libreta de campo está apoyada sobre una roca', ok: false, why: 'Anotar los datos del sitio es parte del trabajo. No es un error.' },
        { t: 'La cámara no tiene candado ni cable de seguridad', ok: true, why: 'No tiene candado ni cable de seguridad: pueden robarla.' },
        { t: 'La persona usa botas cerradas', ok: false, why: 'Es un calzado adecuado para trabajar en campo. No es un error.' },
        { t: 'Ramas y hojas cubren el sensor', ok: true, why: 'Ramas y hojas tapan el sensor: provocan disparos falsos.' }
      ],
      riesgos: ['La cámara está muy alta e inclinada hacia el cielo: no registrará a los animales del sendero.',
                'No tiene candado ni cable de seguridad: pueden robarla.',
                'Ramas y hojas tapan el sensor: provocan disparos falsos.'] },
    { id: 'obra-rescate', titulo: 'Rescate de fauna en una obra', imagen: 'assets/img/retos/detective-obra-rescate.webp', zonas: [{"x": 0.465, "y": 0.385, "w": 0.15, "h": 0.19}, {"x": 0.21, "y": 0.72, "w": 0.22, "h": 0.28}, {"x": 0.79, "y": 0.33, "w": 0.4, "h": 0.44}], activo: true,
      tipo: 'seguridad',
      consigna: 'Observa la escena y marca los 3 errores de seguridad que encuentres.',
      escena: 'En una obra, una cinta de delimitación rodea un área de excavación y el personal usa casco y chaleco reflejante. Un trabajador toca con las manos desnudas a un mamífero pequeño; no hay área de contención ni cajas de transporte a la vista. Una excavadora trabaja a pocos metros, y una persona anota en una libreta desde un costado.',
      pistas: [
        { t: 'Una cinta delimita el área de la excavación', ok: false, why: 'Delimitar el área de trabajo es el primer paso de un rescate. No es un error.' },
        { t: 'El personal usa casco y chaleco reflejante', ok: false, why: 'Es el equipo de protección adecuado para una obra. No es un error.' },
        { t: 'Un trabajador toca a un mamífero con las manos desnudas', ok: true, why: 'Un trabajador toca un mamífero sin guantes.' },
        { t: 'No hay área de contención ni cajas de transporte', ok: true, why: 'No hay área de contención ni cajas de transporte.' },
        { t: 'Una persona anota en una libreta desde un costado', ok: false, why: 'Registrar el rescate es una buena práctica. No es un error.' },
        { t: 'Una excavadora trabaja junto a la zona de rescate', ok: true, why: 'La maquinaria funciona junto a la zona de rescate.' }
      ],
      riesgos: ['Un trabajador toca un mamífero sin guantes.',
                'No hay área de contención ni cajas de transporte.',
                'La maquinaria funciona junto a la zona de rescate.'] },
    { id: 'zoonosis', titulo: 'Toma de muestras en campo', imagen: 'assets/img/retos/detective-zoonosis.webp', zonas: [{"x": 0.495, "y": 0.38, "w": 0.17, "h": 0.18}, {"x": 0.8, "y": 0.55, "w": 0.24, "h": 0.18}, {"x": 0.875, "y": 0.75, "w": 0.23, "h": 0.28}], activo: true,
      tipo: 'seguridad',
      consigna: 'Observa la escena y marca los 3 errores de bioseguridad que encuentres.',
      escena: 'Bajo un toldo, en una mesa de trabajo de campo, una persona maneja un roedor sin guantes ni mascarilla. Los tubos de las muestras no están rotulados y, sobre la misma mesa, hay un sándwich y una bebida. Junto a la mesa hay una trampa Sherman cerrada y un garrafón de agua con jabón para lavarse las manos.',
      pistas: [
        { t: 'Hay una trampa Sherman cerrada junto a la mesa', ok: false, why: 'La trampa Sherman captura vivos a roedores pequeños; tenerla cerrada y aparte es correcto. No es un error.' },
        { t: 'La persona maneja un roedor sin guantes ni mascarilla', ok: true, why: 'No se usan guantes ni mascarilla al manejar roedores o murciélagos.' },
        { t: 'Hay agua y jabón para lavarse las manos', ok: false, why: 'Es correcto: el lavado de manos es parte de la bioseguridad. No es un error.' },
        { t: 'La mesa de trabajo está instalada bajo un toldo', ok: false, why: 'Trabajar a la sombra es razonable. No es un error.' },
        { t: 'Los tubos de las muestras no están rotulados', ok: true, why: 'Los tubos de las muestras no están rotulados.' },
        { t: 'Hay un sándwich y una bebida sobre la mesa de trabajo', ok: true, why: 'Hay comida y bebida sobre la mesa de trabajo.' }
      ],
      riesgos: ['No se usan guantes ni mascarilla al manejar roedores o murciélagos.',
                'Los tubos de las muestras no están rotulados.',
                'Hay comida y bebida sobre la mesa de trabajo.'] },
    { id: 'entomologia', titulo: 'Recolección de insectos', imagen: 'assets/img/retos/detective-entomologia.webp', zonas: [{"x": 0.5, "y": 0.595, "w": 0.38, "h": 0.19}, {"x": 0.355, "y": 0.695, "w": 0.19, "h": 0.15}, {"x": 0.89, "y": 0.235, "w": 0.2, "h": 0.41}], activo: true,
      tipo: 'seguridad',
      consigna: 'Observa la escena y marca los 3 errores en la recolección de muestras.',
      escena: 'En un sitio de estudio, una persona recolecta insectos con las manos descubiertas, sin guantes ni pinzas, y los guarda en frascos con tapa que no tienen etiqueta. Otra persona come un sándwich junto al área de trabajo. Cerca hay un termómetro para registrar la temperatura ambiente y una cámara fotográfica sobre un trípode.',
      pistas: [
        { t: 'Un termómetro registra la temperatura ambiente', ok: false, why: 'Anotar la temperatura es parte del registro del sitio. No es un error.' },
        { t: 'Los frascos no tienen etiqueta', ok: true, why: 'Los frascos no tienen etiqueta.' },
        { t: 'Se recolecta con las manos, sin guantes ni pinzas', ok: true, why: 'Se recolecta con las manos, sin guantes ni pinzas.' },
        { t: 'Una cámara fotográfica documenta el sitio', ok: false, why: 'Fotografiar y documentar el sitio es lo correcto. No es un error.' },
        { t: 'Una persona come en el área de trabajo', ok: true, why: 'Una persona está comiendo en el área de trabajo.' },
        { t: 'Los frascos tienen tapa de rosca bien cerrada', ok: false, why: 'Cerrar los frascos protege las muestras. El problema es que no están rotulados.' }
      ],
      riesgos: ['Los frascos no tienen etiqueta.',
                'Se recolecta con las manos, sin guantes ni pinzas.',
                'Una persona está comiendo en el área de trabajo.'] },
    { id: 'uma-felino', titulo: 'Recinto de un felino', imagen: 'assets/img/retos/detective-uma-felino.webp', zonas: [{"x": 0.17, "y": 0.445, "w": 0.14, "h": 0.49}, {"x": 0.87, "y": 0.465, "w": 0.06, "h": 0.15}, {"x": 0.305, "y": 0.54, "w": 0.13, "h": 0.5}], activo: true,
      tipo: 'seguridad',
      consigna: 'Observa la escena y marca los 3 errores de seguridad que encuentres.',
      escena: 'Un cuidador entra al recinto de un felino en una UMA, con la compuerta abierta detrás de él; el recinto tiene una sola puerta y no hay doble puerta de seguridad. Un visitante apoya la mano sobre la malla alta y resistente. El felino descansa tranquilo al fondo, sobre una plataforma de troncos, junto a un bebedero con agua.',
      pistas: [
        { t: 'El felino descansa sobre una plataforma de troncos', ok: false, why: 'Las plataformas y los troncos permiten conducta natural: es enriquecimiento ambiental. No es un error.' },
        { t: 'El recinto tiene un bebedero con agua', ok: false, why: 'Contar con agua disponible es correcto. No es un error.' },
        { t: 'El recinto no tiene doble puerta de seguridad', ok: true, why: 'El recinto no tiene doble puerta de seguridad.' },
        { t: 'La malla del recinto es alta y resistente', ok: false, why: 'Una malla alta y resistente es lo adecuado. El problema es que alguien se acerque a tocarla.' },
        { t: 'Un visitante tiene la mano sobre la malla', ok: true, why: 'Un visitante tiene la mano sobre la malla del recinto.' },
        { t: 'El cuidador entra con la compuerta abierta detrás de él', ok: true, why: 'El cuidador entra con la compuerta abierta detrás de él.' }
      ],
      riesgos: ['El recinto no tiene doble puerta de seguridad.',
                'Un visitante tiene la mano sobre la malla del recinto.',
                'El cuidador entra con la compuerta abierta detrás de él.'] },
    { id: 'tiburones', titulo: 'Manejo de una raya', imagen: 'assets/img/retos/detective-tiburones.webp', zonas: [{"x": 0.53, "y": 0.48, "w": 0.26, "h": 0.44}, {"x": 0.13, "y": 0.6, "w": 0.24, "h": 0.36}, {"x": 0.9, "y": 0.565, "w": 0.18, "h": 0.17}], activo: true,
      tipo: 'seguridad',
      consigna: 'Observa la escena y marca los 3 errores de seguridad que encuentres.',
      escena: 'En el área de manejo de un acuario, una persona sostiene a una raya sin guantes y sin cuidar la zona del aguijón de la cola. La raya está en una cubeta con poca agua y sin oxigenación, y el personal calza zapatos resbalosos sobre el piso mojado. Al fondo se ve un tanque grande con otras rayas nadando, el piso tiene un drenaje y una persona usa un delantal impermeable.',
      pistas: [
        { t: 'La raya se sostiene sin guantes y sin cuidar el aguijón', ok: true, why: 'Se maneja la raya sin guantes y sin cuidar la zona del aguijón.' },
        { t: 'La cubeta tiene poca agua y no tiene oxigenación', ok: true, why: 'La cubeta no tiene oxigenación ni suficiente agua.' },
        { t: 'Al fondo hay un tanque grande con otras rayas nadando', ok: false, why: 'Es parte de las instalaciones del acuario. No es un error.' },
        { t: 'El personal usa calzado resbaloso sobre el piso mojado', ok: true, why: 'El personal usa calzado resbaloso sobre piso mojado.' },
        { t: 'El piso tiene un drenaje', ok: false, why: 'El drenaje ayuda a evacuar el agua. No es un error.' },
        { t: 'Una persona usa un delantal impermeable', ok: false, why: 'Es una prenda adecuada para trabajar con agua. No es un error.' }
      ],
      riesgos: ['Se maneja la raya sin guantes y sin cuidar la zona del aguijón.',
                'La cubeta no tiene oxigenación ni suficiente agua.',
                'El personal usa calzado resbaloso sobre piso mojado.'] },
    { id: 'ponzonosa', titulo: 'Laboratorio de fauna ponzoñosa', imagen: 'assets/img/retos/detective-ponzonosa.webp', zonas: [{"x": 0.54, "y": 0.47, "w": 0.28, "h": 0.22}, {"x": 0.3, "y": 0.895, "w": 0.12, "h": 0.15}, {"x": 0.825, "y": 0.595, "w": 0.31, "h": 0.25}], activo: true,
      tipo: 'seguridad',
      consigna: 'Observa la escena y marca los 3 errores de seguridad que encuentres.',
      escena: 'En un laboratorio de fauna ponzoñosa hay un contenedor con escorpiones sin tapa sobre la mesa de trabajo, que está limpia y despejada. La persona que trabaja usa sandalias y tiene las manos descubiertas, y no hay pinzas largas ni herramientas de contención a la mano. En una repisa hay otros contenedores cerrados y un botiquín en la pared.',
      pistas: [
        { t: 'Hay escorpiones en un contenedor sin tapa', ok: true, why: 'Hay escorpiones en un contenedor sin tapa.' },
        { t: 'Otros contenedores de la repisa están cerrados', ok: false, why: 'Los contenedores con animales ponzoñosos siempre van cerrados. Es correcto.' },
        { t: 'Hay un botiquín en la pared', ok: false, why: 'Contar con un botiquín es correcto. No es un error.' },
        { t: 'La persona usa sandalias y tiene las manos descubiertas', ok: true, why: 'La persona usa sandalias y trabaja con las manos descubiertas.' },
        { t: 'La mesa de trabajo está limpia y despejada', ok: false, why: 'Una mesa ordenada ayuda a trabajar con seguridad. No es un error.' },
        { t: 'No hay pinzas largas ni herramientas de contención a la mano', ok: true, why: 'No hay pinzas largas ni herramientas de contención a la mano.' }
      ],
      riesgos: ['Hay escorpiones en un contenedor sin tapa.',
                'La persona usa sandalias y trabaja con las manos descubiertas.',
                'No hay pinzas largas ni herramientas de contención a la mano.'] },

    /* ── 8 escenas nuevas ── */
    { id: 'huellas-felino', titulo: 'Huellas en un sendero', imagen: 'assets/img/retos/detective-huellas-felino-1.webp', zonas: [{"x": 0.185, "y": 0.405, "w": 0.17, "h": 0.19}, {"x": 0.415, "y": 0.575, "w": 0.13, "h": 0.11}, {"x": 0.855, "y": 0.635, "w": 0.19, "h": 0.29}], activo: true,
      tipo: 'identificacion',
      consigna: 'Observa el sendero y marca los 3 rasgos que indican que las huellas son de un felino y no de un perro o un zorro.',
      escena: 'En un sendero de tierra húmeda se ven varias huellas de un animal que caminó en línea, junto a un excremento. Las huellas son casi circulares, con cuatro dedos y una almohadilla principal de tres lóbulos en su borde posterior; no se distingue ninguna marca de uñas. Junto a una de las huellas hay una moneda como referencia de tamaño.',
      pistas: [
        { t: 'Hay un excremento junto a las huellas', ok: false, why: 'El excremento es un rastro útil, pero por sí solo no basta para decir de qué especie es. Se fotografía con una referencia de tamaño y se registra junto con las huellas.' },
        { t: 'Las huellas no muestran marcas de uñas', ok: true, why: 'Los felinos tienen uñas retráctiles, por eso sus huellas suelen no mostrar marcas de uñas; en cambio, las uñas de los perros y los zorros se marcan bien. No es una regla absoluta, porque el tipo de suelo influye, así que se usa junto con otros rasgos.' },
        { t: 'Cada huella tiene cuatro dedos marcados', ok: false, why: 'Tanto los félidos como los cánidos dejan cuatro almohadillas digitales en cada huella, así que contar los dedos no sirve para distinguirlos.' },
        { t: 'La almohadilla principal tiene tres lóbulos en el borde posterior', ok: true, why: 'La almohadilla principal de los félidos es trilobulada en su parte posterior, con los lóbulos alineados. Es uno de los rasgos que usan las claves de identificación de huellas.' },
        { t: 'El contorno de las huellas es casi circular', ok: true, why: 'La huella del gato montés es casi circular, mientras que la del zorro es más larga y ovalada. La forma cambia con la especie (la del puma, por ejemplo, es más larga que ancha), así que se combina con los demás rasgos.' },
        { t: 'Hay una moneda junto a una de las huellas', ok: false, why: 'Incluir una referencia de tamaño al fotografiar un rastro es una buena práctica, pero no dice de qué animal es la huella.' }
      ],
      riesgos: ['Los felinos tienen uñas retráctiles, por eso sus huellas suelen no mostrar marcas de uñas; en cambio, las uñas de los perros y los zorros se marcan bien. No es una regla absoluta, porque el tipo de suelo influye, así que se usa junto con otros rasgos.',
                'La almohadilla principal de los félidos es trilobulada en su parte posterior, con los lóbulos alineados. Es uno de los rasgos que usan las claves de identificación de huellas.',
                'La huella del gato montés es casi circular, mientras que la del zorro es más larga y ovalada. La forma cambia con la especie (la del puma, por ejemplo, es más larga que ancha), así que se combina con los demás rasgos.'] },
    { id: 'tianguis-fauna', titulo: 'Un puesto en el tianguis', imagen: 'assets/img/retos/detective-tianguis-fauna-1.webp', zonas: [{"x": 0.155, "y": 0.415, "w": 0.29, "h": 0.31}, {"x": 0.485, "y": 0.415, "w": 0.39, "h": 0.29}, {"x": 0.84, "y": 0.38, "w": 0.3, "h": 0.5}], activo: true,
      tipo: 'legal',
      consigna: 'Observa el puesto y marca las 3 señales de alerta de posible comercio ilegal o de mal manejo de fauna.',
      escena: 'En un tianguis al aire libre, un puesto exhibe en primer plano una jaula pequeña con loros verdes, sin anillo ni papeles a la vista, y una mesa con caparazones grandes y piezas hechas con partes de tortuga marina. A un lado, varias jaulas diminutas con aves y reptiles vivos están amontonadas bajo el sol, sin sombra ni agua visible. Más al fondo, otro puesto vende artesanías de barro y textiles bordados, y un vendedor atiende con calma a una persona de espaldas.',
      pistas: [
        { t: 'Loros vivos en una jaula pequeña, sin anillo ni papeles a la vista', ok: true, why: 'Es una señal de alerta: los psitácidos con distribución natural en México, como los loros y las guacamayas, no pueden ser sujeto de aprovechamiento extractivo con fines comerciales, y quien tiene un ejemplar fuera de su hábitat debe poder demostrar su legal procedencia. Una señal de alerta no es una acusación: la confirma la autoridad.' },
        { t: 'Un puesto vecino vende artesanías de barro y textiles bordados', ok: false, why: 'No hay fauna ni partes de fauna: es comercio común y no es una señal de alerta.' },
        { t: 'Caparazones y piezas hechas con partes de tortuga marina', ok: true, why: 'Es una señal de alerta: ningún ejemplar de tortuga marina, de cualquier especie, puede ser sujeto de aprovechamiento extractivo, de subsistencia o comercial, y esto incluye sus partes y derivados.' },
        { t: 'Un vendedor atiende con calma a una persona', ok: false, why: 'Vender y comprar no es una señal de alerta por sí mismo. Lo es la falta de legal procedencia o el mal trato a los animales.' },
        { t: 'Hay animales vivos a la venta, así que el puesto es ilegal', ok: false, why: 'No se sostiene: la venta puede ser legal si cada ejemplar demuestra su legal procedencia con su marca, nota de remisión o factura. Solo la autoridad determina si hay una infracción.' },
        { t: 'Aves y reptiles amontonados en jaulas diminutas, al sol y sin agua visible', ok: true, why: 'Es una señal de alerta de mal manejo: en la comercialización de fauna silvestre se debe evitar o disminuir la tensión, el sufrimiento, el traumatismo y el dolor de los animales, y jaulas diminutas, al sol y sin agua no lo cumplen.' }
      ],
      riesgos: ['Es una señal de alerta: los psitácidos con distribución natural en México, como los loros y las guacamayas, no pueden ser sujeto de aprovechamiento extractivo con fines comerciales, y quien tiene un ejemplar fuera de su hábitat debe poder demostrar su legal procedencia. Una señal de alerta no es una acusación: la confirma la autoridad.',
                'Es una señal de alerta: ningún ejemplar de tortuga marina, de cualquier especie, puede ser sujeto de aprovechamiento extractivo, de subsistencia o comercial, y esto incluye sus partes y derivados.',
                'Es una señal de alerta de mal manejo: en la comercialización de fauna silvestre se debe evitar o disminuir la tensión, el sufrimiento, el traumatismo y el dolor de los animales, y jaulas diminutas, al sol y sin agua no lo cumplen.'] },
    { id: 'uma-irregularidades', titulo: 'Visita a una UMA', imagen: 'assets/img/retos/detective-uma-irregularidades-1.webp', zonas: [{"x": 0.15, "y": 0.655, "w": 0.28, "h": 0.23}, {"x": 0.295, "y": 0.515, "w": 0.17, "h": 0.13}, {"x": 0.675, "y": 0.495, "w": 0.21, "h": 0.17}], activo: true,
      tipo: 'bienestar',
      consigna: 'Observa la UMA y marca las 3 irregularidades de manejo, bienestar o bioseguridad.',
      escena: 'En una UMA que exhibe fauna a los visitantes, el corral de un venado tiene los comederos con restos de comida y heces acumuladas, el bebedero vacío y ninguna sombra. Del otro lado de la reja, un grupo de visitantes toca y alimenta con la mano al venado. En un corral vecino, bien cuidado, hay troncos y plataformas para trepar, y un cuidador con guantes y botas de hule trabaja con calma.',
      pistas: [
        { t: 'Otro corral tiene troncos y plataformas para trepar', ok: false, why: 'Los troncos y las plataformas permiten conducta natural: es enriquecimiento ambiental. No es un error.' },
        { t: 'Restos de comida y heces acumulados en el corral', ok: true, why: 'La limpieza es parte de la bioseguridad: los restos de comida y las heces acumuladas atraen plagas y favorecen enfermedades. Primero se limpia y después se desinfecta.' },
        { t: 'Los animales están en cautiverio, así que la UMA es ilegal', ok: false, why: 'No se sostiene: las UMA son predios e instalaciones registrados que operan con un plan de manejo y pueden tener objetivos como rescate, rehabilitación, exhibición o educación ambiental. Lo que se evalúa es cómo manejan a los animales.' },
        { t: 'El bebedero está vacío y no hay sombra', ok: true, why: 'Un animal en cautiverio debe vivir libre de hambre y sed y libre de molestias físicas y térmicas (las cinco libertades de la OMSA). Un bebedero vacío y la falta de sombra no lo cumplen.' },
        { t: 'Los visitantes tocan y alimentan al venado a través de la reja', ok: true, why: 'La exhibición de fauna debe evitar o disminuir la tensión, el sufrimiento, el traumatismo y el dolor de los animales (Ley General de Vida Silvestre, art. 32). Tocarlos o alimentarlos sin control también aumenta el riesgo de transmitir enfermedades.' },
        { t: 'Un cuidador usa guantes y botas de hule', ok: false, why: 'Es el equipo de protección adecuado para trabajar en los corrales. No es un error.' }
      ],
      riesgos: ['La limpieza es parte de la bioseguridad: los restos de comida y las heces acumuladas atraen plagas y favorecen enfermedades. Primero se limpia y después se desinfecta.',
                'Un animal en cautiverio debe vivir libre de hambre y sed y libre de molestias físicas y térmicas (las cinco libertades de la OMSA). Un bebedero vacío y la falta de sombra no lo cumplen.',
                'La exhibición de fauna debe evitar o disminuir la tensión, el sufrimiento, el traumatismo y el dolor de los animales (Ley General de Vida Silvestre, art. 32). Tocarlos o alimentarlos sin control también aumenta el riesgo de transmitir enfermedades.'] },
    { id: 'centro-rescate-bienestar', titulo: 'Recinto en un centro de rescate', imagen: 'assets/img/retos/detective-centro-rescate-bienestar-1.webp', zonas: [{"x": 0.22, "y": 0.75, "w": 0.36, "h": 0.18}, {"x": 0.41, "y": 0.325, "w": 0.5, "h": 0.49}, {"x": 0.9, "y": 0.58, "w": 0.18, "h": 0.6}], activo: true,
      tipo: 'bienestar',
      consigna: 'Observa el centro de rescate y marca las 3 señales de buen bienestar animal.',
      escena: 'En un centro de rescate, un recinto amplio con malla y techo parcial alberga a un ave rapaz que se recupera. Hay perchas a distintas alturas, ramas y una zona de sombra, un bebedero con agua limpia y un comedero sin restos. El ave descansa quieta en una percha, un cuidador la observa tranquilo desde la puerta, a distancia, y al fondo hay una jaula de transporte guardada.',
      pistas: [
        { t: 'El ave descansa quieta en una percha', ok: false, why: 'Descansar es normal. La quietud por sí sola no demuestra ni buen bienestar ni enfermedad: se evalúan las condiciones y la conducta en conjunto.' },
        { t: 'El bebedero tiene agua limpia y el comedero no tiene restos', ok: true, why: 'Agua limpia disponible y comida sin restos acumulados ayudan a que el animal viva libre de hambre y sed, con un manejo higiénico.' },
        { t: 'Hay perchas a distintas alturas, ramas y una zona de sombra', ok: true, why: 'Las perchas, las ramas y la sombra permiten conducta natural y comodidad térmica: son enriquecimiento ambiental y parte de las cinco libertades.' },
        { t: 'Hay una jaula de transporte guardada al fondo', ok: false, why: 'Es material de apoyo del centro: no es una señal de buen ni de mal bienestar.' },
        { t: 'El ave está en un recinto cerrado, así que su bienestar es malo', ok: false, why: 'No se sostiene: en un centro de rescate o rehabilitación el recinto es parte del tratamiento. Lo que cuenta es que cubra las necesidades del animal.' },
        { t: 'El cuidador observa desde la puerta, a distancia, y el ave está tranquila', ok: true, why: 'Un manejo tranquilo, a distancia y sin perseguir al animal ayuda a que viva libre de temor y distrés.' }
      ],
      riesgos: ['Agua limpia disponible y comida sin restos acumulados ayudan a que el animal viva libre de hambre y sed, con un manejo higiénico.',
                'Las perchas, las ramas y la sombra permiten conducta natural y comodidad térmica: son enriquecimiento ambiental y parte de las cinco libertades.',
                'Un manejo tranquilo, a distancia y sin perseguir al animal ayuda a que viva libre de temor y distrés.'] },
    { id: 'tortuga-anidando', titulo: 'Tortuga anidando de noche', imagen: 'assets/img/retos/detective-tortuga-anidando-1.webp', zonas: [{"x": 0.86, "y": 0.435, "w": 0.12, "h": 0.15}, {"x": 0.5, "y": 0.355, "w": 0.1, "h": 0.17}, {"x": 0.395, "y": 0.515, "w": 0.17, "h": 0.11}], activo: true,
      tipo: 'legal',
      consigna: 'Observa la playa de noche y marca los 3 errores de los visitantes durante la observación de una tortuga que anida.',
      escena: 'De noche, en una playa de anidación, una tortuga marina excava su nido en la arena. Un visitante le toma fotos con flash, otro la alumbra con una lámpara de luz blanca y una tercera persona se agacha a tocar su caparazón. Al fondo, una guía con una lámpara de luz roja conduce a un grupo pequeño que camina en fila y en silencio, mientras otro grupo espera a unos diez metros de una tortuga que ya tapó su nido.',
      pistas: [
        { t: 'Un visitante toma fotos con flash', ok: true, why: 'La NOM-162-SEMARNAT-2012 prohíbe tomar fotografías con flash en cualquier momento durante el recorrido de observación de tortugas.' },
        { t: 'La guía alumbra con una lámpara de luz roja', ok: false, why: 'Es lo permitido: durante el recorrido solo el guía puede usar una lámpara, y debe tener filtro rojo o luz roja. No es un error.' },
        { t: 'Otro visitante usa una lámpara de luz blanca', ok: true, why: 'Durante el recorrido los visitantes no pueden usar fuentes de luz; solo el guía puede usar una lámpara, y con filtro o luz roja.' },
        { t: 'El grupo camina en fila y en silencio', ok: false, why: 'Es lo que pide la norma: recorrido a pie, en fila compacta y en grupo, en silencio. No es un error.' },
        { t: 'Una persona se agacha a tocar el caparazón de la tortuga', ok: true, why: 'Está prohibido manipular, tocar, acosar, molestar o dañar a las tortugas marinas; además, los visitantes deben mantenerse a 10 m hasta que la tortuga inicie el desove.' },
        { t: 'Otro grupo espera a unos 10 m de una tortuga que ya tapó su nido', ok: false, why: 'Es correcto: cuando la tortuga termina de tapar el nido, los visitantes se mantienen a un mínimo de 10 m. No es un error.' }
      ],
      riesgos: ['La NOM-162-SEMARNAT-2012 prohíbe tomar fotografías con flash en cualquier momento durante el recorrido de observación de tortugas.',
                'Durante el recorrido los visitantes no pueden usar fuentes de luz; solo el guía puede usar una lámpara, y con filtro o luz roja.',
                'Está prohibido manipular, tocar, acosar, molestar o dañar a las tortugas marinas; además, los visitantes deben mantenerse a 10 m hasta que la tortuga inicie el desove.'] },
    { id: 'observacion-aves', titulo: 'Observación de aves', imagen: 'assets/img/retos/detective-observacion-aves-1.webp', zonas: [{"x": 0.135, "y": 0.57, "w": 0.23, "h": 0.56}, {"x": 0.545, "y": 0.535, "w": 0.11, "h": 0.25}, {"x": 0.8, "y": 0.355, "w": 0.1, "h": 0.39}], activo: true,
      tipo: 'bienestar',
      consigna: 'Observa la escena y marca las 3 malas prácticas de observación de aves.',
      escena: 'En un bosque, a media mañana, un fotógrafo se sale del sendero y se acerca a un arbusto donde hay un nido con un ave posada. Un visitante arroja comida al suelo para atraer a las aves y otro grita y aplaude para que se muevan. En el sendero, varios observadores miran en silencio con binoculares, una persona anota en una libreta lo que ve y otro fotógrafo, con teleobjetivo, se queda en el camino.',
      pistas: [
        { t: 'Un fotógrafo se sale del sendero y se acerca a un nido', ok: true, why: 'Acercarse a un nido para obtener una foto altera los espacios de anidación. Quien observa aves prioriza su conservación sobre la fotografía o el registro.' },
        { t: 'Varios observadores miran con binoculares desde el sendero', ok: false, why: 'Observar a distancia y en silencio desde el sendero es una buena práctica. No es un error.' },
        { t: 'Una persona anota en una libreta lo que observa', ok: false, why: 'Los registros de aves son datos útiles para la ciencia ciudadana y la conservación. No es un error.' },
        { t: 'Un visitante arroja comida al suelo para atraer a las aves', ok: true, why: 'Alimentar a los animales silvestres puede alterar su comportamiento y dañar su salud.' },
        { t: 'Un visitante grita y aplaude para que las aves se muevan', ok: true, why: 'El ruido asusta a los animales y pueden abandonar su zona de alimentación; en la observación se guarda silencio.' },
        { t: 'Un fotógrafo con teleobjetivo se queda en el sendero', ok: false, why: 'Fotografiar no es un error en sí. Lo es sacrificar a las aves por una foto; desde el sendero y a distancia no se altera la anidación.' }
      ],
      riesgos: ['Acercarse a un nido para obtener una foto altera los espacios de anidación. Quien observa aves prioriza su conservación sobre la fotografía o el registro.',
                'Alimentar a los animales silvestres puede alterar su comportamiento y dañar su salud.',
                'El ruido asusta a los animales y pueden abandonar su zona de alimentación; en la observación se guarda silencio.'] },
    { id: 'laguna-cocodrilo', titulo: 'Laguna en un área protegida', imagen: 'assets/img/retos/detective-laguna-cocodrilo-1.webp', zonas: [{"x": 0.21, "y": 0.405, "w": 0.26, "h": 0.23}, {"x": 0.36, "y": 0.46, "w": 0.1, "h": 0.2}, {"x": 0.895, "y": 0.575, "w": 0.19, "h": 0.13}], activo: true,
      tipo: 'seguridad',
      consigna: 'Observa la laguna y marca los 3 comportamientos de riesgo de los visitantes.',
      escena: 'En la orilla de una laguna de un área natural protegida, un cocodrilo descansa sobre la tierra, a pocos metros de la gente. Un visitante le lanza trozos de comida, otro camina justo al borde del agua y un perro nada en la laguna, cerca del animal. Detrás, un guía con chaleco explica a un grupo desde una plataforma de madera con barandal, y junto al sendero hay un bote de basura cerrado.',
      pistas: [
        { t: 'Un guía explica a un grupo desde una plataforma con barandal', ok: false, why: 'Observar desde una plataforma, a distancia, es lo recomendable. No es un error.' },
        { t: 'Un visitante lanza comida al cocodrilo', ok: true, why: 'La CONANP pide evitar dar de comer a los cocodrilos en vida silvestre: es una de las principales causas de incidentes.' },
        { t: 'Una persona camina justo al borde del agua', ok: true, why: 'La CONANP recomienda evitar caminar al borde del agua donde hay cocodrilos.' },
        { t: 'Hay un bote de basura cerrado junto al sendero', ok: false, why: 'Usar los botes de basura es una práctica correcta de los visitantes. No es un error.' },
        { t: 'El cocodrilo está quieto, así que no representa peligro', ok: false, why: 'No se sostiene: aunque parezca tranquilo, la CONANP pide mantener la distancia y no molestarlo, porque estos animales atacan por comida o para defender su territorio, su nido y sus crías.' },
        { t: 'Un perro nada en la laguna cerca del cocodrilo', ok: true, why: 'La CONANP recomienda evitar que perros o mascotas naden en sitios con presencia de cocodrilos.' }
      ],
      riesgos: ['La CONANP pide evitar dar de comer a los cocodrilos en vida silvestre: es una de las principales causas de incidentes.',
                'La CONANP recomienda evitar caminar al borde del agua donde hay cocodrilos.',
                'La CONANP recomienda evitar que perros o mascotas naden en sitios con presencia de cocodrilos.'] },
    { id: 'campamento-residuos', titulo: 'Campamento de campo', imagen: 'assets/img/retos/detective-campamento-residuos-1.webp', zonas: [{"x": 0.15, "y": 0.76, "w": 0.26, "h": 0.3}, {"x": 0.58, "y": 0.715, "w": 0.38, "h": 0.25}, {"x": 0.845, "y": 0.36, "w": 0.27, "h": 0.3}], activo: true,
      tipo: 'legal',
      consigna: 'Observa el campamento y marca los 3 errores de manejo de residuos y de impacto en el sitio.',
      escena: 'En un campamento de campo junto a un bosque hay basura y plásticos regados por el suelo, cerca de una tienda de campaña. En el terreno quedaron olvidadas cinta de marcaje, estacas y una trampa. Un grupo de estudiantes de espaldas abre con machetes un sendero nuevo entre la vegetación, aunque a un lado ya hay un camino marcado. Junto a las mochilas hay bolsas de basura cerradas y amarradas, y el equipo de trabajo está ordenado sobre una lona.',
      pistas: [
        { t: 'Hay basura y plásticos regados cerca de la tienda de campaña', ok: true, why: 'No se debe abandonar basura en el sitio: los animales pueden enredarse con los residuos o ingerirlos. Si no hay botes de basura, cada quien se lleva la suya.' },
        { t: 'Hay bolsas de basura cerradas y amarradas junto a las mochilas', ok: false, why: 'Es correcto: los residuos se juntan, se cierran y se transportan fuera del sitio. No es un error.' },
        { t: 'Hay una tienda de campaña, así que acampar ya es una falta', ok: false, why: 'No se sostiene: acampar depende de los permisos y las reglas de cada área. Lo que aquí está mal es lo que se deja en el sitio.' },
        { t: 'Cinta de marcaje, estacas y una trampa quedaron olvidadas en el terreno', ok: true, why: 'El material que se deja en campo para un estudio, como marcas de senderos y trampas, debe recogerse en cuanto se cumplan los objetivos del estudio.' },
        { t: 'El equipo de trabajo está ordenado sobre una lona', ok: false, why: 'Tener el equipo ordenado ayuda a no perder ni dejar material. No es un error.' },
        { t: 'Un grupo abre un sendero nuevo, aunque ya hay un camino marcado', ok: true, why: 'Se deben usar los senderos que ya existen y no abrir nuevos caminos.' }
      ],
      riesgos: ['No se debe abandonar basura en el sitio: los animales pueden enredarse con los residuos o ingerirlos. Si no hay botes de basura, cada quien se lleva la suya.',
                'El material que se deja en campo para un estudio, como marcas de senderos y trampas, debe recogerse en cuanto se cumplan los objetivos del estudio.',
                'Se deben usar los senderos que ya existen y no abrir nuevos caminos.'] },
    /* Escenas 22 a 30: conservar las anteriores en su posición por el avance guardado. */
    {
      "id": "apiario-colmenas",
      "titulo": "Un apiario en el campo",
      "imagen": "assets/img/retos/detective-apiario-colmenas-1.webp",
      "zonas": [{"x": 0.63, "y": 0.565, "w": 0.46, "h": 0.19}, {"x": 0.34, "y": 0.36, "w": 0.2, "h": 0.4}, {"x": 0.735, "y": 0.27, "w": 0.51, "h": 0.32}],
      "activo": true,
      "tipo": "seguridad",
      "consigna": "Observa el apiario y marca las 3 condiciones que requieren atención.",
      "escena": "en el centro, cuatro o cinco colmenas de madera pintadas de colores claros están colocadas directamente sobre el suelo de tierra, sin base ni tarimas debajo. Frente a ellas, un apicultor de espaldas, sin rostro, vestido con playera y pantalón de mezclilla, sin velo, sin overol y sin guantes, abre una de las colmenas; unas abejas vuelan alrededor (sin que haya picaduras ni nada alarmante). Justo detrás de las colmenas, a pocos pasos, hay un camino de terracería y dos casas pequeñas de campo.",
      "pistas": [
        {
          "t": "Las colmenas están directamente sobre el suelo",
          "ok": true,
          "why": "Las bases resistentes elevan las colmenas y ayudan a protegerlas de la humedad del suelo."
        },
        {
          "t": "El apicultor abre una colmena sin velo, overol ni guantes",
          "ok": true,
          "why": "El equipo de protección ayuda a reducir la exposición a picaduras durante el manejo de las colmenas."
        },
        {
          "t": "Hay un bebedero con agua limpia",
          "ok": false,
          "why": "Disponer de agua limpia forma parte del cuidado del apiario."
        },
        {
          "t": "Las casas y el camino están a pocos pasos de las colmenas",
          "ok": true,
          "why": "La ubicación debe considerar la distancia a viviendas y caminos para reducir encuentros entre personas y abejas."
        },
        {
          "t": "El terreno está libre de maleza alta",
          "ok": false,
          "why": "Mantener despejado el espacio de trabajo facilita el acceso y el manejo."
        },
        {
          "t": "Hay un ahumador junto al equipo",
          "ok": false,
          "why": "El ahumador es una herramienta de manejo; su presencia por sí sola no es uno de los problemas de esta escena."
        }
      ],
      "riesgos": [
        "Las bases resistentes elevan las colmenas y ayudan a protegerlas de la humedad del suelo.",
        "El equipo de protección ayuda a reducir la exposición a picaduras durante el manejo de las colmenas.",
        "La ubicación debe considerar la distancia a viviendas y caminos para reducir encuentros entre personas y abejas."
      ]
    },
    {
      "id": "santuario-monarca",
      "titulo": "Visita a un santuario de mariposa monarca",
      "imagen": "assets/img/retos/detective-santuario-monarca-1.webp",
      "zonas": [{"x": 0.6, "y": 0.375, "w": 0.08, "h": 0.11}, {"x": 0.885, "y": 0.345, "w": 0.11, "h": 0.13}, {"x": 0.155, "y": 0.52, "w": 0.27, "h": 0.36}],
      "activo": true,
      "tipo": "bienestar",
      "consigna": "Observa la visita y marca las 3 acciones que perturban a las mariposas.",
      "escena": "miles de mariposas monarca anaranjadas cuelgan en racimos de las ramas de los árboles. En el centro, un visitante de perfil, sin rostro, estira la mano y toca una de las mariposas. A la derecha, otro visitante de espaldas apunta una cámara a los racimos y produce un destello de flash visible. A la izquierda, dos visitantes de espaldas se salieron del sendero marcado y caminan entre los árboles, pisando la vegetación del suelo.",
      "pistas": [
        {
          "t": "Un visitante toca una mariposa",
          "ok": true,
          "why": "Las mariposas se observan sin tocarlas ni desprenderlas de las ramas."
        },
        {
          "t": "Un guía acompaña al grupo por el sendero",
          "ok": false,
          "why": "Seguir las indicaciones del guía y permanecer en el sendero ayuda a proteger la colonia."
        },
        {
          "t": "Un visitante toma fotografías con flash",
          "ok": true,
          "why": "Evitar el flash reduce las molestias a las mariposas durante la visita."
        },
        {
          "t": "Las monarcas están agrupadas en las ramas",
          "ok": false,
          "why": "Los racimos de mariposas forman parte de la escena natural del santuario."
        },
        {
          "t": "Dos visitantes caminan fuera del sendero",
          "ok": true,
          "why": "Permanecer en los senderos y respetar los límites de acceso evita pisar vegetación y perturbar la colonia."
        },
        {
          "t": "Un grupo observa a distancia",
          "ok": false,
          "why": "Observar con calma y a distancia es una práctica adecuada."
        }
      ],
      "riesgos": [
        "Las mariposas se observan sin tocarlas ni desprenderlas de las ramas.",
        "Evitar el flash reduce las molestias a las mariposas durante la visita.",
        "Permanecer en los senderos y respetar los límites de acceso evita pisar vegetación y perturbar la colonia."
      ]
    },
    {
      "id": "anillamiento-redes",
      "titulo": "Estación de anillamiento de aves",
      "imagen": "assets/img/retos/detective-anillamiento-redes-1.webp",
      "zonas": [{"x": 0.0875, "y": 0.39, "w": 0.145, "h": 0.46}, {"x": 0.435, "y": 0.39, "w": 0.11, "h": 0.16}, {"x": 0.65, "y": 0.705, "w": 0.2, "h": 0.19}],
      "activo": true,
      "tipo": "bienestar",
      "consigna": "Observa la estación y marca las 3 prácticas que comprometen el bienestar de las aves.",
      "escena": "redes de niebla (mallas finas casi transparentes) tendidas entre varas. A la izquierda, junto a las redes, una bocina portátil sobre un tripié, con ondas de sonido sugeridas, reproduce cantos para atraer aves. En el centro, un ave pequeña está enredada en una de las redes, bajo el sol directo, sin sombra; el personal (tres personas de espaldas) descansa lejos, sentado a la sombra de un árbol, a la derecha, sin mirar las redes. En el primer plano a la derecha, otra persona de espaldas sujeta a un ave por el cuerpo y tira de ella para sacarla de la red (el ave se ve sujeta de forma torpe, pero sin heridas, sin sangre y sin gestos de pánico).",
      "pistas": [
        {
          "t": "Una bocina reproduce cantos junto a las redes",
          "ok": true,
          "why": "En este método de monitoreo, los reclamos grabados alteran la captura y no deben usarse para atraer aves a las redes."
        },
        {
          "t": "Hay bolsas pequeñas de tela en la estación",
          "ok": false,
          "why": "Las bolsas de tela son parte del equipo de trabajo de una estación; su presencia no indica un error."
        },
        {
          "t": "Un ave está atrapada al sol mientras el personal descansa lejos",
          "ok": true,
          "why": "Las redes necesitan vigilancia y revisión frecuente. El calor y la exposición al sol hacen especialmente urgente atender a un ave atrapada."
        },
        {
          "t": "Una persona tira del ave para sacarla de la red",
          "ok": true,
          "why": "La extracción requiere personal capacitado que libere la malla con cuidado; tirar del ave puede lesionarla."
        },
        {
          "t": "La mesa de registro está a la sombra",
          "ok": false,
          "why": "Un espacio de trabajo protegido del sol es adecuado."
        },
        {
          "t": "Hay una hoja para registrar la información",
          "ok": false,
          "why": "Registrar los datos es parte del monitoreo."
        }
      ],
      "riesgos": [
        "En este método de monitoreo, los reclamos grabados alteran la captura y no deben usarse para atraer aves a las redes.",
        "Las redes necesitan vigilancia y revisión frecuente. El calor y la exposición al sol hacen especialmente urgente atender a un ave atrapada.",
        "La extracción requiere personal capacitado que libere la malla con cuidado; tirar del ave puede lesionarla."
      ]
    },
    {
      "id": "monitoreo-nidos",
      "titulo": "Monitoreo de un nido",
      "imagen": "assets/img/retos/detective-monitoreo-nidos-1.webp",
      "zonas": [{"x": 0.495, "y": 0.41, "w": 0.33, "h": 0.28}, {"x": 0.28, "y": 0.485, "w": 0.16, "h": 0.23}, {"x": 0.47, "y": 0.79, "w": 0.26, "h": 0.38}],
      "activo": true,
      "tipo": "bienestar",
      "consigna": "Observa el nido y marca las 3 prácticas que aumentan la perturbación.",
      "escena": "en el centro, un arbusto bajo con un nido pequeño y visible. Cinco personas de espaldas se amontonan alrededor del nido, muy juntas. Una de ellas está sentada junto al nido y escribe en una libreta apoyada en las rodillas. Desde la parte inferior de la imagen, un sendero de tierra muy pisado, ancho y claramente marcado entre el pasto, lleva en línea recta hasta el arbusto del nido.",
      "pistas": [
        {
          "t": "Cinco personas se amontonan alrededor del nido",
          "ok": true,
          "why": "Reducir el número de observadores y el tiempo junto al nido disminuye la perturbación."
        },
        {
          "t": "Una persona observa a distancia con binoculares",
          "ok": false,
          "why": "Los binoculares permiten observar sin acercarse innecesariamente."
        },
        {
          "t": "Una persona permanece junto al nido para escribir sus notas",
          "ok": true,
          "why": "La información se anota a suficiente distancia del nido para reducir el tiempo de presencia junto a él."
        },
        {
          "t": "Hay un ave adulta en una rama cercana",
          "ok": false,
          "why": "La presencia del ave adulta no es por sí misma un error del monitoreo."
        },
        {
          "t": "Un sendero muy pisado termina directamente en el nido",
          "ok": true,
          "why": "Repetir una misma ruta puede formar un camino evidente hasta el nido. Se debe evitar dejar ese rastro de acceso."
        },
        {
          "t": "Se usa un lápiz largo para apartar suavemente unas ramas",
          "ok": false,
          "why": "En una inspección autorizada, apartar con cuidado la vegetación puede permitir observar sin tocar el nido."
        }
      ],
      "riesgos": [
        "Reducir el número de observadores y el tiempo junto al nido disminuye la perturbación.",
        "La información se anota a suficiente distancia del nido para reducir el tiempo de presencia junto a él.",
        "Repetir una misma ruta puede formar un camino evidente hasta el nido. Se debe evitar dejar ese rastro de acceso."
      ]
    },
    {
      "id": "residuos-rpbi",
      "titulo": "Residuos de un procedimiento veterinario",
      "imagen": "assets/img/retos/detective-residuos-rpbi-1.webp",
      "zonas": [{"x": 0.165, "y": 0.47, "w": 0.27, "h": 0.28}, {"x": 0.515, "y": 0.585, "w": 0.31, "h": 0.23}, {"x": 0.87, "y": 0.425, "w": 0.22, "h": 0.45}],
      "activo": true,
      "tipo": "legal",
      "consigna": "Observa los recipientes y marca los 3 problemas de separación y envasado de residuos.",
      "escena": "a la izquierda, sobre una mesa de acero, una bolsa de plástico transparente con varias agujas y bisturís usados dentro (se ven los instrumentos a través de la bolsa). En el centro, un bote de basura común, de color gris, lleno de envolturas de comida, del que asoman unas gasas con una mancha roja pequeña (sin salpicaduras ni charcos). A la derecha, un recipiente rígido de color rojo para punzocortantes, lleno hasta el borde, con la tapa abierta y varias agujas sobresaliendo por arriba.",
      "pistas": [
        {
          "t": "Hay agujas y bisturís usados dentro de una bolsa transparente",
          "ok": true,
          "why": "Una bolsa puede perforarse. Los punzocortantes usados requieren un recipiente rígido adecuado para su clasificación."
        },
        {
          "t": "El personal usa guantes y bata",
          "ok": false,
          "why": "El equipo de protección es una práctica adecuada durante el manejo de residuos."
        },
        {
          "t": "Se mezcló material de curación del procedimiento con basura común",
          "ok": true,
          "why": "El material potencialmente infeccioso debe clasificarse y separarse en el lugar donde se genera. Una mancha roja por sí sola no determina su clasificación."
        },
        {
          "t": "Un recipiente de punzocortantes está desbordado y abierto",
          "ok": true,
          "why": "Un recipiente sobrellenado deja expuestas las agujas. Se debe respetar su límite de llenado y cerrarlo de forma segura."
        },
        {
          "t": "Hay bolsas cerradas en el área de residuos",
          "ok": false,
          "why": "El cierre de los envases ayuda a contener los residuos; además debe verificarse que correspondan a su clasificación."
        },
        {
          "t": "No hay animales sobre las mesas",
          "ok": false,
          "why": "Esta escena trata del manejo de residuos; la ausencia de animales no es un problema."
        }
      ],
      "riesgos": [
        "Una bolsa puede perforarse. Los punzocortantes usados requieren un recipiente rígido adecuado para su clasificación.",
        "El material potencialmente infeccioso debe clasificarse y separarse en el lugar donde se genera. Una mancha roja por sí sola no determina su clasificación.",
        "Un recipiente sobrellenado deja expuestas las agujas. Se debe respetar su límite de llenado y cerrarlo de forma segura."
      ]
    },
    {
      "id": "molde-huella",
      "titulo": "Molde de yeso de una huella",
      "imagen": "assets/img/retos/detective-molde-huella-1.webp",
      "zonas": [{"x": 0.36, "y": 0.725, "w": 0.22, "h": 0.23}, {"x": 0.285, "y": 0.29, "w": 0.15, "h": 0.34}, {"x": 0.765, "y": 0.575, "w": 0.23, "h": 0.25}],
      "activo": true,
      "tipo": "identificacion",
      "consigna": "Observa la elaboración del molde y marca los 3 errores que pueden arruinar el registro.",
      "escena": "a la izquierda, una persona agachada, de espaldas, hace un molde de yeso de una huella de mamífero; hay un círculo trazado en la tierra alrededor de la huella. La persona vierte el yeso desde muy arriba, a la altura de su hombro, y la mezcla blanca se derrama más allá del círculo. A la derecha, otra persona de espaldas levanta un molde que todavía está blando y húmedo, y se ve el dedo manchado de yeso blanco.",
      "pistas": [
        {
          "t": "El yeso se derrama fuera de la marca que rodea la huella",
          "ok": true,
          "why": "Controlar el vertido dentro del contorno evita extender la mezcla innecesariamente y facilita obtener el molde."
        },
        {
          "t": "Hay una referencia de tamaño junto a otra huella",
          "ok": false,
          "why": "Una referencia de tamaño ayuda a documentar el rastro."
        },
        {
          "t": "La mezcla cae desde la altura del hombro",
          "ok": true,
          "why": "El yeso se vierte cerca de la superficie y con cuidado para no destruir los detalles de la huella."
        },
        {
          "t": "Se levanta un molde blando que todavía mancha el dedo",
          "ok": true,
          "why": "El molde se retira cuando ha endurecido; levantarlo aún blando puede deformarlo o romperlo."
        },
        {
          "t": "Hay un cepillo suave entre el equipo",
          "ok": false,
          "why": "El cepillo suave puede utilizarse para limpiar cuidadosamente un molde ya endurecido."
        },
        {
          "t": "Las herramientas están reunidas sobre una lona",
          "ok": false,
          "why": "Mantener el equipo ordenado facilita recogerlo al terminar."
        }
      ],
      "riesgos": [
        "Controlar el vertido dentro del contorno evita extender la mezcla innecesariamente y facilita obtener el molde.",
        "El yeso se vierte cerca de la superficie y con cuidado para no destruir los detalles de la huella.",
        "El molde se retira cuando ha endurecido; levantarlo aún blando puede deformarlo o romperlo."
      ]
    },
    {
      "id": "avistamiento-ballenas",
      "titulo": "Avistamiento de ballenas",
      "imagen": "assets/img/retos/detective-avistamiento-ballenas-1.webp",
      "zonas": [{"x": 0.525, "y": 0.38, "w": 0.39, "h": 0.28}, {"x": 0.09, "y": 0.45, "w": 0.14, "h": 0.1}, {"x": 0.895, "y": 0.355, "w": 0.19, "h": 0.15}],
      "activo": true,
      "tipo": "legal",
      "consigna": "Observa las embarcaciones y marca las 3 acciones que interfieren con las ballenas.",
      "escena": "en el centro, una ballena jorobada adulta nada junto a su cría pequeña, ambas con el lomo asomando. Una lancha de pasajeros pasa justo entre las dos. A la izquierda, una persona nada en el agua a pocos metros de ellas, con el brazo fuera del agua. A la derecha, una moto acuática se acerca a toda velocidad por un costado, levantando espuma.",
      "pistas": [
        {
          "t": "Una lancha pasa entre la ballena adulta y su cría",
          "ok": true,
          "why": "Interponerse entre una madre y su cría separa su trayectoria y perturba a los animales."
        },
        {
          "t": "Otra embarcación espera lejos",
          "ok": false,
          "why": "Esperar a distancia ayuda a evitar que las embarcaciones rodeen a las ballenas."
        },
        {
          "t": "Una persona nada cerca de las ballenas",
          "ok": true,
          "why": "La observación se realiza desde las embarcaciones autorizadas; entrar al agua para acercarse a las ballenas no es una práctica permitida en esta actividad."
        },
        {
          "t": "Una moto acuática se aproxima levantando espuma",
          "ok": true,
          "why": "Las motos acuáticas no son un medio adecuado para realizar esta observación; su aproximación perturba a las ballenas."
        },
        {
          "t": "Los pasajeros permanecen dentro de la lancha",
          "ok": false,
          "why": "Permanecer a bordo es lo adecuado durante el recorrido."
        },
        {
          "t": "La ballena adulta y la cría asoman el lomo",
          "ok": false,
          "why": "Es parte de su desplazamiento natural; no constituye un error de los visitantes."
        }
      ],
      "riesgos": [
        "Interponerse entre una madre y su cría separa su trayectoria y perturba a los animales.",
        "La observación se realiza desde las embarcaciones autorizadas; entrar al agua para acercarse a las ballenas no es una práctica permitida en esta actividad.",
        "Las motos acuáticas no son un medio adecuado para realizar esta observación; su aproximación perturba a las ballenas."
      ]
    },
    {
      "id": "liberacion-crias",
      "titulo": "Liberación de crías de tortuga marina",
      "imagen": "assets/img/retos/detective-liberacion-crias-1.webp",
      "zonas": [{"x": 0.135, "y": 0.745, "w": 0.23, "h": 0.39}, {"x": 0.365, "y": 0.595, "w": 0.13, "h": 0.13}, {"x": 0.855, "y": 0.5, "w": 0.17, "h": 0.2}],
      "activo": true,
      "tipo": "legal",
      "consigna": "Observa la liberación y marca las 3 prácticas que deben corregirse.",
      "escena": "personal de un campamento tortuguero (de espaldas, con gorras, sin rostros) libera crías de tortuga marina. A la izquierda, una cubeta de plástico llena de agua con varias crías nadando dentro. En el centro, en la orilla, una persona agachada mete a varias crías al mar con las manos, sosteniéndolas en el agua. A la derecha, otra persona excava con las manos un nido en la arena para sacar crías que todavía no han salido. Las crías se ven sanas.",
      "pistas": [
        {
          "t": "Las crías esperan dentro de una cubeta con agua",
          "ok": true,
          "why": "Las crías no deben mantenerse nadando en una cubeta antes de la liberación; eso puede agotarlas."
        },
        {
          "t": "El vivero está en terreno alto, lejos del oleaje",
          "ok": false,
          "why": "Ubicar el vivero fuera del alcance del oleaje ayuda a proteger los nidos."
        },
        {
          "t": "Una persona introduce las crías al mar con las manos",
          "ok": true,
          "why": "Se permite que las crías recorran la arena húmeda y entren al mar por sí mismas, siguiendo el protocolo del campamento."
        },
        {
          "t": "Otra persona excava un nido para sacar crías que aún no emergen",
          "ok": true,
          "why": "No se adelanta la salida de las crías para una liberación. La revisión de nidos corresponde a personal autorizado y a su protocolo."
        },
        {
          "t": "El personal lleva gorras sin adornos",
          "ok": false,
          "why": "La vestimenta mostrada no es uno de los problemas de esta escena."
        },
        {
          "t": "Un cerco delimita un nido en la arena",
          "ok": false,
          "why": "La delimitación puede ayudar a evitar el pisoteo; debe formar parte del manejo autorizado."
        }
      ],
      "riesgos": [
        "Las crías no deben mantenerse nadando en una cubeta antes de la liberación; eso puede agotarlas.",
        "Se permite que las crías recorran la arena húmeda y entren al mar por sí mismas, siguiendo el protocolo del campamento.",
        "No se adelanta la salida de las crías para una liberación. La revisión de nidos corresponde a personal autorizado y a su protocolo."
      ]
    },
    {
      "id": "playa-anidacion-dia",
      "titulo": "Playa de anidación en temporada",
      "imagen": "assets/img/retos/detective-playa-anidacion-dia-1.webp",
      "zonas": [{"x": 0.2, "y": 0.53, "w": 0.38, "h": 0.52}, {"x": 0.55, "y": 0.405, "w": 0.24, "h": 0.23}, {"x": 0.895, "y": 0.59, "w": 0.17, "h": 0.24}],
      "activo": true,
      "tipo": "legal",
      "consigna": "Observa la playa y marca los 3 obstáculos o perturbaciones durante la temporada de anidación.",
      "escena": "en el primer plano a la izquierda, varias tumbonas y una red de voleibol armada, dejadas sobre la arena. En el centro, una camioneta circula por la arena de la playa, dejando huellas de llantas. A la derecha, cerca de la orilla, un perro corre suelto por la arena. Al fondo hay una duna con vegetación.",
      "pistas": [
        {
          "t": "Hay tumbonas y una red de voleibol sobre la arena",
          "ok": true,
          "why": "Los objetos movibles pueden obstruir el paso o enredar a las tortugas y sus crías; la playa de anidación debe mantenerse despejada."
        },
        {
          "t": "La duna conserva su vegetación",
          "ok": false,
          "why": "Conservar la vegetación nativa protege la duna y el hábitat de anidación."
        },
        {
          "t": "Una camioneta circula por la arena y deja huellas de llantas",
          "ok": true,
          "why": "El tránsito recreativo de vehículos puede perturbar la anidación y afectar nidos o crías. El manejo autorizado requiere condiciones específicas."
        },
        {
          "t": "Un perro corre suelto por la playa",
          "ok": true,
          "why": "Los animales sueltos pueden perturbar a las hembras o dañar nidos y crías; deben mantenerse fuera de la zona de anidación."
        },
        {
          "t": "La lámpara tiene capucha y dirige la luz hacia abajo",
          "ok": false,
          "why": "Evitar que la luz se proyecte hacia la playa ayuda a reducir la desorientación de las tortugas."
        },
        {
          "t": "Hay personas caminando a lo lejos por la orilla",
          "ok": false,
          "why": "Caminar por una zona permitida y respetar las indicaciones no constituye por sí mismo una perturbación."
        }
      ],
      "riesgos": [
        "Los objetos movibles pueden obstruir el paso o enredar a las tortugas y sus crías; la playa de anidación debe mantenerse despejada.",
        "El tránsito recreativo de vehículos puede perturbar la anidación y afectar nidos o crías. El manejo autorizado requiere condiciones específicas.",
        "Los animales sueltos pueden perturbar a las hembras o dañar nidos y crías; deben mantenerse fuera de la zona de anidación."
      ]
    }
  ];

  return { quiz: quiz, orden: orden, flashcards: flashcards, historia: historia, detective: detective };
});
