/* ============================================================ */
/* CONTENIDO DE LA ZONA DE RETOS · Club VIP Zoorigen              */
/*                                                                */
/* Aquí vive TODO el contenido de los retos (solo datos, sin      */
/* pantalla):                                                     */
/*   quiz        47 preguntas de 3 opciones                       */
/*   orden       39 secuencias de 4 a 6 pasos                     */
/*   flashcards  55 tarjetas                                      */
/*   historia    6 mundos x 4 casos de 3 opciones                 */
/*   detective   60 escenas (13 originales, 17 adicionales de          */
/*               identificación, legal y bienestar, y 30 de            */
/*               seguridad, bioseguridad y conservación)       */
/*                                                                */
/* Forma de cada escena del detective:                            */
/*   { id, titulo, imagen, zonas: [], activo: true,               */
/*     tipo: 'seguridad' | 'identificacion' | 'bienestar' |       */
/*           'legal' | 'conservacion',                             */
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

  /* ───────────── Quiz relámpago: 47 preguntas ───────────── */
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
      why: 'El capítulo de trato digno y respetuoso exige evitar o disminuir la tensión, el sufrimiento, el traumatismo y el dolor de la fauna silvestre en todas estas actividades, y prohíbe todo acto de crueldad.' },
    /* Preguntas 33 a 47 (segunda tanda): se agregan al final para conservar el avance guardado. */
    { "id": "q33", "tema": "Entrenamiento canino", "q": "Al entrenar a un perro con refuerzo positivo, ¿cuándo se da el premio?", "a": ["Justo después de que el perro hace la conducta", "Varios minutos después, al terminar la sesión", "Antes de pedir la conducta, para motivarlo"], "ok": 0,"why": "El premio funciona cuando llega de inmediato: así el perro relaciona lo que acaba de hacer con la recompensa." },
    { "id": "q34", "tema": "Etología", "q": "En un recinto, un animal que camina una y otra vez en círculos, sin una función aparente, muestra una…", "a": ["Conducta de cortejo", "Conducta estereotipada", "Conducta de forrajeo"], "ok": 1,"why": "Las conductas estereotipadas son movimientos repetitivos sin función clara y suelen indicar que el ambiente no cubre las necesidades del animal: conviene revisar y enriquecer el recinto." },
    { "id": "q35", "tema": "Aves bioindicadoras", "q": "¿Por qué algunas aves se usan como bioindicadoras?", "a": ["Porque todas migran la misma distancia", "Porque son fáciles de criar en cautiverio", "Porque los cambios en su presencia o abundancia reflejan cambios en el ambiente"], "ok": 2,"why": "Muchas aves son sensibles a los cambios del hábitat; saber qué especies hay y cuántas ayuda a conocer el estado del ecosistema." },
    { "id": "q36", "tema": "Impacto ambiental", "q": "En un estudio de impacto ambiental, ¿qué es una medida de mitigación?", "a": ["Una acción para reducir un impacto negativo identificado", "Un permiso que se paga una sola vez", "El nombre del documento final del estudio"], "ok": 0,"why": "La mitigación busca disminuir el efecto negativo de una obra o actividad sobre el ambiente, y se plantea junto con medidas de prevención y de compensación." },
    { "id": "q37", "tema": "Tiburones y rayas", "q": "Al manejar una raya con aguijón en la cola, ¿qué precaución es básica?", "a": ["Tomarla de la cola para que no se mueva", "Evitar la cola y manipularla lo mínimo, de preferencia sin sacarla del agua", "Cortar el aguijón antes de manejarla"], "ok": 1,"why": "El aguijón puede causar heridas dolorosas, por eso se evita la cola y se manipula al animal lo menos posible. No se corta el aguijón." },
    { "id": "q38", "tema": "Zoonosis", "q": "En salud, ¿qué es un vector?", "a": ["Un medicamento que se aplica a los animales", "Un animal que nunca se enferma", "Un organismo, como un mosquito o una garrapata, que transmite un agente infeccioso de un ser vivo a otro"], "ok": 2,"why": "Los vectores llevan agentes infecciosos de un animal o una persona a otra; por eso se controlan y se usa protección en campo." },
    { "id": "q39", "tema": "Felinos", "q": "¿Cuál de estos felinos silvestres vive en México?", "a": ["Jaguar", "León africano", "Tigre de Bengala"], "ok": 0,"why": "El jaguar es el felino más grande de América y habita en México; el león es africano y el tigre de Bengala es asiático." },
    { "id": "q40", "tema": "Rescate", "q": "Al reubicar a un animal rescatado, ¿qué criterio es prudente para elegir el sitio?", "a": ["Cualquier terreno vacío lejos de las personas", "Un sitio cercano al de captura, con hábitat adecuado para la especie y sin amenazas evidentes", "Un sitio con depredadores para que se acostumbre"], "ok": 1,"why": "El sitio debe tener hábitat apropiado (refugio, agua, alimento), estar lo más cerca posible del lugar de captura y no tener amenazas como caminos o animales domésticos." },
    { "id": "q41", "tema": "Legislación", "q": "En una UMA, ¿para qué sirve el plan de manejo?", "a": ["Para fijar el precio de venta de los animales", "Para llevar el registro de visitantes del año", "Para describir cómo se manejará y conservará la vida silvestre del predio"], "ok": 2,"why": "El plan de manejo es el documento técnico que explica cómo se cuidará y aprovechará de forma sustentable la vida silvestre de la UMA." },
    { "id": "q42", "tema": "Mariposarios", "q": "¿De qué se alimentan normalmente las mariposas adultas en un mariposario?", "a": ["Néctar de flores o fruta madura", "Carne fresca", "Hojas secas"], "ok": 0,"why": "Las mariposas adultas se alimentan sobre todo de néctar y de fruta madura; las hojas de las plantas hospederas son para las orugas." },
    { "id": "q43", "tema": "Fototrampeo", "q": "¿Por qué conviene anotar fecha, hora y ubicación de cada cámara trampa?", "a": ["Para que la cámara grabe más rápido", "Para poder interpretar y comparar las fotos con el sitio y el tiempo de muestreo", "Porque sin esos datos la cámara no enciende"], "ok": 1,"why": "Sin esos datos las fotos pierden valor: no se sabe dónde ni cuándo se tomaron ni cuánto esfuerzo de muestreo hubo." },
    { "id": "q44", "tema": "Etología", "q": "¿Qué es el enriquecimiento ambiental en cautiverio?", "a": ["Agregar animales de otras especies al mismo recinto", "Eliminar todo olor del recinto con limpieza intensa", "Modificar el recinto y la alimentación para favorecer conductas naturales y el bienestar"], "ok": 2,"why": "El enriquecimiento ofrece estímulos (espacios, objetos, formas de alimentación) para que el animal pueda expresar conductas propias de su especie." },
    { "id": "q45", "tema": "Aves rapaces", "q": "¿Por qué es útil llevar un registro del peso de un ave rapaz?", "a": ["Porque los cambios de peso pueden avisar de un problema de salud o de alimentación", "Porque el peso fija la edad exacta del ave", "Porque solo sirve para llenar el informe anual"], "ok": 0,"why": "Una pérdida o un aumento de peso inesperado es de las primeras señales de que algo no va bien, por eso el peso se anota con regularidad." },
    { "id": "q46", "tema": "Bioseguridad", "q": "Un animal silvestre rescatado se ve tranquilo y sin heridas. ¿Se puede omitir la cuarentena?", "a": ["Sí, si se ve sano", "No: puede portar enfermedades aunque no muestre signos", "Sí, si es de una especie pequeña"], "ok": 1,"why": "Un animal puede estar enfermo o ser portador sin mostrar signos, por eso todo ejemplar nuevo pasa por cuarentena antes de convivir con otros." },
    { "id": "q47", "tema": "Tiburones y rayas", "q": "Los tiburones y las rayas pertenecen al grupo de los peces…", "a": ["Óseos", "Sin mandíbula", "Cartilaginosos"], "ok": 2,"why": "Su esqueleto es de cartílago y no de hueso; por eso se les llama peces cartilaginosos (condrictios)." }
  ];

  /* ───────────── Ordena el procedimiento: 39 secuencias ───────────── */
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
      pasos: ['Buscar la huella más nítida', 'Fotografiarla con una referencia de tamaño, como un bolígrafo o una escala', 'Hacer una lista de los mamíferos que podrían estar en la localidad', 'Revisar si es de una sola extremidad o si hay huellas encimadas', 'Observar tamaño, forma, número de dedos y si hay marcas de garras'] },
    /* Secuencias 25 a 39 (segunda tanda): se agregan al final para conservar el avance guardado. */
    { "id": "o25", "tema": "Bioseguridad", "titulo": "Desinfectar las botas en un pediluvio", "pasos": ["Quitar el exceso de lodo y de materia orgánica de las botas", "Meter las botas en la solución desinfectante del pediluvio", "Respetar el tiempo de contacto que indica el producto", "Salir hacia una superficie limpia"] },
    { "id": "o26", "tema": "Rescate", "titulo": "Rescatar un ave acuática enredada en una red", "pasos": ["Observar la escena y valorar los riesgos para la persona y para el ave", "Acercarse con calma y con el equipo de protección", "Cubrir al ave con una toalla y sujetarla con cuidado", "Liberarla de la red sin jalar, cortando la red si hace falta", "Colocarla en una caja ventilada y oscura y avisar a personal especializado"] },
    { "id": "o27", "tema": "Entrenamiento canino", "titulo": "Enseñar la señal «sentado» con refuerzo positivo", "pasos": ["Preparar premios pequeños y elegir un lugar tranquilo", "Acercar el premio al hocico y subirlo despacio por encima de la cabeza del perro", "Cuando el perro baje la cadera, premiarlo al instante", "Repetir en sesiones cortas, varias veces", "Agregar la palabra «sentado» justo antes del movimiento"] },
    { "id": "o28", "tema": "Etología", "titulo": "Una sesión de observación de conducta con etograma", "pasos": ["Definir la pregunta y las conductas que se van a registrar (etograma)", "Elegir el método y la duración del muestreo", "Observar sin interferir y anotar cada conducta cuando ocurre", "Ordenar y revisar los datos", "Analizar e interpretar los resultados"] },
    { "id": "o29", "tema": "Aves", "titulo": "Conteo de aves por puntos de observación", "pasos": ["Elegir y marcar los puntos de conteo", "Llegar al primer punto y esperar unos minutos en silencio", "Registrar, durante el tiempo establecido, las aves vistas y oídas", "Anotar especie, número y hora", "Pasar al siguiente punto y repetir con el mismo método"] },
    { "id": "o30", "tema": "Impacto ambiental", "titulo": "Las etapas de una evaluación de impacto ambiental", "pasos": ["Describir el proyecto y el sitio donde se hará", "Identificar los posibles impactos", "Valorar qué tan importantes son esos impactos", "Proponer medidas de prevención, mitigación y compensación", "Dar seguimiento a las medidas mientras dura el proyecto"] },
    { "id": "o31", "tema": "Tiburones y rayas", "titulo": "Liberar una raya capturada por accidente", "pasos": ["Mantenerla en el agua y evitar tocar la cola", "Quitar con cuidado el anzuelo o la red, si se puede sin riesgo", "Anotar la especie, el tamaño aproximado y el lugar", "Guiarla hacia aguas abiertas", "Observar que se aleje nadando con normalidad"] },
    { "id": "o32", "tema": "Zoonosis", "titulo": "Qué hacer después de una mordedura o un rasguño de fauna", "pasos": ["Lavar la herida enseguida con agua y jabón", "Cubrirla con una gasa o un apósito limpio", "Acudir pronto a un servicio médico y decir qué animal fue", "Avisar al responsable del sitio para registrar el incidente"] },
    { "id": "o33", "tema": "Felinos", "titulo": "Entrar a limpiar el área de servicio de un felino", "pasos": ["Confirmar que el felino está dentro de su recinto de contención", "Cerrar y asegurar la puerta de contención", "Entrar al área de servicio a limpiar o poner el alimento", "Salir y cerrar la puerta del área de servicio", "Abrir de nuevo el acceso al felino solo cuando no haya nadie dentro"] },
    { "id": "o34", "tema": "Mariposarios", "titulo": "Soltar una mariposa que acaba de emerger", "pasos": ["Esperar a que la mariposa salga de la pupa", "Dejar que seque y extienda sus alas en un lugar seguro", "Comprobar que vuela con normalidad", "Soltarla dentro del mariposario"] },
    { "id": "o35", "tema": "Monitoreo", "titulo": "Revisar una cámara trampa en campo", "pasos": ["Llegar y observar la cámara sin moverla", "Anotar la fecha y la hora de la visita", "Revisar el estado: pilas, tarjeta de memoria y encuadre", "Respaldar o cambiar la tarjeta de memoria", "Dejar la cámara armada y comprobar que funciona"] },
    { "id": "o36", "tema": "Rescate", "titulo": "Ayudar a una tortuga que cruza la carretera", "pasos": ["Detenerse en un lugar seguro y revisar el tráfico", "Ver si la tortuga está herida", "Si está sana, tomarla con cuidado por los lados del caparazón", "Cruzarla en la misma dirección en que iba", "Dejarla a salvo, lejos del camino"] },
    { "id": "o37", "tema": "Legislación", "titulo": "Anotar un ejemplar en la bitácora de la UMA", "pasos": ["Identificar al ejemplar: especie y marca o código", "Anotar la fecha y el tipo de movimiento (entrada, nacimiento o salida)", "Registrar el origen o el destino y el documento que lo respalda", "Validar el registro con la persona responsable", "Archivar la bitácora de forma ordenada"] },
    { "id": "o38", "tema": "Bioseguridad", "titulo": "Limpiar y desinfectar un comedero", "pasos": ["Retirar los restos de alimento", "Lavar con agua y jabón", "Enjuagar con agua limpia", "Aplicar el desinfectante y respetar su tiempo de contacto", "Enjuagar si el producto lo indica y dejar secar"] },
    { "id": "o39", "tema": "Zoonosis", "titulo": "Revisarse por garrapatas después de una salida a campo", "pasos": ["Quitarse la ropa de campo y revisarla", "Revisar todo el cuerpo, incluidas axilas, ingles y cuero cabelludo", "Si hay una garrapata, retirarla con pinzas finas, tomándola lo más cerca posible de la piel", "Limpiar la zona con agua y jabón", "Lavar la ropa y estar atento a cualquier síntoma en los días siguientes"] }
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

  /* ───────────── Detective de campo: 60 escenas ───────────── */
  // Cada escena trae su consigna, la descripción de la imagen (`escena`, respaldo si la imagen
  // no existe) y 6 pistas: 3 con ok:true (los hallazgos) y 3 con ok:false (cosas que se ven en la
  // escena pero están bien hechas, o afirmaciones que no se sostienen).
  // riesgos[i] es el `why` de la i-ésima pista ok:true, en el mismo orden en que aparecen en `pistas`.
  // Las 30 primeras conservan su posición; las 30 nuevas (31 a 60) se agregan al final.
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
    },
    /* Escenas 31 a 60 (segunda tanda de Detective de campo): se agregan al final para conservar el avance guardado. */
    {
      "id": "campo-nuevo-cocina-fauna",
      "titulo": "Preparación de alimento para fauna",
      "imagen": "assets/img/retos/detective-nuevo-01-cocina-fauna.webp",
      "zonas": [{"x": 0.17, "y": 0.48, "w": 0.3, "h": 0.22}, {"x": 0.545, "y": 0.46, "w": 0.13, "h": 0.38}, {"x": 0.82, "y": 0.36, "w": 0.16, "h": 0.21}],
      "activo": true,
      "tipo": "seguridad",
      "consigna": "Observa la cocina y marca los 3 errores en la preparación del alimento de los animales.",
      "escena": "En la cocina de un centro de fauna, sobre una mesa de acero hay una charola con verduras frescas picadas y, parado dentro de la misma charola, un atomizador amarillo de limpieza. A la izquierda, en un recipiente grande, las verduras están cubiertas de moho gris. A la derecha, sobre un estante, un ratón come de un costal de granos abierto. En la tabla de madera hay zanahorias y calabacita frescas, y al fondo se ven un fregadero y un refrigerador.",
      "pistas": [
        { "t": "Verduras con moho visible en un recipiente", "ok": true, "why": "El alimento con moho no se ofrece a los animales porque puede enfermarlos. Se desecha y se prepara alimento fresco." },
        { "t": "Zanahorias y calabacita frescas sobre la tabla", "ok": false, "why": "Las verduras frescas y sin moho son lo esperado para preparar el alimento. No es un error." },
        { "t": "Atomizador de limpieza dentro de la bandeja de alimento", "ok": true, "why": "Los productos de limpieza no deben tocar el alimento ni estar junto a él: dejan residuos que pueden intoxicar a los animales." },
        { "t": "Hay un fregadero con llave al fondo de la cocina", "ok": false, "why": "Contar con un fregadero para lavar manos y utensilios ayuda a la higiene. No es un error." },
        { "t": "Ratón comiendo en un costal de granos abierto", "ok": true, "why": "Un costal abierto atrae plagas. El alimento se guarda en recipientes cerrados para que no entren roedores, que además lo contaminan." },
        { "t": "El refrigerador del fondo es la causa del moho", "ok": false, "why": "No se sostiene: el moho aparece por alimento viejo o guardado húmedo, no por tener refrigerador. Lo que está mal es dejar alimento con moho." }
      ],
      "riesgos": [
        "El alimento con moho no se ofrece a los animales porque puede enfermarlos. Se desecha y se prepara alimento fresco.",
        "Los productos de limpieza no deben tocar el alimento ni estar junto a él: dejan residuos que pueden intoxicar a los animales.",
        "Un costal abierto atrae plagas. El alimento se guarda en recipientes cerrados para que no entren roedores, que además lo contaminan."
      ]
    },
    {
      "id": "campo-nuevo-estanque-residuos",
      "titulo": "Estanque de educación ambiental",
      "imagen": "assets/img/retos/detective-nuevo-02-estanque-residuos.webp",
      "zonas": [{"x": 0.3, "y": 0.42, "w": 0.14, "h": 0.11}, {"x": 0.55, "y": 0.72, "w": 0.32, "h": 0.22}, {"x": 0.89, "y": 0.4, "w": 0.2, "h": 0.28}],
      "activo": true,
      "tipo": "conservacion",
      "consigna": "Observa el estanque y marca los 3 problemas que ponen en riesgo a los animales y al agua.",
      "escena": "En un estanque de educación ambiental, una tortuga nada cerca de unos aros de plástico de empaque que flotan en el agua. En primer plano, la rejilla metálica del desagüe está en el suelo y deja el pozo abierto. A la derecha, una botella de aceite negro volcada sobre las rocas derrama aceite que llega al agua y forma manchas. Al fondo, dos visitantes observan desde una plataforma de madera y hay plantas acuáticas y nenúfares.",
      "pistas": [
        { "t": "Dos visitantes observan desde una plataforma de madera", "ok": false, "why": "Observar desde una plataforma, a distancia, es una buena práctica. No es un error." },
        { "t": "Aros plásticos flotando junto a la tortuga", "ok": true, "why": "Los aros de plástico pueden atrapar o lastimar a los animales y no se degradan. La basura no se deja en el agua: se recoge y se lleva a su lugar." },
        { "t": "Hay nenúfares y plantas acuáticas en el estanque", "ok": false, "why": "Las plantas acuáticas dan refugio y sombra a los animales. No es un error." },
        { "t": "Rejilla del desagüe quitada, con el pozo abierto", "ok": true, "why": "Sin la rejilla el desagüe queda abierto: pueden caer personas o animales y entrar basura. La rejilla debe estar colocada." },
        { "t": "La tortuga está en peligro solo por estar en el estanque", "ok": false, "why": "No se sostiene: el estanque es su hábitat. El riesgo viene de los residuos y del aceite, no de que la tortuga esté ahí." },
        { "t": "Botella de aceite volcada que derrama hacia el agua", "ok": true, "why": "El aceite contamina el agua y daña a los animales y a las plantas acuáticas. Los líquidos se guardan cerrados y lejos del estanque." }
      ],
      "riesgos": [
        "Los aros de plástico pueden atrapar o lastimar a los animales y no se degradan. La basura no se deja en el agua: se recoge y se lleva a su lugar.",
        "Sin la rejilla el desagüe queda abierto: pueden caer personas o animales y entrar basura. La rejilla debe estar colocada.",
        "El aceite contamina el agua y daña a los animales y a las plantas acuáticas. Los líquidos se guardan cerrados y lejos del estanque."
      ]
    },
    {
      "id": "campo-nuevo-observacion-murcielagos",
      "titulo": "Observación de murciélagos al anochecer",
      "imagen": "assets/img/retos/detective-nuevo-03-observacion-murcielagos.webp",
      "zonas": [{"x": 0.14, "y": 0.32, "w": 0.18, "h": 0.2}, {"x": 0.47, "y": 0.6, "w": 0.14, "h": 0.3}, {"x": 0.87, "y": 0.73, "w": 0.16, "h": 0.3}],
      "activo": true,
      "tipo": "bienestar",
      "consigna": "Observa la salida de los murciélagos y marca las 3 acciones que los perturban.",
      "escena": "Al anochecer, un grupo observa una cueva de la que salen murciélagos. A la izquierda, un reflector sobre un tripié amarillo ilumina directamente la entrada de la cueva. Al centro, una persona de pie toma una fotografía con flash junto a la salida. A la derecha hay una bocina portátil grande junto a un observador sentado. Otras dos personas están sentadas en el suelo, a distancia, y varios murciélagos vuelan en el cielo del atardecer.",
      "pistas": [
        { "t": "Reflector blanco dirigido a la entrada de la cueva", "ok": true, "why": "La luz intensa desorienta a los murciélagos y puede alterar su salida. Se observa con la menor luz posible." },
        { "t": "Dos personas observan sentadas y a distancia", "ok": false, "why": "Observar sentado, a distancia y sin molestar es lo recomendable. No es un error." },
        { "t": "Varios murciélagos vuelan en el cielo del atardecer", "ok": false, "why": "Es lo que se quiere observar: que los murciélagos salgan y vuelen con normalidad. No es un error." },
        { "t": "Visitante con flash junto a la salida de los murciélagos", "ok": true, "why": "El flash molesta a los murciélagos y los puede asustar al salir. En la observación de fauna no se usa flash." },
        { "t": "Bocina portátil colocada frente a la cueva", "ok": true, "why": "El ruido de una bocina perturba a los murciélagos, que se orientan por sonido. Se observa en silencio." },
        { "t": "A los murciélagos hay que ahuyentarlos con luz", "ok": false, "why": "No se sostiene: los murciélagos no se ahuyentan con luz ni ruido. Perturbarlos es justo lo que se evita en la observación." }
      ],
      "riesgos": [
        "La luz intensa desorienta a los murciélagos y puede alterar su salida. Se observa con la menor luz posible.",
        "El flash molesta a los murciélagos y los puede asustar al salir. En la observación de fauna no se usa flash.",
        "El ruido de una bocina perturba a los murciélagos, que se orientan por sonido. Se observa en silencio."
      ]
    },
    {
      "id": "campo-nuevo-humedal-sendero",
      "titulo": "Recorrido por un humedal",
      "imagen": "assets/img/retos/detective-nuevo-04-humedal-sendero.webp",
      "zonas": [{"x": 0.18, "y": 0.38, "w": 0.2, "h": 0.58}, {"x": 0.53, "y": 0.42, "w": 0.24, "h": 0.3}, {"x": 0.83, "y": 0.78, "w": 0.3, "h": 0.22}],
      "activo": true,
      "tipo": "conservacion",
      "consigna": "Observa el humedal y marca los 3 comportamientos o residuos que dañan el sitio.",
      "escena": "Un visitante con mochila y sombrero camina por el borde de una pasarela de madera y pisa los tules y las plantas del humedal. En el agua, entre los juncos, hay un hilo de pesca enredado con un flotador rojo y blanco. En la orilla enlodada hay botellas de plástico y envolturas tiradas. Al fondo, una garza está parada en el agua tranquila y otra pasarela cruza el humedal.",
      "pistas": [
        { "t": "Una garza descansa en el agua, a lo lejos", "ok": false, "why": "Observar a la garza a distancia, sin molestarla, es lo esperado. No es un error." },
        { "t": "Persona que abandona la pasarela y pisa las plantas del humedal", "ok": true, "why": "Pisar la vegetación del humedal la daña y puede destruir nidos y refugios. Se camina solo por las pasarelas y los senderos marcados." },
        { "t": "Hilo de pesca abandonado entre los juncos", "ok": true, "why": "El hilo de pesca abandonado puede enredar y lastimar a aves y otros animales. Se recoge y se desecha correctamente." },
        { "t": "Hay una pasarela de madera que cruza el humedal", "ok": false, "why": "Las pasarelas permiten recorrer el sitio sin pisar la vegetación. No es un error." },
        { "t": "El humedal está contaminado porque el agua está quieta", "ok": false, "why": "No se sostiene: el agua tranquila es normal en un humedal. Lo que contamina son la basura y el hilo abandonado." },
        { "t": "Botellas y envolturas en la orilla", "ok": true, "why": "La basura contamina el agua y los animales pueden ingerirla o enredarse. Cada persona se lleva sus residuos." }
      ],
      "riesgos": [
        "Pisar la vegetación del humedal la daña y puede destruir nidos y refugios. Se camina solo por las pasarelas y los senderos marcados.",
        "El hilo de pesca abandonado puede enredar y lastimar a aves y otros animales. Se recoge y se desecha correctamente.",
        "La basura contamina el agua y los animales pueden ingerirla o enredarse. Cada persona se lleva sus residuos."
      ]
    },
    {
      "id": "campo-nuevo-terrario-revision",
      "titulo": "Revisión de un terrario",
      "imagen": "assets/img/retos/detective-nuevo-05-terrario-revision.webp",
      "zonas": [{"x": 0.3, "y": 0.09, "w": 0.44, "h": 0.18}, {"x": 0.82, "y": 0.5, "w": 0.1, "h": 0.26}, {"x": 0.8, "y": 0.73, "w": 0.28, "h": 0.2}],
      "activo": true,
      "tipo": "bienestar",
      "consigna": "Observa el terrario y marca los 3 riesgos para el animal.",
      "escena": "Una persona de espaldas observa un terrario de vidrio con una iguana sobre un tronco. La tapa de malla del terrario está levantada y abierta. De la lámpara de calor cuelga un cable con el aislante dañado y el cobre a la vista, hasta los troncos donde el animal puede subir. A la derecha, el bebedero es un recipiente de piedra que solo tiene piedras, sin agua. Hay una cueva de corteza, plantas y sustrato de corteza.",
      "pistas": [
        { "t": "Una lámpara de calor ilumina una zona de asoleo", "ok": false, "why": "Dar calor y luz a un reptil forma parte de su manejo. No es un error." },
        { "t": "Hay una cueva de corteza para que el animal se esconda", "ok": false, "why": "Los refugios ayudan al bienestar del animal. No es un error." },
        { "t": "Tapa del terrario abierta, con un hueco de salida", "ok": true, "why": "Una tapa abierta deja que el animal escape y que entren otros animales. Los terrarios se mantienen cerrados." },
        { "t": "Cable pelado de la lámpara al alcance del animal", "ok": true, "why": "Un cable con el cobre expuesto puede provocar una descarga o un incendio. Los cables dañados se cambian y se mantienen fuera del alcance." },
        { "t": "La iguana está enferma porque descansa sobre el tronco", "ok": false, "why": "No se sostiene: descansar sobre un tronco es una conducta normal de una iguana. Los errores son la tapa abierta, el cable y el bebedero sin agua." },
        { "t": "Bebedero seco ocupado por piedras", "ok": true, "why": "Un bebedero sin agua deja al animal sin poder beber. Debe haber agua limpia disponible." }
      ],
      "riesgos": [
        "Una tapa abierta deja que el animal escape y que entren otros animales. Los terrarios se mantienen cerrados.",
        "Un cable con el cobre expuesto puede provocar una descarga o un incendio. Los cables dañados se cambian y se mantienen fuera del alcance.",
        "Un bebedero sin agua deja al animal sin poder beber. Debe haber agua limpia disponible."
      ]
    },
    {
      "id": "campo-nuevo-lancha-laguna",
      "titulo": "Lancha de monitoreo en la laguna",
      "imagen": "assets/img/retos/detective-nuevo-06-lancha-laguna.webp",
      "zonas": [{"x": 0.22, "y": 0.46, "w": 0.4, "h": 0.24}, {"x": 0.54, "y": 0.67, "w": 0.26, "h": 0.17}, {"x": 0.86, "y": 0.47, "w": 0.2, "h": 0.3}],
      "activo": true,
      "tipo": "conservacion",
      "consigna": "Observa la lancha y marca los 3 daños que causa al ambiente de la laguna.",
      "escena": "Una persona con chaleco salvavidas naranja conduce una lancha de monitoreo por una laguna. La estela de la lancha avanza hacia un nido con huevos que está casi a ras del agua, entre los juncos, a la izquierda. En el agua flota una bolsa de plástico transparente cerca de la embarcación. De un bidón rojo de combustible que está sobre la lancha caen gotas al agua, y cerca del motor hay manchas de colores. En la lancha también hay una mochila, una hielera y unos binoculares.",
      "pistas": [
        { "t": "Estela de la lancha alcanzando un nido bajo entre juncos", "ok": true, "why": "Las olas de una lancha pueden mojar o arrastrar nidos que están a ras del agua. Se navega despacio y lejos de los sitios de anidación." },
        { "t": "Bolsa plástica flotando junto a la embarcación", "ok": true, "why": "Una bolsa en el agua puede ser ingerida o enredar a los animales. Los residuos se recogen y se llevan fuera del sitio." },
        { "t": "La persona que conduce usa chaleco salvavidas", "ok": false, "why": "Usar chaleco salvavidas es una medida de seguridad correcta. No es un error." },
        { "t": "Combustible derramado desde un recipiente abierto", "ok": true, "why": "El combustible contamina el agua y daña a la fauna y a la vegetación. Se maneja en recipientes cerrados y sin derrames." },
        { "t": "Hay binoculares y equipo acomodados en la lancha", "ok": false, "why": "Llevar el equipo de observación en la lancha es normal en el monitoreo. No es un error." },
        { "t": "Los nenúfares indican que la laguna está contaminada", "ok": false, "why": "No se sostiene: los nenúfares son plantas acuáticas propias de una laguna. Lo que contamina son la bolsa y el combustible." }
      ],
      "riesgos": [
        "Las olas de una lancha pueden mojar o arrastrar nidos que están a ras del agua. Se navega despacio y lejos de los sitios de anidación.",
        "Una bolsa en el agua puede ser ingerida o enredar a los animales. Los residuos se recogen y se llevan fuera del sitio.",
        "El combustible contamina el agua y daña a la fauna y a la vegetación. Se maneja en recipientes cerrados y sin derrames."
      ]
    },
    {
      "id": "campo-nuevo-equipo-entre-recintos",
      "titulo": "Herramientas entre dos recintos",
      "imagen": "assets/img/retos/detective-nuevo-07-equipo-entre-recintos.webp",
      "zonas": [{"x": 0.46, "y": 0.5, "w": 0.74, "h": 0.14}, {"x": 0.47, "y": 0.27, "w": 0.18, "h": 0.32}, {"x": 0.77, "y": 0.85, "w": 0.2, "h": 0.14}],
      "activo": true,
      "tipo": "seguridad",
      "consigna": "Observa los dos recintos y marca los 3 errores de limpieza que pueden llevar enfermedades de un área a otra.",
      "escena": "Entre dos recintos de aves, con un guacamayo verde a la izquierda y un guacamayo rojo a la derecha, hay un pasillo de concreto. Una escoba con las cerdas sucias está atravesada entre las dos áreas. Sobre una mesa de acero hay unas botas con lodo junto a toallas limpias dobladas. En el piso, junto al recinto de la derecha, hay lodo y un comedero metálico apoyado directamente en él. Debajo de la mesa hay cajas organizadoras y al fondo se ven un muro de piedra y una manguera enrollada.",
      "pistas": [
        { "t": "La misma escoba sucia atraviesa las dos áreas", "ok": true, "why": "Compartir herramientas sucias entre áreas puede llevar gérmenes de un recinto a otro. Cada área tiene su propio equipo o se limpia y desinfecta entre usos." },
        { "t": "Las toallas limpias están dobladas sobre la mesa", "ok": false, "why": "Tener el material limpio ordenado y doblado es una buena práctica. No es un error." },
        { "t": "Botas con lodo sobre la mesa de material limpio", "ok": true, "why": "Las botas con lodo ensucian el material limpio y arrastran gérmenes. Se dejan en la entrada y el material limpio se guarda aparte." },
        { "t": "Cada recinto tiene su propia malla y su puerta", "ok": false, "why": "Separar los recintos con malla y puerta propias es lo correcto. No es un error." },
        { "t": "Comedero limpio apoyado en el suelo sucio", "ok": true, "why": "Un comedero limpio sobre un piso con lodo se contamina. Los utensilios de alimentación se mantienen elevados y lejos de lo sucio." },
        { "t": "Las aves se enferman solo por estar en recintos vecinos", "ok": false, "why": "No se sostiene: tener recintos vecinos no las enferma por sí solo. El riesgo está en compartir herramientas y material sucios." }
      ],
      "riesgos": [
        "Compartir herramientas sucias entre áreas puede llevar gérmenes de un recinto a otro. Cada área tiene su propio equipo o se limpia y desinfecta entre usos.",
        "Las botas con lodo ensucian el material limpio y arrastran gérmenes. Se dejan en la entrada y el material limpio se guarda aparte.",
        "Un comedero limpio sobre un piso con lodo se contamina. Los utensilios de alimentación se mantienen elevados y lejos de lo sucio."
      ]
    },
    {
      "id": "campo-nuevo-residuos-rio",
      "titulo": "Punto de muestreo junto al río",
      "imagen": "assets/img/retos/detective-nuevo-08-residuos-rio.webp",
      "zonas": [{"x": 0.11, "y": 0.32, "w": 0.22, "h": 0.4}, {"x": 0.65, "y": 0.29, "w": 0.24, "h": 0.22}, {"x": 0.86, "y": 0.58, "w": 0.24, "h": 0.26}],
      "activo": true,
      "tipo": "conservacion",
      "consigna": "Observa el punto de muestreo y marca las 3 fuentes de contaminación del río.",
      "escena": "Junto a un río de agua clara, un tubo corrugado negro descarga agua turbia y café directamente a la corriente. En la orilla, un bote verde de basura está volcado y deja residuos y envolturas regados entre las rocas. Más a la derecha, un bidón azul tumbado derrama un líquido verde azulado que escurre hacia el agua. Al fondo, una persona con sombrero anota en una libreta en una mesa de madera, con una mochila y equipo de campo a un lado.",
      "pistas": [
        { "t": "Una persona anota datos en una libreta junto al río", "ok": false, "why": "Registrar los datos del muestreo es parte del trabajo de campo. No es un error." },
        { "t": "Manguera de aguas sucias descargando al río", "ok": true, "why": "Una descarga de aguas sucias contamina el río y afecta a los animales y plantas que viven en él. Las aguas residuales no se vierten a la corriente." },
        { "t": "El agua del río es clara y tiene rocas", "ok": false, "why": "Un río de agua clara con rocas es una buena señal, no un problema. No es un error." },
        { "t": "Recipiente de basura volcado en la ribera", "ok": true, "why": "La basura en la ribera termina arrastrada por el agua y los animales pueden ingerirla. Los botes se mantienen en pie y la basura se recoge." },
        { "t": "El equipo de la mesa de trabajo contamina el agua", "ok": false, "why": "No se sostiene: el equipo sobre la mesa no contamina el agua. Los problemas son la descarga, la basura y el líquido derramado." },
        { "t": "Envase de líquido derramándose hacia la corriente", "ok": true, "why": "Los líquidos derramados llegan al agua y la contaminan. Se guardan cerrados y lejos de la orilla." }
      ],
      "riesgos": [
        "Una descarga de aguas sucias contamina el río y afecta a los animales y plantas que viven en él. Las aguas residuales no se vierten a la corriente.",
        "La basura en la ribera termina arrastrada por el agua y los animales pueden ingerirla. Los botes se mantienen en pie y la basura se recoge.",
        "Los líquidos derramados llegan al agua y la contaminan. Se guardan cerrados y lejos de la orilla."
      ]
    },
    {
      "id": "campo-nuevo-sendero-dunas",
      "titulo": "Sendero entre las dunas",
      "imagen": "assets/img/retos/detective-nuevo-09-sendero-dunas.webp",
      "zonas": [{"x": 0.15, "y": 0.32, "w": 0.26, "h": 0.4}, {"x": 0.52, "y": 0.5, "w": 0.22, "h": 0.4}, {"x": 0.83, "y": 0.8, "w": 0.3, "h": 0.28}],
      "activo": true,
      "tipo": "conservacion",
      "consigna": "Observa el sendero y marca las 3 acciones que dañan la duna y la playa.",
      "escena": "En una playa con dunas, un vehículo todo terreno verde está estacionado sobre la vegetación de la duna, con las huellas de las llantas marcadas en la arena. En el centro, un visitante con mochila sostiene una planta arrancada con todo y raíz, y a sus pies queda un hueco en la arena. A la derecha, botellas de plástico y envolturas están tiradas entre los pastos. Una pasarela de madera con barandal recorre la duna hasta la playa.",
      "pistas": [
        { "t": "Vehículo todo terreno sobre la vegetación de las dunas", "ok": true, "why": "Los vehículos aplastan la vegetación que sostiene la arena y pueden dañar nidos. Se usan solo los caminos y las pasarelas permitidos." },
        { "t": "Hay una pasarela de madera con barandal hacia la playa", "ok": false, "why": "Las pasarelas permiten cruzar las dunas sin pisar la vegetación. No es un error." },
        { "t": "La persona lleva mochila y sombrero para el sol", "ok": false, "why": "Protegerse del sol es una medida razonable. No es un error." },
        { "t": "Visitante que arranca una planta con raíz", "ok": true, "why": "Las plantas de las dunas sujetan la arena y protegen la costa. No se arrancan ni se llevan." },
        { "t": "Basura plástica entre los pastos", "ok": true, "why": "El plástico se queda en la duna y los animales pueden comerlo o enredarse. Cada persona se lleva su basura." },
        { "t": "Hay que retirar la arena porque la playa tiene demasiada", "ok": false, "why": "No se sostiene: la arena de la duna y de la playa forma parte del ambiente y no se quita ni se lleva." }
      ],
      "riesgos": [
        "Los vehículos aplastan la vegetación que sostiene la arena y pueden dañar nidos. Se usan solo los caminos y las pasarelas permitidos.",
        "Las plantas de las dunas sujetan la arena y protegen la costa. No se arrancan ni se llevan.",
        "El plástico se queda en la duna y los animales pueden comerlo o enredarse. Cada persona se lleva su basura."
      ]
    },
    {
      "id": "campo-nuevo-bodega-alimentos",
      "titulo": "Bodega de alimento del centro",
      "imagen": "assets/img/retos/detective-nuevo-10-bodega-alimentos.webp",
      "zonas": [{"x": 0.17, "y": 0.68, "w": 0.34, "h": 0.44}, {"x": 0.56, "y": 0.27, "w": 0.16, "h": 0.5}, {"x": 0.85, "y": 0.77, "w": 0.28, "h": 0.3}],
      "activo": true,
      "tipo": "seguridad",
      "consigna": "Observa la bodega y marca los 3 errores en el almacenamiento del alimento.",
      "escena": "En una bodega de un centro de fauna, un costal roto deja salir croquetas que se esparcen por el piso. Al centro, una caja verde de alimento tiene la tapa abierta y, justo arriba, un garrafón de líquido azul verdoso de limpieza gotea hacia el alimento. A la derecha, una charola gris contiene granos húmedos cubiertos de moho blanco y gris. Al fondo a la izquierda, una trabajadora uniformada trabaja con tazones, y en los estantes hay cajas de madera y recipientes de acero.",
      "pistas": [
        { "t": "Hay estantes metálicos y cajas para guardar cosas", "ok": false, "why": "Almacenar en estantes, lejos del piso, es una buena práctica. No es un error." },
        { "t": "Costal roto que derrama alimento en el piso", "ok": true, "why": "Un costal roto deja el alimento al alcance de las plagas y se contamina con el piso. Se pasa a recipientes cerrados y se limpia el derrame." },
        { "t": "Líquidos de limpieza colocados sobre el alimento abierto", "ok": true, "why": "El producto de limpieza puede gotear en el alimento y envenenar a los animales. Los químicos se guardan aparte y lejos de la comida." },
        { "t": "Una trabajadora uniformada trabaja al fondo", "ok": false, "why": "Trabajar con uniforme en la preparación del alimento es lo esperado. No es un error." },
        { "t": "El alimento en croquetas siempre está en mal estado", "ok": false, "why": "No se sostiene: las croquetas son un alimento común. Lo que está mal es cómo se guardan, no el tipo de alimento." },
        { "t": "Granos húmedos con moho en un recipiente", "ok": true, "why": "Los granos húmedos con moho pueden enfermar a los animales. Se desechan y el alimento se guarda seco." }
      ],
      "riesgos": [
        "Un costal roto deja el alimento al alcance de las plagas y se contamina con el piso. Se pasa a recipientes cerrados y se limpia el derrame.",
        "El producto de limpieza puede gotear en el alimento y envenenar a los animales. Los químicos se guardan aparte y lejos de la comida.",
        "Los granos húmedos con moho pueden enfermar a los animales. Se desechan y el alimento se guarda seco."
      ]
    },
    {
      "id": "campo-nuevo-borde-carretera",
      "titulo": "Paso de fauna junto a carretera",
      "imagen": "assets/img/retos/detective-nuevo-11-borde-carretera.webp",
      "zonas": [{"x": 0.2, "y": 0.43, "w": 0.3, "h": 0.32}, {"x": 0.58, "y": 0.45, "w": 0.18, "h": 0.4}, {"x": 0.82, "y": 0.8, "w": 0.3, "h": 0.26}],
      "activo": true,
      "tipo": "conservacion",
      "consigna": "Observa el paso de fauna y marca los 3 problemas que ponen en riesgo a los animales.",
      "escena": "Junto a una carretera hay un paso de fauna de concreto, un túnel que cruza bajo el camino. Su entrada está tapada con piedras, tablones y escombros. La malla verde que guía a los animales hacia el paso está rota y deja un hueco hacia la carretera. En el acotamiento hay un recipiente de comida desechable abierto, bolsas de plástico y una bolsa negra de basura. Arriba, entre los árboles, un coatí camina lejos del camino.",
      "pistas": [
        { "t": "Un coatí camina entre los árboles, lejos de la carretera", "ok": false, "why": "Que el animal esté en su hábitat, lejos de la carretera, no es un error." },
        { "t": "La malla verde sigue en pie a lo largo de la pendiente", "ok": false, "why": "Una malla en buen estado cumple su función de guiar a los animales. No es un error." },
        { "t": "Entrada del paso de fauna bloqueada con escombros", "ok": true, "why": "Un paso bloqueado ya no sirve y los animales intentan cruzar por la carretera. La entrada debe mantenerse despejada." },
        { "t": "Malla rota que deja un hueco hacia la carretera", "ok": true, "why": "La malla guía a los animales hacia el paso. Un hueco los deja salir a la carretera, donde pueden ser atropellados." },
        { "t": "El paso de fauna es peligroso porque es oscuro", "ok": false, "why": "No se sostiene: un paso bajo el camino está hecho para que los animales crucen con seguridad. Lo que lo vuelve inútil es el bloqueo." },
        { "t": "Restos de comida abandonados en el acotamiento", "ok": true, "why": "La comida atrae a los animales hacia la carretera y los pone en riesgo. No se deja comida ni basura en el camino." }
      ],
      "riesgos": [
        "Un paso bloqueado ya no sirve y los animales intentan cruzar por la carretera. La entrada debe mantenerse despejada.",
        "La malla guía a los animales hacia el paso. Un hueco los deja salir a la carretera, donde pueden ser atropellados.",
        "La comida atrae a los animales hacia la carretera y los pone en riesgo. No se deja comida ni basura en el camino."
      ]
    },
    {
      "id": "campo-nuevo-vivero-restauracion",
      "titulo": "Vivero para restauración",
      "imagen": "assets/img/retos/detective-nuevo-12-vivero-restauracion.webp",
      "zonas": [{"x": 0.16, "y": 0.73, "w": 0.3, "h": 0.38}, {"x": 0.48, "y": 0.72, "w": 0.3, "h": 0.28}, {"x": 0.84, "y": 0.75, "w": 0.3, "h": 0.3}],
      "activo": true,
      "tipo": "conservacion",
      "consigna": "Observa el vivero y marca los 3 descuidos que perjudican a las plantas y a los recursos.",
      "escena": "En un vivero para restauración hay bancos con plantas en bolsas negras, ordenadas y a la sombra. En el piso, varias plántulas están tiradas con la raíz y la tierra a la vista. Una manguera sale de una llave y deja correr el agua sobre el camino de grava, formando un charco. A la derecha, en un contenedor negro con tierra para plantar, hay pedazos de plástico y envolturas de colores mezclados con la tierra, y una pala clavada. Al fondo hay un costal y más plantas bajo malla sombra.",
      "pistas": [
        { "t": "Plántulas tiradas con las raíces expuestas", "ok": true, "why": "Las raíces expuestas se secan y la planta puede morir. Las plántulas se mantienen en su recipiente, con tierra y a la sombra." },
        { "t": "Manguera abierta desperdiciando agua en el camino", "ok": true, "why": "El agua se desperdicia y no llega a las plantas. El riego se aplica a las plantas y la llave se cierra al terminar." },
        { "t": "Las plantas en bolsas negras están ordenadas en bancos", "ok": false, "why": "Mantener las plantas ordenadas y elevadas es una buena práctica. No es un error." },
        { "t": "Residuos plásticos mezclados con la tierra para plantar", "ok": true, "why": "El plástico en la tierra no se degrada y estorba a las raíces. La tierra para plantar debe estar limpia." },
        { "t": "Hay malla sombra sobre una parte del vivero", "ok": false, "why": "La sombra protege a las plántulas del sol fuerte. No es un error." },
        { "t": "Usar una pala en el vivero daña a las plantas", "ok": false, "why": "No se sostiene: la pala es una herramienta normal para preparar la tierra. El problema es el plástico mezclado en ella." }
      ],
      "riesgos": [
        "Las raíces expuestas se secan y la planta puede morir. Las plántulas se mantienen en su recipiente, con tierra y a la sombra.",
        "El agua se desperdicia y no llega a las plantas. El riego se aplica a las plantas y la llave se cierra al terminar.",
        "El plástico en la tierra no se degrada y estorba a las raíces. La tierra para plantar debe estar limpia."
      ]
    },
    {
      "id": "campo-nuevo-manglar-limpieza",
      "titulo": "Jornada en el manglar",
      "imagen": "assets/img/retos/detective-nuevo-13-manglar-limpieza.webp",
      "zonas": [{"x": 0.17, "y": 0.67, "w": 0.34, "h": 0.44}, {"x": 0.54, "y": 0.22, "w": 0.22, "h": 0.32}, {"x": 0.82, "y": 0.58, "w": 0.3, "h": 0.54}],
      "activo": true,
      "tipo": "conservacion",
      "consigna": "Observa la jornada y marca las 3 acciones que dañan el manglar.",
      "escena": "En un manglar, a la izquierda hay un costal blanco abierto con botellas, envolturas y otros residuos que se salen y quedan entre las raíces. Al centro, una mochila cuelga de una rama de mangle que está quebrada. A la derecha, una persona con guantes lava algo con una manguera sobre una mesa de madera, y el agua con espuma escurre hacia las raíces y el lodo. Al fondo a la izquierda, otra persona se aleja con una bolsa de basura.",
      "pistas": [
        { "t": "Bolsas de basura abiertas que vuelven a dispersar residuos", "ok": true, "why": "Una bolsa abierta deja salir los residuos, que terminan de nuevo entre las raíces. Las bolsas se cierran y se sacan del manglar." },
        { "t": "Una persona recoge residuos en una bolsa, al fondo", "ok": false, "why": "Recoger la basura en bolsas es parte de la limpieza. No es un error." },
        { "t": "Rama de manglar rota para colgar equipo", "ok": true, "why": "Romper ramas daña al mangle, que protege la costa y da refugio a muchas especies. El equipo se lleva o se coloca sin dañar la vegetación." },
        { "t": "Las raíces del mangle sobresalen del lodo", "ok": false, "why": "Las raíces aéreas son una característica normal del mangle. No es un error." },
        { "t": "Manguera derramando agua jabonosa hacia las raíces", "ok": true, "why": "El jabón contamina el agua y el suelo del manglar. El lavado se hace fuera del manglar y sin verter detergentes." },
        { "t": "Participar en una jornada de limpieza daña el manglar", "ok": false, "why": "No se sostiene: limpiar ayuda, siempre que se haga sin dañar la vegetación y sin dejar residuos." }
      ],
      "riesgos": [
        "Una bolsa abierta deja salir los residuos, que terminan de nuevo entre las raíces. Las bolsas se cierran y se sacan del manglar.",
        "Romper ramas daña al mangle, que protege la costa y da refugio a muchas especies. El equipo se lleva o se coloca sin dañar la vegetación.",
        "El jabón contamina el agua y el suelo del manglar. El lavado se hace fuera del manglar y sin verter detergentes."
      ]
    },
    {
      "id": "campo-nuevo-caja-nido",
      "titulo": "Inspección de una caja nido",
      "imagen": "assets/img/retos/detective-nuevo-14-caja-nido.webp",
      "zonas": [{"x": 0.37, "y": 0.15, "w": 0.42, "h": 0.3}, {"x": 0.265, "y": 0.535, "w": 0.11, "h": 0.09}, {"x": 0.64, "y": 0.71, "w": 0.3, "h": 0.32}],
      "activo": true,
      "tipo": "seguridad",
      "consigna": "Observa la inspección y marca los 3 problemas en la caja nido.",
      "escena": "Una persona de espaldas, con sombrero y libreta, inspecciona una caja nido de madera sujeta al tronco de un roble. La tapa superior está levantada y la puerta lateral de la caja está abierta; dentro, sobre el nido de ramitas y musgo, hay un pedazo de cuerda azul y un plástico transparente enredados. En el frente, junto al orificio de entrada, sobresale una pieza metálica, como un clavo largo. En una rama cercana hay un ave pequeña.",
      "pistas": [
        { "t": "La persona anota lo que observa en una libreta", "ok": false, "why": "Registrar lo observado es parte del monitoreo. No es un error." },
        { "t": "Caja nido con la tapa abierta, sin volver a cerrar", "ok": true, "why": "Una caja abierta deja el nido expuesto a la lluvia, al frío y a los depredadores. Al terminar la revisión se cierra bien." },
        { "t": "La caja está fija al tronco con tornillos", "ok": false, "why": "Una caja bien sujeta al tronco es más segura. No es un error." },
        { "t": "Clavo o pieza metálica sobresaliendo junto a la entrada", "ok": true, "why": "Una pieza metálica que sobresale puede lastimar al ave cuando entra o sale. Se retira o se hunde y se revisa la caja." },
        { "t": "Revisar una caja nido es un error en sí mismo", "ok": false, "why": "No se sostiene: revisar las cajas nido es una práctica de monitoreo. El problema es cómo se deja la caja, no que se revise." },
        { "t": "Residuos de cuerda y plástico dentro de la caja", "ok": true, "why": "La cuerda y el plástico pueden enredar a las crías o a los adultos. No deben formar parte del nido: se retiran con cuidado durante la revisión." }
      ],
      "riesgos": [
        "Una caja abierta deja el nido expuesto a la lluvia, al frío y a los depredadores. Al terminar la revisión se cierra bien.",
        "Una pieza metálica que sobresale puede lastimar al ave cuando entra o sale. Se retira o se hunde y se revisa la caja.",
        "La cuerda y el plástico pueden enredar a las crías o a los adultos. No deben formar parte del nido: se retiran con cuidado durante la revisión."
      ]
    },
    {
      "id": "campo-nuevo-laboratorio-agua",
      "titulo": "Mesa de análisis de agua",
      "imagen": "assets/img/retos/detective-nuevo-15-laboratorio-agua.webp",
      "zonas": [{"x": 0.24, "y": 0.34, "w": 0.44, "h": 0.32}, {"x": 0.58, "y": 0.42, "w": 0.22, "h": 0.14}, {"x": 0.8, "y": 0.86, "w": 0.34, "h": 0.2}],
      "activo": true,
      "tipo": "seguridad",
      "consigna": "Observa la mesa de análisis y marca los 3 riesgos para las muestras y para las personas.",
      "escena": "En una mesa de trabajo de un laboratorio de campo al aire libre hay tres frascos de vidrio con muestras de agua, sin tapa y junto a un ventilador de mesa. En el centro de la mesa hay un sándwich sobre un papel. Al fondo, una persona usa un microscopio y otra observa con binoculares. En el piso hay un charco, y una regleta con varios cables conectados está dentro del charco. Sobre la mesa también hay una hoja de registro y, debajo, cajas de plástico.",
      "pistas": [
        { "t": "Frascos de muestras abiertos junto a un ventilador", "ok": true, "why": "El ventilador mueve el polvo y puede contaminar las muestras abiertas. Los frascos se mantienen tapados mientras no se usan." },
        { "t": "Una persona observa muestras con un microscopio", "ok": false, "why": "Usar el microscopio es parte del análisis. No es un error." },
        { "t": "Hay una hoja de registro junto a las muestras", "ok": false, "why": "Anotar los datos es una buena práctica. No es un error." },
        { "t": "Sándwich sobre la mesa de muestras", "ok": true, "why": "No se come en la mesa de muestras: se contamina el trabajo y puede haber riesgo para la salud. Los alimentos van en otra área." },
        { "t": "Cables eléctricos metidos en un charco", "ok": true, "why": "El agua y la electricidad juntas pueden provocar una descarga. Los cables se mantienen secos y lejos del agua." },
        { "t": "Los frascos de vidrio son peligrosos por ser transparentes", "ok": false, "why": "No se sostiene: el vidrio transparente permite ver la muestra. El riesgo está en dejar los frascos abiertos." }
      ],
      "riesgos": [
        "El ventilador mueve el polvo y puede contaminar las muestras abiertas. Los frascos se mantienen tapados mientras no se usan.",
        "No se come en la mesa de muestras: se contamina el trabajo y puede haber riesgo para la salud. Los alimentos van en otra área.",
        "El agua y la electricidad juntas pueden provocar una descarga. Los cables se mantienen secos y lejos del agua."
      ]
    },
    {
      "id": "campo-nuevo-observacion-primates",
      "titulo": "Mirador de fauna en la selva",
      "imagen": "assets/img/retos/detective-nuevo-16-observacion-primates.webp",
      "zonas": [{"x": 0.22, "y": 0.32, "w": 0.3, "h": 0.34}, {"x": 0.55, "y": 0.54, "w": 0.24, "h": 0.56}, {"x": 0.84, "y": 0.83, "w": 0.24, "h": 0.3}],
      "activo": true,
      "tipo": "bienestar",
      "consigna": "Observa el mirador y marca los 3 comportamientos de visitantes que ponen en riesgo a la fauna o a las personas.",
      "escena": "En un mirador de madera con vista a una selva y a un lago, una visitante de espaldas extiende un plátano hacia un mono que está en una rama cercana. Al centro, otro visitante pasa una pierna por encima del barandal para salirse de la zona del mirador. A la derecha, dos personas observan desde la plataforma con cámara y mochila, y junto al bosque hay una bolsa de basura negra abierta con envolturas y una botella.",
      "pistas": [
        { "t": "Dos visitantes observan desde la plataforma, detrás del barandal", "ok": false, "why": "Observar desde la plataforma es lo correcto. No es un error." },
        { "t": "Visitante ofrece comida a un mono silvestre", "ok": true, "why": "Dar de comer a la fauna silvestre cambia su conducta y puede enfermarla o volverla agresiva. Se observa sin alimentarla." },
        { "t": "Persona que cruza la barrera del mirador", "ok": true, "why": "Cruzar la barrera pone en riesgo a la persona y perturba a la fauna. El mirador se usa desde la plataforma." },
        { "t": "Hay un barandal de madera en el mirador", "ok": false, "why": "El barandal marca el límite seguro. No es un error." },
        { "t": "Ver monos desde el mirador es una falta", "ok": false, "why": "No se sostiene: observar fauna silvestre desde un mirador es una actividad habitual. Las faltas son alimentarla, cruzar la barrera y dejar basura." },
        { "t": "Bolsa de basura abierta junto al bosque", "ok": true, "why": "La basura abierta atrae a la fauna y contamina el sitio. Se cierra y se lleva a los contenedores." }
      ],
      "riesgos": [
        "Dar de comer a la fauna silvestre cambia su conducta y puede enfermarla o volverla agresiva. Se observa sin alimentarla.",
        "Cruzar la barrera pone en riesgo a la persona y perturba a la fauna. El mirador se usa desde la plataforma.",
        "La basura abierta atrae a la fauna y contamina el sitio. Se cierra y se lleva a los contenedores."
      ]
    },
    {
      "id": "campo-nuevo-iguana-recinto",
      "titulo": "Recinto exterior de iguanas",
      "imagen": "assets/img/retos/detective-nuevo-17-iguana-recinto.webp",
      "zonas": [{"x": 0.12, "y": 0.46, "w": 0.24, "h": 0.36}, {"x": 0.45, "y": 0.31, "w": 0.18, "h": 0.44}, {"x": 0.86, "y": 0.69, "w": 0.22, "h": 0.28}],
      "activo": true,
      "tipo": "bienestar",
      "consigna": "Observa el recinto exterior y marca las 3 fallas que afectan a los animales.",
      "escena": "En un recinto exterior para iguanas hay rocas, plantas y troncos. A la izquierda, la malla de la cerca tiene un hueco roto por el que se ve el camino de los visitantes. En el centro, una rama grande de asoleo está quebrada y cuelga de sus amarres. A la derecha, un bebedero hecho con un tubo grande de concreto está volcado y el agua se derramó sobre la tierra. Sobre una roca grande, una iguana descansa al sol. Del otro lado de la malla, dos visitantes caminan por el camino.",
      "pistas": [
        { "t": "Una iguana descansa al sol sobre una roca", "ok": false, "why": "Asolearse es una conducta normal de las iguanas. No es un error." },
        { "t": "Hay plantas y rocas que dan refugio a los animales", "ok": false, "why": "Los refugios y la vegetación mejoran el bienestar. No es un error." },
        { "t": "Malla con un hueco de salida", "ok": true, "why": "Un hueco en la malla permite que los animales escapen o que entren otros. La cerca se repara de inmediato." },
        { "t": "Rama de asoleo rota y colgando", "ok": true, "why": "Una rama rota puede caer sobre los animales o dejarlos sin un lugar seguro para asolearse. Se repara o se cambia." },
        { "t": "Los visitantes del camino son la causa del hueco en la malla", "ok": false, "why": "No se sostiene: nada en la imagen indica quién rompió la malla. Lo que importa es repararla." },
        { "t": "Bebedero volcado, sin agua disponible", "ok": true, "why": "Si el bebedero está volcado, los animales no tienen agua para beber. Debe estar firme y con agua limpia." }
      ],
      "riesgos": [
        "Un hueco en la malla permite que los animales escapen o que entren otros. La cerca se repara de inmediato.",
        "Una rama rota puede caer sobre los animales o dejarlos sin un lugar seguro para asolearse. Se repara o se cambia.",
        "Si el bebedero está volcado, los animales no tienen agua para beber. Debe estar firme y con agua limpia."
      ]
    },
    {
      "id": "campo-nuevo-ribera-restauracion",
      "titulo": "Restauración de una ribera",
      "imagen": "assets/img/retos/detective-nuevo-18-ribera-restauracion.webp",
      "zonas": [{"x": 0.19, "y": 0.4, "w": 0.3, "h": 0.3}, {"x": 0.54, "y": 0.28, "w": 0.42, "h": 0.32}, {"x": 0.8, "y": 0.55, "w": 0.22, "h": 0.48}],
      "activo": true,
      "tipo": "conservacion",
      "consigna": "Observa la ribera y marca los 3 problemas de la obra de restauración.",
      "escena": "En la ribera de un arroyo de agua clara se siembran arbolitos con estacas. A la izquierda, costales de escombro y piedras tapan un cauce lateral del arroyo. Una malla plástica naranja está tendida sobre las plantas nuevas. A la derecha, una motobomba con una manguera verde está sobre la tierra y un aceite oscuro escurre desde ella por la orilla hacia el agua. Se ven las rocas del arroyo y montañas al fondo.",
      "pistas": [
        { "t": "Costales de escombro tapando el cauce lateral", "ok": true, "why": "Tapar el cauce cambia el paso del agua y puede dañar la vegetación y a los animales. Los materiales no se dejan en el cauce." },
        { "t": "Malla plástica abandonada sobre plantas nuevas", "ok": true, "why": "La malla puede enredar a los animales y dañar a las plantas jóvenes. Si ya no se usa, se retira." },
        { "t": "Los arbolitos nuevos tienen estacas de apoyo", "ok": false, "why": "Las estacas ayudan a que las plantas jóvenes crezcan derechas. No es un error." },
        { "t": "Aceite derramado desde una herramienta hacia el agua", "ok": true, "why": "El aceite contamina el agua del arroyo. Los equipos con motor se revisan y se usan lejos del agua." },
        { "t": "El arroyo tiene rocas y agua corriendo", "ok": false, "why": "Es lo esperado en un arroyo. No es un error." },
        { "t": "Sembrar árboles en la ribera daña el arroyo", "ok": false, "why": "No se sostiene: restaurar la ribera con plantas ayuda al arroyo. Lo que daña son el escombro, la malla y el aceite." }
      ],
      "riesgos": [
        "Tapar el cauce cambia el paso del agua y puede dañar la vegetación y a los animales. Los materiales no se dejan en el cauce.",
        "La malla puede enredar a los animales y dañar a las plantas jóvenes. Si ya no se usa, se retira.",
        "El aceite contamina el agua del arroyo. Los equipos con motor se revisan y se usan lejos del agua."
      ]
    },
    {
      "id": "campo-nuevo-equipo-campamento",
      "titulo": "Revisión del equipo de campo",
      "imagen": "assets/img/retos/detective-nuevo-19-equipo-campamento.webp",
      "zonas": [{"x": 0.19, "y": 0.56, "w": 0.34, "h": 0.46}, {"x": 0.51, "y": 0.52, "w": 0.3, "h": 0.44}, {"x": 0.81, "y": 0.75, "w": 0.32, "h": 0.4}],
      "activo": true,
      "tipo": "seguridad",
      "consigna": "Observa el equipo de campo y marca los 3 artículos en mal estado que no deben llevarse.",
      "escena": "Sobre una lona verde, en un campamento de campo, hay unas botas de montaña muy gastadas, con la suela despegada y colgando. En el centro hay una caja rígida abierta y vacía, que corresponde al botiquín del grupo. A la derecha hay una linterna con la tapa abierta y tres pilas con sarro blanco y verdoso. Al fondo, dos integrantes del grupo acomodan equipo junto a una camioneta, y hay un rollo de dormir y mochilas.",
      "pistas": [
        { "t": "Botas con la suela desprendida", "ok": true, "why": "Unas botas con la suela despegada pueden hacer tropezar o lastimar el pie en terreno irregular. Se reparan o se cambian antes de salir." },
        { "t": "El equipo está ordenado sobre una lona", "ok": false, "why": "Mantener el equipo ordenado ayuda a revisarlo y a no perder piezas. No es un error." },
        { "t": "Botiquín abierto, completamente vacío", "ok": true, "why": "Un botiquín sin material no sirve en una emergencia. Se revisa y se repone antes de cada salida." },
        { "t": "El grupo carga la camioneta al fondo", "ok": false, "why": "Preparar y cargar el equipo antes de salir es lo normal. No es un error." },
        { "t": "Linterna con pilas sulfatadas", "ok": true, "why": "Las pilas con sarro pueden dañar la linterna y fallar justo cuando se necesita. Se cambian y se desechan donde corresponde." },
        { "t": "El rollo de dormir enrollado es un riesgo", "ok": false, "why": "No se sostiene: llevar el material enrollado y amarrado es una forma ordenada de transportarlo." }
      ],
      "riesgos": [
        "Unas botas con la suela despegada pueden hacer tropezar o lastimar el pie en terreno irregular. Se reparan o se cambian antes de salir.",
        "Un botiquín sin material no sirve en una emergencia. Se revisa y se repone antes de cada salida.",
        "Las pilas con sarro pueden dañar la linterna y fallar justo cuando se necesita. Se cambian y se desechan donde corresponde."
      ]
    },
    {
      "id": "campo-nuevo-puente-monitoreo",
      "titulo": "Acceso al sitio de monitoreo",
      "imagen": "assets/img/retos/detective-nuevo-20-puente-monitoreo.webp",
      "zonas": [{"x": 0.43, "y": 0.49, "w": 0.4, "h": 0.16}, {"x": 0.7, "y": 0.26, "w": 0.16, "h": 0.32}, {"x": 0.62, "y": 0.79, "w": 0.44, "h": 0.26}],
      "activo": true,
      "tipo": "seguridad",
      "consigna": "Observa el acceso al sitio de monitoreo y marca los 3 peligros para quien lo cruza.",
      "escena": "Un puente de madera cruza un arroyo en un sendero. En la parte delantera del puente faltan tablones y queda un hueco por el que se ve el agua. En el costado derecho, un barandal está roto y la barra queda inclinada. En el camino de tierra de la entrada hay un cable negro suelto, extendido y enroscado, que atraviesa el acceso. Del otro lado, el sendero sigue entre árboles y rocas con musgo.",
      "pistas": [
        { "t": "El puente es de madera y por eso es inseguro", "ok": false, "why": "No se sostiene: la madera puede ser segura si está en buen estado. Lo inseguro son el hueco y el barandal roto." },
        { "t": "Tablón faltante que deja un hueco en el puente", "ok": true, "why": "Un hueco en el piso puede provocar caídas y lesiones. El puente no se usa hasta repararlo y se avisa al responsable." },
        { "t": "Hay rocas con musgo a un lado del camino", "ok": false, "why": "Las rocas con musgo son parte del paisaje. No es un error." },
        { "t": "Barandal roto en un costado", "ok": true, "why": "Sin barandal firme es más fácil caer al arroyo. Se repara o se señaliza el riesgo." },
        { "t": "El sendero de tierra al otro lado del puente se ve marcado", "ok": false, "why": "Un sendero definido ayuda a orientarse. No es un error." },
        { "t": "Cable suelto atravesando el acceso", "ok": true, "why": "Un cable tendido en el paso puede hacer tropezar. Se recoge o se fija y se señaliza." }
      ],
      "riesgos": [
        "Un hueco en el piso puede provocar caídas y lesiones. El puente no se usa hasta repararlo y se avisa al responsable.",
        "Sin barandal firme es más fácil caer al arroyo. Se repara o se señaliza el riesgo.",
        "Un cable tendido en el paso puede hacer tropezar. Se recoge o se fija y se señaliza."
      ]
    },
    {
      "id": "campo-nuevo-anfibios-cuarentena",
      "titulo": "Área de mantenimiento de anfibios",
      "imagen": "assets/img/retos/detective-nuevo-21-anfibios-cuarentena.webp",
      "zonas": [{"x": 0.22, "y": 0.39, "w": 0.32, "h": 0.18}, {"x": 0.54, "y": 0.29, "w": 0.2, "h": 0.2}, {"x": 0.81, "y": 0.49, "w": 0.14, "h": 0.66}],
      "activo": true,
      "tipo": "seguridad",
      "consigna": "Observa el área de mantenimiento y marca los 3 errores de bioseguridad con los anfibios.",
      "escena": "En un área de mantenimiento de anfibios hay, sobre una mesa de madera, dos acuarios con agua y plantas y un terrario con puerta de vidrio. Una red de manejo sucia con lodo está apoyada en el borde del primer acuario y llega hasta el segundo. Al centro, una persona de espaldas sostiene un envase blanco de limpieza abierto, inclinado sobre el segundo acuario y con gotas cayendo. A la derecha, la puerta del terrario está abierta, con una rana verde dentro. En los acuarios hay un ajolote y una rana moteada.",
      "pistas": [
        { "t": "Red de manejo sucia compartida entre los dos acuarios", "ok": true, "why": "Una red sucia que pasa de un acuario a otro puede llevar enfermedades entre los animales. Cada acuario tiene su propia red o se desinfecta entre usos." },
        { "t": "Hay plantas y un refugio de barro dentro de los acuarios", "ok": false, "why": "Las plantas y los refugios mejoran el bienestar. No es un error." },
        { "t": "Hay un fregadero al fondo del área", "ok": false, "why": "Tener dónde lavarse las manos y el equipo es parte de la bioseguridad. No es un error." },
        { "t": "Envase de limpieza abierto en el borde del acuario", "ok": true, "why": "Los productos de limpieza pueden caer al agua y dañar a los anfibios, que absorben sustancias por la piel. Se usan lejos de los animales y se mantienen cerrados." },
        { "t": "Puerta del terrario abierta", "ok": true, "why": "Con la puerta abierta el animal puede escapar y pueden entrar contaminantes. Se cierra al terminar de trabajar." },
        { "t": "Los anfibios no deben tener agua en el acuario", "ok": false, "why": "No se sostiene: los anfibios acuáticos necesitan agua limpia. El problema es el trato del equipo y de los químicos." }
      ],
      "riesgos": [
        "Una red sucia que pasa de un acuario a otro puede llevar enfermedades entre los animales. Cada acuario tiene su propia red o se desinfecta entre usos.",
        "Los productos de limpieza pueden caer al agua y dañar a los anfibios, que absorben sustancias por la piel. Se usan lejos de los animales y se mantienen cerrados.",
        "Con la puerta abierta el animal puede escapar y pueden entrar contaminantes. Se cierra al terminar de trabajar."
      ]
    },
    {
      "id": "campo-nuevo-plastico-fauna-costera",
      "titulo": "Residuos en una cala",
      "imagen": "assets/img/retos/detective-nuevo-22-plastico-fauna-costera.webp",
      "zonas": [{"x": 0.16, "y": 0.49, "w": 0.2, "h": 0.34}, {"x": 0.57, "y": 0.38, "w": 0.46, "h": 0.32}, {"x": 0.88, "y": 0.64, "w": 0.22, "h": 0.28}],
      "activo": true,
      "tipo": "conservacion",
      "consigna": "Observa la cala y marca los 3 residuos que ponen en riesgo a la fauna costera.",
      "escena": "En una cala rocosa con marea baja, un anillo de plástico de los que sujetan latas está enredado en las ramas de un arbusto costero. En el centro, una red de pesca verde abandonada cubre las rocas, con tres flotadores. A la derecha, un envase de aceite negro tumbado sobre las rocas gotea hacia una poza de agua. En el fondo, un ave marina descansa en las rocas y se ven el mar y los acantilados.",
      "pistas": [
        { "t": "Un ave marina descansa en las rocas del fondo", "ok": false, "why": "Que el ave descanse tranquila en su hábitat no es un error." },
        { "t": "Anillo plástico alrededor de un arbusto costero", "ok": true, "why": "Los anillos de plástico pueden atrapar a aves y a otros animales. Se retiran y se llevan a la basura." },
        { "t": "Red de pesca abandonada en las rocas", "ok": true, "why": "Las redes abandonadas pueden enredar a aves, tortugas y peces. Se retiran con cuidado." },
        { "t": "Hay algas sobre las rocas de la cala", "ok": false, "why": "Las algas son parte natural de la costa. No es un error." },
        { "t": "Las algas son lo que contamina la poza", "ok": false, "why": "No se sostiene: las algas son naturales. Lo que contamina la poza es el aceite." },
        { "t": "Envase de aceite goteando en una poza", "ok": true, "why": "El aceite contamina las pozas de marea, donde viven muchos animales pequeños. Los envases se llevan cerrados y no se dejan en la orilla." }
      ],
      "riesgos": [
        "Los anillos de plástico pueden atrapar a aves y a otros animales. Se retiran y se llevan a la basura.",
        "Las redes abandonadas pueden enredar a aves, tortugas y peces. Se retiran con cuidado.",
        "El aceite contamina las pozas de marea, donde viven muchos animales pequeños. Los envases se llevan cerrados y no se dejan en la orilla."
      ]
    },
    {
      "id": "campo-nuevo-registro-muestras",
      "titulo": "Organización de muestras de suelo",
      "imagen": "assets/img/retos/detective-nuevo-23-registro-muestras.webp",
      "zonas": [{"x": 0.2, "y": 0.58, "w": 0.4, "h": 0.46}, {"x": 0.58, "y": 0.47, "w": 0.38, "h": 0.32}, {"x": 0.8, "y": 0.78, "w": 0.36, "h": 0.32}],
      "activo": true,
      "tipo": "seguridad",
      "consigna": "Observa la mesa de trabajo y marca los 3 errores en el manejo de las muestras de suelo.",
      "escena": "Bajo una carpa en el campo, una persona vacía dos bolsas de papel con tierra de colores distintos, una roja y una oscura, sobre la misma charola blanca, donde se mezclan. Al centro hay tres bolsas de papel abiertas, de las que el viento levanta polvo de tierra. A la derecha, una pala de mano con tierra está encima de una pila de hojas blancas, y junto a ellas hay un cuaderno y unos guantes. Al fondo, dos personas trabajan en el terreno.",
      "pistas": [
        { "t": "Dos personas trabajan con herramientas en el terreno, al fondo", "ok": false, "why": "El trabajo de campo es lo esperado en un muestreo. No es un error." },
        { "t": "Hay una carpa que da sombra a la mesa de trabajo", "ok": false, "why": "La sombra protege a las personas y al material. No es un error." },
        { "t": "Tierra de bolsas distintas mezclada en una sola charola", "ok": true, "why": "Al mezclar muestras de sitios distintos ya no se sabe de dónde viene cada una y se pierde el dato. Cada muestra va en su propio recipiente y con su etiqueta." },
        { "t": "Bolsas de muestras abiertas expuestas al viento", "ok": true, "why": "El viento se lleva parte de la muestra y puede traer polvo de otro sitio. Las bolsas se cierran y se etiquetan." },
        { "t": "Usar bolsas de papel para muestras de suelo siempre está mal", "ok": false, "why": "No se sostiene: lo que falla es cómo se manejan las bolsas (abiertas y mezcladas), no el tipo de bolsa." },
        { "t": "Pala con tierra apoyada sobre papeles limpios", "ok": true, "why": "Una herramienta sucia contamina el material limpio y puede mezclar muestras. La herramienta se limpia entre una muestra y otra y se guarda aparte." }
      ],
      "riesgos": [
        "Al mezclar muestras de sitios distintos ya no se sabe de dónde viene cada una y se pierde el dato. Cada muestra va en su propio recipiente y con su etiqueta.",
        "El viento se lleva parte de la muestra y puede traer polvo de otro sitio. Las bolsas se cierran y se etiquetan.",
        "Una herramienta sucia contamina el material limpio y puede mezclar muestras. La herramienta se limpia entre una muestra y otra y se guarda aparte."
      ]
    },
    {
      "id": "campo-nuevo-centro-visitantes",
      "titulo": "Ingreso al área de fauna",
      "imagen": "assets/img/retos/detective-nuevo-24-centro-visitantes.webp",
      "zonas": [{"x": 0.15, "y": 0.45, "w": 0.2, "h": 0.8}, {"x": 0.54, "y": 0.75, "w": 0.2, "h": 0.14}, {"x": 0.85, "y": 0.31, "w": 0.24, "h": 0.44}],
      "activo": true,
      "tipo": "seguridad",
      "consigna": "Observa la entrada al área de fauna y marca los 3 problemas de seguridad y de manejo.",
      "escena": "En el pasillo de un centro de visitantes, a la izquierda, la puerta de malla del recinto de los venados está abierta y el candado cuelga sin cerrar. Dentro del recinto se ven dos venados pastando. Junto al muro de piedra bajo la malla hay un empaque de frituras abierto y pan en el piso. A la derecha, el vidrio del área de observación de un recinto con agua está agrietado, con un punto de impacto. Un barandal de madera bordea el pasillo.",
      "pistas": [
        { "t": "Puerta de acceso al recinto abierta sin cierre", "ok": true, "why": "Una puerta abierta permite que los animales salgan o que las personas entren. El acceso se cierra con seguro." },
        { "t": "Comida humana colocada junto a la malla", "ok": true, "why": "La comida humana puede atraer a los animales a la malla y enfermarlos. Los visitantes no dejan comida ni la dan a los animales." },
        { "t": "Hay un barandal de madera junto al pasillo", "ok": false, "why": "Los barandales ayudan a que los visitantes mantengan su distancia. No es un error." },
        { "t": "Vidrio de observación agrietado", "ok": true, "why": "Un vidrio roto puede romperse del todo y es un riesgo para las personas y los animales. Se señaliza y se repara." },
        { "t": "Los venados pastan dentro del recinto", "ok": false, "why": "Comer pasto dentro del recinto es una conducta normal. No es un error." },
        { "t": "El muro de piedra de la base es un riesgo para los animales", "ok": false, "why": "No se sostiene: el muro de piedra es la base de la malla. Los problemas son la puerta, la comida y el vidrio." }
      ],
      "riesgos": [
        "Una puerta abierta permite que los animales salgan o que las personas entren. El acceso se cierra con seguro.",
        "La comida humana puede atraer a los animales a la malla y enfermarlos. Los visitantes no dejan comida ni la dan a los animales.",
        "Un vidrio roto puede romperse del todo y es un riesgo para las personas y los animales. Se señaliza y se repara."
      ]
    },
    {
      "id": "campo-nuevo-herramientas-bosque",
      "titulo": "Pausa durante el mantenimiento del sendero",
      "imagen": "assets/img/retos/detective-nuevo-25-herramientas-bosque.webp",
      "zonas": [{"x": 0.16, "y": 0.47, "w": 0.3, "h": 0.24}, {"x": 0.52, "y": 0.75, "w": 0.28, "h": 0.12}, {"x": 0.88, "y": 0.38, "w": 0.24, "h": 0.28}],
      "activo": true,
      "tipo": "seguridad",
      "consigna": "Observa el área de descanso y marca los 3 riesgos con herramientas y combustible.",
      "escena": "Durante una pausa en el mantenimiento de un sendero, un machete sin funda está sobre el asiento de una banca de madera, a la izquierda. En el centro del camino de tierra está tirado un serrucho curvo con los dientes a la vista. A la derecha, sobre una mesa de madera, hay un bidón rojo de combustible con el tapón quitado junto a una lonchera verde abierta con un sándwich. En la mesa del fondo hay una caja de herramientas cerrada, y atrás se ven un barandal de madera y un valle con montañas.",
      "pistas": [
        { "t": "Machete sin funda en el asiento de descanso", "ok": true, "why": "Un machete sin funda sobre un asiento puede cortar a quien se siente o lo tome sin ver. Las herramientas filosas se guardan en su funda y fuera de las zonas de descanso." },
        { "t": "La caja de herramientas está cerrada sobre la mesa del fondo", "ok": false, "why": "Guardar las herramientas en una caja cerrada es una buena práctica. No es un error." },
        { "t": "Serrucho con dientes expuestos sobre el camino", "ok": true, "why": "Un serrucho en el piso puede lastimar a quien pase. Se guarda con protección en su lugar." },
        { "t": "Hay un barandal de madera junto al mirador", "ok": false, "why": "El barandal ayuda a evitar caídas. No es un error." },
        { "t": "Combustible abierto junto al equipo de comida", "ok": true, "why": "El combustible destapado huele, puede derramarse y contaminar la comida, y es inflamable. Se guarda cerrado y lejos de los alimentos." },
        { "t": "Hacer una pausa durante el trabajo es peligroso", "ok": false, "why": "No se sostiene: descansar es parte del trabajo seguro. El riesgo está en cómo se dejan las herramientas." }
      ],
      "riesgos": [
        "Un machete sin funda sobre un asiento puede cortar a quien se siente o lo tome sin ver. Las herramientas filosas se guardan en su funda y fuera de las zonas de descanso.",
        "Un serrucho en el piso puede lastimar a quien pase. Se guarda con protección en su lugar.",
        "El combustible destapado huele, puede derramarse y contaminar la comida, y es inflamable. Se guarda cerrado y lejos de los alimentos."
      ]
    },
    {
      "id": "campo-nuevo-playa-limpieza",
      "titulo": "Separación de residuos en la playa",
      "imagen": "assets/img/retos/detective-nuevo-26-playa-limpieza.webp",
      "zonas": [{"x": 0.2, "y": 0.6, "w": 0.38, "h": 0.58}, {"x": 0.68, "y": 0.76, "w": 0.6, "h": 0.42}, {"x": 0.83, "y": 0.32, "w": 0.28, "h": 0.56}],
      "activo": true,
      "tipo": "conservacion",
      "consigna": "Observa la jornada de limpieza y marca los 3 errores en el manejo de los residuos.",
      "escena": "En una playa de arena, a la izquierda hay una bolsa de plástico muy delgada, abierta, llena de botellas de vidrio, algunas rotas, cuyas puntas se ven a través del plástico. Al centro, una red de pesca abandonada está parcialmente enterrada en la arena, con flotadores. A la derecha, un contenedor verde de residuos está desbordado y deja salir bolsas y basura que se riega por la arena. Al fondo, cuatro personas con guantes recogen residuos a lo largo de la orilla.",
      "pistas": [
        { "t": "Las personas del fondo usan guantes para recoger residuos", "ok": false, "why": "Usar guantes es una medida de protección correcta. No es un error." },
        { "t": "Vidrios rotos mezclados en una bolsa delgada abierta", "ok": true, "why": "Los vidrios rotos pueden cortar la bolsa y lastimar a quien la cargue. Se separan y se guardan en un recipiente resistente y cerrado." },
        { "t": "Los residuos se recogen a lo largo de la orilla", "ok": false, "why": "Recoger la basura de la playa es el objetivo de la jornada. No es un error." },
        { "t": "Red abandonada enterrada parcialmente en la arena", "ok": true, "why": "Una red enterrada es difícil de ver y puede enredar a los animales de la playa. Se retira con cuidado y se lleva al sitio correspondiente." },
        { "t": "Las algas secas de la arena también son basura que retirar", "ok": false, "why": "No se sostiene: las algas que deja el mar son parte natural de la playa y no se retiran como basura." },
        { "t": "Contenedor de residuos rebosante que dispersa basura", "ok": true, "why": "Un contenedor lleno deja salir los residuos, que el viento y los animales esparcen. Debe vaciarse a tiempo y mantenerse cerrado." }
      ],
      "riesgos": [
        "Los vidrios rotos pueden cortar la bolsa y lastimar a quien la cargue. Se separan y se guardan en un recipiente resistente y cerrado.",
        "Una red enterrada es difícil de ver y puede enredar a los animales de la playa. Se retira con cuidado y se lleva al sitio correspondiente.",
        "Un contenedor lleno deja salir los residuos, que el viento y los animales esparcen. Debe vaciarse a tiempo y mantenerse cerrado."
      ]
    },
    {
      "id": "campo-nuevo-zona-reforestacion",
      "titulo": "Cuidado de una reforestación",
      "imagen": "assets/img/retos/detective-nuevo-27-zona-reforestacion.webp",
      "zonas": [{"x": 0.21, "y": 0.46, "w": 0.4, "h": 0.46}, {"x": 0.56, "y": 0.48, "w": 0.14, "h": 0.22}, {"x": 0.87, "y": 0.55, "w": 0.25, "h": 0.5}],
      "activo": true,
      "tipo": "conservacion",
      "consigna": "Observa la zona de reforestación y marca los 3 descuidos con las plantas jóvenes.",
      "escena": "En una zona en reforestación, en primer plano a la izquierda, un protector plástico con orificios cayó y está tumbado sobre una plántula. En el centro, un tronco joven está atado a una estaca con una cinta negra muy apretada, y el tronco se ve hinchado arriba y abajo de la cinta. A la derecha, una manguera descarga agua sobre el suelo y forma una corriente que corre lejos de los árboles. Al fondo, una persona trabaja en el suelo, otra se aleja con una carretilla y otros árboles tienen protectores verdes parados.",
      "pistas": [
        { "t": "Protector plástico caído que aplasta una plántula", "ok": true, "why": "Un protector caído tapa y dobla a la plántula, y deja de protegerla. Se endereza y se asegura." },
        { "t": "Otros árboles tienen protectores verdes bien parados", "ok": false, "why": "Los protectores firmes y rectos cumplen su función. No es un error." },
        { "t": "Una persona trabaja en el suelo al fondo", "ok": false, "why": "Trabajar en el sitio de reforestación es lo esperado. No es un error." },
        { "t": "Amarre demasiado apretado alrededor de un tronco joven", "ok": true, "why": "Un amarre apretado estrangula el tronco, que se hincha y se daña al crecer. Debe quedar flojo y revisarse." },
        { "t": "Riego desperdiciado lejos de las plantas", "ok": true, "why": "El agua que corre por el suelo no llega a las raíces y se desperdicia. El riego se dirige a cada planta." },
        { "t": "Poner estacas a los árboles jóvenes siempre es un error", "ok": false, "why": "No se sostiene: la estaca puede apoyar a un árbol joven. El problema es el amarre apretado." }
      ],
      "riesgos": [
        "Un protector caído tapa y dobla a la plántula, y deja de protegerla. Se endereza y se asegura.",
        "Un amarre apretado estrangula el tronco, que se hincha y se daña al crecer. Debe quedar flojo y revisarse.",
        "El agua que corre por el suelo no llega a las raíces y se desperdicia. El riego se dirige a cada planta."
      ]
    },
    {
      "id": "campo-nuevo-lavado-equipo",
      "titulo": "Lavado del equipo de monitoreo",
      "imagen": "assets/img/retos/detective-nuevo-28-lavado-equipo.webp",
      "zonas": [{"x": 0.22, "y": 0.55, "w": 0.3, "h": 0.5}, {"x": 0.65, "y": 0.28, "w": 0.22, "h": 0.3}, {"x": 0.8, "y": 0.8, "w": 0.36, "h": 0.26}],
      "activo": true,
      "tipo": "conservacion",
      "consigna": "Observa el lavado del equipo y marca los 3 errores que dañan el equipo o el arroyo.",
      "escena": "A la orilla de un arroyo, una tina gris con agua y espuma, sobre una plataforma de madera, deja salir un chorro de agua jabonosa que cae por la orilla directo al arroyo. En la mesa de madera de la derecha, una cámara trampa abierta, con las pilas a la vista, está justo bajo el chorro de agua de una llave. También sobre la mesa hay una botella térmica, un cepillo y una charola. Abajo, sobre el lodo y dentro de un charco, hay una correa de nailon y una toalla.",
      "pistas": [
        { "t": "Hay un cepillo sobre la mesa", "ok": false, "why": "Un cepillo es una herramienta normal para limpiar el equipo. No es un error." },
        { "t": "Agua con espuma descargada directamente al arroyo", "ok": true, "why": "El jabón llega al arroyo y daña a los organismos acuáticos. El lavado se hace lejos del agua y el agua con jabón no se vierte a la corriente." },
        { "t": "Cámara abierta bajo el chorro de agua", "ok": true, "why": "El agua puede dañar los circuitos y las pilas de una cámara abierta. Se limpia con un paño húmedo y con la cámara cerrada." },
        { "t": "Una botella térmica está sobre la mesa", "ok": false, "why": "Una botella sobre la mesa no daña el arroyo ni el equipo. No es un error." },
        { "t": "Lavar el equipo de monitoreo es un error en sí mismo", "ok": false, "why": "No se sostiene: mantener limpio el equipo es parte del monitoreo. Lo que falla es dónde y cómo se lava." },
        { "t": "Correa y toalla sobre un charco con lodo", "ok": true, "why": "El equipo que ya se limpió se vuelve a ensuciar en el lodo. Se seca y se guarda sobre una superficie limpia." }
      ],
      "riesgos": [
        "El jabón llega al arroyo y daña a los organismos acuáticos. El lavado se hace lejos del agua y el agua con jabón no se vierte a la corriente.",
        "El agua puede dañar los circuitos y las pilas de una cámara abierta. Se limpia con un paño húmedo y con la cámara cerrada.",
        "El equipo que ya se limpió se vuelve a ensuciar en el lodo. Se seca y se guarda sobre una superficie limpia."
      ]
    },
    {
      "id": "campo-nuevo-polinizadores-camino",
      "titulo": "Jardín de polinizadores junto al sendero",
      "imagen": "assets/img/retos/detective-nuevo-29-polinizadores-camino.webp",
      "zonas": [{"x": 0.17, "y": 0.45, "w": 0.24, "h": 0.6}, {"x": 0.53, "y": 0.8, "w": 0.28, "h": 0.26}, {"x": 0.87, "y": 0.38, "w": 0.24, "h": 0.6}],
      "activo": true,
      "tipo": "conservacion",
      "consigna": "Observa el jardín de polinizadores y marca los 3 daños al sitio.",
      "escena": "Junto a un sendero de grava hay un jardín con flores amarillas, moradas y anaranjadas que atraen mariposas. A la izquierda, un visitante con mochila se sale del sendero y camina sobre las flores. Al centro, una botella de plástico aplastada está tirada entre las plantas, con su tapa azul al lado. A la derecha, una malla verde suelta está enredada en un arbusto con flores amarillas. Arriba vuelan dos mariposas anaranjadas y al fondo hay un camino de piedras y montañas.",
      "pistas": [
        { "t": "Dos mariposas vuelan sobre el jardín", "ok": false, "why": "Que las mariposas visiten el jardín es justo lo que se busca. No es un error." },
        { "t": "Un sendero de grava y piedras marca el camino", "ok": false, "why": "Un sendero definido ayuda a no pisar las plantas. No es un error." },
        { "t": "Visitante que pisotea el macizo de flores", "ok": true, "why": "Pisar las flores daña las plantas de las que se alimentan las mariposas y otros polinizadores. Se camina solo por el sendero." },
        { "t": "Botella plástica abandonada junto a flores", "ok": true, "why": "La basura contamina el jardín y puede dañar a los animales. Se recoge y se lleva fuera." },
        { "t": "Las flores silvestres hay que quitarlas para que el jardín se vea ordenado", "ok": false, "why": "No se sostiene: las flores son alimento de los polinizadores y no se arrancan." },
        { "t": "Malla suelta enredada en un arbusto floreado", "ok": true, "why": "Una malla suelta puede atrapar a mariposas, aves y otros animales. Se retira con cuidado." }
      ],
      "riesgos": [
        "Pisar las flores daña las plantas de las que se alimentan las mariposas y otros polinizadores. Se camina solo por el sendero.",
        "La basura contamina el jardín y puede dañar a los animales. Se recoge y se lleva fuera.",
        "Una malla suelta puede atrapar a mariposas, aves y otros animales. Se retira con cuidado."
      ]
    },
    {
      "id": "campo-nuevo-resguardo-equipo",
      "titulo": "Resguardo al terminar la jornada",
      "imagen": "assets/img/retos/detective-nuevo-30-resguardo-equipo.webp",
      "zonas": [{"x": 0.17, "y": 0.6, "w": 0.34, "h": 0.44}, {"x": 0.53, "y": 0.47, "w": 0.28, "h": 0.5}, {"x": 0.84, "y": 0.7, "w": 0.3, "h": 0.36}],
      "activo": true,
      "tipo": "seguridad",
      "consigna": "Observa el lugar de resguardo y marca los 3 descuidos con el equipo al terminar la jornada.",
      "escena": "Bajo el techo de una caseta de madera, durante una lluvia, una charola de metal a la izquierda tiene pilas usadas con sarro y fugas, junto con una correa verde. Al centro, una caja rígida abierta, con una cámara trampa dentro, está afuera, expuesta a la lluvia. A la derecha, un cuaderno de campo está abierto sobre una mesa, justo debajo de una gotera, con las hojas mojadas. En el estante de la izquierda hay binoculares, una botella y una mochila.",
      "pistas": [
        { "t": "Baterías usadas con fugas mezcladas con equipo limpio", "ok": true, "why": "Las pilas con fugas dañan el equipo y sueltan sustancias que contaminan. Se separan y se desechan en un lugar adecuado." },
        { "t": "Caja de cámara trampa abierta, expuesta a la lluvia", "ok": true, "why": "La lluvia puede dañar la cámara. El equipo se guarda en su caja cerrada y bajo techo." },
        { "t": "Los binoculares están guardados en el estante", "ok": false, "why": "Guardar el equipo en un estante, bajo techo, es correcto. No es un error." },
        { "t": "Cuaderno de campo abierto debajo de una gotera", "ok": true, "why": "El agua borra los registros. El cuaderno se guarda seco y cerrado." },
        { "t": "La caseta de madera tiene un techo que protege del agua", "ok": false, "why": "Un techo protege el material de la lluvia. No es un error." },
        { "t": "La lluvia daña todo el equipo y no hay nada que hacer", "ok": false, "why": "No se sostiene: el equipo se protege guardándolo bien y bajo techo." }
      ],
      "riesgos": [
        "Las pilas con fugas dañan el equipo y sueltan sustancias que contaminan. Se separan y se desechan en un lugar adecuado.",
        "La lluvia puede dañar la cámara. El equipo se guarda en su caja cerrada y bajo techo.",
        "El agua borra los registros. El cuaderno se guarda seco y cerrado."
      ]
    }
  ];

  return { quiz: quiz, orden: orden, flashcards: flashcards, historia: historia, detective: detective };
});
