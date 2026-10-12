/* ============================================================ */
/* CONSTANTES FISIOLÓGICAS Y REPRODUCTIVAS · solo datos con fuente */
/* Cada valor trae su fuente abierta. Casi no existen valores      */
/* basales publicados para fauna silvestre despierta: lo que se    */
/* midió bajo anestesia o restricción química se indica así.       */
/* Lo que no se pudo verificar no aparece. Revisado el 2026-10-12.    */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_CONSTANTES = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var FECHA_REVISION = '2026-10-12';
  var ESPECIES = [
 {
  "grupo": "Felinos",
  "esp": "Jaguar (Panthera onca)",
  "datos": [
   {
    "campo": "Frecuencia cardiaca",
    "valor": "70-140 lpm \"normal bajo restricción química\" (Deem 2004, citado); medias medidas 84-98 lpm en 15 jaguares cautivos; ECG 2026 en silvestres: media 99 lpm (93-122)",
    "nota": "bajo anestesia/restricción química",
    "fuente": "Redalyc",
    "url": "https://www.redalyc.org/journal/4457/445759824019/445759824019.pdf"
   },
   {
    "campo": "Frecuencia respiratoria",
    "valor": "Medias 16.6-23.2 rpm (Tabla 3, 15 jaguares cautivos, 5-180 min post-inyeccion)",
    "nota": "bajo anestesia/restricción química",
    "fuente": "Redalyc",
    "url": "https://www.redalyc.org/journal/4457/445759824019/445759824019.pdf"
   },
   {
    "campo": "Temperatura",
    "valor": "Media 38.06 °C a 5 min, descendiendo a 36.8 °C a 180 min",
    "nota": "bajo anestesia/restricción química",
    "fuente": "Redalyc",
    "url": "https://www.redalyc.org/journal/4457/445759824019/445759824019.pdf"
   },
   {
    "campo": "Gestación o incubación",
    "valor": "91-111 días",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Panthera_onca/"
   },
   {
    "campo": "Longevidad",
    "valor": "silvestre 11-12 años; cautiverio promedio 20 (máximo 28)",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Panthera_onca/"
   }
  ]
 },
 {
  "grupo": "Felinos",
  "esp": "Puma (Puma concolor)",
  "datos": [
   {
    "campo": "Frecuencia cardiaca",
    "valor": "Valores fisiológicos de referencia 70-140 lpm; medias medidas 83-98 lpm en 14 pumas",
    "nota": "bajo anestesia/restricción química",
    "fuente": "Embrapa",
    "url": "https://ainfo.cnptia.embrapa.br/digital/bitstream/item/141900/1/Evaluation-of-cardiopulmonary.pdf"
   },
   {
    "campo": "Frecuencia respiratoria",
    "valor": "Referencia 8-24 rpm; medias medidas 10-16 rpm",
    "nota": "bajo anestesia/restricción química",
    "fuente": "Embrapa",
    "url": "https://ainfo.cnptia.embrapa.br/digital/bitstream/item/141900/1/Evaluation-of-cardiopulmonary.pdf"
   },
   {
    "campo": "Temperatura",
    "valor": "Referencia 37.0-39.5 °C; medias medidas 37.8-38.8 °C",
    "nota": "bajo anestesia/restricción química",
    "fuente": "Embrapa",
    "url": "https://ainfo.cnptia.embrapa.br/digital/bitstream/item/141900/1/Evaluation-of-cardiopulmonary.pdf"
   },
   {
    "campo": "Gestación o incubación",
    "valor": "tabla de datos 84-106 días (promedio 92.3); texto 82-96",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Puma_concolor/"
   },
   {
    "campo": "Longevidad",
    "valor": "silvestre 18-20 años (tabla de datos); cautiverio promedio 20",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Puma_concolor/"
   }
  ]
 },
 {
  "grupo": "Felinos",
  "esp": "Ocelote (Leopardus pardalis)",
  "datos": [
   {
    "campo": "Gestación o incubación",
    "valor": "79-85 días",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Leopardus_pardalis/"
   },
   {
    "campo": "Longevidad",
    "valor": "silvestre 7-10 años; cautiverio promedio 20.3 (máximo 21.5)",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Leopardus_pardalis/"
   }
  ]
 },
 {
  "grupo": "Felinos",
  "esp": "Jaguarundi (Herpailurus yagouaroundi)",
  "datos": [
   {
    "campo": "Gestación o incubación",
    "valor": "63-75 días",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Puma_yagouaroundi/"
   }
  ]
 },
 {
  "grupo": "Felinos",
  "esp": "Margay (Leopardus wiedii)",
  "datos": [
   {
    "campo": "Gestación o incubación",
    "valor": "76-84 días (promedio 81)",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Leopardus_wiedii/"
   }
  ]
 },
 {
  "grupo": "Felinos",
  "esp": "Lince (Lynx rufus)",
  "datos": [
   {
    "campo": "Temperatura",
    "valor": "mediana 38.3 °C (KX) y 38.4 °C (KMB)",
    "nota": "bajo anestesia/restricción química",
    "fuente": "Europe PMC",
    "url": "https://europepmc.org/article/MED/22204051"
   },
   {
    "campo": "Gestación o incubación",
    "valor": "60-70 días (texto); la tabla de datos dice 50-70",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Lynx_rufus/"
   }
  ]
 },
 {
  "grupo": "Felinos",
  "esp": "Gato doméstico",
  "datos": [
   {
    "campo": "Frecuencia cardiaca",
    "valor": "120-140 lpm (gato)",
    "nota": null,
    "fuente": "Manual Veterinario Merck",
    "url": "https://www.merckvetmanual.com/reference-values-and-conversion-tables/reference-guides/resting-heart-rates"
   },
   {
    "campo": "Frecuencia respiratoria",
    "valor": "16-40 rpm (gato)",
    "nota": null,
    "fuente": "Manual Veterinario Merck",
    "url": "https://merckvetmanual.com/special-subjects/reference-guides/resting-respiratory-rates?redirectid=458"
   },
   {
    "campo": "Temperatura",
    "valor": "37.8-39.5 °C (gato adulto)",
    "nota": null,
    "fuente": "ZukuReview",
    "url": "https://zukureview.com/sites/default/files/Ref_values_Sm_An.html"
   },
   {
    "campo": "Gestación o incubación",
    "valor": "60-67 días",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Felis_catus/"
   },
   {
    "campo": "Longevidad",
    "valor": "~14 años (esperanza en cautiverio/domestico)",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Felis_catus/"
   }
  ]
 },
 {
  "grupo": "Cánidos",
  "esp": "Coyote (Canis latrans)",
  "datos": [
   {
    "campo": "Gestación o incubación",
    "valor": "60-63 días",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Canis_latrans/"
   },
   {
    "campo": "Longevidad",
    "valor": "silvestre máximo 10 años; cautiverio máximo 18 (promedios 15-21.8)",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Canis_latrans/"
   }
  ]
 },
 {
  "grupo": "Cánidos",
  "esp": "Lobo mexicano (Canis lupus baileyi)",
  "datos": []
 },
 {
  "grupo": "Cánidos",
  "esp": "Zorra gris (Urocyon cinereoargenteus)",
  "datos": [
   {
    "campo": "Gestación o incubación",
    "valor": "53-63 días (promedio 59)",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Urocyon_cinereoargenteus/"
   },
   {
    "campo": "Longevidad",
    "valor": "6-8 años típico (silvestre y cautiverio); rango 6-10 (silvestre), 6-12 (cautiverio)",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Urocyon_cinereoargenteus/"
   }
  ]
 },
 {
  "grupo": "Cánidos",
  "esp": "Zorro kit (Vulpes macrotis)",
  "datos": [
   {
    "campo": "Gestación o incubación",
    "valor": "49-55 días",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Vulpes_macrotis/"
   }
  ]
 },
 {
  "grupo": "Cánidos",
  "esp": "Perro doméstico",
  "datos": [
   {
    "campo": "Frecuencia cardiaca",
    "valor": "70-120 lpm (perros pequenos más rapidos)",
    "nota": null,
    "fuente": "Manual Veterinario Merck",
    "url": "https://www.merckvetmanual.com/multimedia/table/normal-physiological-values-for-dogs"
   },
   {
    "campo": "Frecuencia respiratoria",
    "valor": "18-34 rpm en reposo",
    "nota": null,
    "fuente": "Manual Veterinario Merck",
    "url": "https://www.merckvetmanual.com/multimedia/table/normal-physiological-values-for-dogs"
   },
   {
    "campo": "Temperatura",
    "valor": "38.3-39.2 °C (101-102.5 F) promedio",
    "nota": null,
    "fuente": "Manual Veterinario Merck",
    "url": "https://www.merckvetmanual.com/multimedia/table/normal-physiological-values-for-dogs"
   },
   {
    "campo": "Gestación o incubación",
    "valor": "promedio 63 días (\"9 semanas\")",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Canis_lupus_familiaris/"
   },
   {
    "campo": "Longevidad",
    "valor": "8-16 años (segun raza)",
    "nota": null,
    "fuente": "Manual Veterinario Merck",
    "url": "https://www.merckvetmanual.com/multimedia/table/normal-physiological-values-for-dogs"
   }
  ]
 },
 {
  "grupo": "Primates",
  "esp": "Mono araña (Ateles geoffroyi)",
  "datos": [
   {
    "campo": "Frecuencia cardiaca",
    "valor": "150-210 lpm (\"Spider monkey\")",
    "nota": null,
    "fuente": "Manual Veterinario Merck",
    "url": "https://www.merckvetmanual.com/multimedia/table/normal-vital-parameter-reference-ranges-for-nonhuman-primates"
   },
   {
    "campo": "Frecuencia respiratoria",
    "valor": "18-35 rpm",
    "nota": null,
    "fuente": "Manual Veterinario Merck",
    "url": "https://www.merckvetmanual.com/multimedia/table/normal-vital-parameter-reference-ranges-for-nonhuman-primates"
   },
   {
    "campo": "Temperatura",
    "valor": "36.0-39.0 °C",
    "nota": null,
    "fuente": "Manual Veterinario Merck",
    "url": "https://www.merckvetmanual.com/multimedia/table/normal-vital-parameter-reference-ranges-for-nonhuman-primates"
   },
   {
    "campo": "Gestación o incubación",
    "valor": "226-232 días",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Ateles_geoffroyi/"
   },
   {
    "campo": "Longevidad",
    "valor": "cautiverio: promedio 47.1 (AnAge) frente a \"máximo registrado 33 años\" (inconsistente en Animal Diversity Web); silvestre no indicado",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Ateles_geoffroyi/"
   }
  ]
 },
 {
  "grupo": "Primates",
  "esp": "Mono aullador (Alouatta palliata)",
  "datos": [
   {
    "campo": "Gestación o incubación",
    "valor": "promedio 186 días (~6 meses)",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Alouatta_palliata/"
   }
  ]
 },
 {
  "grupo": "Primates",
  "esp": "Mono aullador negro (Alouatta pigra)",
  "datos": [
   {
    "campo": "Gestación o incubación",
    "valor": "~180 días",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Alouatta_pigra/"
   },
   {
    "campo": "Longevidad",
    "valor": "promedio 20 años (silvestre)",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Alouatta_pigra/"
   }
  ]
 },
 {
  "grupo": "Primates",
  "esp": "Mono capuchino (Cebus capucinus)",
  "datos": [
   {
    "campo": "Frecuencia cardiaca",
    "valor": "165-225 lpm (\"Capuchin monkey\")",
    "nota": null,
    "fuente": "Manual Veterinario Merck",
    "url": "https://www.merckvetmanual.com/multimedia/table/normal-vital-parameter-reference-ranges-for-nonhuman-primates"
   },
   {
    "campo": "Frecuencia respiratoria",
    "valor": "30-50 rpm",
    "nota": null,
    "fuente": "Manual Veterinario Merck",
    "url": "https://www.merckvetmanual.com/multimedia/table/normal-vital-parameter-reference-ranges-for-nonhuman-primates"
   },
   {
    "campo": "Temperatura",
    "valor": "36.7-38.5 °C",
    "nota": null,
    "fuente": "Manual Veterinario Merck",
    "url": "https://www.merckvetmanual.com/multimedia/table/normal-vital-parameter-reference-ranges-for-nonhuman-primates"
   },
   {
    "campo": "Gestación o incubación",
    "valor": "157-167 días (promedio 160)",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Cebus_capucinus/"
   },
   {
    "campo": "Longevidad",
    "valor": "silvestre ~30 años típico; cautiverio ~45 (máximo 55)",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Cebus_capucinus/"
   }
  ]
 },
 {
  "grupo": "Mustélidos",
  "esp": "Nutria de río (Lontra longicaudis)",
  "datos": [
   {
    "campo": "Gestación o incubación",
    "valor": "56 días (57 AnAge)",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Lontra_longicaudis/"
   }
  ]
 },
 {
  "grupo": "Mustélidos",
  "esp": "Tejón (Taxidea taxus)",
  "datos": []
 },
 {
  "grupo": "Procyónidos",
  "esp": "Mapache (Procyon lotor)",
  "datos": [
   {
    "campo": "Frecuencia cardiaca",
    "valor": "Media 92 ± 7.6 lpm (10 mapaches silvestres, ketamina-xilacina)",
    "nota": "bajo anestesia/restricción química",
    "fuente": "RCIN",
    "url": "https://www.rcin.org.pl/Content/12365/PDF/BI002_26822_Cz-40-2_Acta-T40-nr29-327-330_o.pdf"
   },
   {
    "campo": "Frecuencia respiratoria",
    "valor": "Media 23 ± 4.0 rpm",
    "nota": "bajo anestesia/restricción química",
    "fuente": "RCIN",
    "url": "https://www.rcin.org.pl/Content/12365/PDF/BI002_26822_Cz-40-2_Acta-T40-nr29-327-330_o.pdf"
   },
   {
    "campo": "Gestación o incubación",
    "valor": "63-65 días",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Procyon_lotor/"
   },
   {
    "campo": "Longevidad",
    "valor": "silvestre hasta 16 (promedio ~5; la mayoria no pasa el 2.o ano); cautiverio 21",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Procyon_lotor/"
   }
  ]
 },
 {
  "grupo": "Procyónidos",
  "esp": "Coatí (Nasua narica)",
  "datos": [
   {
    "campo": "Gestación o incubación",
    "valor": "77 días (texto); 78 (AnAge) ",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Nasua_narica/"
   },
   {
    "campo": "Longevidad",
    "valor": "silvestre hasta 14 años (máximo); cautiverio no indicado",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Nasua_narica/"
   }
  ]
 },
 {
  "grupo": "Procyónidos",
  "esp": "Cacomixtle (Bassariscus astutus)",
  "datos": [
   {
    "campo": "Gestación o incubación",
    "valor": "51-54 días",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Bassariscus_astutus/"
   },
   {
    "campo": "Longevidad",
    "valor": "~7 años en silvestre (texto); tabla de datos contradice con 16",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Bassariscus_astutus/"
   }
  ]
 },
 {
  "grupo": "Ungulados",
  "esp": "Venado cola blanca (Odocoileus virginianus)",
  "datos": [
   {
    "campo": "Gestación o incubación",
    "valor": "promedio ~198 días (6.5 meses)",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Odocoileus_virginianus/"
   },
   {
    "campo": "Longevidad",
    "valor": "silvestre típico 10 años (promedio 2; máximo 20, \"pocos pasan de 10\"); cautiverio 16-23",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Odocoileus_virginianus/"
   }
  ]
 },
 {
  "grupo": "Ungulados",
  "esp": "Venado bura (Odocoileus hemionus)",
  "datos": [
   {
    "campo": "Gestación o incubación",
    "valor": "204-207 días",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Odocoileus_hemionus/"
   }
  ]
 },
 {
  "grupo": "Ungulados",
  "esp": "Pecarí de collar (Dicotyles tajacu)",
  "datos": [
   {
    "campo": "Frecuencia cardiaca",
    "valor": "124.6-133.9 lpm tras anestesia disociativa (21 pecaríes)",
    "nota": "bajo anestesia/restricción química",
    "fuente": "Revista UFG",
    "url": "https://revistas.ufg.br/vet/article/view/1462"
   },
   {
    "campo": "Frecuencia respiratoria",
    "valor": "57-95 rpm tras anestesia",
    "nota": "bajo anestesia/restricción química",
    "fuente": "Revista UFG",
    "url": "https://revistas.ufg.br/vet/article/view/1462"
   },
   {
    "campo": "Temperatura",
    "valor": "39.1-39.8 °C tras anestesia",
    "nota": "bajo anestesia/restricción química",
    "fuente": "Revista UFG",
    "url": "https://revistas.ufg.br/vet/article/view/1462"
   },
   {
    "campo": "Gestación o incubación",
    "valor": "142-151 días (campo resumen 142-148)",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Pecari_tajacu/"
   },
   {
    "campo": "Longevidad",
    "valor": "silvestre ~7 años (hasta 15); cautiverio hasta 31",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Pecari_tajacu/"
   }
  ]
 },
 {
  "grupo": "Ungulados",
  "esp": "Tapir centroamericano (Tapirus bairdii)",
  "datos": [
   {
    "campo": "Gestación o incubación",
    "valor": "390-400 días",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Tapirus_bairdii/"
   }
  ]
 },
 {
  "grupo": "Ungulados",
  "esp": "Berrendo (Antilocapra americana)",
  "datos": [
   {
    "campo": "Gestación o incubación",
    "valor": "~252 días (promedio AnAge 235)",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Antilocapra_americana/"
   },
   {
    "campo": "Longevidad",
    "valor": "silvestre: rara vez >9 años, promedio 10; max 16. cautiverio: 11-12 años",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Antilocapra_americana/"
   }
  ]
 },
 {
  "grupo": "Ungulados",
  "esp": "Borrego cimarrón (Ovis canadensis)",
  "datos": [
   {
    "campo": "Gestación o incubación",
    "valor": "150-180 días (5-6 meses)",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Ovis_canadensis/"
   },
   {
    "campo": "Longevidad",
    "valor": "silvestre típico 6-15 años, max 19",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Ovis_canadensis/"
   }
  ]
 },
 {
  "grupo": "Roedores",
  "esp": "Perrito de la pradera (Cynomys mexicanus)",
  "datos": [
   {
    "campo": "Gestación o incubación",
    "valor": "30 días",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Cynomys_mexicanus/"
   }
  ]
 },
 {
  "grupo": "Roedores",
  "esp": "Teporingo (Romerolagus diazi)",
  "datos": [
   {
    "campo": "Gestación o incubación",
    "valor": "38-40 días (texto); campos de datos 38-42, promedio 39",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Romerolagus_diazi/"
   }
  ]
 },
 {
  "grupo": "Aves · Rapaces",
  "esp": "Águila real (Aquila chrysaetos)",
  "datos": [
   {
    "campo": "Gestación o incubación",
    "valor": "35-45 días (promedio 42)",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Aquila_chrysaetos/"
   },
   {
    "campo": "Longevidad",
    "valor": "silvestre: hasta 32 años (promedio ~28; max 48 en tabla Animal Diversity Web); cautiverio: 46 años",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Aquila_chrysaetos/"
   }
  ]
 },
 {
  "grupo": "Aves · Rapaces",
  "esp": "Águila arpía (Harpia harpyja)",
  "datos": [
   {
    "campo": "Gestación o incubación",
    "valor": "56 días (promedio)",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Harpia_harpyja/"
   },
   {
    "campo": "Longevidad",
    "valor": "25-35 años (estimado si se mantiene sana)",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Harpia_harpyja/"
   }
  ]
 },
 {
  "grupo": "Aves · Rapaces",
  "esp": "Halcón peregrino (Falco peregrinus)",
  "datos": [
   {
    "campo": "Frecuencia cardiaca",
    "valor": "Media 268 lpm (10 aves F. p. brookei, sin anestesia, ECG)",
    "nota": null,
    "fuente": "Europe PMC",
    "url": "https://europepmc.org/article/MED/15283429"
   },
   {
    "campo": "Gestación o incubación",
    "valor": "33-35 días (Animal Diversity Web; Birds of the World 33-35; cautivos ~33.5)",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Falco_peregrinus/"
   },
   {
    "campo": "Longevidad",
    "valor": "silvestre: media 13, max 16-20; cautiverio: max 25",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Falco_peregrinus/"
   }
  ]
 },
 {
  "grupo": "Aves · Rapaces",
  "esp": "Búho cornudo (Bubo virginianus)",
  "datos": [
   {
    "campo": "Frecuencia respiratoria",
    "valor": "Media en reposo 19.1 rpm (n=4, aves lisiadas no liberables)",
    "nota": null,
    "fuente": "OEHHA",
    "url": "https://ecotox.oehha.ca.gov/citation/factors-influencing-respiratory-rates-four-species-raptors"
   },
   {
    "campo": "Gestación o incubación",
    "valor": "30-37 días (eclosion)",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Bubo_virginianus/"
   },
   {
    "campo": "Longevidad",
    "valor": "silvestre: promedio 13, record 28; cautiverio: promedio 20, record 35",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Bubo_virginianus/"
   }
  ]
 },
 {
  "grupo": "Aves · Rapaces",
  "esp": "Tecolote llanero (Athene cunicularia)",
  "datos": [
   {
    "campo": "Gestación o incubación",
    "valor": "28-30 días (eclosion)",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Athene_cunicularia/"
   },
   {
    "campo": "Longevidad",
    "valor": "silvestre 6-8 años (max 11); cautiverio hasta 10",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Athene_cunicularia/"
   }
  ]
 },
 {
  "grupo": "Aves · Psitácidos",
  "esp": "Guacamaya roja (Ara macao)",
  "datos": [
   {
    "campo": "Temperatura",
    "valor": "39-41 °C (psitácidos en general)",
    "nota": null,
    "fuente": "Manual Veterinario Merck",
    "url": "https://www.merckvetmanual.com/exotic-and-laboratory-animals/pet-birds/management-of-pet-birds"
   },
   {
    "campo": "Gestación o incubación",
    "valor": "24-25 días (Animal Diversity Web)",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Ara_macao/"
   },
   {
    "campo": "Longevidad",
    "valor": "típico 40-50 años; cautiverio promedio 64 (Max Planck), hasta 75",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Ara_macao/"
   }
  ]
 },
 {
  "grupo": "Aves · Psitácidos",
  "esp": "Guacamaya verde (Ara militaris)",
  "datos": [
   {
    "campo": "Temperatura",
    "valor": "39-41 °C (psitácidos en general)",
    "nota": null,
    "fuente": "Manual Veterinario Merck",
    "url": "https://www.merckvetmanual.com/exotic-and-laboratory-animals/pet-birds/management-of-pet-birds"
   },
   {
    "campo": "Gestación o incubación",
    "valor": "~26 días",
    "nota": null,
    "fuente": "SeaWorld",
    "url": "https://seaworld.org/animals/facts/birds/mexican-military-macaw/"
   },
   {
    "campo": "Longevidad",
    "valor": "50-60 años (sin separar silvestre/cautiverio); Wikipedia: ~50-60 silvestre",
    "nota": null,
    "fuente": "SeaWorld",
    "url": "https://seaworld.org/animals/facts/birds/mexican-military-macaw/"
   }
  ]
 },
 {
  "grupo": "Aves · Psitácidos",
  "esp": "Loro cabeza amarilla (Amazona oratrix)",
  "datos": [
   {
    "campo": "Temperatura",
    "valor": "39-41 °C (psitácidos en general)",
    "nota": null,
    "fuente": "Manual Veterinario Merck",
    "url": "https://www.merckvetmanual.com/exotic-and-laboratory-animals/pet-birds/management-of-pet-birds"
   },
   {
    "campo": "Gestación o incubación",
    "valor": "~26 días",
    "nota": null,
    "fuente": "EDDMapS",
    "url": "https://www.eddmaps.org/species/subject.cfm?sub=22761"
   }
  ]
 },
 {
  "grupo": "Aves · Psitácidos",
  "esp": "Loro tamaulipeco (Amazona viridigenalis)",
  "datos": [
   {
    "campo": "Temperatura",
    "valor": "39-41 °C (psitácidos en general)",
    "nota": null,
    "fuente": "Manual Veterinario Merck",
    "url": "https://www.merckvetmanual.com/exotic-and-laboratory-animals/pet-birds/management-of-pet-birds"
   },
   {
    "campo": "Gestación o incubación",
    "valor": "~28 días",
    "nota": null,
    "fuente": "Wikipedia",
    "url": "https://en.wikipedia.org/wiki/Red-crowned_amazon"
   },
   {
    "campo": "Longevidad",
    "valor": "50+ años en cautiverio, algunos >70; sin dato silvestre en la página",
    "nota": null,
    "fuente": "Wikipedia",
    "url": "https://en.wikipedia.org/wiki/Red-crowned_amazon"
   }
  ]
 },
 {
  "grupo": "Aves · Galliformes",
  "esp": "Pavón cornudo (Oreophasis derbianus)",
  "datos": [
   {
    "campo": "Gestación o incubación",
    "valor": "34-36 días",
    "nota": null,
    "fuente": "Wikipedia",
    "url": "https://en.wikipedia.org/wiki/Horned_guan"
   }
  ]
 },
 {
  "grupo": "Aves · Galliformes",
  "esp": "Gallina de monte (Crax rubra)",
  "datos": [
   {
    "campo": "Gestación o incubación",
    "valor": "32 días",
    "nota": null,
    "fuente": "Badoca Safari Park",
    "url": "https://badoca.com/en/animals/great-curassow/"
   },
   {
    "campo": "Longevidad",
    "valor": "22-24 años / hasta 24 años en cautiverio",
    "nota": null,
    "fuente": "Zoo de Dublín",
    "url": "https://www.dublinzoo.ie/?p=51349"
   }
  ]
 },
 {
  "grupo": "Reptiles · Escamosos",
  "esp": "Iguana verde (Iguana iguana)",
  "datos": [
   {
    "campo": "Frecuencia cardiaca",
    "valor": "52 ± 8 lpm en reposo (15 juveniles conscientes)",
    "nota": null,
    "fuente": "Europe PMC",
    "url": "https://europepmc.org/article/MED/22023131"
   },
   {
    "campo": "Frecuencia respiratoria",
    "valor": "28 ± 6 rpm en reposo",
    "nota": null,
    "fuente": "Europe PMC",
    "url": "https://europepmc.org/article/MED/22023131"
   },
   {
    "campo": "Temperatura",
    "valor": "zona térmica óptima (POTZ) 29-33 °C (84-91 °F)",
    "nota": null,
    "fuente": "Manual Veterinario Merck",
    "url": "https://www.merckvetmanual.com/multimedia/table/important-husbandry-requirements-for-selected-reptiles"
   },
   {
    "campo": "Gestación o incubación",
    "valor": "90-120 días (Animal Diversity Web); 10-15 semanas = 70-105 días (Wikipedia)",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Iguana_iguana/"
   },
   {
    "campo": "Longevidad",
    "valor": "cautiverio: promedio 10 (hembras 12.4), >20; silvestre ~8",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Iguana_iguana/"
   }
  ]
 },
 {
  "grupo": "Reptiles · Escamosos",
  "esp": "Iguana espinosa (Ctenosaura)",
  "datos": [
   {
    "campo": "Gestación o incubación",
    "valor": "3-4 meses (~90-120 días), Ctenosaura similis",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Ctenosaura_similis/"
   }
  ]
 },
 {
  "grupo": "Reptiles · Escamosos",
  "esp": "Boa (Boa constrictor)",
  "datos": [
   {
    "campo": "Temperatura",
    "valor": "zona térmica óptima (POTZ) 28-31 °C (82-88 °F)",
    "nota": null,
    "fuente": "Manual Veterinario Merck",
    "url": "https://www.merckvetmanual.com/multimedia/table/important-husbandry-requirements-for-selected-reptiles"
   },
   {
    "campo": "Gestación o incubación",
    "valor": "Animal Diversity Web 5-8 meses (150-240 días); Wikipedia ~100-120 días desde la muda post-ovulación",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Boa_constrictor/"
   },
   {
    "campo": "Longevidad",
    "valor": "silvestre ~20 (hasta 30); cautiverio 25-35 (hasta 40); Wikipedia cautiverio 20-30",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Boa_constrictor/"
   }
  ]
 },
 {
  "grupo": "Reptiles · Escamosos",
  "esp": "Pitón real (Python regius)",
  "datos": [
   {
    "campo": "Frecuencia cardiaca",
    "valor": "mediana 60 lpm (rango 48-88)",
    "nota": null,
    "fuente": "Europe PMC",
    "url": "https://europepmc.org/article/MED/39230331"
   },
   {
    "campo": "Temperatura",
    "valor": "zona térmica óptima (POTZ) 25-30 °C (77-86 °F)",
    "nota": null,
    "fuente": "Manual Veterinario Merck",
    "url": "https://www.merckvetmanual.com/multimedia/table/important-husbandry-requirements-for-selected-reptiles"
   },
   {
    "campo": "Gestación o incubación",
    "valor": "55-60 días (Wikipedia); Animal Diversity Web 44-54 días (~2 meses)",
    "nota": null,
    "fuente": "Wikipedia",
    "url": "https://en.wikipedia.org/wiki/Ball_python"
   },
   {
    "campo": "Longevidad",
    "valor": "cautiverio promedio 20 (max 28-50); silvestre ~10; Wikipedia 15-30 con buen cuidado",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Python_regius/"
   }
  ]
 },
 {
  "grupo": "Reptiles · Escamosos",
  "esp": "Serpiente cascabel (Crotalus)",
  "datos": [
   {
    "campo": "Longevidad",
    "valor": "C. atrox: promedio 22.0 (hembras 25.8) años en cautiverio",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Crotalus_atrox/"
   }
  ]
 },
 {
  "grupo": "Reptiles · Quelonios",
  "esp": "Tortuga casquito (Kinosternon)",
  "datos": [
   {
    "campo": "Gestación o incubación",
    "valor": "2-3 meses (60-90 días), K. flavescens",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Kinosternon_flavescens/"
   },
   {
    "campo": "Longevidad",
    "valor": "K. flavescens: ~15 años silvestre, ~10 cautiverio",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Kinosternon_flavescens/"
   }
  ]
 },
 {
  "grupo": "Reptiles · Quelonios",
  "esp": "Tortuga verde (Chelonia mydas)",
  "datos": [
   {
    "campo": "Frecuencia cardiaca",
    "valor": "Reposo 8.6 ± 2.9 lpm; en movimiento 12.2 ± 4.7 lpm",
    "nota": null,
    "fuente": "Europe PMC",
    "url": "https://europepmc.org/article/MED/39877661"
   },
   {
    "campo": "Gestación o incubación",
    "valor": "45-75 días (tambien menciona 30-90 segun estacion)",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Chelonia_mydas/"
   },
   {
    "campo": "Longevidad",
    "valor": "máximo 75 años (AnAge) ; sin registros de longevidad",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Chelonia_mydas/"
   }
  ]
 },
 {
  "grupo": "Reptiles · Quelonios",
  "esp": "Tortuga carey (Eretmochelys)",
  "datos": [
   {
    "campo": "Gestación o incubación",
    "valor": "~60 días",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Eretmochelys_imbricata/"
   },
   {
    "campo": "Longevidad",
    "valor": "30-50 años (estimado); cautiverio 20+",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Eretmochelys_imbricata/"
   }
  ]
 },
 {
  "grupo": "Reptiles · Crocodílidos",
  "esp": "Cocodrilo de pantano (C. moreletii)",
  "datos": [
   {
    "campo": "Gestación o incubación",
    "valor": "2-3 meses (Animal Diversity Web); ~80 días (Wikipedia)",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Crocodylus_moreletii/"
   },
   {
    "campo": "Longevidad",
    "valor": "silvestre 50-65 (promedio 60); cautiverio 55-70 (promedio 65), hasta 80",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Crocodylus_moreletii/"
   }
  ]
 },
 {
  "grupo": "Reptiles · Crocodílidos",
  "esp": "Cocodrilo de río (C. acutus)",
  "datos": [
   {
    "campo": "Gestación o incubación",
    "valor": "Animal Diversity Web: 9-10 semanas (63-70 días); Wikipedia: 75-80 días",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Crocodylus_acutus/"
   },
   {
    "campo": "Longevidad",
    "valor": "Esperanza de vida 60-70 años; potencial hasta 100; cautiverio promedio 45",
    "nota": null,
    "fuente": "Animal Diversity Web",
    "url": "https://animaldiversity.org/accounts/Crocodylus_acutus/"
   }
  ]
 }
];
  return { FECHA_REVISION: FECHA_REVISION, ESPECIES: ESPECIES };
});
