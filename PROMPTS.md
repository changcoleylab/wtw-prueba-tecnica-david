# Optimización de prompt — Parte 2

Objetivo del enunciado: mejorar la **precisión** y la **relevancia** del resumen, con claridad, concisión y control sobre la salida.

Metodología: **COSTAR** (Context, Objective, Style, Tone, Audience, Response). Cada letra cierra un hueco del prompt original.

---

## 1. Prompt original

```text
Resume el siguiente texto: [En caso de revocación de la póliza o modificaciones de cualquiera de las condiciones
generales o particulares del seguro por parte de la Aseguradora, Tomador o Asegurado, Seguros Sura se
compromete a dar a viso a BANCO, por escrito y con una antelación no menor a 30 días a la fecha en que surtirá
efecto el hecho. No obstante, lo estipulado en las condiciones generales y particulares de esta póliza, el asegurado
o beneficiario debe dar noticia de la ocurrencia del siniestro a Seguros Sura dentro de los (30) días calendario
siguiente a la fecha en que lo haya conocido. Así mismo, Seguros Sura avisará a BANCO dentro de los diez (10)
días hábiles. En caso de terminación automática por mora del pago de la prima, se le informará por escrito al
beneficiario oneroso con máximo de 30 días de antelación, garantizando la cobertura durante dicho periodo. Por
otro lado, informamos que el seguro referido cuenta con las siguientes características y condiciones:
1. Tienen un valor asegurado de $98.500.000 en caso de fallecimiento.
2.Cubre desde el primer momento, la muerte del asegurado por cualquier causa, incluso en
casos de homicidio, suicidio, terrorismo, embriaguez, secuestro, atraco, presunción de muerte por
desaparecimiento declarado judicialmente, epidemia, pandemia o SIDA siempre y cuando no haya sido
adquirido antes de contratar el seguro.
3.Cubre desde inicio de vigencia incapacidad total y permanente por enfermedad o accidente, también cubre
intento de suicidio y homicidio, terrorismo, embriaguez y atraco; es decir, si el asegurado en cualquiera de los
eventos mencionados pierde de forma permanente el 50% o más de su capacidad laboral, o sufre alguna de las
pérdidas, desmembraciones o inutilizaciones mencionadas en el clausulado del seguro contratado.
4.La vigencia de este seguro comienza a partir de la hora 24:00 del día que aparece en la carátula como día de
expedición de la póliza.
5.La edad máxima de permanencia para el amparo de Vida se encuentra estipulada en el clausulado del seguro
contratado.
6.Puede ser cedido en caso de una titularización de cartera y dicha cesión debe ser notificada.
7.La forma de pago estipulada para la póliza es anual por COBRO BANCARIO.
8. Las exclusiones generales de esta póliza se encuentran en el clausulado del seguro contratado; las
exclusiones particulares que tenga esta póliza se encuentran en la caratula de la misma.
9.Teniendo en cuenta la circular Externa 028 de 2019 emitida por la Superintendencia Financiera, la entidad
financiera puede ser la pagadora de la prima del seguro de sus consumidores financieros para evitar su
terminación automática]. Devuelve solo un resumen corto y preciso.
```

### Qué falla

| Problema | Efecto típico del modelo |
|----------|--------------------------|
| Tarea y póliza en el mismo bloque | Resume a medias o mezcla la consigna con el texto |
| “Corto y preciso” sin techo ni formato | Párrafo vago **o** un ensayo |
| No dice para quién | Omite avisos a BANCO (lo operativo) y se queda en coberturas |
| No distingue calendario vs hábiles | Funde 30 días, 10 hábiles y los 30 de mora |
| No prohíbe inventar | Completa el clausulado, la carátula o la edad máxima |
| No separa avisos / coberturas / operación | Pierde Circular 028, cobro bancario, cesión, hora 24:00 |
| Erratas en la fuente (“dar a viso”) | “Corrige” el resto o alucina alrededor del error |

---

## 2. Prompt mejorado (COSTAR)

Listo para pegar en un modelo. La fuente va **solo** entre `<fuente>` y `</fuente>`.

