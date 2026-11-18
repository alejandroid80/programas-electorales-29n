/* =====================================================================
   Datos extraídos de los programaselectorales del 29N de 2026.
   Fuente: https://github.com/jynus/programas-electorales-29n-generales-2026
   Los resúmenes reproducen las propuestas declaradas por cada partido
   en su propio programa (ficheros .rst del repositorio).
   ===================================================================== */

const REPO = 'https://github.com/jynus/programas-electorales-29n-generales-2026';
const REPO_RAW = REPO + '/blob/main/programas_electorales/';

/* ---------------------------------------------------------------------
   Etiquetas con las que el CIS presenta cada partido en su nota de
   estimacion de voto, para casar su tabla con las fichas de esta pagina.
   --------------------------------------------------------------------- */
const CIS_LABELS = {
  psoe: 'PSOE',
  pp: 'PP',
  vox: 'VOX',
  frente_amplio: 'Frente Amplio',
  erc: 'ERC-Podemos',
  bildu: 'EH-Bildu',
  compromis: 'Compromís: Front Valencià',
  adelante: 'Adelante Andalucía',
  podemos: 'Podemos',
  bng: 'BNG',
  pnv: 'EAJ-PNV',
  salf: 'SALF',
  cc: 'CC-Municipalistas Primero Canarias'
};

/* Partidos que el CIS estima y que no tienen ficha propia aqui. */
const CIS_EXTRA = [
  { id: 'junts', etiqueta: 'Junts', nombre: 'Junts per Catalunya', color: '#c8102e' },
  { id: 'upc', etiqueta: 'UPC', nombre: 'Unidad del Pueblo Canario', color: '#2e8b57' },
  { id: 'ara_mes', etiqueta: 'Ara Més-Front Ampli', nombre: 'Ara Més-Front Ampli', color: '#d94f2b' }
];

/* ---------------------------------------------------------------------
   Ejes de comparación. Cada eje define un mapa de posiciones ordenadas
   y los partidos se asignan a una de ellas.
   --------------------------------------------------------------------- */
const THEMES = [
  {
    id: 'fiscal',
    name: 'Economía y fiscalidad',
    icon: '€',
    scale: ['subir', 'gradual', 'bajar', 'recorte'],
    axisLeft: 'Máxima presión redistributiva',
    axisRight: 'Menos Estado, más mercado',
    intro: 'La pregunta de fondo: ¿bajan o suben los impuestos, y a quién se los suben?',
    positions: {
      bajar: {
        label: 'Bajada general',
        short: 'Bajar',
        desc: 'Reducir la presión fiscal sobre familias, autónomos y empresas. Menos Estado, menos gasto.'
      },
      gradual: {
        label: 'Bajar a bajos, subir a altos',
        short: 'Gradual',
        desc: 'Deflactación y bajadas para rentas medias y bajas; más carga sobre patrimonios, grandes fortunas y grandes empresas.'
      },
      subir: {
        label: 'Subir a grandes fortunas',
        short: 'Subir',
        desc: 'Impuestos a las grandes fortunas, a la banca, a las eléctricas y a las grandes empresas, con más gasto social.'
      },
      recorte: {
        label: 'Recorte del gasto',
        short: 'Recorte',
        desc: 'Recorte drástico del gasto público y de las subvenciones, con el argumento del Estado como lastre.'
      }
    }
  },
  {
    id: 'vivienda',
    name: 'Vivienda',
    icon: '⌂',
    scale: ['precio', 'universal', 'fiscal', 'oferta'],
    axisLeft: 'El alquiler lo fija el Estado',
    axisRight: 'El mercado lo fija',
    intro: 'La política de vivienda es, hoy por hoy, la política social que más debate genera.',
    positions: {
      oferta: {
        label: 'Más suelo y oferta',
        short: 'Oferta',
        desc: 'Agilizar la construcción, ampliar suelo y deregular para que el mercado forme los precios.'
      },
      precio: {
        label: 'Regular precios y parque público',
        short: 'Regular',
        desc: 'Topes o bajadas obligatorias del alquiler, suelo público y un parque de vivienda social en alquiler.'
      },
      universal: {
        label: 'Plan social y universal',
        short: 'Universal',
        desc: 'Un derecho a la vivienda blindado constitucionalmente, con inversión pública garantiza a escala.'
      },
      fiscal: {
        label: ' Incentivos y licencias',
        short: 'Fiscal',
        desc: 'Bajar impuestos, eliminar el IBI o los tipos, y acelerar licencias de obra.'
      }
    }
  },
  {
    id: 'migracion',
    name: 'Inmigración',
    icon: '⇄',
    scale: ['regular', 'control', 'expulsion'],
    axisLeft: 'Vías legales e integración',
    axisRight: 'Prioridad nacional y expulsión',
    intro: 'El eje más polarizado del ciclo electoral: del rechazo a la integración.',
    positions: {
      expulsion: {
        label: 'Prioridad nacional y expulsión',
        short: 'Expulsar',
        desc: 'Restricción de entrada, fin de regularizaciones y de las expulsiones.'
      },
      control: {
        label: 'Control y cierre',
        short: 'Control',
        desc: 'Más control fronterizo y de las condiciones de residencia, con un flujo de entrada ordenado.'
      },
      regular: {
        label: 'Vías legales e integración',
        short: 'Integrar',
        desc: 'Regularización, vías de asilo, protección internacional e integración.'
      }
    }
  },
  {
    id: 'energia',
    name: 'Energía y clima',
    icon: '⚡',
    scale: ['renovable', 'mixto', 'nuclear'],
    axisLeft: '100 % renovable',
    axisRight: 'Nuclear y transición lenta',
    intro: 'Nuclear sí o no, y con qué ritmo se abandona el carbón y el gas.',
    positions: {
      nuclear: {
        label: 'Nuclear y transición lenta',
        short: 'Nuclear',
        desc: 'Prórroga de las centrales, fin del tope regulatorio a la inversión en redes y rechazo del Pacto Verde.'
      },
      mixto: {
        label: 'Renovables con cierre nuclear a 2035',
        short: 'Transición',
        desc: 'Electrificación, almacenamiento y renovables, con un calendario de cierre nuclear acordado y transición justa.'
      },
      renovable: {
        label: '100 % renovable',
        short: 'Renovable',
        desc: 'Sistema eléctrico libre de combustibles fósiles, con inversión pública en la transición.'
      }
    }
  },
  {
    id: 'estado',
    name: 'Forma del Estado',
    icon: '◈',
    scale: ['unitario', 'autonomico', 'federal', 'independiente'],
    axisLeft: 'Estado unitario',
    axisRight: 'Derecho a decidir',
    intro: 'Qué Estado se propone: unitario, federal, o con derecho a decidir.',
    positions: {
      unitario: {
        label: 'Estado unitario reforzado',
        short: 'Unitario',
        desc: 'Más Estado, un centro de autoridad fuerte y una identidad nacional común.'
      },
      autonomico: {
        label: 'Más autogobierno',
        short: 'Autonómico',
        desc: 'Reformar la financiación territorial y financiera para dar más competencias a las comunidades.'
      },
      federal: {
        label: 'República federal',
        short: 'Federal',
        desc: 'Un proceso constituyente o una reforma federal con Senado reformado.'
      },
      independiente: {
        label: 'Derecho a decidir',
        short: 'Independiente',
        desc: 'Reconocimiento del derecho de autodeterminación de la nación.'
      }
    }
  },
  {
    id: 'militar',
    name: 'Paz y militarismo',
    icon: '☮',
    scale: ['desarme', 'reforma', 'mas'],
    axisLeft: 'Desarme y paz',
    axisRight: 'Más gasto militar',
    intro: 'Gasto militar, OTAN, armas a Israel y la voz de España en el mundo.',
    positions: {
      mas: {
        label: 'Más defensa',
        short: 'Más gasto',
        desc: 'Aumento del gasto militar, hasta el 2 % del PIB, con rechazo de la Agenda 2030.'
      },
      reforma: {
        label: 'Reformar la OTAN',
        short: 'Reforma',
        desc: 'Defensa al servicio de la paz, multilateralismo y reforma de la composición de la alianza.'
      },
      desarme: {
        label: 'Desarme y reversión del rearme',
        short: 'Desarme',
        desc: 'Reversión del rearme, desarme nuclear, cierre de bases y embargo de armas.'
      }
    }
  },
  {
    id: 'ue',
    name: 'Unión Europea',
    icon: '★',
    scale: ['pueblos', 'integrar', 'critica'],
    axisLeft: 'Europa de los pueblos',
    axisRight: 'Europa crítica o de salida',
    intro: 'De la incondicional a la integración al soberanismo económico.',
    positions: {
      critica: {
        label: 'Europa crítica o de salida',
        short: 'Crítica',
        desc: 'Rechazo de la ampliación, de las políticas de la Comisión o incluso de la salida.'
      },
      integrar: {
        label: 'Europa más integrada',
        short: 'Integrar',
        desc: 'Una UE más integrada, democrática y con más presupuesto propio.'
      },
      pueblos: {
        label: 'Europa de los pueblos',
        short: 'Pueblos',
        desc: 'Una Europa federal, con democracia directa, soberanía fiscal y control popular.'
      }
    }
  },
  {
    id: 'servicios',
    name: 'Servicios públicos y Estado',
    icon: '✚',
    scale: ['blindar', 'eficiencia', 'reducir'],
    axisLeft: 'Blindar el Estado de bienestar',
    axisRight: 'Reducir y desregular',
    intro: 'El peso del Estado: blindar los servicios públicos o dimensionar la administración.',
    positions: {
      blindar: {
        label: 'Blindar y reforzar',
        short: 'Blindar',
        desc: 'Más financiación, blindaje constitucional y gestión directa frente a la privatización.'
      },
      eficiencia: {
        label: 'Eficiencia y dimensionar',
        short: 'Eficiencia',
        desc: 'Menos estructuras, más eficiencia, y eliminando el gasto ideológico.'
      },
      reducir: {
        label: 'Reducir y desregular',
        short: 'Reducir',
        desc: 'Desregulación de la planificación, la energía y la economía.'
      }
    }
  }
];

/* ---------------------------------------------------------------------
   Partidos
   --------------------------------------------------------------------- */
