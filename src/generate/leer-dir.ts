// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import fs from 'fs';
import path from 'path';
import type { LeerDir } from './emit-flat.ts';

export const leerDir: LeerDir = (dir) =>
    (fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : []).map((d) => ({
        ruta: path.join(dir, d.name),
        esDirectorio: d.isDirectory(),
        contenido: () => fs.readFileSync(path.join(dir, d.name), 'utf8'),
    }));
