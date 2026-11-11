# performance-quality-gate

Compara resultados JMeter CSV o k6 JSON de una versión candidata contra producción. La herramienta es la task `PerfGate@1` de Azure DevOps.

Con los límites por defecto, la versión B puede reemplazar a producción: los endpoints con muestra suficiente cumplen. La versión A no. `POST /pagos` pasa de 353 ms a 767 ms en el p95, 2,2 veces lo de producción, y los errores suben de 0,3 % a 3,3 %. En las dos versiones quedan advertencias: `GET /reportes` solo tiene 3 muestras útiles y `POST /transferencias` no existe en producción.

Los límites por defecto son 60 s de calentamiento, máximo +20 % de p95, máximo +1 punto de error, tope de error 2 % y mínimo 30 muestras. Un equipo puede cambiarlos en el pipeline o pasar un JSON con un límite distinto por endpoint.

## Pipelines

`azure-pipelines.yml` construye la task y publica el `.vsix` en el artefacto `performance-quality-gate`.

`azure-pipelines-release.yml` es el pipeline que la usa. Al ejecutarlo se elige la versión A o B. Llama a `PerfGate@1`, publica el reporte y deja la corrida en rojo cuando la versión no pasa.

## Instalar la task

1. Crea un publisher gratuito en el Marketplace con el id `cristianca23`, el mismo de `extension/vss-extension.json`. Si usas otro id, cámbialo en ese archivo y vuelve a empaquetar.
2. Crea un PAT con el alcance Marketplace (publish).
3. Genera el paquete, en local o descargando el artefacto del pipeline de build:

```bash
python tools/packageExtension.py
```

4. Publícalo y compártelo con la organización:

```bash
npx tfx-cli@0.21.1 extension publish \
  --vsix "$(ls -t dist/*.vsix | head -1)" \
  --share-with performance-quality-gate \
  --token "$AZURE_DEVOPS_EXT_PAT"
```

5. En Azure DevOps, abre Organization settings, Extensions, e instala Performance Quality Gate.
6. Crea un segundo pipeline con el archivo `azure-pipelines-release.yml`. Ejecútalo una vez con la versión A y otra con la B.

Para publicar una versión nueva hay que subir `version` en `extension/vss-extension.json` y en `extension/task/task.json`.