const PARTIES = [
  {
    id: 'pp',
    name: 'Partido Popular',
    short: 'PP',
    abbr: 'PP',
    color: '#0B5FA5',
    pcText: { light: '#0b5fa5', dark: '#548fc0' },
    badgeFg: '#ffffff',
    profile: 'capitulos',
    bloc: 'nacional',
    lang: 'castellano',
    doc: 'pp.rst',
    title: 'Reconstrucción Nacional',
    pages: 82,
    words: 23599,
    tagline: 'Reparar el Estado, regenerar la democracia, reunir la Nación, recuperar la ambición.',
    axes: {
      fiscal: 'bajar', vivienda: 'oferta', migracion: 'control', energia: 'nuclear',
      estado: 'unitario', militar: 'mas', ue: 'critica', servicios: 'eficiencia'
    },
    highlights: [
      { k: '1.000.000', v: 'viviendas nuevas en España' },
      { k: '3 meses', v: 'plazo máximo de licencia de obra' },
      { k: '0 %', v: 'IRPF para quien cobra el SMI' },
      { k: '5', v: 'centrales con el cierre eliminado' }
    ],
    keys: [
      { t: 'Reparar el Estado', d: 'Administración rigurosa y dimensionada, presencia del Estado en toda España, control de las fronteras, "compromiso mutuo" para vivir en España, mando único ante emergencias y medios de defensa.' },
      { t: 'Regenerar la democracia', d: 'Nadie gobiernará sin presupuestos ni gastará sin control; el poder no controlará a quien lo vigila; la política nunca será un negocio y el Parlamento recuperará la capacidad de legislative.' },
      { t: 'Un millón de viviendas más', d: 'Nueva Ley del Suelo con licencias resueltas en tres meses por silencio positivo; deroga de la Ley de Vivienda (fin de zonas tensionadas y del índice de precios); promoción de la vivienda industrializada y rehabilitación con IVA del 4 %.' },
      { t: 'Menos impuestos', d: 'IRPF a la baja para rentas medias, bajas y familias, con umbral del SMI que sube automáticamente; bonificación del 100 % del IRPF el primer año para menores de 35 años (75/50/25 % los tres siguientes); IVA del 0 % en alimentos básicos y deflactación del IRPF.' },
      { t: 'Energía', d: 'Eliminación del calendario de cierre de Almaraz, Ascó, Vandellós, Cofrentes y Trillo; supresión del impuesto del 7 % a la producción eléctrica; Tarifa Social Única y plan de choque para desbloquear la conexión a la red.' },
      { t: 'Nación y territorio', d: 'Reconstrucción del pacto territorial y entre generaciones, la nacionalidad española como vínculo de pertenencia, el compromiso de un millón de viviendas y España como potencia energética de Europa.' }
    ]
  },
  {
    id: 'psoe',
    name: 'Partido Socialista Obrero Español',
    short: 'PSOE',
    abbr: 'PSOE',
    color: '#C8102E',
    pcText: { light: '#c8102e', dark: '#db6175' },
    badgeFg: '#ffffff',
    profile: 'capitulos',
    bloc: 'nacional',
    lang: 'castellano',
    doc: 'psoe.rst',
    title: 'La fuerza de la gente.',
    pages: 114,
    words: 36163,
    tagline: 'Continuidad del proyecto, no ruptura: "elegimos seguir avanzando".',
    axes: {
      fiscal: 'gradual', vivienda: 'universal', migracion: 'regular', energia: 'mixto',
      estado: 'autonomico', militar: 'reforma', ue: 'integrar', servicios: 'blindar'
    },
    highlights: [
      { k: '499', v: 'compromisos numerados' },
      { k: '1 % del PIB', v: 'movilizado al año en vivienda' },
      { k: '100.000', v: 'viviendas públicas estatales' },
      { k: '37,5 h', v: 'jornada laboral de referencia' }
    ],
    keys: [
      { t: 'Vivienda como derecho fundamental', d: 'Reforma de la Constitución, movilizar el 1 % del PIB anual, parque público estatal de 100.000 viviendas, el 1 % de la licitación anual de obra pública para un fondo de adquisición, impuesto a solares residenciales ociosos y congelación de rentas por encima del índice de referencia.' },
      { t: 'Salarios y trabajo', d: 'Reducción de la jornada a 37,5 horas e incentivos a la negociación colectiva hacia las 35; deducción del IRPF condicionada a la evolución de los precios; blindaje constitucional de las pensiones con revalorización por IPC y reducción de la brecha de género en las pensiones.' },
      { t: 'Fiscalidad y servicios públicos', d: 'Tasa a los "tecnooligarcas" que complementa la tasa Google, tasa a los viajes de lujo y refuerzo de la tasa Tobin; acabar con las listas de espera, Plan Sonríe de salud bucodental y gestión directa como modalidad preferente en la sanidad.' },
      { t: 'Educación y cuidados', d: 'Universalización de la educación infantil de 0 a 3 años, abandono escolar temprano por debajo del 10 % antes de 2030, Estatuto del Docente, primera Ley de Servicios Sociales y el Plan «A Tu Lado» para envejecer en casa.' },
      { t: 'Clima y territorio', d: 'Mantener el cierre de las centrales nucleares hasta 2035 con transición justa, Ley de Adaptación al Cambio Climático, Agencia Estatal de Protección Civil y una financiación territorial justa.' },
      { t: 'Democracia y Europa', d: 'Escaño ciudadano en Congreso y Senado, supresión de aforamientos, reforma del Senado, Defensor de las Generaciones Futuras; ampliación de la UE con los Balcanes Occidentales e impuesto mínimo global sobre las multinacionales.' }
    ]
  },
  {
    id: 'podemos',
    name: 'Podemos',
    short: 'Podemos',
    abbr: 'POD',
    color: '#6B3FA0',
    pcText: { light: '#6b3fa0', dark: '#9a7cbe' },
    badgeFg: '#ffffff',
    profile: 'capitulos',
    bloc: 'nacional',
    lang: 'castellano',
    doc: 'podemos.rst',
    title: 'Paz, casa y trabajo',
    pages: 141,
    words: 51399,
    tagline: 'Un programa articulado en tres problemas: la vivienda, los precios y la falta de tiempo.',
    axes: {
      fiscal: 'subir', vivienda: 'precio', migracion: 'regular', energia: 'renovable',
      estado: 'federal', militar: 'desarme', ue: 'pueblos', servicios: 'blindar'
    },
    highlights: [
      { k: '-40 %', v: 'alquiler por ley' },
      { k: '626.000', v: 'viviendas en expropiación de uso' },
      { k: '63 años', v: 'edad ordinaria de jubilación' },
      { k: '100 %', v: 'sistema eléctrico renovable' }
    ],
    keys: [
      { t: 'Las casas son para vivir', d: 'Bajar los alquileres un 40 % por ley con un suelo del 60 % del precio medio de la zona; contratos de alquiler indefinidos; prohibición de comprar viviendas que no sean para vivir; expropiación de uso de viviendas de grandes tenedores; prohibición de desahucios sin alternativa habitacional; fin de los pisos turísticos e Inmobiliaria Pública con renta máxima del 30 % de la renta media del municipio.' },
      { t: 'Los precios tienen que bajar', d: 'Impuesto a las grandes fortunas, gravámenes permanentes a la banca y a las eléctricas, Empresa Pública de Energía, nacionalización de REPSOL, topes a electricidad, gas y carburantes, impuesto a las empresas contaminantes, red pública de supermercados, cheque energético de 300 euros, derogación de la "Ley Beckham" y fin de la exención del IBI a la Iglesia.' },
      { t: 'Trabajar menos para vivir mejor', d: 'Subida salarial automática, reducción de jornada sin reducción salarial, jubilación ordinaria a los 63 años, nuevo Estatuto de Trabajadores y tolerancia cero con el fraude laboral; pensión mínima igual al SMI y renta universal incondicionada.' },
      { t: 'Paz: parar las guerras', d: 'Reversión completa del rearme, embargo de armas contra Israel, reconocimiento del sionismo como expresión de racismo, más ayuda humanitaria a Gaza y un acuerdo de paz, justicia y reconstrucción para Ucrania.' },
      { t: 'Planeta y servicios', d: 'Sistema eléctrico 100 % renovable y libre de combustibles fósiles, ley de residuo cero, salvar Doñana, las Tablas de Daimiel y el Mar Menor, más trenes y frecuencias, prohibición de urbanizar en zonas inundables, blindaje del derecho al aborto, cierre de los CIE, ius soli y ley integral antirracista.' },
      { t: 'España, república plurinacional', d: 'Proceso constituyente y referéndum sobre la forma del Estado, reforma federal del Senado, voto a los 16 años, reconstrucción de la memoria democrática y persecución de la corrupción como forma de organizar el poder.' }
    ]
  },
  {
    id: 'vox',
    name: 'VOX',
    short: 'Vox',
    abbr: 'VOX',
    color: '#166534',
    pcText: { light: '#166534', dark: '#5e9573' },
    badgeFg: '#ffffff',
    profile: 'capitulos',
    bloc: 'nacional',
    lang: 'castellano',
    doc: 'vox.rst',
    title: 'Es sentido común',
    pages: 66,
    words: 6812,
    tagline: 'Españoles primero, desregulación y reversión de la agenda verdes y migratoria.',
    axes: {
      fiscal: 'bajar', vivienda: 'oferta', migracion: 'expulsion', energia: 'nuclear',
      estado: 'unitario', militar: 'mas', ue: 'critica', servicios: 'reducir'
    },
    highlights: [
      { k: 'Ni uno más', v: 'lema migratorio' },
      { k: '0 €', v: 'cuota de autónomos bajo el SMI' },
      { k: '5', v: 'centrales con el cierre eliminado' },
      { k: '5 M', v: 'deidjanados en 5 años, según el partido' }
    ],
    keys: [
      { t: 'Prioridad nacional', d: 'Acceso preferente de los españoles a vivienda pública, guarderías, bonos y prestaciones; supresión de toda ayuda a inmigrantes irregulares; gravar las remesas al extranjero y el IMV reservado a españoles con menos recursos; plan de retorno para los españoles que emigraron.' },
      { t: 'Inmigración restrictiva', d: 'Prohibición de regularizaciones masivas y supresión del arraigo, repatriación, remigración y deportación, devolución de MENAS a sus familias, ni un euro a ONGs que colaboren con el efecto llamada y fin de la cooperación con los países que no colaboren.' },
      { t: 'Rebaja fiscal', d: 'IRPF simplificado y a la baja en función del número de hijos, tipo reducido y general del IVA a la baja, menor Impuesto de Sociedades y cuota cero para autónomos con ingresos por debajo del SMI, con fiscalidad mínima y diferenciada en zonas de despoblación.' },
      { t: 'Energía e industria', d: 'Plan Nacional de Soberanía Energética, fin del tope regulatorio a la inversión en redes, suspensión de los acuerdos internacionales que atacan a la industria, reversión de la prohibición de motores de combustión, recuperación urgente del plan nuclear y Plan Nacional de Reindustrialización.' },
      { t: 'Ceuta y Melilla', d: 'Militarización de la frontera, expulsión inmediata de los "invasores", revisión de las relaciones diplomáticas con Marruecos y procesamiento de Pedro Sánchez por traición.' },
      { t: 'Vivienda y justicia', d: 'Reforma de la Ley del Suelo para "volver a ver grúas en los cielos", supresión de trabas regulatorias y aumento de la inversión pública en vivienda, con independencia de la justicia y control estricto de la corrupción.' }
    ]
  },
  {
    id: 'erc',
    name: 'Esquerra Republicana',
    short: 'ERC',
    abbr: 'ERC',
    color: '#C99700',
    pcText: { light: '#8b6c0a', dark: '#c99700' },
    badgeFg: '#1a1013',
    profile: 'capitulos',
    bloc: 'nacionalista',
    lang: 'catalán',
    doc: 'erc.rst',
    title: 'Por el país. Por la gente. Por el futuro.',
    titleOrig: 'Pel país. Per la gent. Pel futur.',
    pages: 48,
    words: 25307,
    tagline: 'Tres ejes: defender el país, defender la gente y defender los servicios públicos.',
    axes: {
      fiscal: 'gradual', vivienda: 'precio', migracion: 'regular', energia: 'mixto',
      estado: 'independiente', militar: 'reforma', ue: 'integrar', servicios: 'blindar'
    },
        highlights: [
      { k: '43 %', v: 'de apoyo a la independencia' },
      { k: '76 %', v: 'de apoyo al derecho de decidir' },
      { k: '6 % del PIB', v: 'estatal a la educación' },
      { k: '3', v: 'grandes bloques' }
    ],
    keys: [
      { t: 'A. Defender el país', d: 'Autodeterminación y plurinacionalidad, protección efectiva de la lengua catalana, defensa de la escuela catalana, financiación y soberanía fiscal, cultura catalana con espacio comunicativo nacional, más competencias y una Unión Europea con proyección internacional.' },
      { t: 'B. Defender la gente', d: 'Plan de choque sobre la vivienda —con traspaso de los pisos de la SAREB a la Generalitat y habilitación de una LAU catalana—, coste de la vida, fiscalidad más justa, feminismo y derechos LGBTI+, trabajo digno, reindustrialización, transición energética justa, futuro de la.pagesía y el mundo rural, sociedad digital y bienestar animal.' },
      { t: 'C. Defender los servicios públicos', d: 'Inversión en infraestructuras con garantías de ejecución, red ferroviaria al servicio del país, servicios sociales como pilar del Estado del bienestar, sanidad pública, más herramientas de seguridad, municipalismo y universidades públicas de calidad.' },
      { t: 'Luchas estructurales', d: 'Derogar la Ley Mordaza, suprimir los delitos de ofensa a los sentimientos religiosos y de injurias contra la Corona, convertir la comisaría de Vía Laietana en espacio de memoria y auditar los bienes espoliados por el franquismo.' },
      { t: 'Coyuntura', d: 'El programa parte del 43 % de apoyo a la independencia y del 76 % de acuerdo con el derecho de decidir, medidos por el barómetro del CEO, y de una crisis de vivienda que sitúa al acceso a la vivienda en el centro del debate.' }
    ]
  },
  {
    id: 'bng',
    name: 'Bloque Nacionalista Galego',
    short: 'BNG',
    abbr: 'BNG',
    color: '#9D174D',
    pcText: { light: '#9d174d', dark: '#c26f91' },
    badgeFg: '#ffffff',
    profile: 'areas',
    bloc: 'nacionalista',
    lang: 'gallego',
    doc: 'bng.rst',
    title: 'Programa electoral · 29N. Generales 2026',
    titleOrig: 'Programa electoral · 29N. Xerais 2026',
    pages: 91,
    words: 25684,
    tagline: 'Once áreas para "más fuerza para Galicia", con un bloque propio de soberanía digital.',
    axes: {
      fiscal: 'gradual', vivienda: 'precio', migracion: 'regular', energia: 'mixto',
      estado: 'autonomico', militar: 'reforma', ue: 'integrar', servicios: 'blindar'
    },
        highlights: [
      { k: '35 h', v: 'semanales, con horizonte de 32' },
      { k: '60 %', v: 'del salario medio como SMI' },
      { k: '4.000 M€', v: 'de condonación de deuda gallega' },
      { k: '9', v: 'líneas de soberanía digital' }
    ],
    keys: [
      { t: 'Derecho a una vida digna', d: 'Vivienda, derechos de la clase trabajadora, defensa del sistema público de pensiones, combate a la pobreza e inclusión social, acogida y derechos de las personas migrantes, políticas feministas, derechos LGBT y defensa de la democracia y de las libertades públicas.' },
      { t: 'Servicios públicos de calidad', d: 'Educación, sanidad, personas mayores y dependencia, garantías de buen gobierno y reestructuración de la administración estatal en Galicia.' },
      { t: 'Economía al servicio de las mayorías', d: 'Nueva fiscalidad, sector industrial, sector primario (agroganadero y pesquero), compromiso firme con las personas autónomas, ciencia e investigación y transición energética justa con minería sostenible.' },
      { t: 'Infraestructuras públicas', d: 'Infraestructuras ferroviarias, viarias y de puertos y aeropuertos, con ordenación territorial.' },
      { t: 'Crisis ambiental y lengua', d: 'Patrimonio natural y biodiversidad, ordenación y protección del litoral y medio marino, política forestal y montes; lengua gallega y cultura.' },
      { t: 'Democracia y soberanía digital', d: 'Nueve líneas: soberanía digital e IA gallega, derechos cívicos y control público de los algoritmos, nube soberana y datos en común, redes sociales al servicio de las personas, fiscalidad del valor digital, lucha contra el extractivismo digital y Galicia como nodo atlántico.' }
    ]
  },
  {
    id: 'bildu',
    name: 'EH Bildu',
    short: 'EH Bildu',
    abbr: 'EH',
    color: '#4C9A2A',
    pcText: { light: '#417e27', dark: '#4e9b2c' },
    badgeFg: '#1a1013',
    profile: 'capitulos',
    bloc: 'nacionalista',
    lang: 'euskera / castellano',
    doc: 'eh_bildu-es.rst',
    title: 'Posible hacerlo.',
    titleOrig: 'Posible egin.',
    pages: 30,
    words: 11817,
    tagline: 'Derechos y libertades, reconocimiento de Euskal Herria y paz y convivencia.',
    axes: {
      fiscal: 'gradual', vivienda: 'precio', migracion: 'regular', energia: 'mixto',
      estado: 'independiente', militar: 'desarme', ue: 'integrar', servicios: 'blindar'
    },
        highlights: [
      { k: '32 h', v: 'semanales o 4 días sin rebaja' },
      { k: '2 %', v: 'tope máximo de actualización anual de la renta' },
      { k: '21 %', v: 'IVA para el turismo de corta duración' },
      { k: '10', v: 'compromisos de paz' }
    ],
    keys: [
      { t: 'Vivienda: cambiar el modelo', d: 'Contratos ordinarios con prórroga automática, prohibición estructural de desahucios sin alternativa habitacional con compensación estatal, mecanismo especial de financiación estatal para los ayuntamientos con zonas tensionadas y prohibición de la compra especulativa por entidades jurídicas, fondos y grandes tenedores.' },
      { t: 'Regulación fina del alquiler', d: 'Extranjeros multipropietarios con al menos dos años de padrón previo, compra de edificios completos condicionada a alquiler regulado, máximo del 2 % de actualización anual de la renta, IVA del 21 % en alojamientos turísticos de corta duración y eliminación de las SOCIMIs como figura promotora.' },
      { t: 'Derechos y libertades', d: 'Empleo, pensiones, contención de precios, servicios públicos (salud, educación, cuidados y administración), escudo social, familias e infancia, política fiscal, transición ecosocial, feminismo y LGTBIQ+, migración, inteligencia artificial y libertad de expresión.' },
      { t: 'Nación y autogobierno', d: 'Reconocimiento de Euskal Herria como nación y plurinacionalidad, autogobierno, defensa del Concierto Económico Vasco y del Convenio Económico Navarro, euskera, cultura y producción audiovisual.' },
      { t: 'Paz: diez compromisos', d: 'Por los pueblos contra las injerencias, por la paz contra las guerras, seguridad europea e indivisible, no a la OTAN, bases fuera y los campos de Bardenas para la población, desarme nuclear, libertad para Palestina frente al genocidio y la ocupación, defensa del pueblo saharaui, fin del bloqueo contra Cuba y multilateralismo.' },
      { t: 'Convivencia', d: 'Convivencia y memoria democrática como primer apartado del bloque de paz.' }
    ]
  },
  {
    id: 'pnv',
    name: 'EAJ-PNV',
    short: 'PNV',
    abbr: 'PNV',
    color: '#0E7C6B',
    pcText: { light: '#0e7c6b', dark: '#41988a' },
    badgeFg: '#ffffff',
    profile: 'capitulos',
    bloc: 'nacionalista',
    lang: 'castellano / euskera',
    doc: 'pnv-es.rst',
    title: 'Defendemos Euskadi',
    pages: 43,
    words: 11267,
    tagline: 'Cinco compromisos para Euskadi, con la defensa del Concierto Económico como eje.',
    axes: {
      fiscal: 'gradual', vivienda: 'oferta', migracion: 'regular', energia: 'mixto',
      estado: 'autonomico', militar: 'reforma', ue: 'integrar', servicios: 'blindar'
    },
        highlights: [
      { k: '5', v: 'compromisos para Euskadi' },
      { k: '40 años', v: 'cotizados, sin penalización al jubilarse' },
      { k: 'Y vasca', v: 'con calendario de ejecución verificable' },
      { k: '43', v: 'páginas de programa' }
    ],
    keys: [
      { t: '01 · Poder construir tu vida aquí', d: 'Vivienda con más oferta y sin abusos, emancipación juvenil, mejores salarios y derechos laborales, educación que abra oportunidades y jóvenes con voz en las decisiones públicas.' },
      { t: '02 · Una Euskadi que trabaja y prospera', d: 'Industria fuerte con centros de decisión en Euskadi, apoyo a autónomos y emprendedores, energía competitiva, transición ecológica, futuro para campo y pesca, infraestructuras con fechas y una fiscalidad que favorezca la actividad.' },
      { t: '03 · Vivir con tranquilidad y con derechos', d: 'Ertzaintza con todas las capacidades, migración gestionada desde Euskadi con derechos y responsabilidades, igualdad real y vida libre de violencia machista, derechos LGTBIQ+ y derechos humanos sin retrocesos.' },
      { t: '04 · Cuidar lo que hemos conseguido', d: 'Pensiones dignas y justicia para las largas carreras de cotización, sanidad pública, reconocimiento del trabajo de cuidados, protección ante enfermedades graves y dependencia, reparación justa de las víctimas del amianto y protección de la infancia.' },
      { t: '05 · Decidir aquí, hacer que nos escuchen allí', d: 'Cumplimiento del Estatuto y defensa de competencias, relación bilateral y derechos históricos, defensa del Concierto Económico y un nuevo pacto político con reconocimiento nacional, bilateralidad y garantías; justicia más cercana, verdad y reparación, voz propia en Europa y fondos europeos gestionados desde Euskadi.' }
    ]
  },
  {
    id: 'adelante',
    name: 'Adelante Andalucía',
    short: 'Adelante',
    abbr: 'AA',
    color: '#A21CAF',
    pcText: { light: '#a21caf', dark: '#c167c9' },
    badgeFg: '#ffffff',
    profile: 'areas',
    bloc: 'regionalista',
    lang: 'castellano',
    doc: 'adelante_andalucia.rst',
    title: 'Un programa para frenar a las derechas',
    pages: 134,
    words: 31800,
    tagline: '29 medidas y 12 áreas: desprivatización de los servicios públicos y revolución fiscal.',
    axes: {
      fiscal: 'subir', vivienda: 'precio', migracion: 'regular', energia: 'renovable',
      estado: 'autonomico', militar: 'reforma', ue: 'integrar', servicios: 'blindar'
    },
    highlights: [
      { k: '29', v: 'medidas destacadas' },
      { k: '32 h', v: 'jornada laboral sin rebaja de sueldo' },
      { k: '48 h', v: 'cita en atención primaria' },
      { k: '100 %', v: 'público en tren, sanidad y energía' }
    ],
    keys: [
      { t: 'Combate a la especulación', d: 'Fin de la especulación inmobiliaria y garantía del derecho a la vivienda, con un plan estatal de vivienda y criterios de cesión, protección frente a los desahucios y regulación del alquiler.' },
      { t: 'Desprivatización del transporte', d: 'Reversión de la liberalización ferroviaria, auditoría independiente de la alta velocidad tras Adamuz y Urda, fin de las externalizaciones, Cercanías y media distancia gestionados desde Andalucía al 100 % público, tren en todos los municipios de más de 20.000 habitantes y un abono único andaluz.' },
      { t: 'Trabajo', d: 'Jornada laboral de 32 horas sin rebaja de sueldo, prohibición del turno partido sin rebaja salarial y salarios y salario mínimo ligados a la inflación por ley.' },
      { t: 'Revolución fiscal', d: 'Impuesto a las grandes fortunas y a los terratenientes, IRPF que baja a las rentas más bajas y sube con fuerza a partir de 100.000 € al año, impuestos permanentes a los beneficios extraordinarios de la banca y las eléctricas, banca pública y red de supermercados públicos.' },
      { t: 'Servicios públicos al 100 %', d: 'Pensiones dignas y 100 % públicas, desprivatización de toda la sanidad, la sanidad privada devuelve lo que gana con lo público, cita en atención primaria en 48 horas y salud mental en 15 días, todo el dinero público para la escuela pública, escuela infantil 0-3 gratuita y 100 % pública, defensa de la universidad pública y ley estatal de cuidados.' },
      { t: 'Andalucía en el Estado', d: 'Desprivatización de toda la energía para una transición ecosocial, financiación justa para Andalucía, "Andalucía, nacionalidad histórica", agua, Guadalquivir y Doñana, fin de los privilegios políticos, fuera de las leyes mordaza, medios públicos plurales y justicia para Palestina, el Sáhara y el Rif.' }
    ]
  },
  {
    id: 'compromis',
    name: 'Compromís-Front Valencià',
    short: 'Compromís',
    abbr: 'C-F',
    color: '#8A9A0B',
    pcText: { light: '#6a7610', dark: '#8a9a0b' },
    badgeFg: '#1a1013',
    profile: 'areas',
    bloc: 'regionalista',
    lang: 'catalán',
    doc: 'compromis_front_valencia.rst',
    title: 'Programa electoral 29N',
    pages: 64,
    words: 16744,
    tagline: 'Siete prioridades de izquierda valenciana, con la DANA como prueba de los acuerdos.',
    axes: {
      fiscal: 'gradual', vivienda: 'precio', migracion: 'regular', energia: 'renovable',
      estado: 'autonomico', militar: 'reforma', ue: 'integrar', servicios: 'blindar'
    },
        highlights: [
      { k: '7', v: 'prioridades de la coalición' },
      { k: '465 M€', v: 'de recaudación fiscal adicional' },
      { k: '50 M€', v: 'para la autoridad metropolitana de transporte' },
      { k: '2 años', v: 'después de la DANA' }
    ],
    keys: [
      { t: '1 · Una vida segura', d: 'Vivienda, salarios y condiciones laborales, personas autónomas y pensiones.' },
      { t: '2 · Servicios públicos para cuidar y proteger', d: 'Sanidad, salud pública, educación, servicios sociales y sistemas de cuidados, movilidad sostenible, cultura, deporte, ocio educativo, modelo comunicativo y derechos digitales y universidades.' },
      { t: '3 · Democratización de la economía', d: 'Fiscalidad, comercio, industria y empresa, ciencia e innovación, agricultura y pesca, derechos de las personas consumidoras y turismo.' },
      { t: '4 · Un territorio habitable y resiliente', d: 'Medio ambiente y biodiversidad, energía, agua, territorio, modelo de ciudad y urbanismo y respuesta a las emergencias.' },
      { t: '5 · Más democracia, más derechos, más libertades', d: 'Administración pública, transparencia y participación, anticorrupción, justicia y seguridad, memoria democrática, derechos lingüísticos, laicismo, derechos animales, infancia, personas mayores, familias, juventud, igualdad de trato, feminismo y derechos LGTBIQ+.' },
      { t: '6-7 · País con voz propia y Compromís con la Paz', d: 'Modelo de financiación autonómica, modelo de Estado y municipalismo; y política exterior y defensa, derechos humanos y legalidad internacional, Unión Europea, solidaridad global y migración.' }
    ]
  },
  {
    id: 'cc',
    name: 'Coalición Canaria y Municipalistas',
    short: 'CC',
    abbr: 'CC',
    color: '#45B8E8',
    pcText: { light: '#337895', dark: '#45b8e8' },
    badgeFg: '#1a1013',
    profile: 'capitulos',
    bloc: 'regionalista',
    lang: 'castellano',
    doc: 'coalicion_canaria.rst',
    title: 'Defiende Canarias',
    pages: 23,
    words: 9239,
    tagline: 'Diez causas y cien acciones, con el autogobierno y el REF como eje.',
    axes: {
      fiscal: 'gradual', vivienda: 'precio', migracion: 'regular', energia: 'renovable',
      estado: 'autonomico', militar: 'reforma', ue: 'integrar', servicios: 'blindar'
    },
        highlights: [
      { k: '10', v: 'causas' },
      { k: '100', v: 'acciones' },
      { k: '<35 años', v: 'plan de empleo juvenil' },
      { k: '23', v: 'páginas de programa' }
    ],
    keys: [
      { t: '1-2 · Derechos y servicios', d: 'Defender los derechos de Canarias con un calendario verificable para completar los traspasos del Estatuto y el reconocimiento permanente de la singularidad canaria; defender los servicios públicos y los cuidados.' },
      { t: '3-4 · Permanecer y trabajar', d: 'Defender el derecho a vivir y permanecer en Canarias y a quienes levantan Canarias cada día.' },
      { t: '5-7 · Futuros y territorio', d: 'El futuro de los jóvenes y el conocimiento, la tierra y los recursos, y la defensa de las ocho islas.' },
      { t: '8-9 · Migración e identidad', d: 'Una política migratoria solidaria y europea y la defensa de la identidad y de la posición en el Atlántico, con energía limpia, almacenamiento, economía azul y cooperación atlántica.' },
      { t: '10 · Capacidad de decidir', d: 'Peso de los municipios y los cabildos, uso del ahorro público para las necesidades de Canarias —incluida la reconstrucción de La Palma— y datos para evaluar el REF.' }
    ]
  },
  {
    id: 'frente_amplio',
    name: 'Frente Amplio',
    short: 'Frente Amplio',
    abbr: 'FA',
    color: '#F97316',
    pcText: { light: '#b15719', dark: '#f97316' },
    badgeFg: '#1a1013',
    profile: 'areas',
    bloc: 'nacional',
    lang: 'castellano',
    doc: 'frente_amplio.rst',
    title: 'Un Programa como una Casa',
    pages: 151,
    words: 48994,
    tagline: '18 bloques con medidas muy cuantificadas: el más extenso de los programas del repositorio.',
    axes: {
      fiscal: 'subir', vivienda: 'universal', migracion: 'regular', energia: 'renovable',
      estado: 'federal', militar: 'desarme', ue: 'pueblos', servicios: 'blindar'
    },
    highlights: [
      { k: '1 % del PIB', v: '≈17.000 M€/año para vivienda' },
      { k: '1,5 M', v: 'viviendas públicas en 12 años' },
      { k: '32 h', v: 'jornada máxima semanal' },
      { k: '3,5 % del PIB', v: 'inversión anual en transición ecológica' }
    ],
    keys: [
      { t: 'Vivienda: un parque público y asequible', d: 'Asignación permanente del 1 % del PIB (unos 17.000 M€/año), 1,5 millones de viviendas públicas en 12 años (125.000 al año) hasta el 20 % del parque en 2035, tope de alquiler vinculado al 25 % de la renta media del barrio, expropiación progresiva del stock de grandes tenedores, prohibición de compra especulativa por personas jurídicas y bancos y reforma del artículo 47 de la Constitución con exigibilidad judicial directa.' },
      { t: 'Reforma fiscal en profundidad', d: 'Que las grandes empresas paguen lo que les corresponde, más contribución de los grandes patrimonios, las rentas del capital tributan como las del trabajo, un IVA más justo, fiscalidad verde y sobre el lujo y lucha reforzada contra el fraude fiscal.' },
      { t: 'Trabajo y pensiones', d: 'Jornada máxima de 32 horas semanales sin reducción salarial, registro digital de jornada, blindaje constitucional del carácter público de las pensiones, pensión mínima igual al SMI, reducción de la edad de jubilación y eliminación de la penalización a quienes han cotizado más de 40 años, y auditoría pública de la Seguridad Social.' },
      { t: 'Derechos sociales', d: 'Prestación universal por crianza de 200 €/mes por menor, escudo social y comedor escolar gratuito, reforma integral del IMV, modelo de cuidados, sanidad y educación públicas reforzadas, cultura como derecho y feminismo que pone la vida en el centro.' },
      { t: 'Clima, industria y poder digital', d: 'Inversión del 3,5 % del PIB anual en transición ecológica, revisión al alza del PNIEC, reversión de la liberalización ferroviaria, banca pública, política industrial activa, gobernanza digital, transparencia algorítmica y regulación de la inteligencia artificial.' },
      { t: 'Europa, paz y democracia', d: 'Embargo integral de armas y medidas frente a Israel y la ocupación en Palestina, el pueblo saharaui y el fin de la "Europa fortaleza", una Europa de los pueblos con fiscalidad común y un Mecanismo Soberano Europeo; y una República Federal con fin de la criminalización de la protesta social.' }
    ]
  },
  {
    id: 'frente_obrero',
    name: 'Frente Obrero',
    short: 'F. Obrero',
    abbr: 'FO',
    color: '#991B1B',
    pcText: { light: '#991b1b', dark: '#c17474' },
    badgeFg: '#ffffff',
    profile: 'capitulos',
    bloc: 'nacional',
    lang: 'castellano',
    doc: 'frente_obrero.rst',
    title: 'Recuperar España',
    pages: 64,
    words: 12979,
    tagline: 'Programa revolucionario de orientación comunista: los trabajadores primero y la soberanía nacional.',
    axes: {
      fiscal: 'subir', vivienda: 'universal', migracion: 'expulsion', energia: 'mixto',
      estado: 'federal', militar: 'desarme', ue: 'critica', servicios: 'blindar'
    },
        highlights: [
      { k: '21', v: 'capítulos' },
      { k: '10 años', v: 'sin huelga general' },
      { k: '80 %', v: 'de los autónomos no tienen empleados' },
      { k: '23 M ha', v: 'de superficie agraria española' }
    ],
    keys: [
      { t: 'Los trabajadores primero', d: 'Denuncia del boicot sindical, la precariedad y el estancamiento salarial, y un proyecto de "recuperar un movimiento obrero" capaz de paralizar el país.' },
      { t: 'Soberanía nacional', d: 'Un capítulo propio, con recuperación de la industria española, soberanía energética y un programa fiscal propio, más un bloque sobre ejército y fuerzas y cuerpos de seguridad del Estado.' },
      { t: 'Bloque social', d: 'Educación, cultura, juventud, mujer e igualdad real, natalidad y familia, en defensa del campo español, contra la censura, sanidad, vivienda, pensiones e inmigración.' },
      { t: 'La postura del programa', d: 'El programa niega que el capitalismo se pueda reformar ("es un sistema basado en la explotación de la gran mayoría al servicio de unos pocos") y rechaza el modelo migratorio actual, con la cartelera obrera como eje de la política.' }
    ]
  },
  {
    id: 'pacma',
    name: 'PACMA',
    short: 'PACMA',
    abbr: 'PACMA',
    color: '#0FA3C4',
    pcText: { light: '#127a92', dark: '#0fa3c4' },
    badgeFg: '#1a1013',
    profile: 'areas',
    bloc: 'nacional',
    lang: 'castellano',
    doc: 'pacma.rst',
    title: 'Vota por lo que crees',
    pages: 82,
    words: 41387,
    tagline: 'Tres bloques: animales, medio ambiente y personas, con propuestas muy detalladas.',
    axes: {
      fiscal: 'gradual', vivienda: 'precio', migracion: 'regular', energia: 'renovable',
      estado: 'autonomico', militar: 'reforma', ue: 'integrar', servicios: 'blindar'
    },
        highlights: [
      { k: '3', v: 'bloques temáticos' },
      { k: '1', v: 'Dirección General de Bienestar Animal' },
      { k: '-30/40 %', v: 'de impacto climático con un 50 % de dieta vegetal' },
      { k: '82', v: 'páginas de programa' }
    ],
    keys: [
      { t: 'Una verdadera ley de bienestar animal', d: 'Ampliación del ámbito de protección sin exclusiones, prohibición de compraventa de animales de compañía, esterilización obligatoria, abandono y sacrificio cero, método CER para las colonias, fin de zoológicos, acuarios y cautividad con fines de entretenimiento y abolición de los espectáculos con animales.' },
      { t: 'Contra la caza, las granjas peleteras y la experimentación', d: 'Oposición a la caza y protección del lobo y el zorro, prohibición de granjas peleteras, fin de la experimentación en animales, Ley de Grandes Simios y endurecimiento real de las penas por maltrato, con unidades especializadas en la Fiscalía y las fuerzas de seguridad.' },
      { t: 'Cuidar de la industria', d: 'Fin de las jaulas, de las amputaciones no curativas, de la alimentación forzada y del foie gras, prohibición de los sacrificios halal y kosher y etiquetado de alimentos sobre el sistema de cría y el método de sacrificio.' },
      { t: 'Medio ambiente', d: 'Freno al cambio climático con un modelo energético sostenible, NO a las macrogranjas, contra las piscifactorías, fin de la comercialización de tiburón, veto a los pulpos, prohibición del glifosato, defensa de la agricultura ecológica, fin de la obsolescencia programada y preservación de bosques y patrimonio natural.' },
      { t: 'Personas', d: 'Acceso a bienes básicos, sanidad pública universal y de calidad, oposición al copago, educación y cultura para todos, empleo justo y de calidad, vivienda digna, lucha contra la despoblación rural, I+D+i con fines sociales, lucha contra el fraude fiscal y regeneración democrática con reforma de la Ley Electoral.' }
    ]
  },
  {
    id: 'humanista',
    name: 'Partido Humanista',
    short: 'Humanista',
    abbr: 'PH',
    color: '#9BC53D',
    pcText: { light: '#5f772f', dark: '#9bc53d' },
    badgeFg: '#1a1013',
    profile: 'plan',
    bloc: 'nacional',
    lang: 'castellano',
    doc: 'partido_humanista.rst',
    title: 'Elecciones Generales 2026',
    pages: 31,
    words: 7875,
    tagline: 'Once áreas con propuestas numeradas, diagnóstico de datos y tablas de financiación.',
    axes: {
      fiscal: 'subir', vivienda: 'precio', migracion: 'regular', energia: 'renovable',
      estado: 'federal', militar: 'desarme', ue: 'critica', servicios: 'blindar'
    },
    highlights: [
      { k: '30 h', v: 'jornada laboral semanal' },
      { k: '9,5 % del PIB', v: 'inversión sanitaria' },
      { k: '7 % del PIB', v: 'inversión educativa' },
      { k: '-50 %', v: 'gasto militar' }
    ],
    keys: [
      { t: 'Economía y empleo', d: 'Ley de Propiedad Participada de los Trabajadores, Renta Básica Universal e Incondicional, reducción de la jornada a 30 horas semanales y Banca Pública sin Interés.' },
      { t: 'Vivienda', d: 'Plan para un Parque Público de Alquiler Social, prohibición de compra especulativa y fin de ventajas a SOCIMIs, regla del 30 % como tope legal de alquiler indexado, cesión de uso obligatoria de viviendas desocupadas y blindaje procesal frente a desahucios sin alternativa.' },
      { t: 'Sanidad y cuidados', d: 'Blindaje constitucional de la gestión directa del SNS, inversión sanitaria hasta el 9,5 % del PIB, Plan Nacional de Salud Mental Comunitaria, ampliación de la cartera común con odontología y óptica, y Sistema Nacional Público de Cuidados Comunitarios.' },
      { t: 'Educación', d: 'Inversión educativa blindada al 7 % del PIB, ratios máximas de 15 alumnos por aula, pedagogía de la No Violencia Activa y Pensamiento Crítico, gratuidad total de la etapa universitaria y de la FP.' },
      { t: 'Democracia', d: 'Ley de Responsabilidad Política, democracia directa digital y vinculante, reforma de la LOREG hacia la proporcionalidad real y descentralización e independencia de la cúpula judicial.' },
      { t: 'No violencia, desarme e migración', d: 'Neutralidad activa y salida de la OTAN, firma y ratificación del TPAN, cierre de bases militares extranjeras, reducción del 50 % del gasto militar y reconversión industrial; derogación de la Ley de Extranjería, cierre de los CIEs y regularización extraordinaria, con el lema "ningún ser humano es ilegal".' }
    ]
  },
  {
    id: 'mj',
    name: 'Por un Mundo Más Justo (M+J)',
    short: 'M+J',
    abbr: 'M+J',
    color: '#4338CA',
    pcText: { light: '#4338ca', dark: '#857edd' },
    badgeFg: '#ffffff',
    profile: 'plan',
    bloc: 'nacional',
    lang: 'castellano',
    doc: 'por_un_mundo_mas_justo.rst',
    title: 'Si no es justo, cámbialo',
    pages: 95,
    words: 19687,
    tagline: '32 áreas con objetivos, medidas, compromisos medibles 2026-2030 y fuentes consultadas.',
    axes: {
      fiscal: 'gradual', vivienda: 'precio', migracion: 'regular', energia: 'renovable',
      estado: 'autonomico', militar: 'reforma', ue: 'pueblos', servicios: 'blindar'
    },
        highlights: [
      { k: '32', v: 'áreas' },
      { k: '1,35 M', v: 'de viviendas sociales en 2030' },
      { k: '30 %', v: 'de la renta familiar como tope de alquiler' },
      { k: '10 %', v: 'de parque social en la década siguiente' }
    ],
    keys: [
      { t: 'El formato es la seña', d: 'Cada área se abre con OBJETIVOS, MEDIDAS, COMPROMISOS MEDIBLES 2026-2030 y FUENTES CONSULTADAS, lo que lo convierte en el programa más auditable del repositorio.' },
      { t: 'Vivienda (área 1)', d: 'Gran parque público de vivienda asequible en alquiler, carácter público y permanente de la vivienda protegida, movilización de suelo e inmuebles públicos, regulación de los alquileres privados, garantías para las pequeñas propietarias, recuperación de vivienda existente, freno a la especulación, Agencia Pública de Información y Protección de la persona inquilina y protección frente a los desahucios.' },
      { t: 'Resto de áreas', d: 'Convivencia, mayores, infancia y adolescencia, jóvenes, pensiones, fiscalidad justa y sostenibilidad de las finanzas públicas, trabajo digno, autónomos, industria, sanidad, salud mental, cuidados, educación, ciencia, política migratoria, emergencia climática, biodiversity, transición energética, protección animal, cultura, política exterior, calidad democrática, buen gobierno, participación ciudadana, erradicación de la pobreza, igualdad, derechos LGTBI, sinhogarismo, prisiones, cooperación y repoblación rural.' },
      { t: 'Guía por colectivos', d: 'El programa se abre además con una guía transversal por colectivos: derechos y democracia, mundo y paz, inclusión social, igualdad, economía y empleo, conocimiento y cultura, servicios públicos, mayores, planeta, mundo rural, familias e infancia y jóvenes.' }
    ]
  },
  {
    id: 'democracia21',
    name: 'Democracia 21',
    short: 'D-21',
    abbr: 'D21',
    color: '#155E75',
    pcText: { light: '#155e75', dark: '#6092a1' },
    badgeFg: '#ffffff',
    profile: 'manifiesto',
    bloc: 'nacional',
    lang: 'castellano',
    doc: 'democracia21.rst',
    title: 'España Limpia',
    pages: 13,
    words: 2559,
    tagline: 'El programa más corto y más concreto: instituciones contra el clientelismo.',
    axes: {
      fiscal: 'gradual', vivienda: 'oferta', migracion: 'control', energia: 'nuclear',
      estado: 'unitario', militar: 'reforma', ue: 'integrar', servicios: 'eficiencia'
    },
        highlights: [
      { k: '90 %', v: 'menos asesores en los órgãos de gobierno' },
      { k: '8 años', v: 'máximo de mandatos' },
      { k: '4,5 % del PIB', v: 'coste de la corrupción según el FMI' },
      { k: '13', v: 'páginas de programa' }
    ],
    keys: [
      { t: 'Fin del clientelismo', d: 'Punto final al "tsunami de asesores", fuera de los cargos de carnet y del delito de enchufismo, y no más impuestos revolucionarios para los partidos políticos.' },
      { t: 'Cortar de raíz la corrupción', d: 'Nuevos juzgados especializados en corrupción, el mismo control para el político que para el ciudadano, Fiscalía y oficina anticorrupción más fuertes, sin refugio para los corruptos, los partidos políticos tampoco salen impunes y "quien roba a lo público no volverá nunca a lo público".' },
      { t: 'Reparto de sillones y aforamientos', d: 'Consejo General del Poder Judicial despolitizado, Fiscalía independiente, organismos de control independientes y fin de todos los aforamientos.' },
      { t: 'Devolver el poder al ciudadano', d: 'Escuchar será obligatorio, no más bloqueos, "si no trabajan no cobran", no habrá gobierno sin presupuestos y menos promesas, más resultados.' },
      { t: 'Gobernar con ética', d: 'Código ético de gobierno obligatorio y con dos mandatos basta: 8 años como máximo.' },
      { t: 'Sistema electoral', d: 'Aire fresco en el sistema electoral, dentro de un bloque centrado en la despolitización de las instituciones.' }
    ]
  },
  {
    id: 'salf',
    name: 'Se Acabó La Fiesta (SALF)',
    short: 'SALF',
    abbr: 'SALF',
    color: '#8C6D1F',
    pcText: { light: '#8b6c1f', dark: '#a08645' },
    badgeFg: '#ffffff',
    profile: 'contrato',
    bloc: 'nacional',
    lang: 'castellano',
    doc: 'salf.rst',
    title: 'Contrato electoral',
    pages: 40,
    words: 8598,
    tagline: 'Diez bloques, un compromiso numerado por partida y una factura fiscal que paid.',
    axes: {
      fiscal: 'bajar', vivienda: 'fiscal', migracion: 'expulsion', energia: 'nuclear',
      estado: 'unitario', militar: 'mas', ue: 'critica', servicios: 'eficiencia'
    },
    highlights: [
      { k: '35.000 €', v: 'libres de IRPF' },
      { k: '0 %', v: 'IBI eliminado' },
      { k: '70.000 M€', v: 'que la banca devuelve en 15 años' },
      { k: '48 h', v: 'de expulsión o de licencia' }
    ],
    keys: [
      { t: 'Vivienda (10 compromisos)', d: 'Primera vivienda un 35 % más barata por ley, suelo público gratis y vivienda en propiedad, licencia en un mes o silencio positivo y licencia automática en 15 días, eliminación total del IBI, hipoteca joven con aval del Estado y.okupa fuera en 48 horas.' },
      { t: 'Impuestos (14 compromisos)', d: '35.000 € libres de IRPF, 5.000 € más por cada hijo, fin de la subida por inflación, autónomos sin cuota, Sociedades al 20 % (15 % si se reinvierte, 10 % en startups), supresión de sucesiones, donaciones y patrimonio, IVA del 4 % en luz y agua, techo constitucional a impuestos y deuda, el efectivo como derecho constitucional y la banca devuelve el rescate: 70.000 millones en 15 años.' },
      { t: 'Inmigración (10 compromisos)', d: 'Orden de expulsión = expulsión en 48 horas, fin de las regularizaciones, readmisión o nada, congelación de la inmigración de países no colaboradores, prioridad hispanoamericana con nacionalidad que se gana, residencia y nacionalidad revocables, "hermanos Musulmanes" ilegalizados, velo integral prohibido y sin papeles, sin ayudas.' },
      { t: 'Seguridad y corrupción', d: 'Macrocárcel para asesinos, violadores, narcos y corruptos, castración química para agresores sexuales, triplicar UCO, UDEF y UDYCO, justicia en 72 horas; la corrupción no prescribe, el que denuncia cobra el 15 %, fuera del Tribunal Constitucional, fin de los aforamientos y 15 años y a casa.' },
      { t: 'Sanidad, empleo y educación', d: 'Una sola central de compras, 60 días para operarte o donde tú elijas, 10.000 camas y 1.500 UCI más, cita con tu médico en 48 horas, la sanidad española es para los españoles, salud mental sin lista de espera; cuña fiscal del 41 al 29 %, contrato único con mochila, oposiciones a ciegas; FP desde los 15 y "el profesor es autoridad pública".' },
      { t: 'Geopolítica (14 compromisos)', d: 'Referéndum de renegociación europea y de salida si Bruselas se niega, veto a Mercosur, al recorte de la PAC y al Pacto Verde, guerra a los "hermanos Musulmanes", bloqueo comercial a Marruecos, Ceuta y Melilla como plaza franca con 0 % de IRPF, 5.000 militares más, Gibraltar con la soberanía sobre la mesa y el 2 % de Defensa gastado en España.' }
    ]
  },
  {
    id: 'iustitia',
    name: 'Iustitia Europa (IE)',
    short: 'IE',
    abbr: 'IE',
    color: '#2E4B9B',
    pcText: { light: '#2e4b9b', dark: '#7588bd' },
    badgeFg: '#ffffff',
    profile: 'contrato',
    bloc: 'nacional',
    lang: 'castellano',
    doc: 'iustitia_europa.rst',
    title: 'Contrato electoral',
    pages: 28,
    words: 4382,
    tagline: 'Quince capítulos: reforma de la Constitución, tijeretazo económico y menos Unión Europea.',
    axes: {
      fiscal: 'recorte', vivienda: 'fiscal', migracion: 'expulsion', energia: 'nuclear',
      estado: 'unitario', militar: 'mas', ue: 'critica', servicios: 'reducir'
    },
        highlights: [
      { k: '15', v: 'capítulos' },
      { k: '9 años', v: 'mandato del Tribunal Constitucional, no renovable' },
      { k: '4 años', v: 'mandato del Presidente, elegido por sufragio universal' },
      { k: '4 años', v: 'de cuota cero para autónomos' }
    ],
    keys: [
      { t: 'Superar el régimen del 78', d: 'Reforma de la Constitución Española y despartidización del Estado como los ejes estructurales del programa.' },
      { t: 'Tijeretazo económico', d: 'Reducción drástica del gasto político, de la administración y de las subvenciones, transparencia y control del gasto público, reforma de las pensiones, cuota cero de autónomos durante cuatro años, fin de la subvención pública al clientelismo y vivienda: propiedad frente a especulación e intervencionismo estatal.' },
      { t: 'Más España y menos Unión Europea', d: 'Rechazo de las subvenciones de la UE y de las organizaciones supranacionales, y un capítulo específico contra la Agenda 2030.' },
      { t: 'Inmigración: tolerancia cero', d: 'Reforma integral de la Ley de Extranjería con tolerancia cero con la inmigración ilegal y fronteras blindadas con Ejército y Armada.' },
      { t: 'Resto de capítulos', d: 'Nuevo modelo policial, educación sin ideología, integración de las terapias naturales en el Servicio Nacional de Salud y modernización de la justicia, energía para "apagar el globalismo y encender España", defensa del sector primario y defensa de los derechos fundamentales y las libertades públicas.' }
    ]
  },
  {
    id: 'teruel',
    name: 'Teruel Existe',
    short: 'Teruel Existe',
    abbr: 'TE',
    color: '#64748B',
    pcText: { light: '#627188', dark: '#7d8a9e' },
    badgeFg: '#ffffff',
    profile: 'capitulos',
    bloc: 'regionalista',
    lang: 'castellano',
    doc: 'teruel_existe.rst',
    title: 'Faltaría más',
    pages: 15,
    words: 6016,
    tagline: 'Cinco prioridades y doce líneas: "ser pocos no resta derechos".',
    axes: {
      fiscal: 'gradual', vivienda: 'precio', migracion: 'regular', energia: 'renovable',
      estado: 'autonomico', militar: 'reforma', ue: 'integrar', servicios: 'blindar'
    },
        highlights: [
      { k: '700.000', v: 'viviendas al año de rehabilitación' },
      { k: '100 M€', v: 'de Fondo de Inversiones de Teruel' },
      { k: '20 %', v: 'de capacidad de red reservada al autoconsumo' },
      { k: '15', v: 'páginas de programa' }
    ],
    keys: [
      { t: '01 Un cambio de rumbo', d: 'Políticas de desarrollo con equilibrio territorial y las mismas oportunidades en todos los territorios.' },
      { t: '02 Teruel no será territorio de sacrificio', d: 'Renovables, minería y centros de datos amenazan el futuro de la provincia a cambio de nada: poner orden en el descontrol, decir lo que no aceptarán y una energía en manos de la ciudadanía.' },
      { t: '03 Financiación justa para Teruel', d: 'Trato diferenciado y cumplimiento efectivo de lo pactado.' },
      { t: '04 Servicios públicos para todo el territorio', d: 'Sanidad pública de calidad, servicios públicos y cuidados, vivienda, arraigo y futuro: "vivas donde vivas, son nuestros derechos".' },
      { t: '05 Infraestructuras que vertebren el territorio', d: 'Carreteras (A-68, A-40, A-25 y Teruel-Requena-Almansa), ferrocarril y movilidad y conectividad.' },
      { t: 'Resto del programa', d: 'Un campo vivo (agricultura y ganadería, agua del siglo XXI, montes e incendios), economía y empleo, ciencia, universidad y cultura, repoblación y derechos con un Pacto de Estado, medio ambiente y paisaje, una sociedad de personas iguales e instituciones al servicio de la ciudadanía.' }
    ]
  },
  {
    id: 'soria',
    name: 'Soria ¡Ya!',
    short: 'Soria ¡Ya!',
    abbr: 'SY',
    color: '#78350F',
    pcText: { light: '#78350f', dark: '#aa8068' },
    badgeFg: '#ffffff',
    profile: 'manifiesto',
    bloc: 'regionalista',
    lang: 'castellano',
    doc: 'soria_ya.rst',
    title: 'Soria ¡Sí! · Del Olvido al Futuro',
    pages: 1,
    words: 740,
    tagline: 'El programa más breve del repositorio: doce líneas contra la despoblación.',
    axes: {
      fiscal: 'gradual', vivienda: 'oferta', migracion: 'regular', energia: 'mixto',
      estado: 'autonomico', militar: 'reforma', ue: 'integrar', servicios: 'blindar'
    },
        highlights: [
      { k: '10 años', v: 'de plan contra la despoblación' },
      { k: 'A-11 y A-15', v: 'autovías que deben completarse' },
      { k: '1', v: 'página de programa' },
      { k: '740', v: 'palabras' }
    ],
    keys: [
      { t: 'Plan extraordinario de 10 años', d: 'Contra la despoblación, con conectividad digital para todos, plan de relevo generacional y plan de vivienda para zonas despobladas.' },
      { t: 'Campo, montes y energía', d: 'Impulso al campo, montes y medio ambiente, energía de Soria para el desarrollo de la provincia y fin del aislamiento en autovías y ferrocarril.' },
      { t: 'Servicios y talento', d: 'Garantía de servicios públicos en el medio rural, educación y talento con el lema "estudiar fuera, volver a Soria" y acceso seguro a la sanidad.' },
      { t: 'Impulso económico', d: 'Impulso logístico, inversión, emprendimiento y nómadas digitales, y la propuesta de que Soria sea sede de organismos públicos.' }
    ]
  },
  {
    id: 'feministas',
    name: 'Feministas al Congreso',
    short: 'Feministas',
    abbr: 'FC',
    color: '#EC4899',
    pcText: { light: '#c03f7f', dark: '#ec4a9a' },
    badgeFg: '#1a1013',
    profile: 'manifiesto',
    bloc: 'nacional',
    lang: 'castellano',
    doc: 'feministas_al_congreso.rst',
    title: 'Juntas hacemos historia',
    pages: 2,
    words: 617,
    tagline: 'El programa más breve del repositorio: dos páginas y una breve declaración.',
    axes: {
      fiscal: 'gradual', vivienda: 'precio', migracion: 'regular', energia: 'renovable',
      estado: 'autonomico', militar: 'reforma', ue: 'integrar', servicios: 'blindar'
    },
        highlights: [
      { k: '617', v: 'palabras' },
      { k: '2', v: 'páginas' },
      { k: '1', v: 'lema: "Juntas hacemos historia"' },
      { k: '0', v: 'desglose por áreas temáticas' }
    ],
    keys: [
      { t: 'Un formato declarativo', d: 'El documento no desarrolla un programa por áreas: es una declaración breve bajo el lema "Juntas hacemos historia", con una cabecera de propuestas y un cierre colectivo.' },
      { t: 'Peso real', d: 'Con 617 palabras es la aportación más pequeña del conjunto: sirve como contraste sobre la brecha de longitud entre programas (de 617 a 51.399 palabras).' }
    ]
  }
];

