import type { HelpLocaleText } from "./types";

export const es: HelpLocaleText = {
  ui: {
    guide_title: "Ayuda y guía",
    guide_subtitle: "Todo lo que necesitas aprender sobre HapCargo, capítulo a capítulo",
    guide_search: "Buscar en la guía: página, función, estado…",
    guide_no_results: "Ningún capítulo coincide con esta búsqueda.",
    guide_clear: "Borrar búsqueda",
    guide_categories: "Categorías",
    guide_chapters: "capítulos",
    guide_quick_start: "¿Eres nuevo? Sigue estos tres pasos",
    guide_continue: "Continuar leyendo",
    guide_progress: "Progreso de la guía",
    guide_mark_read: "Marcar como leído",
    guide_read: "Leído",
    guide_open_page: "Abrir esta página",
    guide_print: "Imprimir el capítulo",
    guide_prev: "Anterior",
    guide_next: "Siguiente",
    guide_in_chapter: "En este capítulo",
    guide_tip: "Conviene saber",
    guide_warning: "Atención",
    guide_steps: "Paso a paso",
    guide_fields: "Opciones clave",
    guide_results: "resultados",
    guide_all: "Todos los capítulos",
    guide_back: "Volver al resumen",
    guide_chapter: "Capítulo",
    guide_minutes: "min de lectura",
    guide_shortcut_hint: "Consejo: pulsa ? en cualquier lugar para ver los atajos de teclado.",
    guide_read_chapters: "capítulos leídos",
    guide_reset: "Reiniciar progreso",
    guide_start_here: "Empezar aquí",
    guide_open_menu: "Abrir el menú de capítulos",
    guide_close_menu: "Cerrar el menú de capítulos",
    guide_language_note: "Esta guía está escrita en los siete idiomas de la aplicación y sigue el idioma elegido en la barra superior.",
    guide_updated: "Revisado por última vez con la versión actual del TMS.",
    guide_search_results: "Resultados de búsqueda",
  },
  categories: {
    start: {
      title: "Primeros pasos",
      summary: "La interfaz, el flujo diario y los hábitos que hacen todo lo demás más rápido.",
    },
    operations: {
      title: "Operación diaria",
      summary: "Pedidos, viajes, planificación, seguimiento en vivo, chat y documentos — el corazón del TMS.",
    },
    fleet: {
      title: "Flota y conductores",
      summary: "Camiones, remolques, conductores, mantenimiento, telemática y tacógrafo.",
    },
    finance: {
      title: "Finanzas",
      summary: "Facturas, pagos, gastos, nóminas, liquidaciones, analítica e informes.",
    },
    commercial: {
      title: "Comercial y cumplimiento",
      summary: "Clientes, web, solicitudes de presupuesto, tránsito UE y portal del cliente.",
    },
    admin: {
      title: "Administración",
      summary: "Usuarios, roles, permisos, datos de la empresa, tarifas y conexiones.",
    },
    assist: {
      title: "Ayuda y resolución de problemas",
      summary: "Qué hacer cuando algo te bloquea, más un glosario de cada término.",
    },
  },
  chapters: {
    welcome: {
      title: "La pantalla de un vistazo",
      summary: "Qué hay dónde en HapCargo y los controles que usarás cada día.",
      blocks: [
        {
          kind: "diagram",
          variant: "layout",
          title: "Anatomía de cada pantalla",
          callouts: [
            "Barra lateral — los módulos que tu rol puede abrir.",
            "Título de página y pestañas de módulo (Pedidos / Presupuestos, Camiones / Remolques, Nóminas / Liquidaciones).",
            "Búsqueda global — encuentra cualquier página, pedido, viaje, cliente o factura con Ctrl+K.",
            "Ayuda y guía — esta página, con cada función explicada.",
            "Atajos de teclado — pulsa ? para el mismo panel.",
            "Tema claro / oscuro del espacio de trabajo.",
            "Notificaciones — cambios de estado, documentos que caducan, chats y riesgos de retraso.",
            "Selector de idioma y menú de perfil (instalar, cerrar sesión, cerrar sesión en todos los dispositivos).",
          ],
        },
        {
          kind: "p",
          text: "HapCargo es el sistema de gestión del transporte (TMS) de la empresa: pedidos comerciales, planificación, viajes, flota, conductores, documentos, facturación e informes en un solo lugar. La barra lateral se construye según tu rol, así que dos compañeros pueden ver módulos distintos.",
        },
        { kind: "h", text: "Qué puedes hacer aquí" },
        {
          kind: "list",
          items: [
            "Moverte entre módulos desde la barra lateral; plegarla con la flecha del borde.",
            "Cambiar el idioma en cualquier momento — la elección se guarda en el navegador.",
            "Buscar globalmente con Ctrl+K, o pulsar / para ir a la búsqueda de la página actual.",
            "Pulsar N en una página de lista para crear un registro y ? para todos los atajos.",
            "Instalar el TMS como aplicación de escritorio (PWA) desde el icono de descarga o el menú de perfil.",
            "Leer esta guía en los siete idiomas; cada capítulo enlaza a la página que explica.",
          ],
        },
        { kind: "h", text: "Tus primeros diez minutos" },
        {
          kind: "steps",
          items: [
            "Comprueba tu nombre y rol en la esquina superior derecha — deciden qué puedes abrir.",
            "Elige tu idioma en la barra superior.",
            "Abre el Panel y elige el periodo que te interesa (hoy, semana, mes).",
            "Usa Ctrl+K para encontrar un pedido o cliente real y abrirlo; es la forma más rápida de aprender la disposición.",
            "Vuelve a esta guía desde el icono de libro cuando una pantalla no esté clara.",
          ],
        },
        {
          kind: "tip",
          text: "El TMS recuerda filtros, tamaño de página y tu última vista mientras navegas. Instalado como PWA, también muestra sin conexión las páginas que ya visitaste.",
        },
        {
          kind: "warn",
          text: "Un módulo que falta en la barra lateral es un permiso, no un fallo. Un administrador debe añadir esa página a tu cuenta en Usuarios y roles.",
        },
      ],
    },
    "first-day": {
      title: "Un transporte de principio a fin",
      summary: "La vida normal de un trabajo: desde la solicitud del cliente hasta el dinero en el banco.",
      blocks: [
        {
          kind: "p",
          text: "Casi cada tarea del TMS pertenece a una misma cadena. Apréndela una vez y siempre sabrás dónde estás y qué viene después.",
        },
        {
          kind: "diagram",
          variant: "flow",
          title: "La cadena operativa",
          callouts: [
            "Pedido — lo que pide el cliente: ruta, fechas, mercancía, precio.",
            "Planificación — la posición factible más barata de ese pedido en un camión.",
            "Viaje — el tour ejecutable con paradas, ETAs, conductor y documentos.",
            "Documentos — CMR, POD, fotos y todo lo que necesita el cliente o la oficina.",
            "Factura — emitida desde el pedido o viaje entregado, con numeración automática.",
            "Pago — registrado en la factura; informes y antigüedad siguen automáticamente.",
          ],
        },
        {
          kind: "steps",
          items: [
            "Un administrador completa datos de empresa, datos bancarios y tarifas en Ajustes.",
            "Añade el cliente y después el camión, el remolque y el conductor en Flota y Conductores.",
            "Crea el pedido en Pedidos con el asistente de tres pasos.",
            "Abre Planificación, asigna el pedido al camión factible más barato y confirma.",
            "El conductor ejecuta el viaje desde la app móvil; la oficina lo sigue en el Mapa en vivo y el Chat.",
            "Sube el CMR/POD en Documentos y vincúlalo al viaje.",
            "Emite la factura, registra el pago y cierra el mes en Nóminas e Informes.",
          ],
        },
        {
          kind: "tip",
          text: "La configuración se hace una vez y se usa en todas partes: los datos de empresa aparecen en los PDF, las dimensiones de la flota deciden qué puede cargar Planificación y las tarifas alimentan el calculador.",
        },
        {
          kind: "warn",
          text: "Planificación nunca inventa datos. Si un camión no tiene dimensiones interiores, falta la ruta o el conductor no tiene registros de tacógrafo, el sistema muestra NO VERIFICADO en lugar de adivinar.",
        },
      ],
    },
    orders: {
      title: "Pedidos — de la solicitud a la entrega",
      summary: "Crea, edita, filtra y factura transportes con el asistente de tres pasos.",
      blocks: [
        {
          kind: "p",
          text: "Pedidos es el punto de entrada comercial. Cada pedido contiene el cliente, el precio, las ventanas de carga y entrega, la mercancía y más tarde el vínculo con el viaje y la factura. Las solicitudes de presupuesto están en la pestaña junto a Pedidos si tu rol lo permite.",
        },
        {
          kind: "diagram",
          variant: "wizard",
          title: "El asistente de pedido",
          callouts: [
            "Tres pasos: Información general, Carga y entrega, Líneas de mercancía.",
            "General — cliente, precio acordado, moneda, tipo de transporte, equipo y prioridad.",
            "Ruta — direcciones con autocompletado, fechas, ventanas horarias, contactos y referencias.",
            "Mercancía — descripción, palés/cantidad, peso en kg, metros lineales y volumen.",
            "Guardar — el sistema valida el pedido y lo pone a disposición de Planificación.",
          ],
        },
        { kind: "h", text: "Qué puedes hacer aquí" },
        {
          kind: "list",
          items: [
            "Buscar y filtrar por estado, cliente, país, tipo de transporte, prioridad y fecha.",
            "Abrir una fila para la ficha del pedido o editarlo desde las acciones de la fila.",
            "Duplicar un pedido para una ruta recurrente y borrar o archivar lo que ya no uses.",
            "Exportar la lista filtrada a Excel, CSV o PDF, o importar pedidos desde Excel / un documento leído por IA.",
            "Generar la factura desde el pedido tras la entrega; el vínculo se conserva para la auditoría.",
            "Seleccionar varias filas para exportarlas o borrarlas en una acción.",
          ],
        },
        { kind: "h", text: "Los tres pasos del asistente" },
        {
          kind: "table",
          head: ["Paso", "Qué rellenas"],
          rows: [
            ["Información general", "Cliente, precio y moneda, tipo de transporte, equipo, prioridad, notas."],
            ["Carga y entrega", "Dirección, fecha, ventana horaria, persona de contacto, teléfono, referencias de carga/descarga."],
            ["Líneas de mercancía", "Descripción, cantidad/palés, peso (kg), LDM, volumen (m³), detalles ADR si hace falta."],
          ],
        },
        { kind: "h", text: "Campos que deciden todo después" },
        {
          kind: "list",
          items: [
            "Precio y moneda — de ahí salen beneficio, margen e informes.",
            "Peso y palés — Planificación los compara con la capacidad del camión y el remolque.",
            "LDM y m³ — se usan cuando el camión está limitado por metros lineales o volumen, no solo peso.",
            "ADR — marca mercancías peligrosas y muestra la insignia en cada pantalla donde aparece el pedido.",
            "Ventanas horarias — Planificación y las ETAs las respetan; una ventana perdida es un conflicto duro.",
          ],
        },
        {
          kind: "tip",
          text: "Escribe una ciudad y elige la sugerencia: la dirección se geocodifica, lo que hace posibles la ruta, las ETAs y el mapa en vivo. Una dirección escrita libre sin coordenadas no puede enrutarse.",
        },
        {
          kind: "warn",
          text: "Carga y entrega no pueden ser la misma dirección en un pedido. La mercancía por encima de la capacidad del camión asignado no se bloquea al crear, pero Planificación rechazará la confirmación.",
        },
      ],
    },
    trips: {
      title: "Viajes — ejecución y seguimiento",
      summary: "Sigue qué está en la carretera, quién conduce, cuánto cuesta y qué se ha entregado.",
      blocks: [
        {
          kind: "p",
          text: "Un viaje es la parte ejecutable de uno o varios pedidos: un camión, un remolque, un conductor, una lista ordenada de paradas y un horario. Los viajes se crean en Planificación y luego los actualizan la app del conductor y la oficina.",
        },
        { kind: "h", text: "La lista" },
        {
          kind: "list",
          items: [
            "Banda de indicadores con viajes activos, planificados, retrasados y completados, más ingresos y beneficio.",
            "Filtros por estado, camión, conductor y fecha, con búsqueda por número de viaje, matrícula, conductor y ciudad.",
            "Columnas ordenables para salida, distancia, peso, ingresos, coste y beneficio.",
            "Selección múltiple para exportar o borrar y un PDF de perfil por viaje.",
            "Actualización en vivo cuando un conductor cambia un estado o reporta un incidente.",
          ],
        },
        { kind: "h", text: "En la ficha del viaje" },
        {
          kind: "list",
          items: [
            "Resumen: estado, camión, remolque, conductor, ingresos, coste estimado y beneficio.",
            "Ruta y paradas en orden, con llegada/salida, ETA y estado de la ventana.",
            "Mercancía a bordo: peso, palés, LDM y volumen frente a los límites registrados.",
            "Documentos e historial de actividad — cada cambio de estado se guarda con hora y autor.",
            "Enlaces a los pedidos, el tablero de planificación y el mapa en vivo.",
          ],
        },
        { kind: "h", text: "Estados principales" },
        {
          kind: "list",
          items: [
            "PLANNING / ACCEPTED — creado, esperando que el conductor empiece.",
            "EN_ROUTE_TO_PICKUP → ARRIVED_AT_PICKUP → LOADING — la secuencia de carga.",
            "EN_ROUTE_TO_DELIVERY → ARRIVED_AT_DELIVERY → UNLOADING — la secuencia de entrega.",
            "COMPLETED — entregado y cerrado; DELAYED / EXCEPTION — requiere atención.",
            "DELIVERY_REJECTED, PARTIALLY_REJECTED, DELIVERY_ACCEPTED_WITH_REMARKS — resultados de entrega que afectan a la facturación.",
            "CANCELLED — el viaje se canceló; los pedidos pueden planificarse de nuevo.",
          ],
        },
        {
          kind: "tip",
          text: "Abre el viaje desde el pedido, o el pedido desde el viaje: ambas vistas siempre apuntan la una a la otra, así nunca pierdes el contexto comercial.",
        },
        {
          kind: "warn",
          text: "No borres un viaje que aún tiene documentos o una factura. Ciérralo como CANCELLED o COMPLETED para que la auditoría y el portal del cliente sigan correctos.",
        },
      ],
    },
    planning: {
      title: "Planificación — el tablero y sus herramientas",
      summary: "Asigna pedidos al camión factible más barato, resuelve conflictos y confirma un horario real.",
      blocks: [
        {
          kind: "p",
          text: "Planificación es el cockpit del despacho: pedidos sin asignar a un lado, tablero de flota al otro. El tablero muestra camiones y días, la línea de tiempo muestra horas, y cada asignación la valida el backend antes de escribir nada.",
        },
        { kind: "h", text: "Formas de planificar" },
        {
          kind: "list",
          items: [
            "Arrastra un pedido sin asignar a una celda camión/día, o ábrelo y elige un camión.",
            "Usa la línea de tiempo para horas, pausas, descanso diario y viajes solapados.",
            "Usa la consolidación inteligente para la posición de inserción factible más barata en un viaje existente.",
            "Guarda una vista (filtros, zoom, diseño) y vuelve a ella más tarde.",
            "Compara escenarios antes de confirmar y deshaz el último cambio confirmado si hace falta.",
            "Imprime o exporta el tablero para la reunión de la mañana.",
          ],
        },
        { kind: "h", text: "Herramientas de la barra" },
        {
          kind: "table",
          head: ["Herramienta", "Cuándo usarla"],
          rows: [
            ["Consolidación inteligente", "Añadir un pedido a un viaje existente; muestra el orden de paradas recomendado y alternativas con km añadidos reales."],
            ["Dividir / Combinar viajes", "Un viaje es demasiado largo, o dos viajes pueden ir juntos."],
            ["Cross-dock / Drop & hook", "Cambiar remolque o mercancía en un hub sin una entrega completa."],
            ["Subcontratista", "Dar un tramo a un socio manteniendo el pedido del cliente en el TMS."],
            ["Optimización de flota", "El sistema propone el mejor camión para un conjunto de pedidos."],
            ["Comparación de rutas", "Comparar proveedores, distancia, peajes y tiempo antes de elegir."],
            ["Incidentes de tráfico", "Ver interrupciones en vivo que afectan al plan de hoy."],
            ["Paleta de comandos", "Ejecutar una acción de planificación por teclado sin buscar el botón."],
          ],
        },
        { kind: "h", text: "Confirmar una consolidación" },
        {
          kind: "steps",
          items: [
            "Selecciona los pedidos que quieres añadir y abre el asistente.",
            "Lee el veredicto: factible, advertencia o bloqueado; bloqueado no se puede forzar.",
            "Elige el orden de paradas recomendado o una alternativa; cada uno muestra su distancia añadida y ETA.",
            "Comprueba la mercancía frente a capacidad, compatibilidad de equipo, ventanas de parada y horas del conductor.",
            "Si queda una advertencia, escribe el motivo de la excepción — se guarda con tu nombre en la auditoría.",
            "Confirma una vez. La escritura es transaccional e idempotente: reintentar no puede crear un segundo viaje.",
          ],
        },
        {
          kind: "tip",
          text: "El veredicto es la única fuente de verdad. La pantalla muestra exactamente lo que decidió el backend — nunca una versión más amable.",
        },
        {
          kind: "warn",
          text: "Los conflictos duros detienen la confirmación: ventana perdida, sobrepeso/palés, solapamiento de camión/remolque/conductor, equipo obligatorio ausente. Repara los datos o el plan; nunca rodees un bloqueo real.",
        },
      ],
    },
    "map-chat": {
      title: "Mapa en vivo, enlaces de seguimiento y chat",
      summary: "Ve dónde está cada camión, comparte un enlace de seguimiento con el cliente y habla con los conductores en tiempo real.",
      blocks: [
        {
          kind: "p",
          text: "El Mapa en vivo combina posiciones GPS de telemática con la ruta planificada, la próxima parada y la ETA en vivo. El Chat es la línea directa con el conductor, y el seguimiento público permite al cliente seguir un viaje sin cuenta del TMS.",
        },
        { kind: "h", text: "Mapa en vivo" },
        {
          kind: "list",
          items: [
            "Marcadores de camión con matrícula, conductor y actividad actual; haz clic para ver detalles.",
            "Próxima carga/entrega, estimación de llegada y ruta restante del viaje seleccionado.",
            "Búsqueda por matrícula, conductor o ciudad; el mapa sigue la selección.",
            "Actualizaciones en vivo por WebSocket, más una actualización de respaldo si cae la conexión.",
            "Actividad del tacógrafo y estado de conexión junto al camión cuando están disponibles.",
          ],
        },
        { kind: "h", text: "Compartir un enlace de seguimiento" },
        {
          kind: "steps",
          items: [
            "Abre el viaje o pedido y elige la acción de compartir/seguimiento.",
            "Envía al cliente el enlace generado (/track/…); abre una página de seguimiento de solo lectura.",
            "El enlace muestra la posición actual y la ETA, no precios, costes ni notas internas.",
          ],
        },
        { kind: "h", text: "Chat y notificaciones" },
        {
          kind: "list",
          items: [
            "Una sala por viaje más una sala general de despacho; los mensajes llegan en tiempo real.",
            "Adjunta fotos y PDF — útiles para daños en carga, páginas CMR o prueba de entrega.",
            "Los mensajes no leídos y los cambios de estado aparecen en el menú de la campana y como popup.",
            "Las notificaciones de escritorio se activan desde el menú de la campana; el navegador pide permiso una vez.",
          ],
        },
        {
          kind: "tip",
          text: "Un cliente que llama por una ETA es la consulta de soporte más frecuente. El enlace de seguimiento la responde sin que nadie abra el TMS.",
        },
        {
          kind: "warn",
          text: "Un camión sin conexión de telemática muestra su última posición conocida, no una en vivo. Trata una marca de tiempo antigua como “posición no verificada”, nunca como la ubicación actual.",
        },
      ],
    },
    documents: {
      title: "Documentos — CMR, POD y el resto",
      summary: "Sube, clasifica, comparte y encuentra el papeleo detrás de cada viaje.",
      blocks: [
        {
          kind: "p",
          text: "Documentos guarda el rastro de papel en un solo lugar y lo vincula a un viaje, para que la oficina, el portal del cliente y la factura apunten al mismo archivo.",
        },
        {
          kind: "steps",
          items: [
            "Abre Documentos y elige Subir (o pulsa N).",
            "Elige el archivo de tu ordenador o arrástralo a la ventana.",
            "Elige el tipo de documento y, cuando sea posible, el viaje al que pertenece.",
            "Añade notas para tus compañeros — qué prueba el archivo o qué falta.",
            "Guarda y usa descargar, vista previa o compartir desde la lista.",
          ],
        },
        {
          kind: "table",
          head: ["Tipo", "Para qué se usa"],
          rows: [
            ["CMR", "Carta de porte internacional, el documento legal del transporte."],
            ["POD", "Prueba de entrega, firmada por el destinatario."],
            ["Albarán / lista de bultos", "Qué se entregó y en qué cantidad."],
            ["Factura", "Una copia de la factura comercial en el expediente."],
            ["Foto", "Estado en carga, daños, precinto o número de palés."],
            ["Ticket de báscula / otro", "Resguardo de báscula o documento sin categoría propia."],
          ],
        },
        { kind: "h", text: "Trabajar con la lista" },
        {
          kind: "list",
          items: [
            "Busca por nombre de archivo, tipo, referencia o viaje; filtra por tipo y referencia.",
            "Previsualiza imágenes y PDF sin descargarlos.",
            "Comparte un documento con un enlace público con token y revócalo cuando haga falta.",
            "Borra una subida equivocada — la acción pide confirmación.",
          ],
        },
        {
          kind: "tip",
          text: "Sube el CMR y el POD antes de cerrar el viaje: el portal del cliente y la factura muestran entonces un expediente completo y el cierre de mes no persigue papel.",
        },
        {
          kind: "warn",
          text: "Un enlace compartido es público para quien lo tenga hasta que caduque o se revoque. Nunca compartas un documento con costes o notas internas.",
        },
      ],
    },
    fleet: {
      title: "Flota, remolques y mantenimiento",
      summary: "Mantén completos los datos de los vehículos — Planificación depende de ellos — y anticípate a servicios y caducidades.",
      blocks: [
        {
          kind: "p",
          text: "Flota y equipos tiene dos pestañas, Camiones y Remolques. Los datos que introduces no son decoración: dimensiones, capacidades y equipo deciden qué puede cargar Planificación y qué muestran facturas e informes.",
        },
        { kind: "h", text: "Camiones" },
        {
          kind: "list",
          items: [
            "Identidad: matrícula, marca, modelo, año, VIN y país de matriculación.",
            "Asignación: estado, conductor actual y remolque acoplado.",
            "Capacidad: peso máximo, carga útil, palés, LDM, volumen y dimensiones interiores.",
            "Equipo: tipo de carrocería, norma euro y características usadas para la compatibilidad.",
            "Costes: tipo y precio de combustible/energía, consumo medio y coste por km.",
            "Documentos: ITV, seguro, tacógrafo y otros papeles con fechas de caducidad y alertas.",
          ],
        },
        { kind: "h", text: "Remolques" },
        {
          kind: "list",
          items: [
            "Matrícula, tipo (mega, frigo, estándar, walking floor, contenedor, plataforma), estado y dimensiones.",
            "Capacidad en palés, LDM, m³ y peso, más su propio juego de documentos con caducidades.",
            "El remolque debe coincidir con el requisito de equipo del pedido; los datos que faltan se muestran como NO VERIFICADO.",
          ],
        },
        {
          kind: "table",
          head: ["Campo", "Por qué importa"],
          rows: [
            ["Largo / ancho / alto interior", "La comprobación de compatibilidad para mega, frigo y mercancía limitada por volumen."],
            ["Carga útil y peso máximo", "La sobrecarga bloquea una confirmación de planificación."],
            ["Palés y LDM", "El exceso de palés y los límites de metros lineales también bloquean."],
            ["Tipo de combustible y consumo", "Coste por km, coste de ruta y estimaciones de CO₂."],
          ],
        },
        { kind: "h", text: "Mantenimiento" },
        {
          kind: "list",
          items: [
            "Registra servicios preventivos y correctivos, ITV, neumáticos y reparaciones.",
            "Introduce fecha, kilometraje, coste de piezas y mano de obra, proveedor y notas; adjunta la factura o el informe.",
            "Estados: programado, en curso, hecho; los servicios vencidos y próximos se resaltan.",
            "Usa el kilometraje y el próximo km de mantenimiento para programar antes de una avería.",
          ],
        },
        {
          kind: "tip",
          text: "Abre un camión o remolque para su ficha: resumen, documentos, historial de actividad, conductor asignado y un perfil PDF imprimible.",
        },
        {
          kind: "warn",
          text: "Un camión usado por un viaje activo no puede borrarse sin más. Termina, cancela o reasigna el viaje primero y deja que los documentos se archiven con él.",
        },
      ],
    },
    drivers: {
      title: "Conductores, documentos y horas de conducción",
      summary: "La ficha del conductor, sus caducidades, disponibilidad y las horas que Planificación debe respetar.",
      blocks: [
        {
          kind: "p",
          text: "Conductores reúne a la persona, la cuenta de la app móvil, el permiso y los datos médicos, el camión asignado y las horas de conducción registradas.",
        },
        { kind: "h", text: "La ficha del conductor" },
        {
          kind: "list",
          items: [
            "Nombre, email, teléfono y la contraseña usada en la app móvil.",
            "Número de permiso, dieta diaria y salario bruto para la nómina.",
            "Camión asignado y estado de disponibilidad.",
            "Permiso, certificado médico y tarjeta de tacógrafo con sus fechas de caducidad.",
            "Pestaña de documentos para escaneos e historial de actividad de cada cambio.",
          ],
        },
        {
          kind: "table",
          head: ["Documento", "Qué pasa cuando caduca"],
          rows: [
            ["Permiso de conducir", "Alerta en notificaciones; la ficha se marca y los informes de cumplimiento lo muestran."],
            ["Certificado médico", "Mismo flujo de alerta; guarda el escaneo en los documentos del conductor."],
            ["Tarjeta de tacógrafo", "Alerta de caducidad; sin tarjeta válida el conductor no puede registrar actividad legalmente."],
            ["Estado de disponibilidad", "Disponible, en viaje, libre, enfermo o vacaciones — Planificación y despacho lo ven al instante."],
          ],
        },
        { kind: "h", text: "Horas de conducción (HOS)" },
        {
          kind: "list",
          items: [
            "Registra conducción, trabajo, pausas y descanso por día en la ficha del conductor cuando el tacógrafo no está conectado.",
            "Límites del modelo de planificación: 9 h de conducción al día, 56 h por semana, 45 min de pausa tras 4,5 h, 11 h de descanso diario.",
            "Los registros que faltan aparecen como no verificados — nunca como disponibilidad ilimitada.",
            "La página Tacógrafo muestra la actividad en vivo de toda la flota, actualizada cada pocos segundos.",
          ],
        },
        {
          kind: "tip",
          text: "Un conductor sin camión y sin horas puede existir en el sistema, pero Planificación trata su disponibilidad como no verificada en lugar de suponer que está libre.",
        },
        {
          kind: "warn",
          text: "Desactivar a un conductor bloquea de inmediato el login móvil. Comprueba antes que ningún viaje abierto depende de esa cuenta y traspasa el viaje.",
        },
      ],
    },
    telematics: {
      title: "Telemática y tacógrafo",
      summary: "Conecta el dispositivo de un camión, valida el flujo y usa posiciones y actividades en vivo.",
      blocks: [
        {
          kind: "p",
          text: "El Hub de telemática gestiona la conexión entre un camión y su proveedor de telemática o tacógrafo. Una vez activa, las posiciones, la actividad de conducción y la ETA llegan al Mapa en vivo y a la página Tacógrafo.",
        },
        {
          kind: "steps",
          items: [
            "Abre Telemática y elige Añadir conexión.",
            "Selecciona el camión y el proveedor (hay un simulador de pruebas para formación).",
            "Introduce el id de dispositivo/vehículo del proveedor y el tipo (OBD, FMS, tacógrafo).",
            "Para tacógrafos, añade marca, modelo, número de serie y generación.",
            "Introduce las credenciales del proveedor exactamente como se facilitaron; se guardan en el servidor.",
            "Ejecuta la prueba de conexión, activa y comprueba la primera posición en el mapa.",
          ],
        },
        {
          kind: "table",
          head: ["Estado", "Significado"],
          rows: [
            ["En línea / conectado", "El proveedor envía datos de este camión."],
            ["Sin conexión", "No hay datos recientes; el mapa muestra la última posición conocida con su marca de tiempo."],
            ["Error / credenciales", "El proveedor rechazó las credenciales o el id del dispositivo — corrige y vuelve a probar."],
            ["Simulador", "Datos sintéticos para formación; nunca los uses para una promesa real al cliente."],
          ],
        },
        { kind: "h", text: "Qué alimentan los datos" },
        {
          kind: "list",
          items: [
            "Mapa en vivo: posición, rumbo, actividad actual y estado de conexión.",
            "Tacógrafo: conducción, trabajo, disponibilidad y descanso, con contadores diarios y semanales.",
            "Planificación: registros reales de conducción/descanso cuando existen; si no, disponibilidad no verificada.",
            "Panel e informes: indicadores de telemetría y fiabilidad.",
          ],
        },
        {
          kind: "tip",
          text: "Usa el simulador de telemática para formar a nuevos compañeros: produce posiciones y actividades sin tocar un camión real ni una promesa al cliente.",
        },
        {
          kind: "warn",
          text: "Las claves API y secretos de cliente del proveedor son credenciales de la empresa. Introdúcelas solo en el asistente de conexión, nunca en chat, email o un documento compartido.",
        },
      ],
    },
    invoices: {
      title: "Facturas, pagos y recordatorios",
      summary: "Emite, envía, cobra y concilia la parte financiera de cada viaje.",
      blocks: [
        {
          kind: "p",
          text: "Las facturas se crean desde un pedido/viaje o manualmente. La numeración es automática y el PDF usa los datos de empresa y banco de Ajustes, así que completa esa página antes de la primera factura.",
        },
        {
          kind: "diagram",
          variant: "finance",
          title: "De la entrega al cobro",
          callouts: [
            "Pedido o viaje entregado — el documento origen y el vínculo de auditoría.",
            "Factura — borrador, revisada y luego emitida con número automático.",
            "PDF / email / enlace — el cliente recibe el mismo documento.",
            "Pago — total o parcial, con fecha, método y referencia.",
            "Antigüedad e informes — saldo pendiente por cliente, por tramos.",
          ],
        },
        {
          kind: "steps",
          items: [
            "Abre Facturas y crea una nueva, o usa la acción de facturar en un pedido entregado.",
            "Selecciona el cliente, la fecha de emisión, el vencimiento y la moneda.",
            "Añade líneas con descripción, cantidad, precio unitario e IVA; comprueba los totales.",
            "Guarda como borrador, revisa y emite el número definitivo.",
            "Descarga el PDF, envíalo por email o compártelo con el cliente.",
            "Registra el pago cuando llegue y comprueba el saldo restante.",
          ],
        },
        {
          kind: "table",
          head: ["Estado", "Significado"],
          rows: [
            ["Borrador", "Editable, no emitida; sin número definitivo ni PDF enviado."],
            ["Emitida / enviada", "Documento definitivo entregado al cliente."],
            ["Pagada parcialmente", "Algunos pagos registrados; el saldo sigue visible."],
            ["Pagada", "Totalmente liquidada."],
            ["Vencida", "Venció sin pago completo; resaltada e incluida en recordatorios."],
            ["Anulada", "Invalidada; consérvala para la auditoría en lugar de borrarla."],
          ],
        },
        { kind: "h", text: "Cobros" },
        {
          kind: "list",
          items: [
            "Registra pagos totales o parciales en una factura; el saldo se actualiza automáticamente.",
            "Abre el informe de antigüedad para ver corriente, 1–30, 31–60, 61–90 y 90+ días.",
            "Envía recordatorios a clientes con facturas vencidas desde la acción de recordatorio.",
            "Exporta el registro filtrado a Excel, CSV o PDF para el contable.",
          ],
        },
        {
          kind: "tip",
          text: "Factura desde el pedido siempre que puedas: número de pedido, cliente, viaje y documentos quedan vinculados, y el portal del cliente muestra la misma factura.",
        },
        {
          kind: "warn",
          text: "Un borrador no tiene número definitivo. No envíes el PDF de un borrador al cliente; emítelo primero. Si cambian los datos de empresa o el IBAN, los PDF antiguos no se reescriben.",
        },
      ],
    },
    "expenses-payroll": {
      title: "Gastos, nóminas y liquidaciones",
      summary: "Registra costes de la empresa y cierra el mes de conductores y subcontratistas.",
      blocks: [
        { kind: "p", text: "Gastos recoge costes no ligados a un viaje, mientras Nóminas y Liquidaciones calculan lo que ganan los conductores en el mes." },
        { kind: "h", text: "Gastos" },
        {
          kind: "list",
          items: [
            "Importe y moneda, categoría, fecha y descripción.",
            "Categorías: combustible, mantenimiento, contabilidad, salario, peaje y otros.",
            "Adjunta la foto o PDF del recibo; el lector IA puede rellenar campos desde un recibo.",
            "Filtra y busca en la lista, edita o borra con confirmación.",
            "Los gastos alimentan el cockpit financiero y el desglose de costes en informes.",
          ],
        },
        { kind: "h", text: "Nóminas" },
        {
          kind: "steps",
          items: [
            "Elige el mes y el año.",
            "Pulsa Generar — el sistema calcula la nómina desde los viajes del mes y los datos de pago del conductor.",
            "Revisa la lista, abre el PDF de un conductor y corrige los datos origen si algo no cuadra.",
          ],
        },
        { kind: "h", text: "Liquidaciones" },
        {
          kind: "list",
          items: [
            "Genera una liquidación por conductor y mes, eligiendo el modo de pago (por km, porcentaje, fijo).",
            "Introduce la tarifa; la liquidación muestra kilómetros, ingresos y el importe resultante.",
            "Usa liquidaciones para conductores propietarios y subcontratistas, donde la nómina no es la herramienta adecuada.",
            "Guarda el PDF con los papeles del mes para el contable.",
          ],
        },
        {
          kind: "tip",
          text: "Cierra el mes en orden: gastos → nóminas/liquidaciones → facturas → informes. Cada paso lee datos del anterior.",
        },
        {
          kind: "warn",
          text: "Generar la nómina dos veces para el mismo mes puede duplicar importes. Revisa primero la lista existente; corrige los viajes origen en lugar de editar cifras a mano.",
        },
      ],
    },
    analytics: {
      title: "Cockpit financiero e informes",
      summary: "Lee ingresos, costes, margen y cobros, y conviértelos en un informe imprimible.",
      blocks: [
        { kind: "p", text: "Finanzas es el cockpit de análisis; Informes produce documentos reutilizables y exportables con los mismos datos operativos. Ambos respetan el periodo y los filtros elegidos." },
        { kind: "h", text: "Cockpit financiero" },
        {
          kind: "list",
          items: [
            "Presets de periodo (este mes, mes pasado, 30/90 días, 12 meses, este año) o intervalo personalizado.",
            "Granularidad día, semana o mes para los gráficos de tendencia.",
            "KPIs: facturado, cobrado, pendiente, ingresos, coste, beneficio y margen.",
            "Desglose de costes por categoría y antigüedad de cobros/pagos.",
            "Exportación Excel del cockpit completo para la reunión de dirección.",
          ],
        },
        { kind: "h", text: "Informes" },
        {
          kind: "list",
          items: [
            "Recorre el catálogo por sección: operaciones, servicio, financiero y metodología.",
            "Filtra por cliente, camión, conductor, periodo y granularidad, y previsualiza antes de exportar.",
            "Exporta a Excel, CSV o PDF; los gráficos se incluyen en el PDF.",
            "Guarda un informe configurado para reutilizarlo, programa uno recurrente y revisa el historial de ejecuciones.",
          ],
        },
        {
          kind: "table",
          head: ["Sección", "Informes típicos"],
          rows: [
            ["Operaciones", "Viajes, utilización, km cargados/vacíos, retrasos, actividad de flota."],
            ["Servicio", "Carga/entrega a tiempo, ventanas perdidas, incidentes y fiabilidad."],
            ["Financiero", "Ingresos, coste, beneficio, margen, facturación y cobros."],
            ["Metodología", "Definiciones, supuestos y notas de calidad de datos detrás de las cifras."],
          ],
        },
        {
          kind: "tip",
          text: "Lee la metodología antes de presentar una cifra: indica qué datos había y qué quedó sin verificar, para que nadie prometa un valor que el TMS no puede demostrar.",
        },
        {
          kind: "warn",
          text: "Un gráfico vacío suele significar que no hay datos en el periodo, no que el informe esté roto. Amplía las fechas, borra el filtro de cliente/camión y comprueba que facturas y viajes estén cerrados.",
        },
      ],
    },
    clients: {
      title: "Clientes y tarifas",
      summary: "Mantén la ficha comercial, los contactos y el acceso al portal en un solo lugar.",
      blocks: [
        {
          kind: "p",
          text: "La ficha del cliente la reutilizan pedidos, facturas, presupuestos y el portal del cliente. Una ficha completa significa un solo registro, no cinco formas de escribir la misma empresa.",
        },
        {
          kind: "list",
          items: [
            "Razón social, IVA/CIF, registro mercantil, dirección y país.",
            "Persona de contacto, email y teléfono para presupuestos y facturas.",
            "Abre la ficha del cliente para ver detalles, pedidos, viajes y facturas.",
            "Concede acceso al portal para que el cliente siga pedidos, viajes, facturas y documentos.",
            "Busca, filtra y exporta la lista; borra solo tras comprobar documentos abiertos.",
            "Las tarifas y el calculador de precio están en Ajustes → Motor de tarifas.",
          ],
        },
        { kind: "h", text: "Añadir un cliente y acceso al portal" },
        {
          kind: "steps",
          items: [
            "Crea el cliente con la razón social y el CIF exactamente como en la factura.",
            "Añade la persona de contacto y el email que recibirá presupuestos y facturas.",
            "Abre los detalles del cliente y activa el acceso al portal.",
            "Envía la invitación/enlace de contraseña; el cliente elige contraseña e inicia sesión en /portal/login.",
          ],
        },
        {
          kind: "table",
          head: ["Campo", "Dónde aparece"],
          rows: [
            ["Razón social y dirección", "PDF de factura, CMR, portal del cliente."],
            ["IVA / CIF", "Factura e informes financieros."],
            ["Email de contacto", "Respuestas a presupuestos, facturas e invitación al portal."],
            ["País", "Filtros, análisis de tránsito UE e informes."],
          ],
        },
        {
          kind: "tip",
          text: "Las fichas duplicadas de cliente son la causa habitual de facturas «perdidas». Busca por CIF antes de crear un cliente nuevo.",
        },
        {
          kind: "warn",
          text: "Borrar un cliente con facturas o acceso al portal rompe el historial. Desactiva el portal o archiva; mantén intacto el vínculo financiero.",
        },
      ],
    },
    website: {
      title: "Contenido web, solicitudes de presupuesto y bandeja",
      summary: "Publica el sitio público, responde a quien escribe y convierte presupuestos en pedidos.",
      blocks: [
        { kind: "p", text: "El módulo Web edita el sitio público de la empresa y recoge sus mensajes. Las solicitudes de presupuesto están como pestaña en el módulo Pedidos y llegan desde el formulario de transporte del sitio." },
        {
          kind: "table",
          head: ["Pestaña", "Qué editas"],
          rows: [
            ["Bandeja", "Mensajes de contacto del sitio; leer, responder y seguir su estado."],
            ["Mapa y países", "Los países y rutas del mapa público."],
            ["Sobre nosotros", "Historia de la empresa, cifras y contenido de confianza."],
            ["Servicios", "Las tarjetas de servicio y sus descripciones."],
            ["Flota", "Los vehículos presentados en el sitio público."],
            ["Empleo", "Puestos abiertos y candidaturas."],
          ],
        },
        { kind: "h", text: "Solicitudes de presupuesto" },
        {
          kind: "list",
          items: [
            "Estados: nuevo, en análisis, contactado, presupuestado, aceptado, rechazado.",
            "Abre una solicitud para leer la ruta, la mercancía y los datos de contacto.",
            "Responde con una oferta de precio; el historial de respuestas queda con la solicitud.",
            "Cuando el cliente acepta, usa Crear pedido para convertir el presupuesto en un pedido real sin reescribir.",
          ],
        },
        { kind: "h", text: "Publicar" },
        {
          kind: "steps",
          items: [
            "Elige el idioma de edición (RO, EN y los demás idiomas del sitio).",
            "Edita el bloque necesario y guarda; el TMS confirma el cambio.",
            "Abre la página pública y revisa el texto antes de anunciarlo a los clientes.",
          ],
        },
        {
          kind: "tip",
          text: "Las solicitudes ya contienen ruta y mercancía. Conviértelas en pedidos en lugar de copiar el texto al asistente — la solicitud origen queda vinculada para el historial comercial.",
        },
        {
          kind: "warn",
          text: "Guardar un bloque cambia el sitio público en vivo. Lee el texto dos veces y comprueba la pestaña de idioma antes de guardar.",
        },
      ],
    },
    compliance: {
      title: "Tránsito UE, cabotaje y ADR",
      summary: "Demuestra por dónde circuló la flota, mantén visibles las mercancías peligrosas y respeta las normas de conducción.",
      blocks: [
        { kind: "p", text: "El informe Tránsito UE y cabotaje (antes IFTA) construye una imagen por país y por camión a partir de las rutas de los viajes. ADR es una propiedad de la mercancía, y los límites de tacógrafo son el marco legal que usa Planificación." },
        {
          kind: "table",
          head: ["Concepto", "Significado en el TMS"],
          rows: [
            ["Tránsito UE", "Paso por un país sin cargar ni entregar allí."],
            ["Cabotaje", "Carga y entrega dentro de un país donde no estás establecido; limitado por normas UE."],
            ["ADR", "Mercancías peligrosas: el pedido lleva la marca ADR y la insignia aparece en cada pantalla."],
            ["Tacógrafo / HOS", "Conducción, trabajo, disponibilidad y descanso registrados por conductor y vehículo."],
          ],
        },
        { kind: "h", text: "El informe por países" },
        {
          kind: "list",
          items: [
            "Elige un periodo; los totales se construyen con los viajes enrutados.",
            "Lee kilómetros, viajes y cuota por país, y el mismo reparto por camión.",
            "Exporta el informe para la declaración o el expediente de cumplimiento.",
            "La geometría de ruta o el código de país que faltan aparecen como datos incompletos, nunca como distancia adivinada.",
          ],
        },
        { kind: "h", text: "ADR y normas de conducción" },
        {
          kind: "list",
          items: [
            "Marca ADR en la línea de mercancía (clase, número UN y detalles) para que la insignia siga al pedido y al viaje.",
            "Planificación muestra camiones y requisitos ADR; una incompatibilidad es un conflicto.",
            "Mantén permiso, certificado médico, tarjeta de tacógrafo y horas al día — los datos caducados o ausentes se señalan.",
          ],
        },
        {
          kind: "tip",
          text: "Registra los países reales de la ruta mediante paradas geocodificadas. Los informes de cumplimiento valen lo que valen las direcciones y rutas que hay detrás.",
        },
        {
          kind: "warn",
          text: "Este módulo informa de lo que sabe el TMS. No sustituye el análisis legal del tacógrafo ni la responsabilidad del gestor de transporte sobre el cumplimiento.",
        },
      ],
    },
    portal: {
      title: "El portal del cliente",
      summary: "Qué ven tus clientes al entrar y cómo darles acceso con seguridad.",
      blocks: [
        {
          kind: "p",
          text: "El portal del cliente es un área separada, sobre todo de lectura: siguen sus pedidos y viajes, descargan facturas y documentos y contactan con la oficina. Nunca ven costes, márgenes ni otros clientes.",
        },
        {
          kind: "diagram",
          variant: "portal",
          title: "La vista del cliente",
          callouts: [
            "Panel — pedidos activos, facturas vencidas, saldo pendiente y actividad reciente.",
            "Pedidos — sus pedidos, estados y un formulario para solicitar un transporte.",
            "Viajes — viajes activos con paradas y seguimiento.",
            "Facturas — PDF, datos de pago y datos bancarios.",
            "Soporte — teléfono, email y formulario de mensaje.",
          ],
        },
        { kind: "h", text: "Qué puede hacer el cliente" },
        {
          kind: "list",
          items: [
            "Entrar en /portal/login con el email invitado por la oficina.",
            "Solicitar un transporte nuevo; la solicitud se convierte en pedido/presupuesto para el equipo.",
            "Seguir viajes activos y abrir la página de seguimiento.",
            "Descargar facturas, ver el saldo pendiente y los datos bancarios para pagar.",
            "Contactar con el despacho desde la página de soporte.",
          ],
        },
        {
          kind: "steps",
          items: [
            "Abre la ficha del cliente y activa el acceso al portal.",
            "Envía la invitación al email de contacto.",
            "El cliente define una contraseña desde el enlace e inicia sesión.",
            "Comprueba que el cliente solo ve sus propios pedidos, viajes y facturas.",
          ],
        },
        {
          kind: "tip",
          text: "Usa el portal en lugar de enviar PDF por email: el cliente ve siempre el estado actual y los mismos documentos que la oficina.",
        },
        {
          kind: "warn",
          text: "Las cuentas del portal son por cliente y nunca deben compartirse entre empresas. Si se va un contacto, revoca el acceso e invita al sustituto.",
        },
      ],
    },
    "admin-users": {
      title: "Usuarios, roles y permisos",
      summary: "Crea cuentas, elige una plantilla de rol y decide exactamente qué páginas puede abrir cada persona.",
      blocks: [
        {
          kind: "p",
          text: "Usuarios es el módulo de control de acceso. Un rol es solo una plantilla inicial; las casillas de páginas son el permiso real, y tanto la barra lateral como el guard de URL las respetan.",
        },
        {
          kind: "table",
          head: ["Rol", "Normalmente necesita"],
          rows: [
            ["Administrador", "Todo, incluidos Usuarios y Ajustes."],
            ["Manager", "Operaciones, planificación, flota, conductores, informes y clientes."],
            ["Despachador", "Panel, pedidos, planificación, viajes, mapa, chat y documentos."],
            ["Gestor de flota", "Flota, mantenimiento, conductores, tacógrafo, tránsito e informes."],
            ["Contable", "Facturas, finanzas, gastos, informes y clientes."],
            ["Responsable de nóminas", "Nóminas, liquidaciones, conductores, gastos e informes."],
            ["Cumplimiento / atención al cliente / ventas", "Las páginas de su trabajo, sin finanzas ni administración."],
            ["Conductor", "Solo la app móvil; ningún módulo web."],
          ],
        },
        {
          kind: "steps",
          items: [
            "Elige Nuevo usuario y completa el paso de cuenta: nombre, email, contraseña e idioma.",
            "Elige la plantilla de rol más cercana al trabajo.",
            "Ajusta las casillas de páginas; las secciones dentro de un módulo pueden concederse por separado.",
            "Marca la cuenta como activa o inactiva.",
            "Guarda y pide a la persona que entre; comprueba que el menú coincide con lo concedido.",
          ],
        },
        { kind: "h", text: "Acciones de seguridad" },
        {
          kind: "list",
          items: [
            "Restablece una contraseña sin saber la anterior; el usuario puede cambiarla luego en Ajustes → Mi perfil.",
            "Desactiva una cuenta de inmediato cuando alguien se va; el acceso se corta en la siguiente petición.",
            "Cierra la sesión de un usuario en todos los dispositivos si se pierde un portátil o un teléfono.",
            "Borra una cuenta solo cuando ninguna auditoría la necesite; desactivar suele ser la opción correcta.",
          ],
        },
        {
          kind: "tip",
          text: "Da el conjunto mínimo de páginas que permite hacer el trabajo. Un despachador no necesita Usuarios, Ajustes ni los datos bancarios de la empresa.",
        },
        {
          kind: "warn",
          text: "Las cuentas de administrador pueden cambiarlo todo, incluidos otros administradores. Mantén al menos dos administradores activos para que la empresa nunca quede bloqueada.",
        },
      ],
    },
    settings: {
      title: "Ajustes de empresa, tarifas y conexiones",
      summary: "Los datos de los que dependen cada PDF, plan y factura — configúralos una vez, con cuidado.",
      blocks: [
        {
          kind: "p",
          text: "Ajustes es la configuración de la empresa. La mayoría de pestañas son para administradores; la de perfil es para cada usuario. Los cambios afectan de inmediato a los documentos, incluidos los PDF generados después.",
        },
        {
          kind: "table",
          head: ["Pestaña", "Qué controla"],
          rows: [
            ["Datos de empresa y facturación", "Razón social, IVA, registro, contacto, dirección, banco, IBAN y logo."],
            ["Motor de tarifas y calculador", "Tarifas del calculador de precio y de los presupuestos."],
            ["Mi perfil y seguridad", "Tu nombre, email y contraseña."],
            ["Conexiones y servidor", "URLs de API y WebSocket del cliente."],
            ["Telemática e integraciones", "Las mismas conexiones gestionadas por el Hub de telemática."],
          ],
        },
        { kind: "h", text: "Datos de la empresa" },
        {
          kind: "list",
          items: [
            "Usa la razón social, el IVA y el registro exactamente como deben aparecer en las facturas.",
            "Sube un logo claro; aparece en los PDF y en la barra lateral.",
            "Completa banco e IBAN — el portal del cliente los muestra para el pago.",
            "El horario y los datos de contacto también llegan al sitio público y a la página de soporte del portal.",
            "Guardar requiere el rol de administrador.",
          ],
        },
        { kind: "h", text: "Tarifas y conexiones" },
        {
          kind: "list",
          items: [
            "El motor de tarifas guarda las tarifas del calculador y de las respuestas a presupuestos; mantén moneda y unidades coherentes.",
            "Las URLs de API y WebSocket son ajustes de entorno; cámbialas solo con el responsable de IT.",
            "Las credenciales de telemática van en el asistente de conexión, no en una nota compartida.",
          ],
        },
        {
          kind: "tip",
          text: "Antes de la primera factura, rellena datos de empresa, datos bancarios y logo. Corregirlos después no regenera los PDF ya emitidos.",
        },
        {
          kind: "warn",
          text: "Cambiar la URL de API desconecta el entorno actual de su backend. Hazlo solo en una migración planificada, nunca como intento de diagnóstico.",
        },
      ],
    },
    troubleshooting: {
      title: "Cuando algo te bloquea",
      summary: "Los problemas más frecuentes, qué significan de verdad y la corrección rápida y segura.",
      blocks: [
        {
          kind: "table",
          head: ["Síntoma", "Qué compruebas"],
          rows: [
            ["«Cuenta inactiva» al entrar", "Un administrador debe reactivar la cuenta o restablecer la contraseña en Usuarios."],
            ["Falta un módulo en el menú", "Tu rol/conjunto de páginas no lo incluye; pide a un administrador, no recrees el usuario."],
            ["Error de red / página vacía", "Conexión, URL de API en Ajustes → Servidor y si el backend está funcionando."],
            ["Dirección no encontrada", "Escribe la ciudad y elige la sugerencia; una dirección sin coordenadas no puede enrutarse."],
            ["Planificación no confirma", "Lee el código de conflicto: ventana perdida, sobrepeso/palés, solapamiento camión/remolque/conductor, equipo ausente."],
            ["Equipo NO VERIFICADO", "Rellena dimensiones interiores y tipo de carrocería en Flota."],
            ["Horas del conductor NO VERIFICADAS", "No hay registros de tacógrafo en el periodo; registra HOS o conecta telemática. No lo leas como tiempo libre."],
            ["Sin posición en vivo de un camión", "La conexión de telemática está sin línea; la última marca de tiempo no es la posición actual."],
            ["El PDF de factura muestra datos erróneos", "Corrige Ajustes → Datos de empresa; los PDF antiguos no se reescriben."],
            ["No aparecen notificaciones de escritorio", "Actívalas en el menú de la campana y permite el permiso del navegador."],
          ],
        },
        { kind: "h", text: "Códigos de conflicto de planificación" },
        {
          kind: "list",
          items: [
            "STOP_WINDOW_MISSED — llegada después de la ventana; cambia la fecha, divide el viaje o renegocia la ventana.",
            "WEIGHT_OVERLOAD / PALLET_OVERLOAD — la mercancía supera la capacidad registrada de camión + remolque.",
            "TRUCK_OVERLAP / TRAILER_OVERLAP / DRIVER_OVERLAP — el recurso ya está comprometido en ese intervalo.",
            "EQUIPMENT_MISSING / EQUIPMENT_UNVERIFIED — el pedido exige un equipo que el vehículo no demuestra tener.",
            "ROUTE_UNVERIFIED / CARGO_DIMENSIONS_UNVERIFIED — la ruta o los datos de mercancía están incompletos; el sistema no adivina.",
            "PROPOSAL_CHANGED — la propuesta revisada ya no coincide; reabre el asistente y revisa de nuevo.",
            "ASSIGNMENT_BLOCKED — hay un bloqueo duro que no se puede forzar.",
          ],
        },
        {
          kind: "tip",
          text: "Si el mensaje menciona NO VERIFICADO, la corrección casi siempre está en los datos: completa el vehículo, la ruta o los registros del conductor. Nunca falsifiques una dimensión ni una posición GPS para que pase un plan.",
        },
        {
          kind: "warn",
          text: "No rodees un bloqueo real con una excepción o una edición manual. Una ventana legal perdida o un camión sobrecargado es un riesgo real, no una molestia del software.",
        },
      ],
    },
    glossary: {
      title: "Glosario y estados",
      summary: "El vocabulario del TMS, para que cada compañero hable de lo mismo.",
      blocks: [
        {
          kind: "table",
          head: ["Término", "Significado"],
          rows: [
            ["TMS", "Transport Management System — el software que usas."],
            ["Pedido", "La solicitud comercial: cliente, ruta, mercancía, precio."],
            ["Viaje", "El tour ejecutable: camión, remolque, conductor, paradas ordenadas."],
            ["Parada", "Un punto de carga o entrega dentro de un viaje, con ventana y ETA."],
            ["Tablero de planificación", "La rejilla camiones × días donde se asignan pedidos."],
            ["Inserción", "La posición factible más barata de un par carga/entrega en un viaje existente."],
            ["Consolidación", "Añadir un pedido a un viaje existente en lugar de crear uno nuevo."],
            ["ETA", "Hora estimada de llegada, recalculada desde la ruta y el horario."],
            ["LDM", "Metros lineales — la longitud de suelo que ocupa la mercancía."],
            ["CMR / POD", "Carta de porte internacional / prueba de entrega."],
            ["ADR", "Acuerdo europeo sobre transporte de mercancías peligrosas."],
            ["Cabotaje", "Carga y entrega en un país donde el transportista no está establecido."],
            ["Tacógrafo", "El dispositivo que registra conducción, trabajo, disponibilidad y descanso."],
            ["Liquidación", "El cálculo mensual de un conductor o subcontratista, aparte de la nómina."],
            ["Antigüedad (aging)", "Facturas pendientes agrupadas por días de retraso."],
            ["Excepción (override)", "Decisión documentada de aceptar una advertencia blanda; se guardan motivo y usuario."],
            ["Veredicto", "La decisión de factibilidad del backend: factible, advertencia o bloqueado."],
            ["NO VERIFICADO", "Faltan datos y el sistema se niega a adivinar — completa los datos origen."],
          ],
        },
        { kind: "h", text: "Estados de pedido" },
        {
          kind: "list",
          items: [
            "draft — en preparación, aún no visible para planificación.",
            "new — completo y esperando planificación.",
            "planned / assigned — vinculado a un viaje y un camión.",
            "loading / in_transit — ejecución en curso.",
            "delivered — el destinatario aceptó la mercancía.",
            "pod_received — la prueba firmada está subida.",
            "ready_for_invoice / invoiced / paid — la cola financiera del pedido.",
            "cancelled — el pedido no se ejecutará.",
          ],
        },
        { kind: "h", text: "Estados de viaje" },
        {
          kind: "list",
          items: [
            "PLANNING, ACCEPTED — creado y confirmado, sin empezar.",
            "EN_ROUTE_TO_PICKUP, ARRIVED_AT_PICKUP, LOADING — secuencia de carga.",
            "EN_ROUTE_TO_DELIVERY, ARRIVED_AT_DELIVERY, UNLOADING — secuencia de entrega.",
            "COMPLETED — cerrado con éxito; DELAYED, EXCEPTION — requiere atención.",
            "DELIVERY_REJECTED, PARTIALLY_REJECTED, DELIVERY_ACCEPTED_WITH_REMARKS — resultados de entrega.",
            "CANCELLED — cancelado; sus pedidos pueden replanificarse.",
          ],
        },
        {
          kind: "tip",
          text: "Cuando dos compañeros describen un trabajo de forma distinta, consulta primero este glosario. Una palabra, un significado, menos errores.",
        },
        {
          kind: "warn",
          text: "Los estados no son cosméticos. Informes, portal y facturación los leen; avanzar un viaje sin el evento real hace que todas las cifras posteriores sean incorrectas.",
        },
      ],
    },
  },
};
