/* ============================================================ */
/* PROTOCOLOS ANESTÉSICOS Y DE FLUIDOS · con fuente              */
/* Cada cifra es una dosis publicada para una especie concreta   */
/* (no una "dosis general"). Lo que no se pudo verificar en una  */
/* fuente abierta NO aparece. Revisado el 2026-10-12.            */
/* Las concentraciones de los frascos las escribe el usuario:    */
/* aquí no se supone ninguna.                                    */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_PROTOCOLOS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var FECHA_REVISION = '2026-10-12';
  var EPMC = function (q) { return 'https://europepmc.org/search?query=' + encodeURIComponent(q); };

  var F = {
    leonKetMed: { fuente: 'Vet Res Commun 2025 (resumen en Europe PMC)', url: EPMC('(ketamine AND medetomidine) AND (lion OR leopard OR puma OR felid)') },
    bamUngulados: { fuente: 'J Zoo Wildl Med 2021, Lamglait et al. (resumen en Europe PMC)', url: EPMC('(butorphanol AND azaperone AND medetomidine AND naltrexone AND atipamezole)') },
    tkx: { fuente: 'Vet Res Commun 2025 (resumen en Europe PMC)', url: EPMC('("TKX" OR (tiletamine AND zolazepam AND ketamine AND xylazine))') },
    telazolXilacina: { fuente: 'Vet Rec 2025 (resumen en Europe PMC)', url: EPMC('(tiletamine AND zolazepam AND xylazine) AND tiger') },
    umichPrimates: { fuente: 'Univ. de Michigan (ULAM): anestesia y analgesia en primates no humanos', url: 'https://az.research.umich.edu/animalcare/guidelines/guidelines-anesthesia-and-analgesia-non-human-primates' },
    avesMmk: { fuente: 'Estudios en aves (resumen en Europe PMC)', url: EPMC('(midazolam AND medetomidine AND ketamine) AND (bird OR avian OR raptor OR parrot)') },
    merckAves: { fuente: 'Manual Veterinario Merck: aves de compañía', url: 'https://www.merckvetmanual.com/exotic-and-laboratory-animals/pet-birds/management-of-pet-birds' },
    merckReptiles: { fuente: 'Manual Veterinario Merck: procedimientos clínicos en reptiles', url: 'https://www.merckvetmanual.com/exotic-and-laboratory-animals/reptiles/clinical-procedures-for-reptiles' },
    isoAves: { fuente: 'PubMed Central PMC8243694', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8243694/' },
    yohimbinaEtiqueta: { fuente: 'Etiqueta aprobada de yohimbina (21 CFR 522.2670)', url: 'https://www.law.cornell.edu/cfr/text/21/522.2670' },
    flumazenilTz: { fuente: 'Veterinární medicína: flumazenil y tiletamina-zolazepam en perros', url: 'https://vetmed.agriculturejournals.cz/artkey/vet-201812-0004_antagonistic-effect-of-flumazenil-on-tiletamine-zolazepam-induced-anaesthesia-in-beagle-dogs.php' }
  };

  /* min/max en mg/kg (o µg/kg si "unidad" lo dice). via: vía publicada. */
  var PROTOCOLOS = {
    ktm: {
      nombre: 'Ketamina + medetomidina (carnívoros silvestres)',
      resumen: 'Dosis publicadas por especie. No hay una dosis única para "carnívoros": la variación entre especies es grande.',
      variantes: [
        { especie: 'León asiático', componentes: [
          { nombre: 'Ketamina', min: 3, max: 3, via: 'IM', f: F.leonKetMed },
          { nombre: 'Medetomidina', min: 0.05, max: 0.05, via: 'IM', f: F.leonKetMed }] },
        { especie: 'Pecarí', componentes: [
          { nombre: 'Ketamina', min: 3.29, max: 3.29, via: 'IM', f: F.leonKetMed },
          { nombre: 'Medetomidina', min: 0.046, max: 0.046, via: 'IM', f: F.leonKetMed }] },
        { especie: 'Zorro azul', componentes: [
          { nombre: 'Ketamina', min: 2.5, max: 2.5, via: 'IM', f: F.leonKetMed },
          { nombre: 'Medetomidina', min: 0.05, max: 0.05, via: 'IM', f: F.leonKetMed }] }
      ],
      reversion: 'Atipamezol: 5 mg por cada 1 mg de medetomidina administrada.',
      reversionFuente: F.bamUngulados
    },
    bam: {
      nombre: 'BAM: butorfanol + azaperona + medetomidina (ungulados)',
      resumen: 'Dosis publicadas por especie. La premezcla BAM publicada tiene 27.3 mg/ml de butorfanol, 9.1 de azaperona y 10.9 de medetomidina; si usas viales separados, escribe la concentración de cada uno.',
      variantes: [
        { especie: 'Alce oriental', componentes: [
          { nombre: 'Butorfanol', min: 0.26, max: 0.26, via: 'IM', f: F.bamUngulados },
          { nombre: 'Azaperona', min: 0.09, max: 0.09, via: 'IM', f: F.bamUngulados },
          { nombre: 'Medetomidina', min: 0.11, max: 0.11, via: 'IM', f: F.bamUngulados }] },
        { especie: 'Wapití (elk)', componentes: [
          { nombre: 'Butorfanol', min: 0.15, max: 0.15, via: 'IM', f: F.bamUngulados },
          { nombre: 'Azaperona', min: 0.05, max: 0.05, via: 'IM', f: F.bamUngulados },
          { nombre: 'Medetomidina', min: 0.06, max: 0.06, via: 'IM', f: F.bamUngulados }] },
        { especie: 'Caribú', componentes: [
          { nombre: 'Butorfanol', min: 0.51, max: 0.51, via: 'IM', f: F.bamUngulados },
          { nombre: 'Azaperona', min: 0.17, max: 0.17, via: 'IM', f: F.bamUngulados },
          { nombre: 'Medetomidina', min: 0.21, max: 0.21, via: 'IM', f: F.bamUngulados }] }
      ],
      reversion: 'Atipamezol: 5 mg por cada 1 mg de medetomidina. Naltrexona: 1 mg por cada 1 mg de butorfanol (jirafa, elefante) o 3 mg por cada 1 mg (alce).',
      reversionFuente: F.bamUngulados
    },
    tkx: {
      nombre: 'Tiletamina-zolazepam + ketamina + xilacina (TKX) y Telazol + xilacina',
      resumen: 'Dosis publicadas para especies concretas; no se encontró una dosis verificada para felinos grandes ni úrsidos con TKX.',
      variantes: [
        { especie: 'Perro (TKX)', componentes: [
          { nombre: 'Tiletamina', min: 1.6, max: 1.6, via: 'IM', f: F.tkx },
          { nombre: 'Zolazepam', min: 1.6, max: 1.6, via: 'IM', f: F.tkx },
          { nombre: 'Ketamina', min: 2.56, max: 2.56, via: 'IM', f: F.tkx },
          { nombre: 'Xilacina', min: 0.64, max: 0.64, via: 'IM', f: F.tkx }] },
        { especie: 'Cerdo (ketamina + xilacina)', componentes: [
          { nombre: 'Ketamina', min: 2.5, max: 2.5, via: 'IM', f: F.tkx },
          { nombre: 'Xilacina', min: 2.5, max: 2.5, via: 'IM', f: F.tkx }] },
        { especie: 'Tigre (tiletamina-zolazepam + xilacina)', componentes: [
          { nombre: 'Tiletamina-zolazepam (total)', min: 1.5, max: 1.5, via: 'IM', f: F.telazolXilacina },
          { nombre: 'Xilacina', min: 0.5, max: 0.5, via: 'IM', f: F.telazolXilacina }] }
      ],
      reversion: 'La tiletamina no tiene antagonista. El flumazenil revierte parcialmente la zolazepam (0.04 a 0.06 mg/kg en perros). La xilacina se revierte con yohimbina: 0.11 mg/kg IV en perros (etiqueta).',
      reversionFuente: F.flumazenilTz
    },
    primates: {
      nombre: 'Primates no humanos: ketamina + diazepam y ketamina + dexmedetomidina',
      resumen: 'Dosis de la guía de la Universidad de Michigan para primates no humanos. La combinación ketamina + diazepam es anestesia ligera: no permite intubar.',
      variantes: [
        { especie: 'Ketamina + diazepam', componentes: [
          { nombre: 'Ketamina', min: 3, max: 5, via: 'IM', f: F.umichPrimates },
          { nombre: 'Diazepam', min: 0.5, max: 1, via: 'IM', f: F.umichPrimates }] },
        { especie: 'Ketamina + dexmedetomidina', componentes: [
          { nombre: 'Ketamina', min: 5, max: 10, via: 'IM', f: F.umichPrimates },
          { nombre: 'Dexmedetomidina', min: 0.01, max: 0.03, via: 'IM', f: F.umichPrimates }] }
      ],
      reversion: 'Flumazenil 0.02 mg/kg IV (benzodiacepinas). Atipamezol para la dexmedetomidina. Atropina 0.025 a 0.05 mg/kg IM, SC o IV como premedicación.',
      reversionFuente: F.umichPrimates
    },
    aves: {
      nombre: 'Aves: midazolam / medetomidina + ketamina',
      resumen: 'Las dosis de las aves cambian mucho con el tamaño y la especie; estos son los valores publicados en aves pequeñas.',
      variantes: [
        { especie: 'Periquito: medetomidina + ketamina', componentes: [
          { nombre: 'Medetomidina', min: 0.04, max: 0.04, via: 'IM (pectoral)', f: F.avesMmk },
          { nombre: 'Ketamina', min: 30, max: 30, via: 'IM (pectoral)', f: F.avesMmk }] },
        { especie: 'Periquito: midazolam + ketamina', componentes: [
          { nombre: 'Midazolam', min: 1, max: 1, via: 'IM', f: F.avesMmk },
          { nombre: 'Ketamina', min: 50, max: 50, via: 'IM', f: F.avesMmk }] },
        { especie: 'Tinamú (mediana publicada)', componentes: [
          { nombre: 'Medetomidina', min: 0.075, max: 0.075, via: 'IM', f: F.avesMmk },
          { nombre: 'Ketamina', min: 33, max: 33, via: 'IM', f: F.avesMmk }] },
        { especie: 'Aves de compañía: sedación', componentes: [
          { nombre: 'Midazolam', min: 0.5, max: 1, via: 'IM', f: F.merckAves }] }
      ],
      reversion: 'Atipamezol 0.2 mg/kg SC y flumazenil 0.05 mg/kg SC en periquito (J Zoo Wildl Med 2024).',
      reversionFuente: { fuente: 'J Zoo Wildl Med 2024;55(1)', url: 'https://complete.bioone.org/journals/journal-of-zoo-and-wildlife-medicine' }
    },
    reptiles: {
      nombre: 'Reptiles (quelonios): ketamina + dexmedetomidina + hidromorfona',
      resumen: 'Combinación que describe el Manual Merck para quelonios. No se encontró una fuente abierta para serpientes y lagartos con esta combinación.',
      variantes: [
        { especie: 'Quelonios', componentes: [
          { nombre: 'Ketamina', min: 10, max: 25, via: 'IM', f: F.merckReptiles },
          { nombre: 'Dexmedetomidina', min: 0.05, max: 0.1, via: 'IM', f: F.merckReptiles },
          { nombre: 'Hidromorfona', min: 0.5, max: 0.5, via: 'IM', f: F.merckReptiles }] }
      ],
      reversion: 'Atipamezol 0.5 mg/kg IM. Naloxona 0.1 mg/kg IM (opioide).',
      reversionFuente: F.merckReptiles
    }
  };

  /* Anestesia inhalada: porcentajes publicados por grupo (no dependen del peso) */
  var GASES = {
    isoflurano: {
      nombre: 'Isoflurano',
      filas: [
        { grupo: 'Aves', induccion: '3 a 4 %', mantenimiento: '1 a 2.5 %', f: F.isoAves },
        { grupo: 'Reptiles (lagartos y serpientes)', induccion: '1 a 5 %', mantenimiento: 'Misma referencia: 1 a 5 %', f: F.merckReptiles },
        { grupo: 'Primates no humanos', induccion: '3 a 5 %', mantenimiento: '0.5 a 3 %', f: F.umichPrimates }
      ]
    },
    sevoflurano: {
      nombre: 'Sevoflurano',
      filas: [
        { grupo: 'Aves', induccion: 'No se encontró un valor verificado', mantenimiento: '3 a 4 %', f: F.isoAves },
        { grupo: 'Primates no humanos', induccion: '4 a 8 %', mantenimiento: '1.25 a 4 %', f: F.umichPrimates }
      ]
    }
  };

  return { FECHA_REVISION: FECHA_REVISION, PROTOCOLOS: PROTOCOLOS, GASES: GASES };
});