/* Estado de la posición nacional dentro del eje de migration, etc. */
const BLOCS = [
  { id: 'nacional', label: 'Nacionales con representación general' },
  { id: 'nacionalista', label: 'Nacionalistas de ámbito estatal' },
  { id: 'regionalista', label: 'Regionales o de ámbito territorial' },
  { id: 'otros', label: 'Otros' }
];

/* Detalle por partido y tema para la tabla comparativa */
const DETAIL = {
  pp: {
    fiscal: 'Baja el IRPF, deflacta el IRPF y aplica un 0 % a quien cobre el SMI. Bonificación del 100 % del IRPF el primer año a menores de 35.',
    vivienda: 'Nueva Ley del Suelo, licencias en 3 meses y deroga de la Ley de Vivienda: fin de zonas tensionadas y del índice de precios.',
    migracion: 'Control de fronteras y "compromiso mutuo" para vivir en España; el Estado presente en todo el territorio.',
    energia: 'Elimina el calendario de cierre de las cinco centrales, suprime el impuesto del 7 % a la producción y garantiza la red.',
    estado: 'Reunir la Nación, pacto territorial y la nacionalidad española como vínculo de pertenencia.',
    militar: 'España tendrá medios para su defensa, con el 2 % de gasto en defensa.',
    ue: 'Defender la PAC: rechazo del Pacto Verde por no haber sido sometida a votación.',
    servicios: 'Administración rigurosa y dimensionada: menos estructuras y eliminación del gasto superfluo.'
  },
  psoe: {
    fiscal: 'Deducción del IRPF condicionada a la evolución de los precios, tasa a los tecnooligarcas, tasa al lujo y refuerzo de la tasa Tobin.',
    vivienda: 'Reforma de la Constitución, 1 % del PIB anual, 100.000 viviendas públicas estatales e impuesto a solares ociosos.',
    migracion: 'Plan de Integración y Ciudadanía 2026-2030, desarrollo de la Ley Zerolo y una protección internacional efectiva.',
    energia: 'Mantiene el cierre nuclear hasta 2035 con transición justa, almacenamiento y Plan Social para el Clima.',
    estado: 'Un Estado autonómico que funciona: cooperación, autogobierno y cohesión.',
    militar: 'Defensa moderna al servicio de la paz y la seguridad, con España como observador del TPAN y defensa del multilateralismo.',
    ue: 'Ampliación con los Balcanes Occidentales, impuesto mínimo global y Una UE más integrada y democrática.',
    servicios: 'Gestión directa como modalidad preferente en la sanidad, listas de espera, Plan Sonríe y 0-3 universal.'
  },
  podemos: {
    fiscal: 'Impuesto a las grandes fortunas, gravámenes a banca y eléctricas, nacionalización de REPSOL y fin de la exención del IBI eclesial.',
    vivienda: 'Alquileres -40 % por ley, expropiación de uso de ~626.000 viviendas, parque público y contratos indefinidos.',
    migracion: 'Vías legales y seguras, cierre de los CIE, ius soli y ley integral antirracista.',
    energia: 'Sistema eléctrico 100 % renovable y libre de combustibles fósiles, ley de residuo cero.',
    estado: 'España, república plurinacional: proceso constituyente, referéndum y reforma federal del Senado.',
    militar: 'Reversión completa del rearme, embargo de armas contra Israel y desarme.',
    ue: 'Europa de los pueblos: mecanismo soberano europeo, fiscalidad común y rechazo del «Europa fortaleza».',
    servicios: 'Blindaje del derecho al aborto, universalización de la sanidad, la educación y los servicios sociales.'
  },
  vox: {
    fiscal: 'Rebaja masiva de IRPF, IVA y Sociedades; cuota cero para autónomos bajo el SMI y fiscalidad mínima en zonas de despoblación.',
    vivienda: 'Reforma de la Ley del Suelo para "volver a ver grúas en los cielos", sin trabas regulatorias y prioridad nacional.',
    migracion: 'Ni uno más: fin de regularizaciones y arraigo, repatriación, deportación, MENAS con sus familias.',
    energia: 'Soberanía energética, fin del tope a la inversión en redes, reversión del Pacto Verde y recuperación del plan nuclear.',
    estado: 'Prioridad nacional y restauración de la frontera como eje del Estado.',
    militar: 'Más medios de defensa y suspensión de acuerdos internacionales contrarios al interés nacional.',
    ue: 'Suspensión de los acuerdos que "atacan" a la industria y rechazo del Pacto Verde Europeo.',
    servicios: 'Desregulación de la planificación y la economía, con el Estado redimensionado.'
  },
  erc: {
    fiscal: 'Un modelo económico y una fiscalidad más justas, con soberanía fiscal como palanca.',
    vivienda: 'Plan de choque: traspaso de los pisos de la SAREB a la Generalitat y habilitación de una ley de arrendamientos urbanos catalana.',
    migracion: 'Acogida, inclusión y derechos de las personas migrantes; educación y antirracismo.',
    energia: 'Transición energética justa, ecológica y accesible, con reindustrialización del país.',
    estado: 'Autodeterminación como derecho central: reconocimiento de la plurinacionalidad y más competencias.',
    militar: 'Política exterior al servicio de la paz, con proyección internacional.',
    ue: 'Unión Europea, proyección internacional y cooperación al servicio del país.',
    servicios: 'Defensa de la sanidad pública, los servicios sociales, el municipalismo y las universidades públicas.'
  },
  bng: {
    fiscal: 'Nueva fiscalidad con criterio social y compromiso firme con las personas autónomas.',
    vivienda: 'Derecho a una vida digna: vivienda frente a la especulación inmobiliaria y la falta de política pública.',
    migracion: 'Acogida, inclusión y derechos de las personas migrantes, con regularización e integración.',
    energia: 'Transición energética justa, con minería sostenible y compromiso contra el extractivismo.',
    estado: 'Reestructuración de la administración estatal en Galicia y garantías de buen gobierno.',
    militar: 'Galicia por la paz, con la paz y la convivencia como criterio.',
    ue: 'Soberanía digital, nube soberana y Galicia como nodo de interconexión atlántico.',
    servicios: 'Educación, sanidad, personas mayores y dependencia como prioridades de calidad.',
  },
  bildu: {
    fiscal: 'Política fiscal al servicio de la transición ecosocial, con reparto justo de la renta.',
    vivienda: 'Topes del 2 % de actualización, prohibición de compra especulativa y bloqueo estructural de desahucios.',
    migracion: 'Migración con derechos y responsabilidades, en el bloque de derechos y libertades.',
    energia: 'Energía y clima dentro de la transición ecosocial, con rehabilitación energética y edificación.',
    estado: 'Reconocimiento de Euskal Herria como nación y plurinacionalidad, con Concierto Económico.',
    militar: 'Diez compromisos de paz: no a la OTAN, bases fuera, desarme nuclear y libertad para Palestina.',
    ue: 'Concierto Económico Vasco y Convenio Económico Navarro como ejes del bloque.',
    servicios: 'Salud, educación, cuidados y administración pública con un modelo de comunidad.'
  },
  pnv: {
    fiscal: 'Fiscalidad que favorezca la actividad económica y permita invertir, con autonomía fiscal.',
    vivienda: 'Aumentar la oferta, regular el alquiler y evitar abusos, con garantías de protección residencial.',
    migracion: 'Migración gestionada desde Euskadi con derechos, responsabilidades, permisos y vías legales.',
    energia: 'Energía competitiva para la industria y asequible para los hogares, con transición ecológica.',
    estado: 'Defensa del Concierto Económico y avance hacia un nuevo pacto político con garantías.',
    militar: 'Derechos humanos y cooperación internacional, con una Ertzaintza con plenas capacidades.',
    ue: 'Euskadi con voz propia en Europa y fondos europeos gestionados desde Euskadi.',
    servicios: 'Pensiones dignas, sanidad pública, cuidados, dependencia y protección de la infancia.'
  },
  adelante: {
    fiscal: 'Impuesto a las grandes fortunas y terratenientes, IRPF que sube desde 100.000 € e impuestos a la banca y las eléctricas.',
    vivienda: 'Fin de la especulación inmobiliaria y garantía del derecho a la vivienda, con criterios de cesión.',
    migracion: 'Derechos para todas las personas, con política de integración y defensa del Estatuto de Autonomía.',
    energia: 'Desprivatización de toda la energía para una transición ecosocial.',
    estado: 'Andalucía, nacionalidad histórica, con financiación justa y autogobierno.',
    militar: 'Justicia para Palestina, el Sáhara y el Rif, en un bloque de política exterior.',
    ue: 'Defensa de las singularidades territoriales y de la financiación del Estado.',
    servicios: 'Desprivatización de la sanidad y de la escuela, banca pública y ley estatal de cuidados.'
  },
  compromis: {
    fiscal: 'Fiscalidad con una mirada de justicia social, dentro del bloque de democratización de la economía.',
    vivienda: 'Vivienda como primer bloque: una vida segura con vivienda, salarios y pensiones.',
    migracion: 'Solidaridad global y migración, con derechos humanos y legalidad internacional.',
    energia: 'Energía, agua y territorio en un bloque de territorio habitable y resiliente.',
    estado: 'Modelo de financiación autonómica e inversiones, modelo de Estado y municipalismo.',
    militar: 'Compromís con la Paz y la dignidad humana, con política exterior y defensa.',
    ue: 'Unión Europea como eje del bloque de política exterior.',
    servicios: 'Servicios públicos para cuidar y proteger: sanidad, educación, servicios sociales y cuidados.',
  },
  cc: {
    fiscal: 'Financiación estable para los servicios públicos y uso del ahorro público para las necesidades de Canarias.',
    vivienda: 'Defender el derecho a vivir y permanecer en Canarias, con la vivienda en el centro.',
    migracion: 'Una política migratoria solidaria y europea.',
    energia: 'Energía limpia, almacenamiento energético y economía azul para diversificar la economía.',
    estado: 'Cumplir el Estatuto, participación efectiva y reconocimiento de la singularidad canaria.',
    militar: 'Cooperación atlántica y defensa de la identidad del Atlántico.',
    ue: 'Condición de región ultraperiférica y más presencia en la UE.',
    servicios: 'Defender los servicios públicos y los cuidados en las ocho islas.'
  },
  frente_amplio: {
    fiscal: 'Grandes empresas y patrimonios pagan lo que les corresponde; las rentas del capital tributan como las del trabajo.',
    vivienda: '1 % del PIB y 1,5 M de viviendas públicas en 12 años; tope al 25 % de la renta media del barrio.',
    migracion: 'Ley integral antirracista, procedimientos estables de regularización y fin de las devoluciones.',
    energia: '3,5 % del PIB anual en transición ecológica y revisión al alza del PNIEC.',
    estado: 'Hacia una República Federal, con reforma del Senado y fin de la criminalización de la protesta.',
    militar: 'Seguridad humana, desarme y una nueva arquitectura de seguridad mundial.',
    ue: 'Hacia una Europa de los pueblos, con mecanismo fiscal propio y reforma del BCE.',
    servicios: 'Sanidad, educación, cultura y cuidados como derechos, con reversión de las subcontratas.'
  },
  frente_obrero: {
    fiscal: 'Capítulo propio de fiscalidad, con una crítica del modelo de austeridad.',
    vivienda: 'Capítulo de vivienda con las demandas del programa en un eje de clase.',
    migracion: 'Rechazo del modelo migratorio actual, que el programa describe como una herramienta para abaratar la mano de obra.',
    energia: 'Soberanía energética y recuperación de la industria española.',
    estado: 'Soberanía nacional como capítulo propio, con un bloque por eje.',
    militar: 'Capítulo propio del ejército y de las fuerzas y cuerpos de seguridad del Estado.',
    ue: 'Soberanía y crítica del dispositivo supranacional.',
    servicios: 'Educación, cultura, sanidad, pensiones y vivienda con enfoque de clase.'
  },
  pacma: {
    fiscal: 'Lucha contra el fraude fiscal dentro del bloque de personas.',
    vivienda: 'Vivienda digna y un parque de vivienda social destinado a compra y alquiler.',
    migracion: 'Derechos e intereses de las personas migrantes.',
    energia: 'Modelo energético sostenible y minoración en el consumo; NO a las macrogranjas.',
    estado: 'Regeneración democrática con reforma de la Ley de Iniciativa Legislativa Popular y de la Ley Electoral.',
    militar: 'Sin bloque propio de defensa: el eje es la justicia social y el medio ambiente.',
    ue: 'Compromiso con el consumo responsable y el uso sostenible de los recursos.',
    servicios: 'Sanidad pública, universal y de calidad, con oposición al copago, y educación y cultura para todos.'
  },
  humanista: {
    fiscal: 'Reparto de la riqueza como herramienta de igualdad: propiedad participada y renta básica universal.',
    vivienda: 'Parque Público de Alquiler Social, regla del 30 % y cesión de uso obligatoria.',
    migracion: 'Derogación de la Ley de Extranjería, cierre de los CIEs y regularización extraordinaria.',
    energia: 'Empresa Pública de Energía, tejados solares comunitarios y tren gratuito y electrificado.',
    estado: 'Descentralización, democracia digital vinculante y reforma de la LOREG.',
    militar: 'Salida de la OTAN, ratificación del TPAN, cierre de bases y -50 % del gasto militar.',
    ue: 'Defensa del multilateralismo con reducción de la dependencia europea.',
    servicios: 'Sanidad y educación blindadas en la Constitución, con la gestión directa.'
  },
  mj: {
    fiscal: 'Fiscalidad justa y sostenibilidad de las finanzas públicas, con compromisos medibles.',
    vivienda: 'Gran parque público de vivienda asequible en alquiler, con medidas y plazos.',
    migracion: 'Política migratoria con procedimientos estables y vías seguras.',
    energia: 'Emergencia climática, cuidado del planeta y transición energética como áreas separadas.',
    estado: 'Calidad democrática, buen gobierno y participación ciudadana como áreas propias.',
    militar: 'Política exterior al servicio de la paz y el desarrollo sostenible, y cooperación.',
    ue: 'Sin una posición propia explícita en el eje: el bloque de política exterior se centra en la paz.',
    servicios: 'Sanidad, salud mental, cuidados, educación y servicios públicos con compromisos medibles.'
  },
  democracia21: {
    fiscal: 'Reforma de las subvenciones, fin del clientelismo y transparencia fiscal.',
    vivienda: 'Sin un bloque propio de vivienda: el foco está en las instituciones.',
    migracion: 'Sin un bloque propio de migración: el foco está en las instituciones.',
    energia: 'Sin un bloque propio de energía.',
    estado: 'Air fresco en el sistema electoral, despolitización de instituciones y código ético.',
    militar: 'Sin un bloque propio de defensa.',
    ue: 'Sin un bloque propio de Europa.',
    servicios: 'Administración que rinde cuentas: "si no trabajan, no cobran" y gobierno sin presupuestos.'
  },
  salf: {
    fiscal: '35.000 € libres de IRPF, 0 % de IBI, IVA del 4 % en luz y agua y techo constitucional a impuestos y deuda.',
    vivienda: 'Primera vivienda un 35 % más barata por ley, suelo público gratis y licencia en un mes.',
    migracion: 'Expulsión en 48 horas, fin de regularizaciones y sin papeles, sin ayudas.',
    energia: 'Sin un bloque propio de energía: se integra en economía y geopolítica.',
    estado: 'Referéndum sobre la renegociación europea y la soberanía de Ceuta, Melilla y Gibraltar.',
    militar: 'La mili voluntaria a 1.600 €, 5.000 militares más en Ceuta y Melilla y el 2 % en España.',
    ue: 'Referéndum de renegociación y de salida, con veto a Mercosur, la PAC y el Pacto Verde.',
    servicios: 'Gestión directa: una sola central de compras, 60 días para operarte y 10.000 camas más.'
  },
  iustitia: {
    fiscal: 'Tijeretazo: reducción drástica del gasto político y de las subvenciones, cuota cero de autónomos.',
    vivienda: 'Vivienda digna: propiedad frente a especulación e intervencionismo estatal.',
    migracion: 'Tolerancia cero con la inmigración ilegal y fronteras blindadas con Ejército y Armada.',
    energia: '"Apaga el globalismo, enciende España", con defensa del sector primario.',
    estado: 'Reforma de la Constitución, despartidización del Estado y un máximo de dos mandatos.',
    militar: 'Fronteras blindadas con Ejército y Armada y un nuevo modelo policial.',
    ue: 'Más España y menos Unión Europea, rechazo de las subvenciones de la UE y de la Agenda 2030.',
    servicios: 'Reducción de la administración, fin de las subvenciones públicas y educación sin ideología.'
  },
  teruel: {
    fiscal: 'Financiación justa para Teruel como tercera prioridad, con trato diferenciado.',
    vivienda: 'Vivienda, arraigo y futuro dentro del bloque de servicios públicos.',
    migracion: 'No hay bloque propio de migración.',
    energia: 'Renovables, minería y centros de datos: una energía en manos de la ciudadanía.',
    estado: 'Equilibrio territorial, con las mismas oportunidades en todos los territorios.',
    militar: 'No hay bloque propio de defensa.',
    ue: 'No hay bloque propio de Europa.',
    servicios: 'Sanidad, educación, servicios sociales y vivienda: servicios públicos para todo el territorio.'
  },
  soria: {
    fiscal: 'No hay bloque fiscal propio: el foco es el territorio.',
    vivienda: 'Plan de vivienda para zonas despobladas.',
    migracion: 'No hay bloque propio de migración.',
    energia: 'Energía de Soria para el desarrollo de la provincia.',
    estado: 'Soria como sede de organismos públicos y fin del aislamiento territorial.',
    militar: 'No hay bloque propio de defensa.',
    ue: 'No hay bloque propio de Europa.',
    servicios: 'Garantía de servicios públicos en el medio rural, educación y acceso seguro a la sanidad.'
  },
  feministas: {
    fiscal: 'No hay bloque fiscal: el documento es una declaración breve.',
    vivienda: 'No hay bloque propio de vivienda.',
    migracion: 'No hay bloque propio de migración.',
    energia: 'No hay bloque propio de energía.',
    estado: 'No hay bloque propio de forma del Estado.',
    militar: 'No hay bloque propio de defensa.',
    ue: 'No hay bloque propio de Europa.',
    servicios: 'El conjunto del documento es la propuesta, bajo el lema "Juntas hacemos historia".'
  }
};