```text
# Context
Eres un analista de seguros. Debes extraer un resumen fiel de una comunicación de póliza de vida
(Seguros Sura) en la que BANCO es beneficiario oneroso. El texto fuente puede tener erratas.
No eres asesor comercial ni abogado que complete el clausulado.

# Objective
Resumir ÚNICAMENTE el contenido entre <fuente> y </fuente>.
Conservar todos los plazos, montos, porcentajes, normas y actores
(Aseguradora, Tomador, Asegurado, Seguros Sura, BANCO, beneficiario oneroso).
En cada aviso, distingue quién provoca el hecho de quién tiene el deber
de notificar. No atribuyas a Tomador o Asegurado el aviso a BANCO:
ese compromiso, si la fuente lo asigna, recae en Seguros Sura.
No inventes coberturas, exclusiones, plazos ni montos que no estén en la fuente.

# Style
Técnico-asegurador. Frases cortas. Sin marketing ni opiniones.

# Tone
Neutral y preciso.

# Audience
Un analista de operaciones / riesgos de un banco que debe verificar
obligaciones de aviso a BANCO y condiciones de la póliza.

# Response
- Idioma: español.
- Máximo 220 palabras.
- Usa EXACTAMENTE estos 4 encabezados y nada más:
  1. Avisos y plazos
  2. Coberturas y valor asegurado
  3. Vigencia, pago y cesión
  4. Exclusiones y norma
- Viñetas.
- Solo marca "días calendario" o "días hábiles" cuando la fuente lo diga.
  Si el texto dice solo "30 días", escribe "30 días": no inventes el tipo
  ni pongas "No especificado" en el tipo de plazo.
- "No especificado en el texto" SOLO para datos que el lector esperaría
  y la fuente no da (p. ej. la edad máxima de permanencia). No lo uses
  como etiqueta de cada atributo.
- En avisos: si la fuente dice que Aseguradora, Tomador o Asegurado
  revocan o modifican, consérvalos como autores del hecho; el aviso
  escrito a BANCO (y el plazo respecto de la fecha en que surtirá
  efecto) es de Seguros Sura, no de esos tres.
- En coberturas: enumera las causas de muerte nombradas y la condición
  del SIDA. En mora: conserva que hay cobertura durante el preaviso.
- No copies párrafos enteros; sí enumera causas, plazos y montos.
  No des recomendaciones. No cites conocimiento general más allá de lo escrito.
- Normaliza erratas evidentes (p. ej. "dar a viso" → "dar aviso")
  sin cambiar el sentido jurídico.

<fuente>
En caso de revocación de la póliza o modificaciones de cualquiera de las condiciones
generales o particulares del seguro por parte de la Aseguradora, Tomador o Asegurado,
Seguros Sura se compromete a dar a viso a BANCO, por escrito y con una antelación no
menor a 30 días a la fecha en que surtirá efecto el hecho. No obstante, lo estipulado
en las condiciones generales y particulares de esta póliza, el asegurado o beneficiario
debe dar noticia de la ocurrencia del siniestro a Seguros Sura dentro de los (30) días
calendario siguiente a la fecha en que lo haya conocido. Así mismo, Seguros Sura
avisará a BANCO dentro de los diez (10) días hábiles. En caso de terminación automática
por mora del pago de la prima, se le informará por escrito al beneficiario oneroso con
máximo de 30 días de antelación, garantizando la cobertura durante dicho periodo. Por
otro lado, informamos que el seguro referido cuenta con las siguientes características
y condiciones:
1. Tienen un valor asegurado de $98.500.000 en caso de fallecimiento.
2. Cubre desde el primer momento, la muerte del asegurado por cualquier causa, incluso
en casos de homicidio, suicidio, terrorismo, embriaguez, secuestro, atraco, presunción
de muerte por desaparecimiento declarado judicialmente, epidemia, pandemia o SIDA
siempre y cuando no haya sido adquirido antes de contratar el seguro.
3. Cubre desde inicio de vigencia incapacidad total y permanente por enfermedad o
accidente, también cubre intento de suicidio y homicidio, terrorismo, embriaguez y
atraco; es decir, si el asegurado en cualquiera de los eventos mencionados pierde de
forma permanente el 50% o más de su capacidad laboral, o sufre alguna de las pérdidas,
desmembraciones o inutilizaciones mencionadas en el clausulado del seguro contratado.
4. La vigencia de este seguro comienza a partir de la hora 24:00 del día que aparece
en la carátula como día de expedición de la póliza.
5. La edad máxima de permanencia para el amparo de Vida se encuentra estipulada en el
clausulado del seguro contratado.
6. Puede ser cedido en caso de una titularización de cartera y dicha cesión debe ser
notificada.
7. La forma de pago estipulada para la póliza es anual por COBRO BANCARIO.
8. Las exclusiones generales de esta póliza se encuentran en el clausulado del seguro
contratado; las exclusiones particulares que tenga esta póliza se encuentran en la
caratula de la misma.
9. Teniendo en cuenta la circular Externa 028 de 2019 emitida por la Superintendencia
Financiera, la entidad financiera puede ser la pagadora de la prima del seguro de sus
consumidores financieros para evitar su terminación automática.
</fuente>
```

