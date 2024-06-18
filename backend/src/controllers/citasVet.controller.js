/* eslint-disable no-unused-vars */
/* eslint-disable max-len */
/* eslint-disable no-console */
"use strict";

import { respondSuccess, respondError } from "../utils/resHandler.js";
import { CitaVeterinarioService } from "../services/citaVet.services.js";
import { handleError } from "../utils/errorHandler.js";
import moment from "moment";
import { Resend } from "resend";
import Mascota from "../models/dog.model.js";
import citaVetModel from "../models/citaVet.model.js";
import mongoose from "mongoose";
import citaVeterinariaBodySchema from "../schema/citaVet.schema.js";


const resend = new Resend("re_cBCiaHJD_PdYEvkh7eu8GmbxbM8mUr1XD");

/**
 * Obtiene todas las citas veterinarias.
 * @param {import('express').Request} req - La solicitud HTTP.
 * @param {import('express').Response} res - La respuesta HTTP.
 */
export async function getCitaVeterinario(req, res) {
  try {
    const citas = await CitaVeterinarioService.getCitaVeterinario();

    if (citas.length === 0) {
      respondSuccess(req, res, 204); 
    } else {
      respondSuccess(req, res, 200, citas); 
    }
  } catch (error) {
    respondError(req, res, 400, error.message); 
  }
}

/**
 * Crea una nueva cita veterinaria.
 * @param {import('express').Request} req - La solicitud HTTP.
 * @param {import('express').Response} res - La respuesta HTTP.
 */
export async function createCitaVeterinario(req, res) {
  try {
    // Validar el cuerpo de la solicitud
    const { error, value } = citaVeterinariaBodySchema.validate(req.body, { abortEarly: false });
    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join(". ");
      return respondError(req, res, 400, errorMessage);
    }

    const { mascota, fecha, hora, motivo, email } = value;

    // Verificar si ya existe una cita para la misma mascota en la misma fecha y hora
    const existingCita = await citaVetModel.findOne({ mascota, fecha, hora });
    if (existingCita) {
      return respondError(req, res, 400, "Ya existe una cita para esta mascota en la misma fecha y hora.");
    }

    const fechaActual = moment().startOf("day"); // Fecha actual al inicio del día
    const fechaCita = moment(fecha, "YYYY-MM-DD"); // Fecha de la cita

    // Verificar si la fecha de la cita es anterior a la fecha actual
    if (fechaCita.isBefore(fechaActual)) {
      return respondError(req, res, 400, "La fecha de la cita no puede ser anterior a la fecha actual.");
    }

    // Crear la cita veterinaria
    const nuevaCita = await CitaVeterinarioService.createCitaVeterinario(req.body);

    // Obtener el nombre de la mascota
    const mascotaDetalle = await Mascota.findById(mascota);
    const nombreMascota = mascotaDetalle.nombre;
    const edadMascota = mascotaDetalle.edad;
    const razaMascota = mascotaDetalle.raza;
    const identificacionMascota = mascotaDetalle.identificacion;
    const estadoSaludMascota = mascotaDetalle.estadoSalud;
    
    // Construir el contenido del correo electrónico
    const htmlContent = `
      <strong>Su solicitud para la cita veterinaria.</strong><br>
      La cita se agendó para el <strong>${fecha}</strong>.
      <br>Rut: ${identificacionMascota}<br>
      Nombre de la mascota: ${nombreMascota}<br>
      Edad: ${edadMascota}<br>
      Raza: ${razaMascota}<br>
      Estado de salud: ${estadoSaludMascota}<br>
      Motivo: ${motivo}
    `;

    // Enviar correo de confirmación
    const { data, error: emailError } = await resend.emails.send({
      from: "Acme <onboarding@resend.dev>",
      to: email, // Enviar a cliente y veterinarios
      subject: "Solicitud de cita veterinaria",
      html: htmlContent,
    });
  
    if (emailError) {
      throw new Error(`Error al enviar el correo de confirmación: ${emailError.message}`);
    }
  
    respondSuccess(req, res, 200, { data: nuevaCita });
  } catch (error) {
    handleError(error, "citaVeterinario.controller -> createCitaVeterinario");
    respondError(req, res, 500, "No se pudo crear la cita");
  }
}

/**
 * Obtiene una cita veterinaria por su id.
 * @param {import('express').Request} req - La solicitud HTTP.
 * @param {import('express').Response} res - La respuesta HTTP.
 */
