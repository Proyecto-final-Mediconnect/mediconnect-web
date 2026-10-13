/**
 * Los pacientes del juego "Médico de guardia" (jornada del 06/10).
 *
 * Son ficticios y están pensados para un público de estudiantes, no de médicos:
 * nada de enfermedades raras ni de decisiones que pidan técnica. Casi todos
 * giran alrededor de algo que cualquiera entiende —una alergia, la diabetes, el
 * grupo sanguíneo— y la ficha **no dice qué hacer**.
 *
 * El truco es que haya que pensar un poco: de las dos opciones incorrectas, una
 * es el problema a la vista (aspirina para el alérgico a la aspirina) y la otra
 * lo esconde (la Aspirineta, la mayonesa que lleva huevo, el Tafirol que es
 * paracetamol).
 *
 * Lo que dice la notebook es la situación; lo que dice el celular es quién es
 * el paciente. Varias situaciones se repiten con fichas distintas, así que sin
 * escanear el MediPass no hay forma de acertar: ese es el mensaje del producto.
 */

export type Opcion = {
  texto: string;
  correcta?: true;
  /** Qué le pasó al paciente. Solo las incorrectas. */
  causa?: string;
};

export type Caso = {
  id: string;
  nombre: string;
  edad: number;
  sexo: 'Femenino' | 'Masculino';
  pesoKg: number;
  grupoSanguineo: string;
  /** Cómo llega a la guardia. Se ve en la notebook. */
  ingreso: string;
  /** La decisión que hay que tomar. */
  pregunta: string;
  opciones: [Opcion, Opcion, Opcion];
  /** Lo que estaba en el MediPass y explica la respuesta. */
  clave: string;
  // La ficha, que solo se ve en el celular.
  condiciones: string[];
  alergias: string[];
  medicacion: string[];
  contacto: { nombre: string; vinculo: string; telefono: string };
};

