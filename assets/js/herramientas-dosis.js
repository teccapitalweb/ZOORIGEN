/* ============================================================ */
/* DOSIS VERIFICADAS · Herramientas clínicas                      */
/* Cada rango trae su fuente abierta (nombre y enlace). Solo se   */
/* incluyen valores que se leyeron en la propia fuente; lo que no */
/* se pudo verificar NO aparece. Revisado el 2026-10-12.            */
/* Los rangos son de referencia: confirma siempre con tu          */
/* formulario y con el criterio del médico veterinario.           */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_DOSIS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var FECHA_REVISION = '2026-10-12';
  var CATEGORIAS = {
    anestesico: 'Anestésicos disociativos', sedante: 'Sedantes y tranquilizantes', analgesico: 'Analgésicos opioides',
    aine: 'AINEs (antiinflamatorios)', antibiotico: 'Antibióticos', antiparasitario: 'Antiparasitarios',
    corticoide: 'Corticoides', emergencia: 'Fármacos de emergencia', reversor: 'Antagonistas y reversores'
  };
  var GRUPOS = { mamifero: 'Mamífero', ave: 'Ave', reptil: 'Reptil', pediatrico: 'Pediátrico / geriátrico' };
  var FARMACOS = {
  "ketamina": {
    "nombre": "Ketamina",
    "categoria": "anestesico",
    "entradas": [
      {
        "grupo": "mamifero",
        "aplica": "gato",
        "min": 11,
        "max": 33,
        "via": "IM",
        "fuente": "Etiqueta aprobada del fabricante",
        "url": "https://cdn.pennvet.com/newweb/pdf/cronusketamininj.pdf"
      },
      {
        "grupo": "mamifero",
        "aplica": "gato",
        "min": 10,
        "max": 20,
        "via": "IM",
        "fuente": "Western University of Health Sciences",
        "url": "https://www.westernu.edu/mediafiles/veterinary/vet-anesthesia-analgesia/canine-feline-anesthesia.pdf"
      },
      {
        "grupo": "mamifero",
        "aplica": "perro (siempre combinada con medetomidina o una benzodiacepina)",
        "min": 2,
        "max": 5,
        "via": "IM / IV",
        "fuente": "Western University of Health Sciences",
        "url": "https://www.westernu.edu/mediafiles/veterinary/vet-anesthesia-analgesia/canine-feline-anesthesia.pdf"
      },
      {
        "grupo": "mamifero",
        "aplica": "perro/gato (analgesia adyuvante, no anestesia)",
        "min": 3,
        "max": 5,
        "via": "IV",
        "fuente": "Manual Veterinario Merck",
        "url": "https://merckvetmanual.com/management-and-nutrition/pain-assessment-and-management/analgesic-pharmacology"
      },
      {
        "grupo": "ave",
        "aplica": "Amazona aestiva (premedicación previa a sevoflurano)",
        "min": 10,
        "max": 10,
        "via": "IM",
        "fuente": "PubMed / PubMed Central",
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC3724746/"
      },
      {
        "grupo": "ave",
        "aplica": "pollo doméstico",
        "min": 30,
        "max": 30,
        "via": "IM / IN",
        "fuente": "PubMed / PubMed Central",
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11259053/"
      },
      {
        "grupo": "reptil",
        "aplica": "serpientes/lagartos (15-50), tortugas (40-80)",
        "min": 15,
        "max": 80,
        "via": "IM",
        "fuente": "VIN",
        "url": "https://www.vin.com/doc/?id=3843985"
      },
      {
        "grupo": "reptil",
        "aplica": "quelonios (combinación)",
        "min": 10,
        "max": 25,
        "via": "IM/IV",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/analgesics-sedatives-and-anesthetics-used-in-reptiles"
      },
      {
        "grupo": "reptil",
        "aplica": "lagartos (sedación)",
        "min": 10,
        "max": 30,
        "via": "IM",
        "fuente": "WikiVet",
        "url": "https://en.wikivet.net/Lizard_Formulary_-_Anaesthesia_Associated_Drugs"
      },
      {
        "grupo": "pediatrico",
        "aplica": "perro/gato geriátrico",
        "min": 5,
        "max": 5,
        "via": "IV",
        "fuente": "PubMed / PubMed Central",
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC3113863/"
      }
    ],
    "precauciones": [
      {
        "texto": "En gatos no pasar de 50 mg/kg en un mismo procedimiento; en primates no humanos el máximo recomendado es 40 mg/kg.",
        "fuente": "Etiqueta aprobada del fabricante",
        "url": "https://cdn.pennvet.com/newweb/pdf/cronusketamininj.pdf"
      }
    ]
  },
  "tiletamina": {
    "nombre": "Tiletamina-Zolazepam (Telazol/Zoletil)",
    "categoria": "anestesico",
    "entradas": [
      {
        "grupo": "mamifero",
        "aplica": "perro, gato",
        "min": 6.6,
        "max": 15.8,
        "via": "IM",
        "fuente": "FDA (etiqueta aprobada)",
        "url": "https://animaldrugsatfda.fda.gov/adafda/app/search/public/document/downloadFoi/1238"
      },
      {
        "grupo": "mamifero",
        "aplica": "perro, gato (sedación profunda)",
        "min": null,
        "max": 4,
        "via": "IV/IM",
        "fuente": "Western University of Health Sciences",
        "url": "https://www.westernu.edu/mediafiles/veterinary/vet-anesthesia-analgesia/canine-feline-anesthesia.pdf"
      },
      {
        "grupo": "mamifero",
        "aplica": "pinnípedos",
        "min": 0.3,
        "max": 2.5,
        "via": "IM/IV",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/common-injectable-sedative-and-anesthetic-agents-used-in-mixed-pinnipeds-and-cetaceans"
      },
      {
        "grupo": "ave",
        "aplica": "ratites",
        "min": 2,
        "max": 10,
        "via": "IM / IV 1-3",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/exotic-and-laboratory-animals/ratites/management-of-ratites"
      },
      {
        "grupo": "reptil",
        "aplica": "tortugas terrestres, lagartos, serpientes",
        "min": 3,
        "max": 12,
        "via": "IM",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/analgesics-sedatives-and-anesthetics-used-in-reptiles"
      },
      {
        "grupo": "reptil",
        "aplica": "reptiles",
        "min": 10,
        "max": 30,
        "via": "IM",
        "fuente": "VIN",
        "url": "https://www.vin.com/doc/?id=3843985"
      },
      {
        "grupo": "reptil",
        "aplica": "lagartos",
        "min": 10,
        "max": 40,
        "via": "IM",
        "fuente": "WikiVet",
        "url": "https://en.wikivet.net/Lizard_Formulary_-_Anaesthesia_Associated_Drugs"
      }
    ],
    "precauciones": [
      {
        "texto": "En perros la dosis total no debe pasar de 26.4 mg/kg; la dosis máxima segura de la etiqueta es 29.92 mg/kg.",
        "fuente": "FDA (etiqueta aprobada)",
        "url": "https://animaldrugsatfda.fda.gov/adafda/app/search/public/document/downloadFoi/1238"
      }
    ]
  },
  "xilacina": {
    "nombre": "Xilacina",
    "categoria": "sedante",
    "entradas": [
      {
        "grupo": "mamifero",
        "aplica": "perro, gato",
        "min": 1.1,
        "max": 2.2,
        "via": "IV / IM / SC",
        "fuente": "FDA (etiqueta aprobada)",
        "url": "https://animaldrugsatfda.fda.gov/adafda/app/search/public/document/downloadFoi/453"
      },
      {
        "grupo": "mamifero",
        "aplica": "gato",
        "min": 0.5,
        "max": 1,
        "via": "IM",
        "fuente": "Western University of Health Sciences",
        "url": "https://www.westernu.edu/mediafiles/veterinary/vet-anesthesia-analgesia/canine-feline-anesthesia.pdf"
      },
      {
        "grupo": "mamifero",
        "aplica": "llama, alpaca",
        "min": 0.08,
        "max": 0.45,
        "via": "IV / IM / SC",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/anesthetic-agents-and-protocols-used-in-south-american-camelids"
      },
      {
        "grupo": "ave",
        "aplica": "ratites",
        "min": 1,
        "max": 2.5,
        "via": "IM 1; IV 2.5",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/exotic-and-laboratory-animals/ratites/management-of-ratites"
      },
      {
        "grupo": "reptil",
        "aplica": "lagartos",
        "min": 0.1,
        "max": 1.25,
        "via": "IV, IM",
        "fuente": "WikiVet",
        "url": "https://en.wikivet.net/Lizard_Formulary_-_Anaesthesia_Associated_Drugs"
      },
      {
        "grupo": "reptil",
        "aplica": "reptiles",
        "min": 0.1,
        "max": 1.25,
        "via": "IM",
        "fuente": "VIN",
        "url": "https://www.vin.com/doc/?id=3843985"
      }
    ],
    "precauciones": [
      {
        "texto": "Evitar la combinación de xilacina o medetomidina con ketamina por vía intramuscular en pacientes geriátricos.",
        "fuente": "PubMed / PubMed Central",
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC3113863/"
      }
    ]
  },
  "medetomidina": {
    "nombre": "Medetomidina",
    "categoria": "sedante",
    "entradas": [
      {
        "grupo": "mamifero",
        "aplica": "perro, gato",
        "min": 0.005,
        "max": 0.04,
        "via": "IM/SQ",
        "fuente": "Western University of Health Sciences",
        "url": "https://www.westernu.edu/mediafiles/veterinary/vet-anesthesia-analgesia/canine-feline-anesthesia.pdf"
      },
      {
        "grupo": "mamifero",
        "aplica": "hurón",
        "min": 0.08,
        "max": 0.1,
        "via": "IM/SC",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/exotic-and-laboratory-animals/ferrets/management-of-ferrets"
      },
      {
        "grupo": "mamifero",
        "aplica": "pinnípedos",
        "min": 0.01,
        "max": 0.07,
        "via": "IM",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/common-injectable-sedative-and-anesthetic-agents-used-in-mixed-pinnipeds-and-cetaceans"
      },
      {
        "grupo": "ave",
        "aplica": "pollo",
        "min": 0.1,
        "max": 0.1,
        "via": "IM",
        "fuente": "PubMed / PubMed Central",
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC8161974/"
      },
      {
        "grupo": "reptil",
        "aplica": "reptiles (no iguanas)",
        "min": 0.05,
        "max": 0.05,
        "via": "IM",
        "fuente": "VIN",
        "url": "https://www.vin.com/doc/?id=3843985"
      },
      {
        "grupo": "reptil",
        "aplica": "reptiles; tortuga de caja",
        "min": 0.025,
        "max": 0.1,
        "via": "IM/SC",
        "fuente": "Univ. de Illinois (medicina veterinaria)",
        "url": "https://vetmed.illinois.edu/wp-content/uploads/2015/08/50.-Anesthesia-and-Analgesia-in-Reptiles.pdf"
      },
      {
        "grupo": "pediatrico",
        "aplica": "perro/gato geriátrico",
        "min": 0.002,
        "max": 0.002,
        "via": "IM",
        "fuente": "PubMed / PubMed Central",
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC3113863/"
      }
    ],
    "precauciones": []
  },
  "dexmedetomidina": {
    "nombre": "Dexmedetomidina",
    "categoria": "sedante",
    "entradas": [
      {
        "grupo": "mamifero",
        "aplica": "perro",
        "min": 0.005,
        "max": 0.02,
        "via": "IV / IM / SC",
        "fuente": "Manual Veterinario Merck",
        "url": "https://merckvetmanual.com/management-and-nutrition/pain-assessment-and-management/analgesic-pharmacology"
      },
      {
        "grupo": "mamifero",
        "aplica": "gato",
        "min": 0.005,
        "max": 0.04,
        "via": "IV / IM / SC",
        "fuente": "Manual Veterinario Merck",
        "url": "https://merckvetmanual.com/management-and-nutrition/pain-assessment-and-management/analgesic-pharmacology"
      },
      {
        "grupo": "mamifero",
        "aplica": "gato (ficha aprobada)",
        "min": 0.04,
        "max": 0.04,
        "via": "IM",
        "fuente": "Health Canada (ficha aprobada)",
        "url": "https://pdf.hres.ca/dpd_pm/00064999.PDF"
      },
      {
        "grupo": "ave",
        "aplica": "pollo broiler",
        "min": 0.08,
        "max": 0.08,
        "via": "IN",
        "fuente": "PubMed / PubMed Central",
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC9143883/"
      },
      {
        "grupo": "reptil",
        "aplica": "quelonios",
        "min": 0.05,
        "max": 0.1,
        "via": "IM",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/analgesics-sedatives-and-anesthetics-used-in-reptiles"
      },
      {
        "grupo": "reptil",
        "aplica": "reptiles",
        "min": 0.07,
        "max": 0.1,
        "via": "SC/IM",
        "fuente": "Univ. de Illinois (medicina veterinaria)",
        "url": "https://vetmed.illinois.edu/wp-content/uploads/2015/08/50.-Anesthesia-and-Analgesia-in-Reptiles.pdf"
      }
    ],
    "precauciones": []
  },
  "acepromacina": {
    "nombre": "Acepromacina",
    "categoria": "sedante",
    "entradas": [
      {
        "grupo": "mamifero",
        "aplica": "perro",
        "min": 0.01,
        "max": 0.05,
        "via": "IV / IM / SC",
        "fuente": "Western University of Health Sciences",
        "url": "https://www.westernu.edu/mediafiles/veterinary/vet-anesthesia-analgesia/canine-feline-anesthesia.pdf"
      },
      {
        "grupo": "mamifero",
        "aplica": "gato",
        "min": 0.02,
        "max": 0.1,
        "via": "IV / IM / SC",
        "fuente": "Western University of Health Sciences",
        "url": "https://www.westernu.edu/mediafiles/veterinary/vet-anesthesia-analgesia/canine-feline-anesthesia.pdf"
      },
      {
        "grupo": "mamifero",
        "aplica": "perro",
        "min": 0.01,
        "max": 0.03,
        "via": "IM",
        "fuente": "Guías AAHA",
        "url": "https://www.aaha.org/wp-content/uploads/globalassets/02-guidelines/2020-anesthesia/aahaanesthesiaguidelines_premedicationandsedation.pdf"
      },
      {
        "grupo": "mamifero",
        "aplica": "gato",
        "min": 0.025,
        "max": 0.1,
        "via": "IM",
        "fuente": "Guías AAHA",
        "url": "https://www.aaha.org/wp-content/uploads/globalassets/02-guidelines/2020-anesthesia/aahaanesthesiaguidelines_premedicationandsedation.pdf"
      },
      {
        "grupo": "mamifero",
        "aplica": "vía no especificada (uso antiemetico)",
        "min": 0.025,
        "max": 0.2,
        "via": "IV/IM/SC",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/antiemetic-drugs"
      },
      {
        "grupo": "ave",
        "aplica": "avestruz/ratites",
        "min": 0.25,
        "max": 0.25,
        "via": "IM",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/exotic-and-laboratory-animals/ratites/management-of-ratites"
      },
      {
        "grupo": "reptil",
        "aplica": "lagartos",
        "min": 0.05,
        "max": 0.5,
        "via": "vía no especificada",
        "fuente": "WikiVet",
        "url": "https://en.wikivet.net/Lizard_Formulary_-_Anaesthesia_Associated_Drugs"
      },
      {
        "grupo": "pediatrico",
        "aplica": "perro/gato geriátrico",
        "min": 0.01,
        "max": 0.02,
        "via": "IM",
        "fuente": "PubMed / PubMed Central",
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC3113863/"
      }
    ],
    "precauciones": []
  },
  "diazepam": {
    "nombre": "Diazepam",
    "categoria": "sedante",
    "entradas": [
      {
        "grupo": "mamifero",
        "aplica": "perro, gato",
        "min": 0.05,
        "max": 0.5,
        "via": "IV/IM/SQ",
        "fuente": "Western University of Health Sciences",
        "url": "https://www.westernu.edu/mediafiles/veterinary/vet-anesthesia-analgesia/canine-feline-anesthesia.pdf"
      },
      {
        "grupo": "mamifero",
        "aplica": "camélidos",
        "min": 0.05,
        "max": 0.2,
        "via": "IV",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/anesthetic-agents-and-protocols-used-in-south-american-camelids"
      },
      {
        "grupo": "mamifero",
        "aplica": "pinnípedos",
        "min": 0.02,
        "max": 0.35,
        "via": "IM/IV",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/common-injectable-sedative-and-anesthetic-agents-used-in-mixed-pinnipeds-and-cetaceans"
      },
      {
        "grupo": "ave",
        "aplica": "Amazona aestiva",
        "min": 0.5,
        "max": 0.5,
        "via": "IM",
        "fuente": "PubMed / PubMed Central",
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC3724746/"
      },
      {
        "grupo": "ave",
        "aplica": "ratites",
        "min": 0.2,
        "max": 0.25,
        "via": "IV/IM",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/exotic-and-laboratory-animals/ratites/management-of-ratites"
      },
      {
        "grupo": "pediatrico",
        "aplica": "perro/gato geriátrico",
        "min": 0.2,
        "max": 0.25,
        "via": "IV",
        "fuente": "PubMed / PubMed Central",
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC3113863/"
      }
    ],
    "precauciones": []
  },
  "midazolam": {
    "nombre": "Midazolam",
    "categoria": "sedante",
    "entradas": [
      {
        "grupo": "mamifero",
        "aplica": "perro, gato",
        "min": 0.1,
        "max": 0.3,
        "via": "IV/IM/SQ",
        "fuente": "Western University of Health Sciences",
        "url": "https://www.westernu.edu/mediafiles/veterinary/vet-anesthesia-analgesia/canine-feline-anesthesia.pdf"
      },
      {
        "grupo": "mamifero",
        "aplica": "perro, gato",
        "min": 0.2,
        "max": 0.2,
        "via": "IV/IM",
        "fuente": "Guías AAHA",
        "url": "https://www.aaha.org/wp-content/uploads/globalassets/02-guidelines/2020-anesthesia/aahaanesthesiaguidelines_premedicationandsedation.pdf"
      },
      {
        "grupo": "mamifero",
        "aplica": "pinnípedos, cetáceos",
        "min": 0.02,
        "max": 0.85,
        "via": "IM/IV",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/common-injectable-sedative-and-anesthetic-agents-used-in-mixed-pinnipeds-and-cetaceans"
      },
      {
        "grupo": "ave",
        "aplica": "aves de compañía",
        "min": 0.5,
        "max": 2,
        "via": "IM / IN",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/exotic-and-laboratory-animals/pet-birds/management-of-pet-birds"
      },
      {
        "grupo": "reptil",
        "aplica": "reptiles",
        "min": 1,
        "max": 2,
        "via": "IM",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/analgesics-sedatives-and-anesthetics-used-in-reptiles"
      },
      {
        "grupo": "reptil",
        "aplica": "lagartos",
        "min": 2,
        "max": 2,
        "via": "vía no especificada",
        "fuente": "WikiVet",
        "url": "https://en.wikivet.net/Lizard_Formulary_-_Anaesthesia_Associated_Drugs"
      },
      {
        "grupo": "pediatrico",
        "aplica": "perro/gato geriátrico",
        "min": 0.2,
        "max": 0.2,
        "via": "IM/IV",
        "fuente": "PubMed / PubMed Central",
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC3113863/"
      }
    ],
    "precauciones": []
  },
  "butorfanol": {
    "nombre": "Butorfanol",
    "categoria": "analgesico",
    "entradas": [
      {
        "grupo": "mamifero",
        "aplica": "perro, gato",
        "min": 0.2,
        "max": 0.4,
        "via": "IV/IM/SC",
        "fuente": "Manual Veterinario Merck",
        "url": "https://merckvetmanual.com/management-and-nutrition/pain-assessment-and-management/analgesic-pharmacology"
      },
      {
        "grupo": "mamifero",
        "aplica": "perro, gato",
        "min": 0.2,
        "max": 0.4,
        "via": "IM/IV",
        "fuente": "Guías AAHA",
        "url": "https://www.aaha.org/wp-content/uploads/globalassets/02-guidelines/2020-anesthesia/aahaanesthesiaguidelines_opioids.pdf"
      },
      {
        "grupo": "mamifero",
        "aplica": "perro, gato",
        "min": 0.1,
        "max": 0.4,
        "via": "IV/IM",
        "fuente": "Western University of Health Sciences",
        "url": "https://www.westernu.edu/mediafiles/veterinary/vet-anesthesia-analgesia/canine-feline-anesthesia.pdf"
      },
      {
        "grupo": "ave",
        "aplica": "aves de compañía",
        "min": 0.5,
        "max": 3,
        "via": "IM / IN",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/exotic-and-laboratory-animals/pet-birds/management-of-pet-birds"
      },
      {
        "grupo": "reptil",
        "aplica": "reptiles",
        "min": 0.2,
        "max": 0.4,
        "via": "SC/IM",
        "fuente": "VIN",
        "url": "https://www.vin.com/doc/?id=3843985"
      },
      {
        "grupo": "pediatrico",
        "aplica": "perro/gato geriátrico",
        "min": 0.2,
        "max": 0.4,
        "via": "IM",
        "fuente": "PubMed / PubMed Central",
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC3113863/"
      }
    ],
    "precauciones": []
  },
  "tramadol": {
    "nombre": "Tramadol",
    "categoria": "analgesico",
    "entradas": [
      {
        "grupo": "mamifero",
        "aplica": "perro",
        "min": 4,
        "max": 10,
        "via": "PO",
        "fuente": "Manual Veterinario Merck",
        "url": "https://merckvetmanual.com/management-and-nutrition/pain-assessment-and-management/analgesic-pharmacology"
      },
      {
        "grupo": "mamifero",
        "aplica": "gato",
        "min": 1,
        "max": 2,
        "via": "PO",
        "fuente": "Manual Veterinario Merck",
        "url": "https://merckvetmanual.com/management-and-nutrition/pain-assessment-and-management/analgesic-pharmacology"
      },
      {
        "grupo": "mamifero",
        "aplica": "hurón",
        "min": 1,
        "max": 5,
        "via": "PO",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/exotic-and-laboratory-animals/ferrets/management-of-ferrets"
      },
      {
        "grupo": "ave",
        "aplica": "gavilán de Harris",
        "min": 5,
        "max": 30,
        "via": "IM",
        "fuente": "PubMed / PubMed Central",
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC10650257/"
      },
      {
        "grupo": "ave",
        "aplica": "águila cola roja, cernícalo americano",
        "min": 4,
        "max": 30,
        "via": "PO/IV",
        "fuente": "PubMed / PubMed Central",
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC10650257/"
      },
      {
        "grupo": "reptil",
        "aplica": "tortuga de orejas rojas",
        "min": 5,
        "max": 10,
        "via": "PO",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/analgesics-sedatives-and-anesthetics-used-in-reptiles"
      },
      {
        "grupo": "reptil",
        "aplica": "tortuga de orejas rojas",
        "min": 10,
        "max": 25,
        "via": "PO/SC",
        "fuente": "Univ. de Illinois (medicina veterinaria)",
        "url": "https://vetmed.illinois.edu/wp-content/uploads/2015/08/50.-Anesthesia-and-Analgesia-in-Reptiles.pdf"
      }
    ],
    "precauciones": []
  },
  "morfina": {
    "nombre": "Morfina",
    "categoria": "analgesico",
    "entradas": [
      {
        "grupo": "mamifero",
        "aplica": "perro",
        "min": 0.5,
        "max": 1,
        "via": "IM / SC / IV lenta",
        "fuente": "Manual Veterinario Merck",
        "url": "https://merckvetmanual.com/management-and-nutrition/pain-assessment-and-management/analgesic-pharmacology"
      },
      {
        "grupo": "mamifero",
        "aplica": "gato",
        "min": 0.1,
        "max": 0.25,
        "via": "IM / SC / IV lenta",
        "fuente": "Manual Veterinario Merck",
        "url": "https://merckvetmanual.com/management-and-nutrition/pain-assessment-and-management/analgesic-pharmacology"
      },
      {
        "grupo": "mamifero",
        "aplica": "perro, gato",
        "min": 0.1,
        "max": 1,
        "via": "IM/IV",
        "fuente": "Guías AAHA",
        "url": "https://www.aaha.org/wp-content/uploads/globalassets/02-guidelines/2020-anesthesia/aahaanesthesiaguidelines_opioids.pdf"
      },
      {
        "grupo": "reptil",
        "aplica": "tortuga de orejas rojas (1-5); dragón barbudo (10)",
        "min": 1,
        "max": 10,
        "via": "IM/SC",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/analgesics-sedatives-and-anesthetics-used-in-reptiles"
      },
      {
        "grupo": "reptil",
        "aplica": "tortugas; dragón barbudo",
        "min": 1.5,
        "max": 20,
        "via": "IM",
        "fuente": "Univ. de Illinois (medicina veterinaria)",
        "url": "https://vetmed.illinois.edu/wp-content/uploads/2015/08/50.-Anesthesia-and-Analgesia-in-Reptiles.pdf"
      },
      {
        "grupo": "pediatrico",
        "aplica": "perro/gato geriátrico",
        "min": 0.1,
        "max": 0.2,
        "via": "IM",
        "fuente": "PubMed / PubMed Central",
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC3113863/"
      },
      {
        "grupo": "pediatrico",
        "aplica": "perro geriátrico",
        "min": 0.25,
        "max": 0.25,
        "via": "IM",
        "fuente": "Guías AAHA",
        "url": "https://www.aaha.org/wp-content/uploads/globalassets/02-guidelines/2020-anesthesia/aahaanesthesiaguidelines_opioids.pdf"
      }
    ],
    "precauciones": []
  },
  "buprenorfina": {
    "nombre": "Buprenorfina",
    "categoria": "analgesico",
    "entradas": [
      {
        "grupo": "mamifero",
        "aplica": "perro, gato",
        "min": 0.005,
        "max": 0.03,
        "via": "IV/IM",
        "fuente": "Manual Veterinario Merck",
        "url": "https://merckvetmanual.com/management-and-nutrition/pain-assessment-and-management/analgesic-pharmacology"
      },
      {
        "grupo": "mamifero",
        "aplica": "hurón",
        "min": 0.01,
        "max": 0.03,
        "via": "IM/SC",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/exotic-and-laboratory-animals/ferrets/management-of-ferrets"
      },
      {
        "grupo": "mamifero",
        "aplica": "perro, gato",
        "min": 0.01,
        "max": 0.03,
        "via": "IM/IV",
        "fuente": "Guías AAHA",
        "url": "https://www.aaha.org/wp-content/uploads/globalassets/02-guidelines/2020-anesthesia/aahaanesthesiaguidelines_opioids.pdf"
      },
      {
        "grupo": "ave",
        "aplica": "cernícalo americano (Falco sparverius)",
        "min": 0.6,
        "max": 0.6,
        "via": "IM/IV",
        "fuente": "USGS",
        "url": "https://pubs.usgs.gov/publication/70147644"
      },
      {
        "grupo": "ave",
        "aplica": "ninfa (Nymphicus hollandicus)",
        "min": 0.6,
        "max": 1.8,
        "via": "IM",
        "fuente": "PubMed / PubMed Central",
        "url": "https://pubmed.ncbi.nlm.nih.gov/30457903/"
      },
      {
        "grupo": "reptil",
        "aplica": "lagartos",
        "min": 0.005,
        "max": 0.02,
        "via": "IM",
        "fuente": "WikiVet",
        "url": "https://en.wikivet.net/Lizard_Formulary_-_Anaesthesia_Associated_Drugs"
      },
      {
        "grupo": "pediatrico",
        "aplica": "perro/gato geriátrico",
        "min": 0.01,
        "max": 0.02,
        "via": "IM",
        "fuente": "PubMed / PubMed Central",
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC3113863/"
      }
    ],
    "precauciones": []
  },
  "fentanilo": {
    "nombre": "Fentanilo",
    "categoria": "analgesico",
    "entradas": [
      {
        "grupo": "mamifero",
        "aplica": "perro, gato",
        "min": 0.001,
        "max": 0.02,
        "via": "IV",
        "fuente": "Guías AAHA",
        "url": "https://www.aaha.org/wp-content/uploads/globalassets/02-guidelines/2020-anesthesia/aahaanesthesiaguidelines_opioids.pdf"
      },
      {
        "grupo": "mamifero",
        "aplica": "perro, gato",
        "min": 0.001,
        "max": 0.01,
        "via": "IV / transdérmico",
        "fuente": "Manual Veterinario Merck",
        "url": "https://merckvetmanual.com/management-and-nutrition/pain-assessment-and-management/analgesic-pharmacology"
      },
      {
        "grupo": "ave",
        "aplica": "cacatúa blanca",
        "min": 0.01,
        "max": 0.2,
        "via": "IM / SC",
        "fuente": "AGRIS (FAO)",
        "url": "https://agris.fao.org/search/en/records/65defd2f0f3e94b9e5d3a829"
      }
    ],
    "precauciones": []
  },
  "meloxicam": {
    "nombre": "Meloxicam",
    "categoria": "aine",
    "entradas": [
      {
        "grupo": "mamifero",
        "aplica": "perros",
        "min": 0.1,
        "max": 0.2,
        "via": "PO / IV / SC",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/pharmacology/inflammation/nonsteroidal-anti-inflammatory-drugs-in-animals"
      },
      {
        "grupo": "ave",
        "aplica": "loros (Amazona, 1-1.6), palomas (2 PO), rapaces (0.5 insuficiente)",
        "min": 0.5,
        "max": 2,
        "via": "IM / PO",
        "fuente": "Veterinary Practice News",
        "url": "https://www.veterinarypracticenews.com/wildside-january-2022/"
      },
      {
        "grupo": "reptil",
        "aplica": "reptiles en general (Merck); quelonios e iguanas 0.2 (VPN)",
        "min": 0.1,
        "max": 0.4,
        "via": "IV / IM / SC",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.msdvetmanual.com/multimedia/table/analgesics-sedatives-and-anesthetics-used-in-reptiles"
      }
    ],
    "precauciones": [
      {
        "texto": "Los AINE pueden empeorar una enfermedad renal previa; hay que vigilar la función renal y la hidratación.",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/pharmacology/inflammation/nonsteroidal-anti-inflammatory-drugs-in-animals"
      }
    ]
  },
  "carprofeno": {
    "nombre": "Carprofeno",
    "categoria": "aine",
    "entradas": [
      {
        "grupo": "mamifero",
        "aplica": "perros",
        "min": 2.2,
        "max": 4.4,
        "via": "PO / SC",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/nsaids-used-for-pain-management-in-dogs-and-cats"
      },
      {
        "grupo": "reptil",
        "aplica": "iguana verde",
        "min": 2,
        "max": 2,
        "via": "IM",
        "fuente": "Veterinární medicína",
        "url": "https://vetmed.agriculturejournals.cz/artkey/vet-200711-0006_effect-of-non-steroidal-anti-inflammatory-drugs-on-the-blood-profile-in-the-green-iguana-iguana-iguana.php"
      }
    ],
    "precauciones": [
      {
        "texto": "Se recomienda vigilar el daño hepático, sobre todo en animales geriátricos.",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/pharmacology/inflammation/nonsteroidal-anti-inflammatory-drugs-in-animals"
      }
    ]
  },
  "ketoprofeno": {
    "nombre": "Ketoprofeno",
    "categoria": "aine",
    "entradas": [
      {
        "grupo": "mamifero",
        "aplica": "perros y gatos",
        "min": 1,
        "max": 2,
        "via": "PO (perro); PO/IV/SC/IM (gato)",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/nsaids-used-for-pain-management-in-dogs-and-cats"
      },
      {
        "grupo": "ave",
        "aplica": "aves de laboratorio (SOP); patos Pekin (PK dosis única 5 mg/kg)",
        "min": 2,
        "max": 10,
        "via": "SC (2) / IM (5-10)",
        "fuente": "Univ. Ben-Gurión",
        "url": "https://www.bgu.ac.il/media/arofdpts/sop103-bird-analgesia.pdf"
      },
      {
        "grupo": "reptil",
        "aplica": "tortuga boba juvenil (Caretta caretta)",
        "min": 2,
        "max": 2,
        "via": "IM / IV",
        "fuente": "NC State University",
        "url": "https://emc.ncsu.edu/wp-content/uploads/sites/309/2018/09/Ketoprofen-pharmacokinetics-of-loggerhead-sea-turtles-Christiansen-Harms.pdf"
      }
    ],
    "precauciones": [
      {
        "texto": "Se han descrito alteraciones hepáticas y renales con el uso de AINE.",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/pharmacology/inflammation/nonsteroidal-anti-inflammatory-drugs-in-animals"
      }
    ]
  },
  "flunixin": {
    "nombre": "Flunixin meglumine",
    "categoria": "aine",
    "entradas": [
      {
        "grupo": "mamifero",
        "aplica": "equinos, bovinos, cerdos (NO perros/gatos)",
        "min": 1.1,
        "max": 2.2,
        "via": "IV / IM",
        "fuente": "Ficha técnica (VMD, Reino Unido)",
        "url": "https://www.vmd.defra.gov.uk/ProductinformationDatabase/files/SPC_Documents/SPC_141213.PDF"
      }
    ],
    "precauciones": [
      {
        "texto": "La dosis respaldada es para equinos, bovinos y cerdos; el uso crónico en perros puede causar úlcera gastrointestinal grave y daño renal.",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/pharmacology/inflammation/nonsteroidal-anti-inflammatory-drugs-in-animals"
      }
    ]
  },
  "enrofloxacina": {
    "nombre": "Enrofloxacina",
    "categoria": "antibiotico",
    "entradas": [
      {
        "grupo": "mamifero",
        "aplica": "perro",
        "min": 5,
        "max": 20,
        "via": "PO / IM / IV, cada 24 h",
        "fuente": "PubMed / PubMed Central",
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC5354050/"
      },
      {
        "grupo": "mamifero",
        "aplica": "gato (máximo 5 mg/kg al día)",
        "min": 5,
        "max": 5,
        "via": "PO",
        "fuente": "PubMed / PubMed Central",
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC5354050/"
      },
      {
        "grupo": "ave",
        "aplica": "aves de compañía (Merck); rapaces/flamencos (PMC)",
        "min": 15,
        "max": 20,
        "via": "PO / IM",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/antimicrobials-used-in-pet-birds"
      },
      {
        "grupo": "reptil",
        "aplica": "reptiles en general",
        "min": 5,
        "max": 10,
        "via": "IM / PO",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/antimicrobial-drugs-used-in-reptiles"
      }
    ],
    "precauciones": [
      {
        "texto": "En gatos no pasar de 5 mg/kg al día (riesgo de retinopatía); precaución en animales en crecimiento.",
        "fuente": "PubMed / PubMed Central",
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC5354050/"
      }
    ]
  },
  "amoxicilina": {
    "nombre": "Amoxicilina",
    "categoria": "antibiotico",
    "entradas": [
      {
        "grupo": "mamifero",
        "aplica": "perros y gatos",
        "min": 11,
        "max": 22,
        "via": "PO",
        "fuente": "PubMed / PubMed Central",
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC5354050/"
      },
      {
        "grupo": "ave",
        "aplica": "aves de compañía",
        "min": 125,
        "max": 125,
        "via": "PO",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/antimicrobials-used-in-pet-birds"
      },
      {
        "grupo": "reptil",
        "aplica": "lagartos",
        "min": 20,
        "max": 20,
        "via": "SC / IM",
        "fuente": "WikiVet",
        "url": "https://en.wikivet.net/Lizard_Formulary_-_Antimicrobials"
      }
    ],
    "precauciones": []
  },
  "ceftriaxona": {
    "nombre": "Ceftriaxona",
    "categoria": "antibiotico",
    "entradas": [],
    "precauciones": []
  },
  "gentamicina": {
    "nombre": "Gentamicina",
    "categoria": "antibiotico",
    "entradas": [
      {
        "grupo": "mamifero",
        "aplica": "perro",
        "min": 9,
        "max": 14,
        "via": "IM / IV / SC, cada 24 h",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/pharmacology/antibacterial-agents/aminoglycosides-use-in-animals"
      },
      {
        "grupo": "mamifero",
        "aplica": "gato",
        "min": 5,
        "max": 8,
        "via": "IM / IV / SC, cada 24 h",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/pharmacology/antibacterial-agents/aminoglycosides-use-in-animals"
      },
      {
        "grupo": "ave",
        "aplica": "cacatúas galah, guacamayo escarlata, grullas (5); 10 en codorniz/palomas PK pero toxico en gavilan de cola roja y buho cornudo",
        "min": 5,
        "max": 5,
        "via": "IM",
        "fuente": "PubMed / PubMed Central",
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC9219738/"
      },
      {
        "grupo": "reptil",
        "aplica": "variable por especie",
        "min": 1.75,
        "max": 10,
        "via": "IM / SC",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/antimicrobial-drugs-used-in-reptiles"
      }
    ],
    "precauciones": [
      {
        "texto": "Es nefrotóxica; el riesgo aumenta con deshidratación, hipovolemia, acidosis, hipomagnesemia y uso simultáneo de furosemida.",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/pharmacology/antibacterial-agents/aminoglycosides-use-in-animals"
      },
      {
        "texto": "En rapaces, 10 mg/kg resultó tóxico en estudios; la dosis respaldada en aves es 5 mg/kg IM.",
        "fuente": "PubMed / PubMed Central",
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC9219738/"
      }
    ]
  },
  "metronidazol": {
    "nombre": "Metronidazol",
    "categoria": "antibiotico",
    "entradas": [
      {
        "grupo": "mamifero",
        "aplica": "perros y gatos",
        "min": 7.5,
        "max": 25,
        "via": "PO",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/pharmacology/antibacterial-agents/nitroimidazoles-use-in-animals"
      },
      {
        "grupo": "ave",
        "aplica": "aves de compañía",
        "min": 25,
        "max": 50,
        "via": "PO",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/antimicrobials-used-in-pet-birds"
      },
      {
        "grupo": "reptil",
        "aplica": "reptiles en general",
        "min": 20,
        "max": 50,
        "via": "PO",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/antimicrobial-drugs-used-in-reptiles"
      }
    ],
    "precauciones": [
      {
        "texto": "Evitar en animales gestantes; con disfunción hepática se usa una dosis menor (15 a 20 mg/kg cada 24 h).",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/pharmacology/antibacterial-agents/nitroimidazoles-use-in-animals"
      }
    ]
  },
  "doxiciclina": {
    "nombre": "Doxiciclina",
    "categoria": "antibiotico",
    "entradas": [
      {
        "grupo": "mamifero",
        "aplica": "perros y gatos",
        "min": 5,
        "max": 10,
        "via": "PO",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/pharmacology/antibacterial-agents/tetracyclines-use-in-animals"
      },
      {
        "grupo": "ave",
        "aplica": "aves de compañía (clamidiosis)",
        "min": 25,
        "max": 25,
        "via": "PO (IM/SC inyectable 75-100)",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/antimicrobials-used-in-pet-birds"
      },
      {
        "grupo": "reptil",
        "aplica": "reptiles en general; lagartos 10-45 dias (Wikivet)",
        "min": 5,
        "max": 10,
        "via": "PO",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/antimicrobial-drugs-used-in-reptiles"
      }
    ],
    "precauciones": [
      {
        "texto": "Se deposita en huesos y dientes en formación y cruza la placenta.",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/pharmacology/antibacterial-agents/tetracyclines-use-in-animals"
      }
    ]
  },
  "ivermectina": {
    "nombre": "Ivermectina",
    "categoria": "antiparasitario",
    "entradas": [
      {
        "grupo": "mamifero",
        "aplica": "perros y gatos (uso fuera de etiqueta, sarna)",
        "min": 0.2,
        "max": 0.3,
        "via": "PO / SC",
        "fuente": "Manual Veterinario Merck",
        "url": "https://merckvetmanual.com/ear-disorders/diseases-of-the-pinna/mite-infestations-in-animals"
      },
      {
        "grupo": "ave",
        "aplica": "aves de compañía",
        "min": 0.2,
        "max": 0.4,
        "via": "PO / SC / IM",
        "fuente": "Manual Veterinario Merck",
        "url": "https://merckvetmanual.com/exotic-and-laboratory-animals/pet-birds/parasitic-diseases-of-pet-birds"
      },
      {
        "grupo": "reptil",
        "aplica": "lagartos y serpientes (NO quelonios; precaución escíncidos y serpiente indigo)",
        "min": 0.2,
        "max": 0.2,
        "via": "PO / IM / SC",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/parasiticides-used-in-reptiles"
      }
    ],
    "precauciones": [
      {
        "texto": "No usar en quelonios; precaución en escincos y serpientes índigo. Los perros con la mutación ABCB1 (MDR1) son más sensibles.",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/parasiticides-used-in-reptiles"
      }
    ]
  },
  "fenbendazol": {
    "nombre": "Fenbendazol",
    "categoria": "antiparasitario",
    "entradas": [
      {
        "grupo": "mamifero",
        "aplica": "perros; giardiasis perros y gatos",
        "min": 50,
        "max": 100,
        "via": "PO",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/drugs-for-intestinal-helminths-of-dogs-approved-in-the-us-and-uk"
      },
      {
        "grupo": "ave",
        "aplica": "aves de compañía",
        "min": 20,
        "max": 50,
        "via": "PO",
        "fuente": "Manual Veterinario Merck",
        "url": "https://merckvetmanual.com/exotic-and-laboratory-animals/pet-birds/parasitic-diseases-of-pet-birds"
      },
      {
        "grupo": "reptil",
        "aplica": "reptiles en general",
        "min": 25,
        "max": 100,
        "via": "PO",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/parasiticides-used-in-reptiles"
      }
    ],
    "precauciones": [
      {
        "texto": "En reptiles se ha descrito leucopenia.",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/parasiticides-used-in-reptiles"
      }
    ]
  },
  "praziquantel": {
    "nombre": "Praziquantel",
    "categoria": "antiparasitario",
    "entradas": [
      {
        "grupo": "mamifero",
        "aplica": "perro",
        "min": 5,
        "max": 12.5,
        "via": "PO / SC / IM",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/drugs-for-intestinal-helminths-of-dogs-approved-in-the-us-and-uk"
      },
      {
        "grupo": "mamifero",
        "aplica": "gato",
        "min": 5,
        "max": 5,
        "via": "PO, una vez",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/drugs-for-intestinal-helminths-of-dogs-approved-in-the-us-and-uk"
      },
      {
        "grupo": "ave",
        "aplica": "aves de compañía",
        "min": 5,
        "max": 10,
        "via": "PO / IM",
        "fuente": "Manual Veterinario Merck",
        "url": "https://merckvetmanual.com/exotic-and-laboratory-animals/pet-birds/parasitic-diseases-of-pet-birds"
      },
      {
        "grupo": "reptil",
        "aplica": "reptiles en general",
        "min": 8,
        "max": 8,
        "via": "PO / SC / IM",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/parasiticides-used-in-reptiles"
      }
    ],
    "precauciones": []
  },
  "selamectina": {
    "nombre": "Selamectina (spot-on)",
    "categoria": "antiparasitario",
    "entradas": [
      {
        "grupo": "mamifero",
        "aplica": "perros >=6 semanas, gatos >=8 semanas",
        "min": 6,
        "max": 6,
        "via": "tópica (spot-on)",
        "fuente": "FDA (etiqueta aprobada)",
        "url": "https://animaldrugsatfda.fda.gov/adafda/app/search/public/document/downloadFoi/7948"
      },
      {
        "grupo": "pediatrico",
        "aplica": "cachorros >=6 sem, gatitos >=8 sem",
        "min": 6,
        "max": 6,
        "via": "tópica",
        "fuente": "FDA (etiqueta aprobada)",
        "url": "https://animaldrugsatfda.fda.gov/adafda/app/search/public/document/downloadFoi/7948"
      }
    ],
    "precauciones": [
      {
        "texto": "La etiqueta aprobada indica una dosis mínima de 6 mg/kg tópica, en perros desde las 6 semanas y gatos desde las 8 semanas.",
        "fuente": "FDA (etiqueta aprobada)",
        "url": "https://animaldrugsatfda.fda.gov/adafda/app/search/public/document/downloadFoi/1238"
      }
    ]
  },
  "dexametasona": {
    "nombre": "Dexametasona",
    "categoria": "corticoide",
    "entradas": [
      {
        "grupo": "mamifero",
        "aplica": "perro (Merck Addison); perro y gato (ficha); IMHA sin especie",
        "min": 0.05,
        "max": 0.4,
        "via": "IV (Merck) / PO (ficha)",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/endocrine-system/the-adrenal-glands/addison-disease-hypoadrenocorticism-in-animals"
      },
      {
        "grupo": "ave",
        "aplica": "aves (general)",
        "min": 2,
        "max": 2,
        "via": "IM o IV",
        "fuente": "dvm360",
        "url": "https://www.dvm360.com/view/emergency-medicine-birds-proceedings"
      },
      {
        "grupo": "reptil",
        "aplica": "reptiles (general)",
        "min": 0.3,
        "max": 1.5,
        "via": "IM, IV, intraóseo",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/miscellaneous-drugs-for-reptiles"
      }
    ],
    "precauciones": [
      {
        "texto": "No usar en animales con infecciones virales o micóticas, diabetes mellitus ni hiperadrenocorticismo.",
        "fuente": "Ficha técnica (VMD, Reino Unido)",
        "url": "https://www.vmd.defra.gov.uk/ProductInformationDatabase/files/SPC_Documents/SPC_2655500.PDF"
      }
    ]
  },
  "prednisolona": {
    "nombre": "Prednisolona",
    "categoria": "corticoide",
    "entradas": [
      {
        "grupo": "mamifero",
        "aplica": "perro y gato",
        "min": 0.5,
        "max": 2,
        "via": "PO",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/pharmacology/anti-inflammatory-agents/corticosteroids"
      },
      {
        "grupo": "ave",
        "aplica": "aves (general)",
        "min": 2,
        "max": 4,
        "via": "IM/IV (succinato sódico)",
        "fuente": "dvm360",
        "url": "https://www.dvm360.com/view/emergency-medicine-birds-proceedings"
      },
      {
        "grupo": "reptil",
        "aplica": "reptiles (general)",
        "min": 1,
        "max": 5,
        "via": "PO",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/miscellaneous-drugs-for-reptiles"
      }
    ],
    "precauciones": []
  },
  "hidrocortisona": {
    "nombre": "Hidrocortisona",
    "categoria": "corticoide",
    "entradas": [],
    "precauciones": []
  },
  "atropina": {
    "nombre": "Atropina",
    "categoria": "emergencia",
    "entradas": [
      {
        "grupo": "mamifero",
        "aplica": "perro y gato",
        "min": 0.02,
        "max": 0.04,
        "via": "IV",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/competitive-nondepolarizing-agents-and-antagonists"
      },
      {
        "grupo": "ave",
        "aplica": "aves (general)",
        "min": 0.01,
        "max": 0.04,
        "via": "IM/IV",
        "fuente": "Veterian Key",
        "url": "https://veteriankey.com/avian-emergency-and-critical-care-medicine/"
      },
      {
        "grupo": "reptil",
        "aplica": "reptiles (general)",
        "min": 0.01,
        "max": 0.02,
        "via": "IM o IV",
        "fuente": "VIN",
        "url": "https://www.vin.com/doc/?id=3843985"
      }
    ],
    "precauciones": [
      {
        "texto": "Muchos conejos tienen atropinasa: el efecto dura poco; Merck sugiere glicopirrolato como alternativa.",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/exotic-and-laboratory-animals/rabbits/management-of-rabbits"
      }
    ]
  },
  "epinefrina": {
    "nombre": "Epinefrina (Adrenalina)",
    "categoria": "emergencia",
    "entradas": [
      {
        "grupo": "mamifero",
        "aplica": "perro y gato (RCP)",
        "min": 0.01,
        "max": 0.01,
        "via": "IV / IO",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/drugs-and-defibrillation-used-in-cardiopulmonary-resuscitation"
      },
      {
        "grupo": "mamifero",
        "aplica": "perro y gato (RCP)",
        "min": 0.02,
        "max": 0.02,
        "via": "intratraqueal (el doble)",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/drugs-and-defibrillation-used-in-cardiopulmonary-resuscitation"
      },
      {
        "grupo": "ave",
        "aplica": "aves (general)",
        "min": 0.01,
        "max": 0.02,
        "via": "intratraqueal preferida / IV",
        "fuente": "Veterian Key",
        "url": "https://veteriankey.com/avian-emergency-and-critical-care-medicine/"
      }
    ],
    "precauciones": [
      {
        "texto": "Las guías RECOVER 2024 ya no recomiendan dosis altas (0.1 mg/kg) en reanimación; usar 0.01 mg/kg IV o IO.",
        "fuente": "Guías RECOVER 2024",
        "url": "https://recoverinitiative.org/wp-content/uploads/2025/05/2024_RECOVER_Guidelines_es-419.pdf"
      }
    ]
  },
  "lidocaina": {
    "nombre": "Lidocaína",
    "categoria": "emergencia",
    "entradas": [
      {
        "grupo": "mamifero",
        "aplica": "perro (bolo 2 mg/kg, acumulado hasta 8 mg/kg en ~30 min); gato 0.1-0.4 bolo, total 0.25-1",
        "min": 2,
        "max": 8,
        "via": "IV",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/pharmacology/systemic-pharmacotherapeutics-of-the-cardiovascular-system/antiarrhythmics-for-use-in-animals"
      },
      {
        "grupo": "ave",
        "aplica": "aves; datos experimentales en pollo broiler anestesiado con isoflurano (Brandao et al., Vet Anaesth Analg 2015;42:442-8)",
        "min": null,
        "max": 4,
        "via": "IV / local",
        "fuente": "LSU (repositorio)",
        "url": "https://repository.lsu.edu/vetmed_pubs/1311"
      }
    ],
    "precauciones": [
      {
        "texto": "La hipopotasemia reduce mucho la eficacia de la lidocaína como antiarrítmico.",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/pharmacology/systemic-pharmacotherapeutics-of-the-cardiovascular-system/antiarrhythmics-for-use-in-animals"
      }
    ]
  },
  "furosemida": {
    "nombre": "Furosemida",
    "categoria": "emergencia",
    "entradas": [
      {
        "grupo": "mamifero",
        "aplica": "perro y gato",
        "min": 0.5,
        "max": 5,
        "via": "IV/IM/SC agudo; PO mantenimiento",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/pharmacology/systemic-pharmacotherapeutics-of-the-cardiovascular-system/diuretics-for-use-in-animals"
      },
      {
        "grupo": "ave",
        "aplica": "aves (general)",
        "min": 0.1,
        "max": 2,
        "via": "no indicada",
        "fuente": "Veterian Key",
        "url": "https://veteriankey.com/avian-emergency-and-critical-care-medicine/"
      },
      {
        "grupo": "reptil",
        "aplica": "reptiles (general)",
        "min": 2,
        "max": 5,
        "via": "IM, IV",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/miscellaneous-drugs-for-reptiles"
      }
    ],
    "precauciones": []
  },
  "naloxona": {
    "nombre": "Naloxona",
    "categoria": "reversor",
    "entradas": [
      {
        "grupo": "mamifero",
        "aplica": "perro y gato",
        "min": 0.01,
        "max": 0.16,
        "via": "IV 0.01-0.04; IM/IN 0.04-0.16",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/toxicology/toxicoses-from-human-recreational-drugs/overview-of-toxicoses-in-animals-from-human-recreational-drugs"
      },
      {
        "grupo": "reptil",
        "aplica": "quelonios (tras cetamina + dexmedetomidina + hidromorfona)",
        "min": 0.1,
        "max": 0.1,
        "via": "IM",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/analgesics-sedatives-and-anesthetics-used-in-reptiles"
      }
    ],
    "precauciones": []
  },
  "atipamezol": {
    "nombre": "Atipamezol",
    "categoria": "reversor",
    "entradas": [
      {
        "grupo": "mamifero",
        "aplica": "perro",
        "min": 0.1,
        "max": 0.1,
        "via": "IM",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/drugs-and-defibrillation-used-in-cardiopulmonary-resuscitation"
      },
      {
        "grupo": "mamifero",
        "aplica": "gato",
        "min": 0.5,
        "max": 0.5,
        "via": "IM",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/drugs-and-defibrillation-used-in-cardiopulmonary-resuscitation"
      },
      {
        "grupo": "ave",
        "aplica": "periquito/aves pequenas (JZWM 2024;55:1)",
        "min": 0.2,
        "max": 0.2,
        "via": "SC",
        "fuente": "Journal of Zoo and Wildlife Medicine",
        "url": "https://complete.bioone.org/journals/journal-of-zoo-and-wildlife-medicine/volume-55/issue-1/2022-0124/COMPARISON-OF-THREE-MIDAZOLAM-BASED-SEDATION-PROTOCOLS-IN-BUDGERIGARS-MELOPSITTACUS/10.1638/2022-0124.full"
      },
      {
        "grupo": "reptil",
        "aplica": "quelonios, tras cetamina 10-25 + dexmedetomidina 0.05-0.1 + hidromorfona 0.5 mg/kg IM",
        "min": 0.5,
        "max": 0.5,
        "via": "IM",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/analgesics-sedatives-and-anesthetics-used-in-reptiles"
      }
    ],
    "precauciones": [
      {
        "texto": "La dosis depende del agonista α2 usado (5 veces la dosis de medetomidina y 10 veces la de dexmedetomidina, en volumen).",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.merckvetmanual.com/multimedia/table/drugs-and-defibrillation"
      }
    ]
  },
  "yohimbina": {
    "nombre": "Yohimbina",
    "categoria": "reversor",
    "entradas": [
      {
        "grupo": "mamifero",
        "aplica": "perro (Am J Vet Res 1983; resumen leido via Europe PMC)",
        "min": 0.1,
        "max": 0.1,
        "via": "IV",
        "fuente": "PubMed / PubMed Central",
        "url": "https://pubmed.ncbi.nlm.nih.gov/6841252/"
      },
      {
        "grupo": "ave",
        "aplica": "rapaces (34 aves; Freed & Baker, J Wildl Dis 1989;25:136); halcon cola roja 0.10 mg/kg recomendado (Degernes 1988, via no indicada en el resumen)",
        "min": 0.1,
        "max": 0.2,
        "via": "IV",
        "fuente": "PubMed / PubMed Central",
        "url": "https://pubmed.ncbi.nlm.nih.gov/2915398/"
      }
    ],
    "precauciones": []
  },
  "flumazenil": {
    "nombre": "Flumazenil",
    "categoria": "reversor",
    "entradas": [
      {
        "grupo": "mamifero",
        "aplica": "perro y gato",
        "min": 0.01,
        "max": 0.01,
        "via": "IV lenta",
        "fuente": "Manual Veterinario Merck",
        "url": "https://www.msdvetmanual.com/toxicology/toxicoses-from-human-antidepressants-anxiolytics-and-sleep-aids/toxicoses-in-animals-from-human-antidepressants-anxiolytics-and-sleep-aids"
      },
      {
        "grupo": "ave",
        "aplica": "periquito (JZWM 2024;55:1)",
        "min": 0.05,
        "max": 0.05,
        "via": "SC",
        "fuente": "Journal of Zoo and Wildlife Medicine",
        "url": "https://complete.bioone.org/journals/journal-of-zoo-and-wildlife-medicine/volume-55/issue-1/2022-0124/COMPARISON-OF-THREE-MIDAZOLAM-BASED-SEDATION-PROTOCOLS-IN-BUDGERIGARS-MELOPSITTACUS/10.1638/2022-0124.full"
      },
      {
        "grupo": "reptil",
        "aplica": "dragón barbudo (Pogona vitticeps), estudio 2026; resumen leido via Europe PMC",
        "min": 0.05,
        "max": 0.1,
        "via": "SC",
        "fuente": "PubMed / PubMed Central",
        "url": "https://pubmed.ncbi.nlm.nih.gov/42235351/"
      }
    ],
    "precauciones": []
  }
};
  return { FECHA_REVISION: FECHA_REVISION, CATEGORIAS: CATEGORIAS, GRUPOS: GRUPOS, FARMACOS: FARMACOS };
});