### Mapeo COSTAR

| Letra | Qué fija | Por qué |
|-------|----------|---------|
| **C**ontext | Rol + tipo de documento + erratas | Evita el tono comercial y la “corrección” jurídica |
| **O**bjective | Solo `<fuente>` + cifras, actores y quién provoca vs quién avisa | No resume la consigna ni carga el aviso a BANCO al Tomador/Asegurado |
| **S**tyle | Técnico, frases cortas | Corta el párrafo narrativo |
| **T**one | Neutral | Corta opiniones (“es importante…”, “se recomienda…”) |
| **A**udience | Analista de banco | Obliga a no soltar los avisos a BANCO |
| **R**esponse | 220 palabras, 4 encabezados, tipo de plazo solo si la fuente lo dice, “No especificado” acotado | Controla forma y alucinación sin inventar etiquetas |

---

## 3. Qué mejoré y por qué

1. **Separé instrucción y fuente.** Delimitar con `<fuente>` evita que el modelo trate “Resume el siguiente texto” como parte de la póliza o ignore el cierre.
2. **Puse audiencia explícita.** Un resumen “genérico” prioriza coberturas. Un analista de banco prioriza plazos de aviso a BANCO, beneficiario oneroso y Circular 028.
3. **Sustituí “corto y preciso” por un contrato de salida.** Techo de 220 palabras + 4 encabezados fijos + viñetas. El modelo no elige el género (párrafo, lista, ensayo).
4. **Separé autor del hecho y deudor del aviso.** “Por parte de Aseguradora, Tomador o Asegurado” dispara la revocación o el cambio; “Seguros Sura se compromete” es quien avisa a BANCO. Sin esta regla, el resumen o carga el deber a los tres o omite el disparador.
5. **Conservé el tipo de plazo solo si la fuente lo dice.** “30 días” no es “30 días calendario” ni “10 días hábiles”. Si el texto no califica el plazo, se deja “30 días”: no se inventa el tipo ni se marca “No especificado” en ese atributo.
6. **Acoté “No especificado en el texto”.** Solo para datos que el lector esperaría y no están (edad máxima de permanencia). Sin techo, el modelo lo pega a cada campo y finge huecos que no existen.
7. **Pedí enumerar causas, condición del SIDA y cobertura en mora.** Un techo de palabras + “no copies la fuente” comprimía eso a “bajo las condiciones indicadas”.
8. **Pedí conservar actores, montos, porcentajes y norma.** Eso ancla $98.500.000, 50 %, Circular Externa 028 de 2019 y cobro bancario anual.
9. **Normalización acotada de erratas.** “dar a viso” → “dar aviso” sin reescribir el resto. Evita que un typo dispare una alucinación.

---

## 4. Cómo la versión evita respuestas irrelevantes

