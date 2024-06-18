"use strict";

import Joi from "joi";

const malasPalabras = [
  "wea", "weon", "culiao", "ctm", "chucha", "aweonao",
  "aweona", "conchetumare", "maricon", "maricona", "maricones",
  "mariconas", "mariconcito", "mariconcita", "mariconzuelo", "mariconzuela",
  "mariconazo", "mariconaza", "mariconada", "mariconeria", "gilipollas",
];


/**
 * Prohibits the use of bad words in the value.
 * @param {string} value - The value to validate.
 * @param {object} helpers - The validation helpers object.
 * @returns {string} - The validated value.
 */
const prohibirMalasPalabras = (value, helpers) => {
  const palabras = value.split(/\s+/); // Dividir el motivo en palabras individuales
  for (const palabra of palabras) {
    if (malasPalabras.includes(palabra.toLowerCase())) {
      return helpers.message(`El motivo contiene palabras prohibidas: ${palabra}`);
    }
  }
  return value;
};

const citaVeterinariaBodySchema = Joi.object({
  mascota: Joi.string()
    .min(2).max(50)
    .required()
    .messages({
      "string.empty": "La mascota no puede estar vacía",
      "any.required": "La mascota es obligatoria",
      "string.min": "La mascota debe tener al menos {#limit} caracteres",
      "string.max": "La mascota no puede tener más de {#limit} caracteres",
    }),

  fecha: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .custom((value, helpers) => {
      const fecha = new Date(value);
      const fechaActual = new Date(); // Fecha actual

      if (isNaN(fecha.getTime())) {
        return helpers.error("string.pattern.base");
      }

      if (fecha <= fechaActual) {
        console.log( fechaActual);
        return helpers.error("date.base");
      }

      return value;
    })
    .messages({
      "string.pattern.base": "La fecha debe tener el formato YYYY-MM-DD",
      "string.empty": "La fecha no puede estar vacía",
      "any.required": "La fecha es obligatoria",
      "date.base": "La fecha no puede ser anterior a la fecha actual",
    }),

  motivo: Joi.string()
    .min(2).max(500)
    .required()
    .custom(prohibirMalasPalabras, "Bad words validation")
    .messages({
      "any.custom": "El motivo contiene palabras prohibidas",
      "string.empty": "El motivo no puede estar vacío",
      "any.required": "El motivo es obligatorio",
      "string.min": "El motivo debe tener al menos {#limit} caracteres",
      "string.max": "El motivo no puede tener más de {#limit} caracteres",
    }),

  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.empty": "El correo no puede estar vacío",
      "any.required": "El correo es obligatorio",
      "string.email": "El correo debe tener un formato válido",
    }),
});

export default citaVeterinariaBodySchema;
