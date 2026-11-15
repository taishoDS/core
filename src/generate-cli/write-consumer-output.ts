// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import type { TaishoConfig } from '../generate';
import { crearMotor, type WriteConsumerOutputOptions, type WriteConsumerOutputResult } from './motor';

export type { WriteConsumerOutputOptions, WriteConsumerOutputResult };

export async function writeConsumerOutput(config: TaishoConfig, opciones: WriteConsumerOutputOptions): Promise<WriteConsumerOutputResult> {
	const { avisosNuevos: _avisosNuevos, ms: _ms, ...resultado } = await crearMotor(config, opciones).actualizar();
	return resultado;
}