| Control | Qué bloquea |
|---------|-------------|
| Delimitador `<fuente>` | Resumir la consigna o mezclar instrucciones con la póliza |
| “ÚNICAMENTE el contenido entre…”, “nada más” que 4 encabezados | Consejos legales, glosario de seguros, “en conclusión” |
| Máximo 220 palabras | Parafraseo largo del texto original |
| Audiencia = operaciones / riesgos de un banco | Resumen comercial para el asegurado |
| “No des recomendaciones” + tono neutral | “Le recomendamos revisar el clausulado…” |
| “No cites conocimiento general… más allá de lo escrito” | Completar SIDA, suicidio o exclusiones con doctrina |
| “No especificado” solo para huecos reales (p. ej. edad) | Inventar edad máxima **o** etiquetar de más cada atributo |
| Tipo de plazo solo si la fuente lo dice | Fusionar 30 / 30 calendario / 10 hábiles, o inventar el tipo |
| Autor del hecho ≠ deudor del aviso | Cargar a Tomador/Asegurado el aviso a BANCO, u omitir quién dispara la revocación |

La irrelevancia aquí no es solo “hablar de otra cosa”. También es **omitir lo operativo** (avisos a BANCO, mora, Circular 028) o **añadir lo que no está** (edad, exclusiones concretas). El prompt ataca los dos lados.

---

## 5. Ejemplo comparativo

Mismo modelo (ChatGPT, incógnito, sin cuenta), mismo texto fuente. Solo cambia el prompt.

### 5.1 Hechos que el resumen debe conservar

| # | Hecho en la fuente |
|---|--------------------|
| 1 | Revocación o cambio **por** Aseguradora, Tomador o Asegurado; **Seguros Sura** avisa por escrito a BANCO con ≥ 30 días respecto de la fecha de efecto |
| 2 | Siniestro: aviso a Sura en **30 días calendario** desde que se conoció |
| 3 | Sura avisa a BANCO en **10 días hábiles** |
| 4 | Mora de prima: aviso escrito al beneficiario oneroso con máximo 30 días; hay cobertura en ese lapso |
| 5 | Valor asegurado por fallecimiento: **$98.500.000** |
| 6 | Muerte por cualquier causa desde el inicio (homicidio, suicidio, terrorismo, embriaguez, secuestro, atraco, presunción de muerte, epidemia, pandemia) |
| 7 | SIDA cubierto solo si no se adquirió antes de contratar |
| 8 | ITP desde vigencia; umbral **50 %** de capacidad laboral (o pérdidas del clausulado) |
| 9 | Vigencia desde las **24:00** del día de expedición en la carátula |
| 10 | Edad máxima del amparo Vida: **no hay cifra** (la fuente remite al clausulado) |
| 11 | Cesión por titularización de cartera; debe notificarse |
| 12 | Pago **anual por cobro bancario** |
| 13 | Exclusiones generales en clausulado; particulares en carátula |
| 14 | Circular Externa **028 de 2019** (Superintendencia Financiera) |
| 15 | La entidad financiera puede pagar la prima para evitar la terminación automática |

### 5.2 Salida real del prompt original

> El seguro tiene una cobertura por fallecimiento de $98.500.000 y ampara desde el inicio muerte por cualquier causa e incapacidad total y permanente del 50% o más, con las condiciones y exclusiones establecidas en la póliza. La vigencia inicia en la fecha indicada en la carátula y el pago es anual mediante cobro bancario. Los cambios o cancelación deben notificarse con al menos 30 días de anticipación, y los siniestros deben reportarse dentro de los 30 días siguientes a su conocimiento.

**Qué se perdió o se distorsionó**

- “Cambios o cancelación deben notificarse”: no dice **quién** avisa, ni a **BANCO**, ni “por escrito”.
- Siniestro: 30 días, sin **calendario** ni destinatario (Sura). Se cae el aviso de **10 hábiles** a BANCO.
- No hay mora, beneficiario oneroso ni cobertura durante el preaviso.
- $98.500.000 queda pegado a la ITP (en la fuente el monto es de fallecimiento).
- Vigencia = “la fecha de la carátula”: pierde la hora **24:00**.
- No están lista de causas, condición del SIDA, cesión, Circular 028 ni pagador de prima.
- Edad y exclusiones se diluyen en “las de la póliza”.

