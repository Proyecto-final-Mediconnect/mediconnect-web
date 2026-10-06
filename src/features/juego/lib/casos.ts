/**
 * Los pacientes del juego "Médico de guardia" (jornada del 06/10).
 *
 * Son ficticios y están pensados para un público de estudiantes, no de médicos:
 * la condición clave es algo que conoce cualquiera (diabetes, una alergia, el
 * grupo sanguíneo), y la ficha **no dice qué hacer**. Todos son emergencias —el
 * paciente no puede contar nada—, que es para lo que existe el MediPass.
 *
 * Lo que dice la notebook es la situación; lo que dice el celular es quién es
 * el paciente. Hace falta juntar las dos.
 *
 * Varias situaciones se repiten a propósito ("necesita una transfusión"): sin
 * escanear el MediPass no hay forma de saber la respuesta, y ese es el mensaje
 * del producto.
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
    clave: 'Juan tiene diabetes y usa insulina: un desmayo así suele ser una baja de azúcar.',
    condiciones: ['Diabetes tipo 1', 'Miopía'],
    alergias: [],
    medicacion: ['Insulina'],
    contacto: {
      nombre: 'Marta Pérez',
      vinculo: 'esposa',
      telefono: '351 555-0001',
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
    clave: 'Carlos es diabético: una baja de azúcar se confunde muy seguido con una borrachera.',
    condiciones: ['Diabetes tipo 2', 'Artrosis de rodilla'],
    alergias: [],
    medicacion: ['Insulina', 'Metformina'],
    contacto: {
      nombre: 'Silvia Medina',
      vinculo: 'hija',
      telefono: '351 555-0002',
    },
  },
  {
    id: 'ramiro',
    nombre: 'Ramiro Acosta',
    edad: 27,
    sexo: 'Masculino',
    pesoKg: 73,
    grupoSanguineo: 'A−',
    ingreso: 'Se desplomó después de entrenar. Tiembla y transpira mucho.',
    pregunta: '¿Qué le das?',
    opciones: [
      {
        texto: 'Una gaseosa light',
        causa: 'La light no tiene azúcar: la baja siguió.',
      },
      {
        texto: 'Agua con gas',
        causa: 'Sin azúcar no se recuperó.',
      },
      {
        texto: 'Caramelos',
        correcta: true,
      },
    ],
    clave: 'Ramiro es diabético: temblor y sudor después de entrenar suele ser una baja de azúcar.',
    condiciones: ['Diabetes tipo 1'],
    alergias: [],
    medicacion: ['Insulina'],
    contacto: {
      nombre: 'Gustavo Acosta',
      vinculo: 'papá',
      telefono: '351 555-0003',
    },
  },
  {
    id: 'delfina',
    nombre: 'Delfina Sosa',
    edad: 9,
    sexo: 'Femenino',
    pesoKg: 30,
    grupoSanguineo: '0+',
    ingreso: 'En un cumpleaños se puso pálida, temblorosa y muy confundida.',
    pregunta: '¿Qué le das?',
    opciones: [
      {
        texto: 'Agua',
        causa: 'Sin azúcar, se desmayó.',
      },
      {
        texto: 'La acostamos a dormir',
        causa: 'Dormida, el azúcar le siguió bajando.',
      },
      {
        texto: 'Un caramelo o jugo',
        correcta: true,
      },
    ],
    clave: 'Delfina tiene diabetes tipo 1: estaba con el azúcar baja.',
    condiciones: ['Diabetes tipo 1'],
    alergias: [],
    medicacion: ['Insulina'],
    contacto: {
      nombre: 'Carolina Sosa',
      vinculo: 'mamá',
      telefono: '351 555-0004',
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
    pregunta: 'Necesita una transfusión urgente. ¿Qué sangre le pasás?',
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
    clave: 'Martín es A+: de estas tres, es la única sangre que puede recibir.',
    condiciones: [],
    alergias: ['Mariscos'],
    medicacion: [],
    contacto: {
      nombre: 'Lucía Díaz',
      vinculo: 'hermana',
      telefono: '351 555-0005',
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
    pregunta: 'Necesita una transfusión urgente. ¿Qué sangre le pasás?',
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
      telefono: '351 555-0006',
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
    pregunta: 'Necesita una transfusión urgente. ¿Qué sangre le pasás?',
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
    clave: 'Federico es 0+: de estas tres, es la única sangre que puede recibir.',
    condiciones: [],
    alergias: ['Polvo'],
    medicacion: [],
    contacto: {
      nombre: 'Romina Luna',
      vinculo: 'esposa',
      telefono: '351 555-0007',
    },
  },
  {
    id: 'gonzalo',
    nombre: 'Gonzalo Ibáñez',
    edad: 44,
    sexo: 'Masculino',
    pesoKg: 87,
    grupoSanguineo: 'B−',
    ingreso: 'Se cayó de un andamio y perdió mucha sangre.',
    pregunta: 'Necesita una transfusión urgente. ¿Qué sangre le pasás?',
    opciones: [
      {
        texto: 'Sangre B+',
        causa: 'Su cuerpo rechazó la sangre: no era compatible.',
      },
      {
        texto: 'Sangre 0+',
        causa: 'Su cuerpo rechazó la sangre: no era compatible.',
      },
      {
        texto: 'Sangre B−',
        correcta: true,
      },
    ],
    clave: 'Gonzalo es B−: solo puede recibir sangre negativa (B− o 0−).',
    condiciones: ['Hernia de disco'],
    alergias: [],
    medicacion: [],
    contacto: {
      nombre: 'Elena Ibáñez',
      vinculo: 'mamá',
      telefono: '351 555-0008',
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
        causa: 'La reacción avanzó rápido y se le cerró la garganta.',
      },
      {
        texto: 'Le aplico su inyector de adrenalina',
        correcta: true,
      },
      {
        texto: 'Le doy un té de manzanilla',
        causa: 'No frenó la reacción: se le cerró la garganta.',
      },
    ],
    clave: 'Agustín es alérgico grave a las abejas y lleva adrenalina para estos casos.',
    condiciones: [],
    alergias: ['Picadura de abeja — grave'],
    medicacion: ['Adrenalina autoinyectable'],
    contacto: {
      nombre: 'Paula Torres',
      vinculo: 'hermana',
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
    ingreso: 'Mordió un alfajor en el recreo y se le hinchó la garganta. Casi no puede respirar.',
    pregunta: '¿Qué hacés?',
    opciones: [
      {
        texto: 'Le doy agua para que le pase',
        causa: 'El agua no frena la alergia: se le cerró la garganta.',
      },
      {
        texto: 'Lo hago vomitar',
        causa: 'Perdiste tiempo clave: se le cerró la garganta.',
      },
      {
        texto: 'Le aplico su inyector de adrenalina',
        correcta: true,
      },
    ],
    clave: 'Lucas es alérgico grave al maní, y el alfajor tenía. La adrenalina frena la reacción.',
    condiciones: [],
    alergias: ['Maní — grave'],
    medicacion: ['Adrenalina autoinyectable'],
    contacto: {
      nombre: 'Gabriela Fernández',
      vinculo: 'mamá',
      telefono: '351 555-0010',
    },
  },
  {
    id: 'diego',
    nombre: 'Diego Romero',
    edad: 27,
    sexo: 'Masculino',
    pesoKg: 80,
    grupoSanguineo: 'AB−',
    ingreso: 'Llega casi inconsciente, con fiebre altísima por una infección grave.',
    pregunta: 'Hay que darle un antibiótico ya. ¿Cuál?',
    opciones: [
      {
        texto: 'Penicilina',
        causa: 'Le dio una reacción alérgica grave.',
      },
      {
        texto: 'Azitromicina',
        correcta: true,
      },
      {
        texto: 'Penicilina inyectable',
        causa: 'Inyectada o en pastilla, sigue siendo penicilina: reacción grave.',
      },
    ],
    clave: 'Diego es alérgico a la penicilina, se la den como se la den.',
    condiciones: ['Gastritis'],
    alergias: ['Penicilina — grave'],
    medicacion: ['Omeprazol'],
    contacto: {
      nombre: 'Jorge Romero',
      vinculo: 'papá',
      telefono: '351 555-0011',
    },
  },
  {
    id: 'valentina',
    nombre: 'Valentina Ortiz',
    edad: 34,
    sexo: 'Femenino',
    pesoKg: 63,
    grupoSanguineo: 'AB+',
    ingreso: 'Chocó en bici. Llega golpeada y quejándose de mucho dolor.',
    pregunta: '¿Qué le das para el dolor?',
    opciones: [
      {
        texto: 'Aspirina',
        causa: 'Le dio una reacción alérgica: se le hinchó la cara.',
      },
      {
        texto: 'Paracetamol',
        correcta: true,
      },
      {
        texto: 'Aspirineta',
        causa: 'La Aspirineta es aspirina para chicos: igual le dio alergia.',
      },
    ],
    clave: 'Valentina es alérgica a la aspirina, y la Aspirineta también es aspirina.',
    condiciones: ['Migraña'],
    alergias: ['Aspirina — grave'],
    medicacion: [],
    contacto: {
      nombre: 'Tomás Ortiz',
      vinculo: 'esposo',
      telefono: '351 555-0012',
    },
  },
  {
    id: 'ezequiel',
    nombre: 'Ezequiel Rojas',
    edad: 29,
    sexo: 'Masculino',
    pesoKg: 75,
    grupoSanguineo: 'A−',
    ingreso: 'Se fracturó la pierna jugando al fútbol y el dolor es insoportable.',
    pregunta: '¿Qué le das para el dolor?',
    opciones: [
      {
        texto: 'Ibuprofeno',
        causa: 'Le dio una reacción alérgica: se le cerró la garganta.',
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
    condiciones: ['Rinitis'],
    alergias: ['Ibuprofeno — grave'],
    medicacion: [],
    contacto: {
      nombre: 'Daniela Rojas',
      vinculo: 'hermana',
      telefono: '351 555-0013',
    },
  },
  {
    id: 'nicolas',
    nombre: 'Nicolás Vega',
    edad: 35,
    sexo: 'Masculino',
    pesoKg: 84,
    grupoSanguineo: 'B−',
    ingreso: 'Llega inconsciente tras un choque. Lo tienen que operar de urgencia.',
    pregunta: '¿Con qué guantes lo operan?',
    opciones: [
      {
        texto: 'Guantes de látex',
        causa: 'Le dio una reacción alérgica grave en plena cirugía.',
      },
      {
        texto: 'Sin guantes',
        causa: 'La herida se infectó.',
      },
      {
        texto: 'Guantes de nitrilo',
        correcta: true,
      },
    ],
    clave: 'Nicolás es alérgico al látex: los guantes de nitrilo no tienen.',
    condiciones: ['Asma leve'],
    alergias: ['Látex — grave'],
    medicacion: [],
    contacto: {
      nombre: 'Clara Vega',
      vinculo: 'esposa',
      telefono: '351 555-0014',
    },
  },
  {
    id: 'sofia',
    nombre: 'Sofía Luna',
    edad: 19,
    sexo: 'Femenino',
    pesoKg: 55,
    grupoSanguineo: '0−',
    ingreso: 'Se desplomó en la cancha. Respira con un silbido y casi no puede hablar.',
    pregunta: '¿Qué hacés?',
    opciones: [
      {
        texto: 'Le doy agua',
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
    clave: 'Sofía tiene asma: estaba en plena crisis, y su inhalador le abre los bronquios.',
    condiciones: ['Asma'],
    alergias: ['Polen'],
    medicacion: ['Salbutamol (inhalador)'],
    contacto: {
      nombre: 'Ricardo Luna',
      vinculo: 'papá',
      telefono: '351 555-0015',
    },
  },
  {
    id: 'florencia',
    nombre: 'Florencia Molina',
    edad: 29,
    sexo: 'Femenino',
    pesoKg: 70,
    grupoSanguineo: 'B+',
    ingreso: 'Se cayó por la escalera y le duele la panza.',
    pregunta: '¿Qué estudio le hacés para ver si está todo bien?',
    opciones: [
      {
        texto: 'Una radiografía',
        causa: 'Los rayos X pueden dañar al bebé.',
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
      telefono: '351 555-0016',
    },
  },
  {
    id: 'julieta',
    nombre: 'Julieta Castro',
    edad: 23,
    sexo: 'Femenino',
    pesoKg: 60,
    grupoSanguineo: '0+',
    ingreso: 'Se cayó al piso de la sala de espera y empezó a sacudirse sin control.',
    pregunta: '¿Qué hacés?',
    opciones: [
      {
        texto: 'Le sostengo la lengua',
        causa: 'Le lastimaste la boca. La lengua no se traga: nunca hay que meter nada.',
      },
      {
        texto: 'La pongo de costado y alejo todo',
        correcta: true,
      },
      {
        texto: 'Le doy agua',
        causa: 'Se ahogó: no puede tragar mientras convulsiona.',
      },
    ],
    clave: 'Julieta tiene epilepsia: en una convulsión, de costado y nada en la boca.',
    condiciones: ['Epilepsia'],
    alergias: [],
    medicacion: ['Anticonvulsivos'],
    contacto: {
      nombre: 'Raquel Castro',
      vinculo: 'mamá',
      telefono: '351 555-0017',
    },
  },
  {
    id: 'matias',
    nombre: 'Matías Correa',
    edad: 19,
    sexo: 'Masculino',
    pesoKg: 70,
    grupoSanguineo: 'A+',
    ingreso: 'Se cortó la mano con un vidrio y la sangre no para.',
    pregunta: '¿Qué hacés?',
    opciones: [
      {
        texto: 'Espero a que pare sola',
        causa: 'No paró nunca: perdió demasiada sangre.',
      },
      {
        texto: 'Presiono fuerte y pido su medicación de coagulación',
        correcta: true,
      },
      {
        texto: 'Le pongo una curita y que se vaya',
        causa: 'En la casa siguió sangrando.',
      },
    ],
    clave: 'Matías tiene hemofilia: su sangre no coagula sola.',
    condiciones: ['Hemofilia A'],
    alergias: [],
    medicacion: ['Factor VIII de coagulación'],
    contacto: {
      nombre: 'Alicia Correa',
      vinculo: 'mamá',
      telefono: '351 555-0018',
    },
  },
  {
    id: 'pablo',
    nombre: 'Pablo Herrera',
    edad: 38,
    sexo: 'Masculino',
    pesoKg: 76,
    grupoSanguineo: '0+',
    ingreso: 'Llega golpeado tras una caída. Está despierto, pero no responde cuando le hablan.',
    pregunta: '¿Qué hacés?',
    opciones: [
      {
        texto: 'Le grito más fuerte',
        causa: 'No te escuchaba: se asustó y se fue sin atenderse.',
      },
      {
        texto: 'Lo sedo por si tiene un golpe grave',
        causa: 'Lo sedaste sin necesidad y se complicó.',
      },
      {
        texto: 'Le escribo en un papel',
        correcta: true,
      },
    ],
    clave: 'Pablo es sordo: estaba perfectamente consciente, solo no te escuchaba.',
    condiciones: ['Hipoacusia (sordera)'],
    alergias: [],
    medicacion: [],
    contacto: {
      nombre: 'Laura Herrera',
      vinculo: 'hermana',
      telefono: '351 555-0019',
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
        texto: 'Llamo a la policía',
        causa: 'Pasó horas en una comisaría sin su medicación.',
      },
      {
        texto: 'Llamo a su contacto de emergencia',
        correcta: true,
      },
    ],
    clave: 'Osvaldo tiene Alzheimer: su MediPass tiene a quién llamar.',
    condiciones: ['Alzheimer', 'Hipertensión'],
    alergias: [],
    medicacion: ['Donepecilo', 'Losartán'],
    contacto: {
      nombre: 'Marta Benítez',
      vinculo: 'hija',
      telefono: '351 555-0020',
    },
  },
  {
    id: 'lucia',
    nombre: 'Lucía Paz',
    edad: 47,
    sexo: 'Femenino',
    pesoKg: 62,
    grupoSanguineo: 'A−',
    ingreso:
      'Llega inconsciente con una hemorragia interna. Alguien de la familia tiene que autorizar la cirugía.',
    pregunta: '¿A quién llamás?',
    opciones: [
      {
        texto: 'A Jorge',
        causa: 'Jorge no era de la familia: la cirugía se demoró demasiado.',
      },
      {
        texto: 'A Sebastián',
        causa: 'Sebastián no era de la familia: la cirugía se demoró demasiado.',
      },
      {
        texto: 'A Martín',
        correcta: true,
      },
    ],
    clave: 'El contacto de emergencia de Lucía es Martín, su esposo.',
    condiciones: ['Hipotiroidismo'],
    alergias: ['Penicilina'],
    medicacion: ['Levotiroxina'],
    contacto: {
      nombre: 'Martín Paz',
      vinculo: 'esposo',
      telefono: '351 555-0021',
    },
  },
  {
    id: 'benjamin',
    nombre: 'Benjamín Ríos',
    edad: 10,
    sexo: 'Masculino',
    pesoKg: 34,
    grupoSanguineo: '0+',
    ingreso: 'En el recreo se tiró al piso: le silba el pecho y casi no puede hablar.',
    pregunta: '¿Qué hacés?',
    opciones: [
      {
        texto: 'Le doy un vaso de leche',
        causa: 'La leche no le abre los bronquios: el aire le siguió faltando.',
      },
      {
        texto: 'Le doy el inhalador de su mochila',
        correcta: true,
      },
      {
        texto: 'Lo hago correr para que se le pase',
        causa: 'El esfuerzo le cerró más los bronquios.',
      },
    ],
    clave: 'Benjamín tiene asma: estaba en crisis y su inhalador le abre los bronquios.',
    condiciones: ['Asma'],
    alergias: ['Ácaros'],
    medicacion: ['Salbutamol (inhalador)'],
    contacto: {
      nombre: 'Verónica Ríos',
      vinculo: 'mamá',
      telefono: '351 555-0022',
    },
  },
  {
    id: 'tobias',
    nombre: 'Tobías Medina',
    edad: 34,
    sexo: 'Masculino',
    pesoKg: 80,
    grupoSanguineo: 'A+',
    ingreso: 'Lo sacaron de una casa llena de humo. Tose y le falta mucho el aire.',
    pregunta: '¿Qué le das?',
    opciones: [
      {
        texto: 'Su inhalador',
        correcta: true,
      },
      {
        texto: 'Un cigarrillo para que se calme',
        causa: 'El humo del cigarrillo le cerró todavía más los bronquios.',
      },
      {
        texto: 'Un vaso de agua fría',
        causa: 'El agua no le abre los bronquios: el aire le siguió faltando.',
      },
    ],
    clave: 'Tobías es asmático: el humo le desató una crisis y su inhalador le abre los bronquios.',
    condiciones: ['Asma'],
    alergias: [],
    medicacion: ['Salbutamol (inhalador)'],
    contacto: {
      nombre: 'Carla Medina',
      vinculo: 'esposa',
      telefono: '351 555-0023',
    },
  },
  {
    id: 'ana',
    nombre: 'Ana Gutiérrez',
    edad: 52,
    sexo: 'Femenino',
    pesoKg: 66,
    grupoSanguineo: '0+',
    ingreso: 'Llega golpeada después de chocarse un poste. Está asustada y desorientada.',
    pregunta: '¿Cómo la llevás al consultorio?',
    opciones: [
      {
        texto: 'Le señalo la puerta y que vaya',
        causa: 'No vio lo que le señalabas: se volvió a golpear.',
      },
      {
        texto: 'La guío del brazo y le voy explicando',
        correcta: true,
      },
      {
        texto: 'La dejo sola hasta que la llamen',
        causa: 'Se levantó sola, se cayó y se golpeó de nuevo.',
      },
    ],
    clave: 'Ana es ciega: necesita que la guíen y le cuenten qué está pasando.',
    condiciones: ['Ceguera total'],
    alergias: [],
    medicacion: [],
    contacto: {
      nombre: 'Héctor Gutiérrez',
      vinculo: 'esposo',
      telefono: '351 555-0024',
    },
  },
  {
    id: 'joaquin',
    nombre: 'Joaquín Ferreyra',
    edad: 15,
    sexo: 'Masculino',
    pesoKg: 58,
    grupoSanguineo: 'B+',
    ingreso:
      'Llega con un corte en la mano. Grita, se tapa los oídos y no deja que nadie se le acerque.',
    pregunta: '¿Qué hacés?',
    opciones: [
      {
        texto: 'Lo sujetamos entre varios',
        causa: 'Se asustó todavía más y se lastimó.',
      },
      {
        texto: 'Le grito que se calme',
        causa: 'Los gritos lo alteraron más y no se lo pudo atender.',
      },
      {
        texto: 'Lo llevo a una sala tranquila y le hablo despacio',
        correcta: true,
      },
    ],
    clave:
      'Joaquín tiene autismo: el ruido de la guardia lo desborda, y en un lugar tranquilo se calma.',
    condiciones: ['Trastorno del espectro autista'],
    alergias: [],
    medicacion: [],
    contacto: {
      nombre: 'Gabriela Ferreyra',
      vinculo: 'mamá',
      telefono: '351 555-0025',
    },
  },
  {
    id: 'mora',
    nombre: 'Mora Sánchez',
    edad: 7,
    sexo: 'Femenino',
    pesoKg: 24,
    grupoSanguineo: '0−',
    ingreso: 'Está en la guardia con el brazo quebrado y no para de llorar.',
    pregunta: '¿Qué le das para que se distraiga?',
    opciones: [
      {
        texto: 'Un globo',
        causa: 'El globo es de látex: le dio una reacción alérgica.',
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
    alergias: ['Látex — grave'],
    medicacion: [],
    contacto: {
      nombre: 'Natalia Sánchez',
      vinculo: 'mamá',
      telefono: '351 555-0026',
    },
  },
  {
    id: 'thiago',
    nombre: 'Thiago Souza',
    edad: 31,
    sexo: 'Masculino',
    pesoKg: 79,
    grupoSanguineo: 'A+',
    ingreso: 'Tuvo un accidente en la ruta. Está despierto, pero no entiende lo que le dicen.',
    pregunta: '¿Qué hacés?',
    opciones: [
      {
        texto: 'Le hablo más fuerte y más lento',
        causa: 'Siguió sin entender y no pudo contar qué le dolía.',
      },
      {
        texto: 'Uso un traductor al portugués',
        correcta: true,
      },
      {
        texto: 'Lo dejo esperando a que alguien lo entienda',
        causa: 'Esperó horas sin que nadie supiera qué le dolía.',
      },
    ],
    clave: 'Thiago es brasileño y habla solo portugués.',
    condiciones: ['Idioma: solo portugués'],
    alergias: [],
    medicacion: [],
    contacto: {
      nombre: 'Ana Souza',
      vinculo: 'esposa',
      telefono: '351 555-0027',
    },
  },
  {
    id: 'bautista',
    nombre: 'Bautista Romero',
    edad: 12,
    sexo: 'Masculino',
    pesoKg: 40,
    grupoSanguineo: 'A+',
    ingreso:
      'Se cayó del tobogán en la escuela y está inconsciente. Hay que operarlo y un adulto de la familia tiene que autorizar.',
    pregunta: '¿A quién llamás?',
    opciones: [
      {
        texto: 'A Diego',
        causa: 'Diego no era de su familia: la cirugía se demoró demasiado.',
      },
      {
        texto: 'A Javier',
        correcta: true,
      },
      {
        texto: 'A Mariela',
        causa: 'Mariela no era de su familia: la cirugía se demoró demasiado.',
      },
    ],
    clave: 'El contacto de emergencia de Bautista es Javier, su papá.',
    condiciones: [],
    alergias: ['Penicilina'],
    medicacion: [],
    contacto: {
      nombre: 'Javier Romero',
      vinculo: 'papá',
      telefono: '351 555-0028',
    },
  },
  {
    id: 'valeria',
    nombre: 'Valeria Campos',
    edad: 36,
    sexo: 'Femenino',
    pesoKg: 61,
    grupoSanguineo: 'AB−',
    ingreso: 'La atropelló un auto y perdió mucha sangre.',
    pregunta: 'Necesita una transfusión urgente. ¿Qué sangre le pasás?',
    opciones: [
      {
        texto: 'Sangre AB+',
        causa: 'Su cuerpo rechazó la sangre: no era compatible.',
      },
      {
        texto: 'Sangre B+',
        causa: 'Su cuerpo rechazó la sangre: no era compatible.',
      },
      {
        texto: 'Sangre AB−',
        correcta: true,
      },
    ],
    clave: 'Valeria es AB−: de estas tres, es la única sangre que puede recibir.',
    condiciones: ['Migraña'],
    alergias: [],
    medicacion: [],
    contacto: {
      nombre: 'Marcos Campos',
      vinculo: 'hermano',
      telefono: '351 555-0029',
    },
  },
  {
    id: 'tomas',
    nombre: 'Tomás Aguilar',
    edad: 28,
    sexo: 'Masculino',
    pesoKg: 78,
    grupoSanguineo: 'A+',
    ingreso: 'Llega inconsciente tras un choque. Hay que operarlo y avisar a la familia.',
    pregunta: '¿A quién llamás?',
    opciones: [
      {
        texto: 'A Pedro',
        causa: 'Pedro no era de la familia: se perdió tiempo clave para operar.',
      },
      {
        texto: 'A Laura',
        correcta: true,
      },
      {
        texto: 'A Carla',
        causa: 'Carla no era de la familia: se perdió tiempo clave para operar.',
      },
    ],
    clave: 'El contacto de emergencia de Tomás es Laura, su mamá.',
    condiciones: [],
    alergias: [],
    medicacion: [],
    contacto: {
      nombre: 'Laura Aguilar',
      vinculo: 'mamá',
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