export async function getCitaVeterinarioById(req, res) {
  try {
    const { id } = req.params;
    
    const cita = await CitaVeterinarioService.getCitaVeterinarioById(id);
    cita === null
      ? respondError(
          req,
          res,
          404,
          "No se encuentra la cita solicitada",
          "Not Found",
          { message: "Verifique el id ingresado" },
        )
      : respondSuccess(req, res, 200, cita);
  } catch (error) {
    handleError(
      error,
      "citaVeterinario.controller -> getCitaVeterinarioById",
    );
    respondError(req, res, 500, "No se pudo obtener la cita");
  }
}

/**
 * Obtiene todas las citas veterinarias por id del perro.
 * @param {import('express').Request} req - La solicitud HTTP.
 * @param {import('express').Response} res - La respuesta HTTP.
 */
export async function getCitaVeterinarioByDogId(req, res) {
  try {
    const { id } = req.params;
    const citas = await CitaVeterinarioService.getCitaVeterinarioByDogId(id);
    if (citas.length === 0) {
      respondSuccess(req, res, 204);
    } else {
      respondSuccess(req, res, 200, citas);
    }
  } catch (error) {
    handleError(error, "citaVeterinario.controller -> getCitaVeterinarioByDogId");
    respondError(req, res, 500, "No se pudo obtener las citas");
  }
}


/**
 * Actualiza una cita veterinaria por su id.
 * @param {import('express').Request} req - La solicitud HTTP.
 * @param {import('express').Response} res - La respuesta HTTP.
 */
export async function updateCitaVeterinario(req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;

    // Validar el cuerpo de la solicitud
    const { error, value } = citaVeterinariaBodySchema.validate(req.body, { abortEarly: false });
    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join(". ");
      return respondError(req, res, 400, errorMessage);
    }

    const { mascota, fecha, hora } = value;

    // Verificar si existe una cita para la misma mascota en la misma fecha 
    const existingCita = await citaVetModel.findOne({ mascota, fecha, _id: { $ne: id } });
    if (existingCita) {
      await session.abortTransaction();
      session.endSession();
      return respondError(req, res, 400, "Ya existe una cita para esta mascota en la misma fecha.");
    }


    // Actualizar la cita veterinaria
    const updatedCita = await CitaVeterinarioService.updateCitaVeterinario(id, req.body, { session });

    // Verificar si la cita fue encontrada y actualizada
    if (!updatedCita) {
      await session.abortTransaction();
      session.endSession();
      return respondError(req, res, 404, "No se encontró la cita solicitada", "Not Found", { message: "Verifique el ID ingresado" });
    }

    // Obtener el nombre de la mascota para el correo electrónico
    const mascotaDetalle = await Mascota.findById(mascota).session(session);
    const nombreMascota = mascotaDetalle.nombre;
    const fechaFormateada = moment(fecha).format("DD/MM/YYYY");

    // Construir el contenido del correo electrónico con la información actualizada de la cita
    const htmlContent = `
      <strong>Su cita veterinaria ha sido actualizada.</strong><br>
      La cita ahora está programada para el <strong>${fechaFormateada}</strong>.<br>
      Nombre de la mascota: ${nombreMascota}<br>
      Motivo: ${req.body.motivo}
    `;

    // Envía el correo electrónico con el nuevo contenido
    const { data, error: emailError } = await resend.emails.send({
      from: "Acme <onboarding@resend.dev>",
      to: updatedCita.email,
      subject: "Actualización de cita veterinaria",
      html: htmlContent,
    });

    if (emailError) {
      await session.abortTransaction();
      session.endSession();
      return respondError(req, res, 400, "Error enviando el correo de actualización.");
    }

    // Completar la transacción y responder al cliente con éxito y los detalles de la cita actualizada
    await session.commitTransaction();
    session.endSession();
    respondSuccess(req, res, 200, updatedCita);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    handleError(error, "citaVeterinario.controller -> updateCitaVeterinario");
    respondError(req, res, 500, "No se pudo actualizar la cita");
  }
}
/**
 * Elimina una cita veterinaria por su id.
 * @param {import('express').Request} req - La solicitud HTTP.
 * @param {import('express').Response} res - La respuesta HTTP.
 */
export async function deleteCitaVeterinario(req, res) {
  try {
    const { id } = req.params;
    const cita = await CitaVeterinarioService.deleteCitaVeterinario(id);
    if (!cita) {
      return respondError(
        req,
        res,
        404,
        "No se encontró la cita solicitada",
        "Not Found",
        { message: "Verifique el id ingresado" },
      );
    }

    respondSuccess(req, res, 200, cita);
  } catch (error) {
    handleError(error, "citaVeterinario.controller -> deleteCitaVeterinario");
    respondError(req, res, 500, "No se pudo eliminar la cita");
  }
}