Hechos conservados con fidelidad: **3 de 15** (monto, 50 %, cobro bancario). Tres más a medias (cualquier causa, 30 días genéricos, exclusiones vagas).

### 5.3 Salida real de la versión COSTAR

**Avisos y plazos**
- Revocación o modificación por Aseguradora, Tomador o Asegurado: Seguros Sura debe avisar por escrito a BANCO, con antelación mínima de 30 días a la fecha de efecto.
- Siniestro: el asegurado o beneficiario debe informar a Seguros Sura dentro de 30 días calendario desde que lo conozca. Seguros Sura avisará a BANCO dentro de 10 días hábiles.
- Terminación automática por mora: se informará por escrito al beneficiario oneroso con máximo 30 días de antelación, manteniendo cobertura durante ese periodo.

**Coberturas y valor asegurado**
- Fallecimiento: $98.500.000.
- Muerte por cualquier causa desde el primer momento: homicidio, suicidio, terrorismo, embriaguez, secuestro, atraco, presunción de muerte por desaparecimiento declarado judicialmente, epidemia, pandemia o SIDA, siempre que este no haya sido adquirido antes de contratar.
- Incapacidad total y permanente desde el inicio de vigencia por enfermedad o accidente, incluyendo intento de suicidio, homicidio, terrorismo, embriaguez y atraco, ante pérdida permanente del 50% o más de capacidad laboral o las pérdidas, desmembraciones o inutilizaciones previstas en el clausulado.

**Vigencia, pago y cesión**
- Vigencia: inicia a las 24:00 del día de expedición indicado en la carátula.
- Edad máxima de permanencia para Vida: estipulada en el clausulado.
- Puede cederse por titularización de cartera; la cesión debe notificarse.
- Pago: anual por COBRO BANCARIO.

**Exclusiones y norma**
- Exclusiones generales: clausulado. Exclusiones particulares: carátula.
- Conforme a la Circular Externa 028 de 2019 de la Superintendencia Financiera, la entidad financiera puede pagar la prima para evitar la terminación automática.

Hechos conservados: **15 de 15**. Autores del hecho ≠ deudor del aviso. Edad sin cifra inventada (remite al clausulado, como la fuente). En mora conserva la pasiva (“se informará”): el texto no nombra quién informa.

### 5.4 Lado a lado

| Criterio | Original (misma corrida) | COSTAR (misma corrida) |
|----------|--------------------------|------------------------|
| Longitud | Un párrafo | 4 bloques, ≤ 220 palabras |
| Plazos | “30 días” genéricos | 30 / 30 calendario / 10 hábiles / 30 mora |
| Monto | Pegado a la ITP | $98.500.000 solo en fallecimiento |
| Aviso de revocación | “Deben notificarse”, sin BANCO | Autores (3) + Sura avisa a BANCO + fecha de efecto |
| Dato sin cifra (edad) | Omitida | Remite al clausulado; no inventa años |
| Irrelevantes | Ningún consejo esta vez; sí omisiones | Sin recomendaciones ni doctrina extra |
| Norma | Ausente | Circular 028 de 2019 + pagador de prima |
| Hechos fieles | 3 / 15 | 15 / 15 |

---

## 6. Criterio de aceptación del prompt

El prompt mejorado cumple el enunciado si, ante el mismo texto:

1. La salida cabe en los 4 encabezados y no añade secciones.
2. Distingue días calendario de días hábiles; si la fuente no califica el plazo, deja “30 días”.
3. Distingue quién provoca el hecho de quién avisa a BANCO.
4. Conserva monto, 50 %, hora 24:00, cobro bancario, lista de causas, condición del SIDA, cobertura en mora y Circular 028.
5. No inventa edad máxima ni exclusiones concretas.
6. No recomienda ni explica doctrina de seguros fuera de la fuente.