export const CASOS: Caso[] = [
  {
    id: 'valentina',
    nombre: 'Valentina Ortiz',
    edad: 34,
    sexo: 'Femenino',
    pesoKg: 63,
    grupoSanguineo: 'AB+',
    ingreso: 'Llega a la guardia con un dolor de cabeza muy fuerte.',
    pregunta: '¿Qué le das para el dolor?',
    opciones: [
      {
        texto: 'Aspirina',
        causa: 'Le dio una reacción alérgica fuerte.',
      },
      {
        texto: 'Aspirineta',
        causa: 'La Aspirineta es aspirina, en versión chica: reacción alérgica.',
      },
      {
        texto: 'Paracetamol',
        correcta: true,
      },
    ],
    clave: 'Valentina es alérgica a la aspirina, y la Aspirineta también es aspirina.',
    condiciones: ['Migraña'],
    alergias: ['Aspirina'],
    medicacion: [],
    contacto: {
      nombre: 'Tomás Ortiz',
      vinculo: 'esposo',
      telefono: '351 555-0001',
    },
  },
  {
    id: 'ezequiel',
    nombre: 'Ezequiel Rojas',
    edad: 29,
    sexo: 'Masculino',
    pesoKg: 75,
    grupoSanguineo: 'A−',
    ingreso: 'Se torció el tobillo jugando al fútbol y le duele mucho.',
    pregunta: '¿Qué le das para el dolor?',
    opciones: [
      {
        texto: 'Ibuprofeno',
        causa: 'Le dio una reacción alérgica fuerte.',
      },
      {
        texto: 'Ibupirac',
        causa: 'El Ibupirac es ibuprofeno con otro nombre: reacción alérgica.',
      },
      {
        texto: 'Paracetamol',
        correcta: true,
      },
    ],
    clave: 'Ezequiel es alérgico al ibuprofeno, y el Ibupirac es ibuprofeno.',
    condiciones: [],
    alergias: ['Ibuprofeno'],
    medicacion: [],
    contacto: {
      nombre: 'Daniela Rojas',
      vinculo: 'hermana',
      telefono: '351 555-0002',
    },
  },
  {
    id: 'santiago',
    nombre: 'Santiago Paz',
    edad: 25,
    sexo: 'Masculino',
    pesoKg: 72,
    grupoSanguineo: '0+',
    ingreso: 'Llega con 39° de fiebre y le duele todo el cuerpo.',
    pregunta: '¿Qué le das para bajar la fiebre?',
    opciones: [
      {
        texto: 'Paracetamol',
        causa: 'Le dio una reacción alérgica fuerte.',
      },
      {
        texto: 'Ibuprofeno',
        correcta: true,
      },
      {
        texto: 'Tafirol',
        causa: 'El Tafirol es paracetamol con otro nombre: reacción alérgica.',
      },
    ],
    clave: 'Santiago es alérgico al paracetamol, y el Tafirol es paracetamol.',
    condiciones: [],
    alergias: ['Paracetamol'],
    medicacion: [],
    contacto: {
      nombre: 'Mónica Paz',
      vinculo: 'mamá',
      telefono: '351 555-0003',
    },
  },
  {
    id: 'diego',
    nombre: 'Diego Romero',
    edad: 27,
    sexo: 'Masculino',
    pesoKg: 80,
    grupoSanguineo: 'B+',
    ingreso: 'Tiene anginas con placas y fiebre. Necesita un antibiótico.',
    pregunta: '¿Cuál le das?',
    opciones: [
      {
        texto: 'Penicilina',
        causa: 'Le dio una reacción alérgica fuerte.',
      },
      {
        texto: 'Azitromicina',
        correcta: true,
      },
      {
        texto: 'Penicilina inyectable',
        causa: 'Inyectada o en pastilla, sigue siendo penicilina: reacción alérgica.',
      },
    ],
    clave: 'Diego es alérgico a la penicilina, se la den como se la den.',
    condiciones: ['Gastritis'],
    alergias: ['Penicilina'],
    medicacion: ['Omeprazol'],
    contacto: {
      nombre: 'Jorge Romero',
      vinculo: 'papá',
      telefono: '351 555-0004',
    },
  },
  {
    id: 'mateo',
    nombre: 'Mateo Gómez',
    edad: 24,
    sexo: 'Masculino',
    pesoKg: 74,
    grupoSanguineo: 'B+',
    ingreso: 'Tiene fiebre y hay que darle una pastilla.',
    pregunta: '¿Con qué se la das?',
    opciones: [
      {
        texto: 'Un vaso de leche',
        causa: 'La lactosa le dio un dolor de panza terrible.',
      },
      {
        texto: 'Un licuado de banana',
        causa: 'El licuado se hace con leche: dolor de panza terrible.',
      },
      {
        texto: 'Jugo de naranja',
        correcta: true,
      },
    ],
    clave: 'Mateo es intolerante a la lactosa, y el licuado lleva leche.',
    condiciones: ['Intolerancia a la lactosa'],
    alergias: [],
    medicacion: [],
    contacto: {
      nombre: 'Silvina Gómez',
      vinculo: 'mamá',
      telefono: '351 555-0005',
    },
  },
  {
    id: 'mia',
    nombre: 'Mía Herrera',
    edad: 16,
    sexo: 'Femenino',
    pesoKg: 52,
    grupoSanguineo: '0+',
    ingreso: 'Se cayó de la bici y se fracturó el brazo.',
    pregunta: 'Queda en observación y le toca la cena. ¿Qué le servís?',
    opciones: [
      {
        texto: 'Tortilla de papas',
        causa: 'La tortilla lleva huevo: reacción alérgica.',
      },
      {
        texto: 'Ensalada con mayonesa',
        causa: 'La mayonesa está hecha con huevo: reacción alérgica.',
      },
      {
        texto: 'Pollo con arroz',
        correcta: true,
      },
    ],
    clave: 'Mía es alérgica al huevo, y la mayonesa está hecha con huevo.',
    condiciones: [],
    alergias: ['Huevo'],
    medicacion: [],
    contacto: {
      nombre: 'Laura Herrera',
      vinculo: 'mamá',
      telefono: '351 555-0006',
    },
  },
  {
    id: 'camila',
    nombre: 'Camila Ríos',
    edad: 21,
    sexo: 'Femenino',
    pesoKg: 58,
    grupoSanguineo: 'A−',
    ingreso: 'Llegó mareada y deshidratada después de un día de calor.',
    pregunta: 'Queda en observación y le toca el almuerzo. ¿Qué le servís?',
    opciones: [
      {
        texto: 'Fideos con tuco',
        causa: 'Los fideos son de trigo: gluten.',
      },
      {
        texto: 'Milanesa con puré',
        causa: 'El pan rallado de la milanesa es de trigo: gluten.',
      },
      {
        texto: 'Carne al horno con papas',
        correcta: true,
      },
    ],
    clave: 'Camila es celíaca: nada de trigo, y el pan rallado de la milanesa es de trigo.',
    condiciones: ['Celiaquía'],
    alergias: ['Ácaros'],
    medicacion: [],
    contacto: {
      nombre: 'Inés Ríos',
      vinculo: 'mamá',
      telefono: '351 555-0007',
    },
  },
  {
    id: 'lautaro',
    nombre: 'Lautaro Molina',
    edad: 32,
    sexo: 'Masculino',
    pesoKg: 79,
    grupoSanguineo: 'B+',
    ingreso: 'Se cortó la mano cocinando y le dieron puntos.',
    pregunta: 'Queda en observación y le toca la cena. ¿Qué le servís?',
    opciones: [
      {
        texto: 'Rabas',
        causa: 'Las rabas son calamar, un marisco: reacción alérgica.',
      },
      {
        texto: 'Arroz con langostinos',
        causa: 'Los langostinos son mariscos: reacción alérgica.',
      },
      {
        texto: 'Milanesa de pollo',
        correcta: true,
      },
    ],
    clave: 'Lautaro es alérgico a los mariscos, y las rabas son calamar.',
    condiciones: ['Colesterol alto'],
    alergias: ['Mariscos'],
    medicacion: [],
    contacto: {
      nombre: 'Sofía Molina',
      vinculo: 'hermana',
      telefono: '351 555-0008',
    },
  },
  {
    id: 'martina',
    nombre: 'Martina López',
    edad: 40,
    sexo: 'Femenino',
    pesoKg: 66,
    grupoSanguineo: 'A+',
    ingreso: 'Llegó con un dolor de panza que ya se le está pasando.',
    pregunta: 'Queda en observación y le toca el almuerzo. ¿Qué le servís?',
    opciones: [
      {
        texto: 'Merluza al horno',
        causa: 'Le dio una reacción alérgica fuerte.',
      },
      {
        texto: 'Ensalada con atún',
        causa: 'El atún es pescado: reacción alérgica.',
      },
      {
        texto: 'Tarta de verdura',
        correcta: true,
      },
    ],
    clave: 'Martina es alérgica al pescado, y el atún es pescado.',
    condiciones: ['Hipotiroidismo'],
    alergias: ['Pescado'],
    medicacion: ['Levotiroxina'],
    contacto: {
      nombre: 'Pablo López',
      vinculo: 'esposo',
      telefono: '351 555-0009',
    },
  },
  {
    id: 'lucas',
    nombre: 'Lucas Fernández',
    edad: 17,
    sexo: 'Masculino',
    pesoKg: 66,
    grupoSanguineo: '0+',
    ingreso: 'Le sacaron sangre y se mareó un poco.',
    pregunta: 'Le dan algo dulce para que se recupere. ¿Qué le das?',
    opciones: [
      {
        texto: 'Un Mantecol',
        causa: 'El Mantecol es de maní: reacción alérgica.',
      },
      {
        texto: 'Garrapiñada',
        causa: 'La garrapiñada es de maní: reacción alérgica.',
      },
      {
        texto: 'Un alfajor de maicena',
        correcta: true,
      },
    ],
    clave: 'Lucas es alérgico al maní, y el Mantecol está hecho de maní.',
    condiciones: [],
    alergias: ['Maní'],
    medicacion: [],
    contacto: {
      nombre: 'Gabriela Fernández',
      vinculo: 'mamá',
      telefono: '351 555-0010',
    },
  },
  {
    id: 'joaquin',
    nombre: 'Joaquín Suárez',
    edad: 20,
    sexo: 'Masculino',
    pesoKg: 70,
    grupoSanguineo: '0+',
    ingreso: 'Pasó la noche en la guardia por un golpe en la cabeza.',
    pregunta: 'Le toca el desayuno. ¿Qué le das?',
    opciones: [
      {
        texto: 'Café con leche',
        causa: 'La lactosa le dio un dolor de panza terrible.',
      },
      {
        texto: 'Tostadas con manteca',
        causa: 'La manteca se hace con leche: dolor de panza terrible.',
      },
      {
        texto: 'Té con tostadas y mermelada',
        correcta: true,
      },
    ],
    clave: 'Joaquín es intolerante a la lactosa, y la manteca se hace con leche.',
    condiciones: ['Intolerancia a la lactosa'],
    alergias: [],
    medicacion: [],
    contacto: {
      nombre: 'Gustavo Suárez',
      vinculo: 'papá',
      telefono: '351 555-0011',
    },
  },
  {
    id: 'delfina',
    nombre: 'Delfina Sosa',
    edad: 8,
    sexo: 'Femenino',
    pesoKg: 27,
    grupoSanguineo: 'A+',
    ingreso: 'Se golpeó la rodilla en el recreo y le pusieron una venda.',
    pregunta: 'Le toca la merienda. ¿Qué le das?',
    opciones: [
      {
        texto: 'Chocolatada',
        causa: 'La chocolatada es leche: reacción alérgica.',
      },
      {
        texto: 'Un flan',
        causa: 'El flan se hace con leche: reacción alérgica.',
      },
      {
        texto: 'Jugo y una banana',
        correcta: true,
      },
    ],
    clave: 'Delfina es alérgica a la leche, y el flan se hace con leche.',
    condiciones: [],
    alergias: ['Leche de vaca'],
    medicacion: [],
    contacto: {
      nombre: 'Carolina Sosa',
      vinculo: 'mamá',
      telefono: '351 555-0012',
    },
  },
  {
    id: 'nahuel',
    nombre: 'Nahuel Vera',
    edad: 14,
    sexo: 'Masculino',
    pesoKg: 50,
    grupoSanguineo: '0−',
    ingreso: 'Se quemó un poco la mano con agua caliente.',
    pregunta: 'Le dan el postre. ¿Qué le das?',
    opciones: [
      {
        texto: 'Yogur de frutilla',
        causa: 'Le dio una reacción alérgica fuerte.',
      },
      {
        texto: 'Licuado de frutilla y banana',
        causa: 'El licuado tenía frutilla: reacción alérgica.',
      },
      {
        texto: 'Una manzana',
        correcta: true,
      },
    ],
    clave: 'Nahuel es alérgico a la frutilla, y el licuado tenía.',
    condiciones: [],
    alergias: ['Frutilla'],
    medicacion: [],
    contacto: {
      nombre: 'Andrea Vera',
      vinculo: 'mamá',
      telefono: '351 555-0013',
    },
  },
  {
    id: 'juan',
    nombre: 'Juan Pérez',
    edad: 45,
    sexo: 'Masculino',
    pesoKg: 82,
    grupoSanguineo: '0+',
    ingreso: 'Se desmayó en la parada del colectivo. Está pálido y transpirado.',
    pregunta: 'Se despierta un poco. ¿Qué le das?',
    opciones: [
      {
        texto: 'Un vaso de agua',
        causa: 'El agua no le subió el azúcar y volvió a desmayarse.',
      },
      {
        texto: 'Jugo con azúcar',
        correcta: true,
      },
      {
        texto: 'Un café amargo',
        causa: 'Sin azúcar, la baja siguió y no se recuperó.',
      },
    ],
    clave: 'Juan es diabético: un desmayo así suele ser una baja de azúcar.',
    condiciones: ['Diabetes tipo 1'],
    alergias: [],
    medicacion: ['Insulina'],
    contacto: {
      nombre: 'Marta Pérez',
      vinculo: 'esposa',
      telefono: '351 555-0014',
    },
  },
  {
    id: 'carlos',
    nombre: 'Carlos Medina',
    edad: 58,
    sexo: 'Masculino',
    pesoKg: 95,
    grupoSanguineo: 'A+',
    ingreso: 'Lo encontraron tirado en una plaza. Habla raro y parece borracho.',
    pregunta: '¿Qué hacés?',
    opciones: [
      {
        texto: 'Lo dejo dormir hasta que se le pase',
        causa: 'No estaba borracho: el azúcar le siguió bajando.',
      },
      {
        texto: 'Le doy algo con azúcar',
        correcta: true,
      },
      {
        texto: 'Le doy un café bien cargado',
        causa: 'El café no le sube el azúcar: no se recuperó.',
      },
    ],
    clave: 'Carlos es diabético: una baja de azúcar se confunde con una borrachera.',
    condiciones: ['Diabetes tipo 2'],
    alergias: [],
    medicacion: ['Insulina'],
    contacto: {
      nombre: 'Silvia Medina',
      vinculo: 'hija',
      telefono: '351 555-0015',
    },
  },
  {
    id: 'teresa',
    nombre: 'Teresa Domínguez',
    edad: 66,
    sexo: 'Femenino',
    pesoKg: 78,
    grupoSanguineo: '0+',
    ingreso: 'Ya la atendieron por una caída y está bien. Queda en observación.',
    pregunta: 'Pide postre. ¿Qué le das?',
    opciones: [
      {
        texto: 'Flan con dulce de leche',
        causa: 'Tanta azúcar le disparó la glucosa.',
      },
      {
        texto: 'Torta de chocolate',
        causa: 'Tanta azúcar le disparó la glucosa.',
      },
      {
        texto: 'Gelatina sin azúcar',
        correcta: true,
      },
    ],
    clave: 'Teresa es diabética y está bien: no necesita azúcar. Distinto sería si se desmayara.',
    condiciones: ['Diabetes tipo 2'],
    alergias: [],
    medicacion: ['Metformina'],
    contacto: {
      nombre: 'Ana Domínguez',
      vinculo: 'hija',
      telefono: '351 555-0016',
    },
  },
  {
    id: 'roberto',
    nombre: 'Roberto Sánchez',
    edad: 62,
    sexo: 'Masculino',
    pesoKg: 91,
    grupoSanguineo: 'A+',
    ingreso: 'Llega con dolor de cabeza y mareos.',
    pregunta: 'Queda en observación y le toca la cena. ¿Qué le servís?',
    opciones: [
      {
        texto: 'Picada de salame y queso',
        causa: 'Tanta sal le subió la presión.',
      },
      {
        texto: 'Papas fritas',
        causa: 'La sal le subió la presión.',
      },
      {
        texto: 'Pollo con ensalada sin sal',
        correcta: true,
      },
    ],
    clave: 'Roberto es hipertenso: la sal le sube la presión.',
    condiciones: ['Hipertensión'],
    alergias: [],
    medicacion: ['Enalapril'],
    contacto: {
      nombre: 'Norma Sánchez',
      vinculo: 'esposa',
      telefono: '351 555-0017',
    },
  },
  {
    id: 'hilda',
    nombre: 'Hilda Benítez',
    edad: 70,
    sexo: 'Femenino',
    pesoKg: 69,
    grupoSanguineo: 'B+',
    ingreso: 'Espera los resultados de un análisis. Está nerviosa.',
    pregunta: '¿Qué le das para tomar mientras espera?',
    opciones: [
      {
        texto: 'Un café bien cargado',
        causa: 'La cafeína le subió la presión.',
      },
      {
        texto: 'Una bebida energizante',
        causa: 'La energizante le disparó la presión.',
      },
      {
        texto: 'Un té de manzanilla',
        correcta: true,
      },
    ],
    clave: 'Hilda es hipertensa: el café y las energizantes le suben la presión.',
    condiciones: ['Hipertensión'],
    alergias: [],
    medicacion: ['Losartán'],
    contacto: {
      nombre: 'Rubén Benítez',
      vinculo: 'esposo',
      telefono: '351 555-0018',
    },
  },
  {
    id: 'nicolas',
    nombre: 'Nicolás Vega',
    edad: 35,
    sexo: 'Masculino',
    pesoKg: 84,
    grupoSanguineo: 'B−',
    ingreso: 'Llega para un análisis de sangre.',
    pregunta: '¿Con qué guantes le sacás sangre?',
    opciones: [
      {
        texto: 'Guantes de látex',
        causa: 'Le dio una reacción alérgica fuerte.',
      },
      {
        texto: 'Sin guantes',
        causa: 'Sin guantes, se le infectó el pinchazo.',
      },
      {
        texto: 'Guantes de nitrilo',
        correcta: true,
      },
    ],
    clave: 'Nicolás es alérgico al látex: los guantes de nitrilo no tienen.',
    condiciones: [],
    alergias: ['Látex'],
    medicacion: [],
    contacto: {
      nombre: 'Clara Vega',
      vinculo: 'esposa',
      telefono: '351 555-0019',
    },
  },
  {
    id: 'mora',
    nombre: 'Mora Sánchez',
    edad: 7,
    sexo: 'Femenino',
    pesoKg: 24,
    grupoSanguineo: '0−',
    ingreso: 'Está en la guardia con el brazo enyesado y no para de llorar.',
    pregunta: '¿Qué le das para que se distraiga?',
    opciones: [
      {
        texto: 'Un globo',
        causa: 'El globo es de látex: reacción alérgica.',
      },
      {
        texto: 'Un guante inflado como globo',
        causa: 'Los guantes eran de látex: reacción alérgica.',
      },
      {
        texto: 'Un libro para colorear',
        correcta: true,
      },
    ],
    clave: 'Mora es alérgica al látex, y los globos y los guantes suelen ser de látex.',
    condiciones: [],
    alergias: ['Látex'],
    medicacion: [],
    contacto: {
      nombre: 'Natalia Sánchez',
      vinculo: 'mamá',
      telefono: '351 555-0020',
    },
  },
  {
    id: 'paz',
    nombre: 'Paz Quiroga',
    edad: 23,
    sexo: 'Femenino',
    pesoKg: 57,
    grupoSanguineo: 'A+',
    ingreso: 'Se cayó en patineta y tiene un raspón grande en la rodilla.',
    pregunta: '¿Con qué se lo desinfectás?',
    opciones: [
      {
        texto: 'Tintura de yodo',
        causa: 'Le dio una reacción alérgica fuerte.',
      },
      {
        texto: 'Iodopovidona',
        causa: 'La iodopovidona tiene yodo, como dice el nombre: reacción alérgica.',
      },
      {
        texto: 'Agua oxigenada',
        correcta: true,
      },
    ],
    clave: 'Paz es alérgica al yodo, y la iodopovidona tiene yodo.',
    condiciones: [],
    alergias: ['Yodo'],
    medicacion: [],
    contacto: {
      nombre: 'Marcela Quiroga',
      vinculo: 'mamá',
      telefono: '351 555-0021',
    },
  },
  {
    id: 'carla',
    nombre: 'Carla Méndez',
    edad: 31,
    sexo: 'Femenino',
    pesoKg: 60,
    grupoSanguineo: '0+',
    ingreso: 'Se cortó un dedo con un cuchillo. El corte es chico.',
    pregunta: '¿Cómo se lo tapás?',
    opciones: [
      {
        texto: 'Con una curita',
        causa: 'El adhesivo de la curita le dio una reacción alérgica.',
      },
      {
        texto: 'Con cinta adhesiva',
        causa: 'El adhesivo le dio una reacción alérgica.',
      },
      {
        texto: 'Con gasa y una venda',
        correcta: true,
      },
    ],
    clave: 'Carla es alérgica al adhesivo de las curitas y las cintas.',
    condiciones: [],
    alergias: ['Adhesivo de curitas'],
    medicacion: [],
    contacto: {
      nombre: 'Diego Méndez',
      vinculo: 'esposo',
      telefono: '351 555-0022',
    },
  },
  {
    id: 'florencia',
    nombre: 'Florencia Molina',
    edad: 29,
    sexo: 'Femenino',
    pesoKg: 70,
    grupoSanguineo: 'B+',
    ingreso: 'Se resbaló en la escalera y se golpeó la panza.',
    pregunta: '¿Qué estudio le hacés para ver si está todo bien?',
    opciones: [
      {
        texto: 'Una radiografía',
        causa: 'Los rayos X pueden hacerle mal al bebé.',
      },
      {
        texto: 'Una tomografía',
        causa: 'La tomografía también usa rayos X: riesgo para el bebé.',
      },
      {
        texto: 'Una ecografía',
        correcta: true,
      },
    ],
    clave: 'Florencia está embarazada de 7 meses: la ecografía no usa rayos X.',
    condiciones: ['Embarazo de 7 meses'],
    alergias: [],
    medicacion: ['Ácido fólico'],
    contacto: {
      nombre: 'Javier Molina',
      vinculo: 'esposo',
      telefono: '351 555-0023',
    },
  },
  {
    id: 'sofia',
    nombre: 'Sofía Luna',
    edad: 19,
    sexo: 'Femenino',
    pesoKg: 55,
    grupoSanguineo: '0−',
    ingreso: 'Se agitó jugando al hockey. Respira con un silbido y casi no puede hablar.',
    pregunta: '¿Qué hacés?',
    opciones: [
      {
        texto: 'Le doy un vaso de agua',
        causa: 'El agua no le abre los bronquios: el aire le siguió faltando.',
      },
      {
        texto: 'Que respire en una bolsa de papel',
        causa: 'No era un ataque de pánico: el aire le siguió faltando.',
      },
      {
        texto: 'Le doy su inhalador',
        correcta: true,
      },
    ],
    clave: 'Sofía tiene asma: su inhalador le abre los bronquios.',
    condiciones: ['Asma'],
    alergias: ['Polen'],
    medicacion: ['Salbutamol (inhalador)'],
    contacto: {
      nombre: 'Ricardo Luna',
      vinculo: 'papá',
      telefono: '351 555-0024',
    },
  },
  {
    id: 'agustin',
    nombre: 'Agustín Torres',
    edad: 26,
    sexo: 'Masculino',
    pesoKg: 77,
    grupoSanguineo: 'A+',
    ingreso: 'Lo picó una abeja en el parque y se le está hinchando la cara.',
    pregunta: '¿Qué hacés?',
    opciones: [
      {
        texto: 'Le pongo hielo y esperamos',
        causa: 'La reacción avanzó rápido y le costó respirar.',
      },
      {
        texto: 'Le aplico su inyector de adrenalina',
        correcta: true,
      },
      {
        texto: 'Le doy un té de manzanilla',
        causa: 'No frenó la reacción: le costó respirar.',
      },
    ],
    clave: 'Agustín es alérgico a las abejas y lleva adrenalina para estos casos.',
    condiciones: [],
    alergias: ['Picadura de abeja'],
    medicacion: ['Adrenalina autoinyectable'],
    contacto: {
      nombre: 'Paula Torres',
      vinculo: 'hermana',
      telefono: '351 555-0025',
    },
  },
  {
    id: 'martin',
    nombre: 'Martín Díaz',
    edad: 30,
    sexo: 'Masculino',
    pesoKg: 88,
    grupoSanguineo: 'A+',
    ingreso: 'Tuvo un accidente en moto y perdió mucha sangre.',
    pregunta: 'Necesita una transfusión. ¿Qué sangre le pasás?',
    opciones: [
      {
        texto: 'Sangre B+',
        causa: 'Su cuerpo rechazó la sangre: no era compatible.',
      },
      {
        texto: 'Sangre AB+',
        causa: 'Su cuerpo rechazó la sangre: no era compatible.',
      },
      {
        texto: 'Sangre A+',
        correcta: true,
      },
    ],
    clave: 'Martín es A+: de estas tres, es la única que puede recibir.',
    condiciones: [],
    alergias: ['Mariscos'],
    medicacion: [],
    contacto: {
      nombre: 'Lucía Díaz',
      vinculo: 'hermana',
      telefono: '351 555-0026',
    },
  },
  {
    id: 'paula',
    nombre: 'Paula Navarro',
    edad: 41,
    sexo: 'Femenino',
    pesoKg: 64,
    grupoSanguineo: '0−',
    ingreso: 'Tuvo un choque en auto y perdió mucha sangre.',
    pregunta: 'Necesita una transfusión. ¿Qué sangre le pasás?',
    opciones: [
      {
        texto: 'Sangre 0+',
        causa: 'Su cuerpo rechazó la sangre: no era compatible.',
      },
      {
        texto: 'Sangre A−',
        causa: 'Su cuerpo rechazó la sangre: no era compatible.',
      },
      {
        texto: 'Sangre 0−',
        correcta: true,
      },
    ],
    clave: 'Paula es 0−: solo puede recibir sangre 0−.',
    condiciones: ['Hipotiroidismo'],
    alergias: [],
    medicacion: ['Levotiroxina'],
    contacto: {
      nombre: 'Andrés Navarro',
      vinculo: 'esposo',
      telefono: '351 555-0027',
    },
  },
  {
    id: 'federico',
    nombre: 'Federico Luna',
    edad: 37,
    sexo: 'Masculino',
    pesoKg: 90,
    grupoSanguineo: '0+',
    ingreso: 'Se cortó con una amoladora y perdió mucha sangre.',
    pregunta: 'Necesita una transfusión. ¿Qué sangre le pasás?',
    opciones: [
      {
        texto: 'Sangre A+',
        causa: 'Su cuerpo rechazó la sangre: no era compatible.',
      },
      {
        texto: 'Sangre AB+',
        causa: 'Su cuerpo rechazó la sangre: no era compatible.',
      },
      {
        texto: 'Sangre 0+',
        correcta: true,
      },
    ],
    clave: 'Federico es 0+: de estas tres, es la única que puede recibir.',
    condiciones: [],
    alergias: ['Polvo'],
    medicacion: [],
    contacto: {
      nombre: 'Romina Luna',
      vinculo: 'esposa',
      telefono: '351 555-0028',
    },
  },
  {
    id: 'tomas',
    nombre: 'Tomás Aguilar',
    edad: 28,
    sexo: 'Masculino',
    pesoKg: 78,
    grupoSanguineo: 'A+',
    ingreso: 'Llega desmayado tras un choque. Hay que avisar a la familia.',
    pregunta: '¿A quién llamás?',
    opciones: [
      {
        texto: 'A Pedro',
        causa: 'Pedro no era de la familia: nadie se enteró a tiempo.',
      },
      {
        texto: 'A Laura',
        correcta: true,
      },
      {
        texto: 'A Carla',
        causa: 'Carla no era de la familia: nadie se enteró a tiempo.',
      },
    ],
    clave: 'El contacto de emergencia de Tomás es Laura, su mamá.',
    condiciones: [],
    alergias: [],
    medicacion: [],
    contacto: {
      nombre: 'Laura Aguilar',
      vinculo: 'mamá',
      telefono: '351 555-0029',
    },
  },
  {
    id: 'osvaldo',
    nombre: 'Osvaldo Benítez',
    edad: 81,
    sexo: 'Masculino',
    pesoKg: 70,
    grupoSanguineo: 'B+',
    ingreso: 'Lo encontraron de noche caminando solo. Está desorientado y no sabe dónde vive.',
    pregunta: '¿Qué hacés?',
    opciones: [
      {
        texto: 'Lo dejo que se vaya solo',
        causa: 'Se perdió en la calle de noche.',
      },
      {
        texto: 'Lo dejo en la sala hasta mañana',
        causa: 'Pasó la noche solo y asustado, sin su medicación.',
      },
      {
        texto: 'Llamo a su contacto de emergencia',
        correcta: true,
      },
    ],
    clave: 'Osvaldo tiene Alzheimer: su MediPass dice a quién llamar.',
    condiciones: ['Alzheimer'],
    alergias: [],
    medicacion: ['Donepecilo'],
    contacto: {
      nombre: 'Marta Benítez',
      vinculo: 'hija',
      telefono: '351 555-0030',
    },
  },
];

export function casoPorId(id: string): Caso | undefined {
  return CASOS.find((c) => c.id === id);
}

/** Cuántos pacientes atiende cada jugador en una guardia. */
export const PACIENTES_POR_GUARDIA = 3;

/** Mezcla sin tocar el original (Fisher-Yates). */
export function mezclar<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const copia = [...items];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/**
 * Los pacientes de una guardia, con las opciones mezcladas.
 *
 * Se mezclan también las opciones: si la correcta estuviera siempre en el
 * mismo lugar, el segundo de la fila ya sabría dónde tocar.
 */
export function armarGuardia(random: () => number = Math.random): Caso[] {
  return mezclar(CASOS, random)
    .slice(0, PACIENTES_POR_GUARDIA)
    .map((caso) => ({
      ...caso,
      opciones: mezclar(caso.opciones, random) as Caso['opciones'],
    }));
}
