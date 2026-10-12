/* ============================================================ */
/* VALORES HEMATOLÓGICOS Y BIOQUÍMICOS · solo datos con fuente    */
/* Cada valor se tomó de un artículo o manual enlazado. Se indica  */
/* si coincide con la referencia de manual ("verificado") o si es  */
/* lo medido en un estudio concreto (muestra pequeña, un solo      */
/* lugar). No son rangos universales para la especie. Lo que no se */
/* encontró publicado no aparece. Revisado el 2026-10-12.          */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_HEMOGRAMA = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var FECHA_REVISION = '2026-10-12';
  var ESPECIES = [
 {
  "grupo": "Felinos",
  "clase": "Mamíferos",
  "esp": "Jaguar (Panthera onca)",
  "datos": [
   {
    "campo": "Hematocrito",
    "estado": "estudio",
    "valor": "36.3 ± 3.21 % (34-40), n=3 cautivos",
    "fuente": "Revista Veterinaria (UNNE)",
    "url": "https://revistas.unne.edu.ar/index.php/vet/article/download/1883/1634/5291"
   },
   {
    "campo": "Hemoglobina",
    "estado": "estudio",
    "valor": "10.8 ± 1.46 g/dL (9.4-12.3), n=3",
    "fuente": "Revista Veterinaria (UNNE)",
    "url": "https://revistas.unne.edu.ar/index.php/vet/article/download/1883/1634/5291"
   },
   {
    "campo": "Leucocitos",
    "estado": "estudio",
    "valor": "17.2 ± 3.26 ×10³/µL (13.6-19.9), n=3",
    "fuente": "Revista Veterinaria (UNNE)",
    "url": "https://revistas.unne.edu.ar/index.php/vet/article/download/1883/1634/5291"
   },
   {
    "campo": "Proteínas totales",
    "estado": "estudio",
    "valor": "6.67 ± 0.10 g/dL (6.56-6.74), n=3",
    "fuente": "Revista Veterinaria (UNNE)",
    "url": "https://revistas.unne.edu.ar/index.php/vet/article/download/1883/1634/5291"
   },
   {
    "campo": "Glucosa",
    "estado": "estudio",
    "valor": "0.84 ± 0.09 g/L = 84 mg/dL (75-93), n=3 (convertido)",
    "fuente": "Revista Veterinaria (UNNE)",
    "url": "https://revistas.unne.edu.ar/index.php/vet/article/download/1883/1634/5291"
   },
   {
    "campo": "Creatinina",
    "estado": "estudio",
    "valor": "25.0 ± 7.21 mg/L = 2.5 mg/dL (1.9-3.3 mg/dL), n=3 (convertido)",
    "fuente": "Revista Veterinaria (UNNE)",
    "url": "https://revistas.unne.edu.ar/index.php/vet/article/download/1883/1634/5291"
   }
  ]
 },
 {
  "grupo": "Felinos",
  "clase": "Mamíferos",
  "esp": "Puma (Puma concolor)",
  "datos": [
   {
    "campo": "Hematocrito",
    "estado": "estudio",
    "valor": "36.9 ± 4.97 % adultos (S: 34.82 ± 5.99; N: 36.97 ± 4.27)",
    "fuente": "USGS",
    "url": "https://pubs.usgs.gov/publication/70006592"
   },
   {
    "campo": "Hemoglobina",
    "estado": "estudio",
    "valor": "11.60 ± 1.62 (sur) a 12.53 ± 1.66 g/dL (norte)",
    "fuente": "USGS",
    "url": "https://pubs.usgs.gov/publication/70006592"
   },
   {
    "campo": "Proteínas totales",
    "estado": "estudio",
    "valor": "7.50 ± 0.59 g/dL adultos",
    "fuente": "USGS",
    "url": "https://pubs.usgs.gov/publication/70006592"
   },
   {
    "campo": "Glucosa",
    "estado": "estudio",
    "valor": "7.49-8.55 mmol/L = 135-154 mg/dL (convertido; cita secundaria de Currier & Russell 1982)",
    "fuente": "Acta Veterinaria Brno",
    "url": "https://actavet.vfu.cz/media/pdf/avb_1987056030343.pdf"
   },
   {
    "campo": "Creatinina",
    "estado": "estudio",
    "valor": "217.4-271.3 µmol/L = 2.46-3.07 mg/dL (convertido; cita secundaria)",
    "fuente": "Acta Veterinaria Brno",
    "url": "https://actavet.vfu.cz/media/pdf/avb_1987056030343.pdf"
   }
  ]
 },
 {
  "grupo": "Felinos",
  "clase": "Mamíferos",
  "esp": "Ocelote (Leopardus pardalis)",
  "datos": [
   {
    "campo": "Hematocrito",
    "estado": "verificado",
    "valor": "27-53 % (silvestres, Widmer 2016); 27-53 (ISIS); 25.0-48.2 (Species360)",
    "fuente": "PubMed Central",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11415929"
   },
   {
    "campo": "Hemoglobina",
    "estado": "estudio",
    "valor": "9.5-13.1 g/dL (silvestres n=9); 9.4-19.1 (ISIS); 8.2-15.9 (Species360) (convertido de g/L)",
    "fuente": "PubMed Central",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11415929"
   },
   {
    "campo": "Leucocitos",
    "estado": "estudio",
    "valor": "15.5-19.9 (silvestres n=9); 4.62-23.3 (ISIS); 4.7-17.7 ×10³/µL (Species360)",
    "fuente": "PubMed Central",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11415929"
   },
   {
    "campo": "Proteínas totales",
    "estado": "estudio",
    "valor": "7.4-11.3 (silvestres); 5.6-10.0 (ISIS); 5.6-8.6 g/dL (Species360) (convertido de g/L)",
    "fuente": "PubMed Central",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11415929"
   },
   {
    "campo": "Creatinina",
    "estado": "estudio",
    "valor": "0.69-1.30 mg/dL (silvestres); 0.80-3.20 (ISIS); 0.70-2.90 (Species360) (convertido de µmol/L)",
    "fuente": "PubMed Central",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11415929"
   }
  ]
 },
 {
  "grupo": "Felinos",
  "clase": "Mamíferos",
  "esp": "Gato doméstico (referencia)",
  "datos": [
   {
    "campo": "Hematocrito",
    "estado": "verificado",
    "valor": "30-45 %",
    "fuente": "Manual Veterinario Merck",
    "url": "https://www.msdvetmanual.com/multimedia/table/hematology-complete-blood-count-reference-ranges"
   },
   {
    "campo": "Hemoglobina",
    "estado": "estudio",
    "valor": "9.8-15.4 g/dL",
    "fuente": "Manual Veterinario Merck",
    "url": "https://www.msdvetmanual.com/multimedia/table/hematology-complete-blood-count-reference-ranges"
   },
   {
    "campo": "Leucocitos",
    "estado": "verificado",
    "valor": "5.5-19.5 ×10³/µL",
    "fuente": "Manual Veterinario Merck",
    "url": "https://www.msdvetmanual.com/multimedia/table/hematology-complete-blood-count-reference-ranges"
   },
   {
    "campo": "Proteínas totales",
    "estado": "verificado",
    "valor": "6.0-7.9 g/dL",
    "fuente": "Manual Veterinario Merck",
    "url": "https://www.msdvetmanual.com/reference-values-and-conversion-tables/reference-guides/serum-biochemical-analysis-reference-ranges"
   },
   {
    "campo": "Glucosa",
    "estado": "estudio",
    "valor": "60-120 mg/dL",
    "fuente": "Manual Veterinario Merck",
    "url": "https://www.msdvetmanual.com/reference-values-and-conversion-tables/reference-guides/serum-biochemical-analysis-reference-ranges"
   },
   {
    "campo": "Creatinina",
    "estado": "estudio",
    "valor": "0.9-2.2 mg/dL",
    "fuente": "Manual Veterinario Merck",
    "url": "https://www.msdvetmanual.com/reference-values-and-conversion-tables/reference-guides/serum-biochemical-analysis-reference-ranges"
   }
  ]
 },
 {
  "grupo": "Cánidos",
  "clase": "Mamíferos",
  "esp": "Coyote",
  "datos": [
   {
    "campo": "Hematocrito",
    "estado": "verificado",
    "valor": "47.4 % (39.8-71.7), n=20 adultos SC; Wisconsin 47.7/49 %",
    "fuente": "USDA Forest Service",
    "url": "https://research.fs.usda.gov/download/treesearch/33878.pdf"
   },
   {
    "campo": "Hemoglobina",
    "estado": "verificado",
    "valor": "14.4 g/dL (11.4-21.2), n=20; Wisconsin 14.2/15",
    "fuente": "USDA Forest Service",
    "url": "https://research.fs.usda.gov/download/treesearch/33878.pdf"
   },
   {
    "campo": "Leucocitos",
    "estado": "estudio",
    "valor": "20.3 ×10³/µL (10.2-37.5), n=20; Wisconsin 20.3/15.5",
    "fuente": "USDA Forest Service",
    "url": "https://research.fs.usda.gov/download/treesearch/33878.pdf"
   },
   {
    "campo": "Proteínas totales",
    "estado": "estudio",
    "valor": "7.7 g/dL (5.8-9.6), n=24; Wisconsin 6.4",
    "fuente": "USDA Forest Service",
    "url": "https://research.fs.usda.gov/download/treesearch/33878.pdf"
   },
   {
    "campo": "Glucosa",
    "estado": "estudio",
    "valor": "96.1 mg/dL (14-187), n=24; Wisconsin 161/181",
    "fuente": "USDA Forest Service",
    "url": "https://research.fs.usda.gov/download/treesearch/33878.pdf"
   },
   {
    "campo": "Creatinina",
    "estado": "estudio",
    "valor": "0.80 mg/dL (0.4-1.2), n=24",
    "fuente": "USDA Forest Service",
    "url": "https://research.fs.usda.gov/download/treesearch/33878.pdf"
   }
  ]
 },
 {
  "grupo": "Cánidos",
  "clase": "Mamíferos",
  "esp": "Perro doméstico (referencia)",
  "datos": [
   {
    "campo": "Hematocrito",
    "estado": "verificado",
    "valor": "37-55 % (Duncan & Prasse 1986 citado); Merck 35-57",
    "fuente": "USDA Forest Service",
    "url": "https://research.fs.usda.gov/download/treesearch/33878.pdf"
   },
   {
    "campo": "Hemoglobina",
    "estado": "verificado",
    "valor": "12-18 g/dL (Duncan & Prasse 1986 citado); Merck 11.9-18.9",
    "fuente": "USDA Forest Service",
    "url": "https://research.fs.usda.gov/download/treesearch/33878.pdf"
   },
   {
    "campo": "Leucocitos",
    "estado": "verificado",
    "valor": "6.0-17.0 ×10³/µL (Duncan & Prasse 1986 citado); Merck 5.0-14.1",
    "fuente": "USDA Forest Service",
    "url": "https://research.fs.usda.gov/download/treesearch/33878.pdf"
   },
   {
    "campo": "Proteínas totales",
    "estado": "verificado",
    "valor": "5.4-7.5 g/dL",
    "fuente": "Manual Veterinario Merck",
    "url": "https://www.msdvetmanual.com/reference-values-and-conversion-tables/reference-guides/serum-biochemical-analysis-reference-ranges"
   },
   {
    "campo": "Glucosa",
    "estado": "estudio",
    "valor": "76-119 mg/dL (Merck); 71-115 (D&P 1986 citado)",
    "fuente": "Manual Veterinario Merck",
    "url": "https://www.msdvetmanual.com/reference-values-and-conversion-tables/reference-guides/serum-biochemical-analysis-reference-ranges"
   },
   {
    "campo": "Creatinina",
    "estado": "verificado",
    "valor": "0.5-1.7 mg/dL (Merck); <1.5 (D&P 1986 citado)",
    "fuente": "Manual Veterinario Merck",
    "url": "https://www.msdvetmanual.com/reference-values-and-conversion-tables/reference-guides/serum-biochemical-analysis-reference-ranges"
   }
  ]
 },
 {
  "grupo": "Primates",
  "clase": "Mamíferos",
  "esp": "Mono araña (Ateles)",
  "datos": [
   {
    "campo": "Hematocrito",
    "estado": "estudio",
    "valor": "41.2 ± 4.7 % hembras (28-47.9); machos ~41 (36.4-44.5), n=34 cautivos",
    "fuente": "Agro Productividad",
    "url": "https://revista-agroproductividad.org/index.php/agroproductividad/article/download/1974/1620/7912"
   },
   {
    "campo": "Hemoglobina",
    "estado": "estudio",
    "valor": "14.2 ± 1.4 g/dL hembras (12.3-17.2); machos 14.2 ± 1.7 (9.3-17)",
    "fuente": "Agro Productividad",
    "url": "https://revista-agroproductividad.org/index.php/agroproductividad/article/download/1974/1620/7912"
   },
   {
    "campo": "Leucocitos",
    "estado": "estudio",
    "valor": "11.2 ± 3.4 hembras (5.5-21.2); machos 9.9 ± 3.8 ×10³/µL",
    "fuente": "Agro Productividad",
    "url": "https://revista-agroproductividad.org/index.php/agroproductividad/article/download/1974/1620/7912"
   },
   {
    "campo": "Proteínas totales",
    "estado": "estudio",
    "valor": "5.9 ± 0.8 hembras (4.9-7.2); machos 4.9 ± 1.2 (3.9-5.8) g/dL",
    "fuente": "Agro Productividad",
    "url": "https://revista-agroproductividad.org/index.php/agroproductividad/article/download/1974/1620/7912"
   },
   {
    "campo": "Glucosa",
    "estado": "estudio",
    "valor": "103.5 ± 1.8 mg/dL hembras (101-106); machos 102.5 (99.3-110.5)",
    "fuente": "Agro Productividad",
    "url": "https://revista-agroproductividad.org/index.php/agroproductividad/article/download/1974/1620/7912"
   },
   {
    "campo": "Creatinina",
    "estado": "estudio",
    "valor": "0.6 ± 0.1 hembras (0.4-0.8); machos 0.5 ± 0.3 (0.33-0.70) mg/dL",
    "fuente": "Agro Productividad",
    "url": "https://revista-agroproductividad.org/index.php/agroproductividad/article/download/1974/1620/7912"
   }
  ]
 },
 {
  "grupo": "Primates",
  "clase": "Mamíferos",
  "esp": "Mono aullador (Alouatta)",
  "datos": [
   {
    "campo": "Hematocrito",
    "estado": "estudio",
    "valor": "A. palliata silvestres: hembras 37.9 ± 5.7 % (30.5-47.5), machos 41.2 ± 4.6 (30.8-48.4), n=35; Larsen 2024 mediana 36-37 (IQR 30-42)",
    "fuente": "Revista de Biología Tropical (UCR)",
    "url": "https://archivo.revistas.ucr.ac.cr/index.php/rbt/article/download/48062/51920?inline=1"
   },
   {
    "campo": "Hemoglobina",
    "estado": "estudio",
    "valor": "Hembras 11.1 ± 1.4 g/dL (9.0-13.8), machos 11.9 ± 1.1 (9.2-14.0); Larsen 2024 mediana 10.4-10.5",
    "fuente": "Revista de Biología Tropical (UCR)",
    "url": "https://archivo.revistas.ucr.ac.cr/index.php/rbt/article/download/48062/51920?inline=1"
   },
   {
    "campo": "Leucocitos",
    "estado": "verificado",
    "valor": "Hembras 8.1 ± 2.4 (2.9-12.7), machos 8.7 ± 3.4 (4.6-19.9) ×10³/µL; Larsen 2024 mediana 7.75-8.58",
    "fuente": "Revista de Biología Tropical (UCR)",
    "url": "https://archivo.revistas.ucr.ac.cr/index.php/rbt/article/download/48062/51920?inline=1"
   },
   {
    "campo": "Proteínas totales",
    "estado": "estudio",
    "valor": "Mediana 6.2 (IQR 6.0-6.6) y 6.4 (6.1-6.9) g/dL (hembras lactantes/no lactantes; unidad impresa \"g/L\")",
    "fuente": "Duke University",
    "url": "https://dukespace.lib.duke.edu/server/api/core/bitstreams/74458c76-8c6d-42db-9ad9-d1235230ac57/content"
   },
   {
    "campo": "Glucosa",
    "estado": "verificado",
    "valor": "Mediana 90 (IQR 84-100) y 88 mg/dL (79-111); ref. lab 89 (79-114)",
    "fuente": "Duke University",
    "url": "https://dukespace.lib.duke.edu/server/api/core/bitstreams/74458c76-8c6d-42db-9ad9-d1235230ac57/content"
   }
  ]
 },
 {
  "grupo": "Primates",
  "clase": "Mamíferos",
  "esp": "Mono capuchino (Cebus)",
  "datos": [
   {
    "campo": "Hematocrito",
    "estado": "estudio",
    "valor": "C. imitator (n=12): hembras 40.5 ± 5.8 % (34.6-50.9), machos 42.6 ± 6.2 (36.0-52.8); S. libidinosus (n=50) VG 0.39 (RI 32-45 %)",
    "fuente": "SciELO Brasil",
    "url": "https://archivo.revistas.ucr.ac.cr/index.php/rbt/article/download/48062/51920?inline=1 | https://www.scielo.br/j/cr/a/bYVt7HFGq6vGrgd9jmSs45y/?lang=en"
   },
   {
    "campo": "Hemoglobina",
    "estado": "estudio",
    "valor": "C. imitator: 11.7 ± 1.6 (10.2-14.0) / 12.2 ± 1.7 (10.6-15.3) g/dL; S. libidinosus RI 9.5-14.7 g/dL (convertido de g/L)",
    "fuente": "SciELO Brasil",
    "url": "https://archivo.revistas.ucr.ac.cr/index.php/rbt/article/download/48062/51920?inline=1 | https://www.scielo.br/j/cr/a/bYVt7HFGq6vGrgd9jmSs45y/?lang=en"
   },
   {
    "campo": "Leucocitos",
    "estado": "estudio",
    "valor": "C. imitator: 8.9 ± 4.2 (3.5-13.8) / 11.1 ± 4.7 (5.1-18.2) ×10³/µL; S. libidinosus RI 3.9-18.7",
    "fuente": "SciELO Brasil",
    "url": "https://archivo.revistas.ucr.ac.cr/index.php/rbt/article/download/48062/51920?inline=1 | https://www.scielo.br/j/cr/a/bYVt7HFGq6vGrgd9jmSs45y/?lang=en"
   }
  ]
 },
 {
  "grupo": "Ungulados",
  "clase": "Mamíferos",
  "esp": "Venado cola blanca",
  "datos": [
   {
    "campo": "Hematocrito",
    "estado": "verificado",
    "valor": "Cades Cove (silvestres, n=203): ~43.6 ± 0.5 %; ISIS 1999 citado: 38.5; Lima cautivos (O.v. peruvianus, n=25): 28.9 (22-35)",
    "fuente": "University of Tennessee",
    "url": "https://trace.tennessee.edu/bitstreams/65c20cff-1b61-48ca-872e-3dc0628c1c3e/download"
   },
   {
    "campo": "Hemoglobina",
    "estado": "verificado",
    "valor": "Cades Cove 15.5-16.0 g/dL; ISIS citado 13.8; Lima 9.5 (7.2-11.6)",
    "fuente": "University of Tennessee",
    "url": "https://trace.tennessee.edu/bitstreams/65c20cff-1b61-48ca-872e-3dc0628c1c3e/download"
   },
   {
    "campo": "Leucocitos",
    "estado": "verificado",
    "valor": "Cades Cove 3.956-6.878 ×10³/µL; ISIS citado 3.818; Lima 3.71 (1.30-5.55)",
    "fuente": "Redalyc",
    "url": "https://www.redalyc.org/pdf/3718/371838854005.pdf"
   },
   {
    "campo": "Proteínas totales",
    "estado": "estudio",
    "valor": "6.6 ± 0.7 g/dL, n=23 cautivos (Lima)",
    "fuente": "Redalyc",
    "url": "https://www.redalyc.org/pdf/3718/371838855009.pdf"
   },
   {
    "campo": "Glucosa",
    "estado": "estudio",
    "valor": "Cades Cove: 143.8 ± 10.8 (may-oct) a 220.3 ± 6.6 mg/dL (nov-abr); 182-214 por sexo",
    "fuente": "University of Tennessee",
    "url": "https://trace.tennessee.edu/bitstreams/65c20cff-1b61-48ca-872e-3dc0628c1c3e/download"
   },
   {
    "campo": "Creatinina",
    "estado": "verificado",
    "valor": "Lima 2.1 ± 0.4 (1.5-2.9); ISIS citado 1.8 ± 0.4 (1.2-2.6); Cades Cove 1.6-1.7 mg/dL",
    "fuente": "Redalyc",
    "url": "https://www.redalyc.org/pdf/3718/371838854005.pdf"
   }
  ]
 },
 {
  "grupo": "Ungulados",
  "clase": "Mamíferos",
  "esp": "Pecarí de collar",
  "datos": [
   {
    "campo": "Hematocrito",
    "estado": "estudio",
    "valor": "Brasil Amazonia (n=73): 50.3 ± 4.52 % (40-60); Brasil semiarido (n=30): 54.1/54.8 (44-60)",
    "fuente": "Embrapa",
    "url": "https://www.alice.cnptia.embrapa.br/alice/bitstream/doc/1030875/1/gmr6385.pdf"
   },
   {
    "campo": "Hemoglobina",
    "estado": "estudio",
    "valor": "14.7 ± 1.77 g/dL (11.5-20), n=73; semiarido 17.25/17.27 (14-20)",
    "fuente": "Embrapa",
    "url": "https://www.alice.cnptia.embrapa.br/alice/bitstream/doc/1030875/1/gmr6385.pdf"
   },
   {
    "campo": "Leucocitos",
    "estado": "verificado",
    "valor": "14.6 ± 5.9 (5.9-35), n=73; semiarido 11.99/12.18 (7.0-17.8) ×10³/µL",
    "fuente": "Embrapa",
    "url": "https://www.alice.cnptia.embrapa.br/alice/bitstream/doc/1030875/1/gmr6385.pdf"
   },
   {
    "campo": "Proteínas totales",
    "estado": "estudio",
    "valor": "Semiarido 7.62 (machos)/8.45 (hembras) g/dL; Peru 8.5 ± 1.1; Amazonia 10.5 ± 0.9 (unidad impresa mg/dL)",
    "fuente": "SciELO Brasil",
    "url": "https://scielo.br/j/rcaat/a/JM7FMsbXgvFybZdwHLVHsCx"
   },
   {
    "campo": "Glucosa",
    "estado": "estudio",
    "valor": "Semiarido 64.3 (43-97) machos / 73.9 (23-155) hembras mg/dL, n=30",
    "fuente": "SciELO Brasil",
    "url": "https://scielo.br/j/rcaat/a/JM7FMsbXgvFybZdwHLVHsCx"
   },
   {
    "campo": "Creatinina",
    "estado": "estudio",
    "valor": "Semiarido 1.32/1.11 (0.3-2.5); Amazonia 2.0 ± 0.4 (1.4-3.5); Peru 2.2 ± 0.5 mg/dL",
    "fuente": "SciELO Brasil",
    "url": "https://scielo.br/j/rcaat/a/JM7FMsbXgvFybZdwHLVHsCx"
   }
  ]
 },
 {
  "grupo": "Procyónidos",
  "clase": "Mamíferos",
  "esp": "Coatí (Nasua)",
  "datos": [
   {
    "campo": "Hematocrito",
    "estado": "estudio",
    "valor": "Machos 31.8 ± 1.5 % (25.2-44.3), hembras 27.9 ± 0.6 (22.5-39.1), n=44 semi-libres",
    "fuente": "Redalyc",
    "url": "https://www.redalyc.org/pdf/575/57523587011.pdf"
   },
   {
    "campo": "Hemoglobina",
    "estado": "estudio",
    "valor": "Machos 10.7 ± 0.4 g/dL (8.7-13.9), hembras 9.2 ± 0.2 (7.6-12.7)",
    "fuente": "Redalyc",
    "url": "https://www.redalyc.org/pdf/575/57523587011.pdf"
   },
   {
    "campo": "Leucocitos",
    "estado": "estudio",
    "valor": "Machos 9.48 (5.2-14.7), hembras 8.61 (5.1-15.3) ×10³/µL",
    "fuente": "Redalyc",
    "url": "https://www.redalyc.org/pdf/575/57523587011.pdf"
   },
   {
    "campo": "Proteínas totales",
    "estado": "estudio",
    "valor": "Machos 7.02 (6.2-8.2), hembras 7.05 (5.7-8.3) g/dL",
    "fuente": "Redalyc",
    "url": "https://www.redalyc.org/pdf/575/57523587011.pdf"
   },
   {
    "campo": "Glucosa",
    "estado": "estudio",
    "valor": "Machos 80.1 (39-133), hembras 74.4 (45-114) mg/dL",
    "fuente": "Redalyc",
    "url": "https://www.redalyc.org/pdf/575/57523587011.pdf"
   },
   {
    "campo": "Creatinina",
    "estado": "estudio",
    "valor": "Machos 1.17 (0.9-1.5), hembras 0.99 (0.8-1.2) mg/dL",
    "fuente": "Redalyc",
    "url": "https://www.redalyc.org/pdf/575/57523587011.pdf"
   }
  ]
 },
 {
  "grupo": "Rapaces",
  "clase": "Aves",
  "esp": "Águila real (Aquila)",
  "datos": [
   {
    "campo": "Hematocrito",
    "estado": "estudio",
    "valor": "0.47 ± 0.009 L/L = 47 %, n=21 adultos (Iran)",
    "fuente": "Springer",
    "url": "https://link.springer.com/article/10.1007/s00580-008-0720-8"
   },
   {
    "campo": "Hemoglobina",
    "estado": "estudio",
    "valor": "91.73 ± 1.52 g/L = 9.2 g/dL (convertido)",
    "fuente": "Springer",
    "url": "https://link.springer.com/article/10.1007/s00580-008-0720-8"
   },
   {
    "campo": "Leucocitos",
    "estado": "estudio",
    "valor": "24.31 ± 1.97 ×10⁹/L = 24.3 ×10³/µL",
    "fuente": "Springer",
    "url": "https://link.springer.com/article/10.1007/s00580-008-0720-8"
   },
   {
    "campo": "Proteínas totales",
    "estado": "estudio",
    "valor": "49.76 ± 1.35 g/L = 4.98 g/dL (convertido)",
    "fuente": "Springer",
    "url": "https://link.springer.com/article/10.1007/s00580-008-0720-8"
   },
   {
    "campo": "Glucosa",
    "estado": "estudio",
    "valor": "16.42 ± 0.73 mmol/L = 296 mg/dL (convertido)",
    "fuente": "Springer",
    "url": "https://link.springer.com/article/10.1007/s00580-008-0720-8"
   }
  ]
 },
 {
  "grupo": "Rapaces",
  "clase": "Aves",
  "esp": "Águila arpía (Harpia)",
  "datos": [
   {
    "campo": "Hematocrito",
    "estado": "estudio",
    "valor": "33 ± 2.74 % (30.7-36.2), n=14 muestras/9 aves cautivas",
    "fuente": "SciELO Brasil",
    "url": "https://www.scielo.br/j/pvb/a/x3mJBNjnFWWyndp9Z7tWNhd/?format=pdf&lang=en"
   },
   {
    "campo": "Hemoglobina",
    "estado": "estudio",
    "valor": "9.55 ± 2.08 g/dL (7.5-11.6)",
    "fuente": "SciELO Brasil",
    "url": "https://www.scielo.br/j/pvb/a/x3mJBNjnFWWyndp9Z7tWNhd/?format=pdf&lang=en"
   },
   {
    "campo": "Leucocitos",
    "estado": "estudio",
    "valor": "16.52 ± 5.36 ×10³/µL (11.2-21.9)",
    "fuente": "SciELO Brasil",
    "url": "https://www.scielo.br/j/pvb/a/x3mJBNjnFWWyndp9Z7tWNhd/?format=pdf&lang=en"
   },
   {
    "campo": "Proteínas totales",
    "estado": "estudio",
    "valor": "5.24 ± 0.56 g/dL (4.68-5.80); adultos 5.60 ± 0.39",
    "fuente": "SciELO Brasil",
    "url": "https://www.scielo.br/j/pvb/a/x3mJBNjnFWWyndp9Z7tWNhd/?format=pdf&lang=en"
   }
  ]
 },
 {
  "grupo": "Rapaces",
  "clase": "Aves",
  "esp": "Halcón peregrino",
  "datos": [
   {
    "campo": "Proteínas totales",
    "estado": "estudio",
    "valor": "24-39 g/L = 2.4-3.9 g/dL (P2.5-P97.5), n=79",
    "fuente": "Lumeij 1998 (Avian Pathology)",
    "url": "https://bioweb.supagro.inrae.fr/ESTHER/paper/Lumeij_1998_Avian.Pathol_27_129"
   },
   {
    "campo": "Glucosa",
    "estado": "verificado",
    "valor": "16.5-22.0 mmol/L = 297-396 mg/dL (convertido), n=79",
    "fuente": "Lumeij 1998 (Avian Pathology)",
    "url": "https://bioweb.supagro.inrae.fr/ESTHER/paper/Lumeij_1998_Avian.Pathol_27_129"
   }
  ]
 },
 {
  "grupo": "Rapaces",
  "clase": "Aves",
  "esp": "Búho cornudo",
  "datos": [
   {
    "campo": "Hematocrito",
    "estado": "estudio",
    "valor": "34, 43, 40 % (n=3 cautivos Brasil)",
    "fuente": "Semina Ciências Agrárias (UEL)",
    "url": "https://ojs.uel.br/revistas/uel/index.php/semagrarias/article/download/37114/27788/203303"
   },
   {
    "campo": "Hemoglobina",
    "estado": "estudio",
    "valor": "9.3, 11.7, 13.4 g/dL (n=3)",
    "fuente": "Semina Ciências Agrárias (UEL)",
    "url": "https://ojs.uel.br/revistas/uel/index.php/semagrarias/article/download/37114/27788/203303"
   },
   {
    "campo": "Leucocitos",
    "estado": "estudio",
    "valor": "11, 12, 12 ×10³/µL (n=3)",
    "fuente": "Semina Ciências Agrárias (UEL)",
    "url": "https://ojs.uel.br/revistas/uel/index.php/semagrarias/article/download/37114/27788/203303"
   },
   {
    "campo": "Proteínas totales",
    "estado": "estudio",
    "valor": "4.2, 4.4, 3.4 g/dL (n=3)",
    "fuente": "Semina Ciências Agrárias (UEL)",
    "url": "https://ojs.uel.br/revistas/uel/index.php/semagrarias/article/download/37114/27788/203303"
   }
  ]
 },
 {
  "grupo": "Psitácidos",
  "clase": "Aves",
  "esp": "Guacamaya roja (Ara macao)",
  "datos": [
   {
    "campo": "Hematocrito",
    "estado": "estudio",
    "valor": "39.1 ± 5.27 % (IC95 35.0-43.2), n=7",
    "fuente": "Ciência Animal Brasileira (UFG)",
    "url": "https://revistas.ufg.br/vet/article/download/6230/10949/75610"
   },
   {
    "campo": "Hemoglobina",
    "estado": "estudio",
    "valor": "15.7 ± 3.08 g/dL (IC95 13.3-18.0), n=7",
    "fuente": "Ciência Animal Brasileira (UFG)",
    "url": "https://revistas.ufg.br/vet/article/download/6230/10949/75610"
   },
   {
    "campo": "Leucocitos",
    "estado": "estudio",
    "valor": "5,230 ± 3,010 /µL (IC95 2,900-7,500), n=7",
    "fuente": "Ciência Animal Brasileira (UFG)",
    "url": "https://revistas.ufg.br/vet/article/download/6230/10949/75610"
   },
   {
    "campo": "Proteínas totales",
    "estado": "estudio",
    "valor": "3.32 ± 1.05 g/dL (IC95 2.35-4.29), n=9",
    "fuente": "Ciência Animal Brasileira (UFG)",
    "url": "https://revistas.ufg.br/vet/article/download/6230/10949/75610"
   },
   {
    "campo": "Glucosa",
    "estado": "estudio",
    "valor": "243.7 ± 17.7 mg/dL (IC95 227.3-260.0), n=9",
    "fuente": "Ciência Animal Brasileira (UFG)",
    "url": "https://revistas.ufg.br/vet/article/download/6230/10949/75610"
   }
  ]
 },
 {
  "grupo": "Escamosos",
  "clase": "Reptiles",
  "esp": "Iguana verde (Iguana)",
  "datos": [
   {
    "campo": "Proteínas totales",
    "estado": "estudio",
    "valor": "Sanas (Knotek 1999 citado): 22.0-78.2 g/L = 2.2-7.8 g/dL, media 5.6",
    "fuente": "Acta Veterinaria Brno",
    "url": "https://actavet.vfu.cz/media/pdf/avb_2002071030333.pdf"
   },
   {
    "campo": "Glucosa",
    "estado": "estudio",
    "valor": "Sanas (Knotek 1999 citado): 8.3-16.5 mmol/L = 150-297 mg/dL, media 12.1 (218) (convertido)",
    "fuente": "Acta Veterinaria Brno",
    "url": "https://actavet.vfu.cz/media/pdf/avb_2002071030333.pdf"
   },
   {
    "campo": "Creatinina",
    "estado": "estudio",
    "valor": "Sanas (Knotek 1999 citado): 8.8-66.3 µmol/L = 0.10-0.75 mg/dL, media 0.40 (convertido)",
    "fuente": "Acta Veterinaria Brno",
    "url": "https://actavet.vfu.cz/media/pdf/avb_2002071030333.pdf"
   }
  ]
 },
 {
  "grupo": "Escamosos",
  "clase": "Reptiles",
  "esp": "Boa (Boa constrictor)",
  "datos": [
   {
    "campo": "Hematocrito",
    "estado": "estudio",
    "valor": "Suiza cautivas (n=44): media 26.0 % (IC95 24.5-27.6); adultas 28.6, jovenes 23.9",
    "fuente": "PubMed Central",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC9885740"
   },
   {
    "campo": "Hemoglobina",
    "estado": "estudio",
    "valor": "Adultas 8.66 (IC 8.01-9.26), jovenes 7.31 g/dL; machos 9.1, hembras 7.8",
    "fuente": "PubMed Central",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC9885740"
   },
   {
    "campo": "Leucocitos",
    "estado": "estudio",
    "valor": "Hembras 9.10, machos 7.66 ×10³/µL (IC95 5.7-13.9)",
    "fuente": "PubMed Central",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC9885740"
   },
   {
    "campo": "Proteínas totales",
    "estado": "verificado",
    "valor": "Suiza: 48.5 g/L = 4.85 g/dL (IC 45.6-51.5), n=66; Brasil: 6.22/6.34 g/dL, n=40",
    "fuente": "SciELO Brasil",
    "url": "https://www.scielo.br/j/abmvz/a/GcWNZXbXSGK8mFm5WHVTQfd/?lang=en"
   },
   {
    "campo": "Glucosa",
    "estado": "verificado",
    "valor": "Brasil: 66 ± 6.1 / 61 ± 8.2 mg/dL, n=40; Suiza: ~2.0-2.5 (unidad no explicita, ~mmol/L = 37-45 mg/dL)",
    "fuente": "SciELO Brasil",
    "url": "https://www.scielo.br/j/abmvz/a/GcWNZXbXSGK8mFm5WHVTQfd/?lang=en"
   },
   {
    "campo": "Creatinina",
    "estado": "estudio",
    "valor": "0.15 ± 0.12 (machos) / 0.12 ± 0.09 mg/dL (hembras), n=40",
    "fuente": "SciELO Brasil",
    "url": "https://www.scielo.br/j/abmvz/a/GcWNZXbXSGK8mFm5WHVTQfd/?lang=en"
   }
  ]
 },
 {
  "grupo": "Quelonios",
  "clase": "Reptiles",
  "esp": "Tortuga verde (marina)",
  "datos": [
   {
    "campo": "Hematocrito",
    "estado": "estudio",
    "valor": "Cautivas pre-liberacion: juveniles 31.1 %, subadultas 38.9, adultas 40.7 (intervalo de referencia citado por el estudio: 11.2-37.2 %)",
    "fuente": "PubMed Central",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC12463467"
   },
   {
    "campo": "Hemoglobina",
    "estado": "estudio",
    "valor": "Juveniles 100.4, subadultas 109.1, adultas 110.0 g/L = 10.0-11.0 g/dL (convertido)",
    "fuente": "PubMed Central",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC12463467"
   },
   {
    "campo": "Leucocitos",
    "estado": "estudio",
    "valor": "Juveniles 19.3 ± 1.7, subadultas 12.7 ± 4.7, adultas 7.5 ± 0.7 ×10⁹/L",
    "fuente": "PubMed Central",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC12463467"
   },
   {
    "campo": "Proteínas totales",
    "estado": "estudio",
    "valor": "Cautivas: 32.4 (juv.) a 73.4 g/L (adultas) = 3.2-7.3 g/dL; silvestres Ecuador 5.9-6.7 g/dL",
    "fuente": "PubMed Central",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC12463467"
   },
   {
    "campo": "Glucosa",
    "estado": "estudio",
    "valor": "Cautivas: 6.97/5.15/2.83 mmol/L = 126/93/51 mg/dL (convertido); silvestres Ecuador 69.2-122.6 mg/dL",
    "fuente": "PubMed Central",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC12463467"
   },
   {
    "campo": "Creatinina",
    "estado": "estudio",
    "valor": "Cautivas: 25.2/22.9/13.5 µmol/L = 0.29/0.26/0.15 mg/dL (convertido)",
    "fuente": "PubMed Central",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC12463467"
   }
  ]
 },
 {
  "grupo": "Crocodílidos",
  "clase": "Reptiles",
  "esp": "Cocodrilo de pantano",
  "datos": [
   {
    "campo": "Leucocitos",
    "estado": "estudio",
    "valor": "Silvestres 10.3; cautivos 8.51 ×10³/µL (n=92)",
    "fuente": "PubMed",
    "url": "https://pubmed.ncbi.nlm.nih.gov/21719816/"
   },
   {
    "campo": "Proteínas totales",
    "estado": "estudio",
    "valor": "72.36 ± 3.22 g/L = 7.24 g/dL, n=29 cautivos (Colima)",
    "fuente": "SciELO Brasil",
    "url": "https://scielo.br/j/abmvz/a/QFRwRbq7ZgBc8KwWH9dgSyn/?lang=en"
   },
   {
    "campo": "Glucosa",
    "estado": "estudio",
    "valor": "Colima 3.90 ± 0.47 mmol/L = 70 mg/dL (convertido); Padilla 2011 69.55 (unidad impresa mg/l, dudosa)",
    "fuente": "SciELO Brasil",
    "url": "https://scielo.br/j/abmvz/a/QFRwRbq7ZgBc8KwWH9dgSyn/?lang=en"
   },
   {
    "campo": "Creatinina",
    "estado": "estudio",
    "valor": "Colima 38.03 ± 1.66 µmol/L = 0.43 mg/dL (convertido); Padilla 2011 2.70 (unidad impresa mg/l, dudosa)",
    "fuente": "SciELO Brasil",
    "url": "https://scielo.br/j/abmvz/a/QFRwRbq7ZgBc8KwWH9dgSyn/?lang=en"
   }
  ]
 }
];
  var SIN_DATO = [
 "Lobo mexicano",
 "Tapir centroamericano",
 "Mapache (Procyon)",
 "Loro cabeza amarilla",
 "Guacamaya verde",
 "Pitón real",
 "Tortuga casquito"
];
  return { FECHA_REVISION: FECHA_REVISION, ESPECIES: ESPECIES, SIN_DATO: SIN_DATO };
});
