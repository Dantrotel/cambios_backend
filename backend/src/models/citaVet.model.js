// Importa el módulo 'mongoose' para crear la conexión a la base de datos
import mongoose from "mongoose";

const citaVeterinarioSchema = new mongoose.Schema({
    mascota: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Dog",
        required: true,
    },
    fecha: {
        type: Date,
        required: true,
    },
    motivo: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    state: {
        type: String,
        enum: ["Cita por confirmar", "Cita confirmada", 
            "Cita cancelada por el cliente", "Cita cancelada por el veterinario"],
        default: "Cita por confirmar",
        required: true,
    },
});


export default mongoose.model("citaVeterinarios", citaVeterinarioSchema);
